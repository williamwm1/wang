'use strict';

const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/activity  -> shared audit log (most recent first)
router.get('/', (req, res) => {
  const rows = db
    .prepare('SELECT id, user_name, action, detail, created_at FROM activity_log ORDER BY id DESC LIMIT 300')
    .all();
  res.json({ activity: rows });
});

module.exports = router;
