'use strict';

const express = require('express');
const { db, logActivity } = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/returns  -> recent returns/exchanges (shared log)
router.get('/', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM returns ORDER BY created_at DESC LIMIT 200')
    .all();
  res.json({ returns: rows });
});

// POST /api/returns  -> record a return or exchange
router.post('/', (req, res) => {
  const {
    invoice_id,
    invoice_number,
    type,
    customer_name,
    items,
    reason,
    handled_by_name,
  } = req.body || {};

  const kind = type === 'exchange' ? 'exchange' : 'return';
  if (!handled_by_name || !handled_by_name.trim()) {
    return res.status(400).json({ error: '请填写经办人 / Handler required' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: '请至少选择一项货物 / Select at least one item' });
  }

  const info = db
    .prepare(
      `INSERT INTO returns
       (invoice_id, invoice_number, type, customer_name, items_json, reason,
        handled_by_name, created_by, created_by_name)
       VALUES (?,?,?,?,?,?,?,?,?)`
    )
    .run(
      invoice_id || null,
      invoice_number || null,
      kind,
      customer_name || null,
      JSON.stringify(items),
      reason || null,
      handled_by_name.trim(),
      req.user.id,
      req.user.name
    );

  const ret = db.prepare('SELECT * FROM returns WHERE id = ?').get(info.lastInsertRowid);
  logActivity(req.user, 'return.create', `type=${kind} invoice=${invoice_id || '-'} id=${ret.id}`);
  req.app.get('io').emit('data:changed', { type: 'return', invoice_id });
  res.status(201).json({ return: ret });
});

module.exports = router;
