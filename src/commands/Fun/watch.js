import { SlashCommandBuilder } from 'discord.js';
import { watchSessions } from '../../services/watch/watchSessionManager.js';

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
        const anime = interaction.options.getString('anime');
        const episode = interaction.options.getInteger('episode') ?? 1;

        const session = watchSessions.create({
            guildId: interaction.guildId,
            hostId: interaction.user.id,
            title: anime,
            episode,
            language: 'sub',
        });

        const port =
            client.config?.api?.port ||
            process.env.PORT ||
            3000;

        const baseUrl =
            process.env.WATCH_BASE_URL ||
            `http://localhost:${port}`;

        const watchUrl = `${baseUrl}/watch/${session.roomId}`;

        watchSessions.update(session.roomId, {
            watchUrl,
        });

        await interaction.reply({
            content:
                `🎬 **Watch party created!**\n\n` +
                `**Anime:** ${anime}\n` +
                `**Episode:** ${episode}\n` +
                `**Room:** \`${session.roomId}\`\n\n` +
                `🔗 ${watchUrl}\n\n` +
                `The player will be connected next.`,
        });
    },
};
EOF
