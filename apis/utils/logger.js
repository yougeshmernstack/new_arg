const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, errors } = format;
const fs = require('fs');
const path = require('path');

// Define the log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} ${level}: ${stack || message}`;
});

// Ensure logs directory exists
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Main logger instance
const logger = createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: path.join(logsDir, 'error.log'), level: 'error' }), // Logs errors
    new transports.File({ filename: path.join(logsDir, 'combined.log') }), // Combined log for info and errors
  ],
});

// Rollback-specific logger instance
const rollbackLogger = createLogger({
  level: 'info',
  format: combine(
    timestamp(),
    logFormat
  ),
  transports: [
    new transports.Console(),
    new transports.File({ filename: path.join(logsDir, 'rollback.log') }), // Logs rollbacks to a specific file
  ],
});

// Error logging helper function
const errorLogger = (error) => {
  const stackLines = error.stack.split(`\n`);
  const functionName = stackLines[1] ? stackLines[1].trim().split(' ')[1] : 'unknown function';
  const errorMessage = error.message;

  const logMessage = `An error occurred in ${functionName}: ${errorMessage}`;
  // Log to the error log using the main logger
  logger.error(logMessage, { stack: error.stack });
};

// Rollback logging helper function
const logRollback = (message) => {
  rollbackLogger.info(message);
};

// Log condition failure to a specific log file
const logFilePath = path.join(logsDir, 'level_income_errors.log');
function logConditionFailure(logMessage) {
  const line = typeof logMessage === 'string' ? logMessage : JSON.stringify(logMessage);
  try {
    fs.appendFileSync(logFilePath, line + '\n', { encoding: 'utf8', flag: 'a' });
  } catch (e) {
    // Fallback if file write fails
    console.error('Failed to write level income error log:', e);
    console.error(line);
  }
}

module.exports = { logger, errorLogger, logConditionFailure, logRollback };
