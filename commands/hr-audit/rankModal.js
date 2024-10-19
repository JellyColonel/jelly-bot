const { ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank_modal')
        .setDescription('Вызов selectMenu'),

    async execute(interaction) {
        const select = new StringSelectMenuBuilder()
            .setCustomId('rankUpMenu')
            .setPlaceholder('Make a selection!')
            .addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel('Старший медрабоник [5] → Ординатор [6]')
                    .setValue('5_to_6')
                    .setDescription('Повышение с 5-го на 6-ой ранг')
                    .setEmoji('5️⃣'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Ординатор [6] → Врач общей практики [7]')
                    .setValue('6_to_7')
                    .setDescription('Повышение с 6-го на 7-ой ранг')
                    .setEmoji('6️⃣'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Врач общей практики [7] → Врач-ассистен [8]')
                    .setValue('7_to_8')
                    .setDescription('Повышение с 7-го на 8-ой ранг')
                    .setEmoji('7️⃣'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('Врач-ассистен [8] → Врач-специалист [9]')
                    .setValue('8_to_9')
                    .setDescription('Повышение с 8-го на 9-ой ранг')
                    .setEmoji('8️⃣'),
            );

        const row = new ActionRowBuilder()
            .addComponents(select);

        await interaction.reply({
            content: "Choose your starter!",
            components: [row],
        });
    },
};