import { SlashCommandBuilder, MessageFlags, EmbedBuilder } from 'discord.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import AniKoto from '../../services/video/anikoto.js';
import VideoSession from '../../services/video/videoSession.js';

const anikoto = new AniKoto();
const sessions = new Map();

export default {
    category: 'Watch',

    data: new SlashCommandBuilder()
        .setName('watch')
        .setDescription('Watch an anime episode from AniKoto')
        .addIntegerOption((option) =>
            option
                .setName('id')
                .setDescription('AniKoto series ID')
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
                .setDescription('Sub or dub')
                .addChoices(
                    { name: 'Sub', value: 'sub' },
                    { name: 'Dub', value: 'dub' },
                ),
        ),

    async execute(interaction) {
        const deferred = await InteractionHelper.safeDefer(interaction, {
            flags: MessageFlags.Ephemeral,
        });

        if (!deferred) return;

        try {
            const id = interaction.options.getInteger('id');
            const episodeNumber = interaction.options.getInteger('episode');
            const language =
                interaction.options.getString('language') || 'sub';

            // Get anime information
            const series = await anikoto.getSeries(id);

            // Get requested episode
            const episode = await anikoto.getEpisode(
                id,
                episodeNumber,
                language,
            );

            const title =
                series.title ||
                series.name ||
                series.anime?.title ||
                `AniKoto #${id}`;

            // Create watch session
            const session = new VideoSession(interaction.guildId);

            session.start({
                title,
                episode: episode.number,
                url: episode.embedUrl,
            });

            sessions.set(interaction.guildId, session);

            const embed = new EmbedBuilder()
                .setTitle(`🎬 ${title}`)
                .setDescription(
                    `**Episode:** ${episode.number}\n` +
                    `**Language:** ${language.toUpperCase()}\n\n` +
                    `🔗 [Open Episode](${episode.embedUrl})`,
                )
                .setFooter({
                    text: 'Meowiee • AniKoto',
                });

            await InteractionHelper.safeEditReply(interaction, {
                embeds: [embed],
            });
        } catch (error) {
            console.error('[WATCH]', error);

            await InteractionHelper.safeEditReply(interaction, {
                content:
                    `❌ Could not load the AniKoto episode.\n` +
                    `\`${error.message}\``,
            });
        }
    },
};
