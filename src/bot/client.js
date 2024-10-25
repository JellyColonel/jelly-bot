const { Client, GatewayIntentBits, Events } = require('discord.js');
const SchedulerService = require('../services/schedulerService');
const config = require('../config');
const logger = require('../utils/logger');
const dbManager = require('../database');

class DiscordBot extends Client {
  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMessageReactions,
      ],
    });

    this.scheduler = null;
    this.logger = logger;
    this.dbManager = dbManager;

    // Bind methods to preserve 'this' context
    this.handleInteraction = this.handleInteraction.bind(this);
    this.handleError = this.handleError.bind(this);
    this.handleShutdown = this.handleShutdown.bind(this);
  }

  /**
   * Initialize bot services and event handlers
   */
  async initialize() {
    try {
      this.logger.info('Initializing services...');
      await this.initializeDatabase();
      await this.registerEventHandlers();
      await this.registerProcessHandlers();
      this.logger.info('Services initialized successfully');
    } catch (error) {
      this.logger.error('Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Initialize database connection
   */
  async initializeDatabase() {
    try {
      await this.dbManager.init();
      this.logger.info('Database initialized');
    } catch (error) {
      this.logger.error('Database initialization failed:', error);
      throw error;
    }
  }

  /**
   * Register all Discord.js event handlers
   */
  registerEventHandlers() {
    this.once(Events.ClientReady, this.handleReady.bind(this));
    this.on(Events.InteractionCreate, this.handleInteraction);
    this.on(Events.Error, this.handleError);
  }

  /**
   * Register process event handlers for graceful shutdown
   */
  registerProcessHandlers() {
    process.on('SIGINT', this.handleShutdown);
    process.on('SIGTERM', () => {
      this.logger.info('Received SIGTERM signal');
      this.handleShutdown();
    });
  }

  /**
   * Handle client ready event
   */
  handleReady() {
    this.logger.info(`Logged in as ${this.user.tag}`);
    this.initializeScheduler();
  }

  /**
   * Initialize and start the scheduler
   */
  initializeScheduler() {
    try {
      this.scheduler = new SchedulerService(this);
      this.scheduler.start();
      this.logger.info('Scheduler initialized and started');
    } catch (error) {
      this.logger.error('Failed to initialize scheduler:', error);
    }
  }

  /**
   * Handle interaction events
   */
  async handleInteraction(interaction) {
    try {
      const interactionHandler = require('./events/interactionCreate');
      await interactionHandler.execute(interaction);
    } catch (error) {
      await this.handleInteractionError(interaction, error);
    }
  }

  /**
   * Handle interaction errors
   */
  async handleInteractionError(interaction, error) {
    this.logger.error('Error handling interaction:', {
      error: error.message,
      stack: error.stack,
      interactionType: interaction.type,
      commandName: interaction.commandName,
    });

    if (!interaction.replied && !interaction.deferred) {
      try {
        await interaction.reply({
          content: config.messages.common.error.interaction,
          ephemeral: true,
        });
      } catch (replyError) {
        this.logger.error('Failed to send error reply:', replyError);
      }
    }
  }

  /**
   * Handle client errors
   */
  handleError(error) {
    this.logger.error('Discord client error:', {
      error: error.message,
      stack: error.stack,
    });
  }

  /**
   * Handle graceful shutdown
   */
  async handleShutdown() {
    this.logger.info('Initiating graceful shutdown...');

    try {
      if (this.scheduler) {
        await this.scheduler.stop();
        this.logger.info('Scheduler stopped');
      }

      await this.dbManager.close();
      this.logger.info('Database connection closed');

      await this.destroy();
      this.logger.info('Discord client destroyed');

      process.exit(0);
    } catch (error) {
      this.logger.error('Error during shutdown:', error);
      process.exit(1);
    }
  }

  /**
   * Start the bot
   */
  async start() {
    try {
      await this.initialize();
      await this.login(config.discord.token);
      this.logger.info('Bot started successfully');
    } catch (error) {
      this.logger.error('Failed to start bot:', error);
      process.exit(1);
    }
  }
}

const bot = new DiscordBot();

// Export the initialized bot
module.exports = bot;
