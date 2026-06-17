'use strict';

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const config = require('./config');
const { db } = require('./db');

function hashPassword(plain) {
  return bcrypt.hashSync(plain, 10);
}

function verifyPassword(plain, hash) {
  return bcrypt.compareSync(plain, hash);
}

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name, role: user.role },
    config.jwtSecret,
    { expiresIn: '30d' }
  );
}

function getUserFromToken(token) {
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = db
      .prepare('SELECT id, email, name, role, active FROM users WHERE id = ?')
      .get(payload.id);
    if (!user || !user.active) return null;
    return user;
  } catch {
    return null;
  }
}

// Express middleware: requires a valid token (cookie or Bearer header).
function requireAuth(req, res, next) {
  const token =
    (req.cookies && req.cookies.token) ||
    (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const user = getUserFromToken(token);
  if (!user) return res.status(401).json({ error: '请先登录 / Please sign in' });
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: '需要管理员权限 / Admin only' });
  }
  next();
}

module.exports = {
  hashPassword,
  verifyPassword,
  signToken,
  getUserFromToken,
  requireAuth,
  requireAdmin,
};
