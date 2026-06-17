'use strict';

const express = require('express');
const { db, logActivity } = require('../db');
const { requireAuth } = require('../auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/pickups  -> recent pickups across all invoices (shared log)
router.get('/', (req, res) => {
  const rows = db
    .prepare('SELECT * FROM pickups ORDER BY picked_at DESC LIMIT 200')
    .all();
  res.json({ pickups: rows });
});

// POST /api/pickups  -> record a new pickup
router.post('/', (req, res) => {
  const {
    invoice_id,
    invoice_number,
    order_id,
    customer_name,
    items,
    picked_by_name,
    signature,
    picked_at,
    notes,
  } = req.body || {};

  if (!invoice_id) return res.status(400).json({ error: '缺少 invoice / Missing invoice' });
  if (!picked_by_name || !picked_by_name.trim()) {
    return res.status(400).json({ error: '请填写提货人 / Pickup person required' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: '请至少选择一项货物 / Select at least one item' });
  }

  const pickedAt = picked_at || new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO pickups
       (invoice_id, invoice_number, order_id, customer_name, items_json,
        picked_by_name, signature, picked_at, notes, created_by, created_by_name)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    )
    .run(
      invoice_id,
      invoice_number || null,
      order_id || null,
      customer_name || null,
      JSON.stringify(items),
      picked_by_name.trim(),
      signature || null,
      pickedAt,
      notes || null,
      req.user.id,
      req.user.name
    );

  const pickup = db.prepare('SELECT * FROM pickups WHERE id = ?').get(info.lastInsertRowid);
  logActivity(req.user, 'pickup.create', `invoice=${invoice_id} pickup=${pickup.id}`);

  // Broadcast so every connected staff member updates in real time.
  req.app.get('io').emit('data:changed', { type: 'pickup', invoice_id });
  res.status(201).json({ pickup });
});

// DELETE /api/pickups/:id  -> undo a pickup (mistakes happen)
router.delete('/:id', (req, res) => {
  const pickup = db.prepare('SELECT * FROM pickups WHERE id = ?').get(req.params.id);
  if (!pickup) return res.status(404).json({ error: 'Not found' });
  db.prepare('DELETE FROM pickups WHERE id = ?').run(req.params.id);
  logActivity(req.user, 'pickup.delete', `pickup=${req.params.id} invoice=${pickup.invoice_id}`);
  req.app.get('io').emit('data:changed', { type: 'pickup', invoice_id: pickup.invoice_id });
  res.json({ ok: true });
});

module.exports = router;
