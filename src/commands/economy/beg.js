import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from 'discord.js';

import { createEmbed } from '../../utils/embeds.js';
import { getEconomyData, addMoney, removeMoney } from '../../utils/economy.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';

const BEG_AMOUNT = 10;

export default {
    name: 'beg',

    async execute(interaction, client) {
        const ready = await InteractionHelper.safeDefer(interaction);

        if (!ready) {
            return;
        }

        const beggarId = interaction.user.id;

        const embed = createEmbed({
            title: '🥺 MeowCoins Begging',
            description:
                `<@${beggarId}> is begging for some MeowCoins! 🥺\n\n` +
                `If you want to help, donate **${BEG_AMOUNT} MeowCoins**! 🪙`,
            color: 'success',
        });

        const donateButton = new ButtonBuilder()
            .setCustomId(`beg_donate:${beggarId}`)
            .setLabel(`Donate ${BEG_AMOUNT} MeowCoins`)
            .setEmoji('🪙')
            .setStyle(ButtonStyle.Success);

        const row = new ActionRowBuilder().addComponents(
            donateButton
        );

        await InteractionHelper.safeEditReply(interaction, {
            embeds: [embed],
            components: [row],
        });
    },
};
