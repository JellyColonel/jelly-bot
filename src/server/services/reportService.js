const bot = require('../../bot/client');
const ButtonHandlers = require('../../bot/handlers/buttonHandlers');
const config = require('../../config');
const logger = require('../../utils/logger');

class ReportService {
  // Add a method to check if bot is ready
  static async ensureBotReady() {
    if (!bot.isReady()) {
      logger.info('Bot not ready, initializing...');
      await bot.start();
    }
  }

  static async processReport(formData) {
    try {
      // Ensure bot is ready before processing
      await this.ensureBotReady();

      logger.detailedInfo('Processing form submission', formData);

      const fields = [];
      for (const [question, answer] of Object.entries(formData)) {
        let formattedAnswer = answer;

        if (
          question.toLowerCase().includes(config.form.discordIdFieldIdentifier)
        ) {
          formattedAnswer = `<@${answer}>`;
          logger.detailedInfo(
            `Formatted Discord ID for question "${question}"`,
            {
              formatted: formattedAnswer,
            }
          );
        }

        fields.push({
          name: question,
          value: formattedAnswer.toString(),
          inline: false,
        });
      }

      // Try to fetch channel with retry logic
      let channel;
      try {
        channel = await bot.channels.fetch(config.discord.reportsChannelId);
      } catch (error) {
        logger.error('Failed to fetch channel, retrying...', {
          channelId: config.discord.reportsChannelId,
          error: error.message,
        });
        // Wait a moment and try again
        await new Promise((resolve) => setTimeout(resolve, 1000));
        channel = await bot.channels.fetch(config.discord.reportsChannelId);
      }

      if (!channel) {
        throw new Error(
          `Could not find channel with ID ${config.discord.reportsChannelId}`
        );
      }

      const embed = {
        title: config.embed.title,
        color: config.embed.color,
        fields: fields,
        footer: {
          text: `${config.embed.footerText}`,
        },
        timestamp: new Date(),
      };

      // Only add image if URL is provided
      if (config.embed.imageUrl) {
        embed.image = { url: config.embed.imageUrl };
        logger.detailedInfo('Added image to embed', {
          imageUrl: config.embed.imageUrl,
        });
      }

      // Only add URL if provided
      if (config.embed.url) {
        embed.url = config.embed.url;
        logger.detailedInfo('Added url to embed', {
          url: config.embed.url,
        });
      }

      const buttons = ButtonHandlers.createReportButtons();

      // Create message options
      const messageOptions = {
        embeds: [embed],
        components: [buttons],
      };

      // Add content if provided
      if (config.embed.content) {
        messageOptions.content = config.embed.content;
        logger.detailedInfo('Added content to message', {
          content: config.embed.content,
        });
      }

      // Send the message with retry logic
      let retries = 3;
      while (retries > 0) {
        try {
          await channel.send(messageOptions);
          break;
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          logger.warn(
            `Failed to send message, retrying... (${retries} attempts left)`
          );
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }

      logger.detailedInfo('Report processed successfully');
      logger.info('Report submitted successfully');

      return true;
    } catch (error) {
      logger.detailedError('Error processing report', {
        error: error.message,
        stack: error.stack,
        formData,
      });
      logger.error(`Failed to process report: ${error.message}`);
      throw error;
    }
  }
}

module.exports = ReportService;
