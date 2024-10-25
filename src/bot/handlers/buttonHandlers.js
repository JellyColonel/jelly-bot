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

      await message.react(config.reactions.accept);

      // Find author's Discord ID
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
      logger.info('Found author ID', { authorId });

      logger.info('Starting rank extraction');
      const { currentRank, newRank } = this.extractRankNumbers(
        message.embeds[0].fields
      );
      logger.info('Extracted ranks', { currentRank, newRank });

      // Log before promotion check
      logger.info('Checking promotion eligibility', { authorId });
      const canPromote = await PromotionService.canPromote(authorId);
      logger.info('Promotion check result', { canPromote });

      if (!canPromote) {
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

        const thread = await message.startThread({
          name: `${config.messages.report.delay.threadTitle} - ${interaction.member.displayName}`,
          autoArchiveDuration: 1440,
        });

        await thread.send(
          templateParser.parse(config.messages.report.delay.threadMessage, {
            authorTag: authorField.value,
            timestamp: `<t:${Math.floor(scheduledTime.getTime() / 1000)}:F>`,
          })
        );

        await message.edit({ components: [] });
        await interaction.editReply({
          content: config.messages.report.delay.confirmation,
          ephemeral: true,
        });

        return;
      }

      const promotionMessage =
        await PromotionMessageService.sendPromotionRequest(
          interaction.guild,
          authorId,
          currentRank,
          newRank,
          message.url
        );

      logger.info('Creating acceptance thread');
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

      try {
        logger.info('Recording promotion with data:', {
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

      logger.info('Cleaning up message components');
      await message.edit({ components: [] });

      logger.info('Sending success reply');
      await interaction.editReply({
        content: config.messages.report.accept.confirmation,
        ephemeral: true,
      });
    } catch (error) {
      logger.error('Error handling accept report:', {
        error: error.message,
        stack: error.stack,
        interactionId: interaction.id,
        userId: interaction.user?.id,
        messageId: interaction.message?.id,
      });

      try {
        await interaction.editReply({
          content: config.messages.report.accept.failure,
          ephemeral: true,
        });
      } catch (replyError) {
        logger.error('Failed to send error reply:', {
          error: replyError.message,
          stack: replyError.stack,
        });
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: config.messages.report.accept.failure,
            ephemeral: true,
          });
        }
      }
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

  static formatRoleMention(roleId) {
    return `<@&${roleId}>`;
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

  static extractRankNumbers(fields) {
    try {
      // Find the field containing rank information using config
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

      logger.info('Found rank field', {
        fieldName: rankField.name,
        value: rankField.value,
        matchedIdentifier: config.form.rankFieldIdentifier,
      });

      // Extract numbers between square brackets
      logger.info('Attempting to extract numbers from value', {
        value: rankField.value,
      });
      const numbers = rankField.value.match(/\[(\d+)\]/g);

      if (!numbers) {
        logger.error('No numbers found in brackets', {
          value: rankField.value,
        });
        throw new Error('No rank numbers found in report');
      }

      if (numbers.length !== 2) {
        logger.error('Incorrect number of ranks found', {
          found: numbers.length,
          numbers,
          value: rankField.value,
        });
        throw new Error('Invalid rank format - expected two numbers');
      }

      // Extract just the numbers from "[X]" format
      const currentRank = numbers[0].replace(/[^\d]/g, '');
      const newRank = numbers[1].replace(/[^\d]/g, '');

      logger.info('Successfully extracted ranks', {
        currentRank,
        newRank,
        originalValue: rankField.value,
        numbers,
      });

      return { currentRank, newRank };
    } catch (error) {
      logger.error('Error extracting rank numbers:', {
        error: error.message,
        stack: error.stack,
        fieldsProvided: fields.length,
        fieldNames: fields.map((f) => f.name),
      });
      throw error;
    }
  }

  static formatDisplayName(displayName) {
    try {
      // Match department pattern: any characters (including dots) followed by " | "
      const departmentRegex = /^[A-Za-z.]+\s+\|\s+/;

      // Remove department prefix
      const nameWithoutDepartment = displayName.replace(departmentRegex, '');

      logger.detailedInfo('Formatted display name', {
        original: displayName,
        formatted: nameWithoutDepartment,
      });

      return nameWithoutDepartment;
    } catch (error) {
      logger.error('Error formatting display name:', {
        error: error.message,
        displayName,
      });
      return displayName; // Return original name if formatting fails
    }
  }
}

module.exports = ButtonHandlers;
