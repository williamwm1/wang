'use strict';

const express = require('express');
const { db, logActivity } = require('../db');
const auth = require('../auth');

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: '请输入邮箱和密码 / Email and password required' });
  }
  const user = db
    .prepare('SELECT * FROM users WHERE email = ? AND active = 1')
    .get(String(email).toLowerCase().trim());
  if (!user || !auth.verifyPassword(password, user.password_hash)) {
    return res.status(401).json({ error: '邮箱或密码错误 / Invalid email or password' });
  }
  const token = auth.signToken(user);
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
  logActivity(user, 'login', null);
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

router.get('/me', auth.requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
