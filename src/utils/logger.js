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

// Clean format to remove empty metadata
const cleanFormat = winston.format((info) => {
  const cleanInfo = { ...info };
  if (cleanInfo.metadata && Object.keys(cleanInfo.metadata).length === 0) {
    delete cleanInfo.metadata;
  }
  return cleanInfo;
});

// Function to stringify metadata consistently
const stringifyMetadata = (metadata) => {
  if (!metadata) return '';

  let output = '';

  // Handle error objects
  if (metadata.error instanceof Error) {
    output += `\nError: ${metadata.error.message}`;
    if (metadata.error.stack) {
      output += `\nStack: ${metadata.error.stack}`;
    }
    return output;
  }

  // Handle data objects
  if (metadata.data) {
    output += `\n${JSON.stringify(metadata.data, null, 2)}`;
    return output;
  }

  // Handle other metadata
  if (Object.keys(metadata).length > 0 && !metadata.isDetailedLog) {
    output += `\n${JSON.stringify(metadata, null, 2)}`;
  }

  return output;
};

// Shared format for both console and file
const sharedFormat = winston.format.printf(
  ({ timestamp, level, message, metadata }) => {
    let msg = `[${timestamp}] ${level}: ${message}`;
    msg += stringifyMetadata(metadata);
    return msg;
  }
);

// Console format with colors
const consoleFormat = winston.format.combine(
  upperCase(),
  winston.format.timestamp(),
  winston.format.colorize({
    all: false,
    level: true,
  }),
  cleanFormat(),
  sharedFormat
);

// File format (same as console but without colors)
const fileFormat = winston.format.combine(
  upperCase(),
  winston.format.timestamp(),
  cleanFormat(),
  sharedFormat
);

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.metadata()
  ),
  transports: [
    new winston.transports.Console({
      format: consoleFormat,
    }),
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

// Logging methods
logger.info = (message, ...args) => {
  if (typeof message === 'string') {
    if (args.length > 0) {
      logger.log('info', message, { metadata: { data: args[0] } });
    } else {
      logger.log('info', message);
    }
  } else if (message instanceof Error) {
    logger.log('info', message.message, { metadata: { error: message } });
  } else if (typeof message === 'object') {
    logger.log('info', 'Object logged', { metadata: { data: message } });
  }
};

logger.error = (message, ...args) => {
  if (typeof message === 'string') {
    if (args.length > 0) {
      const error = args[0] instanceof Error ? args[0] : args[0];
      logger.log('error', message, { metadata: { error } });
    } else {
      logger.log('error', message);
    }
  } else if (message instanceof Error) {
    logger.log('error', message.message, { metadata: { error: message } });
  } else if (typeof message === 'object') {
    logger.log('error', 'Error object logged', { metadata: { data: message } });
  }
};

logger.detailedInfo = (message, data = undefined) => {
  logger.log('info', message, {
    metadata: data ? { data, isDetailedLog: true } : { isDetailedLog: true },
  });
};

logger.detailedError = (message, data = undefined) => {
  logger.log('error', message, {
    metadata: data ? { data, isDetailedLog: true } : { isDetailedLog: true },
  });
};

logger.debug = (message, ...args) => {
  if (typeof message === 'string') {
    if (args.length > 0) {
      logger.log('debug', message, { metadata: { data: args[0] } });
    } else {
      logger.log('debug', message);
    }
  } else if (message instanceof Error) {
    logger.log('debug', message.message, { metadata: { error: message } });
  } else if (typeof message === 'object') {
    logger.log('debug', 'Debug object logged', { metadata: { data: message } });
  }
};

module.exports = logger;
