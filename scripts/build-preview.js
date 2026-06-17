'use strict';

/**
 * Builds a single self-contained, server-less preview of the UI at
 * public/preview.html. Open it directly in any browser (incl. phone) to
 * click around with sample data — no server, no Square needed.
 *
 *   node scripts/build-preview.js
 */

const fs = require('fs');
const path = require('path');

const css = fs.readFileSync(path.join(__dirname, '..', 'public', 'css', 'styles.css'), 'utf8');

// Sample data with pickup progress baked in.
const demo = {
  invoices: [
    {
      id: 'demo-1', invoice_number: '1024', status: 'PAID', customer_name: '张伟 / Wei Zhang',
      currency: 'USD', total: 48000, amount_due: 0, pickup_status: 'complete',
      items: [
        { uid: 'i1', name: '橡木餐桌 / Oak dining table', variation_name: '1.6m', quantity: 1, picked: 1, remaining: 0, total: 32000 },
        { uid: 'i2', name: '餐椅 / Dining chair', variation_name: '胡桃色', quantity: 4, picked: 4, remaining: 0, total: 16000 },
      ],
      pickups: [
        { picked_by_name: '张伟', items: [{ name: '橡木餐桌', qty: 1 }, { name: '餐椅', qty: 4 }], picked_at: '2026-06-15T08:20:00Z', created_by_name: '小美', notes: '当面验收无误' },
      ],
      returns: [],
    },
    {
      id: 'demo-2', invoice_number: '1025', status: 'PARTIALLY_PAID', customer_name: '李娜 / Na Li',
      currency: 'USD', total: 26000, amount_due: 13000, pickup_status: 'partial',
      items: [
        { uid: 'i3', name: '布艺沙发 / Fabric sofa', variation_name: '三人位', quantity: 2, picked: 1, remaining: 1, total: 26000 },
      ],
      pickups: [
        { picked_by_name: '李娜的司机', items: [{ name: '布艺沙发', qty: 1 }], picked_at: '2026-06-16T10:05:00Z', created_by_name: '阿强', notes: '先提一件' },
      ],
      returns: [],
    },
    {
      id: 'demo-3', invoice_number: '1026', status: 'UNPAID', customer_name: '王芳 / Fang Wang',
      currency: 'USD', total: 9000, amount_due: 9000, pickup_status: 'none',
      items: [
        { uid: 'i4', name: '落地灯 / Floor lamp', variation_name: '', quantity: 2, picked: 0, remaining: 2, total: 6000 },
        { uid: 'i5', name: '地毯 / Area rug', variation_name: '2x3m', quantity: 1, picked: 0, remaining: 1, total: 3000 },
      ],
      pickups: [],
      returns: [{ type: 'exchange', items: [{ name: '地毯', qty: 1 }], handled_by_name: '阿强', reason: '颜色不符，换灰色', created_at: '2026-06-17T03:00:00Z' }],
    },
  ],
  inventory: [
    { name: '橡木餐桌 / Oak dining table - 1.6m', quantity: 5 },
    { name: '餐椅 / Dining chair - 胡桃色', quantity: 23 },
    { name: '布艺沙发 / Fabric sofa - 三人位', quantity: 0 },
    { name: '落地灯 / Floor lamp', quantity: 12 },
    { name: '地毯 / Area rug - 2x3m', quantity: 7 },
  ],
  returns: [
    { type: 'exchange', invoice_number: '1026', items: [{ name: '地毯', qty: 1 }], handled_by_name: '阿强', reason: '颜色不符，换灰色', created_at: '2026-06-17T03:00:00Z' },
    { type: 'return', invoice_number: '1019', items: [{ name: '台灯', qty: 1 }], handled_by_name: '小美', reason: '客户不喜欢', created_at: '2026-06-14T07:30:00Z' },
  ],
  activity: [
    { user_name: '小美', action: 'pickup.create', detail: 'invoice=1024', created_at: '2026-06-15T08:20:00Z' },
    { user_name: '阿强', action: 'pickup.create', detail: 'invoice=1025', created_at: '2026-06-16T10:05:00Z' },
    { user_name: '阿强', action: 'return.create', detail: 'type=exchange invoice=1026', created_at: '2026-06-17T03:00:00Z' },
    { user_name: '老板', action: 'user.create', detail: 'email=amei@store.com', created_at: '2026-06-13T01:00:00Z' },
  ],
  users: [
    { name: '老板 / Owner', email: 'owner@store.com', role: 'admin', active: 1, created_at: '2026-06-10T00:00:00Z' },
    { name: '小美 / Mei', email: 'amei@store.com', role: 'staff', active: 1, created_at: '2026-06-13T01:00:00Z' },
    { name: '阿强 / Qiang', email: 'qiang@store.com', role: 'staff', active: 1, created_at: '2026-06-13T01:05:00Z' },
  ],
};

