import {
    getEconomyData,
    saveEconomyData,
} from '../../utils/economy.js';

import { createEmbed } from '../../utils/embeds.js';

import {
    moveMeowiee,
    createMeowieeMap,
    getShopAtPosition,
    getMeowieeGameTimeLeft,
    formatGameTime,
    WRONG_SHOP_PENALTY,
    ESCAPE_PENALTY,
} from '../../utils/meowieeWorkGame.js';

import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from 'discord.js';

// ==========================================
// MOVEMENT BUTTONS
// ==========================================

function createMovementButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(
                    'meowiee_move_up'
                )
                .setLabel('⬆️')
                .setStyle(
                    ButtonStyle.Primary
                )
        ),

        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(
                    'meowiee_move_left'
                )
                .setLabel('⬅️')
                .setStyle(
                    ButtonStyle.Primary
                ),

            new ButtonBuilder()
                .setCustomId(
                    'meowiee_move_down'
                )
                .setLabel('⬇️')
                .setStyle(
                    ButtonStyle.Primary
                ),

            new ButtonBuilder()
                .setCustomId(
                    'meowiee_move_right'
                )
                .setLabel('➡️')
                .setStyle(
                    ButtonStyle.Primary
                )
        ),
    ];
}

// ==========================================
// COIN BALANCE HELPER
// ==========================================

function changeMeowCoins(
    data,
    amount
) {
    /*
     * Your economy data may use one of these
     * common balance property names.
     *
     * We use the one that already exists.
     */

    const possibleKeys = [
        'balance',
        'coins',
        'meowCoins',
        'wallet',
    ];

    let balanceKey =
        possibleKeys.find(
            key =>
                typeof data[key] ===
                'number'
        );

    // If the user has no existing balance
    // property, use balance.
    if (!balanceKey) {
        balanceKey = 'balance';
        data[balanceKey] = 0;
    }

    data[balanceKey] = Math.max(
        0,
        Number(data[balanceKey]) +
        Number(amount)
    );

    return data[balanceKey];
}

// ==========================================
// HANDLER
// ==========================================

