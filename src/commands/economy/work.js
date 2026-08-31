import { SlashCommandBuilder } from 'discord.js';

import { createEmbed } from '../../utils/embeds.js';

import {
    getEconomyData,
    saveEconomyData,
} from '../../utils/economy.js';

import {
    withErrorHandling,
    createError,
    ErrorTypes,
} from '../../utils/errorHandler.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';

const WORK_COOLDOWN = 60 * 60 * 1000; // 1 hour

// Random number of messages required
const TASK_MIN = 10;
const TASK_MAX = 25;

// Reward
const REWARD_MIN = 20;
const REWARD_MAX = 80;

// Time to complete the task
const WORK_TIME = 30 * 60 * 1000; // 30 minutes

export default {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('Get a work task and earn MeowCoins'),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);

        if (!deferred) return;

        const guildId = interaction.guildId;
        const userId = interaction.user.id;

        // ==========================================
        // VALIDATION
        // ==========================================

        if (!guildId) {
            throw createError(
                'Work used outside a server',
                ErrorTypes.VALIDATION,
                'This command can only be used inside a server.'
            );
        }

        // ==========================================
        // GET ECONOMY DATA
        // ==========================================

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
        // RANDOM TASK AMOUNT
        // ==========================================

        const required =
            Math.floor(
                Math.random() *
                (TASK_MAX - TASK_MIN + 1)
            ) + TASK_MIN;

        // ==========================================
        // RANDOM REWARD
        // ==========================================

        const reward =
            Math.floor(
                Math.random() *
                (REWARD_MAX - REWARD_MIN + 1)
            ) + REWARD_MIN;

        // ==========================================
        // CREATE WORK TASK
        // ==========================================

        data.workTask = {
            type: 'messages',

            // Random amount between 10 and 25
            required,

            // Current valid-message progress
            progress: 0,

            // Reward
            reward,

            // Timing
            startedAt: now,
            expiresAt: now + WORK_TIME,

            // User who started the task
            userId,

            // Message requirement
            minLetters: 4,
            maxLetters: 5,
        };

        // Start 1-hour cooldown
        data.lastWork = now;

        // ==========================================
        // SAVE DATA
        // ==========================================

        await saveEconomyData(
            client,
            guildId,
            userId,
            data
        );

        // ==========================================
        // WORK EMBED
        // ==========================================

        const embed = createEmbed({
            title: '🐱 New Work Task!',
            description:
                `Your shift has started!\n\n` +

                `💼 **Task:** Send **${required} messages** in this server.\n` +

                `📝 **Requirement:** Each message must contain **4–5 letters**.\n\n` +

                `💰 **Reward:** **${reward.toLocaleString()} MeowCoins**\n\n` +

                `⏰ **Time Limit:** **30 minutes**\n\n` +

                `📊 Your progress will appear after your name when you send a valid message!`,
        }).setFooter({
            text: 'Make sure every message has 4–5 letters! 🐾',
        });

        // ==========================================
        // SEND TASK
        // ==========================================

        await InteractionHelper.safeEditReply(
            interaction,
            {
                embeds: [embed],
                components: [],
            }
        );
    }, { command: 'work' }),
};
