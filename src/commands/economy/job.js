import {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} from 'discord.js';

import { createEmbed } from '../../utils/embeds.js';
import { withErrorHandling } from '../../utils/errorHandler.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { getOpenJobs } from '../../utils/databaseJob.js';

export default {
    data: new SlashCommandBuilder()
        .setName('job')
        .setDescription('Browse available MeowCoins jobs'),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const guildId = interaction.guildId;

        if (!guildId) {
            await InteractionHelper.safeEditReply(interaction, {
                content: '❌ This command can only be used inside a server.',
            });
            return;
        }

        // Get all open jobs
        const hires = await getOpenJobs(client, guildId);

        if (hires.length === 0) {
            const embed = createEmbed({
                title: '📋 Available Jobs',
                description:
                    'There are currently **no open jobs**.\n\n' +
                    'Check back later for new MeowCoin jobs!',
            });

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [embed],
            });

            return;
        }

        // Newest jobs first
        hires.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

        // Discord select menus can only have 25 options
        const jobs = hires.slice(0, 25);

        const options = jobs.map((hire) => {
            const reason = hire.reason || 'Untitled job';

            const shortenedReason =
                reason.length > 90
                    ? `${reason.substring(0, 87)}...`
                    : reason;

            return new StringSelectMenuOptionBuilder()
                .setLabel(shortenedReason)
                .setDescription(
                    `${Number(hire.coins || 0).toLocaleString()} MeowCoins • Job #${hire.id.slice(-6)}`
                )
                .setValue(hire.id);
        });

        const menu = new StringSelectMenuBuilder()
            .setCustomId('job_select')
            .setPlaceholder('Select a job to view it')
            .addOptions(options);

        const row = new ActionRowBuilder()
            .addComponents(menu);

        const embed = createEmbed({
            title: '💼 MeowCoins Job Board',
            description:
                'Browse the available jobs below and select one to view the details.\n\n' +
                '🪙 Rewards are paid in **MeowCoins** after the job is completed and approved by a moderator.',
        });

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [embed],
            components: [row],
        });
    }, { command: 'job' }),
};
