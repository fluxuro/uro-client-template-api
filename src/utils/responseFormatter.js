/**
 * Response Formatter Utility
 *
 * This utility provides standard formatting for API responses to ensure
 * consistency across all endpoints. It helps maintain a uniform structure
 * for both successful responses and error responses.
 */

/**
 * Create a success response with standardized format
 * @param {*} data - The data to include in the response
 * @param {Array} warnings - Optional warnings to include in the response
 * @returns {Object} Formatted success response
 */
const success = (data = null, warnings = []) => {
  const response = {
    success: true,
    data,
  };

  // Only include warnings if there are any
  if (warnings && warnings.length > 0) {
    response.warnings = warnings;
  }

  return response;
};

/**
 * Create an error response with standardized format
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code
 * @param {string} errorCode - Optional error code for client identification
 * @param {Object} details - Optional additional error details
 * @returns {Object} Formatted error response
 */
const error = (message, statusCode = 500, errorCode = null, details = null) => {
  const response = {
    success: false,
    error: {
      message,
    },
  };

  // Include optional fields if provided
  if (errorCode) {
    response.error.code = errorCode;
  }

  if (details) {
    response.error.details = details;
  }

  return response;
};

/**
 * Create a pagination response with standardized format
 * @param {Array} items - The data items to return
 * @param {number} page - Current page number
 * @param {number} limit - Items per page
 * @param {number} totalItems - Total number of items
 * @param {Array} warnings - Optional warnings to include
 * @param {Object} extra - Optional extra data to include
 * @returns {Object} Formatted paginated response
 */
const paginated = (items, page, limit, totalItems, warnings = [], extra) => {
  const totalPages = Math.ceil(totalItems / limit);

  const response = {
    success: true,
    data: {
      items,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    },
  };

  // Only include warnings if there are any
  if (warnings && warnings.length > 0) {
    response.warnings = warnings;
  }

  if (extra && Object.keys(extra).length > 0) {
    response.data = {
      ...response.data,
      ...extra,
    };
  }
  return response;
};

/**
 * Express middleware that wraps responses in the standard format
 * Use this to automatically format all responses from a router
 */
const formatResponseMiddleware = () => {
  return (req, res, next) => {
    // Save original res.json method
    const originalJson = res.json;

    // Override res.json
    res.json = function (body) {
      // Don't wrap if body is already formatted
      if (body && (body.success === true || body.success === false)) {
        return originalJson.call(this, body);
      }

      // Wrap successful responses in standard format
      if (res.statusCode < 400) {
        return originalJson.call(this, success(body));
      }

      // Errors should be handled by errorHandler middleware
      return originalJson.call(this, body);
    };

    next();
  };
};

module.exports = {
  success,
  error,
  paginated,
  formatResponseMiddleware,
};
