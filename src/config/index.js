require('dotenv').config();
const logger = require('../utils/logger');

const parseRoleList = (roleString, roleConfigs, options = {}) => {
  const { delimiter = ',', allowUnresolved = false, prefix = '@' } = options;

  if (!roleString) {
    logger.warn('Empty role string provided');
    return [];
  }

  try {
    return roleString
      .split(delimiter)
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .map((item) => {
        const roleKey = item.startsWith(prefix)
          ? item.slice(prefix.length)
          : item;
        const resolvedRole = roleConfigs[roleKey];

        if (resolvedRole) {
          logger.info(`Resolved role: ${roleKey} -> ${resolvedRole}`);
          return resolvedRole;
        }

        logger.warn(`Unable to resolve role: ${roleKey}`);
        return allowUnresolved ? item : null;
      })
      .filter((id) => id && id.length > 0);
  } catch (error) {
    logger.error('Error parsing role list:', error);
    return [];
  }
};

const processRoleReferences = (content, roleConfigs, delimiter = ' ') => {
  if (!content) return null;

  return content
    .split(delimiter)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => {
      const roleKey = item.startsWith('@') ? item.slice(1) : item;
      const roleId = roleConfigs[roleKey];

      if (roleId) {
        logger.info(`Resolved role mention: ${roleKey} -> ${roleId}`);
        // Format as proper Discord role mention
        return `<@&${roleId}>`;
      }

      logger.warn(`Role not found: ${roleKey}`);
      return item;
    })
    .join(' '); // Join with space to create proper string
};

// Role configurations
const roleConfigs = {
  SENIOR_STAFF_ROLE_ID: process.env.SENIOR_STAFF_ROLE_ID,
  FD_CURATOR_ROLE_ID: process.env.FD_CURATOR_ROLE_ID,
  FD_HEAD_ROLE_ID: process.env.FD_HEAD_ROLE_ID,
  FD_DEP_HEAD_ROLE_ID: process.env.FD_DEP_HEAD_ROLE_ID,
};

// Discord-specific configuration
const discordConfig = {
  token: process.env.DISCORD_TOKEN,
  reportsChannelId: process.env.REPORTS_CHANNEL_ID,
  requiredRoleIds: parseRoleList(process.env.REQUIRED_ROLE_IDS, roleConfigs, {
    delimiter: ',',
    allowUnresolved: false,
  }),
  highRanksRole: process.env.SENIOR_STAFF_ROLE_ID,
  promotionChannelId: process.env.PROMOTION_CHANNEL_ID,
};

// Embed configuration with defaults
const embedConfig = {
  content:
    processRoleReferences(process.env.EMBED_CONTENT, roleConfigs) || null,
  title: process.env.EMBED_TITLE || 'Отчёт на повышение | Отдел неизвестен',
  url: process.env.EMBER_URL || null,
  color: process.env.EMBED_COLOR,
  footerText: process.env.EMBED_FOOTER || 'Отправлено в ',
  imageUrl: process.env.EMBED_IMAGE_URL || null,
};

const formConfig = {
  discordIdFieldIdentifier: process.env.DISCORD_ID_FIELD_IDENTIFIER,
  rankFieldIdentifier: process.env.RANK_FIELD_IDENTIFIER,
};

// Server configuration
const serverConfig = {
  port: parseInt(process.env.PORT, 10) || 3000,
};

// Buttons configuration

const buttonsConfig = {
  accept: {
    label: process.env.ACCEPT_BUTTON_LABEL || 'Принять',
    emoji: process.env.ACCEPT_BUTTON_EMOJI || '👍',
  },
  reject: {
    label: process.env.REJECT_BUTTON_LABEL || 'Отклонить',
    emoji: process.env.REJECT_BUTTON_EMOJI || '👎',
  },
};

const reactionsConfig = {
  accept: process.env.ACCEPT_REACTION_EMOJI || '✅',
  reject: process.env.REJECT_REACTION_EMOJI || '❌',
};

const messagesConfig = {
  common: {
    error: {
      interaction: process.env.CCOMMON_INTERACTION_ERROR,
      notEnoughPermissions: process.env.NOT_ENOUGH_PERMISSIONS_ERROR,
    },
  },
  report: {
    delay: {
      threadTitle: process.env.REPORT_DELAY_THREAD_TITLE,
      threadMessage: process.env.REPORT_DELAY_THREAD_MESSAGE,
      confirmation: process.env.REPORT_DELAY_CONFIRMATION,
    },
    accept: {
      threadTitle: process.env.REPORT_ACCEPT_THREAD_TITLE,
      threadMessage: process.env.REPORT_ACCEPT_THREAD_MESSAGE,
      confirmation: process.env.REPORT_ACCEPT_CONFIRMATION,
      failure: process.env.REPORT_ACCEPT_FAILED,
    },
    reject: {
      threadTitle: process.env.REPORT_REJECT_THREAD_TITLE,
      threadMessage: '${authorMention}, Ваш отчёт был отклонён ${rejector} по следующим причинам:\n```\n${reason}\n```',
      confirmation: process.env.REPORT_REJECT_CONFIRMATION,
      failure: process.env.REPORT_REJECT_FAILED,
    },
  },
};

const rejectModalConfig = {
  title: process.env.REJECT_MODAL_TITLE,
  label: process.env.REJECT_MODAL_LABEL,
  placeholder: process.env.REJECT_MODAL_PLACEHOLDER,
  failure: process.env.REJECT_MODAL_FAILURE,
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
  buttons: buttonsConfig,
  reactions: reactionsConfig,
  messages: messagesConfig,
  rejectModal: rejectModalConfig,
};
