import { SlashCommandBuilder } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { getEconomyData, removeMoney } from '../../utils/economy.js';
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

        // Check balance
        if (balance < coins) {
            const embed = createEmbed({
                title: '🪙 Not Enough MeowCoins',
                description:
                    `You don't have enough MeowCoins to create this hire.\n\n` +
                    `🪙 **Your balance:** ${balance.toLocaleString()} MeowCoins\n` +
                    `💰 **Required:** ${coins.toLocaleString()} MeowCoins`,
                color: 'error',
            });

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [embed],
            });

            return;
        }

        /*
         * CREATE UNIQUE HIRE ID
         */
        const hireId = `${Date.now()}-${userId}`;

        /*
         * ESCROW THE MONEY
         *
         * The employer's coins are removed immediately.
         * They will stay locked inside the hire until:
         *
         * APPROVED  -> worker receives coins
         * CANCELLED -> employer gets coins back
         */
        await removeMoney(
            client,
            guildId,
            userId,
            coins
        );

        const hireData = {
            id: hireId,

            // Person who created the job
            employerId: userId,

            // Server where the job was created
            guildId,

            // Job description
            reason,

            // Locked reward
            coins,

            // Job state
            status: 'open',

            // Worker who accepts it
            workerId: null,

            // Proof / completion information
            proof: null,

            // Channel created after accepting
            channelId: null,

            createdAt: Date.now(),
            acceptedAt: null,
            completedAt: null,

            // Moderator who approved it
            approvedBy: null,
        };

        /*
         * Save hire globally.
         */
        const hireKey = `hire:${hireId}`;

        try {
            await client.db.set(hireKey, hireData);
        } catch (error) {
            /*
             * VERY IMPORTANT:
             *
             * If saving the hire fails after removing the coins,
             * refund the employer so their coins aren't lost.
             */
            await import('../../utils/economy.js')
                .then(({ addMoney }) =>
                    addMoney(
                        client,
                        guildId,
                        userId,
                        coins
                    )
                )
                .catch(() => {});

            throw error;
        }

        // Get new balance
        const updatedEconomy = await getEconomyData(
            client,
            guildId,
            userId
        );

        const newBalance = updatedEconomy.wallet || 0;

        const embed = createEmbed({
            title: '📋 Hire Created!',
            description:
                `Your hire request has been created successfully!\n\n` +
                `📝 **Job:** ${reason}\n` +
                `🪙 **Reward:** ${coins.toLocaleString()} MeowCoins\n` +
                `🔒 **Coins:** Locked in escrow\n` +
                `📌 **Status:** Open\n\n` +
                `Your reward will be given to the person who completes the job and gets it approved by a moderator.\n\n` +
                `💰 **Remaining balance:** ${newBalance.toLocaleString()} MeowCoins\n\n` +
                `Use **job** to browse available jobs.`,
            color: 'success',
        });

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [embed],
        });
    }, { command: 'hire' }),
};
