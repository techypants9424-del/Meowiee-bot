import { logger } from '../utils/logger.js';
import { getEconomyData, saveEconomyData } from '../utils/economy.js';

const ACTIVE_WINDOW = 2 * 60 * 1000; // 2 minutes
const MIN_MESSAGES = 5;
const MIN_USERS = 2;

const EVENT_DURATION = 30 * 1000; // 30 seconds
const EVENT_COOLDOWN = 5 * 60 * 1000; // 5 minutes
const REWARD = 50;

// Track recent messages per guild
const recentMessages = new Map();

// Track active events
const activeEvents = new Map();

// Track last event time
const lastEventTime = new Map();

export async function handleMeowEvent(message, client) {
  try {
    if (!message.guild || message.author.bot) {
      return;
    }

    const guildId = message.guild.id;
    const now = Date.now();

    // ==========================================
    // 1. CHECK IF A MEOW EVENT IS ALREADY ACTIVE
    // ==========================================

    const activeEvent = activeEvents.get(guildId);

    if (activeEvent) {
      // Only accept "meow" during the active event
      const meowRegex = /\bmeow\b/i;

      if (meowRegex.test(message.content)) {
        const winnerId = message.author.id;

        clearTimeout(activeEvent.timeout);
        activeEvents.delete(guildId);

        // Give the winner 50 MeowCoins
        const data = await getEconomyData(
          client,
          guildId,
          winnerId
        );

        data.wallet = (data.wallet || 0) + REWARD;

        await saveEconomyData(
          client,
          guildId,
          winnerId,
          data
        );

        await message.channel.send(
          `🐱 **MEOW!**\n\n` +
          `<@${winnerId}> was the first to say **meow**!\n` +
          `💰 You won **${REWARD} MeowCoins**!`
        );

        return;
      }

      return;
    }

    // ==========================================
    // 2. TRACK RECENT CHAT ACTIVITY
    // ==========================================

    if (!recentMessages.has(guildId)) {
      recentMessages.set(guildId, []);
    }

    const messages = recentMessages.get(guildId);

    messages.push({
      userId: message.author.id,
      timestamp: now,
      channelId: message.channel.id,
    });

    // Remove messages older than 2 minutes
    const cutoff = now - ACTIVE_WINDOW;

    const recent = messages.filter(
      (msg) => msg.timestamp >= cutoff
    );

    recentMessages.set(guildId, recent);

    // ==========================================
    // 3. CHECK ACTIVE CHAT
    // ==========================================

    if (recent.length < MIN_MESSAGES) {
      return;
    }

    const uniqueUsers = new Set(
      recent.map((msg) => msg.userId)
    );

    if (uniqueUsers.size < MIN_USERS) {
      return;
    }

    // ==========================================
    // 4. CHECK EVENT COOLDOWN
    // ==========================================

    const lastEvent = lastEventTime.get(guildId) || 0;

    if (now - lastEvent < EVENT_COOLDOWN) {
      return;
    }

    // ==========================================
    // 5. 50% CHANCE TO START EVENT
    // ==========================================

    if (Math.random() >= 0.5) {
      return;
    }

    // ==========================================
    // 6. START MEOW EVENT
    // ==========================================

    lastEventTime.set(guildId, now);

    const channelId = message.channel.id;

    const timeout = setTimeout(() => {
      activeEvents.delete(guildId);

      client.channels
        .fetch(channelId)
        .then((channel) => {
          if (channel) {
            channel.send(
              `🐱 **Meow Event ended!**\n` +
              `Nobody said **meow** in time! 😿`
            ).catch(() => {});
          }
        })
        .catch(() => {});
    }, EVENT_DURATION);

    activeEvents.set(guildId, {
      channelId,
      timeout,
    });

    await message.channel.send(
      `🐱 **MEOW EVENT!**\n\n` +
      `Whoever says **meow** first gets **${REWARD} MeowCoins!**\n` +
      `⏰ You have **30 seconds!**`
    );

  } catch (error) {
    logger.error('Error handling Meow Event:', error);
  }
}
