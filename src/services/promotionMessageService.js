const logger = require('../utils/logger');
const config = require('../config');

class PromotionMessageService {
  /**
   * Sends a promotion request message to the designated channel
   * @param {Discord.Guild} guild - Discord guild object
   * @param {string} authorId - Discord user ID of the promotion candidate
   * @param {string} currentRank - Current rank of the user
   * @param {string} newRank - Proposed new rank
   * @param {string} reportUrl - URL of the promotion report
   * @param {Object} options - Additional options for the promotion request
   * @param {boolean} options.immediate - Whether this is an immediate promotion
   * @param {string} options.approverTag - Discord tag of the person who approved (for immediate promotions)
   * @returns {Promise<Discord.Message>} The sent message
   */
  static async sendPromotionRequest(
    guild,
    authorId,
    currentRank,
    newRank,
    reportUrl,
    options = {}
  ) {
    try {
      logger.info('Starting to send promotion request', {
        authorId,
        currentRank,
        newRank,
        immediate: options.immediate,
        approver: options.approverTag
      });

      // Get and validate all required resources
      const [promotionChannel, authorMember] = await Promise.all([
        this.getPromotionChannel(guild),
        this.getMember(guild, authorId)
      ]);

      // Format the message content
      const messageContent = await this.formatPromotionRequest(
        authorMember,
        currentRank,
        newRank,
        reportUrl,
        options
      );

      // Send the message
      const promotionMessage = await promotionChannel.send(messageContent);

      logger.info('Promotion request sent successfully', {
        messageId: promotionMessage.id,
        authorId,
        immediate: options.immediate,
        approver: options.approverTag
      });

      return promotionMessage;
    } catch (error) {
      logger.error('Failed to send promotion request:', {
        error: error.message,
        stack: error.stack,
        authorId,
        currentRank,
        newRank,
        reportUrl,
        options
      });
      throw error;
    }
  }

  /**
   * Gets the promotion channel for the guild
   */
  static async getPromotionChannel(guild) {
    try {
      const channel = await guild.channels.fetch(config.discord.promotionChannelId);
      if (!channel) {
        throw new Error('Promotion channel not found');
      }
      return channel;
    } catch (error) {
      logger.error('Failed to fetch promotion channel:', {
        error: error.message,
        guildId: guild.id,
        channelId: config.discord.promotionChannelId
      });
      throw new Error('Could not access promotion channel');
    }
  }

  /**
   * Gets a guild member
   */
  static async getMember(guild, userId) {
    try {
      const member = await guild.members.fetch(userId);
      if (!member) {
        throw new Error('Member not found');
      }
      return member;
    } catch (error) {
      logger.error('Failed to fetch guild member:', {
        error: error.message,
        guildId: guild.id,
        userId
      });
      throw new Error('Could not find promotion candidate');
    }
  }

  /**
   * Formats the promotion request message
   */
  static async formatPromotionRequest(
    member,
    currentRank,
    newRank,
    reportUrl
  ) {
    const formattedDisplayName = this.formatDisplayName(member.displayName);
    
    const messageLines = [
      `1. <@${member.id}> ${formattedDisplayName}`,
      `2. ${this.formatRoleMention(config.discord.highRanksRole)}`,
      `3. ${currentRank}-${newRank}`,
      `4. ${reportUrl}`,
    ];
    return messageLines.join('\n');
  }

  /**
   * Formats a display name by removing department prefix
   */
  static formatDisplayName(displayName) {
    try {
      const departmentRegex = /^[A-Za-z.]+\s+\|\s+/;
      const nameWithoutDepartment = displayName.replace(departmentRegex, '');

      logger.info('Formatted display name', {
        original: displayName,
        formatted: nameWithoutDepartment
      });

      return nameWithoutDepartment;
    } catch (error) {
      logger.error('Error formatting display name:', {
        error: error.message,
        displayName
      });
      return displayName;
    }
  }

  /**
   * Formats a role mention
   */
  static formatRoleMention(roleId) {
    return `<@&${roleId}>`;
  }
}

module.exports = PromotionMessageService;