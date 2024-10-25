const { Events } = require('discord.js');
const ButtonHandlers = require('../handlers/buttonHandlers');
const ModalHandlers = require('../handlers/modalHandlers');
const logger = require('../../utils/logger');
const config = require('../../config');

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
        await ModalHandlers.handleRejectionSubmission(interaction);
      }
    } catch (error) {
      logger.error('Error handling interaction:', error);

      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: config.messages.common.error.interaction,
            ephemeral: true,
          });
        } else {
          await interaction.followUp({
            content: config.messages.common.error.interaction,
            ephemeral: true,
          });
        }
      } catch (replyError) {
        logger.error('Failed to send error reply:', replyError);
      }
    }
  },
};
