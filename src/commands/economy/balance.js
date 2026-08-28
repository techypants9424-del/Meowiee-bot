import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { getEconomyData, getMaxBankCapacity } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription("Check your or someone else's balance")
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('User to check balance for')
                .setRequired(false)
        ),

    async execute(interaction, config, client) {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const targetUser =
            interaction.options.getUser('user') || interaction.user;

        if (targetUser.bot) {
            throw createError(
                'Bot user queried for balance',
                ErrorTypes.VALIDATION,
                "Bots don't have an economy balance."
            );
        }

        // IMPORTANT: this makes the economy server-specific
        const guildId = interaction.guildId;

        const data = await getEconomyData(
            client,
            guildId,
            targetUser.id
        );

        const wallet = data.wallet || 0;
        const bank = data.bank || 0;
        const maxBank = getMaxBankCapacity(data);

        const embed = createEmbed({
            title: `💰 ${targetUser.username}'s Balance`,
            description: `Here is the current balance for ${targetUser.username}.`,
        })
            .addFields(
                {
                    name: '💵 Cash',
                    value: `$${wallet.toLocaleString()}`,
                    inline: true,
                },
                {
                    name: '🏦 Bank',
                    value: `$${bank.toLocaleString()} / $${maxBank.toLocaleString()}`,
                    inline: true,
                },
                {
                    name: '💰 Total',
                    value: `$${(wallet + bank).toLocaleString()}`,
                    inline: true,
                }
            )
            .setFooter({
                text: `Requested by ${interaction.user.tag}`,
                iconURL: interaction.user.displayAvatarURL(),
            });

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [embed],
        });
    },
};
