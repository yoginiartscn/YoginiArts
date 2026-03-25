const express = require('express');
const Location = require('../models/Location');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /
router.get('/', authenticate, async (req, res) => {
  try {
    const locations = await Location.findAll({ order: [['name', 'ASC']] });
    res.json({ success: true, data: locations });
  } catch (error) {
    console.error('Get locations error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch locations' });
  }
});

// GET /:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const location = await Location.findByPk(req.params.id);
    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }
    res.json({ success: true, data: location });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch location' });
  }
});

// POST /
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, type } = req.body;

    if (!name || !type) {
      return res.status(400).json({ success: false, message: 'Name and type are required' });
    }

    if (!['warehouse', 'shop', 'exhibition'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type must be warehouse, shop, or exhibition' });
    }

    const location = await Location.create({ name, type });
    res.status(201).json({ success: true, data: location });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({ success: false, message: 'Location name already exists' });
    }
    console.error('Create location error:', error);
    res.status(500).json({ success: false, message: 'Failed to create location' });
  }
});

// PUT /:id
router.put('/:id', authenticate, async (req, res) => {
  try {
    const location = await Location.findByPk(req.params.id);
    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }

    const { name, type } = req.body;
    if (type && !['warehouse', 'shop', 'exhibition'].includes(type)) {
      return res.status(400).json({ success: false, message: 'Type must be warehouse, shop, or exhibition' });
    }

    await location.update({
      name: name !== undefined ? name : location.name,
      type: type !== undefined ? type : location.type,
    });

    res.json({ success: true, data: location });
  } catch (error) {
    console.error('Update location error:', error);
    res.status(500).json({ success: false, message: 'Failed to update location' });
  }
});

// DELETE /:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const location = await Location.findByPk(req.params.id);
    if (!location) {
      return res.status(404).json({ success: false, message: 'Location not found' });
    }

    await location.destroy();
    res.json({ success: true, message: 'Location deleted' });
  } catch (error) {
    console.error('Delete location error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete location' });
  }
});

module.exports = router;
