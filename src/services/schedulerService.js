const PromotionMessageService = require('./promotionMessageService');
const PromotionService = require('./promotionService');
const logger = require('../utils/logger');

class DailyPromotionScheduler {
  constructor(discordClient) {
    this.currentTimer = null;
    this.client = discordClient;
    this.isProcessing = false;

    // Track the last processing date to prevent multiple runs on the same day
    this.lastProcessingDate = null;
  }

  getNextMidnight() {
    const now = new Date();
    // If it's exactly midnight or we haven't processed today yet, we should process now
    if (
      now.getHours() === 0 &&
      now.getMinutes() === 0 &&
      !this.isDailyProcessingDone()
    ) {
      return now;
    }

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow;
  }

  isDailyProcessingDone() {
    if (!this.lastProcessingDate) return false;

    const now = new Date();
    return this.lastProcessingDate.toDateString() === now.toDateString();
  }

  async scheduleNextCheck() {
    try {
      if (this.currentTimer) {
        clearTimeout(this.currentTimer);
      }

      const nextMidnight = this.getNextMidnight();
      const delay = nextMidnight.getTime() - Date.now();

      // Sanity check for delay
      if (delay < 0) {
        logger.error('Negative delay calculated', {
          nextMidnight: nextMidnight.toISOString(),
          now: new Date().toISOString(),
          delay,
        });
        // Recalculate for next day
        return this.scheduleNextCheck();
      }

      logger.info('Scheduling next promotion check', {
        nextCheck: nextMidnight.toISOString(),
        delayMs: delay,
        lastProcessingDate: this.lastProcessingDate?.toISOString() || 'never',
      });

      this.currentTimer = setTimeout(async () => {
        await this.processScheduledPromotions();
        this.scheduleNextCheck();
      }, delay);
    } catch (error) {
      logger.error('Error scheduling next check:', error);
      // Try again in 5 minutes if something goes wrong
      setTimeout(() => this.scheduleNextCheck(), 5 * 60 * 1000);
    }
  }

  async processScheduledPromotions() {
    // Prevent processing twice in the same day
    if (this.isDailyProcessingDone()) {
      logger.warn('Promotions already processed today, skipping', {
        lastProcessing: this.lastProcessingDate.toISOString(),
      });
      return;
    }

    // Prevent concurrent processing
    if (this.isProcessing) {
      logger.warn('Promotion processing already in progress, skipping');
      return;
    }

    this.isProcessing = true;

    try {
      logger.info('Starting daily promotion processing');
      const scheduledPromotions =
        await PromotionService.getScheduledPromotions();

      logger.info('Found pending promotions', {
        count: scheduledPromotions.length,
      });

      for (const promotion of scheduledPromotions) {
        try {
          const guild = await this.client.guilds.fetch(promotion.guildId);

          if (!guild) {
            logger.error('Guild not found for promotion', {
              promotionId: promotion.id,
              guildId: promotion.guildId,
            });
            continue;
          }

          const promotionMessage =
            await PromotionMessageService.sendPromotionRequest(
              guild,
              promotion.user_id,
              promotion.from_rank,
              promotion.to_rank,
              promotion.report_url
            );

          await Promise.all([
            PromotionService.recordPromotion(
              promotion.user_id,
              promotion.from_rank,
              promotion.to_rank,
              promotionMessage.id
            ),
            PromotionService.markPromotionAsProcessed(promotion.id),
          ]);

          logger.info('Processed promotion request', {
            promotionId: promotion.id,
            userId: promotion.user_id,
            messageId: promotionMessage.id,
          });
        } catch (error) {
          logger.error('Failed to process promotion:', {
            promotionId: promotion.id,
            userId: promotion.user_id,
            error: error.message,
            stack: error.stack,
          });
          // Continue processing other promotions even if one fails
        }
      }

      // Mark processing as done for today
      this.lastProcessingDate = new Date();

      logger.info('Completed daily promotion processing', {
        processedCount: scheduledPromotions.length,
        nextProcessing: this.getNextMidnight().toISOString(),
      });
    } catch (error) {
      logger.error('Failed to process scheduled promotions:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  start() {
    logger.info('Starting daily promotion scheduler');
    this.scheduleNextCheck();
  }

  stop() {
    if (this.currentTimer) {
      clearTimeout(this.currentTimer);
      this.currentTimer = null;
      logger.info('Daily promotion scheduler stopped');
    }
  }

  // Helper method to check scheduler status
  getStatus() {
    return {
      isRunning: !!this.currentTimer,
      isProcessing: this.isProcessing,
      lastProcessingDate: this.lastProcessingDate?.toISOString() || null,
      nextScheduledRun: this.getNextMidnight().toISOString(),
    };
  }
}

module.exports = DailyPromotionScheduler;
