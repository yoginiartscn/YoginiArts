const express = require('express');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
const sizeOf = require('image-size');
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
        { model: Product, as: 'product', attributes: ['id', 'name', 'barcode', 'image_url'] },
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

// GET /export/quotation - export product quotation using template design
router.get('/export/quotation', authenticate, async (req, res) => {
  try {
    const { category, price_type = 'retail_price' } = req.query;
    const where = {};
    if (category) where.category = category;

    const products = await Product.findAll({ where, order: [['createdAt', 'DESC']] });

    const path = require('path');
    const fs = require('fs');
    const templatePath = path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'Excels Templates', 'SingingBowlTemplates.xlsx');

    const workbook = new ExcelJS.Workbook();
    if (fs.existsSync(templatePath)) {
      await workbook.xlsx.readFile(templatePath);
    }

    const sheet = workbook.getWorksheet(1) || workbook.addWorksheet('Quotation');

    // Clear data rows (row 4+)
    const startRow = 4;
    for (let r = startRow; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      row.eachCell({ includeEmpty: true }, (cell) => { cell.value = null; });
    }

    // Update sheet name
    sheet.name = category || 'All Products';

    // Style constants matching template
    const headerFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF720E20' } };
    const headerFont = { size: 13, color: { theme: 0 }, name: 'Calibri', bold: true };
    const headerAlign = { horizontal: 'center', vertical: 'middle' };
    const dataFont = { size: 11, name: 'Calibri' };
    const dataAlign = { horizontal: 'center', vertical: 'middle' };
    const thinBorder = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };

    // Price label mapping
    const priceLabels = {
      cost_price: 'Cost Price',
      retail_price: 'Retail Price',
      wholesale_price: 'Wholesale Price',
    };

    // Ensure header row
    const headerRow = sheet.getRow(3);
    const headers = ['Image / 图片', 'Product name / 产品名称', 'Bar code / 条形码 ', 'Weight / 重量', 'Size / 尺寸', `${priceLabels[price_type] || 'Price'} / 价格`];
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.font = headerFont;
      cell.fill = headerFill;
      cell.alignment = headerAlign;
      cell.border = thinBorder;
    });
    headerRow.height = 30;

    // Column widths
    sheet.getColumn(1).width = 22;
    sheet.getColumn(2).width = 36;
    sheet.getColumn(3).width = 37;
    sheet.getColumn(4).width = 24;
    sheet.getColumn(5).width = 24;
    sheet.getColumn(6).width = 20;

    // Add data rows
    for (let idx = 0; idx < products.length; idx++) {
      const p = products[idx];
      const row = sheet.getRow(startRow + idx);

      // Image
      const imgCell = row.getCell(1);
      imgCell.value = '';
      imgCell.font = dataFont;
      imgCell.alignment = dataAlign;
      imgCell.border = thinBorder;

      let hasImage = false;
      let imgHeight = 0;
      if (p.image_url && p.image_url.startsWith('/uploads/')) {
        const imgPath = path.join(__dirname, '..', '..', p.image_url);
        if (fs.existsSync(imgPath)) {
          try {
            const imgBuffer = fs.readFileSync(imgPath);
            const ext = path.extname(imgPath).replace('.', '').toLowerCase();
            const dimensions = sizeOf(imgBuffer);
            let scaledWidth, scaledHeight;
            if (dimensions.height > dimensions.width) {
              scaledHeight = 100;
              scaledWidth = Math.round((dimensions.width / dimensions.height) * 100);
            } else {
              scaledWidth = 100;
              scaledHeight = Math.round((dimensions.height / dimensions.width) * 100);
            }
            const imgId = workbook.addImage({
              buffer: imgBuffer,
              extension: ext === 'jpg' ? 'jpeg' : ext,
            });
            sheet.addImage(imgId, {
              tl: { col: 0.1, row: startRow + idx - 1 + 0.05 },
              ext: { width: scaledWidth, height: scaledHeight },
            });
            hasImage = true;
            imgHeight = scaledHeight;
          } catch (imgErr) { /* skip */ }
        }
      }
      row.height = hasImage ? Math.round(imgHeight * 0.75) + 5 : 25;

      // Product name
      const nameCell = row.getCell(2);
      nameCell.value = p.name || '-';
      nameCell.font = { ...dataFont, bold: true };
      nameCell.alignment = dataAlign;
      nameCell.border = thinBorder;

      // Barcode
      const barcodeCell = row.getCell(3);
      barcodeCell.value = p.barcode || '-';
      barcodeCell.font = dataFont;
      barcodeCell.alignment = dataAlign;
      barcodeCell.border = thinBorder;

      // Weight
      const weightCell = row.getCell(4);
      weightCell.value = p.weight || '-';
      weightCell.font = dataFont;
      weightCell.alignment = dataAlign;
      weightCell.border = thinBorder;

      // Size
      const sizeCell = row.getCell(5);
      sizeCell.value = p.size || '-';
      sizeCell.font = dataFont;
      sizeCell.alignment = dataAlign;
      sizeCell.border = thinBorder;

      // Price
      const priceCell = row.getCell(6);
      const priceVal = parseFloat(p[price_type] || 0);
      priceCell.value = priceVal > 0 ? priceVal.toFixed(2) : '-';
      priceCell.font = { ...dataFont, bold: true, color: { argb: 'FF720E20' } };
      priceCell.alignment = dataAlign;
      priceCell.border = thinBorder;
    }

    const catNameMap = {
      'Singing Bowl': 'singingbowl',
      'Thanka': 'thanka',
      'Thanka Locket': 'thanka_locket',
      'Jewelleries': 'jewelleries',
    };
    const catName = catNameMap[category] || (category || 'all_products').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
    const fileName = `${catName}_PI.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export quotation error:', error);
    res.status(500).json({ success: false, message: 'Export failed' });
  }
});

// GET /export/transfers - export transfer records using template design
router.get('/export/transfers', authenticate, async (req, res) => {
  try {
    const { location_id } = req.query;
    const where = { type: 'transfer' };

    if (location_id) {
      where[Op.or] = [
        { from_location_id: location_id },
        { to_location_id: location_id },
      ];
    }

    const transfers = await Transaction.findAll({
      where,
      include: [
        { model: Product, as: 'product', attributes: ['id', 'name', 'barcode', 'image_url'] },
        { model: Location, as: 'fromLocation', attributes: ['id', 'name'] },
        { model: Location, as: 'toLocation', attributes: ['id', 'name'] },
      ],
      order: [['createdAt', 'DESC']],
      limit: 500,
    });

    const path = require('path');
    const fs = require('fs');
    const templatePath = path.join(__dirname, '..', '..', '..', 'frontend', 'public', 'Excels Templates', 'TransferTemplates.xlsx');

    const workbook = new ExcelJS.Workbook();

    // Check if template exists, use it as base
    if (fs.existsSync(templatePath)) {
      await workbook.xlsx.readFile(templatePath);
    }

    const sheet = workbook.getWorksheet(1) || workbook.addWorksheet('Transfer Records');

    // If template loaded, it already has header styling. Clear data rows (row 4+)
    const startRow = 4;
    for (let r = startRow; r <= sheet.rowCount; r++) {
      const row = sheet.getRow(r);
      row.eachCell({ includeEmpty: true }, (cell) => { cell.value = null; });
    }

    // Update sheet name with location if filtered
    if (location_id) {
      const loc = await Location.findByPk(location_id);
      if (loc) sheet.name = loc.name;
    }

    // Style constants matching template
    const headerFill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF720E20' },
    };
    const headerFont = { size: 13, color: { theme: 0 }, name: 'Calibri', bold: true };
    const headerAlign = { horizontal: 'center', vertical: 'middle' };
    const dataFont = { size: 11, name: 'Calibri' };
    const dataAlign = { horizontal: 'center', vertical: 'middle' };
    const thinBorder = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };

    // Ensure header row exists with correct styling (in case template is missing)
    const headerRow = sheet.getRow(3);
    const headers = ['Image', 'Product name', 'Bar code', 'Transferred to', 'Date'];
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      if (!cell.value) {
        cell.value = h;
        cell.font = headerFont;
        cell.fill = headerFill;
        cell.alignment = headerAlign;
        cell.border = thinBorder;
      }
    });
    headerRow.height = 30;

    // Set column widths
    sheet.getColumn(1).width = 22;
    sheet.getColumn(2).width = 36;
    sheet.getColumn(3).width = 37;
    sheet.getColumn(4).width = 21;
    sheet.getColumn(5).width = 20;

    // Add data rows with embedded product images
    for (let idx = 0; idx < transfers.length; idx++) {
      const tx = transfers[idx];
      const row = sheet.getRow(startRow + idx);

      // Image column — embed actual image if it's a local upload
      const imgCell = row.getCell(1);
      imgCell.value = '';
      imgCell.font = dataFont;
      imgCell.alignment = dataAlign;
      imgCell.border = thinBorder;

      let hasImage = false;
      let imgHeight = 0;
      const imageUrl = tx.product?.image_url;
      if (imageUrl && imageUrl.startsWith('/uploads/')) {
        const imgPath = path.join(__dirname, '..', '..', imageUrl);
        if (fs.existsSync(imgPath)) {
          try {
            const imgBuffer = fs.readFileSync(imgPath);
            const ext = path.extname(imgPath).replace('.', '').toLowerCase();
            const dimensions = sizeOf(imgBuffer);
            let scaledWidth, scaledHeight;
            if (dimensions.height > dimensions.width) {
              scaledHeight = 100;
              scaledWidth = Math.round((dimensions.width / dimensions.height) * 100);
            } else {
              scaledWidth = 100;
              scaledHeight = Math.round((dimensions.height / dimensions.width) * 100);
            }
            const imgId = workbook.addImage({
              buffer: imgBuffer,
              extension: ext === 'jpg' ? 'jpeg' : ext,
            });
            sheet.addImage(imgId, {
              tl: { col: 0.1, row: startRow + idx - 1 + 0.05 },
              ext: { width: scaledWidth, height: scaledHeight },
            });
            hasImage = true;
            imgHeight = scaledHeight;
          } catch (imgErr) {
            // Skip image on error
          }
        }
      }

      // Taller row for images, shorter for text-only
      row.height = hasImage ? Math.round(imgHeight * 0.75) + 5 : 25;

      const nameCell = row.getCell(2);
      nameCell.value = tx.product?.name || '-';
      nameCell.font = { ...dataFont, bold: true };
      nameCell.alignment = dataAlign;
      nameCell.border = thinBorder;

      const barcodeCell = row.getCell(3);
      barcodeCell.value = tx.product?.barcode || '-';
      barcodeCell.font = dataFont;
      barcodeCell.alignment = dataAlign;
      barcodeCell.border = thinBorder;

      const locationCell = row.getCell(4);
      locationCell.value = tx.toLocation?.name || '-';
      locationCell.font = { ...dataFont, bold: true, color: { argb: 'FF720E20' } };
      locationCell.alignment = dataAlign;
      locationCell.border = thinBorder;

      const dateCell = row.getCell(5);
      dateCell.value = new Date(tx.createdAt).toLocaleDateString();
      dateCell.font = dataFont;
      dateCell.alignment = dataAlign;
      dateCell.border = thinBorder;
    }

    const locName = location_id
      ? (await Location.findByPk(location_id))?.name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Unknown'
      : 'All_Locations';
    const dateStr = new Date().toISOString().slice(0, 10);
    const fileName = `${locName}_${dateStr}_transfer.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export transfers error:', error);
    res.status(500).json({ success: false, message: 'Export failed' });
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

    const path = require('path');
    const fs = require('fs');

    products.forEach((product, idx) => {
      const row = sheet.addRow({
        image_url: '',
        name: product.name,
        description: product.description || '',
        barcode: product.barcode || '',
        cost_price: parseFloat(product.cost_price) || 0,
        retail_price: parseFloat(product.retail_price) || 0,
        wholesale_price: parseFloat(product.wholesale_price) || 0,
        quantity: product.quantity,
      });

      let hasImage = false;
      let imgHeight = 0;
      if (product.image_url && product.image_url.startsWith('/uploads/')) {
        const imgPath = path.join(__dirname, '..', '..', product.image_url);
        if (fs.existsSync(imgPath)) {
          try {
            const imgBuffer = fs.readFileSync(imgPath);
            const ext = path.extname(imgPath).replace('.', '').toLowerCase();
            const dimensions = sizeOf(imgBuffer);
            let scaledWidth, scaledHeight;
            if (dimensions.height > dimensions.width) {
              scaledHeight = 100;
              scaledWidth = Math.round((dimensions.width / dimensions.height) * 100);
            } else {
              scaledWidth = 100;
              scaledHeight = Math.round((dimensions.height / dimensions.width) * 100);
            }
            const imgId = workbook.addImage({
              buffer: imgBuffer,
              extension: ext === 'jpg' ? 'jpeg' : ext,
            });
            sheet.addImage(imgId, {
              tl: { col: 0.1, row: idx + 1 + 0.05 },
              ext: { width: scaledWidth, height: scaledHeight },
            });
            hasImage = true;
            imgHeight = scaledHeight;
          } catch (imgErr) { /* skip */ }
        }
      }
      row.height = hasImage ? Math.round(imgHeight * 0.75) + 5 : 25;
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
