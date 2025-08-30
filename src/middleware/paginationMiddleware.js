// src/middleware/paginationMiddleware.js

/**
 * Middleware to handle pagination and general query parameters.
 * Extracts `page` and `limit` from the request query, providing defaults.
 * Attaches pagination info to `req.pagination` and other query params to `req.queryParams`.
 *
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {function} next - Express next middleware function.
 */
const handlePaginationAndParams = (req, res, next) => {
  // Default pagination values
  const defaultPage = 1;
  const defaultLimit = 20;

  // Parse page
  let page = parseInt(req.query.page, 10);
  if (isNaN(page) || page < 1) {
    page = defaultPage;
  }

  // Parse limit
  let limit = parseInt(req.query.limit, 10);
  if (isNaN(limit) || limit < 1 || limit > 100) {
    limit = defaultLimit;
  }

  // Attach pagination info to request object
  req.pagination = {
    page,
    limit,
    offset: (page - 1) * limit, // Calculate offset for database queries
  };

  // Attach remaining query parameters (excluding page and limit)
  const { page: queryPage, limit: queryLimit, ...otherParams } = req.query;
  req.queryParams = otherParams;

  next();
};

module.exports = {
  handlePaginationAndParams,
};
