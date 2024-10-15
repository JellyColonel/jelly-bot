const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Изменить ранг игрока')
        .addUserOption(option =>
            option
                .setName('member')
                .setDescription('Участник, которого повышают')
                .setRequired(true))
        .addIntegerOption(option =>
            option
                .setName('current rank')
                .setDescription('Текущий ранг участника')
                .setRequired(true))
        .addIntegerOption(option =>
            option
                .setName('new rank')
                .setDescription('Новый ранг')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Причина изменения ранга')
                .setRequired(true))
        .addIntegerOption(option =>
            option
                .setName('Static ID')
                .setDescription('Static ID участника которому изменяют ранг')
                .setRequired(true)),

    async execute(interaction) {
        const authorDisplayName = interaction.user.displayName;
        const memberDisplayName = interaction.options.getUser('member').displayName;
        const currentRank = interaction.options.getInteger('current rank');
        const newRank = interaction.options.getInteger('new rank');
        const staticId = interaction.options.getInteger('Static ID');
        const action = currentRank < newRank ? `Повышен(-а) с ${currentRank} на ${newRank} ранг` : `Понижен(-а) с ${currentRank} на ${newRank} ранг`;

        const rankEmbed = new EmbedBuilder()
            .setColor('0x0099FF')
            .setTitle('Кадровый аудит • Изменение ранга')
            .addFields(
                { name: 'Обновил(-а) ранг:', value: authorDisplayName },
                { name: '\u200B', value: '\u200B' },
                { name: 'Обновлен(-а)', value: memberDisplayName },
                { name: '\u200B', value: '\u200B' },
                { name: 'Номер паспорта', value: staticId, inline: true },
                { name: 'Действие', value: action, inline: true }
            )
            .setTimestamp()
            .setFooter({ text: 'HR Audit by Hennesy' })

        await interaction.repy({ embdes: [rankEmbed] });
    }
}