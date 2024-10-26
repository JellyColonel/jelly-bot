const dbManager = require('../database');
const logger = require('../utils/logger');

class PromotionService {
  // Constants for better maintainability
  static get PROMOTION_STATES() {
    return {
      PENDING: 0,
      PROCESSED: 1,
      FAILED: 2,
    };
  }

  static async canPromote(userId) {
    try {
      logger.info('Checking promotion eligibility', { userId });

      const query = dbManager.db.prepare(`
        SELECT COUNT(*) as count 
        FROM promotions 
        WHERE user_id = ? 
          AND DATE(promotion_time) = DATE('now', 'localtime')
          AND processed = ?
      `);

      const result = query.get(userId, this.PROMOTION_STATES.PROCESSED);

      logger.info('Promotion eligibility check result', {
        userId,
        isEligible: result.count === 0,
        existingPromotions: result.count,
      });

      return result.count === 0;
    } catch (error) {
      logger.error('Error checking promotion eligibility:', {
        error: error.message,
        stack: error.stack,
        userId,
      });
      throw error;
    }
  }

  static async schedulePromotion(userId, guildId, fromRank, toRank, reportUrl) {
    try {
      this.validatePromotionParams(
        { userId, guildId, fromRank, toRank, reportUrl },
        'scheduling promotion'
      );

      logger.info('Scheduling promotion', {
        userId,
        guildId,
        fromRank,
        toRank,
        reportUrl,
      });

      const nextMidnight = this.getNextMidnight();

      const insertSQL = `
        INSERT INTO promotions (
          user_id,
          guild_id,
          promotion_time,
          from_rank,
          to_rank,
          message_id,
          report_url,
          processed,
          scheduled_for
        ) VALUES (?, ?, DATETIME('now', 'localtime'), ?, ?, ?, ?, ?, ?);
      `;

      const stmt = dbManager.db.prepare(insertSQL);

      const result = stmt.run(
        userId.toString(),
        guildId.toString(),
        parseInt(fromRank, 10),
        parseInt(toRank, 10),
        null, // message_id
        reportUrl,
        this.PROMOTION_STATES.PENDING,
        nextMidnight.toISOString()
      );

      logger.info('Promotion scheduled successfully', {
        userId,
        promotionId: result.lastInsertRowid,
        scheduledFor: nextMidnight.toISOString(),
      });

      return {
        scheduledTime: nextMidnight,
        promotionId: result.lastInsertRowid,
      };
    } catch (error) {
      logger.error('Failed to schedule promotion:', {
        error: error.message,
        stack: error.stack,
        params: { userId, guildId, fromRank, toRank, reportUrl },
      });
      throw error;
    }
  }

  static async recordPromotion(
    userId,
    fromRank,
    toRank,
    messageId,
    guildId,
    reportUrl
  ) {
    try {
      this.validatePromotionParams(
        { userId, guildId, fromRank, toRank, reportUrl },
        'recording promotion'
      );

      const insertSQL = `
        INSERT INTO promotions (
          user_id, 
          guild_id,
          promotion_time, 
          from_rank, 
          to_rank, 
          message_id,
          report_url,
          processed
        ) VALUES (?, ?, DATETIME('now', 'localtime'), ?, ?, ?, ?, ?)
      `;

      const stmt = dbManager.db.prepare(insertSQL);

      const result = stmt.run(
        userId.toString(),
        guildId.toString(),
        parseInt(fromRank, 10),
        parseInt(toRank, 10),
        messageId.toString(),
        reportUrl,
        this.PROMOTION_STATES.PROCESSED
      );

      logger.info('Promotion recorded successfully', {
        promotionId: result.lastInsertRowid,
        userId,
        messageId,
      });

      return result;
    } catch (error) {
      logger.error('Failed to record promotion:', {
        error: error.message,
        stack: error.stack,
        params: { userId, fromRank, toRank, messageId, guildId, reportUrl },
      });
      throw error;
    }
  }

  static async getScheduledPromotions() {
    try {
      logger.info('Fetching scheduled promotions');

      const query = dbManager.db.prepare(`
        SELECT * FROM promotions 
        WHERE processed = ?
          AND scheduled_for <= DATETIME('now', 'localtime')
        ORDER BY scheduled_for ASC;
      `);

      const promotions = query.all(this.PROMOTION_STATES.PENDING);

      logger.info('Retrieved scheduled promotions', {
        count: promotions.length,
      });

      return promotions;
    } catch (error) {
      logger.error('Failed to get scheduled promotions:', error);
      throw error;
    }
  }

  static async markPromotionAsProcessed(id) {
    try {
      logger.info('Marking promotion as processed', { promotionId: id });

      const query = dbManager.db.prepare(`
        UPDATE promotions 
        SET processed = ?,
            processed_at = DATETIME('now', 'localtime')
        WHERE id = ?;
      `);

      const result = query.run(this.PROMOTION_STATES.PROCESSED, id);

      if (result.changes === 0) {
        throw new Error(`No promotion found with ID ${id}`);
      }

      logger.info('Promotion marked as processed', {
        promotionId: id,
        changes: result.changes,
      });

      return result;
    } catch (error) {
      logger.error('Failed to mark promotion as processed:', {
        error: error.message,
        promotionId: id,
      });
      throw error;
    }
  }

  static async markPromotionAsFailed(id, reason) {
    try {
      logger.info('Marking promotion as failed', {
        promotionId: id,
        reason,
      });

      const query = dbManager.db.prepare(`
        UPDATE promotions 
        SET processed = ?,
            failed_reason = ?,
            processed_at = DATETIME('now', 'localtime')
        WHERE id = ?;
      `);

      const result = query.run(this.PROMOTION_STATES.FAILED, reason, id);

      if (result.changes === 0) {
        throw new Error(`No promotion found with ID ${id}`);
      }

      return result;
    } catch (error) {
      logger.error('Failed to mark promotion as failed:', {
        error: error.message,
        promotionId: id,
      });
      throw error;
    }
  }

  static async getPromotionHistory(userId, limit = 10) {
    try {
      const query = dbManager.db.prepare(`
        SELECT * FROM promotions 
        WHERE user_id = ? 
        ORDER BY promotion_time DESC 
        LIMIT ?;
      `);

      return query.all(userId, limit);
    } catch (error) {
      logger.error('Failed to get promotion history:', {
        error: error.message,
        userId,
      });
      throw error;
    }
  }

  // Helper methods
  static getNextMidnight() {
    const nextMidnight = new Date();
    nextMidnight.setDate(nextMidnight.getDate() + 1);
    nextMidnight.setHours(0, 0, 0, 0);
    return nextMidnight;
  }

  static validatePromotionParams(params, operation = 'unknown') {
    const requiredParams = {
      userId: params.userId,
      guildId: params.guildId,
      fromRank: params.fromRank,
      toRank: params.toRank,
      reportUrl: params.reportUrl,
    };

    const missingParams = Object.entries(requiredParams)
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missingParams.length > 0) {
      const error = new Error(
        `Missing required parameters for ${operation}: ${missingParams.join(', ')}`
      );
      logger.error('Parameter validation failed:', {
        operation,
        missingParams,
        providedParams: params,
      });
      throw error;
    }

    return true;
  }
}

module.exports = PromotionService;
