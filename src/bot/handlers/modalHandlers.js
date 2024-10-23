const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const logger = require('../../utils/logger');

class ModalHandlers {
  static createRejectionModal() {
    const modal = new ModalBuilder()
      .setCustomId('rejection_reason_modal')
      .setTitle('Rejection Reason');

    const reasonInput = new TextInputBuilder()
      .setCustomId('rejection_reason')
      .setLabel('Please provide detailed reason(s) for rejection')
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const actionRow = new ActionRowBuilder().addComponents(reasonInput);
    modal.addComponents(actionRow);

    return modal;
  }

  static async handleRejectionSubmission(interaction, message, submission) {
    try {
      const reason = submission.fields.getTextInputValue('rejection_reason');
      await message.react('❌');

      // Extract author mention from the embed fields
      const authorField = message.embeds[0].fields.find(
        (field) => field.name === 'Author'
      );
      const authorMention = authorField.value.split(' ')[0]; // Get the mention part

      const thread = await message.startThread({
        name: `Report Rejected - ${interaction.user.username}`,
        autoArchiveDuration: 1440,
      });

      await thread.send(
        `${authorMention}, your report has been rejected by ${interaction.user} due to:\n${reason}`
      );

      await message.edit({ components: [] });
      await submission.reply({
        content: 'Rejection processed successfully',
        ephemeral: true,
      });

      logger.info(`Report rejected by ${interaction.user.tag}`);
    } catch (error) {
      logger.error('Error handling rejection submission:', error);
      throw error;
    }
  }
}

module.exports = ModalHandlers;
