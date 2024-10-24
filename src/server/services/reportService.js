const client = require('../../bot/client');
const ButtonHandlers = require('../../bot/handlers/buttonHandlers');
const config = require('../../config');
const logger = require('../../utils/logger');

class ReportService {
  static async processReport(formData) {
    try {
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

      const channel = await client.channels.fetch(
        config.discord.reportsChannelId
      );

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

      await channel.send({ embeds: [embed], components: [buttons] });
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
