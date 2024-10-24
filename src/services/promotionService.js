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

  static async schedulePromotion(userId, fromRank, toRank, messageId) {
    try {
      const nextMidnight = new Date();
      nextMidnight.setDate(nextMidnight.getDate() + 1);
      nextMidnight.setHours(0, 0, 0, 0);

      const query = dbManager.db.prepare(`
        INSERT INTO promotions (
          user_id, 
          promotion_time, 
          from_rank, 
          to_rank, 
          message_id, 
          processed,
          scheduled_for
        ) VALUES (?, ?, ?, ?, ?, FALSE, ?);
      `);

      query.run(
        userId,
        new Date().toISOString(),
        fromRank,
        toRank,
        messageId,
        nextMidnight.toISOString()
      );

      return { scheduledTime: nextMidnight }; // Remove delay from return
    } catch (error) {
      logger.error('Error scheduling promotion:', error);
      throw error;
    }
  }

  static async recordPromotion(userId, fromRank, toRank, messageId) {
    try {
      logger.info('Starting to record promotion', {
        userId,
        fromRank,
        toRank,
        messageId,
        promotionTime: new Date().toISOString(),
      });

      // First verify all parameters are present
      if (!userId || !fromRank || !toRank || !messageId) {
        throw new Error('Missing required parameters for promotion recording');
      }

      const insertSQL = `
        INSERT INTO promotions (
          user_id, 
          promotion_time, 
          from_rank, 
          to_rank, 
          message_id, 
          processed
        ) VALUES (?, ?, ?, ?, ?, 1)
      `;

      logger.info('Preparing SQL statement', { sql: insertSQL });

      try {
        const stmt = dbManager.db.prepare(insertSQL);

        const result = stmt.run(
          userId.toString(),
          new Date().toISOString(),
          parseInt(fromRank, 10),
          parseInt(toRank, 10),
          messageId.toString()
        );

        logger.info('Promotion recorded successfully', {
          userId,
          changes: result.changes,
          lastInsertRowid: result.lastInsertRowid,
        });

        return result;
      } catch (sqlError) {
        logger.error('SQL error while recording promotion:', {
          error: sqlError.message,
          code: sqlError.code,
          stack: sqlError.stack,
          params: {
            userId,
            fromRank,
            toRank,
            messageId,
            paramTypes: {
              userId: typeof userId,
              fromRank: typeof fromRank,
              toRank: typeof toRank,
              messageId: typeof messageId,
            },
          },
        });
        throw sqlError;
      }
    } catch (error) {
      logger.error('Error recording promotion:', {
        error: error.message,
        stack: error.stack,
        params: {
          userId,
          fromRank,
          toRank,
          messageId,
          paramTypes: {
            userId: typeof userId,
            fromRank: typeof fromRank,
            toRank: typeof toRank,
            messageId: typeof messageId,
          },
        },
      });
      throw error;
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
}

module.exports = PromotionService;
