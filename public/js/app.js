'use strict';

/* ---------- State ---------- */
const state = {
  user: null,
  tab: 'invoices',
  invoices: [],
  invoiceFilter: '',
  inventory: [],
  inventoryFilter: '',
  returns: [],
  activity: [],
  users: [],
  squareConfigured: true,
};
let socket = null;

/* ---------- Helpers ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const t = window.t;

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
function el(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  return tpl.content.firstElementChild;
}
function fmtMoney(amountMinor, currency) {
  const n = (Number(amountMinor) || 0) / 100;
  try {
    return new Intl.NumberFormat(window.getLang() === 'zh' ? 'zh-CN' : 'en-US', {
      style: 'currency', currency: currency || 'USD',
    }).format(n);
  } catch {
    return n.toFixed(2);
  }
}
function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleString(window.getLang() === 'zh' ? 'zh-CN' : 'en-US');
}
function nowLocalInput() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}
function toast(msg, isError) {
  const old = $('.toast');
  if (old) old.remove();
  const t = el(`<div class="toast ${isError ? 'error' : ''}">${esc(msg)}</div>`);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/* ---------- Status badges ---------- */
function paymentBadge(status) {
  const map = {
    PAID: ['badge-green', 'paid'],
    UNPAID: ['badge-red', 'unpaid'],
    PARTIALLY_PAID: ['badge-amber', 'partially_paid'],
    DRAFT: ['badge-gray', 'draft'],
    SCHEDULED: ['badge-gray', 'scheduled'],
    CANCELED: ['badge-gray', 'canceled'],
  };
  const [cls, key] = map[status] || ['badge-gray', null];
  return `<span class="badge ${cls}">${key ? esc(t(key)) : esc(status || '')}</span>`;
}
function pickupBadge(status) {
  const map = {
    none: ['badge-gray', 'pickup_none'],
    partial: ['badge-amber', 'pickup_partial'],
    complete: ['badge-green', 'pickup_complete'],
  };
  const [cls, key] = map[status] || ['badge-gray', 'pickup_none'];
  return `<span class="badge ${cls}">${esc(t(key))}</span>`;
}

/* ---------- i18n application ---------- */
function applyI18n() {
  document.documentElement.lang = window.getLang();
  $$('[data-i18n]').forEach((node) => { node.textContent = t(node.dataset.i18n); });
  $('#lang-btn') && ($('#lang-btn').textContent = t('lang_toggle'));
  $('#login-lang') && ($('#login-lang').textContent = t('lang_toggle'));
  $('#login-title') && ($('#login-title').textContent = t('app_title'));
}

/* ---------- Auth / boot ---------- */
async function boot() {
  applyI18n();
  try {
    const cfg = await window.api.get('/api/config');
    state.squareConfigured = cfg.squareConfigured && cfg.squareLocationSet;
  } catch {}
  try {
    const { user } = await window.api.get('/api/auth/me');
    state.user = user;
    showApp();
  } catch {
    showLogin();
  }
}

function showLogin() {
  $('#app').classList.add('hidden');
  $('#login-screen').classList.remove('hidden');
  applyI18n();
}

function showApp() {
  $('#login-screen').classList.add('hidden');
  $('#app').classList.remove('hidden');
  $('#current-user').textContent = state.user.name + (state.user.role === 'admin' ? ' (admin)' : '');
  $$('.admin-only').forEach((n) => n.classList.toggle('hidden', state.user.role !== 'admin'));
  if (!state.squareConfigured) {
    const b = $('#square-banner');
    b.textContent = t('square_not_configured');
    b.classList.remove('hidden');
  }
  connectSocket();
  applyI18n();
  selectTab(state.tab);
}

function connectSocket() {
  if (socket) return;
  socket = io({ withCredentials: true });
  socket.on('presence', ({ online }) => {
    $('#presence').textContent = `${online} ${t('online')}`;
  });
  socket.on('data:changed', () => {
    // Someone else changed data — refresh whatever the user is looking at.
    refreshCurrentTab();
  });
}

