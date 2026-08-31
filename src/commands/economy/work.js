import { SlashCommandBuilder } from 'discord.js';

import { createEmbed } from '../../utils/embeds.js';

import {
    getEconomyData,
    saveEconomyData,
} from '../../utils/economy.js';

import { createMeowieeGame } from '../../utils/meowieeWorkGame.js';

import {
    withErrorHandling,
    createError,
    ErrorTypes,
} from '../../utils/errorHandler.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';

const WORK_COOLDOWN = 60 * 60 * 1000; // 1 hour

// Normal work
const TASK_AMOUNT = 10;
const REWARD_MIN = 20;
const REWARD_MAX = 80;

export default {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Get a work task and earn MeowCoins'),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);

        if (!deferred) return;

        const guildId = interaction.guildId;
        const userId = interaction.user.id;

        if (!guildId) {
            throw createError(
                'Work used outside a server',
                ErrorTypes.VALIDATION,
                'This command can only be used inside a server.'
            );
        }

        const data = await getEconomyData(
            client,
            guildId,
            userId
        );

        const now = Date.now();

        const lastWork = data.lastWork || 0;

        const timeLeft =
            WORK_COOLDOWN - (now - lastWork);

        // ==========================================
        // COOLDOWN
        // ==========================================

        if (timeLeft > 0) {
            const minutes = Math.floor(
                timeLeft / (60 * 1000)
            );

            const seconds = Math.floor(
                (timeLeft % (60 * 1000)) / 1000
            );

            const embed = createEmbed({
                title: '🚫 No Available Task',
                description:
                    `There are no available work tasks right now.\n\n` +
                    `Come back in **${minutes}m ${seconds}s** to get another task!`,
            });

            await InteractionHelper.safeEditReply(
                interaction,
                {
                    embeds: [embed],
                    components: [],
                }
            );

            return;
        }

        // ==========================================
        // 50/50 WORK TYPE
        // ==========================================

        const isMiniGame = Math.random() < 0.5;

        // ==========================================
        // 🐱 MEOWIEE MINI-GAME
        // ==========================================

        if (isMiniGame) {
            const game = createMeowieeGame(now);

            data.workTask = game;
            data.lastWork = now;

            await saveEconomyData(
                client,
                guildId,
                userId,
                data
            );

            const destination = game.destination;

            const embed = createEmbed({
                title: '🐱 Meowiee Work!',
                description:
                    `Meowiee needs your help!\n\n` +

                    `📍 **Take Meowiee to:** ` +
                    `${destination.emoji} **${destination.name}**\n\n` +

                    `💰 **Reward:** ` +
                    `**${game.reward.toLocaleString()} MeowCoins**\n\n` +

                    `⏰ **Time Limit:** **5 minutes**\n\n` +

                    `🐾 Use the movement buttons below to guide Meowiee!\n\n` +

                    `⚠️ Wrong shop → Meowiee steals **30 MeowCoins**!\n` +

                    `💨 Time runs out → Meowiee runs away with **25 MeowCoins**!`,
            }).setFooter({
                text: 'Keep Meowiee under control! 🐾',
            });

            await InteractionHelper.safeEditReply(
                interaction,
                {
                    embeds: [embed],
                    components: createMovementButtons(),
                }
            );

            return;
        }

        // ==========================================
        // 💼 NORMAL 10-MESSAGE WORK
        // ==========================================

        const reward =
            Math.floor(
                Math.random() *
                (REWARD_MAX - REWARD_MIN + 1)
            ) + REWARD_MIN;

        data.workTask = {
            type: 'messages',
            required: TASK_AMOUNT,
            progress: 0,
            reward,
            startedAt: now,
            expiresAt: now + (30 * 60 * 1000),
        };

        data.lastWork = now;

        await saveEconomyData(
            client,
            guildId,
            userId,
            data
        );

        const embed = createEmbed({
            title: '🐱 New Work Task!',
            description:
                `Your shift has started!\n\n` +

                `💼 **Task:** Send **${TASK_AMOUNT} messages** in this server.\n` +

                `📊 **Progress:** **0/${TASK_AMOUNT}**\n` +

                `💰 **Reward:** ` +
                `**${reward.toLocaleString()} MeowCoins**\n\n` +

                `⏰ You have **30 minutes** to complete your shift!`,
        }).setFooter({
            text: 'Get chatting and complete your shift! 🐾',
        });

        await InteractionHelper.safeEditReply(
            interaction,
            {
                embeds: [embed],
                components: [],
            }
        );
    }, { command: 'work' }),
};


// ==========================================
// 🐾 MEOWIEE MOVEMENT BUTTONS
// ==========================================

function createMovementButtons() {
    return [
        {
            type: 1,
            components: [
                {
                    type: 2,
                    custom_id: 'meowiee_move_up',
                    label: '⬆️',
                    style: 1,
                },
            ],
        },
        {
            type: 1,
            components: [
                {
                    type: 2,
                    custom_id: 'meowiee_move_left',
                    label: '⬅️',
                    style: 1,
                },
                {
                    type: 2,
                    custom_id: 'meowiee_move_down',
                    label: '⬇️',
                    style: 1,
                },
                {
                    type: 2,
                    custom_id: 'meowiee_move_right',
                    label: '➡️',
                    style: 1,
                },
            ],
        },
    ];
}
