/**
 * Application Configuration
 * Centralizes all configuration settings for the application
 */

require("dotenv").config();

module.exports = {
  // Server configuration
  server: {
    port: process.env.PORT || 4001,
    env: process.env.NODE_ENV || "development",
  },

  // Database configuration
  database: {
    client: "mysql2",
    connection: {
      host: process.env.DB_HOST || "localhost",
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME || "uro_white_label",
    },
    migrations: {
      directory: __dirname + "/knex/migrations",
    },
    pool: {
      min: 10,
      max: 25,
      acquireTimeoutMillis: 30000, // Added explicit timeout
      createTimeoutMillis: 30000, // Added explicit timeout
      idleTimeoutMillis: 30000, // Added explicit timeout
      // propagateCreateError: false, // Prevents app crash on connection failures
    },
  },

  // Logging configuration
  logging: {
    level: process.env.LOG_LEVEL || "info",
    directory: process.env.LOG_DIR || "logs",
  },
};