/* ---------- Tabs ---------- */
function selectTab(tab) {
  state.tab = tab;
  $$('.tab').forEach((b) => b.classList.toggle('active', b.dataset.tab === tab));
  refreshCurrentTab();
}
function refreshCurrentTab() {
  const fns = { invoices: renderInvoices, inventory: renderInventory, returns: renderReturns, activity: renderActivity, users: renderUsers };
  (fns[state.tab] || renderInvoices)();
}

/* ---------- Invoices ---------- */
async function renderInvoices() {
  const view = $('#view');
  view.innerHTML = `
    <div class="toolbar">
      <input type="search" id="inv-search" placeholder="${esc(t('search'))}" value="${esc(state.invoiceFilter)}" />
      <button class="btn" id="inv-refresh">${esc(t('refresh'))}</button>
    </div>
    <div class="card" id="inv-card"><div class="empty">${esc(t('loading'))}</div></div>`;
  $('#inv-search').addEventListener('input', (e) => { state.invoiceFilter = e.target.value; drawInvoiceTable(); });
  $('#inv-refresh').addEventListener('click', loadInvoices);
  await loadInvoices();
}
async function loadInvoices() {
  try {
    const { invoices } = await window.api.get('/api/invoices');
    state.invoices = invoices;
    drawInvoiceTable();
  } catch (e) {
    $('#inv-card').innerHTML = `<div class="empty">${esc(t('error'))}: ${esc(e.message)}</div>`;
  }
}
function drawInvoiceTable() {
  const card = $('#inv-card');
  if (!card) return;
  const f = state.invoiceFilter.toLowerCase();
  const rows = state.invoices.filter((i) =>
    !f || (i.invoice_number + ' ' + (i.customer_name || '')).toLowerCase().includes(f));
  if (rows.length === 0) { card.innerHTML = `<div class="empty">${esc(t('none'))}</div>`; return; }
  card.innerHTML = `
    <table>
      <thead><tr>
        <th>${esc(t('invoice_no'))}</th><th>${esc(t('customer'))}</th>
        <th>${esc(t('payment'))}</th><th>${esc(t('pickup'))}</th>
        <th class="num">${esc(t('amount_due'))}</th>
      </tr></thead>
      <tbody>${rows.map((i) => `
        <tr class="clickable" data-id="${esc(i.id)}">
          <td><strong>#${esc(i.invoice_number)}</strong></td>
          <td>${esc(i.customer_name || '—')}</td>
          <td>${paymentBadge(i.status)}</td>
          <td>${pickupBadge(i.pickup_status)}</td>
          <td class="num">${fmtMoney(i.amount_due, i.currency)}</td>
        </tr>`).join('')}</tbody>
    </table>`;
  $$('tr.clickable', card).forEach((tr) => tr.addEventListener('click', () => openInvoice(tr.dataset.id)));
}

