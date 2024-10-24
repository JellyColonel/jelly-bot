const logger = require('../utils/logger');
const config = require('../config');

class PromotionMessageService {
  static async sendPromotionRequest(
    guild,
    authorId,
    currentRank,
    newRank,
    reportUrl
  ) {
    try {
      logger.info('Starting to send promotion request', {
        authorId,
        currentRank,
        newRank,
      });

      // Get the promotion channel
      const promotionChannel = await guild.channels.fetch(
        config.discord.promotionChannelId
      );
      if (!promotionChannel) {
        throw new Error('Could not find promotion channel');
      }

      // Get author member
      const authorMember = await guild.members.fetch(authorId);
      if (!authorMember) {
        throw new Error('Could not find member');
      }

      // Format display name
      const formattedDisplayName = this.formatDisplayName(
        authorMember.displayName
      );
      logger.info('Formatted display name', {
        original: authorMember.displayName,
        formatted: formattedDisplayName,
      });

      // Create promotion format
      const promotionFormat = [
        `1. <@${authorId}> ${formattedDisplayName}`,
        `2. ${this.formatRoleMention(config.discord.highRanksRole)}`,
        `3. ${currentRank}-${newRank}`,
        `4. ${reportUrl}`,
      ].join('\n');

      // Send message
      const promotionMessage = await promotionChannel.send(promotionFormat);
      logger.info('Promotion request sent', { messageId: promotionMessage.id });

      return promotionMessage;
    } catch (error) {
      logger.error('Failed to send promotion request:', {
        error: error.message,
        stack: error.stack,
        authorId,
        currentRank,
        newRank,
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

      logger.info('Formatted display name', {
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

  static formatRoleMention(roleId) {
    return `<@&${roleId}>`;
  }
}

module.exports = PromotionMessageService;
