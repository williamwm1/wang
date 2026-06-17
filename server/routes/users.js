'use strict';

const express = require('express');
const { db, logActivity } = require('../db');
const auth = require('../auth');

const router = express.Router();
router.use(auth.requireAuth);

// GET /api/users  -> list staff (admin only)
router.get('/', auth.requireAdmin, (req, res) => {
  const users = db
    .prepare('SELECT id, email, name, role, active, created_at FROM users ORDER BY created_at')
    .all();
  res.json({ users });
});

// POST /api/users  -> create a staff account (admin only)
router.post('/', auth.requireAdmin, (req, res) => {
  const { email, name, password, role } = req.body || {};
  if (!email || !name || !password) {
    return res.status(400).json({ error: '邮箱、姓名、密码均必填 / Email, name, password required' });
  }
  const normalized = String(email).toLowerCase().trim();
  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(normalized);
  if (exists) return res.status(409).json({ error: '该邮箱已存在 / Email already exists' });

  const info = db
    .prepare('INSERT INTO users (email, name, password_hash, role) VALUES (?,?,?,?)')
    .run(normalized, name.trim(), auth.hashPassword(password), role === 'admin' ? 'admin' : 'staff');
  logActivity(req.user, 'user.create', `email=${normalized}`);
  res.status(201).json({ id: info.lastInsertRowid });
});

// PATCH /api/users/:id  -> enable/disable or reset password (admin only)
router.patch('/:id', auth.requireAdmin, (req, res) => {
  const { active, password, role } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Not found' });

  if (typeof active === 'boolean') {
    db.prepare('UPDATE users SET active = ? WHERE id = ?').run(active ? 1 : 0, user.id);
  }
  if (password) {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(
      auth.hashPassword(password),
      user.id
    );
  }
  if (role === 'admin' || role === 'staff') {
    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, user.id);
  }
  logActivity(req.user, 'user.update', `id=${user.id}`);
  res.json({ ok: true });
});

module.exports = router;
