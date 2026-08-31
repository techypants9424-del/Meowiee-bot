import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} from 'discord.js';

import {
    getEconomyData,
    saveEconomyData,
} from '../../utils/economy.js';

import {
    isMeowieeGameExpired,
    isCorrectDestination,
    getMeowieeGameTimeLeft,
    formatGameTime,
} from '../../utils/meowieeWorkGame.js';

import { createEmbed } from '../../utils/embeds.js';

const WRONG_SHOP_PENALTY = 30;
const ESCAPE_PENALTY = 25;

/*
 * Map layout
 *
 *     🏥 Clinic       🎮 Game Shop
 *
 * 🧸 Toy Shop       🐱        🍔 Food Shop
 *
 *     📚 Book Shop       ☕ Café
 *
 *                  🛍️ Mall
 */

const SHOP_POSITIONS = {
    clinic: { x: 1, y: 1 },
    game: { x: 3, y: 1 },

    toy: { x: 0, y: 2 },
    food: { x: 4, y: 2 },

    book: { x: 1, y: 3 },
    cafe: { x: 3, y: 3 },

    mall: { x: 2, y: 4 },
};

const START_POSITION = {
    x: 2,
    y: 2,
};

const MOVE_DISTANCE = 1;


/*
 * Create the Discord movement controls.
 */
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


/*
 * Get Meowiee's current position.
 */
function getPosition(game) {
    return game.position || { ...START_POSITION };
}


/*
 * Move Meowiee.
 */
function movePosition(position, direction) {
    const newPosition = {
        x: position.x,
        y: position.y,
    };

    if (direction === 'up') {
        newPosition.y -= MOVE_DISTANCE;
    }

    if (direction === 'down') {
        newPosition.y += MOVE_DISTANCE;
    }

    if (direction === 'left') {
        newPosition.x -= MOVE_DISTANCE;
    }

    if (direction === 'right') {
        newPosition.x += MOVE_DISTANCE;
    }

    // Keep Meowiee inside the map
    newPosition.x = Math.max(0, Math.min(4, newPosition.x));
    newPosition.y = Math.max(0, Math.min(4, newPosition.y));

    return newPosition;
}


/*
 * Find whether Meowiee is standing at a shop.
 */
function getShopAtPosition(position) {
    for (const [shopId, shopPosition] of Object.entries(SHOP_POSITIONS)) {
        if (
            shopPosition.x === position.x &&
            shopPosition.y === position.y
        ) {
            return shopId;
        }
    }

    return null;
}


/*
 * Create the game map displayed in Discord.
 */
function createGameMap(game) {
    const position = getPosition(game);

    const rows = [];

    for (let y = 1; y <= 4; y++) {
        let row = '';

        for (let x = 0; x <= 4; x++) {
            const here = x === position.x && y === position.y;

            const shop = Object.entries(SHOP_POSITIONS).find(
                ([, shopPosition]) =>
                    shopPosition.x === x &&
                    shopPosition.y === y
            );

            if (here) {
                row += '🐱 ';
            } else if (shop) {
                const shopId = shop[0];

                const emojis = {
                    clinic: '🏥',
                    game: '🎮',
                    toy: '🧸',
                    food: '🍔',
                    book: '📚',
                    cafe: '☕',
                    mall: '🛍️',
                };

                row += `${emojis[shopId]} `;
            } else {
                row += '⬜ ';
            }
        }

        rows.push(row);
    }

    return rows.join('\n');
}