const html = `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
<title>界面预览 / UI Preview — 提货管理系统</title>
<style>
${css}
.preview-flag{position:fixed;top:8px;right:8px;z-index:200;background:#1d2733;color:#fff;font-size:11px;padding:4px 8px;border-radius:6px;opacity:.85}
</style>
</head>
<body>
<div class="preview-flag">预览 / PREVIEW · 样例数据</div>
<div id="login-screen" class="login-screen">
  <div class="login-card">
    <h1 id="login-title">提货管理系统</h1>
    <div class="field"><label data-i18n="email">邮箱</label><input type="email" value="owner@store.com" /></div>
    <div class="field"><label data-i18n="password">密码</label><input type="password" value="demo1234" /></div>
    <button class="btn btn-primary btn-block" id="demo-login">登录</button>
    <button type="button" class="btn-link" id="login-lang"></button>
  </div>
</div>
<div id="app" class="hidden">
  <header class="topbar">
    <div class="brand" data-i18n="app_title">提货管理系统</div>
    <nav class="tabs">
      <button class="tab" data-tab="invoices" data-i18n="tab_invoices"></button>
      <button class="tab" data-tab="inventory" data-i18n="tab_inventory"></button>
      <button class="tab" data-tab="returns" data-i18n="tab_returns"></button>
      <button class="tab" data-tab="activity" data-i18n="tab_activity"></button>
      <button class="tab" data-tab="users" data-i18n="tab_users"></button>
    </nav>
    <div class="topbar-right">
      <span class="presence">3 <span data-i18n="online">在线</span></span>
      <span class="current-user">老板 (admin)</span>
      <button id="lang-btn" class="btn-link"></button>
    </div>
  </header>
  <main id="view" class="view"></main>
</div>
<div id="modal-root"></div>
<script>
const DEMO = ${JSON.stringify(demo)};
${buildClientScript()}
</script>
</body>
</html>`;

fs.writeFileSync(path.join(__dirname, '..', 'public', 'preview.html'), html);
console.log('已生成 public/preview.html');

function buildClientScript() {
  // The client runtime is defined as a real function then stringified, so it
  // can be edited with normal tooling instead of living inside a string.
  return '(' + clientRuntime.toString() + ')();';
}

