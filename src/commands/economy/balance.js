import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { getEconomyData } from '../../utils/economy.js';
import { withErrorHandling, createError, ErrorTypes } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('balance')
        .setDescription("Check your or someone else's MeowCoins")
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('User to check balance for')
                .setRequired(false)
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
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

        const guildId = interaction.guildId;

        if (!guildId) {
            throw createError(
                'Balance used outside a server',
                ErrorTypes.VALIDATION,
                'This command can only be used inside a server.'
            );
        }

        const data = await getEconomyData(
            client,
            guildId,
            targetUser.id
        );

const meowCoins = data.wallet || 0;

const embed = createEmbed({
    title: `🐱 ${targetUser.username}'s MeowCoins`,
    description:
        `> 🪙 **${meowCoins.toLocaleString()} MeowCoins**\n\n` +
        `> 💬 Keep chatting\n\n` +
        `> 💼 Complete **work** tasks\n\n` +
        `> 🎁 Claim **daily** rewards`,
})
    .setFooter({
        text: `Requested by ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
    });

await InteractionHelper.safeEditReply(interaction, {
    embeds: [embed],
});
    }, { command: 'balance' }),
};
