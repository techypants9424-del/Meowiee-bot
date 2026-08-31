// src/utils/meowieeWorkGame.js

/**
 * Meowiee Work Mini-Game
 *
 * 50/50 chance from /work:
 *  - Normal work: send 10 messages
 *  - Meowiee game: guide Meowiee to a randomly selected shop
 */

const MINIGAME_TIME = 5 * 60 * 1000; // 5 minutes

const REWARD_MIN = 50;
const REWARD_MAX = 60;

const WRONG_SHOP_PENALTY = 30;
const ESCAPE_PENALTY = 25;

// ==========================================
// MAP
// ==========================================

const MAP_WIDTH = 5;
const MAP_HEIGHT = 4;

const START_POSITION = {
    x: 2,
    y: 2,
};

// ==========================================
// SHOPS
// ==========================================

const SHOPS = [
    {
        id: 'food',
        name: 'Food Shop',
        emoji: '🍔',
        x: 4,
        y: 2,
    },

    {
        id: 'cafe',
        name: 'Café',
        emoji: '☕',
        x: 3,
        y: 3,
    },

    {
        id: 'toy',
        name: 'Toy Shop',
        emoji: '🧸',
        x: 0,
        y: 2,
    },

    {
        id: 'game',
        name: 'Game Shop',
        emoji: '🎮',
        x: 3,
        y: 1,
    },

    {
        id: 'book',
        name: 'Book Shop',
        emoji: '📚',
        x: 1,
        y: 3,
    },

    {
        id: 'mall',
        name: 'Mall',
        emoji: '🛍️',
        x: 2,
        y: 4,
    },

    {
        id: 'clinic',
        name: 'Clinic',
        emoji: '🏥',
        x: 1,
        y: 1,
    },
];

// ==========================================
// RANDOM NUMBER
// ==========================================

function randomNumber(min, max) {
    return Math.floor(
        Math.random() * (max - min + 1)
    ) + min;
}

// ==========================================
// RANDOM SHOP
// ==========================================

export function getRandomShop() {
    return SHOPS[
        Math.floor(Math.random() * SHOPS.length)
    ];
}

// ==========================================
// CREATE GAME
// ==========================================

export function createMeowieeGame(now = Date.now()) {
    const destination = getRandomShop();

    return {
        type: 'meowiee_game',

        destination: {
            id: destination.id,
            name: destination.name,
            emoji: destination.emoji,
        },

        reward: randomNumber(
            REWARD_MIN,
            REWARD_MAX
        ),

        startedAt: now,

        expiresAt:
            now + MINIGAME_TIME,

        position: {
            ...START_POSITION,
        },

        status: 'active',

        wrongShopPenalty:
            WRONG_SHOP_PENALTY,

        escapePenalty:
            ESCAPE_PENALTY,
    };
}

// ==========================================
// MOVE MEOWIEE
// ==========================================

export function moveMeowiee(
    position,
    direction
) {
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

    // Keep Meowiee inside map
    newPosition.x = Math.max(
        0,
        Math.min(
            MAP_WIDTH - 1,
            newPosition.x
        )
    );

    newPosition.y = Math.max(
        1,
        Math.min(
            MAP_HEIGHT,
            newPosition.y
        )
    );

    return newPosition;
}

// ==========================================
// FIND SHOP
// ==========================================

export function getShopAtPosition(position) {
    return SHOPS.find(
        shop =>
            shop.x === position.x &&
            shop.y === position.y
    ) || null;
}

// ==========================================
// CREATE MAP
// ==========================================

export function createMeowieeMap(position) {
    const rows = [];

    for (
        let y = 1;
        y <= MAP_HEIGHT;
        y++
    ) {
        let row = '';

        for (
            let x = 0;
            x < MAP_WIDTH;
            x++
        ) {
            // Meowiee
            if (
                position.x === x &&
                position.y === y
            ) {
                row += '🐱 ';
                continue;
            }

            // Shop
            const shop = SHOPS.find(
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

        rows.push(row);
    }

    return rows.join('\n');
}

// ==========================================
// TIMER
// ==========================================

export function isMeowieeGameExpired(
    game,
    now = Date.now()
) {
    if (
        !game ||
        game.type !== 'meowiee_game'
    ) {
        return true;
    }

    return now >= game.expiresAt;
}

export function getMeowieeGameTimeLeft(
    game,
    now = Date.now()
) {
    if (
        !game ||
        game.type !== 'meowiee_game'
    ) {
        return 0;
    }

    return Math.max(
        0,
        game.expiresAt - now
    );
}

// ==========================================
// CORRECT DESTINATION
// ==========================================

export function isCorrectDestination(
    game,
    shopId
) {
    if (
        !game ||
        game.type !== 'meowiee_game'
    ) {
        return false;
    }

    return game.destination.id === shopId;
}

// ==========================================
// FORMAT TIME
// ==========================================

export function formatGameTime(
    milliseconds
) {
    const totalSeconds = Math.max(
        0,
        Math.floor(milliseconds / 1000)
    );

    const minutes =
        Math.floor(
            totalSeconds / 60
        );

    const seconds =
        totalSeconds % 60;

    return `${minutes}:${String(
        seconds
    ).padStart(2, '0')}`;
}

// ==========================================
// EXPORTS
// ==========================================

export {
    SHOPS,
    START_POSITION,
    MAP_WIDTH,
    MAP_HEIGHT,
    MINIGAME_TIME,
    REWARD_MIN,
    REWARD_MAX,
    WRONG_SHOP_PENALTY,
    ESCAPE_PENALTY,
};
