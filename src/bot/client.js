const { Client, GatewayIntentBits } = require('discord.js');
const config = require('../config');
const logger = require('../utils/logger');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
  ],
});

// Register the interactionCreate event
client.on('interactionCreate', async (interaction) => {
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
          content: 'При обработке вашего запроса произошла ошибка.',
          ephemeral: true,
        })
        .catch((err) => {
          logger.error('Failed to send error reply:', err);
        });
    }
  }
});

client.once('ready', () => {
  logger.info(`Logged in as ${client.user.tag}`);
});

client.on('error', (error) => {
  logger.error('Discord client error:', {
    error: error.message,
    stack: error.stack,
  });
});

client
  .login(config.discord.token)
  .then(() => logger.info('Bot logged in successfully'))
  .catch((err) => logger.error('Failed to log in:', err));

module.exports = client;
