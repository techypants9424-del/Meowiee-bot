import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { getEconomyData } from '../../utils/economy.js';
import {
    withErrorHandling,
    createError,
    ErrorTypes
} from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('hire')
        .setDescription('Hire someone to complete a job for MeowCoins')
        .addStringOption(option =>
            option
                .setName('reason')
                .setDescription('What help do you need?')
                .setRequired(true)
                .setMaxLength(500)
        )
        .addIntegerOption(option =>
            option
                .setName('coins')
                .setDescription('How many MeowCoins will you pay?')
                .setRequired(true)
                .setMinValue(1)
        ),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const guildId = interaction.guildId;
        const userId = interaction.user.id;

        if (!guildId) {
            throw createError(
                'Hire used outside a server',
                ErrorTypes.VALIDATION,
                'This command can only be used inside a server.'
            );
        }

        const reason = interaction.options.getString('reason');
        const coins = interaction.options.getInteger('coins');

        // Get GLOBAL MeowCoins
        const economy = await getEconomyData(
            client,
            guildId,
            userId
        );

        const balance = economy.wallet || 0;

        // Not enough coins
        if (balance < coins) {
            const embed = createEmbed({
                title: '🪙 Not Enough MeowCoins',
                description:
                    `You don't have enough MeowCoins to create this hire.\n\n` +
                    `🪙 Your balance: **${balance.toLocaleString()} MeowCoins**\n` +
                    `💰 Required: **${coins.toLocaleString()} MeowCoins**`,
                color: 'error',
            });

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [embed],
            });

            return;
        }

        // For now we only create the application.
        // Coins are NOT removed yet.
        //
        // Later:
        // 1. Reserve the coins
        // 2. Create the job
        // 3. Worker completes it
        // 4. Worker submits proof
        // 5. Moderator approves
        // 6. Coins go to worker

        const hireId = `${Date.now()}-${userId}`;

        const hireData = {
            id: hireId,
            employerId: userId,
            guildId,
            reason,
            coins,
            status: 'open',
            createdAt: Date.now(),
            workerId: null,
            proof: null,
        };

        // Save hire globally so the job system can access it later
        const hireKey = `hire:${hireId}`;

        await client.db.set(hireKey, hireData);

        const embed = createEmbed({
            title: '📋 Hire Created!',
            description:
                `Your hire request has been created successfully!\n\n` +
                `📝 **Job:** ${reason}\n` +
                `🪙 **Reward:** ${coins.toLocaleString()} MeowCoins\n` +
                `📌 **Status:** Open\n\n` +
                `Use **job** to browse available jobs.`,
            color: 'success',
        });

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [embed],
        });
    }, { command: 'hire' }),
};
