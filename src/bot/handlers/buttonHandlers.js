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

  static formatRoleMention(roleId) {
    return `<@&${roleId}>`;
  }

  static async handleAcceptReport(interaction, message) {
    try {
      await message.react('✅');

      const thread = await message.startThread({
        name: `Report Accepted - ${interaction.user.username}`,
        autoArchiveDuration: 1440,
      });

      const authorField = message.embeds[0].fields.find(
        (field) => field.name === 'Author'
      );
      const authorMention = authorField.value.split(' ')[0];

      const rankField = message.embeds[0].fields.find(
        (field) => field.name === 'Promotion Request'
      );
      const { currentRank, newRank } = this.extractRankNumbers(rankField.value);

      const promotionFormat = [
        `1. ${authorMention} ${interaction.member.displayName}`,
        `2. ${this.formatRoleMention(config.discord.highRanksRole)}`,
        `3. ${currentRank} - ${newRank}`,
        `4. ${message.url}`,
      ].join('\n');

      await thread.send(
        `${authorMention}, your report has been accepted by ${interaction.user}. ` +
          `Please send a promotion request to <#${config.discord.promotionChannelId}> using the following format:\n\`\`\`\n${promotionFormat}\`\`\``
      );

      await message.edit({ components: [] });
      logger.info(`Report accepted by ${interaction.user.tag}`);
    } catch (error) {
      logger.error('Error handling accept report:', error);
      throw error;
    }
  }

  static extractRankNumbers(rankText) {
    try {
      const numbers = rankText
        .match(/[[\]]/g)
        .map((match) => match.replace(/[[\]]/g, ''));

      return {
        currentRank: numbers[0],
        newRank: numbers[1],
      };
    } catch (error) {
      logger.error('Error extracting rank numbers:', error);
      return { currentRank: '?', newRank: '?' };
    }
  }

  static async checkPermission(interaction) {
    // Check if user has any of the required roles
    const hasPermission = config.discord.requiredRoleIds.some((roleId) =>
      interaction.member.roles.cache.has(roleId)
    );

    if (!hasPermission) {
      await interaction.reply({
        content: 'You do not have permission to perform this action.',
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
