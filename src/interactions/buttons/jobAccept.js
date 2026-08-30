import {
    ChannelType,
    PermissionFlagsBits,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from 'discord.js';

import { createEmbed } from '../../utils/embeds.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    name: 'job_accept',

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

        // Job was already taken/cancelled
        if (hire.status !== 'open') {
            await InteractionHelper.safeReply(interaction, {
                content:
                    '❌ This job is no longer available.\n\n' +
                    `Current status: **${hire.status}**`,
                ephemeral: true,
            });
            return;
        }

        // Employer cannot accept their own job
        if (hire.employerId === interaction.user.id) {
            await InteractionHelper.safeReply(interaction, {
                content: '❌ You cannot accept your own job.',
                ephemeral: true,
            });
            return;
        }

        const guild = interaction.guild;

        if (!guild) {
            await InteractionHelper.safeReply(interaction, {
                content: '❌ This can only be used inside a server.',
                ephemeral: true,
            });
            return;
        }

        // Make sure both users still exist in this server
        const employer = await guild.members
            .fetch(hire.employerId)
            .catch(() => null);

        const worker = await guild.members
            .fetch(interaction.user.id)
            .catch(() => null);

        if (!employer) {
            await InteractionHelper.safeReply(interaction, {
                content:
                    '❌ The person who created this job is no longer in the server.',
                ephemeral: true,
            });
            return;
        }

        if (!worker) {
            await InteractionHelper.safeReply(interaction, {
                content: '❌ You must be in this server to accept the job.',
                ephemeral: true,
            });
            return;
        }

        // --------------------------------------------------
        // CREATE PRIVATE JOB CHANNEL
        // --------------------------------------------------

        const channelName = `${worker.user.username}-job`
            .toLowerCase()
            .replace(/[^a-z0-9-_]/g, '-')
            .substring(0, 90);

        const jobChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildText,

            permissionOverwrites: [
                {
                    id: guild.roles.everyone.id,
                    deny: [PermissionFlagsBits.ViewChannel],
                },
                {
                    id: employer.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                    ],
                },
                {
                    id: worker.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.AttachFiles,
                    ],
                },
                {
                    id: client.user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.ManageChannels,
                    ],
                },
            ],
        });

        // --------------------------------------------------
        // UPDATE JOB
        // --------------------------------------------------

        hire.status = 'in_progress';
        hire.workerId = worker.id;
        hire.channelId = jobChannel.id;
        hire.acceptedAt = Date.now();

        await client.db.set(hireKey, hire);

        // --------------------------------------------------
        // JOB CHANNEL MESSAGE
        // --------------------------------------------------

        const jobEmbed = createEmbed({
            title: '💼 MeowCoins Job',
            description:
                `A job has been accepted!\n\n` +
                `👤 **Client:** <@${employer.id}>\n` +
                `🧑‍💻 **Worker:** <@${worker.id}>\n\n` +
                `📝 **Job:**\n${hire.reason}\n\n` +
                `🪙 **Reward:** **${hire.coins.toLocaleString()} MeowCoins**\n\n` +
                `━━━━━━━━━━━━━━━━━━\n` +
                `📌 **How this works**\n` +
                `• Complete the requested job.\n` +
                `• Send your screenshots/proof in this channel.\n` +
                `• Moderators can review the conversation and proof.\n` +
                `• The reward is paid after moderator approval.\n\n` +
                `⚠️ Keep all job-related messages and proof inside this channel.`,
        });

        const controls = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`job_cancel:${hire.id}`)
                .setLabel('Cancel Job')
                .setEmoji('❌')
                .setStyle(ButtonStyle.Danger)
        );

        await jobChannel.send({
            content: `<@${employer.id}> <@${worker.id}>`,
            embeds: [jobEmbed],
            components: [controls],
        });

        // --------------------------------------------------
        // CONFIRM TO WORKER
        // --------------------------------------------------

        const confirmationEmbed = createEmbed({
            title: '✅ Job Accepted!',
            description:
                `You accepted **${hire.coins.toLocaleString()} MeowCoins** job!\n\n` +
                `📝 **Job:** ${hire.reason}\n` +
                `🪙 **Reward:** ${hire.coins.toLocaleString()} MeowCoins\n\n` +
                `🔒 Your private job channel has been created:\n` +
                `${jobChannel}\n\n` +
                `Complete the job and keep your proof in that channel.`,
        });

        await InteractionHelper.safeUpdate(interaction, {
            embeds: [confirmationEmbed],
            components: [],
        });
    },
};
