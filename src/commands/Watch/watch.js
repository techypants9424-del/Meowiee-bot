import {
    SlashCommandBuilder,
    MessageFlags,
    EmbedBuilder,
} from 'discord.js';

import { InteractionHelper } from '../../utils/interactionHelper.js';
import AniKoto from '../../services/video/anikoto.js';
import VideoSession from '../../services/video/videoSession.js';

const sessions = new Map();
const anikoto = new AniKoto();

export default {
    category: 'Watch',

    data: new SlashCommandBuilder()
        .setName('watch')
        .setDescription('Watch an anime episode from AniKoto')
        .addIntegerOption((option) =>
            option
                .setName('id')
                .setDescription('AniKoto anime/series ID')
                .setRequired(true)
                .setMinValue(1),
        )
        .addIntegerOption((option) =>
            option
                .setName('episode')
                .setDescription('Episode number')
                .setRequired(true)
                .setMinValue(1),
        )
        .addStringOption((option) =>
            option
                .setName('language')
                .setDescription('Audio/subtitle version')
                .setRequired(false)
                .addChoices(
                    { name: 'Sub', value: 'sub' },
                    { name: 'Dub', value: 'dub' },
                ),
        ),

    async execute(interaction) {
        const deferred = await InteractionHelper.safeDefer(interaction, {
            flags: MessageFlags.Ephemeral,
        });

        if (!deferred) {
            return;
        }

        try {
            const id = interaction.options.getInteger('id');
            const episodeNumber = interaction.options.getInteger('episode');
            const language =
                interaction.options.getString('language') || 'sub';

            const series = await anikoto.getSeries(id);

            const animeTitle =
                series.anime?.title ||
                series.anime?.name ||
                `AniKoto Series ${id}`;

            const episode = await anikoto.getEpisode(
                id,
                episodeNumber,
                language,
            );

            const session = new VideoSession(interaction.guildId);

            session.start({
                title: animeTitle,
                episode: episode.number,
                url: episode.embedUrl,
            });

            sessions.set(interaction.guildId, session);

            const embed = new EmbedBuilder()
                .setTitle(`🎬 ${animeTitle}`)
                .setDescription(
                    `**Episode:** ${episode.number}\n` +
                    `**Language:** ${language.toUpperCase()}\n\n` +
                    `**Watch:** [Open Episode](${episode.embedUrl})`,
                )
                .setFooter({
                    text: 'Meowiee • AniKoto',
                });

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [embed],
            });
        } catch (error) {
            console.error('Watch command error:', error);

            await InteractionHelper.safeEditReply(interaction, {
                content:
                    '❌ I could not find that anime/episode on AniKoto.',
            });
        }
    },
};
