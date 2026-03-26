const express = require('express');
const { Op } = require('sequelize');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { Product, Location, Inventory } = require('../models');
const { authenticate } = require('../middleware/auth');
const cache = require('../cache');

const router = express.Router();

// Multer config for product images
const uploadsDir = path.join(__dirname, '..', '..', 'uploads', 'products');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  },
});

// GET / - list all products
router.get('/', authenticate, async (req, res) => {
  try {
    const { search } = req.query;
    const cacheKey = `products:${search || ''}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json({ success: true, data: cached });

    const where = {};
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { barcode: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const products = await Product.findAll({ where, order: [['createdAt', 'DESC']] });
    cache.set(cacheKey, products, 3000);
    res.json({ success: true, data: products });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch products' });
  }
});

// GET /:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch product' });
  }
});

// POST / - create product (with optional image upload)
router.post('/', authenticate, upload.single('image'), async (req, res) => {
  try {
    const { name, description, image_url, barcode, cost_price, retail_price, wholesale_price, category, weight, size } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Product name is required' });
    }

    // Use uploaded file path, or provided URL (ignore ephemeral blob: URLs)
    let finalImageUrl = (image_url && !image_url.startsWith('blob:')) ? image_url : null;
    if (req.file) {
      finalImageUrl = `/uploads/products/${req.file.filename}`;
    }

    const product = await Product.create({
      name,
      description,
      image_url: finalImageUrl,
      barcode: barcode || null,
      cost_price: cost_price || 0,
      retail_price: retail_price || 0,
      wholesale_price: wholesale_price || 0,
      category: category || null,
      weight: weight || null,
      size: size || null,
    });

    // Ensure default location exists
    let locations = await Location.findAll();
    let guangzhou = locations.find((l) => l.name === 'Guangzhou Warehouse');
    if (!guangzhou) {
      guangzhou = await Location.create({ name: 'Guangzhou Warehouse', type: 'warehouse' });
      locations = await Location.findAll();
    }

    // Auto stock-in at Guangzhou Warehouse with quantity 1
    const [gzInv, gzCreated] = await Inventory.findOrCreate({
      where: { product_id: product.id, location_id: guangzhou.id },
      defaults: { quantity: 1 },
    });
    if (!gzCreated) {
      await gzInv.update({ quantity: gzInv.quantity + 1 });
    }

    // Create inventory records (quantity 0) at other locations + log transaction in parallel
    const { Transaction } = require('../models');
    await Promise.all([
      ...locations
        .filter((loc) => loc.id !== guangzhou.id)
        .map((loc) =>
          Inventory.findOrCreate({
            where: { product_id: product.id, location_id: loc.id },
            defaults: { quantity: 0 },
          })
        ),
      Transaction.create({
        type: 'stock_in',
        product_id: product.id,
        to_location_id: guangzhou.id,
        quantity: 1,
        notes: 'Auto stock-in on product creation',
        created_by: req.user?.id || null,
      }),
    ]);

    cache.invalidate('products');
    cache.invalidate('summary');
    cache.invalidate('inventory');
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, message: 'Barcode already exists' });
    }
    console.error('Create product error:', error);
    res.status(500).json({ success: false, message: 'Failed to create product' });
  }
});

// PUT /:id - update product (with optional image upload)
router.put('/:id', authenticate, upload.single('image'), async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const { name, description, image_url, barcode, cost_price, retail_price, wholesale_price, category, weight, size } = req.body;

    // Use uploaded file, or provided URL, or keep existing (ignore ephemeral blob: URLs)
    let finalImageUrl = image_url !== undefined ? (image_url.startsWith('blob:') ? product.image_url : image_url) : product.image_url;
    if (req.file) {
      finalImageUrl = `/uploads/products/${req.file.filename}`;
      // Delete old uploaded image if it was a local file
      if (product.image_url && product.image_url.startsWith('/uploads/')) {
        const oldPath = path.join(__dirname, '..', '..', product.image_url);
        fs.unlink(oldPath, () => {}); // ignore errors
      }
    }

    await product.update({
      name: name !== undefined ? name : product.name,
      description: description !== undefined ? description : product.description,
      image_url: finalImageUrl,
      barcode: barcode !== undefined ? barcode : product.barcode,
      cost_price: cost_price !== undefined ? cost_price : product.cost_price,
      retail_price: retail_price !== undefined ? retail_price : product.retail_price,
      wholesale_price: wholesale_price !== undefined ? wholesale_price : product.wholesale_price,
      category: category !== undefined ? category : product.category,
      weight: weight !== undefined ? weight : product.weight,
      size: size !== undefined ? size : product.size,
    });

    cache.invalidate('products');
    res.json({ success: true, data: product });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, message: 'Barcode already exists' });
    }
    console.error('Update product error:', error);
    res.status(500).json({ success: false, message: 'Failed to update product' });
  }
});

// DELETE /:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    // Delete uploaded image file if local
    if (product.image_url && product.image_url.startsWith('/uploads/')) {
      const imgPath = path.join(__dirname, '..', '..', product.image_url);
      fs.unlink(imgPath, () => {});
    }

    await product.destroy();
    cache.invalidate('products');
    cache.invalidate('inventory');
    cache.invalidate('summary');
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
});

module.exports = router;
