'use strict';

const config = require('./config');

/**
 * Thin wrapper around the Square REST API.
 * We call REST directly (Node 18+ global fetch) to avoid SDK version churn.
 * Docs: https://developer.squareup.com/reference/square
 */

class SquareError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'SquareError';
    this.status = status;
    this.details = details;
  }
}

async function squareFetch(pathname, { method = 'GET', body } = {}) {
  if (!config.square.configured) {
    throw new SquareError('Square 未配置：请在 .env 中设置 SQUARE_ACCESS_TOKEN', 503);
  }
  const res = await fetch(config.square.baseUrl + pathname, {
    method,
    headers: {
      'Square-Version': config.square.apiVersion,
      Authorization: `Bearer ${config.square.accessToken}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const msg =
      (data.errors && data.errors[0] && data.errors[0].detail) ||
      `Square API 错误 (${res.status})`;
    throw new SquareError(msg, res.status, data.errors);
  }
  return data;
}

const money = (m) => (m && typeof m.amount === 'number' ? m.amount : 0);

/** Search invoices for the configured location. */
async function searchInvoices({ cursor } = {}) {
  if (!config.square.locationId) {
    throw new SquareError('未配置 SQUARE_LOCATION_ID', 400);
  }
  const data = await squareFetch('/v2/invoices/search', {
    method: 'POST',
    body: {
      query: {
        filter: { location_ids: [config.square.locationId] },
        sort: { field: 'INVOICE_SORT_DATE', order: 'DESC' },
      },
      limit: 100,
      cursor,
    },
  });
  return { invoices: data.invoices || [], cursor: data.cursor || null };
}

async function getInvoice(invoiceId) {
  const data = await squareFetch(`/v2/invoices/${invoiceId}`);
  return data.invoice;
}

/** Batch-retrieve orders to read their line items. */
async function batchRetrieveOrders(orderIds) {
  const ids = [...new Set(orderIds.filter(Boolean))];
  if (ids.length === 0) return {};
  const byId = {};
  // Square caps batch retrieve at 100 ids.
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const data = await squareFetch('/v2/orders/batch-retrieve', {
      method: 'POST',
      body: { location_id: config.square.locationId, order_ids: chunk },
    });
    for (const o of data.orders || []) byId[o.id] = o;
  }
  return byId;
}

/**
 * Normalize a Square invoice + its order into a flat shape the front end uses.
 * Payment status comes from invoice.status; line items come from the order.
 */
function shapeInvoice(invoice, order) {
  const lineItems = (order && order.line_items) || [];
  const items = lineItems.map((li) => ({
    uid: li.uid,
    name: li.name || '(未命名)',
    quantity: Number(li.quantity || '0'),
    variation_name: li.variation_name || '',
    catalog_object_id: li.catalog_object_id || null,
    total: money(li.total_money),
  }));

  const primaryRecipient = invoice.primary_recipient || {};
  return {
    id: invoice.id,
    invoice_number: invoice.invoice_number || invoice.id,
    status: invoice.status, // DRAFT, UNPAID, PAID, PARTIALLY_PAID, SCHEDULED, CANCELED, ...
    order_id: invoice.order_id || null,
    customer_name:
      primaryRecipient.given_name || primaryRecipient.family_name
        ? `${primaryRecipient.given_name || ''} ${primaryRecipient.family_name || ''}`.trim()
        : primaryRecipient.company_name || '',
    customer_email: primaryRecipient.email_address || '',
    created_at: invoice.created_at,
    currency: (order && order.total_money && order.total_money.currency) || 'USD',
    total: order ? money(order.total_money) : 0,
    total_paid: order ? money(order.total_money) - money(order.net_amount_due_money) : 0,
    amount_due: order ? money(order.net_amount_due_money) : 0,
    items,
  };
}

/** List invoices with line items merged in. */
async function listInvoicesDetailed({ cursor } = {}) {
  const { invoices, cursor: next } = await searchInvoices({ cursor });
  const orders = await batchRetrieveOrders(invoices.map((i) => i.order_id));
  return {
    invoices: invoices.map((inv) => shapeInvoice(inv, orders[inv.order_id])),
    cursor: next,
  };
}

async function getInvoiceDetailed(invoiceId) {
  const invoice = await getInvoice(invoiceId);
  const orders = invoice.order_id ? await batchRetrieveOrders([invoice.order_id]) : {};
  return shapeInvoice(invoice, orders[invoice.order_id]);
}

/** List catalog items with current inventory counts at the location. */
async function listInventory() {
  if (!config.square.locationId) {
    throw new SquareError('未配置 SQUARE_LOCATION_ID', 400);
  }
  // 1. Pull catalog items + variations.
  const variations = [];
  const itemNameByVariation = {};
  let cursor;
  do {
    const qs = new URLSearchParams({ types: 'ITEM' });
    if (cursor) qs.set('cursor', cursor);
    const data = await squareFetch(`/v2/catalog/list?${qs.toString()}`);
    for (const obj of data.objects || []) {
      if (obj.type !== 'ITEM' || !obj.item_data) continue;
      const itemName = obj.item_data.name || '(未命名)';
      for (const v of obj.item_data.variations || []) {
        const vName = (v.item_variation_data && v.item_variation_data.name) || '';
        variations.push(v.id);
        itemNameByVariation[v.id] = vName ? `${itemName} - ${vName}` : itemName;
      }
    }
    cursor = data.cursor;
  } while (cursor);

  // 2. Retrieve inventory counts for those variations.
  const counts = {};
  for (let i = 0; i < variations.length; i += 500) {
    const chunk = variations.slice(i, i + 500);
    const data = await squareFetch('/v2/inventory/counts/batch-retrieve', {
      method: 'POST',
      body: {
        catalog_object_ids: chunk,
        location_ids: [config.square.locationId],
        states: ['IN_STOCK'],
      },
    });
    for (const c of data.counts || []) {
      counts[c.catalog_object_id] =
        (counts[c.catalog_object_id] || 0) + Number(c.quantity || '0');
    }
  }

  return variations.map((vid) => ({
    catalog_object_id: vid,
    name: itemNameByVariation[vid],
    quantity: counts[vid] || 0,
  }));
}

module.exports = {
  SquareError,
  listInvoicesDetailed,
  getInvoiceDetailed,
  listInventory,
};
