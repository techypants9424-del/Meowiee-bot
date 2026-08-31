// src/utils/meowieeWorkGame.js

/**
 * Meowiee Work Mini-Game
 *
 * This file contains the data and logic for the Meowiee
 * destination mini-game.
 *
 * Work has a 50/50 chance:
 *  - Normal work: send 10 messages
 *  - Meowiee mini-game: take Meowiee to the correct shop
 */

const MINIGAME_TIME = 5 * 60 * 1000; // 5 minutes

// Successful mini-game reward
const REWARD_MIN = 50;
const REWARD_MAX = 60;

// Penalties
const WRONG_SHOP_PENALTY = 30;
const ESCAPE_PENALTY = 25;

// Available destinations
const SHOPS = [
    {
        id: 'food',
        name: 'Food Shop',
        emoji: '🍔',
    },
    {
        id: 'cafe',
        name: 'Café',
        emoji: '☕',
    },
    {
        id: 'toy',
        name: 'Toy Shop',
        emoji: '🧸',
    },
    {
        id: 'game',
        name: 'Game Shop',
        emoji: '🎮',
    },
    {
        id: 'book',
        name: 'Book Shop',
        emoji: '📚',
    },
    {
        id: 'mall',
        name: 'Mall',
        emoji: '🛍️',
    },
    {
        id: 'clinic',
        name: 'Clinic',
        emoji: '🏥',
    },
];

/**
 * Random number helper
 */
function randomNumber(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Pick a random shop.
 */
export function getRandomShop() {
    return SHOPS[Math.floor(Math.random() * SHOPS.length)];
}

/**
 * Generate a new Meowiee mini-game.
 */
export function createMeowieeGame(now = Date.now()) {
    const destination = getRandomShop();

    return {
        type: 'meowiee_game',

        // Random destination
        destination: {
            id: destination.id,
            name: destination.name,
            emoji: destination.emoji,
        },

        // Random reward between 50 and 60
        reward: randomNumber(REWARD_MIN, REWARD_MAX),

        // Game timing
        startedAt: now,
        expiresAt: now + MINIGAME_TIME,

        // Game state
        status: 'active',
        wrongShopPenalty: WRONG_SHOP_PENALTY,
        escapePenalty: ESCAPE_PENALTY,
    };
}

/**
 * Check whether the mini-game has expired.
 */
export function isMeowieeGameExpired(game, now = Date.now()) {
    if (!game || game.type !== 'meowiee_game') {
        return true;
    }

    return now >= game.expiresAt;
}

/**
 * Get remaining time in milliseconds.
 */
export function getMeowieeGameTimeLeft(game, now = Date.now()) {
    if (!game || game.type !== 'meowiee_game') {
        return 0;
    }

    return Math.max(0, game.expiresAt - now);
}

/**
 * Check whether the player reached the correct shop.
 */
export function isCorrectDestination(game, shopId) {
    if (!game || game.type !== 'meowiee_game') {
        return false;
    }

    return game.destination.id === shopId;
}

/**
 * Format the remaining game time.
 */
export function formatGameTime(milliseconds) {
    const totalSeconds = Math.max(
        0,
        Math.floor(milliseconds / 1000)
    );

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Get all available shops.
 *
 * Returns a copy so the original array cannot accidentally
 * be modified by another file.
 */
export function getAvailableShops() {
    return [...SHOPS];
}

/**
 * Constants used by work.js and the game handler.
 */
export {
    SHOPS,
    MINIGAME_TIME,
    REWARD_MIN,
    REWARD_MAX,
    WRONG_SHOP_PENALTY,
    ESCAPE_PENALTY,
};
