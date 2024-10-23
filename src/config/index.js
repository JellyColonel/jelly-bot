require('dotenv').config();

const parseRoleIds = (roleIdsString, allRoles = {}) => {
  return roleIdsString
    .split(',')
    .map((item) => item.trim())
    .reduce((acc, item) => {
      // If item starts with @, it's a reference to another role config
      if (item.startsWith('@')) {
        const refKey = item.slice(1); // Remove @ symbol
        const referencedRoles = allRoles[refKey];
        if (referencedRoles) {
          // If it's already an array, spread it; if not, add as single item
          return acc.concat(
            Array.isArray(referencedRoles) ? referencedRoles : [referencedRoles]
          );
        } else {
          console.warn(
            `Warning: Referenced role '${refKey}' not found in configuration`
          );
          return acc;
        }
      }
      // Regular role ID
      return acc.concat(item);
    }, [])
    .filter((id) => id.length > 0);
};

// First, collect all individual role configurations
const roleConfigs = {
  SENIOR_STAFF_ROLE_ID: process.env.SENIOR_STAFF_ROLE_ID,
  MANAGEMENT_STAFF_ROLE_ID: process.env.MANAGEMENT_STAFF_ROLE_ID,
  // Add any other role configurations here
};

module.exports = {
  discord: {
    token: process.env.DISCORD_TOKEN,
    reportsChannelId: process.env.REPORTS_CHANNEL_ID,
    // Now you can use references in REQUIRED_ROLE_ID
    requiredRoleIds: parseRoleIds(process.env.REQUIRED_ROLE_IDS, roleConfigs),
    highRanksRole: process.env.SENIOR_STAFF_ROLE_ID,
    promotionChannelId: process.env.PROMOTION_CHANNEL_ID,
  },
  server: {
    port: process.env.PORT || 3000,
  },
  embed: {
    title: process.env.EMBED_TITLE || 'Отчёт на повышение | Отдел неизвестен',
    url: process.env.EMBER_URL || null,
    color: process.env.EMBED_COLOR,
    footerText: process.env.EMBED_FOOTER || 'Отправлено в ',
    imageUrl: process.env.EMBED_IMAGE_URL || null,
  },
  server: {
    port: process.env.PORT || 3000,
  },
};
