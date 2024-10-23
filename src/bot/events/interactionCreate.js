const ButtonHandlers = require('../handlers/buttonHandlers');
const logger = require('../../utils/logger');

module.exports = {
  name: 'interactionCreate',
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

        switch (interaction.customId) {
        case 'accept_report':
          await ButtonHandlers.handleAcceptReport(interaction);
          break;
        case 'reject_report':
          await ButtonHandlers.handleRejectReport(interaction);
          break;
        }
      }

      // Handle modal submissions
      if (
        interaction.isModalSubmit() &&
        interaction.customId === 'rejection_reason_modal'
      ) {
        await ButtonHandlers.handleRejectionSubmission(interaction);
      }
    } catch (error) {
      logger.error('Error in interaction handler:', {
        error: error.message,
        stack: error.stack,
        interactionType: interaction.type,
        customId: interaction.customId,
        userId: interaction.user?.id,
      });

      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content:
              'An error occurred while processing your request. Please try again.',
            ephemeral: true,
          });
        } else {
          await interaction.followUp({
            content:
              'An error occurred while processing your request. Please try again.',
            ephemeral: true,
          });
        }
      } catch (replyError) {
        logger.error('Failed to send error reply:', replyError);
      }
    }
  },
};
