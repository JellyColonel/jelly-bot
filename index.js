const bot = require('./src/bot/client');
const app = require('./src/server');
const config = require('./src/config');
const logger = require('./src/utils/logger');

(async () => {
  try {
    // Initialize and start the bot
    await bot.start();

    // Start the Express server
    app.listen(config.server.port, () => {
      logger.info(`Server running on port ${config.server.port}`);
    });
  } catch (error) {
    logger.error('Failed to start application:', error);
    process.exit(1);
  }
})();

// Global error handlers
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
});

// Graceful shutdown
const shutdown = async () => {
  logger.info('Shutting down application...');

  try {
    // Cleanup code here (close database connections, etc.)
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle termination signals
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
