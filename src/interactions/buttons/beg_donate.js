import { addMoney, removeMoney, getEconomyData } from '../../utils/economy.js';
import { InteractionHelper } from '../../utils/interactionHelper.js';
import { createEmbed } from '../../utils/embeds.js';

const BEG_AMOUNT = 10;

export default {
    name: 'beg_donate',

    async execute(interaction, client, args) {
        const beggarId = args?.[0];

        if (!beggarId) {
            await InteractionHelper.safeReply(interaction, {
                content: '❌ Invalid beg button.',
                ephemeral: true,
            });
            return;
        }

        const donorId = interaction.user.id;

        // Don't allow the beggar to donate to themselves
        if (donorId === beggarId) {
            await InteractionHelper.safeReply(interaction, {
                content: '🥺 You cannot donate to yourself!',
                ephemeral: true,
            });
            return;
        }

        const donorData = await getEconomyData(donorId);
        const donorBalance = donorData?.balance ?? donorData?.money ?? 0;

        // Check donor has enough MeowCoins
        if (donorBalance < BEG_AMOUNT) {
            await InteractionHelper.safeReply(interaction, {
                content: `❌ You need **${BEG_AMOUNT} MeowCoins** to donate! You only have **${donorBalance}**. 🪙`,
                ephemeral: true,
            });
            return;
        }

        // Remove coins from donor
        await removeMoney(donorId, BEG_AMOUNT);

        // Give coins to beggar
        await addMoney(beggarId, BEG_AMOUNT);

        const embed = createEmbed({
            title: '🪙 Donation Received!',
            description:
                `<@${donorId}> donated **${BEG_AMOUNT} MeowCoins** to <@${beggarId}>! 🥺💖\n\n` +
                `The beggar now has some more MeowCoins!`,
            color: 'success',
        });

        await InteractionHelper.safeReply(interaction, {
            embeds: [embed],
        });
    },
};