function clientRuntime() {
  const I18N = {
    zh: { app_title:'提货管理系统', email:'邮箱', password:'密码', online:'在线', logout:'退出', lang:'EN',
      tab_invoices:'发票 / 提货', tab_inventory:'库存', tab_returns:'退换货', tab_activity:'操作记录', tab_users:'员工管理',
      search:'搜索…', refresh:'刷新', none:'暂无数据', invoice_no:'发票号', customer:'客户', payment:'付款状态', pickup:'提货状态',
      amount_due:'待付金额', total:'总额', paid:'已付', unpaid:'未付', partially_paid:'部分付款', pickup_none:'未提货', pickup_partial:'部分提货', pickup_complete:'已提完',
      item:'货物名称', qty_ordered:'订购数量', qty_picked:'已提', qty_remaining:'剩余', record_pickup:'登记提货', record_return:'登记退换货',
      pickup_history:'提货记录', return_history:'退换货记录', select_items:'选择本次提取的货物及数量', pickup_person:'提货人', pickup_datetime:'提货日期时间',
      notes:'备注', signature:'提货人签名', clear_signature:'清除签名', save:'保存', cancel:'取消', by:'操作人', at:'时间',
      return_type:'类型', type_return:'退货', type_exchange:'换货', reason:'原因', handler:'经办人', new_return:'新建退换货',
      stock_qty:'库存数量', status:'状态', in_stock:'有货', out_of_stock:'缺货', name:'姓名', role:'角色', admin:'管理员', staff:'员工',
      active:'启用', new_user:'新建账号', reset_password:'重置密码', disable:'停用', created_at:'创建时间',
      act_time:'时间', act_user:'操作人', act_action:'操作', act_detail:'详情', saved_demo:'（预览模式：仅演示，未真正保存）' },
    en: { app_title:'Pickup Management', email:'Email', password:'Password', online:'online', logout:'Sign out', lang:'中文',
      tab_invoices:'Invoices / Pickup', tab_inventory:'Inventory', tab_returns:'Returns', tab_activity:'Activity Log', tab_users:'Staff',
      search:'Search…', refresh:'Refresh', none:'No data', invoice_no:'Invoice #', customer:'Customer', payment:'Payment', pickup:'Pickup',
      amount_due:'Amount due', total:'Total', paid:'Paid', unpaid:'Unpaid', partially_paid:'Partially paid', pickup_none:'Not picked up', pickup_partial:'Partial', pickup_complete:'Complete',
      item:'Item', qty_ordered:'Ordered', qty_picked:'Picked', qty_remaining:'Remaining', record_pickup:'Record pickup', record_return:'Record return',
      pickup_history:'Pickup history', return_history:'Return history', select_items:'Select items & quantities', pickup_person:'Picked up by', pickup_datetime:'Pickup date & time',
      notes:'Notes', signature:'Signature', clear_signature:'Clear', save:'Save', cancel:'Cancel', by:'By', at:'At',
      return_type:'Type', type_return:'Return', type_exchange:'Exchange', reason:'Reason', handler:'Handled by', new_return:'New return / exchange',
      stock_qty:'Stock qty', status:'Status', in_stock:'In stock', out_of_stock:'Out of stock', name:'Name', role:'Role', admin:'Admin', staff:'Staff',
      active:'Active', new_user:'New account', reset_password:'Reset password', disable:'Disable', created_at:'Created',
      act_time:'Time', act_user:'User', act_action:'Action', act_detail:'Detail', saved_demo:'(Preview mode: demo only, not saved)' },
  };
  let lang = 'zh';
  let tab = 'invoices';
  const t = (k) => (I18N[lang] && I18N[lang][k]) || I18N.zh[k] || k;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
  const esc = (s) => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const el = (h) => { const x = document.createElement('template'); x.innerHTML = h.trim(); return x.content.firstElementChild; };
  const money = (m, c) => { try { return new Intl.NumberFormat(lang==='zh'?'zh-CN':'en-US',{style:'currency',currency:c||'USD'}).format((m||0)/100);} catch(e){ return ((m||0)/100).toFixed(2);} };
  const dt = (iso) => { const d=new Date(iso); return isNaN(d)?iso:d.toLocaleString(lang==='zh'?'zh-CN':'en-US'); };
  const toast = (msg) => { const o=$('.toast'); if(o)o.remove(); const x=el('<div class="toast">'+esc(msg)+'</div>'); document.body.appendChild(x); setTimeout(()=>x.remove(),3000); };

  function payBadge(s){ const m={PAID:['badge-green','paid'],UNPAID:['badge-red','unpaid'],PARTIALLY_PAID:['badge-amber','partially_paid']}; const [c,k]=m[s]||['badge-gray',null]; return '<span class="badge '+c+'">'+(k?esc(t(k)):esc(s))+'</span>'; }
  function pickBadge(s){ const m={none:['badge-gray','pickup_none'],partial:['badge-amber','pickup_partial'],complete:['badge-green','pickup_complete']}; const [c,k]=m[s]||['badge-gray','pickup_none']; return '<span class="badge '+c+'">'+esc(t(k))+'</span>'; }

  function applyI18n(){
    document.documentElement.lang = lang;
    $$('[data-i18n]').forEach((n)=>{ n.textContent = t(n.dataset.i18n); });
    if($('#lang-btn')) $('#lang-btn').textContent = t('lang');
    if($('#login-lang')) $('#login-lang').textContent = t('lang');
    if($('#login-title')) $('#login-title').textContent = t('app_title');
  }

  function selectTab(x){ tab=x; $$('.tab').forEach((b)=>b.classList.toggle('active',b.dataset.tab===x)); render(); }
  function render(){ ({invoices:invoicesView,inventory:inventoryView,returns:returnsView,activity:activityView,users:usersView}[tab]||invoicesView)(); }

  function invoicesView(){
    $('#view').innerHTML = '<div class="toolbar"><input type="search" placeholder="'+esc(t('search'))+'"><button class="btn">'+esc(t('refresh'))+'</button></div>'+
      '<div class="card"><table><thead><tr><th>'+esc(t('invoice_no'))+'</th><th>'+esc(t('customer'))+'</th><th>'+esc(t('payment'))+'</th><th>'+esc(t('pickup'))+'</th><th class="num">'+esc(t('amount_due'))+'</th></tr></thead><tbody>'+
      DEMO.invoices.map((i)=>'<tr class="clickable" data-id="'+i.id+'"><td><strong>#'+esc(i.invoice_number)+'</strong></td><td>'+esc(i.customer_name)+'</td><td>'+payBadge(i.status)+'</td><td>'+pickBadge(i.pickup_status)+'</td><td class="num">'+money(i.amount_due,i.currency)+'</td></tr>').join('')+
      '</tbody></table></div>';
    $$('tr.clickable').forEach((tr)=>tr.addEventListener('click',()=>openInvoice(tr.dataset.id)));
  }

  function openInvoice(id){
    const inv = DEMO.invoices.find((x)=>x.id===id);
    const items = inv.items.map((it)=>'<tr><td>'+esc(it.name)+(it.variation_name?' <span class="muted">('+esc(it.variation_name)+')</span>':'')+'</td><td class="num">'+it.quantity+'</td><td class="num">'+it.picked+'</td><td class="num"><strong>'+it.remaining+'</strong></td></tr>').join('');
    const ph = inv.pickups.length ? inv.pickups.map((p)=>'<div class="history-item"><div><strong>'+esc(p.picked_by_name)+'</strong> — '+p.items.map((x)=>esc(x.name)+' ×'+x.qty).join('、')+'</div><div class="meta">'+esc(t('at'))+': '+dt(p.picked_at)+' · '+esc(t('by'))+': '+esc(p.created_by_name)+(p.notes?' · '+esc(p.notes):'')+'</div></div>').join('') : '<div class="muted">'+esc(t('none'))+'</div>';
    const rh = inv.returns.length ? inv.returns.map((r)=>'<div class="history-item"><div><span class="badge '+(r.type==='exchange'?'badge-amber':'badge-red')+'">'+esc(t(r.type==='exchange'?'type_exchange':'type_return'))+'</span> '+r.items.map((x)=>esc(x.name)+' ×'+x.qty).join('、')+'</div><div class="meta">'+esc(t('handler'))+': '+esc(r.handled_by_name)+' · '+dt(r.created_at)+(r.reason?' · '+esc(r.reason):'')+'</div></div>').join('') : '<div class="muted">'+esc(t('none'))+'</div>';
    const pickable = inv.items.filter((it)=>it.remaining>0);
    const form = pickable.length ? (
      '<div class="muted" style="margin-bottom:8px">'+esc(t('select_items'))+'</div><table><tbody>'+
      pickable.map((it,i)=>'<tr><td style="width:34px"><input type="checkbox" checked></td><td>'+esc(it.name)+' <span class="muted">('+esc(t('qty_remaining'))+': '+it.remaining+')</span></td><td class="num"><input class="field qty-input" type="number" value="'+it.remaining+'" min="1" max="'+it.remaining+'"></td></tr>').join('')+
      '</tbody></table><div class="row" style="margin-top:12px"><div class="field"><label>'+esc(t('pickup_person'))+'</label><input type="text" placeholder="例如：张伟的司机"></div><div class="field"><label>'+esc(t('pickup_datetime'))+'</label><input type="datetime-local"></div></div>'+
      '<div class="field"><label>'+esc(t('notes'))+'</label><textarea></textarea></div>'+
      '<div class="field"><label>'+esc(t('signature'))+'</label><canvas id="sig" class="sig-canvas"></canvas><button type="button" class="btn btn-sm" id="sig-clear" style="margin-top:6px">'+esc(t('clear_signature'))+'</button></div>'+
      '<button class="btn btn-primary btn-block" id="pk-save">'+esc(t('save'))+'</button>'
    ) : '<div class="muted">'+esc(t('pickup_complete'))+' ✓</div>';

    openModal('#'+inv.invoice_number+' · '+inv.customer_name,
      '<div class="info-grid"><div><div class="k">'+esc(t('payment'))+'</div><div class="v">'+payBadge(inv.status)+'</div></div><div><div class="k">'+esc(t('pickup'))+'</div><div class="v">'+pickBadge(inv.pickup_status)+'</div></div><div><div class="k">'+esc(t('total'))+'</div><div class="v">'+money(inv.total,inv.currency)+'</div></div><div><div class="k">'+esc(t('amount_due'))+'</div><div class="v">'+money(inv.amount_due,inv.currency)+'</div></div></div>'+
      '<table><thead><tr><th>'+esc(t('item'))+'</th><th class="num">'+esc(t('qty_ordered'))+'</th><th class="num">'+esc(t('qty_picked'))+'</th><th class="num">'+esc(t('qty_remaining'))+'</th></tr></thead><tbody>'+items+'</tbody></table>'+
      '<div class="section-title">'+esc(t('record_pickup'))+'</div>'+form+
      '<div class="section-title">'+esc(t('pickup_history'))+'</div>'+ph+
      '<div class="section-title">'+esc(t('return_history'))+'</div>'+rh);

    if(pickable.length){ initSig($('#sig')); $('#sig-clear').addEventListener('click',()=>clearSig($('#sig'))); $('#pk-save').addEventListener('click',()=>{ closeModal(); toast(t('save')+' ✓ '+t('saved_demo')); }); }
  }

  function inventoryView(){
    $('#view').innerHTML='<div class="toolbar"><input type="search" placeholder="'+esc(t('search'))+'"><button class="btn">'+esc(t('refresh'))+'</button></div>'+
      '<div class="card"><table><thead><tr><th>'+esc(t('item'))+'</th><th class="num">'+esc(t('stock_qty'))+'</th><th>'+esc(t('status'))+'</th></tr></thead><tbody>'+
      DEMO.inventory.map((i)=>'<tr><td>'+esc(i.name)+'</td><td class="num">'+i.quantity+'</td><td>'+(i.quantity>0?'<span class="badge badge-green">'+esc(t('in_stock'))+'</span>':'<span class="badge badge-red">'+esc(t('out_of_stock'))+'</span>')+'</td></tr>').join('')+
      '</tbody></table></div>';
  }

  function returnsView(){
    $('#view').innerHTML='<div class="toolbar"><button class="btn btn-primary">'+esc(t('new_return'))+'</button></div>'+
      '<div class="card"><table><thead><tr><th>'+esc(t('return_type'))+'</th><th>'+esc(t('invoice_no'))+'</th><th>'+esc(t('item'))+'</th><th>'+esc(t('handler'))+'</th><th>'+esc(t('reason'))+'</th><th>'+esc(t('act_time'))+'</th></tr></thead><tbody>'+
      DEMO.returns.map((r)=>'<tr><td><span class="badge '+(r.type==='exchange'?'badge-amber':'badge-red')+'">'+esc(t(r.type==='exchange'?'type_exchange':'type_return'))+'</span></td><td>#'+esc(r.invoice_number)+'</td><td>'+r.items.map((x)=>esc(x.name)+' ×'+x.qty).join('、')+'</td><td>'+esc(r.handled_by_name)+'</td><td>'+esc(r.reason)+'</td><td class="muted">'+dt(r.created_at)+'</td></tr>').join('')+
      '</tbody></table></div>';
    $('.btn-primary').addEventListener('click',()=>toast(t('new_return')+' '+t('saved_demo')));
  }

  function activityView(){
    $('#view').innerHTML='<div class="card"><table><thead><tr><th>'+esc(t('act_time'))+'</th><th>'+esc(t('act_user'))+'</th><th>'+esc(t('act_action'))+'</th><th>'+esc(t('act_detail'))+'</th></tr></thead><tbody>'+
      DEMO.activity.map((a)=>'<tr><td class="muted">'+dt(a.created_at)+'</td><td>'+esc(a.user_name)+'</td><td>'+esc(a.action)+'</td><td class="muted">'+esc(a.detail)+'</td></tr>').join('')+
      '</tbody></table></div>';
  }

  function usersView(){
    $('#view').innerHTML='<div class="toolbar"><button class="btn btn-primary">'+esc(t('new_user'))+'</button></div>'+
      '<div class="card"><table><thead><tr><th>'+esc(t('name'))+'</th><th>'+esc(t('email'))+'</th><th>'+esc(t('role'))+'</th><th>'+esc(t('status'))+'</th><th>'+esc(t('created_at'))+'</th></tr></thead><tbody>'+
      DEMO.users.map((u)=>'<tr><td>'+esc(u.name)+'</td><td>'+esc(u.email)+'</td><td>'+esc(t(u.role==='admin'?'admin':'staff'))+'</td><td><span class="badge badge-green">'+esc(t('active'))+'</span></td><td class="muted">'+dt(u.created_at)+'</td></tr>').join('')+
      '</tbody></table></div>';
    $('.btn-primary').addEventListener('click',()=>toast(t('new_user')+' '+t('saved_demo')));
  }

  // Signature pad
  const pads = new WeakMap();
  function initSig(c){ const ctx=c.getContext('2d'); const ratio=window.devicePixelRatio||1; const w=c.clientWidth||300,h=c.clientHeight||150; c.width=w*ratio;c.height=h*ratio; ctx.scale(ratio,ratio); ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h); ctx.lineWidth=2.5;ctx.lineCap='round';ctx.strokeStyle='#111'; let drawing=false; const pos=(e)=>{const r=c.getBoundingClientRect();const p=e.touches?e.touches[0]:e;return{x:p.clientX-r.left,y:p.clientY-r.top};}; const start=(e)=>{e.preventDefault();drawing=true;const{x,y}=pos(e);ctx.beginPath();ctx.moveTo(x,y);}; const move=(e)=>{if(!drawing)return;e.preventDefault();const{x,y}=pos(e);ctx.lineTo(x,y);ctx.stroke();}; const end=()=>{drawing=false;}; c.addEventListener('mousedown',start);c.addEventListener('mousemove',move);window.addEventListener('mouseup',end); c.addEventListener('touchstart',start,{passive:false});c.addEventListener('touchmove',move,{passive:false});c.addEventListener('touchend',end); pads.set(c,{ctx,w,h}); }
  function clearSig(c){ const p=pads.get(c); if(!p)return; p.ctx.clearRect(0,0,c.width,c.height); p.ctx.fillStyle='#fff';p.ctx.fillRect(0,0,p.w,p.h); }

  function openModal(title, body){
    closeModal();
    const o = el('<div class="modal-overlay"><div class="modal"><div class="modal-header"><h2>'+esc(title)+'</h2><button class="close-x">&times;</button></div><div class="modal-body">'+body+'</div></div></div>');
    $('.close-x',o).addEventListener('click',closeModal);
    o.addEventListener('click',(e)=>{ if(e.target===o) closeModal(); });
    $('#modal-root').appendChild(o);
  }
  function closeModal(){ $('#modal-root').innerHTML=''; }

  function toggleLang(){ lang = lang==='zh'?'en':'zh'; applyI18n(); if(!$('#app').classList.contains('hidden')) render(); }

  $('#demo-login').addEventListener('click',()=>{ $('#login-screen').classList.add('hidden'); $('#app').classList.remove('hidden'); applyI18n(); selectTab('invoices'); });
  $('#login-lang').addEventListener('click',toggleLang);
  $('#lang-btn').addEventListener('click',toggleLang);
  $$('.tab').forEach((b)=>b.addEventListener('click',()=>selectTab(b.dataset.tab)));
  applyI18n();
}
