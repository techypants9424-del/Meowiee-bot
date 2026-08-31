import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from 'discord.js';

import { createEmbed } from '../../utils/embeds.js';
import {
    getEconomyData,
    saveEconomyData,
} from '../../utils/economy.js';

const WRONG_SHOP_PENALTY = 30;
const ESCAPE_PENALTY = 25;
const GAME_TIME = 5 * 60 * 1000;

// Shop positions on the Discord map
const SHOPS = {
    food: {
        x: 4,
        y: 2,
        name: 'Food Shop',
        emoji: '🍔',
    },

    cafe: {
        x: 3,
        y: 3,
        name: 'Café',
        emoji: '☕',
    },

    toy: {
        x: 0,
        y: 2,
        name: 'Toy Shop',
        emoji: '🧸',
    },

    game: {
        x: 3,
        y: 1,
        name: 'Game Shop',
        emoji: '🎮',
    },

    book: {
        x: 1,
        y: 3,
        name: 'Book Shop',
        emoji: '📚',
    },

    mall: {
        x: 2,
        y: 4,
        name: 'Mall',
        emoji: '🛍️',
    },

    clinic: {
        x: 1,
        y: 1,
        name: 'Clinic',
        emoji: '🏥',
    },
};

const START_POSITION = {
    x: 2,
    y: 2,
};


/* ==========================================
   MOVEMENT BUTTONS
========================================== */

function createMovementButtons() {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('meowiee_move_up')
                .setLabel('⬆️')
                .setStyle(ButtonStyle.Primary)
        ),

        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('meowiee_move_left')
                .setLabel('⬅️')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId('meowiee_move_down')
                .setLabel('⬇️')
                .setStyle(ButtonStyle.Primary),

            new ButtonBuilder()
                .setCustomId('meowiee_move_right')
                .setLabel('➡️')
                .setStyle(ButtonStyle.Primary)
        ),
    ];
}


/* ==========================================
   MOVE MEOWIEE
========================================== */

function moveMeowiee(position, direction) {
    const newPosition = {
        x: position?.x ?? START_POSITION.x,
        y: position?.y ?? START_POSITION.y,
    };

    switch (direction) {
        case 'up':
            newPosition.y--;
            break;

        case 'down':
            newPosition.y++;
            break;

        case 'left':
            newPosition.x--;
            break;

        case 'right':
            newPosition.x++;
            break;
    }

    // Keep Meowiee inside the map
    newPosition.x = Math.max(
        0,
        Math.min(4, newPosition.x)
    );

    newPosition.y = Math.max(
        1,
        Math.min(4, newPosition.y)
    );

    return newPosition;
}


/* ==========================================
   FIND SHOP AT POSITION
========================================== */

function getShopAtPosition(position) {
    for (const [id, shop] of Object.entries(SHOPS)) {
        if (
            shop.x === position.x &&
            shop.y === position.y
        ) {
            return {
                id,
                ...shop,
            };
        }
    }

    return null;
}


/* ==========================================
   CREATE MAP
========================================== */

function createMap(position) {
    const map = [];

    for (let y = 1; y <= 4; y++) {
        let row = '';

        for (let x = 0; x <= 4; x++) {
            if (
                position.x === x &&
                position.y === y
            ) {
                row += '🐱 ';
                continue;
            }

            const shop = Object.values(SHOPS).find(
                item =>
                    item.x === x &&
                    item.y === y
            );

            if (shop) {
                row += `${shop.emoji} `;
            } else {
                row += '⬜ ';
            }
        }

        map.push(row);
    }

    return map.join('\n');
}


/* ==========================================
   TIME LEFT
========================================== */

function getTimeLeft(game) {
    const expiresAt =
        game.expiresAt ||
        ((game.startedAt || Date.now()) + GAME_TIME);

    return Math.max(
        0,
        expiresAt - Date.now()
    );
}


function formatTime(milliseconds) {
    const totalSeconds =
        Math.floor(milliseconds / 1000);

    const minutes =
        Math.floor(totalSeconds / 60);

    const seconds =
        totalSeconds % 60;

    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}


/* ==========================================
   HANDLER
========================================== */

