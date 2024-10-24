const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs').promises; // Added this import
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

      // Drop index if exists to avoid conflicts
      this.db.exec('DROP INDEX IF EXISTS idx_user_promotions;');

      // Create table with explicit column types
      this.db.exec(`
CREATE TABLE IF NOT EXISTS promotions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  guild_id TEXT NOT NULL,
  promotion_time TEXT NOT NULL,
  from_rank INTEGER NOT NULL,
  to_rank INTEGER NOT NULL,
  message_id TEXT,             -- Removed NOT NULL constraint
  report_url TEXT NOT NULL,
  processed INTEGER NOT NULL DEFAULT 0,
  scheduled_for TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
        
        CREATE INDEX IF NOT EXISTS idx_user_promotions 
        ON promotions(user_id, promotion_time);
      `);

      // Verify table structure
      const tableInfo = this.db.prepare('PRAGMA table_info(promotions)').all();
      logger.info('Table structure:', { columns: tableInfo });

      logger.info('Database tables created successfully');
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
}

// Create and export single instance
const dbManager = new DatabaseManager();
module.exports = dbManager;
