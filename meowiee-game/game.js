// meowiee-game/game.js

const gameArea = document.getElementById('gameArea');
const meowiee = document.getElementById('meowiee');
const timerElement = document.getElementById('timer');
const taskText = document.getElementById('taskText');

const statusPanel = document.getElementById('statusPanel');
const statusEmoji = document.getElementById('statusEmoji');
const statusTitle = document.getElementById('statusTitle');
const statusMessage = document.getElementById('statusMessage');
const rewardText = document.getElementById('rewardText');
const closeButton = document.getElementById('closeButton');

const shops = [
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

const GAME_DURATION = 5 * 60 * 1000;
const WRONG_SHOP_PENALTY = 30;
const ESCAPE_PENALTY = 25;

let destination;
let gameActive = true;
let startTime = Date.now();
let timerInterval;

let catX = 50;
let catY = 75;

let targetX = catX;
let targetY = catY;

let moveAnimation;


/* =========================================
   RANDOM DESTINATION
========================================= */

function chooseDestination() {
    const randomIndex = Math.floor(Math.random() * shops.length);

    return shops[randomIndex];
}


/* =========================================
   RANDOM REWARD
========================================= */

function getReward() {
    return Math.floor(Math.random() * 11) + 50;
}


/* =========================================
   INITIALIZE GAME
========================================= */

function startGame() {
    destination = chooseDestination();

    taskText.textContent =
        `Take Meowiee to the ${destination.emoji} ${destination.name}!`;

    startTime = Date.now();
    gameActive = true;

    positionCat(catX, catY);

    startTimer();
}


/* =========================================
   TIMER
========================================= */

function startTimer() {
    updateTimer();

    timerInterval = setInterval(() => {
        if (!gameActive) {
            clearInterval(timerInterval);
            return;
        }

        updateTimer();
    }, 250);
}


function updateTimer() {
    const elapsed = Date.now() - startTime;
    const remaining = Math.max(0, GAME_DURATION - elapsed);

    const totalSeconds = Math.floor(remaining / 1000);

    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    timerElement.textContent =
        `${minutes}:${String(seconds).padStart(2, '0')}`;

    if (remaining <= 0) {
        loseGame('timeout');
    }
}


/* =========================================
   CAT POSITION
========================================= */

function positionCat(x, y) {
    catX = Math.max(3, Math.min(97, x));
    catY = Math.max(5, Math.min(95, y));

    meowiee.style.left = `${catX}%`;
    meowiee.style.top = `${catY}%`;
}


/* =========================================
   MOVE CAT
========================================= */

function moveCatTo(x, y) {
    if (!gameActive) return;

    targetX = Math.max(3, Math.min(97, x));
    targetY = Math.max(5, Math.min(95, y));

    if (moveAnimation) {
        cancelAnimationFrame(moveAnimation);
    }

    animateCat();
}


function animateCat() {
    if (!gameActive) return;

    const speed = 0.045;

    const dx = targetX - catX;
    const dy = targetY - catY;

    catX += dx * speed;
    catY += dy * speed;

    positionCat(catX, catY);

    checkShopCollision();

    if (
        Math.abs(dx) > 0.15 ||
        Math.abs(dy) > 0.15
    ) {
        moveAnimation = requestAnimationFrame(animateCat);
    }
}


/* =========================================
   MOUSE CONTROL
========================================= */

gameArea.addEventListener('mousemove', (event) => {
    if (!gameActive) return;

    const rect = gameArea.getBoundingClientRect();

    const x =
        ((event.clientX - rect.left) / rect.width) * 100;

    const y =
        ((event.clientY - rect.top) / rect.height) * 100;

    moveCatTo(x, y);
});


/* =========================================
   MOBILE TOUCH CONTROL
========================================= */

gameArea.addEventListener(
    'touchstart',
    handleTouch,
    { passive: false }
);

gameArea.addEventListener(
    'touchmove',
    handleTouch,
    { passive: false }
);


function handleTouch(event) {
    if (!gameActive) return;

    event.preventDefault();

    const touch = event.touches[0];

    if (!touch) return;

    const rect = gameArea.getBoundingClientRect();

    const x =
        ((touch.clientX - rect.left) / rect.width) * 100;

    const y =
        ((touch.clientY - rect.top) / rect.height) * 100;

    moveCatTo(x, y);
}


/* =========================================
   SHOP COLLISION
========================================= */

function checkShopCollision() {
    if (!gameActive) return;

    const catRect = meowiee.getBoundingClientRect();

    for (const shop of shops) {
        const shopElement =
            document.getElementById(`shop-${shop.id}`);

        if (!shopElement) continue;

        const shopRect =
            shopElement.getBoundingClientRect();

        const collision =
            catRect.left < shopRect.right &&
            catRect.right > shopRect.left &&
            catRect.top < shopRect.bottom &&
            catRect.bottom > shopRect.top;

        if (collision) {
            handleShopEntered(shop);
            return;
        }
    }
}


/* =========================================
   SHOP RESULT
========================================= */

function handleShopEntered(shop) {
    if (!gameActive) return;

    if (shop.id === destination.id) {
        winGame();
    } else {
        loseGame('wrong_shop', shop);
    }
}


/* =========================================
   WIN
========================================= */

function winGame() {
    gameActive = false;

    clearInterval(timerInterval);

    const reward = getReward();

    statusEmoji.textContent = '🎉';

    statusTitle.textContent = 'JOB COMPLETE!';

    statusMessage.textContent =
        `You safely took Meowiee to the ${destination.emoji} ${destination.name}!`;

    rewardText.textContent =
        `🪙 +${reward} MeowCoins`;

    statusPanel.classList.remove('hidden');

    /*
     * IMPORTANT:
     *
     * The reward is currently only displayed.
     *
     * Later we will send this result to your
     * Meowiee bot/server so the actual MeowCoins
     * are added safely through your economy system.
     */
}


/* =========================================
   LOSE
========================================= */

function loseGame(reason, shop = null) {
    if (!gameActive) return;

    gameActive = false;

    clearInterval(timerInterval);

    if (reason === 'wrong_shop') {
        statusEmoji.textContent = '😾';

        statusTitle.textContent =
            'MEOWIEE WENT OUT OF CONTROL!';

        statusMessage.textContent =
            `You took Meowiee to the ${shop.emoji} ${shop.name} instead of the ${destination.emoji} ${destination.name}.`;

        rewardText.textContent =
            `💸 -${WRONG_SHOP_PENALTY} MeowCoins`;

    } else if (reason === 'timeout') {
        statusEmoji.textContent = '💨';

        statusTitle.textContent =
            'MEOWIEE RAN AWAY!';

        statusMessage.textContent =
            `You ran out of time before getting Meowiee to the ${destination.emoji} ${destination.name}!`;

        rewardText.textContent =
            `💸 Meowiee stole ${ESCAPE_PENALTY} MeowCoins!`;
    }

    statusPanel.classList.remove('hidden');
}


/* =========================================
   CLOSE BUTTON
========================================= */

closeButton.addEventListener('click', () => {
    /*
     * Later this can return the player to Discord
     * or close the game window.
     */

    window.close();
});


/* =========================================
   START
========================================= */

startGame();