export default {
    name: 'meowiee_work',

    async execute(interaction, client) {

        if (!interaction.isButton()) {
            return;
        }

        if (!interaction.customId.startsWith('meowiee_move_')) {
            return;
        }

        const ready =
            await interaction.deferUpdate().catch(() => false);

        if (ready === false) {
            return;
        }

        try {
            const guildId = interaction.guildId;
            const userId = interaction.user.id;

            if (!guildId) {
                return;
            }

            const data = await getEconomyData(
                client,
                guildId,
                userId
            );

            const game = data.workTask;

            // No active game
            if (
                !game ||
                game.type !== 'meowiee_game'
            ) {
                await interaction.editReply({
                    content:
                        '❌ You do not have an active Meowiee game.',
                    embeds: [],
                    components: [],
                });

                return;
            }

            // ======================================
            // CHECK TIMER
            // ======================================

            const timeLeft = getTimeLeft(game);

            if (timeLeft <= 0) {

                data.workTask = null;

                await saveEconomyData(
                    client,
                    guildId,
                    userId,
                    data
                );

                const embed = createEmbed({
                    title: '💨 MEOWIEE RAN AWAY!',
                    description:
                        `You took too long! 😭\n\n` +
                        `Meowiee got bored, ran away and stole ` +
                        `**${ESCAPE_PENALTY} MeowCoins**! 💸`,
                });

                await interaction.editReply({
                    embeds: [embed],
                    components: [],
                });

                return;
            }

            // ======================================
            // MOVE
            // ======================================

            const direction =
                interaction.customId.replace(
                    'meowiee_move_',
                    ''
                );

            const currentPosition =
                game.position || {
                    ...START_POSITION,
                };

            const newPosition =
                moveMeowiee(
                    currentPosition,
                    direction
                );

            game.position = newPosition;

            // ======================================
            // CHECK SHOP
            // ======================================

            const shop =
                getShopAtPosition(newPosition);

            if (shop) {

                const destination =
                    game.destination;

                const destinationId =
                    destination?.id ||
                    destination?.type ||
                    destination?.key;

                // ==================================
                // WRONG SHOP
                // ==================================

                if (
                    destinationId !== shop.id &&
                    destination?.name !== shop.name
                ) {

                    data.workTask = null;

                    await saveEconomyData(
                        client,
                        guildId,
                        userId,
                        data
                    );

                    const embed = createEmbed({
                        title:
                            '😾 MEOWIEE WENT OUT OF CONTROL!',
                        description:
                            `You took Meowiee to the wrong shop!\n\n` +

                            `❌ You went to ` +
                            `${shop.emoji} **${shop.name}**\n` +

                            `📍 She needed to go to ` +
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
                    Number(game.reward) || 50;

                data.workTask = null;

                await saveEconomyData(
                    client,
                    guildId,
                    userId,
                    data
                );

                const embed = createEmbed({
                    title: '🎉 JOB COMPLETE!',
                    description:
                        `You successfully delivered Meowiee! 🐱\n\n` +

                        `📍 **Destination:** ` +
                        `${destination.emoji} **${destination.name}**\n\n` +

                        `🪙 **Reward:** ` +
                        `**+${reward.toLocaleString()} MeowCoins**\n\n` +

                        `🐾 Meowiee is happy!`,
                });

                await interaction.editReply({
                    embeds: [embed],
                    components: [],
                });

                return;
            }

            // ======================================
            // SAVE POSITION
            // ======================================

            await saveEconomyData(
                client,
                guildId,
                userId,
                data
            );

            // ======================================
            // UPDATE GAME
            // ======================================

            const embed = createEmbed({
                title: '🐱 Meowiee Work!',
                description:
                    `📍 **Take Meowiee to:** ` +
                    `${game.destination.emoji} ` +
                    `**${game.destination.name}**\n\n` +

                    `⏱️ **Time Left:** ` +
                    `**${formatTime(timeLeft)}**\n\n` +

                    `🗺️ **Map:**\n` +
                    '```' +
                    `\n${createMap(newPosition)}\n` +
                    '```\n' +

                    `🐾 Use the buttons to guide Meowiee!`,
            }).setFooter({
                text:
                    'Wrong shop = -30 MeowCoins • Timeout = -25 MeowCoins',
            });

            await interaction.editReply({
                embeds: [embed],
                components: createMovementButtons(),
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
