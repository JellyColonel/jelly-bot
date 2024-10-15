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
                .setName('currentrank')
                .setDescription('Текущий ранг участника')
                .setRequired(true))
        .addIntegerOption(option =>
            option
                .setName('newrank')
                .setDescription('Новый ранг')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('Причина изменения ранга')
                .setRequired(true))
        .addStringOption(option =>
            option
                .setName('staticid')
                .setDescription('Static ID участника которому изменяют ранг')
                .setRequired(true)),

    async execute(interaction) {
        const author = interaction.user
        const affectedUser = interaction.options.getUser('member')
        const currentRank = interaction.options.getInteger('currentrank');
        const newRank = interaction.options.getInteger('newrank');
        const staticId = interaction.options.getString('staticid');
        const action = currentRank < newRank ? `Повышен(-а) с ${currentRank} на ${newRank} ранг` : `Понижен(-а) с ${currentRank} на ${newRank} ранг`;
        const reason = interaction.options.getString('reason');

        const rankEmbed = new EmbedBuilder()
            .setColor(39423)
            .setTitle('Кадровый аудит • Изменение ранга')
            .addFields(
                { name: 'Обновил(-а) ранг', value: `<@${author.id}> | ${author.displayName} | ||${author.id}||` },
                { name: 'Обновлен(-а)', value: `<@${affectedUser.id}> | ${affectedUser.displayName} | ||${affectedUser.id}||` },
                { name: 'Номер паспорта', value: staticId, inline: true },
                { name: '\u200B', value: '\u200B', inline: true },
                { name: 'Действие', value: action, inline: true },
                { name: 'Причина', value: reason }
            )
            .setTimestamp()
            .setFooter({ text: 'HR Audit by Hennessy' });

        await interaction.reply({ embeds: [rankEmbed] });
    }
}