/* ---------- Invoice detail modal ---------- */
async function openInvoice(id) {
  let data;
  try {
    data = await window.api.get('/api/invoices/' + id);
  } catch (e) { return toast(e.message, true); }
  const { invoice, pickups, returns } = data;

  const itemsRows = invoice.items.map((it) => `
    <tr>
      <td>${esc(it.name)}${it.variation_name ? ` <span class="muted">(${esc(it.variation_name)})</span>` : ''}</td>
      <td class="num">${it.quantity}</td>
      <td class="num">${it.picked}</td>
      <td class="num"><strong>${it.remaining}</strong></td>
    </tr>`).join('');

  const pickupHistory = pickups.length ? pickups.map((p) => {
    const items = safeItems(p.items_json).map((x) => `${esc(x.name)} ×${x.qty}`).join('、');
    return `<div class="history-item">
      <div><strong>${esc(p.picked_by_name)}</strong> — ${esc(items)}</div>
      <div class="meta">${esc(t('at'))}: ${fmtDateTime(p.picked_at)} · ${esc(t('by'))}: ${esc(p.created_by_name || '')}${p.notes ? ' · ' + esc(p.notes) : ''}</div>
      ${p.signature ? `<img class="sig-thumb" src="${esc(p.signature)}" alt="signature" />` : ''}
      <div style="margin-top:6px"><button class="btn btn-sm btn-danger" data-del-pickup="${p.id}">${esc(t('delete'))}</button></div>
    </div>`;
  }).join('') : `<div class="muted">${esc(t('none'))}</div>`;

  const returnHistory = returns.length ? returns.map((r) => {
    const items = safeItems(r.items_json).map((x) => `${esc(x.name)} ×${x.qty}`).join('、');
    return `<div class="history-item">
      <div><span class="badge ${r.type === 'exchange' ? 'badge-amber' : 'badge-red'}">${esc(t(r.type === 'exchange' ? 'type_exchange' : 'type_return'))}</span> ${esc(items)}</div>
      <div class="meta">${esc(t('handler'))}: ${esc(r.handled_by_name)} · ${fmtDateTime(r.created_at)}${r.reason ? ' · ' + esc(r.reason) : ''}</div>
    </div>`;
  }).join('') : `<div class="muted">${esc(t('none'))}</div>`;

  const modal = openModal(`#${esc(invoice.invoice_number)} · ${esc(invoice.customer_name || '')}`, `
    <div class="info-grid">
      <div><div class="k">${esc(t('payment'))}</div><div class="v">${paymentBadge(invoice.status)}</div></div>
      <div><div class="k">${esc(t('pickup'))}</div><div class="v">${pickupBadge(invoice.pickup_status)}</div></div>
      <div><div class="k">${esc(t('total'))}</div><div class="v">${fmtMoney(invoice.total, invoice.currency)}</div></div>
      <div><div class="k">${esc(t('amount_due'))}</div><div class="v">${fmtMoney(invoice.amount_due, invoice.currency)}</div></div>
    </div>
    <table>
      <thead><tr><th>${esc(t('item'))}</th><th class="num">${esc(t('qty_ordered'))}</th><th class="num">${esc(t('qty_picked'))}</th><th class="num">${esc(t('qty_remaining'))}</th></tr></thead>
      <tbody>${itemsRows}</tbody>
    </table>

    <div class="section-title">${esc(t('record_pickup'))}</div>
    <div id="pickup-form-host"></div>

    <div class="section-title">${esc(t('pickup_history'))}</div>
    <div id="pickup-history">${pickupHistory}</div>

    <div class="section-title">${esc(t('return_history'))}</div>
    <div id="return-history">${returnHistory}</div>
  `, [
    { label: t('record_return'), class: 'btn', onClick: () => { closeModal(); openReturnForm(invoice); } },
  ]);

  // Build pickup form (only items with remaining > 0 are pickable).
  buildPickupForm($('#pickup-form-host', modal), invoice);

  $$('[data-del-pickup]', modal).forEach((b) => b.addEventListener('click', async () => {
    if (!confirm(t('confirm_delete'))) return;
    try { await window.api.del('/api/pickups/' + b.dataset.delPickup); closeModal(); openInvoice(id); }
    catch (e) { toast(e.message, true); }
  }));
}

function safeItems(json) { try { return JSON.parse(json) || []; } catch { return []; } }

