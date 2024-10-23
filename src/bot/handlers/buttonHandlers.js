// src/bot/handlers/buttonHandlers.js
const { ButtonBuilder, ActionRowBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config');
const logger = require('../../utils/logger');

class ButtonHandlers {
  static createReportButtons() {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('accept_report')
        .setLabel('Принять')
        .setEmoji('👍')
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId('reject_report')
        .setLabel('Отклонить')
        .setEmoji('👎')
        .setStyle(ButtonStyle.Danger)
    );
  }

  static async handleAcceptReport(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const message = interaction.message;
      await message.react('✅');

      // Create notification thread
      const thread = await message.startThread({
        name: `Отчёт принят - ${interaction.member.displayName}`,
        autoArchiveDuration: 1440,
      });

      // Extract author mention from the embed fields
      const authorField = message.embeds[0].fields.find((field) =>
        field.name.toLowerCase().includes('discord id')
      );

      if (!authorField) {
        throw new Error('Could not find Discord ID field in the report');
      }

      const authorMention = authorField.value.split(' ')[0];

      // Get the guild member object for the author
      const authorId = authorMention.replace(/[<@>]/g, '');
      const authorMember = await interaction.guild.members.fetch(authorId);

      if (!authorMember) {
        throw new Error('Could not find the report author in the server');
      }

      // Format the display name by removing department prefix
      const formattedDisplayName = this.formatDisplayName(
        authorMember.displayName
      );

      // Extract rank numbers from embed fields
      const { currentRank, newRank } = this.extractRankNumbers(
        message.embeds[0].fields
      );

      // Get the promotion channel
      const promotionChannel = await interaction.guild.channels.fetch(
        config.discord.promotionChannelId
      );
      if (!promotionChannel) {
        throw new Error('Could not find the promotion channel');
      }

      // Create and send promotion format to promotion channel
      const promotionFormat = [
        `1. ${authorMention} ${formattedDisplayName}`,
        `2. ${this.formatRoleMention(config.discord.highRanksRole)}`,
        `3. ${currentRank}-${newRank}`,
        `4. ${message.url}`,
      ].join('\n');

      // Send promotion format and store the sent message
      const promotionMessage = await promotionChannel.send(promotionFormat);

      // Notify user in thread
      await thread.send(
        `${authorMention}, Ваш отчёт был принят ${interaction.user}. ` +
          `Запрос на повышение был автоматичесски отправлен в ${promotionMessage.url}.`
      );

      await message.edit({ components: [] });

      await interaction.editReply({
        content: 'Отчёт успешно принят',
        ephemeral: true,
      });

      logger.info(`Report accepted by ${interaction.user.tag}`);
    } catch (error) {
      logger.error('Error handling accept report:', {
        error: error.message,
        stack: error.stack,
      });

      try {
        await interaction.editReply({
          content:
            'Не удалось принять отчёт. Пожалуйста попробуйте снова или свяжитесь с создателем.',
          ephemeral: true,
        });
      } catch (replyError) {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content:
              'Не удалось принять отчёт. Пожалуйста попробуйте снова или свяжитесь с создателем.',
            ephemeral: true,
          });
        }
      }
    }
  }

  static async handleRejectReport(interaction) {
    try {
      logger.info('=== Starting Reject Report Process ===');

      logger.detailedInfo('Interaction details:', {
        user: interaction.user.tag,
        messageId: interaction.message?.id,
        channelId: interaction.channelId,
        guildId: interaction.guildId,
      });

      logger.info('Creating modal...');
      const modal = this.createRejectionModal();

      logger.info('Attempting to show modal...');
      await interaction.showModal(modal);

      logger.info('Modal shown successfully');
    } catch (error) {
      const errorDetails = {
        name: error.name,
        message: error.message,
        code: error.code,
        stack: error.stack,
        interaction: {
          id: interaction.id,
          user: interaction.user?.tag,
          messageId: interaction.message?.id,
          channelId: interaction.channelId,
          guildId: interaction.guildId,
        },
      };

      logger.error('Reject report process failed:', errorDetails);
      console.error('Detailed error:', error); // Temporary console log for immediate debugging

      try {
        await interaction.reply({
          content:
            'Неудалось отобразить форму отказа. Попробуйте снова или обратитесь к создателю.',
          ephemeral: true,
        });
      } catch (replyError) {
        logger.error('Failed to send error reply:', {
          name: replyError.name,
          message: replyError.message,
          stack: replyError.stack,
        });
      }
    }
  }

  static createRejectionModal() {
    try {
      const {
        ModalBuilder,
        TextInputBuilder,
        TextInputStyle,
        ActionRowBuilder,
      } = require('discord.js');

      const modal = new ModalBuilder()
        .setCustomId('rejection_reason_modal')
        .setTitle('Причина');

      const reasonInput = new TextInputBuilder()
        .setCustomId('rejection_reason')
        .setLabel('Укажите причину отклонения отчёта') // Shortened label
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMinLength(10)
        .setMaxLength(1000)
        .setPlaceholder('Подробно опишите причину для отклонения отчёта'); // Added placeholder for additional context

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
      await message.react('❌');

      // Create thread with display name
      const thread = await message.startThread({
        name: `Отчёт отклонён - ${interaction.member.displayName}`,
        autoArchiveDuration: 1440,
      });

      // Find author mention
      const authorField = message.embeds[0].fields.find((field) =>
        field.name.toLowerCase().includes('discord id')
      );

      if (!authorField) {
        throw new Error('Could not find Discord ID field in the report');
      }

      const authorMention = authorField.value.split(' ')[0];

      // Send rejection message
      await thread.send(
        `${authorMention}, Ваш отчёт был отклонён ${interaction.user} по следующей(-им) причине(-ам):\n\`\`\`\n${reason}\`\`\``
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
          content:
            'Не удалось отклонить отчёт. Пожалуйста попробуйте снова или свяжитесь с создателем. ',
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

  static formatRoleMention(roleId) {
    return `<@&${roleId}>`;
  }

  static async checkPermission(interaction) {
    const hasPermission = config.discord.requiredRoleIds.some((roleId) =>
      interaction.member.roles.cache.has(roleId)
    );

    if (!hasPermission) {
      await interaction.reply({
        content:
          'У вас недостаточно прав для использований этой опции, если вы считаете что произошла ошибка, свяжитесь с создателем',
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
      // Find the field containing rank information
      const rankField = fields.find(
        (field) =>
          field.name.toLowerCase().includes('на какой ранг повышаетесь') // Adjust this to match your actual question
      );

      if (!rankField) {
        logger.warn('Rank field not found in embed');
        return { currentRank: '?', newRank: '?' };
      }

      logger.detailedInfo('Found rank field', {
        fieldName: rankField.name,
        value: rankField.value,
      });

      // Extract numbers from text like "Private [1] → Corporal [2]"
      const numbers = rankField.value.match(/\[(\d+)\]/g);

      if (!numbers || numbers.length !== 2) {
        logger.warn('Could not extract rank numbers', {
          value: rankField.value,
        });
        return { currentRank: '?', newRank: '?' };
      }

      // Remove brackets and convert to numbers
      const currentRank = numbers[0].replace(/[[\]]/g, '');
      const newRank = numbers[1].replace(/[[\]]/g, '');

      logger.detailedInfo('Extracted rank numbers', { currentRank, newRank });

      return { currentRank, newRank };
    } catch (error) {
      logger.error('Error extracting rank numbers:', error);
      return { currentRank: '?', newRank: '?' };
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