export default {
    name: 'meowieeWork',

    async execute(interaction, client) {
        /*
         * Only handle Meowiee movement buttons.
         */
        if (!interaction.isButton()) return;

        const customId = interaction.customId;

        if (!customId.startsWith('meowiee_move_')) {
            return;
        }

        const direction = customId.replace(
            'meowiee_move_',
            ''
        );

        const guildId = interaction.guildId;
        const userId = interaction.user.id;

        if (!guildId) {
            return interaction.reply({
                content: '❌ This game can only be played inside a server.',
                ephemeral: true,
            });
        }

        const data = await getEconomyData(
            client,
            guildId,
            userId
        );

        const game = data.workTask;

        /*
         * Make sure this user actually has a Meowiee game.
         */
        if (!game || game.type !== 'meowiee_game') {
            return interaction.reply({
                content: '❌ You don't have an active Meowiee work task.',
                ephemeral: true,
            });
        }

        /*
         * Check the 5-minute timer.
         */
        if (isMeowieeGameExpired(game)) {
            game.status = 'failed';
            game.failureReason = 'timeout';

            data.workTask = null;

            /*
             * NOTE:
             * The actual -25 MeowCoins transaction will be
             * connected to your economy system next.
             */

            await saveEconomyData(
                client,
                guildId,
                userId,
                data
            );

            const embed = createEmbed({
                title: '💨 Meowiee Ran Away!',
                description:
                    `You ran out of time!\n\n` +
                    `Meowiee escaped and stole **${ESCAPE_PENALTY} MeowCoins**! 😭`,
            });

            return interaction.update({
                embeds: [embed],
                components: [],
            });
        }

        /*
         * Move Meowiee.
         */
        const currentPosition = getPosition(game);

        const newPosition = movePosition(
            currentPosition,
            direction
        );

        game.position = newPosition;

        /*
         * Check whether Meowiee reached a shop.
         */
        const shopId = getShopAtPosition(newPosition);

        if (shopId) {
            const correct = isCorrectDestination(
                game,
                shopId
            );

            /*
             * WRONG SHOP
             */
            if (!correct) {
                game.status = 'failed';
                game.failureReason = 'wrong_shop';
                game.wrongShop = shopId;

                data.workTask = null;

                await saveEconomyData(
                    client,
                    guildId,
                    userId,
                    data
                );

                const embed = createEmbed({
                    title: '😾 MEOWIEE WENT OUT OF CONTROL!',
                    description:
                        `You took Meowiee to the wrong shop!\n\n` +
                        `💸 Meowiee stole **${WRONG_SHOP_PENALTY} MeowCoins** from you!`,
                });

                return interaction.update({
                    embeds: [embed],
                    components: [],
                });
            }

            /*
             * CORRECT SHOP
             */
            game.status = 'completed';

            const reward = game.reward;

            data.workTask = null;

            /*
             * NOTE:
             * The actual +50–60 MeowCoins transaction will
             * be connected to your economy system next.
             */

            await saveEconomyData(
                client,
                guildId,
                userId,
                data
            );

            const embed = createEmbed({
                title: '🎉 JOB COMPLETE!',
                description:
                    `You successfully took Meowiee to the ` +
                    `${game.destination.emoji} **${game.destination.name}**!\n\n` +
                    `🪙 **+${reward} MeowCoins**`,
            });

            return interaction.update({
                embeds: [embed],
                components: [],
            });
        }

        /*
         * Save the new position.
         */
        await saveEconomyData(
            client,
            guildId,
            userId,
            data
        );

        /*
         * Update timer.
         */
        const timeLeft = getMeowieeGameTimeLeft(game);

        const embed = createEmbed({
            title: '🐱 Meowiee Work!',
            description:
                `📍 **Destination:** ` +
                `${game.destination.emoji} **${game.destination.name}**\n\n` +

                `⏱️ **Time:** ` +
                `**${formatGameTime(timeLeft)}**\n\n` +

                `🗺️ **Map:**\n` +
                '```' +
                `\n${createGameMap(game)}\n` +
                '```\n' +

                `🐾 Guide Meowiee to the correct shop!`,
        });

        await interaction.update({
            embeds: [embed],
            components: createMovementButtons(),
        });
    },
};


/*
 * Export this so work.js can use the same buttons.
 */
export {
    createMovementButtons,
    createGameMap,
};
