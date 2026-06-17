'use strict';

require('dotenv').config();

const path = require('path');

const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev-insecure-secret-change-me',
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'app.sqlite'),

  square: {
    accessToken: process.env.SQUARE_ACCESS_TOKEN || '',
    environment: (process.env.SQUARE_ENVIRONMENT || 'production').toLowerCase(),
    locationId: process.env.SQUARE_LOCATION_ID || '',
    // Square API version pinned for stable responses.
    apiVersion: '2024-12-18',
  },
};

config.square.baseUrl =
  config.square.environment === 'sandbox'
    ? 'https://connect.squareupsandbox.com'
    : 'https://connect.squareup.com';

config.square.configured = Boolean(config.square.accessToken);

module.exports = config;
