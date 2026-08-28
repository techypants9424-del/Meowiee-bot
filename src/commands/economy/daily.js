import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { getEconomyData, saveEconomyData } from '../../utils/economy.js';
import {
    withErrorHandling,
    createError,
    ErrorTypes
} from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours

export default {
    data: new SlashCommandBuilder()
        .setName('daily')
        .setDescription('Claim your daily MeowCoins'),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const guildId = interaction.guildId;
        const userId = interaction.user.id;

        // Make sure command is used inside a server
        if (!guildId) {
            throw createError(
                'Daily used outside a server',
                ErrorTypes.VALIDATION,
                'This command can only be used inside a server.'
            );
        }

        // Get user's economy data
        const data = await getEconomyData(
            client,
            guildId,
            userId
        );

        const now = Date.now();
        const lastDaily = data.lastDaily || 0;
        const timeLeft = COOLDOWN - (now - lastDaily);

        // Daily is still on cooldown
        if (timeLeft > 0) {
            const hours = Math.floor(
                timeLeft / (60 * 60 * 1000)
            );

            const minutes = Math.floor(
                (timeLeft % (60 * 60 * 1000)) / (60 * 1000)
            );

            const embed = createEmbed({
                title: '⏰ Daily Already Claimed',
                description:
                    `You've already claimed your daily reward!\n\n` +
                    `Come back in **${hours}h ${minutes}m**.`,
            });

            await InteractionHelper.safeEditReply(
                interaction,
                {
                    embeds: [embed],
                }
            );

            return;
        }

        // Random reward: 100 - 500 MeowCoins
        const reward =
            Math.floor(Math.random() * 401) + 100;

        // Add reward to wallet
        data.wallet = (data.wallet || 0) + reward;

        // Save claim time
        data.lastDaily = now;

        // Save updated economy data
        await saveEconomyData(
            client,
            guildId,
            userId,
            data
        );

        // Success embed
        const embed = createEmbed({
            title: '🎁 Daily Reward!',
            description:
                `You claimed your daily reward!\n\n` +
                `💰 **+${reward.toLocaleString()} MeowCoins**\n\n` +
                `Your new wallet balance is **$${data.wallet.toLocaleString()}**.`,
        }).setFooter({
            text: 'Come back tomorrow for another reward!',
        });

        await InteractionHelper.safeEditReply(
            interaction,
            {
                embeds: [embed],
            }
        );
    }, { command: 'daily' }),
};