function buildPickupForm(host, invoice) {
  const pickable = invoice.items.filter((it) => it.remaining > 0);
  if (pickable.length === 0) {
    host.innerHTML = `<div class="muted">${esc(t('pickup_complete'))} ✓</div>`;
    return;
  }
  host.innerHTML = `
    <div class="muted" style="margin-bottom:8px">${esc(t('select_items'))}</div>
    <table><tbody>${pickable.map((it, idx) => `
      <tr>
        <td style="width:34px"><input type="checkbox" data-pick="${idx}" checked /></td>
        <td>${esc(it.name)}${it.variation_name ? ` <span class="muted">(${esc(it.variation_name)})</span>` : ''} <span class="muted">(${esc(t('qty_remaining'))}: ${it.remaining})</span></td>
        <td class="num"><input class="field qty-input" type="number" min="1" max="${it.remaining}" value="${it.remaining}" data-qty="${idx}" /></td>
      </tr>`).join('')}</tbody></table>
    <div class="row" style="margin-top:12px">
      <div class="field"><label>${esc(t('pickup_person'))}</label><input id="pk-person" type="text" /></div>
      <div class="field"><label>${esc(t('pickup_datetime'))}</label><input id="pk-when" type="datetime-local" value="${nowLocalInput()}" /></div>
    </div>
    <div class="field"><label>${esc(t('notes'))}</label><textarea id="pk-notes"></textarea></div>
    <div class="field">
      <label>${esc(t('signature'))}</label>
      <canvas id="pk-sig" class="sig-canvas"></canvas>
      <button type="button" class="btn btn-sm" id="pk-sig-clear" style="margin-top:6px">${esc(t('clear_signature'))}</button>
    </div>
    <button class="btn btn-primary btn-block" id="pk-save">${esc(t('save'))}</button>`;

  const pad = new window.SignaturePad($('#pk-sig', host));
  $('#pk-sig-clear', host).addEventListener('click', () => pad.clear());

  $('#pk-save', host).addEventListener('click', async () => {
    const items = pickable
      .map((it, idx) => {
        const checked = $(`[data-pick="${idx}"]`, host).checked;
        const qty = Number($(`[data-qty="${idx}"]`, host).value || 0);
        return checked && qty > 0 ? { uid: it.uid, name: it.name, qty: Math.min(qty, it.remaining) } : null;
      })
      .filter(Boolean);
    const person = $('#pk-person', host).value.trim();
    if (!person) return toast(t('pickup_person'), true);
    if (items.length === 0) return toast(t('select_items'), true);

    const whenVal = $('#pk-when', host).value;
    const btn = $('#pk-save', host);
    btn.disabled = true; btn.textContent = t('saving');
    try {
      await window.api.post('/api/pickups', {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        order_id: invoice.order_id,
        customer_name: invoice.customer_name,
        items,
        picked_by_name: person,
        signature: pad.toDataURL(),
        picked_at: whenVal ? new Date(whenVal).toISOString() : new Date().toISOString(),
        notes: $('#pk-notes', host).value.trim(),
      });
      toast(t('save') + ' ✓');
      closeModal();
      openInvoice(invoice.id);
      loadInvoices();
    } catch (e) {
      toast(e.message, true);
      btn.disabled = false; btn.textContent = t('save');
    }
  });
}

