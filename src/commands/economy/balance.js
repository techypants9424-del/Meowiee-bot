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

        const data = await getEconomyData(
            client,
            guildId,
            targetUser.id
        );

        const wallet = data.wallet || 0;

        const embed = createEmbed({
            title: `🐱 ${targetUser.username}'s MeowCoins`,
            description: `Here is the current MeowCoins balance for ${targetUser.username}.`,
        })
            .addFields(
                {
                    name: '🐾 MeowCoins',
                    value: `**${wallet.toLocaleString()}**`,
                    inline: true,
                },
                {
                    name: '💰 Total',
                    value: `**${wallet.toLocaleString()} MeowCoins**`,
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
    }, { command: 'balance' }),
};
