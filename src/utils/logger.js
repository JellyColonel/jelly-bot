const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const path = require('path');
const fs = require('fs');

// Create logs and audit directories
const logsDir = path.join(process.cwd(), 'logs');
const auditDir = path.join(logsDir, 'audit');

[logsDir, auditDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Custom format to capitalize level
const upperCase = winston.format((info) => {
  info.level = info.level.toUpperCase();
  return info;
});

// Define custom colors
winston.addColors({
  INFO: 'cyan',
  WARN: 'yellow',
  ERROR: 'red',
  DEBUG: 'green',
});

// Create console format with filter
const consoleFormat = winston.format.combine(
  upperCase(),
  winston.format.timestamp(),
  winston.format.colorize({
    all: false,
    level: true,
    colors: {
      INFO: 'cyan',
      WARN: 'yellow',
      ERROR: 'red',
      DEBUG: 'green',
    },
  }),
  winston.format((info) => {
    if (info.isDetailedLog) {
      return false;
    }
    return info;
  })(),
  winston.format.printf(({ timestamp, level, message }) => {
    return `[${timestamp}] ${level}: ${message}`;
  })
);

// Create file format (detailed)
const fileFormat = winston.format.combine(
  upperCase(),
  winston.format.timestamp(),
  winston.format.printf(({ timestamp, level, message, ...metadata }) => {
    let msg = `[${timestamp}] ${level}: ${message}`;
    if (metadata.data && Object.keys(metadata.data).length > 0) {
      msg += `\n${JSON.stringify(metadata.data, null, 2)}`;
    }
    return msg;
  })
);

const logger = winston.createLogger({
  level: 'info',
  transports: [
    // Console transport
    new winston.transports.Console({
      format: consoleFormat,
    }),
    // File transport for combined logs
    new DailyRotateFile({
      dirname: logsDir,
      filename: 'combined-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      auditFile: path.join(auditDir, 'combined-audit.json'),
      format: fileFormat,
    }),
    // File transport for error logs
    new DailyRotateFile({
      dirname: logsDir,
      filename: 'error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '14d',
      auditFile: path.join(auditDir, 'error-audit.json'),
      format: fileFormat,
    }),
  ],
});

// Store original methods
const originalInfo = logger.info.bind(logger);
const originalError = logger.error.bind(logger);

// Add custom logging methods
logger.detailedInfo = (message, data = undefined) => {
  const logEntry = { message, isDetailedLog: true };
  if (data) {
    logEntry.data = data;
  }
  originalInfo(logEntry);
};

logger.detailedError = (message, data = undefined) => {
  const logEntry = { message, isDetailedLog: true };
  if (data) {
    logEntry.data = data;
  }
  originalError(logEntry);
};

// Override default methods
logger.info = (message) => {
  originalInfo({ message });
};

logger.error = (message) => {
  originalError({ message });
};

module.exports = logger;
