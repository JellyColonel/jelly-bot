const { Client, GatewayIntentBits, Events } = require('discord.js');
const SchedulerService = require('../services/schedulerService');
const config = require('../config');
const logger = require('../utils/logger');
const dbManager = require('../database');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

// Create scheduler instance
let scheduler = null;

// Initialize database before bot starts
const initServices = async () => {
  try {
    logger.info('Initializing services...');
    await dbManager.init();
    logger.info('Database initialized');
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    process.exit(1);
  }
};

client.once(Events.ClientReady, () => {
  logger.info(`Logged in as ${client.user.tag}`);

  // Initialize scheduler
  scheduler = new SchedulerService(client);
  scheduler.start();
});

client.on(Events.Error, (error) => {
  logger.error('Discord client error:', {
    error: error.message,
    stack: error.stack,
  });
});

// Register the interactionCreate event
client.on(Events.InteractionCreate, async (interaction) => {
  try {
    // Import and execute the interaction handler
    const interactionHandler = require('./events/interactionCreate');
    await interactionHandler.execute(interaction);
  } catch (error) {
    logger.error('Error handling interaction:', {
      error: error.message,
      stack: error.stack,
    });

    // Ensure we reply to the interaction
    if (!interaction.replied && !interaction.deferred) {
      await interaction
        .reply({
          content: config.messages.common.error.interaction,
          ephemeral: true,
        })
        .catch((err) => {
          logger.error('Failed to send error reply:', err);
        });
    }
  }
});

// Graceful shutdown handler
process.on('SIGINT', async () => {
  logger.info('Shutting down...');

  // Stop the scheduler if it exists
  if (scheduler) {
    scheduler.stop();
  }

  // Close database connection
  await dbManager.close();

  // Destroy the client
  client.destroy();

  logger.info('Cleanup completed');
  process.exit(0);
});

// Optional: Handle other termination signals
process.on('SIGTERM', async () => {
  logger.info('Received SIGTERM signal');
  process.emit('SIGINT');
});

// Start bot and services
const startBot = async () => {
  try {
    await initServices();
    await client.login(config.discord.token);
    logger.info('Bot logged in successfully');
  } catch (error) {
    logger.error('Failed to start bot:', error);
    process.exit(1);
  }
};

startBot();

module.exports = client;
