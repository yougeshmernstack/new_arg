const { errorLogger } = require('./utils/logger'); // Import your errorLogger function

// Override console.error to use errorLogger
const originalConsoleError = console.error;
console.error = (error, ...args) => {
  if (error instanceof Error) {
    errorLogger(error);
  } else {
    originalConsoleError(error, ...args);
  }
};

// Global error handling for uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  errorLogger(error);
  // Optionally exit the process if necessary
  // process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  errorLogger(reason);
  // Optionally exit the process if necessary
  // process.exit(1);
});
