const PromotionService = require('./promotionService');
const logger = require('../utils/logger');

class SchedulerService {
  constructor() {
    this.currentTimer = null;
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
      // Clear any existing timer
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
        // Schedule next day's check
        this.scheduleNextCheck();
      }, delay);
    } catch (error) {
      logger.error('Error scheduling next check:', error);
      // Retry in 1 hour if there's an error
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
          // Process the scheduled promotion
          // Implement your promotion sending logic here
          await PromotionService.markPromotionAsProcessed(promotion.id);

          logger.info('Processed scheduled promotion', {
            userId: promotion.user_id,
            promotionId: promotion.id,
          });
        } catch (error) {
          logger.error('Failed to process scheduled promotion:', {
            promotionId: promotion.id,
            error: error.message,
          });
        }
      }
    } catch (error) {
      logger.error('Failed to process scheduled promotions:', error);
    }
  }

  // Call this when bot starts
  start() {
    logger.info('Starting promotion scheduler');
    this.scheduleNextCheck();
  }

  // Call this when bot stops
  stop() {
    if (this.currentTimer) {
      clearTimeout(this.currentTimer);
      this.currentTimer = null;
      logger.info('Promotion scheduler stopped');
    }
  }
}

const scheduler = new SchedulerService();
module.exports = scheduler;
