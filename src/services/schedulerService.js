const PromotionMessageService = require('./promotionMessageService');
const PromotionService = require('./promotionService');
const logger = require('../utils/logger');

class SchedulerService {
  constructor(discordClient) {
    this.currentTimer = null;
    this.client = discordClient; // Store client reference
  }

  getNextMidnight() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  async scheduleNextCheck() {
    try {
      if (this.currentTimer) {
        clearTimeout(this.currentTimer);
      }

      const nextMidnight = this.getNextMidnight();
      const delay = nextMidnight.getTime() - Date.now();

      logger.info('Scheduling next promotion check', {
        nextCheck: nextMidnight.toISOString(),
        delayMs: delay,
      });

      this.currentTimer = setTimeout(async () => {
        await this.processScheduledPromotions();
        this.scheduleNextCheck();
      }, delay);
    } catch (error) {
      logger.error('Error scheduling next check:', error);
      setTimeout(() => this.scheduleNextCheck(), 3600000);
    }
  }

  async processScheduledPromotions() {
    try {
      logger.info('Processing scheduled promotions');
      const scheduledPromotions =
        await PromotionService.getScheduledPromotions();

      for (const promotion of scheduledPromotions) {
        try {
          const guild = await this.client.guilds.fetch(promotion.guildId);

          const promotionMessage =
            await PromotionMessageService.sendPromotionRequest(
              guild,
              promotion.user_id,
              promotion.from_rank,
              promotion.to_rank,
              promotion.report_url
            );

          await PromotionService.recordPromotion(
            promotion.user_id,
            promotion.from_rank,
            promotion.to_rank,
            promotionMessage.id
          );

          await PromotionService.markPromotionAsProcessed(promotion.id);

          logger.info('Processed scheduled promotion', {
            userId: promotion.user_id,
            promotionId: promotion.id,
          });
        } catch (error) {
          logger.error('Failed to process scheduled promotion:', {
            promotionId: promotion.id,
            error: error.message,
            stack: error.stack,
          });
        }
      }
    } catch (error) {
      logger.error('Failed to process scheduled promotions:', error);
    }
  }

  start() {
    logger.info('Starting promotion scheduler');
    this.scheduleNextCheck();
  }

  stop() {
    if (this.currentTimer) {
      clearTimeout(this.currentTimer);
      this.currentTimer = null;
      logger.info('Promotion scheduler stopped');
    }
  }
}

module.exports = SchedulerService;