/* ---------- Returns ---------- */
async function renderReturns() {
  const view = $('#view');
  view.innerHTML = `
    <div class="toolbar">
      <button class="btn btn-primary" id="ret-new">${esc(t('new_return'))}</button>
      <button class="btn" id="ret-refresh">${esc(t('refresh'))}</button>
    </div>
    <div class="card" id="ret-card"><div class="empty">${esc(t('loading'))}</div></div>`;
  $('#ret-new').addEventListener('click', () => openReturnForm(null));
  $('#ret-refresh').addEventListener('click', loadReturns);
  await loadReturns();
}
async function loadReturns() {
  try {
    const { returns } = await window.api.get('/api/returns');
    state.returns = returns;
    const card = $('#ret-card');
    if (!returns.length) { card.innerHTML = `<div class="empty">${esc(t('none'))}</div>`; return; }
    card.innerHTML = `<table><thead><tr>
        <th>${esc(t('return_type'))}</th><th>${esc(t('invoice_no'))}</th><th>${esc(t('item'))}</th>
        <th>${esc(t('handler'))}</th><th>${esc(t('reason'))}</th><th>${esc(t('act_time'))}</th>
      </tr></thead><tbody>${returns.map((r) => {
        const items = safeItems(r.items_json).map((x) => `${esc(x.name)} ×${x.qty}`).join('、');
        return `<tr>
          <td><span class="badge ${r.type === 'exchange' ? 'badge-amber' : 'badge-red'}">${esc(t(r.type === 'exchange' ? 'type_exchange' : 'type_return'))}</span></td>
          <td>${r.invoice_number ? '#' + esc(r.invoice_number) : '—'}</td>
          <td>${items}</td><td>${esc(r.handled_by_name)}</td>
          <td>${esc(r.reason || '')}</td><td class="muted">${fmtDateTime(r.created_at)}</td>
        </tr>`;
      }).join('')}</tbody></table>`;
  } catch (e) {
    $('#ret-card').innerHTML = `<div class="empty">${esc(t('error'))}: ${esc(e.message)}</div>`;
  }
}
function openReturnForm(invoice) {
  const prefill = invoice ? invoice.items.map((it) => ({ name: it.name, qty: 1 })) : [{ name: '', qty: 1 }];
  const modal = openModal(t('new_return'), `
    <div class="row">
      <div class="field"><label>${esc(t('return_type'))}</label>
        <select id="rt-type"><option value="return">${esc(t('type_return'))}</option><option value="exchange">${esc(t('type_exchange'))}</option></select></div>
      <div class="field"><label>${esc(t('invoice_no'))}</label><input id="rt-invno" type="text" value="${invoice ? esc(invoice.invoice_number) : ''}" /></div>
    </div>
    <div class="field"><label>${esc(t('customer'))}</label><input id="rt-customer" type="text" value="${invoice ? esc(invoice.customer_name || '') : ''}" /></div>
    <div class="section-title">${esc(t('item'))}</div>
    <div id="rt-items"></div>
    <button type="button" class="btn btn-sm" id="rt-add">+ ${esc(t('item'))}</button>
    <div class="row" style="margin-top:12px">
      <div class="field"><label>${esc(t('handler'))}</label><input id="rt-handler" type="text" /></div>
    </div>
    <div class="field"><label>${esc(t('reason'))}</label><textarea id="rt-reason"></textarea></div>
  `, [
    { label: t('cancel'), class: 'btn', onClick: closeModal },
    { label: t('save'), class: 'btn btn-primary', onClick: saveReturn },
  ]);

  const itemsHost = $('#rt-items', modal);
  function addRow(item) {
    const row = el(`<div class="row" style="margin-bottom:8px">
      <div class="field" style="flex:3"><input type="text" placeholder="${esc(t('item'))}" value="${esc(item.name || '')}" data-rt-name /></div>
      <div class="field" style="flex:1"><input type="number" min="1" value="${item.qty || 1}" data-rt-qty /></div>
      <button type="button" class="btn btn-sm" data-rt-del>✕</button>
    </div>`);
    $('[data-rt-del]', row).addEventListener('click', () => row.remove());
    itemsHost.appendChild(row);
  }
  prefill.forEach(addRow);
  $('#rt-add', modal).addEventListener('click', () => addRow({ name: '', qty: 1 }));

  async function saveReturn() {
    const items = $$('.row', itemsHost).map((r) => ({
      name: $('[data-rt-name]', r).value.trim(),
      qty: Number($('[data-rt-qty]', r).value || 0),
    })).filter((x) => x.name && x.qty > 0);
    const handler = $('#rt-handler', modal).value.trim();
    if (!handler) return toast(t('handler'), true);
    if (!items.length) return toast(t('item'), true);
    try {
      await window.api.post('/api/returns', {
        invoice_number: $('#rt-invno', modal).value.trim() || null,
        type: $('#rt-type', modal).value,
        customer_name: $('#rt-customer', modal).value.trim() || null,
        items,
        reason: $('#rt-reason', modal).value.trim() || null,
        handled_by_name: handler,
      });
      toast(t('save') + ' ✓');
      closeModal();
      if (state.tab === 'returns') loadReturns();
    } catch (e) { toast(e.message, true); }
  }
}

