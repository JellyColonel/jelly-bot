const { Events } = require('discord.js');
const ButtonHandlers = require('../handlers/buttonHandlers');
const ModalHandlers = require('../handlers/modalHandlers');
const logger = require('../../utils/logger');
const config = require('../../config');

// Map of button handlers for easier maintenance and scalability
const BUTTON_HANDLERS = {
  accept_report: ButtonHandlers.handleAcceptReport,
  reject_report: ButtonHandlers.handleRejectReport,
};

// Map of modal handlers
const MODAL_HANDLERS = {
  rejection_reason_modal: ModalHandlers.handleRejectionSubmission,
};

// Helper function to handle error responses
async function sendErrorResponse(interaction, error) {
  try {
    const response = {
      content: config.messages.common.error.interaction,
      ephemeral: true,
    };

    if (!interaction.replied && !interaction.deferred) {
      await interaction.reply(response);
    } else {
      await interaction.followUp(response);
    }
  } catch (replyError) {
    logger.error('Failed to send error reply:', replyError);
  }
}

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    try {
      logger.detailedInfo('Received interaction', {
        type: interaction.type,
        customId: interaction.customId,
        user: interaction.user.tag,
      });

      // Handle button interactions
      if (interaction.isButton()) {
        const hasPermission = await ButtonHandlers.checkPermission(interaction);
        if (!hasPermission) return;

        const handler = BUTTON_HANDLERS[interaction.customId];
        if (handler) {
          await handler(interaction);
        } else {
          logger.warn(`No handler found for button: ${interaction.customId}`);
        }
      }

      // Handle modal submissions
      if (interaction.isModalSubmit()) {
        const handler = MODAL_HANDLERS[interaction.customId];
        if (handler) {
          await handler(interaction);
        } else {
          logger.warn(`No handler found for modal: ${interaction.customId}`);
        }
      }
    } catch (error) {
      logger.error('Error handling interaction:', error);
      await sendErrorResponse(interaction, error);
    }
  },
};
