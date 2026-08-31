import {
    SlashCommandBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from 'discord.js';

import { createEmbed } from '../../utils/embeds.js';

import {
    getEconomyData,
    saveEconomyData,
} from '../../utils/economy.js';

import {
    createMeowieeGame,
    createMeowieeMap,
} from '../../utils/meowieeWorkGame.js';

import {
    withErrorHandling,
    createError,
    ErrorTypes,
} from '../../utils/errorHandler.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';

const WORK_COOLDOWN = 60 * 60 * 1000;

// Normal work
const TASK_AMOUNT = 10;
const REWARD_MIN = 20;
const REWARD_MAX = 80;

// ==========================================
// MOVEMENT BUTTONS
// ==========================================

function createMovementButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('meowiee_move_up')
                .setLabel('⬆️')
                .setStyle(ButtonStyle.Primary)
        ),

        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('meowiee_move_left')
                .setLabel('⬅️')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId('meowiee_move_down')
                .setLabel('⬇️')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId('meowiee_move_right')
                .setLabel('➡️')
                .setStyle(ButtonStyle.Primary)
        ),
    ];
}

// ==========================================
// COMMAND
// ==========================================

export default {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription(
            'Get a work task and earn MeowCoins'
        ),

    execute: withErrorHandling(
        async (
            interaction,
            config,
            client
        ) => {

            const deferred =
                await InteractionHelper.safeDefer(
                    interaction
                );

            if (!deferred) return;

            const guildId =
                interaction.guildId;

            const userId =
                interaction.user.id;

            if (!guildId) {
                throw createError(
                    'Work used outside a server',
                    ErrorTypes.VALIDATION,
                    'This command can only be used inside a server.'
                );
            }

            const data =
                await getEconomyData(
                    client,
                    guildId,
                    userId
                );

            const now = Date.now();

            const lastWork =
                data.lastWork || 0;

            const timeLeft =
                WORK_COOLDOWN -
                (now - lastWork);

            // ==================================
            // COOLDOWN
            // ==================================

            if (timeLeft > 0) {

                const minutes =
                    Math.floor(
                        timeLeft /
                        (60 * 1000)
                    );

                const seconds =
                    Math.floor(
                        (
                            timeLeft %
                            (60 * 1000)
                        ) / 1000
                    );

                const embed =
                    createEmbed({
                        title:
                            '🚫 No Available Task',

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

            // ==================================
            // 50/50
            // ==================================

            const isMiniGame =
                Math.random() < 0.5;

            // ==================================
            // MEOWIEE GAME
            // ==================================

            if (isMiniGame) {

                const game =
                    createMeowieeGame(now);

                data.workTask = game;

                data.lastWork = now;

                await saveEconomyData(
                    client,
                    guildId,
                    userId,
                    data
                );

                const destination =
                    game.destination;

                const map =
                    createMeowieeMap(
                        game.position
                    );

                const embed =
                    createEmbed({
                        title:
                            '🐱 Meowiee Work!',

                        description:
                            `Meowiee needs your help!\n\n` +

                            `🎯 **Take Meowiee to:** ` +
                            `${destination.emoji} **${destination.name}**\n\n` +

                            `💰 **Reward:** ` +
                            `**${game.reward.toLocaleString()} MeowCoins**\n\n` +

                            `⏰ **Time Limit:** **5 minutes**\n\n` +

                            `🗺️ **Meowiee City:**\n` +
                            '```' +
                            `\n${map}\n` +
                            '```\n' +

                            `🐾 Guide Meowiee using the buttons below!\n\n` +

                            `⚠️ Wrong shop → **-30 MeowCoins**\n` +
                            `💨 Timeout → **-25 MeowCoins**`,
                    }).setFooter({
                        text:
                            '🐱 Get Meowiee to the correct shop!',
                    });

                await InteractionHelper.safeEditReply(
                    interaction,
                    {
                        embeds: [embed],
                        components:
                            createMovementButtons(),
                    }
                );

                return;
            }

            // ==================================
            // NORMAL WORK
            // ==================================

            const reward =
                Math.floor(
                    Math.random() *
                    (
                        REWARD_MAX -
                        REWARD_MIN +
                        1
                    )
                ) + REWARD_MIN;

            data.workTask = {
                type: 'messages',
                required: TASK_AMOUNT,
                progress: 0,
                reward,
                startedAt: now,
                expiresAt:
                    now +
                    (30 * 60 * 1000),
            };

            data.lastWork = now;

            await saveEconomyData(
                client,
                guildId,
                userId,
                data
            );

            const embed =
                createEmbed({
                    title:
                        '🐱 New Work Task!',

                    description:
                        `Your shift has started!\n\n` +

                        `💼 **Task:** Send **${TASK_AMOUNT} messages** in this server.\n` +

                        `📊 **Progress:** **0/${TASK_AMOUNT}**\n` +

                        `💰 **Reward:** ` +
                        `**${reward.toLocaleString()} MeowCoins**\n\n` +

                        `⏰ You have **30 minutes** to complete your shift!`,
                }).setFooter({
                    text:
                        'Get chatting and complete your shift! 🐾',
                });

            await InteractionHelper.safeEditReply(
                interaction,
                {
                    embeds: [embed],
                    components: [],
                }
            );
        },
        {
            command: 'work',
        }
    ),
};