/* ---------- Inventory ---------- */
async function renderInventory() {
  const view = $('#view');
  view.innerHTML = `
    <div class="toolbar">
      <input type="search" id="stk-search" placeholder="${esc(t('search'))}" value="${esc(state.inventoryFilter)}" />
      <button class="btn" id="stk-refresh">${esc(t('refresh'))}</button>
    </div>
    <div class="card" id="stk-card"><div class="empty">${esc(t('loading'))}</div></div>`;
  $('#stk-search').addEventListener('input', (e) => { state.inventoryFilter = e.target.value; drawInventory(); });
  $('#stk-refresh').addEventListener('click', loadInventory);
  await loadInventory();
}
async function loadInventory() {
  try {
    const { items } = await window.api.get('/api/inventory');
    state.inventory = items;
    drawInventory();
  } catch (e) {
    $('#stk-card').innerHTML = `<div class="empty">${esc(t('error'))}: ${esc(e.message)}</div>`;
  }
}
function drawInventory() {
  const card = $('#stk-card');
  if (!card) return;
  const f = state.inventoryFilter.toLowerCase();
  const rows = state.inventory.filter((i) => !f || (i.name || '').toLowerCase().includes(f));
  if (!rows.length) { card.innerHTML = `<div class="empty">${esc(t('none'))}</div>`; return; }
  card.innerHTML = `<table><thead><tr>
      <th>${esc(t('item'))}</th><th class="num">${esc(t('stock_qty'))}</th><th>${esc(t('status'))}</th>
    </tr></thead><tbody>${rows.map((i) => `
      <tr><td>${esc(i.name)}</td><td class="num">${i.quantity}</td>
        <td>${i.quantity > 0 ? `<span class="badge badge-green">${esc(t('in_stock'))}</span>` : `<span class="badge badge-red">${esc(t('out_of_stock'))}</span>`}</td>
      </tr>`).join('')}</tbody></table>`;
}

/* ---------- Activity ---------- */
async function renderActivity() {
  const view = $('#view');
  view.innerHTML = `<div class="toolbar"><button class="btn" id="act-refresh">${esc(t('refresh'))}</button></div>
    <div class="card" id="act-card"><div class="empty">${esc(t('loading'))}</div></div>`;
  $('#act-refresh').addEventListener('click', renderActivity);
  try {
    const { activity } = await window.api.get('/api/activity');
    const card = $('#act-card');
    if (!activity.length) { card.innerHTML = `<div class="empty">${esc(t('none'))}</div>`; return; }
    card.innerHTML = `<table><thead><tr>
        <th>${esc(t('act_time'))}</th><th>${esc(t('act_user'))}</th><th>${esc(t('act_action'))}</th><th>${esc(t('act_detail'))}</th>
      </tr></thead><tbody>${activity.map((a) => `
        <tr><td class="muted">${fmtDateTime(a.created_at)}</td><td>${esc(a.user_name || '')}</td>
          <td>${esc(a.action)}</td><td class="muted">${esc(a.detail || '')}</td></tr>`).join('')}</tbody></table>`;
  } catch (e) {
    $('#act-card').innerHTML = `<div class="empty">${esc(t('error'))}: ${esc(e.message)}</div>`;
  }
}

