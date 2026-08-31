import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { getEconomyData, saveEconomyData } from '../../utils/economy.js';
import { createMeowieeGame } from '../../utils/meowieeWorkGame.js';
import {
    withErrorHandling,
    createError,
    ErrorTypes
} from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const WORK_COOLDOWN = 60 * 60 * 1000; // 1 hour
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

        const data = await getEconomyData(client, guildId, userId);

        const now = Date.now();
        const lastWork = data.lastWork || 0;
        const timeLeft = WORK_COOLDOWN - (now - lastWork);

        // Cooldown
        if (timeLeft > 0) {
            const minutes = Math.floor(timeLeft / (60 * 1000));
            const seconds = Math.floor(
                (timeLeft % (60 * 1000)) / 1000
            );

            const embed = createEmbed({
                title: '⏰ No Available Task',
                description:
                    `There are no available work tasks right now.\n\n` +
                    `Come back in **${minutes}m ${seconds}s** to get another task.`,
            });

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [embed],
            });

            return;
        }

        // Random reward for normal 10-message work
        const reward =
            Math.floor(Math.random() * (REWARD_MAX - REWARD_MIN + 1)) +
            REWARD_MIN;

        // 50/50 chance:
        // true  = Meowiee mini-game
        // false = normal 10-message work
        const isMiniGame = Math.random() < 0.5;

        if (isMiniGame) {
            // 🐱 Meowiee mini-game
            data.workTask = createMeowieeGame(now);
        } else {
            // 💼 Normal 10-message work
            data.workTask = {
                type: 'messages',
                required: TASK_AMOUNT,
                progress: 0,
                reward,
                startedAt: now,
                expiresAt: now + (30 * 60 * 1000),
            };
        }

        data.lastWork = now;

        await saveEconomyData(client, guildId, userId, data);

        let embed;

        // 🐱 Meowiee mini-game embed
        if (data.workTask.type === 'meowiee_game') {
            const destination = data.workTask.destination;

            embed = createEmbed({
                title: '🐱 Meowiee Work!',
                description:
                    `Meowiee has a job for you!\n\n` +
                    `📍 **Take Meowiee to:** ${destination.emoji} **${destination.name}**\n` +
                    `💰 **Reward:** **${data.workTask.reward} MeowCoins**\n\n` +
                    `⏰ You have **5 minutes** to complete the job!\n\n` +
                    `🐾 Guide Meowiee to the correct shop before she runs away!`,
            }).setFooter({
                text: 'Don\'t lose control of Meowiee! 🐾',
            });

        // 💼 Normal work embed
        } else {
            embed = createEmbed({
                title: '🐱 New Work Task!',
                description:
                    `Your shift has started!\n\n` +
                    `💼 **Task:** Send **${TASK_AMOUNT} messages** in this server.\n` +
                    `📊 **Progress:** **0/${TASK_AMOUNT}**\n` +
                    `💰 **Reward:** **${reward.toLocaleString()} MeowCoins**\n\n` +
                    `⏰ You have **30 minutes** to complete your shift!`,
            }).setFooter({
                text: 'Get chatting and complete your shift! 🐾',
            });
        }

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [embed],
        });
    }, { command: 'work' }),
};
