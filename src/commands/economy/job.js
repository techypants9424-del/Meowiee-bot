import {
    SlashCommandBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
} from 'discord.js';

import { createEmbed } from '../../utils/embeds.js';
import {
    getOpenJobs,
} from '../../utils/databaseJob.js';

import {
    withErrorHandling,
    createError,
    ErrorTypes
} from '../../utils/errorHandler.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    data: new SlashCommandBuilder()
        .setName('job')
        .setDescription('View available MeowCoin jobs'),

    execute: withErrorHandling(async (interaction, config, client) => {
        const deferred = await InteractionHelper.safeDefer(interaction);
        if (!deferred) return;

        const guildId = interaction.guildId;

        if (!guildId) {
            throw createError(
                'Job used outside a server',
                ErrorTypes.VALIDATION,
                'This command can only be used inside a server.'
            );
        }

        // Get open jobs
        const jobs = await getOpenJobs(client, guildId);

        // No jobs available
        if (!jobs.length) {
            const embed = createEmbed({
                title: '💼 MeowJobs',
                description:
                    'There are currently **no open jobs**.\n\n' +
                    'Use `/hire` to create a job and offer MeowCoins for help!',
            });

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [embed],
            });

            return;
        }

        // Discord select menus can have a maximum of 25 options
        const visibleJobs = jobs.slice(0, 25);

        const options = visibleJobs.map(job => {
            const reward = Number(job.reward || 0);

            return new StringSelectMenuOptionBuilder()
                .setLabel(
                    job.description.length > 100
                        ? `${job.description.substring(0, 97)}...`
                        : job.description
                )
                .setDescription(
                    `${reward.toLocaleString()} MeowCoins • Job #${job.id.slice(-6)}`
                )
                .setValue(job.id);
        });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('job_select')
            .setPlaceholder('🐱 Select a job')
            .addOptions(options);

        const row = new ActionRowBuilder()
            .addComponents(selectMenu);

        const embed = createEmbed({
            title: '💼 MeowJobs',
            description:
                'Here are the available jobs!\n\n' +
                'Select a job below to view its details and accept it.\n\n' +
                `📋 **${visibleJobs.length}** job${visibleJobs.length === 1 ? '' : 's'} available`,
        });

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [embed],
            components: [row],
        });
    }, { command: 'job' }),
};
