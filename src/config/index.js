require('dotenv').config();
const logger = require('../utils/logger');

/**
 * Validates and formats a Discord role ID
 * @param {string} roleId
 * @returns {string|null}
 */
const validateRoleId = (roleId) => {
  if (!roleId) return null;
  const cleaned = roleId.trim();
  return cleaned.length > 0 ? cleaned : null;
};

/**
 * Processes role references and returns resolved role IDs
 * @param {string} roleIdsString - Comma-separated role IDs or references
 * @param {Object} allRoles - Available role configurations
 * @returns {string[]}
 */
const parseRoleIds = (roleIdsString, allRoles = {}) => {
  if (!roleIdsString) {
    logger.warn('No role IDs provided');
    return [];
  }

  return roleIdsString
    .split(',')
    .map((item) => item.trim())
    .reduce((acc, item) => {
      if (item.startsWith('@')) {
        const refKey = item.slice(1);
        const referencedRoles = allRoles[refKey];

        if (referencedRoles) {
          const resolvedRoles = Array.isArray(referencedRoles)
            ? referencedRoles
            : [referencedRoles];

          logger.info(`Resolved role reference: @${refKey}`, {
            resolved: resolvedRoles,
          });

          return acc.concat(resolvedRoles);
        }

        logger.warn(`Referenced role not found: ${refKey}`);
        return acc;
      }

      return acc.concat(item);
    }, [])
    .filter((id) => {
      const isValid = id && id.length > 0;
      if (!isValid) {
        logger.warn(`Invalid role ID found: ${id}`);
      }
      return isValid;
    });
};

// Role configurations
const roleConfigs = {
  SENIOR_STAFF_ROLE_ID: validateRoleId(process.env.SENIOR_STAFF_ROLE_ID),
  FD_CURATOR_ROLE_ID: validateRoleId(process.env.FD_CURATOR_ROLE_ID),
  FD_HEAD_ROLE_ID: validateRoleId(process.env.FD_HEAD_ROLE_ID),
  FD_DEP_HEAD_ROLE_ID: validateRoleId(process.env.FD_DEP_HEAD_ROLE_ID),
};

// Discord-specific configuration
const discordConfig = {
  token: process.env.DISCORD_TOKEN,
  reportsChannelId: process.env.REPORTS_CHANNEL_ID,
  requiredRoleIds: parseRoleIds(process.env.REQUIRED_ROLE_IDS, roleConfigs),
  highRanksRole: validateRoleId(process.env.SENIOR_STAFF_ROLE_ID),
  promotionChannelId: process.env.PROMOTION_CHANNEL_ID,
};

// Embed configuration with defaults
const embedConfig = {
  title: process.env.EMBED_TITLE || 'Отчёт на повышение | Отдел неизвестен',
  url: process.env.EMBER_URL || null,
  color: process.env.EMBED_COLOR,
  footerText: process.env.EMBED_FOOTER || 'Отправлено в ',
  imageUrl: process.env.EMBED_IMAGE_URL || null,
};

const formConfig = {
  rankFieldIdentifier: process.env.RANK_FIELD_IDENTIFIER,
};

// Server configuration
const serverConfig = {
  port: parseInt(process.env.PORT, 10) || 3000,
};

// Validate critical configuration
const validateConfig = () => {
  const required = {
    'Discord Token': discordConfig.token,
    'Reports Channel ID': discordConfig.reportsChannelId,
    'Promotion Channel ID': discordConfig.promotionChannelId,
  };

  const missing = Object.entries(required)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    logger.error(`Missing required configuration: ${missing.join(', ')}`);
    process.exit(1);
  }

  if (discordConfig.requiredRoleIds.length === 0) {
    logger.warn('No required role IDs configured');
  }
};

// Run validation
validateConfig();

// Export configuration
module.exports = {
  discord: discordConfig,
  server: serverConfig,
  embed: embedConfig,
  roles: roleConfigs,
  form: formConfig,
};
