const dbManager = require('../database');
const logger = require('../utils/logger');

class PromotionService {
  static async canPromote(userId) {
    try {
      logger.info('Checking promotion eligibility in database', { userId });
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const query = dbManager.db.prepare(`
        SELECT COUNT(*) as count 
        FROM promotions 
        WHERE user_id = ? 
        AND DATE(promotion_time) = DATE('now', 'localtime')
        AND processed = TRUE
      `);

      const result = query.get(userId);
      logger.info('Promotion check result', { userId, count: result.count });
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
      logger.info('Starting to schedule promotion', {
        params: {
          userId,
          guildId,
          fromRank,
          toRank,
          reportUrl,
        },
      });

      const nextMidnight = new Date();
      nextMidnight.setDate(nextMidnight.getDate() + 1);
      nextMidnight.setHours(0, 0, 0, 0);

      const params = [
        userId.toString(),
        guildId.toString(),
        new Date().toISOString(),
        parseInt(fromRank, 10),
        parseInt(toRank, 10),
        null, // message_id will be set when promotion is actually sent
        reportUrl,
        nextMidnight.toISOString(),
      ];

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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?);
      `;

      try {
        const stmt = dbManager.db.prepare(insertSQL);
        const result = stmt.run(...params);

        logger.info('Promotion scheduled successfully', {
          userId,
          scheduledFor: nextMidnight.toISOString(),
          changes: result.changes,
          lastInsertRowid: result.lastInsertRowid,
        });

        return { scheduledTime: nextMidnight };
      } catch (sqlError) {
        console.error('SQL Error Details:', {
          message: sqlError.message,
          code: sqlError.code,
          params: params,
          sql: insertSQL,
        });
        throw sqlError;
      }
    } catch (error) {
      logger.error('Error scheduling promotion:', {
        error: error.message,
        stack: error.stack,
        inputParams: { userId, guildId, fromRank, toRank, reportUrl },
      });
      throw error;
    }
  }

  // src/services/promotionService.js
  static async recordPromotion(
    userId,
    fromRank,
    toRank,
    messageId,
    guildId,
    reportUrl
  ) {
    try {
      const params = [
        userId.toString(),
        guildId.toString(),
        new Date().toISOString(),
        parseInt(fromRank, 10),
        parseInt(toRank, 10),
        messageId.toString(),
        reportUrl,
      ];

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
        ) VALUES (?, ?, ?, ?, ?, ?, ?, 1)
      `;

      try {
        const stmt = dbManager.db.prepare(insertSQL);
        const result = stmt.run(...params); // Removed the extra '1' parameter
        logger.info('Promotion recorded successfully', {
          changes: result.changes,
          lastInsertRowid: result.lastInsertRowid,
        });
        return result;
      } catch (sqlError) {
        console.error('SQL Error Details:', {
          message: sqlError.message,
          code: sqlError.code,
          params: params,
          sql: insertSQL,
        });
        throw sqlError;
      }
    } catch (error) {
      logger.error('Error recording promotion:', {
        error: error.message,
        stack: error.stack,
        inputParams: {
          userId,
          fromRank,
          toRank,
          messageId,
          guildId,
          reportUrl,
        },
      });
      throw error;
    }
  }

  // Helper method to get table info
  static async getTableInfo() {
    try {
      const tableInfo = dbManager.db
        .prepare('PRAGMA table_info(promotions)')
        .all();
      return tableInfo;
    } catch (error) {
      logger.error('Failed to get table info:', error);
      return null;
    }
  }

  static async getScheduledPromotions() {
    try {
      const query = dbManager.db.prepare(`
        SELECT * FROM promotions 
        WHERE processed = FALSE 
        AND scheduled_for <= DATETIME('now', 'localtime');
      `);

      return query.all();
    } catch (error) {
      logger.error('Error getting scheduled promotions:', error);
      throw error;
    }
  }

  static async markPromotionAsProcessed(id) {
    try {
      const query = dbManager.db.prepare(`
        UPDATE promotions 
        SET processed = TRUE 
        WHERE id = ?;
      `);

      query.run(id);
    } catch (error) {
      logger.error('Error marking promotion as processed:', error);
      throw error;
    }
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
      throw new Error(
        `Missing required parameters for ${operation}: ${missingParams.join(', ')}`
      );
    }

    return true;
  }
}

module.exports = PromotionService;
