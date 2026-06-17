'use strict';

const express = require('express');
const { db } = require('../db');
const { requireAuth } = require('../auth');
const square = require('../square');

const router = express.Router();
router.use(requireAuth);

// Sum already-picked quantities per item for an invoice, keyed by item uid
// (falling back to item name when there is no uid).
function pickedQuantities(invoiceId) {
  const rows = db
    .prepare('SELECT items_json FROM pickups WHERE invoice_id = ?')
    .all(invoiceId);
  const picked = {};
  for (const row of rows) {
    let items = [];
    try {
      items = JSON.parse(row.items_json) || [];
    } catch {
      items = [];
    }
    for (const it of items) {
      const key = it.uid || it.name;
      picked[key] = (picked[key] || 0) + Number(it.qty || it.quantity || 0);
    }
  }
  return picked;
}

// Attach pickup progress (picked / remaining) to each invoice's items.
function withPickupProgress(invoice) {
  const picked = pickedQuantities(invoice.id);
  let totalQty = 0;
  let totalPicked = 0;
  const items = invoice.items.map((it) => {
    const key = it.uid || it.name;
    const pickedQty = Math.min(picked[key] || 0, it.quantity);
    const remaining = Math.max(it.quantity - pickedQty, 0);
    totalQty += it.quantity;
    totalPicked += pickedQty;
    return { ...it, picked: pickedQty, remaining };
  });
  let pickupStatus = 'none'; // none | partial | complete
  if (totalPicked > 0 && totalPicked < totalQty) pickupStatus = 'partial';
  else if (totalQty > 0 && totalPicked >= totalQty) pickupStatus = 'complete';
  return { ...invoice, items, total_qty: totalQty, total_picked: totalPicked, pickup_status: pickupStatus };
}

// GET /api/invoices  -> list with payment + pickup status
router.get('/', async (req, res, next) => {
  try {
    const { cursor } = req.query;
    const { invoices, cursor: next } = await square.listInvoicesDetailed({ cursor });
    res.json({ invoices: invoices.map(withPickupProgress), cursor: next });
  } catch (err) {
    next(err);
  }
});

// GET /api/invoices/:id  -> single invoice with full pickup/return history
router.get('/:id', async (req, res, next) => {
  try {
    const invoice = await square.getInvoiceDetailed(req.params.id);
    const pickups = db
      .prepare('SELECT * FROM pickups WHERE invoice_id = ? ORDER BY picked_at DESC')
      .all(req.params.id);
    const returns = db
      .prepare('SELECT * FROM returns WHERE invoice_id = ? ORDER BY created_at DESC')
      .all(req.params.id);
    res.json({ invoice: withPickupProgress(invoice), pickups, returns });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
