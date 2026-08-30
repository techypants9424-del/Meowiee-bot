import { PermissionFlagsBits } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { addMoney } from '../../utils/economy.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    name: 'job_approve',

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
                content:
                    '❌ You need **Manage Server** permission to approve jobs.',
                ephemeral: true,
            });
        }

        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        // Get hire
        const hireKey = `hire:${hireId}`;
        const hire = await client.db.get(hireKey, null);

        if (!hire) {
            return InteractionHelper.safeEditReply(interaction, {
                content: '❌ This job no longer exists.',
            });
        }

        // Already completed
        if (hire.status === 'completed') {
            return InteractionHelper.safeEditReply(interaction, {
                content:
                    '⚠️ This job has already been approved and paid.',
            });
        }

        // Must be accepted first
  if (hire.status !== 'in_progress') {
            return InteractionHelper.safeEditReply(interaction, {
                content:
                    `❌ This job cannot be approved.\n` +
                    `Current status: **${hire.status}**`,
            });
        }

        // Make sure there is a worker
        if (!hire.workerId) {
            return InteractionHelper.safeEditReply(interaction, {
                content: '❌ This job does not have a worker assigned.',
            });
        }

        const reward = Number(hire.coins);

        if (!Number.isFinite(reward) || reward <= 0) {
            return InteractionHelper.safeEditReply(interaction, {
                content: '❌ This job has an invalid reward.',
            });
        }

        /*
         * ESCROW PAYMENT
         *
         * The employer's coins were already removed
         * when /hire was used.
         *
         * So DO NOT remove money here.
         *
         * We only give the locked reward to the worker.
         */
        await addMoney(
            client,
            hire.guildId,
            hire.workerId,
            reward
        );

        // Mark job as completed
        hire.status = 'completed';
        hire.completedAt = Date.now();
        hire.approvedBy = interaction.user.id;
        hire.paidAmount = reward;

        await client.db.set(hireKey, hire);
        // Automatically delete the job channel after approval
if (hire.channelId) {
    const jobChannel = await client.channels
        .fetch(hire.channelId)
        .catch(() => null);

    if (jobChannel) {
        await jobChannel.delete('Job completed and approved').catch(() => {});
    }
}

        const embed = createEmbed({
            title: '✅ Job Approved!',
            description:
                `This job has been approved successfully!\n\n` +
                `👤 **Worker:** <@${hire.workerId}>\n` +
                `🪙 **Reward:** ${reward.toLocaleString()} MeowCoins\n` +
                `🛡️ **Approved by:** <@${interaction.user.id}>\n\n` +
                `The escrowed MeowCoins have been transferred to the worker. 🐱`,
            color: 'success',
        });

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [embed],
        });

    },
};
