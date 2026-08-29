import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { getEconomyData, saveEconomyData } from '../../utils/economy.js';
import {
    withErrorHandling,
    createError,
    ErrorTypes
} from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const COOLDOWN = 30 * 60 * 1000; // 30 minutes
const SUCCESS_CHANCE = 0.60; // 60%
const FAILED_COST = 25;

export default {
    data: new SlashCommandBuilder()
        .setName('rob')
        .setDescription('Try to rob another user of their MeowCoins')
        .addUserOption(option =>
            option
                .setName('user')
                .setDescription('User you want to rob')
                .setRequired(true)
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const guildId = interaction.guildId;
        const userId = interaction.user.id;

        if (!guildId) {
            throw createError(
                'Rob used outside a server',
                ErrorTypes.VALIDATION,
                'This command can only be used inside a server.'
            );
        }

        const targetUser = interaction.options.getUser('user');

        if (!targetUser) {
            throw createError(
                'No rob target',
                ErrorTypes.VALIDATION,
                'You need to choose someone to rob.'
            );
        }

        if (targetUser.bot) {
            throw createError(
                'Bot user targeted',
                ErrorTypes.VALIDATION,
                "You can't rob bots."
            );
        }

        if (targetUser.id === userId) {
            throw createError(
                'Self rob attempt',
                ErrorTypes.VALIDATION,
                "You can't rob yourself."
            );
        }

        // Get robber and target economy data
        const robberData = await getEconomyData(
            client,
            guildId,
            userId
        );

        const targetData = await getEconomyData(
            client,
            guildId,
            targetUser.id
        );

        const now = Date.now();
        const lastRob = robberData.lastRob || 0;
        const timeLeft = COOLDOWN - (now - lastRob);

        // Cooldown
        if (timeLeft > 0) {
            const minutes = Math.ceil(timeLeft / (60 * 1000));

            const embed = createEmbed({
                title: '⏰ Rob Cooldown',
                description:
                    `You've already tried to rob someone recently!\n\n` +
                    `Come back in **${minutes} minute${minutes === 1 ? '' : 's'}**.`,
            });

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [embed],
            });

            return;
        }

        const targetCoins = targetData.wallet || 0;
        const robberCoins = robberData.wallet || 0;

        // Target has nothing
        if (targetCoins <= 0) {
            const embed = createEmbed({
                title: '🪙 Nothing to Rob',
                description:
                    `**${targetUser.username}** doesn't have any MeowCoins to rob!`,
            });

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [embed],
            });

            return;
        }

        // Save rob attempt time
        robberData.lastRob = now;

        // Roll success
        const successful = Math.random() < SUCCESS_CHANCE;

        if (!successful) {
            const lostCoins = Math.min(FAILED_COST, robberCoins);

            robberData.wallet = Math.max(
                0,
                robberCoins - lostCoins
            );

            await saveEconomyData(
                client,
                guildId,
                userId,
                robberData
            );

            const embed = createEmbed({
                title: '🚨 Rob Failed!',
                description:
                    `You tried to rob **${targetUser.username}**...\n\n` +
                    `💨 You got caught!\n` +
                    `🪙 You lost **${lostCoins.toLocaleString()} MeowCoins**.`,
            });

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [embed],
            });

            return;
        }

        // Steal between 10% and 25%
        const stealPercent =
            Math.floor(Math.random() * 16) + 10;

        let stolenCoins = Math.floor(
            targetCoins * (stealPercent / 100)
        );

        // Always steal at least 1 if target has coins
        stolenCoins = Math.max(1, stolenCoins);

        // Never steal more than target owns
        stolenCoins = Math.min(
            stolenCoins,
            targetCoins
        );

        robberData.wallet = robberCoins + stolenCoins;
        targetData.wallet = targetCoins - stolenCoins;

        await saveEconomyData(
            client,
            guildId,
            userId,
            robberData
        );

        await saveEconomyData(
            client,
            guildId,
            targetUser.id,
            targetData
        );

        const embed = createEmbed({
            title: '😼 Successful Robbery!',
            description:
                `You successfully robbed **${targetUser.username}**!\n\n` +
                `🪙 **+${stolenCoins.toLocaleString()} MeowCoins**\n` +
                `💰 You now have **${robberData.wallet.toLocaleString()} MeowCoins**.`,
        });

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [embed],
        });
    }, { command: 'rob' }),
};
