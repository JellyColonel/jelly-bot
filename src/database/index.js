const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');

class DatabaseManager {
  constructor() {
    this.db = null;
  }

  async init() {
    try {
      // Ensure data directory exists
      const dataDir = path.join(process.cwd(), 'data');
      try {
        await fs.mkdir(dataDir, { recursive: true });
      } catch (error) {
        if (error.code !== 'EEXIST') {
          throw error;
        }
      }

      const dbPath = path.join(dataDir, 'promotions.db');
      logger.info(`Initializing database at: ${dbPath}`);

      this.db = new Database(dbPath);

      // Enable foreign keys and WAL mode for better performance
      this.db.pragma('foreign_keys = ON');
      this.db.pragma('journal_mode = WAL');

      // Create tables
      logger.info('Creating database tables');

      // Drop existing indices to avoid conflicts
      this.db.exec(`
        DROP INDEX IF EXISTS idx_user_promotions;
        DROP INDEX IF EXISTS idx_scheduled_promotions;
        DROP INDEX IF EXISTS idx_processed_promotions;
      `);

      // Create or modify table with new columns
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS promotions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          guild_id TEXT NOT NULL,
          promotion_time TEXT NOT NULL,
          from_rank INTEGER NOT NULL,
          to_rank INTEGER NOT NULL,
          message_id TEXT,
          report_url TEXT NOT NULL,
          processed INTEGER NOT NULL DEFAULT 0,
          scheduled_for TEXT,
          created_at TEXT DEFAULT CURRENT_TIMESTAMP,
          processed_at TEXT,
          failed_reason TEXT,
          attempts INTEGER DEFAULT 0,
          last_attempt_at TEXT
        );
        
        -- Index for user promotions lookup
        CREATE INDEX IF NOT EXISTS idx_user_promotions 
        ON promotions(user_id, promotion_time);
        
        -- Index for scheduled promotions lookup
        CREATE INDEX IF NOT EXISTS idx_scheduled_promotions 
        ON promotions(scheduled_for, processed);
        
        -- Index for processed promotions
        CREATE INDEX IF NOT EXISTS idx_processed_promotions 
        ON promotions(processed, processed_at);
      `);

      // Add new columns if they don't exist
      const addColumnsIfNotExist = () => {
        const tableInfo = this.db
          .prepare('PRAGMA table_info(promotions)')
          .all();
        const columns = tableInfo.map((col) => col.name);

        const newColumns = [
          ['processed_at', 'TEXT'],
          ['failed_reason', 'TEXT'],
          ['attempts', 'INTEGER', 'DEFAULT 0'],
          ['last_attempt_at', 'TEXT'],
        ];

        for (const [colName, colType, defaultValue] of newColumns) {
          if (!columns.includes(colName)) {
            const defaultClause = defaultValue ? ` ${defaultValue}` : '';
            this.db.exec(
              `ALTER TABLE promotions ADD COLUMN ${colName} ${colType}${defaultClause};`
            );
            logger.info(`Added new column: ${colName}`);
          }
        }
      };

      addColumnsIfNotExist();

      // Verify final table structure
      const tableInfo = this.db.prepare('PRAGMA table_info(promotions)').all();
      logger.info('Table structure:', { columns: tableInfo });

      // Log indices
      const indices = this.db
        .prepare(
          'SELECT * FROM sqlite_master WHERE type=\'index\' AND tbl_name=\'promotions\''
        )
        .all();
      logger.info('Table indices:', {
        indices: indices.map((idx) => idx.name),
      });

      logger.info('Database tables and indices created successfully');
    } catch (error) {
      logger.error('Database initialization failed:', error);
      throw error;
    }
  }

  async close() {
    if (this.db) {
      this.db.close();
      logger.info('Database connection closed');
    }
  }

  // Helper method to get database version and status
  getDatabaseInfo() {
    return {
      version: this.db.prepare('SELECT sqlite_version()').pluck().get(),
      walMode: this.db.pragma('journal_mode', { simple: true }),
      foreignKeys: this.db.pragma('foreign_keys', { simple: true }),
      pageSize: this.db.pragma('page_size', { simple: true }),
      cacheSize: this.db.pragma('cache_size', { simple: true }),
    };
  }
}

// Create and export single instance
const dbManager = new DatabaseManager();
module.exports = dbManager;
