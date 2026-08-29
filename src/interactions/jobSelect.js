import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from 'discord.js';

import { createEmbed } from '../utils/embeds.js';
import { InteractionHelper } from '../utils/interactionHelper.js';

export default {
    customId: 'job_select',

    async execute(interaction, client) {
        const hireId = interaction.values?.[0];

        if (!hireId) {
            await InteractionHelper.safeUpdate(interaction, {
                content: '❌ Invalid job selection.',
                components: [],
            });
            return;
        }

        const hireKey = `hire:${hireId}`;
        const hire = await client.db.get(hireKey, null);

        if (!hire) {
            await InteractionHelper.safeUpdate(interaction, {
                content: '❌ This job no longer exists.',
                components: [],
            });
            return;
        }

        // Make sure the job is still available
        if (hire.status !== 'open') {
            await InteractionHelper.safeUpdate(interaction, {
                content:
                    '❌ This job is no longer available.\n\n' +
                    'Someone may have already accepted it.',
                components: [],
            });
            return;
        }

        // Don't let the person hire themselves
        if (hire.employerId === interaction.user.id) {
            await InteractionHelper.safeUpdate(interaction, {
                content:
                    '❌ You cannot accept your own job!',
                components: [],
            });
            return;
        }

        const embed = createEmbed({
            title: '💼 Job Details',
            description:
                `📝 **Job:**\n${hire.reason}\n\n` +
                `🪙 **Reward:** **${hire.coins.toLocaleString()} MeowCoins**\n` +
                `👤 **Posted by:** <@${hire.employerId}>\n` +
                `📌 **Status:** Open\n\n` +
                `If you can complete this job, click **Accept Job** below.`,
        });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`job_accept:${hire.id}`)
                .setLabel('Accept Job')
                .setEmoji('✅')
                .setStyle(ButtonStyle.Success),

            new ButtonBuilder()
                .setCustomId(`job_cancel:${hire.id}`)
                .setLabel('Close')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Secondary)
        );

        await InteractionHelper.safeUpdate(interaction, {
            embeds: [embed],
            components: [row],
        });
    },
};
