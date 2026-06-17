'use strict';

const path = require('path');
const http = require('http');
const express = require('express');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');

const config = require('./config');
const { db } = require('./db');
const { getUserFromToken } = require('./auth');
const { SquareError } = require('./square');

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.set('io', io);

app.use(express.json({ limit: '5mb' })); // signatures are base64 PNGs
app.use(cookieParser());

// API routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/invoices', require('./routes/invoices'));
app.use('/api/pickups', require('./routes/pickups'));
app.use('/api/returns', require('./routes/returns'));
app.use('/api/inventory', require('./routes/inventory'));
app.use('/api/users', require('./routes/users'));
app.use('/api/activity', require('./routes/activity'));

// Tells the front end whether Square is configured (so it can show a banner).
app.get('/api/config', (req, res) => {
  res.json({
    squareConfigured: config.square.configured,
    squareLocationSet: Boolean(config.square.locationId),
    environment: config.square.environment,
  });
});

// Serve the front end.
app.use(express.static(path.join(__dirname, '..', 'public')));

// Central error handler -> clean JSON.
app.use((err, req, res, _next) => {
  if (err instanceof SquareError) {
    return res.status(err.status || 502).json({ error: err.message, details: err.details });
  }
  console.error(err);
  res.status(500).json({ error: err.message || 'Server error' });
});

// Socket.IO: authenticate connections so only signed-in staff get live updates.
io.use((socket, next) => {
  const cookies = socket.handshake.headers.cookie || '';
  const match = /(?:^|;\s*)token=([^;]+)/.exec(cookies);
  const token =
    (match && decodeURIComponent(match[1])) ||
    (socket.handshake.auth && socket.handshake.auth.token);
  const user = getUserFromToken(token);
  if (!user) return next(new Error('unauthorized'));
  socket.user = user;
  next();
});

io.on('connection', (socket) => {
  io.emit('presence', { online: io.engine.clientsCount });
  socket.on('disconnect', () => io.emit('presence', { online: io.engine.clientsCount }));
});

server.listen(config.port, () => {
  const userCount = db.prepare('SELECT COUNT(*) AS n FROM users').get().n;
  console.log(`\n  提货管理应用 / Pickup app  →  http://localhost:${config.port}`);
  console.log(`  Square: ${config.square.configured ? config.square.environment : '未配置 (not configured)'}`);
  if (userCount === 0) {
    console.log('  ⚠ 还没有账号，请运行: npm run init-admin');
  }
  console.log('');
});
