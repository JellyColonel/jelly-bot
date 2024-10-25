const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../config');
const templateParser = require('../../utils/templateHandler');

class ModalHandlers {
  static createRejectionModal() {
    try {
      const modal = new ModalBuilder()
        .setCustomId('rejection_reason_modal')
        .setTitle(config.rejectModal.title);

      const reasonInput = new TextInputBuilder()
        .setCustomId('rejection_reason')
        .setLabel(config.rejectModal.label) // Shortened label
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMinLength(10)
        .setMaxLength(1000)
        .setPlaceholder(config.rejectModal.placeholder); // Added placeholder for additional context

      const actionRow = new ActionRowBuilder().addComponents(reasonInput);

      modal.addComponents(actionRow);

      return modal;
    } catch (error) {
      logger.error('Failed to create modal:', {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
      });
      throw error;
    }
  }

  static async handleRejectionSubmission(interaction) {
    try {
      logger.detailedInfo('Processing rejection submission', {
        user: interaction.user.tag,
        messageId: interaction.message?.id,
      });

      await interaction.deferUpdate();

      const message = interaction.message;
      const reason = interaction.fields.getTextInputValue('rejection_reason');

      // Add rejection reaction
      await message.react(config.reactions.reject);

      // Create thread with display name
      const thread = await message.startThread({
        name: `${config.messages.report.reject.threadTitle} - ${interaction.member.displayName}`,
        autoArchiveDuration: 1440,
      });

      // Find author mention
      const authorField = message.embeds[0].fields.find((field) =>
        field.name.toLowerCase().includes(config.form.discordIdFieldIdentifier)
      );

      if (!authorField) {
        throw new Error('Could not find Discord ID field in the report');
      }

      const authorMention = authorField.value.split(' ')[0];

      // Send rejection message
      await thread.send(
        templateParser(config.messages.report.reject.threadMessage, {
          authorTag: authorMention,
          rejecter: interaction.user,
          reason: reason,
        })
      );

      // Remove buttons
      await message.edit({ components: [] });

      logger.info(`Report rejected by ${interaction.user.tag}`);
    } catch (error) {
      logger.error('Error processing rejection:', {
        error: error.message,
        stack: error.stack,
        interactionId: interaction.id,
        userId: interaction.user.id,
        messageId: interaction.message?.id,
      });

      try {
        await interaction.followUp({
          content: config.messages.report.reject.failure,
          ephemeral: true,
        });
      } catch (replyError) {
        logger.error('Failed to send error reply:', {
          error: replyError.message,
          stack: replyError.stack,
        });
      }
    }
  }
}

module.exports = ModalHandlers;
