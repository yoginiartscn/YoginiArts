const express = require('express');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
const { Transaction, Product, Location, User, Inventory } = require('../models');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /transactions - list transactions with filters
router.get('/transactions', authenticate, async (req, res) => {
  try {
    const { type, product_id, location_id, start_date, end_date, page = 1, limit = 50 } = req.query;
    const where = {};

    if (type) where.type = type;
    if (product_id) where.product_id = product_id;
    if (location_id) {
      where[Op.or] = [
        { from_location_id: location_id },
        { to_location_id: location_id },
      ];
    }
    if (start_date || end_date) {
      where.createdAt = {};
      if (start_date) where.createdAt[Op.gte] = new Date(start_date);
      if (end_date) where.createdAt[Op.lte] = new Date(end_date);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await Transaction.findAndCountAll({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'barcode'] },
        { model: Location, as: 'fromLocation', attributes: ['id', 'name'] },
        { model: Location, as: 'toLocation', attributes: ['id', 'name'] },
        { model: User, as: 'createdByUser', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset,
    });

    res.json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
});

// GET /summary - dashboard summary
router.get('/summary', authenticate, async (req, res) => {
  try {
    const totalProducts = await Product.count();
    const totalLocations = await Location.count();

    // Today's sales
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySales = await Transaction.count({
      where: { type: 'sale', createdAt: { [Op.gte]: today } },
    });

    // Low stock items (quantity <= 5)
    const lowStock = await Inventory.count({
      where: { quantity: { [Op.lte]: 5, [Op.gt]: 0 } },
    });

    // Out of stock
    const outOfStock = await Inventory.count({
      where: { quantity: 0 },
    });

    // Recent transactions
    const recentTransactions = await Transaction.findAll({
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name'] },
        { model: Location, as: 'fromLocation', attributes: ['id', 'name'] },
        { model: Location, as: 'toLocation', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 10,
    });

    res.json({
      success: true,
      data: {
        totalProducts,
        totalLocations,
        todaySales,
        lowStock,
        outOfStock,
        recentTransactions,
      },
    });
  } catch (error) {
    console.error('Get summary error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch summary' });
  }
});

// GET /export/excel - export products to xlsx
router.get('/export/excel', authenticate, async (req, res) => {
  try {
    const { location_id } = req.query;

    let products;
    if (location_id) {
      const inventoryRecords = await Inventory.findAll({
        where: { location_id },
        include: [{ model: Product, as: 'product' }],
      });
      products = inventoryRecords.map((inv) => ({
        ...inv.product.toJSON(),
        quantity: inv.quantity,
      }));
    } else {
      products = await Product.findAll({ order: [['name', 'ASC']] });
      products = products.map((p) => p.toJSON());
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Yogini Arts Inventory';
    const sheet = workbook.addWorksheet('Products');

    const columns = [
      { header: 'Image', key: 'image_url', width: 30 },
      { header: 'Product Name', key: 'name', width: 30 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Barcode', key: 'barcode', width: 20 },
      { header: 'Cost Price', key: 'cost_price', width: 15 },
      { header: 'Retail Price', key: 'retail_price', width: 15 },
      { header: 'Wholesale Price', key: 'wholesale_price', width: 15 },
    ];

    if (location_id) {
      columns.push({ header: 'Quantity', key: 'quantity', width: 12 });
    }

    sheet.columns = columns;

    // Style header row
    sheet.getRow(1).font = { bold: true, size: 12 };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF7A5D47' },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    products.forEach((product) => {
      sheet.addRow({
        image_url: product.image_url || '',
        name: product.name,
        description: product.description || '',
        barcode: product.barcode || '',
        cost_price: parseFloat(product.cost_price) || 0,
        retail_price: parseFloat(product.retail_price) || 0,
        wholesale_price: parseFloat(product.wholesale_price) || 0,
        quantity: product.quantity,
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=yogini-arts-products.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ success: false, message: 'Export failed' });
  }
});

module.exports = router;
