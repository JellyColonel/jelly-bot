const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events, ModalBuilder, TextInputBuilder, TextInputStyle, ThreadAutoArchiveDuration } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isModalSubmit()) {
        } else if (interaction.isButton()) {
            if (interaction.customId === 'acceptReportButton') {
                const thread = await interaction.message.startThread({
                    name: `%АвторФормы% - Отчёт на повышение`,
                    autoArchiveDuration: ThreadAutoArchiveDuration.OneHour,
                    reason: `Ветка для обсуждения отчёта на повышение`
                });
                await thread.send({ content: `%Автор формы%, <@${interaction.user.id}> одобрил(-а) Ваш отчёт на повышение.\nОтпишите запрос на повышение в канал <#1298351323313471580> со ссылкой на ваше сообщение: \`\`\`https://discord.com/channels/${interaction.guildId}/${interaction.channelId}/${interaction.message.id}\`\`\`` });
                interaction.message.react('✅')
                
                interaction.deferUpdate();
            } else if (interaction.customId === 'rejectReportButton') {
                interaction.message.react('❌')
                interaction.deferUpdate();
            }
            interaction.message.edit({
                content: `Здесь будут роли`,
                embeds: [{
                    title: '📝 New Form Submission',
                    color: 0x00ff00, // Green color
                    timestamp: new Date().toISOString()
                }],
                components: [],
            })
        }
    },
};