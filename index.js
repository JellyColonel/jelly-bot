const fs = require('node:fs');
const path = require('node:path');

// Require the necessary discord.js classes
const { ActionRowBuilder, ButtonBuilder, ButtonStyle, Client, GatewayIntentBits } = require('discord.js');

// Setup Express server
const express = require('express');
const server = express();
server.use(express.json());


// Read config
const config = require('./config')

// Validate configuration on startup
config.validate();

// Create a new client instance
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Read events
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    const event = require(filePath);
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
}

server.post('/form-submission', async (req, res) => {
    try {
        const formData = req.body;

        // Get the Discord channel
        const channel = await client.channels.fetch(config.channelId);

        // Create a formatted message from form data
        const message = formatFormSubmission(formData);

        // Send the message to Discord
        await channel.send(message);

        res.status(200).json({ message: 'Form submission sent to Discord successfully' });
    } catch (error) {
        console.error('Error processing form submission:', error);
        res.status(500).json({ error: 'Failed to process form submission' });
    }
});

// Helper function to format form data
function formatFormSubmission(formData) {

    const acceptReportButton = new ButtonBuilder()
        .setCustomId('acceptReportButton')
        .setLabel('Принять')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅');

    const rejectReportButton = new ButtonBuilder()
        .setCustomId('rejectReportButton')
        .setLabel('Отклонить')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌');

    const row = new ActionRowBuilder()
        .addComponents(acceptReportButton, rejectReportButton);

    return {
        content: `Здесь будут роли`,
        embeds: [{
            title: '📝 New Form Submission',
            color: 0x00ff00, // Green color
            fields: Object.entries(formData).map(([question, answer]) => ({
                name: question,
                value: answer.toString(),
                inline: false
            })),
            timestamp: new Date().toISOString()
        }],
        components: [row],
    };
}

// Log in to Discord with your client's token
client.login(config.discordToken);

const PORT = config.port
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})