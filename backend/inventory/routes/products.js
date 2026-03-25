const express = require('express');
const { Op } = require('sequelize');
const { Product, Location, Inventory } = require('../models');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET / - list all products
router.get('/', authenticate, async (req, res) => {
  try {
    const { search } = req.query;
    const where = {};

    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { barcode: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } },
      ];
    }

    const products = await Product.findAll({ where, order: [['createdAt', 'DESC']] });
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

// POST /
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, description, image_url, barcode, cost_price, retail_price, wholesale_price } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: 'Product name is required' });
    }

    const product = await Product.create({
      name,
      description,
      image_url,
      barcode: barcode || null,
      cost_price: cost_price || 0,
      retail_price: retail_price || 0,
      wholesale_price: wholesale_price || 0,
    });

    // Ensure default location exists
    let locations = await Location.findAll();
    if (locations.length === 0) {
      const defaultLoc = await Location.create({ name: 'Guangzhou Warehouse', type: 'warehouse' });
      locations = [defaultLoc];
    }

    // Auto-create inventory records (quantity 0) at all existing locations
    await Inventory.bulkCreate(
      locations.map((loc) => ({
        product_id: product.id,
        location_id: loc.id,
        quantity: 0,
      }))
    );

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, message: 'Barcode already exists' });
    }
    console.error('Create product error:', error);
    res.status(500).json({ success: false, message: 'Failed to create product' });
  }
});

// PUT /:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    const { name, description, image_url, barcode, cost_price, retail_price, wholesale_price } = req.body;

    await product.update({
      name: name !== undefined ? name : product.name,
      description: description !== undefined ? description : product.description,
      image_url: image_url !== undefined ? image_url : product.image_url,
      barcode: barcode !== undefined ? barcode : product.barcode,
      cost_price: cost_price !== undefined ? cost_price : product.cost_price,
      retail_price: retail_price !== undefined ? retail_price : product.retail_price,
      wholesale_price: wholesale_price !== undefined ? wholesale_price : product.wholesale_price,
    });

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

    await product.destroy();
    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete product' });
  }
});

module.exports = router;
