import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

export default {
    category: 'Watch',

    data: new SlashCommandBuilder()
        .setName('watch')
        .setDescription('Watch anime from AniKoto')
        .addStringOption((option) =>
            option
                .setName('anime')
                .setDescription('Anime name')
                .setRequired(true),
        ),

    async execute(interaction) {
        const deferred = await InteractionHelper.safeDefer(interaction, {
            flags: MessageFlags.Ephemeral,
        });

        if (!deferred) {
            return;
        }

        const anime = interaction.options.getString('anime');

        await InteractionHelper.safeEditReply(interaction, {
            content: `🎬 Watch system loaded!\nAnime: **${anime}**`,
        });
    },
};
