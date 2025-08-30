// src/middleware/errorHandler.js
const knex = require('../configs/knex/knex');
const logger = require('../utils/logger');
const { error: formatError } = require('../utils/responseFormatter');

/**
 * Centralized error handler middleware
 * - Logs detailed error information internally
 * - Returns user-friendly error messages to clients
 * - Avoids exposing sensitive information like stack traces or database errors
 * - Uses standardized response format
 */
const errorHandler = (err, req, res, next) => {
  // Log detailed error information for internal debugging
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query,
    ip: req.ip,
    userId: req.user ? req.user.id : null,
  });

  // Set default status code and message
  let statusCode = err.statusCode || 500;
  let errorMessage = err.message || 'An unexpected error occurred';
  let errorCode = err.code || null;

  // Handle different types of errors
  if (err.name === 'ValidationError') {
    // Handle validation errors (e.g., from express-validator)
    statusCode = 400;
    errorMessage = err.message || 'Validation failed. Please check your input.';
    errorCode = 'VALIDATION_ERROR';
  } else if (
    err.name === 'UnauthorizedError' ||
    err.message.includes('unauthorized')
  ) {
    // Handle authentication errors
    statusCode = 401;
    errorMessage = 'Authentication required. Please log in.';
    errorCode = 'UNAUTHORIZED';
  } else if (
    err.name === 'ForbiddenError' ||
    err.message.includes('forbidden')
  ) {
    // Handle authorization errors
    statusCode = 403;
    errorMessage = 'You do not have permission to perform this action.';
    errorCode = 'FORBIDDEN';
  } else if (
    err.name === 'NotFoundError' ||
    err.message.includes('not found')
  ) {
    // Handle not found errors
    statusCode = 404;
    errorMessage = err.message || 'The requested resource was not found.';
    errorCode = 'NOT_FOUND';
  } else if (err.code === 'ER_DUP_ENTRY') {
    // Handle duplicate entry database errors without exposing DB details
    statusCode = 409;
    errorMessage = 'A resource with this identifier already exists.';
    errorCode = 'DUPLICATE_ENTRY';
  } else if (err.name === 'PaymentRequiredError') {
    // Handle payment required errors
    statusCode = 402;
    errorMessage = 'Payment is required to proceed with this request.';
    errorCode = 'PAYMENT_REQUIRED';
  } else if (statusCode === 500) {
    // For 500 errors, provide a generic message to avoid exposing internal details
    // but keep the original error message in logs for debugging
    errorMessage = 'An unexpected error occurred. Please try again later.';
    errorCode = 'INTERNAL_SERVER_ERROR';
  }

  // Use the response formatter to create a standardized error response
  const errorResponse = formatError(errorMessage, statusCode, errorCode, err.details);

  // Send error response to client
  res.status(statusCode).json(errorResponse);

  // Update request log in Redis instead of directly in the database
  if (req.request_log_id) {
    const { updateRequestLog } = require('./authMiddleware');
    updateRequestLog(req.request_log_id, {
      status_code: statusCode || 500,
      response_time_ms: Date.now() - req.request_start_time,
      error_message: errorMessage,
      error_object: JSON.stringify({
        message: err.message,
        //and for stack get only 5 lines max
        stack: err.stack.split('\n').slice(0, 5).join('\n'),
      }),
    })
      .then(() => {
        logger.info('Request error logged successfully');
      })
      .catch((error) => {
        logger.error('⚠️CRITICAL: Failed to log request error', {
          error: error.message,
          path: req.path,
          method: req.method,
          body: req.body,
          params: req.params,
          query: req.query,
          ip: req.ip,
          userId: req.user ? req.user.id : null,
        });
      });
  }
};

/**
 * Custom error classes for different types of errors
 */
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
    this.code = 'VALIDATION_ERROR';
  }
}

class UnauthorizedError extends Error {
  constructor(message = 'Authentication required') {
    super(message);
    this.name = 'UnauthorizedError';
    this.statusCode = 401;
    this.code = 'UNAUTHORIZED';
  }
}

class ForbiddenError extends Error {
  constructor(message = 'Access forbidden') {
    super(message);
    this.name = 'ForbiddenError';
    this.statusCode = 403;
    this.code = 'FORBIDDEN';
  }
}

class NotFoundError extends Error {
  constructor(message = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
    this.statusCode = 404;
    this.code = 'NOT_FOUND';
  }
}

class PaymentRequiredError extends Error {
  constructor(message = 'Payment required') {
    super(message);
    this.name = 'PaymentRequiredError';
    this.statusCode = 402;
    this.code = 'PAYMENT_REQUIRED';
  }
}

// Export error handler middleware and custom error classes
module.exports = {
  errorHandler,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  PaymentRequiredError,
};