export default {
    name: 'meowiee_work',

    async execute(
        interaction,
        client
    ) {

        if (!interaction.isButton()) {
            return;
        }

        if (
            !interaction.customId.startsWith(
                'meowiee_move_'
            )
        ) {
            return;
        }

        const ready =
            await interaction.deferUpdate()
                .catch(() => false);

        if (ready === false) {
            return;
        }

        try {

            const guildId =
                interaction.guildId;

            const userId =
                interaction.user.id;

            if (!guildId) {
                return;
            }

            const data =
                await getEconomyData(
                    client,
                    guildId,
                    userId
                );

            const game =
                data.workTask;

            // ==================================
            // NO GAME
            // ==================================

            if (
                !game ||
                game.type !==
                    'meowiee_game'
            ) {

                await interaction.editReply({
                    content:
                        '❌ You do not have an active Meowiee game.',

                    embeds: [],

                    components: [],
                });

                return;
            }

            // ==================================
            // TIMER
            // ==================================

            const timeLeft =
                getMeowieeGameTimeLeft(
                    game
                );

            if (timeLeft <= 0) {

                changeMeowCoins(
                    data,
                    -ESCAPE_PENALTY
                );

                data.workTask = null;

                await saveEconomyData(
                    client,
                    guildId,
                    userId,
                    data
                );

                const embed =
                    createEmbed({
                        title:
                            '💨 MEOWIEE RAN AWAY!',

                        description:
                            `You took too long! 😭\n\n` +

                            `Meowiee got bored, escaped and stole ` +
                            `**${ESCAPE_PENALTY} MeowCoins**! 💸\n\n` +

                            `🐱💨 *"BYE HUMAN!"*`,
                    });

                await interaction.editReply({
                    embeds: [embed],
                    components: [],
                });

                return;
            }

            // ==================================
            // DIRECTION
            // ==================================

            const direction =
                interaction.customId.replace(
                    'meowiee_move_',
                    ''
                );

            // ==================================
            // CURRENT POSITION
            // ==================================

            const currentPosition =
                game.position || {
                    x: 2,
                    y: 2,
                };

            // ==================================
            // MOVE
            // ==================================

            const newPosition =
                moveMeowiee(
                    currentPosition,
                    direction
                );

            game.position =
                newPosition;

            // ==================================
            // SHOP CHECK
            // ==================================

            const shop =
                getShopAtPosition(
                    newPosition
                );

            if (shop) {

                const destination =
                    game.destination;

                // ==================================
                // WRONG SHOP
                // ==================================

                if (
                    shop.id !==
                    destination.id
                ) {

                    changeMeowCoins(
                        data,
                        -WRONG_SHOP_PENALTY
                    );

                    data.workTask = null;

                    await saveEconomyData(
                        client,
                        guildId,
                        userId,
                        data
                    );

                    const embed =
                        createEmbed({
                            title:
                                '😾 MEOWIEE WENT OUT OF CONTROL!',

                            description:
                                `You took Meowiee to the wrong shop!\n\n` +

                                `❌ **You went to:** ` +
                                `${shop.emoji} **${shop.name}**\n\n` +

                                `🎯 **She needed:** ` +
                                `${destination.emoji} **${destination.name}**\n\n` +

                                `💸 Meowiee stole ` +
                                `**${WRONG_SHOP_PENALTY} MeowCoins** ` +
                                `and ran away! 🐱💨`,
                        });

                    await interaction.editReply({
                        embeds: [embed],
                        components: [],
                    });

                    return;
                }

                // ==================================
                // CORRECT SHOP
                // ==================================

                const reward =
                    Number(game.reward) ||
                    50;

                changeMeowCoins(
                    data,
                    reward
                );

                data.workTask = null;

                await saveEconomyData(
                    client,
                    guildId,
                    userId,
                    data
                );

                const embed =
                    createEmbed({
                        title:
                            '🎉 JOB COMPLETE!',

                        description:
                            `You successfully delivered Meowiee! 🐱🎉\n\n` +

                            `📍 **Destination:** ` +
                            `${destination.emoji} **${destination.name}**\n\n` +

                            `🪙 **Reward:** ` +
                            `**+${reward.toLocaleString()} MeowCoins**\n\n` +

                            `🐾 Meowiee is happy!\n` +
                            `😺 *"Mew~ thank you!"*`,
                    });

                await interaction.editReply({
                    embeds: [embed],
                    components: [],
                });

                return;
            }

            // ==================================
            // SAVE POSITION
            // ==================================

            await saveEconomyData(
                client,
                guildId,
                userId,
                data
            );

            // ==================================
            // UPDATE MAP
            // ==================================

            const map =
                createMeowieeMap(
                    newPosition
                );

            const embed =
                createEmbed({
                    title:
                        '🐱 Meowiee Work!',

                    description:
                        `🎯 **Take Meowiee to:** ` +
                        `${game.destination.emoji} ` +
                        `**${game.destination.name}**\n\n` +

                        `⏱️ **Time Left:** ` +
                        `**${formatGameTime(timeLeft)}**\n\n` +

                        `🗺️ **Meowiee City:**\n` +
                        '```' +
                        `\n${map}\n` +
                        '```\n' +

                        `🐾 Guide Meowiee to the correct shop!`,
                }).setFooter({
                    text:
                        '⚠️ Wrong shop = -30 • 💨 Timeout = -25',
                });

            await interaction.editReply({
                embeds: [embed],

                components:
                    createMovementButtons(),
            });

        } catch (error) {

            console.error(
                '[MEOWIEE_WORK] ERROR:',
                error
            );

            await interaction.editReply({
                content:
                    '❌ Something went wrong with the Meowiee game.',

                embeds: [],

                components: [],
            }).catch(() => {});
        }
    },
};
