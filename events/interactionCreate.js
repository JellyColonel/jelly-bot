const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');

module.exports = {
    name: Events.InteractionCreate,
    async execute(interaction) {
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (error) {
                console.error(error);
                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
                } else {
                    await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
                }
            }
        } else if (interaction.isStringSelectMenu()) {
            console.log(interaction);
            const rankModal = new ModalBuilder()
                .setCustomId('rankReportModal')
                .setTitle("Отчёт на повышение | FD")

            // Create the text input components
            const nameAndStaticInput = new TextInputBuilder()
                .setCustomId('nameAndStaticInput')
                // The label is the prompt the user sees for this input
                .setLabel('Ваши имя и Static ID')
                // Placeholder text
                .setPlaceholder('Формат: Имя Фамилия | Static ID')
                // Short means only a single line of text
                .setStyle(TextInputStyle.Short)
                // Is input required
                .setRequired(true);

            const mainActivitiesReport = new TextInputBuilder()
                .setCustomId('mainActivitiesReport')
                .setLabel("Пожары и гос. проверки")
                .setPlaceholder('Отчёт о пожарах и пожарных проверках')
                .setStyle(TextInputStyle.Paragraph)
                .setRequired(true);

            // Add action row
            // One action row can hold only one text input
            const firstActionRow = new ActionRowBuilder().addComponents(nameAndStaticInput);
            const secondActionRow = new ActionRowBuilder().addComponents(mainActivitiesReport);

            // Add inputs to the modal
            rankModal.addComponents(firstActionRow, secondActionRow);

            // Show the modal to the user
            await interaction.showModal(rankModal);
        } else if (interaction.isModalSubmit()) {
            const nameAndStatic = interaction.fields.getTextInputValue('nameAndStaticInput');
            const mainActivitiesReport = interaction.fields.getTextInputValue('mainActivitiesReport')

            const rankEmbed = new EmbedBuilder()
                .setColor(39423)
                .setTitle('Кадровый аудит • Изменение ранга')
                .addFields(
                    { name: 'Имя Фамилия | Static ID', value: nameAndStatic },
                    { name: 'Отправленная информация', value: mainActivitiesReport },
                )
                .setTimestamp()
                .setFooter({ text: 'HR Audit by Hennessy' });

            const acceptButton = new ButtonBuilder()
                .setCustomId('acceptReport')
                .setLabel('Принять')
                .setStyle(ButtonStyle.Success)
                .setEmoji('👍');

            const rejectButton = new ButtonBuilder()
                .setCustomId("rejectReport")
                .setLabel('Отклонить')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('👎');

            const row = new ActionRowBuilder()
                .addComponents(acceptButton, rejectButton);

            const channel = interaction.client.channels.cache.get('1297185384148766741')

            await channel.send({
                embeds: [rankEmbed],
                components: [row]
            });
            interaction.deferUpdate()
        } else if (interaction.isButton()) {
            if (interaction.customId === 'acceptReport') {
                interaction.deferUpdate();
            } else if (interaction.customId === 'rejectReport') {

            } else {
                interaction.reply({
                    content: 'Эта кнопка пока не работает',
                    ephemeral: true
                })
            }
        }
    },
};