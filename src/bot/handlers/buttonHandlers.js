const { ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const ModalHandlers = require('./modalHandlers');
const PromotionService = require('../../services/promotionService');
const PromotionMessageService = require('../../services/promotionMessageService');
const config = require('../../config');
const logger = require('../../utils/logger');
const templateParser = require('../../utils/templateHandler');

class ButtonHandlers {
  static createReportButtons() {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('accept_report')
        .setLabel(config.buttons.accept.label)
        .setEmoji(config.buttons.accept.emoji)
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('reject_report')
        .setLabel(config.buttons.reject.label)
        .setEmoji(config.buttons.reject.emoji)
        .setStyle(ButtonStyle.Danger)
    );
  }

  static async handleAcceptReport(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });
      const message = interaction.message;

      logger.info('Starting accept report process', {
        messageId: message.id,
        userId: interaction.user.id,
      });

      // Validate message has embeds
      if (!message.embeds?.length) {
        throw new Error('No embeds found in the message');
      }

      // Add acceptance reaction
      await message.react(config.reactions.accept);

      // Extract author information and rank numbers using class methods
      const authorId = ButtonHandlers.extractAuthorId(message);
      logger.info('Found author ID', { authorId });

      const { currentRank, newRank } = ButtonHandlers.extractRankNumbers(message.embeds[0].fields);
      logger.info('Extracted ranks', { currentRank, newRank });

      // Check promotion eligibility
      const canPromote = await PromotionService.canPromote(authorId);
      logger.info('Promotion check result', { canPromote });

      if (!canPromote) {
        await ButtonHandlers.handleDelayedPromotion(
          interaction,
          message,
          authorId,
          currentRank,
          newRank
        );
        return;
      }

      await ButtonHandlers.handleImmediatePromotion(
        interaction,
        message,
        authorId,
        currentRank,
        newRank
      );

    } catch (error) {
      logger.error('Error handling accept report:', {
        error: error.message || 'Unknown error occurred',
        stack: error.stack,
        interactionId: interaction.id,
        userId: interaction.user?.id,
        messageId: interaction.message?.id,
      });

      const errorMessage = error.message || config.messages.report.accept.failure;
      
      try {
        if (interaction.deferred) {
          await interaction.editReply({
            content: errorMessage,
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: errorMessage,
            ephemeral: true,
          });
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

  static async handleDelayedPromotion(
    interaction,
    message,
    authorId,
    currentRank,
    newRank
  ) {
    logger.info('Scheduling delayed promotion', {
      userId: authorId,
      guildId: interaction.guildId,
      fromRank: currentRank,
      toRank: newRank,
      reportUrl: message.url,
    });

    const { scheduledTime } = await PromotionService.schedulePromotion(
      authorId,
      interaction.guildId,
      currentRank,
      newRank,
      message.url
    );

    // Create delay notification thread
    const thread = await message.startThread({
      name: `${config.messages.report.delay.threadTitle} - ${interaction.member.displayName}`,
      autoArchiveDuration: 1440,
    });

    const authorField = message.embeds[0].fields.find(field =>
      field.name.toLowerCase().includes(config.form.discordIdFieldIdentifier)
    );

    await thread.send(
      templateParser.parse(config.messages.report.delay.threadMessage, {
        authorTag: authorField.value,
        timestamp: `<t:${Math.floor(scheduledTime.getTime() / 1000)}:F>`,
      })
    );

    // Cleanup and confirm
    await message.edit({ components: [] });
    await interaction.editReply({
      content: config.messages.report.delay.confirmation,
      ephemeral: true,
    });
  }

  static async handleImmediatePromotion(
    interaction,
    message,
    authorId,
    currentRank,
    newRank
  ) {
    // Send promotion request with immediate flag and approver info
    const promotionMessage = await PromotionMessageService.sendPromotionRequest(
      interaction.guild,
      authorId,
      currentRank,
      newRank,
      message.url,
      {
        immediate: true,
        approverTag: interaction.user.tag
      }
    );

    // Create acceptance thread
    const thread = await message.startThread({
      name: `${config.messages.report.accept.threadTitle} - ${interaction.member.displayName}`,
      autoArchiveDuration: 1440,
    });

    await thread.send(
      templateParser.parse(config.messages.report.accept.threadMessage, {
        authorId: `<@${authorId}>`,
        accepter: interaction.user,
        messageUrl: promotionMessage.url,
      })
    );

    // Record the promotion
    try {
      logger.info('Recording promotion', {
        authorId,
        currentRank,
        newRank,
        messageId: promotionMessage.id,
        guildId: interaction.guildId,
        reportUrl: message.url,
      });

      await PromotionService.recordPromotion(
        authorId,
        currentRank,
        newRank,
        promotionMessage.id,
        interaction.guildId,
        message.url
      );
    } catch (error) {
      logger.error('Failed to record promotion, but message was sent', {
        error: error.message,
        promotionMessageId: promotionMessage.id,
      });
      // Continue execution even if recording fails
    }

    // Cleanup and confirm
    await message.edit({ components: [] });
    await interaction.editReply({
      content: config.messages.report.accept.confirmation,
      ephemeral: true,
    });
  }

  static extractAuthorId(message) {
    if (!message.embeds?.[0]?.fields) {
      throw new Error('Invalid report format: No fields found in embed');
    }

    const authorField = message.embeds[0].fields.find((field) =>
      field.name.toLowerCase().includes(config.form.discordIdFieldIdentifier)
    );

    if (!authorField) {
      logger.error('Discord ID field not found', {
        availableFields: message.embeds[0].fields.map((f) => f.name),
      });
      throw new Error('Could not find Discord ID field in the report');
    }

    const authorId = authorField.value.split(' ')[0].replace(/[<@>]/g, '');
    
    if (!authorId) {
      throw new Error('Invalid Discord ID format in report');
    }

    return authorId;
  }

  static extractRankNumbers(fields) {
    if (!Array.isArray(fields)) {
      throw new Error('Invalid report format: Fields must be an array');
    }

    try {
      const rankField = fields.find((field) =>
        field.name.toLowerCase().includes(config.form.rankFieldIdentifier)
      );

      if (!rankField) {
        logger.error('Rank field not found in embed', {
          searchIdentifier: config.form.rankFieldIdentifier,
          availableFields: fields.map((f) => f.name),
        });
        throw new Error('Could not find rank information in the report');
      }

      const numbers = rankField.value.match(/\[(\d+)\]/g);

      if (!numbers || numbers.length !== 2) {
        logger.error('Invalid rank format', {
          value: rankField.value,
          numbersFound: numbers?.length || 0
        });
        throw new Error('Invalid rank format in report');
      }

      const currentRank = numbers[0].replace(/[^\d]/g, '');
      const newRank = numbers[1].replace(/[^\d]/g, '');

      if (!currentRank || !newRank) {
        throw new Error('Invalid rank numbers in report');
      }

      return { currentRank, newRank };
    } catch (error) {
      logger.error('Error extracting rank numbers:', {
        error: error.message,
        stack: error.stack,
        fieldsProvided: fields?.length || 0,
        fieldNames: fields?.map((f) => f.name) || [],
      });
      throw error;
    }
  }

  static async handleRejectReport(interaction) {
    try {
      const modal = ModalHandlers.createRejectionModal();
      await interaction.showModal(modal);
    } catch (error) {
      logger.error('Error showing rejection modal:', error);
      throw error;
    }
  }

  static async checkPermission(interaction) {
    const hasPermission = config.discord.requiredRoleIds.some((roleId) =>
      interaction.member.roles.cache.has(roleId)
    );

    if (!hasPermission) {
      await interaction.reply({
        content: config.messages.common.error.notEnoughPermissions,
        ephemeral: true,
      });
      logger.warn(
        `User ${interaction.user.tag} attempted to use command without required roles`
      );
    }

    return hasPermission;
  }
}

module.exports = ButtonHandlers;