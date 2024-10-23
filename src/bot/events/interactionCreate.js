const ButtonHandlers = require('../handlers/buttonHandlers');
const ModalHandlers = require('../handlers/modalHandlers');
const logger = require('../../utils/logger');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    try {
      if (interaction.isButton()) {
        const hasPermission = await ButtonHandlers.checkPermission(interaction);
        if (!hasPermission) return;

        const message = interaction.message;

        if (interaction.customId === 'accept_report') {
          await ButtonHandlers.handleAcceptReport(interaction, message);
        } else if (interaction.customId === 'reject_report') {
          const modal = ModalHandlers.createRejectionModal();
          await interaction.showModal(modal);
        }
      } else if (interaction.isModalSubmit()) {
        if (interaction.customId === 'rejection_reason_modal') {
          await ModalHandlers.handleRejectionSubmission(
            interaction,
            interaction.message,
            interaction
          );
        }
      }
    } catch (error) {
      logger.error('Error handling interaction:', error);
      await interaction.reply({
        content: 'An error occurred while processing your request.',
        ephemeral: true,
      });
    }
  },
};
