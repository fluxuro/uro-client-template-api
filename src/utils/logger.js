// src/utils/logger.js

const { createLogger, format, transports } = require('winston');
const { combine, timestamp, colorize, errors, printf } = format;

const logFormat = printf(({ timestamp, level, message, stack, ...meta }) => {
  // Start with a basic line containing timestamp, log level, and message.
  let output = `${timestamp} ${level}: ${message}`;

  // If we have a stack property, this is an Error object. Show a "Stack Trace" section.
  if (stack) {
    output += `\nStack Trace:\n${stack}`;
  }

  // If we have task breakdown data, display it in a multiline format.
  if (meta.tasks && Array.isArray(meta.tasks)) {
    output += `\nTotal Duration: ${meta.totalDurationMs}ms`;
    output += '\nTask Breakdown:';
    meta.tasks.forEach((task) => {
      output += `\n  - ${task.name}: ${task.durationMs}ms (${task.percentOfTotal}% of total)`;
    });

    // Remove tasks from the meta so they don't get duplicated in the JSON block.
    const { tasks, totalDurationMs, ...otherMeta } = meta;
    meta = otherMeta;
  }

  // If there's additional metadata, pretty-print it.
  const metaKeys = Object.keys(meta);
  if (metaKeys.length > 0) {
    output += `\n${JSON.stringify(meta, null, 2)}`;
  }

  // Add a blank line at the end for spacing.
  output += '\n';
  return output;
});

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    // Capture stack traces automatically for Error objects.
    errors({ stack: true }),
    // Apply color to all parts of the log message.
    colorize({ all: true }),
    // Add timestamps in "YYYY-MM-DD HH:mm:ss" format.
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    // Use our custom printf formatter above.
    logFormat
  ),
  // Output logs to the console. Add other transports if needed (e.g., file).
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/combined.log' }),
    new transports.File({ filename: 'logs/error.log', level: 'error' }),
    new transports.File({ filename: 'logs/info.log', level: 'info' }),
    new transports.File({ filename: 'logs/warn.log', level: 'warn' }),
    new transports.File({ filename: 'logs/debug.log', level: 'debug' }),
  ],
});

module.exports = logger;
