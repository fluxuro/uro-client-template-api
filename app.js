//entry for uro-api
require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const bodyParser = require('body-parser');
const { formatResponseMiddleware } = require('./src/utils/responseFormatter');
const { errorHandler } = require('./src/middleware/errorHandler');
const logger = require('./src/utils/logger');
const knex = require('./src/configs/knex/knex');
const app = express();
const cron = require('./crons');
// Apply middleware
app.use(helmet());
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));

// Apply response formatting middleware to ensure consistent responses
app.use(formatResponseMiddleware());

// Middleware to log successful responses (status < 400)
app.use((req, res, next) => {
  // Ensure we have a request start time (if not set already)
  if (!req.request_start_time) {
    req.request_start_time = Date.now();
  }

  res.on('finish', () => {
    // Only log if the response status code indicates success (< 400)
    if (res.statusCode < 400 && req.request_log_id) {
      // Debug log to ensure the finish event fires
      console.log(
        'Finish event fired for successful response ' + req.request_log_id
      );
    }
  });
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });
  next();
});

// API routes
app.use('/api', require('./src/routes'));

// Webhook routes (should generally be placed before general API routes if they have specific needs)
app.use('/webhooks', require('./src/routes/webhooksRoute'));

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  logger.warn('Route not found', { path: req.path, method: req.method });

  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND',
    },
  });
});

// Start server
const port = process.env.PORT || 4002;
app.listen(port, () => {
  logger.info(`Uro Client Template API server started on port ${port}`);
});
