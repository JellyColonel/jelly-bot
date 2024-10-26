const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require('discord.js');
const logger = require('../../utils/logger');
const config = require('../../config');

class ModalHandlers {
  static createRejectionModal() {
    try {
      logger.info('Creating rejection modal');

      const modal = new ModalBuilder()
        .setCustomId('rejection_reason_modal')
        .setTitle(config.rejectModal.title);

      const reasonInput = new TextInputBuilder()
        .setCustomId('rejection_reason')
        .setLabel(config.rejectModal.label)
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMinLength(10)
        .setMaxLength(1000)
        .setPlaceholder(config.rejectModal.placeholder);

      const actionRow = new ActionRowBuilder().addComponents(reasonInput);
      modal.addComponents(actionRow);

      return modal;
    } catch (error) {
      logger.error('Failed to create rejection modal:', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  static async handleRejectionSubmission(interaction) {
    try {
      logger.info('Processing rejection submission', {
        user: interaction.user.tag,
        messageId: interaction.message?.id,
      });

      // Validate message has embeds
      if (!interaction.message?.embeds?.length) {
        throw new Error('Invalid report format: No embeds found');
      }

      // Get rejection reason before deferring
      const reason = interaction.fields.getTextInputValue('rejection_reason');
      
      // Defer the reply
      await interaction.deferUpdate();

      const message = interaction.message;
      
      // Add rejection reaction
      await message.react(config.reactions.reject);

      // Find author mention
      const authorField = message.embeds[0].fields.find((field) =>
        field.name.toLowerCase().includes(config.form.discordIdFieldIdentifier)
      );

      if (!authorField) {
        throw new Error('Could not find Discord ID field in the report');
      }

      const authorMention = authorField.value.split(' ')[0];

      // Create thread
      const thread = await message.startThread({
        name: `${config.messages.report.reject.threadTitle} - ${interaction.member.displayName}`,
        autoArchiveDuration: 1440,
      });

      // Send rejection message
      await thread.send(
        `${authorMention}, Ваш отчёт был отклонён ${interaction.user} по следующим причинам:\n\`\`\`\n${reason}\`\`\``
      );

      // Remove buttons
      await message.edit({ components: [] });

      logger.info('Report rejection processed successfully', {
        user: interaction.user.tag,
        messageId: message.id
      });

    } catch (error) {
      logger.error('Error processing rejection:', {
        error: error.message || 'Unknown error occurred',
        stack: error.stack,
        interactionId: interaction.id,
        userId: interaction.user?.id,
        messageId: interaction.message?.id,
      });

      const errorMessage = {
        content: error.message || config.messages.report.reject.failure,
        ephemeral: true
      };

      try {
        if (interaction.deferred) {
          await interaction.editReply(errorMessage);
        } else if (interaction.replied) {
          await interaction.followUp(errorMessage);
        } else {
          await interaction.reply(errorMessage);
        }
      } catch (replyError) {
        logger.error('Failed to send error reply:', {
          error: replyError.message,
          stack: replyError.stack,
          originalError: error.message
        });
      }
    }
  }
}

module.exports = ModalHandlers;