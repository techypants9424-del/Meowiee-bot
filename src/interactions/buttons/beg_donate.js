import { addMoney, removeMoney, getEconomyData } from '../../utils/economy.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { createEmbed } from '../../utils/embeds.js';

const BEG_AMOUNT = 10;

export default {
    name: 'beg_donate',

    async execute(interaction, client, args) {
        const beggarId = args?.[0];
        const donorId = interaction.user.id;
        const guildId = interaction.guildId;

        if (!beggarId) {
            await InteractionHelper.safeReply(interaction, {
                content: '❌ Invalid beg button.',
                ephemeral: true,
            });
            return;
        }

        // Prevent donating to yourself
        if (donorId === beggarId) {
            await InteractionHelper.safeReply(interaction, {
                content: '🥺 You cannot donate to yourself!',
                ephemeral: true,
            });
            return;
        }

        // Get donor's economy
        const donorData = await getEconomyData(client, guildId, donorId);
        const donorBalance = donorData.wallet || 0;

        // Check balance
        if (donorBalance < BEG_AMOUNT) {
            await InteractionHelper.safeReply(interaction, {
                content:
                    `❌ You don't have enough MeowCoins!\n\n` +
                    `You have **${donorBalance} MeowCoins** 🪙\n` +
                    `You need **${BEG_AMOUNT} MeowCoins**.`,
                ephemeral: true,
            });
            return;
        }

        // Take 10 coins from donor
        await removeMoney(
            client,
            guildId,
            donorId,
            BEG_AMOUNT
        );

        // Give 10 coins to beggar
        await addMoney(
            client,
            guildId,
            beggarId,
            BEG_AMOUNT
        );

        const embed = createEmbed({
            title: '🪙 Donation Received!',
            description:
                `<@${donorId}> donated **${BEG_AMOUNT} MeowCoins** to <@${beggarId}>! 🥺💖`,
            color: 'success',
        });

        await InteractionHelper.safeReply(interaction, {
            embeds: [embed],
        });
    },
};
