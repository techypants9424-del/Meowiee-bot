import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from 'discord.js';

import { createEmbed } from '../utils/embeds.js';
import { InteractionHelper } from '../utils/interactionHelper.js';
import { getJob } from '../utils/databaseJob.js';

export default {
    customId: 'job_select',

    async execute(interaction, client) {
        const hireId = interaction.values?.[0];

        if (!hireId) {
            await InteractionHelper.safeReply(interaction, {
                content: '❌ Invalid job selection.',
                ephemeral: true,
            });
            return;
        }

        const job = await getJob(client, hireId);

        if (!job) {
            await InteractionHelper.safeReply(interaction, {
                content: '❌ This job no longer exists.',
                ephemeral: true,
            });
            return;
        }

        if (job.status !== 'open') {
            await InteractionHelper.safeReply(interaction, {
                content:
                    '❌ This job is no longer available.\n\n' +
                    `Status: **${job.status}**`,
                ephemeral: true,
            });
            return;
        }

        // Employer cannot accept their own job
        if (job.employerId === interaction.user.id) {
            await InteractionHelper.safeReply(interaction, {
                content: '❌ You cannot accept your own job.',
                ephemeral: true,
            });
            return;
        }

        const embed = createEmbed({
            title: '💼 Job Details',
            description:
                `📝 **Job:**\n${job.reason}\n\n` +
                `🪙 **Reward:** **${Number(job.coins).toLocaleString()} MeowCoins**\n` +
                `📌 **Status:** Open\n\n` +
                `👤 **Posted by:** <@${job.employerId}>\n\n` +
                `Click **Accept Job** if you want to complete this job.`,
        });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`job_accept:${job.id}`)
                .setLabel('Accept Job')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success)
        );

        await InteractionHelper.safeUpdate(interaction, {
            embeds: [embed],
            components: [row],
        });
    },
};
