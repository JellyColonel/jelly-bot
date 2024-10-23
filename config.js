const dotenv = require('dotenv');

// Load .env file if it exists
dotenv.config();

const config = {
    // Use environment variables with fallbacks
    port: process.env.PORT || 3000,
    discordToken: process.env.DISCORD_TOKEN,
    channelId: process.env.DISCORD_CHANNEL_ID,
       
    // Computed values
    baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
    
    // Validation
    validate() {
        const required = ['DISCORD_TOKEN', 'DISCORD_CHANNEL_ID'];
        const missing = required.filter(key => !process.env[key]);
        
        if (missing.length > 0) {
            throw new Error(
                `Missing required environment variables: ${missing.join(', ')}\n` +
                'Please check your .env file or environment configuration.'
            );
        }
    }
};

// Freeze the configuration to prevent modifications
module.exports = Object.freeze(config);