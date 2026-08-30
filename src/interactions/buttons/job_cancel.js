import { PermissionFlagsBits } from 'discord.js';
import { createEmbed } from '../../utils/embeds.js';
import { addMoney } from '../../utils/economy.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    name: 'job_cancel',

    async execute(interaction, client, args) {
        const hireId = args?.[0];

        if (!hireId) {
            await InteractionHelper.safeReply(interaction, {
                content: '❌ Invalid job.',
                ephemeral: true,
            });
            return;
        }

        const hireKey = `hire:${hireId}`;
        const hire = await client.db.get(hireKey, null);

        if (!hire) {
            await InteractionHelper.safeReply(interaction, {
                content: '❌ This job no longer exists.',
                ephemeral: true,
            });
            return;
        }

        // Only the employer or a moderator can cancel
        const isEmployer = hire.employerId === interaction.user.id;
        const isModerator = interaction.memberPermissions?.has(
            PermissionFlagsBits.ManageGuild
        );

        if (!isEmployer && !isModerator) {
            await InteractionHelper.safeReply(interaction, {
                content: '❌ Only the job creator or a moderator can cancel this job.',
                ephemeral: true,
            });
            return;
        }

        if (hire.status === 'completed') {
            await InteractionHelper.safeReply(interaction, {
                content: '❌ This job has already been completed and paid.',
                ephemeral: true,
            });
            return;
        }

        if (hire.status === 'cancelled') {
            await InteractionHelper.safeReply(interaction, {
                content: '⚠️ This job has already been cancelled.',
                ephemeral: true,
            });
            return;
        }

        const reward = Number(hire.coins);

if (!Number.isFinite(reward) || reward <= 0) {
    await InteractionHelper.safeReply(interaction, {
        content: '❌ Invalid refund amount.',
        ephemeral: true,
    });
    return;
}

// Refund the escrowed MeowCoins
await addMoney(
    client,
    hire.guildId,
    hire.employerId,
    reward
);

        // Mark cancelled
        hire.status = 'cancelled';
        hire.cancelledAt = Date.now();
        hire.cancelledBy = interaction.user.id;

        await client.db.set(hireKey, hire);

        const embed = createEmbed({
            title: '❌ Job Cancelled',
            description:
                `This job has been cancelled.\n\n` +
                `🪙 **Refunded:** ${reward.toLocaleString()} MeowCoins\n` +
                `🛡️ **Cancelled by:** <@${interaction.user.id}>`,
            color: 'error',
        });

        await InteractionHelper.safeReply(interaction, {
            embeds: [embed],
        });

        // Delete the job channel
        if (hire.channelId) {
            const jobChannel = await client.channels
                .fetch(hire.channelId)
                .catch(() => null);

            if (jobChannel) {
                await jobChannel.delete('Job cancelled').catch(() => {});
            }
        }
    },
};
