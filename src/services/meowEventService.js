import { logger } from '../utils/logger.js';
import { getEconomyData, saveEconomyData } from '../utils/economy.js';

const EVENT_DURATION = 30 * 1000; // 30 seconds
const EVENT_COOLDOWN = 5 * 60 * 1000; // 5 minutes

const activeEvents = new Map();
const lastEventTime = new Map();

export async function handleMeowEvent(message, client) {
  try {
    if (!message.guild || message.author.bot) {
      return;
    }

    const guildId = message.guild.id;
    const content = message.content.toLowerCase();

    // --------------------------------
    // 1. Check if an event is already active
    // --------------------------------
    const activeEvent = activeEvents.get(guildId);

    if (activeEvent) {
      const meowRegex = /\bmeow\b/i;

      if (meowRegex.test(content)) {
        const winnerId = message.author.id;

        clearTimeout(activeEvent.timeout);
        activeEvents.delete(guildId);

        const data = await getEconomyData(client, guildId, winnerId);

        data.wallet = (data.wallet || 0) + 50;

        await saveEconomyData(client, guildId, winnerId, data);

        await message.channel.send(
          `🐱 **MEOW!** <@${winnerId}> was first!\n💰 You won **50 MeowCoins**!`
        );

        return;
      }

      return;
    }

    // --------------------------------
    // 2. Check event cooldown
    // --------------------------------
    const lastEvent = lastEventTime.get(guildId) || 0;

    if (Date.now() - lastEvent < EVENT_COOLDOWN) {
      return;
    }

    // --------------------------------
    // 3. Random 50% chance
    // --------------------------------
    if (Math.random() > 0.5) {
      return;
    }

    // --------------------------------
    // 4. Start the event
    // --------------------------------
    lastEventTime.set(guildId, Date.now());

    const timeout = setTimeout(() => {
      activeEvents.delete(guildId);
    }, EVENT_DURATION);

    activeEvents.set(guildId, {
      channelId: message.channel.id,
      timeout,
    });

    await message.channel.send(
      `🐱 **MEOW EVENT!**\n\n` +
      `Whoever says **meow** first gets **50 MeowCoins!**\n` +
      `You have **30 seconds!** 👀`
    );

  } catch (error) {
    logger.error('Error handling Meow Event:', error);
  }
}
