import { SlashCommandBuilder } from 'discord.js';
import { watchSessions } from '../../services/watch/watchSessionManager.js';
import { resolveWatchEpisode } from '../../services/watch/anikoto.js';

export default {
    category: 'Fun',

    data: new SlashCommandBuilder()
        .setName('watch')
        .setDescription('Create an anime watch party')
        .addStringOption((option) =>
            option
                .setName('anime')
                .setDescription('Anime to watch')
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName('episode')
                .setDescription('Episode number')
                .setMinValue(1)
                .setRequired(false)
        ),

    async execute(interaction, config, client) {
        const animeQuery =
            interaction.options.getString('anime');

        const episode =
            interaction.options.getInteger('episode') ?? 1;

        await interaction.deferReply();

        try {
            const resolved = await resolveWatchEpisode(
                animeQuery,
                episode,
                'sub'
            );

            if (!resolved.ok) {
                if (resolved.reason === 'anime_not_found') {
                    await interaction.editReply(
                        `❌ I couldn't find **${animeQuery}** in the AniKoto catalog.`
                    );
                    return;
                }

                if (resolved.reason === 'episode_not_found') {
                    await interaction.editReply(
                        `❌ **${animeQuery}** doesn't have episode **${episode}** available on AniKoto.`
                    );
                    return;
                }

                if (resolved.reason === 'embed_not_found') {
                    await interaction.editReply(
                        `❌ I found **${animeQuery}** episode **${episode}**, but couldn't find a playable stream.`
                    );
                    return;
                }

                await interaction.editReply(
                    `❌ I couldn't find a playable version of **${animeQuery}** episode **${episode}**.`
                );
                return;
            }

            const session = watchSessions.create({
                guildId: interaction.guildId,
                hostId: interaction.user.id,

                title:
                    resolved.anime.title ||
                    animeQuery,

                episode: resolved.episodeNumber,

                language: resolved.language,

                embedUrl: resolved.embedUrl,
            });

            const port =
                client.config?.api?.port ||
                process.env.PORT ||
                3000;

            const baseUrl =
                process.env.WATCH_BASE_URL ||
                `http://localhost:${port}`;

            const watchUrl =
                `${baseUrl}/watch/${session.roomId}`;

            watchSessions.update(session.roomId, {
                watchUrl,

                animeId: resolved.animeId,

                episodeEmbedId:
                    resolved.episode.episode_embed_id ?? null,
            });

            await interaction.editReply(
                `🎬 **Watch party created!**\n\n` +
                `**Anime:** ${resolved.anime.title}\n` +
                `**Episode:** ${resolved.episodeNumber}\n` +
                `**Language:** ${resolved.language.toUpperCase()}\n\n` +
                `🔗 ${watchUrl}`
            );
        } catch (error) {
            console.error(
                '[Watch] Failed to create watch party:',
                error
            );

            if (interaction.deferred || interaction.replied) {
                await interaction.editReply(
                    `❌ Something went wrong while finding **${animeQuery}**.`
                );
            }
        }
    },
};
