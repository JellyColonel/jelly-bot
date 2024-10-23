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

client
  .login(config.discord.token)
  .then(() => logger.info('Bot logged in successfully'))
  .catch((err) => logger.error('Failed to log in:', err));

module.exports = client;
