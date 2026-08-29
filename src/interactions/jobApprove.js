import { PermissionFlagsBits } from 'discord.js';
import { createEmbed } from '../utils/embeds.js';
import { getEconomyData, removeMoney, addMoney } from '../utils/economy.js';
import { InteractionHelper } from '../utils/interactionHelper.js';

export default {
    id: 'jobApprove',

    async execute(interaction, client, args) {
        const hireId = args[0];

        if (!hireId) {
            return InteractionHelper.safeReply(interaction, {
                content: '❌ Invalid job ID.',
                ephemeral: true,
            });
        }

        // Moderator check
        if (
            !interaction.memberPermissions?.has(
                PermissionFlagsBits.ManageGuild
            )
        ) {
            return InteractionHelper.safeReply(interaction, {
                content: '❌ You need **Manage Server** permission to approve jobs.',
                ephemeral: true,
            });
        }

        await InteractionHelper.safeDefer(interaction);

        const hireKey = `hire:${hireId}`;
        const hire = await client.db.get(hireKey, null);

        if (!hire) {
            return InteractionHelper.safeEditReply(interaction, {
                content: '❌ This job no longer exists.',
            });
        }

        // Prevent approving twice
        if (hire.status === 'completed') {
            return InteractionHelper.safeEditReply(interaction, {
                content: '⚠️ This job has already been approved and paid.',
            });
        }

        if (hire.status !== 'accepted') {
            return InteractionHelper.safeEditReply(interaction, {
                content:
                    `❌ This job cannot be approved.\n` +
                    `Current status: **${hire.status}**`,
            });
        }

        if (!hire.workerId) {
            return InteractionHelper.safeEditReply(interaction, {
                content: '❌ This job does not have a worker.',
            });
        }

        const employerId = hire.employerId;
        const workerId = hire.workerId;
        const reward = Number(hire.coins);

        if (!Number.isFinite(reward) || reward <= 0) {
            return InteractionHelper.safeEditReply(interaction, {
                content: '❌ This job has an invalid reward.',
            });
        }

        /*
         * Check employer's GLOBAL MeowCoins.
         *
         * We check again before transferring because the economy
         * can change while the job is open.
         */
        const employerEconomy = await getEconomyData(
            client,
            hire.guildId,
            employerId
        );

        if ((employerEconomy.wallet || 0) < reward) {
            return InteractionHelper.safeEditReply(interaction, {
                content:
                    `❌ The employer no longer has enough MeowCoins to pay this job.\n\n` +
                    `Required: **${reward.toLocaleString()} MeowCoins**\n` +
                    `Available: **${(employerEconomy.wallet || 0).toLocaleString()} MeowCoins**`,
            });
        }

        /*
         * PAY WORKER
         *
         * Remove coins from employer
         * Add coins to worker
         */
        await removeMoney(
            client,
            hire.guildId,
            employerId,
            reward
        );

        await addMoney(
            client,
            hire.guildId,
            workerId,
            reward
        );

        // Mark job as completed
        hire.status = 'completed';
        hire.completedAt = Date.now();
        hire.approvedBy = interaction.user.id;
        hire.paidAmount = reward;

        await client.db.set(hireKey, hire);

        const embed = createEmbed({
            title: '✅ Job Approved!',
            description:
                `This job has been approved successfully!\n\n` +
                `👤 **Worker:** <@${workerId}>\n` +
                `💰 **Reward:** ${reward.toLocaleString()} MeowCoins\n` +
                `🛡️ **Approved by:** <@${interaction.user.id}>\n\n` +
                `The MeowCoins have been transferred to the worker.`,
            color: 'success',
        });

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [embed],
        });

        // Also announce in the job channel
        if (interaction.channel) {
            await interaction.channel.send({
                embeds: [
                    createEmbed({
                        title: '🎉 Job Completed!',
                        description:
                            `<@${workerId}> has been paid **${reward.toLocaleString()} MeowCoins**.\n\n` +
                            `Thank you for completing the job! 🐱🪙`,
                        color: 'success',
                    }),
                ],
            }).catch(() => {});
        }
    },
};