/* ---------- Users (admin) ---------- */
async function renderUsers() {
  const view = $('#view');
  view.innerHTML = `<div class="toolbar"><button class="btn btn-primary" id="usr-new">${esc(t('new_user'))}</button>
    <button class="btn" id="usr-refresh">${esc(t('refresh'))}</button></div>
    <div class="card" id="usr-card"><div class="empty">${esc(t('loading'))}</div></div>`;
  $('#usr-new').addEventListener('click', openUserForm);
  $('#usr-refresh').addEventListener('click', loadUsers);
  await loadUsers();
}
async function loadUsers() {
  try {
    const { users } = await window.api.get('/api/users');
    state.users = users;
    const card = $('#usr-card');
    card.innerHTML = `<table><thead><tr>
        <th>${esc(t('name'))}</th><th>${esc(t('email'))}</th><th>${esc(t('role'))}</th>
        <th>${esc(t('status'))}</th><th>${esc(t('created_at'))}</th><th></th>
      </tr></thead><tbody>${users.map((u) => `
        <tr>
          <td>${esc(u.name)}</td><td>${esc(u.email)}</td>
          <td>${esc(t(u.role === 'admin' ? 'admin' : 'staff'))}</td>
          <td>${u.active ? `<span class="badge badge-green">${esc(t('active'))}</span>` : `<span class="badge badge-gray">${esc(t('disabled'))}</span>`}</td>
          <td class="muted">${fmtDateTime(u.created_at)}</td>
          <td>
            <button class="btn btn-sm" data-toggle="${u.id}" data-active="${u.active}">${esc(t(u.active ? 'disable' : 'enable'))}</button>
            <button class="btn btn-sm" data-reset="${u.id}">${esc(t('reset_password'))}</button>
          </td>
        </tr>`).join('')}</tbody></table>`;
    $$('[data-toggle]', card).forEach((b) => b.addEventListener('click', async () => {
      await window.api.patch('/api/users/' + b.dataset.toggle, { active: b.dataset.active !== '1' });
      loadUsers();
    }));
    $$('[data-reset]', card).forEach((b) => b.addEventListener('click', async () => {
      const pw = prompt(t('reset_password') + ':');
      if (!pw) return;
      await window.api.patch('/api/users/' + b.dataset.reset, { password: pw });
      toast(t('save') + ' ✓');
    }));
  } catch (e) {
    $('#usr-card').innerHTML = `<div class="empty">${esc(t('error'))}: ${esc(e.message)}</div>`;
  }
}
function openUserForm() {
  const modal = openModal(t('new_user'), `
    <div class="field"><label>${esc(t('name'))}</label><input id="u-name" type="text" /></div>
    <div class="field"><label>${esc(t('email'))}</label><input id="u-email" type="email" /></div>
    <div class="field"><label>${esc(t('password'))}</label><input id="u-pw" type="text" /></div>
    <div class="field"><label>${esc(t('role'))}</label>
      <select id="u-role"><option value="staff">${esc(t('staff'))}</option><option value="admin">${esc(t('admin'))}</option></select></div>
  `, [
    { label: t('cancel'), class: 'btn', onClick: closeModal },
    { label: t('save'), class: 'btn btn-primary', onClick: async () => {
      try {
        await window.api.post('/api/users', {
          name: $('#u-name', modal).value.trim(),
          email: $('#u-email', modal).value.trim(),
          password: $('#u-pw', modal).value,
          role: $('#u-role', modal).value,
        });
        toast(t('save') + ' ✓');
        closeModal();
        loadUsers();
      } catch (e) { toast(e.message, true); }
    } },
  ]);
}

/* ---------- Modal ---------- */
function openModal(title, bodyHtml, footerButtons = []) {
  closeModal();
  const overlay = el(`<div class="modal-overlay"><div class="modal">
    <div class="modal-header"><h2>${esc(title)}</h2><button class="close-x">&times;</button></div>
    <div class="modal-body">${bodyHtml}</div>
    <div class="modal-footer"></div>
  </div></div>`);
  const footer = $('.modal-footer', overlay);
  footerButtons.forEach((b) => {
    const btn = el(`<button class="${b.class}">${esc(b.label)}</button>`);
    btn.addEventListener('click', b.onClick);
    footer.appendChild(btn);
  });
  if (!footerButtons.length) footer.remove();
  $('.close-x', overlay).addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  $('#modal-root').appendChild(overlay);
  return overlay;
}
function closeModal() { $('#modal-root').innerHTML = ''; }

/* ---------- Events ---------- */
$('#login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = $('#login-btn');
  $('#login-error').textContent = '';
  btn.disabled = true; btn.textContent = t('signing_in');
  try {
    const { user } = await window.api.post('/api/auth/login', {
      email: $('#login-email').value, password: $('#login-password').value,
    });
    state.user = user;
    showApp();
  } catch (err) {
    $('#login-error').textContent = err.message;
  } finally {
    btn.disabled = false; btn.textContent = t('login');
  }
});

$('#logout-btn').addEventListener('click', async () => {
  await window.api.post('/api/auth/logout');
  state.user = null;
  if (socket) { socket.disconnect(); socket = null; }
  showLogin();
});

function toggleLang() {
  window.setLang(window.getLang() === 'zh' ? 'en' : 'zh');
  applyI18n();
  if (state.user) refreshCurrentTab();
}
$('#lang-btn').addEventListener('click', toggleLang);
$('#login-lang').addEventListener('click', toggleLang);
$$('.tab').forEach((b) => b.addEventListener('click', () => selectTab(b.dataset.tab)));

boot();
