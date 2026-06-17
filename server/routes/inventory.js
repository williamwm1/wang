'use strict';

const express = require('express');
const { requireAuth } = require('../auth');
const square = require('../square');

const router = express.Router();
router.use(requireAuth);

// GET /api/inventory  -> live stock levels from Square
router.get('/', async (req, res, next) => {
  try {
    const items = await square.listInventory();
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
