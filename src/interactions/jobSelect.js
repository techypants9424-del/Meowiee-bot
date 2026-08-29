import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from 'discord.js';

import { createEmbed } from '../utils/embeds.js';
import { InteractionHelper } from '../utils/interactionHelper.js';
import { getJob } from '../utils/databaseJob.js';

export default {
    name: 'job_select',

    async execute(interaction, client) {
        try {
            // Acknowledge the select menu immediately.
            // This prevents "Meowiee didn't respond" while
            // the database request is running.
            if (!interaction.replied && !interaction.deferred) {
                await interaction.deferUpdate();
            }

            const hireId = interaction.values?.[0];

            if (!hireId) {
                await InteractionHelper.safeEditReply(interaction, {
                    content: '❌ Invalid job selection.',
                    embeds: [],
                    components: [],
                });
                return;
            }

            const job = await getJob(client, hireId);

            if (!job) {
                await InteractionHelper.safeEditReply(interaction, {
                    content: '❌ This job no longer exists.',
                    embeds: [],
                    components: [],
                });
                return;
            }

            if (job.status !== 'open') {
                await InteractionHelper.safeEditReply(interaction, {
                    content:
                        '❌ This job is no longer available.\n\n' +
                        `📌 Status: **${job.status}**`,
                    embeds: [],
                    components: [],
                });
                return;
            }

            if (job.employerId === interaction.user.id) {
                await InteractionHelper.safeEditReply(interaction, {
                    content: '❌ You cannot accept your own job.',
                    embeds: [],
                    components: [],
                });
                return;
            }

            const reward = Number(job.coins) || 0;

            const embed = createEmbed({
                title: '💼 Job Details',
                description:
                    `📝 **Job:**\n${job.reason}\n\n` +
                    `🪙 **Reward:** **${reward.toLocaleString()} MeowCoins**\n` +
                    `📌 **Status:** **Open**\n\n` +
                    `👤 **Posted by:** <@${job.employerId}>\n\n` +
                    `━━━━━━━━━━━━━━━━━━\n\n` +
                    `Want to complete this job?\n` +
                    `Click **Accept Job** below to start.`,
            });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`job_accept:${job.id}`)
                    .setLabel('Accept Job')
                    .setEmoji('✅')
                    .setStyle(ButtonStyle.Success)
            );

            await InteractionHelper.safeEditReply(interaction, {
                content: '',
                embeds: [embed],
                components: [row],
            });
        } catch (error) {
            console.error('Error in job_select:', error);

            await InteractionHelper.safeEditReply(interaction, {
                content: '❌ Something went wrong while loading this job.',
                embeds: [],
                components: [],
            }).catch(() => {});
        }
    },
};
