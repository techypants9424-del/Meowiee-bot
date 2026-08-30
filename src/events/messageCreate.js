import { Events, EmbedBuilder } from 'discord.js';
import { logger } from '../utils/logger.js';
import { getLevelingConfig, getUserLevelData } from '../services/leveling/leveling.js';
import { addXp } from '../services/leveling/xpSystem.js';
import { checkRateLimit } from '../utils/rateLimiter.js';
import { parsePrefixCommand } from '../utils/prefixParser.js';
import { supportsPrefixExecution, executePrefixCommand, resolvePrefixAccessKey } from '../utils/messageAdapter.js';
import { resolveCommandAlias, resolveSubcommandAlias } from '../config/commands/commandAliases.js';
import { getPrefixRestriction } from '../config/commands/prefixRestrictions.js';
import { getGuildConfig } from '../services/config/guildConfig.js';
import { getCommandPrefix, getBotMessage, isBotOwner, isCommandCategoryEnabled, isMaintenanceMode } from '../config/bot.js';
import { enforceAbuseProtection, formatCooldownDuration } from '../utils/abuseProtection.js';
import { createEmbed } from '../utils/embeds.js';
import { isCommandEnabled } from '../services/commandAccessService.js';
import {
  getCountingGameConfig,
  saveCountingGameConfig,
  isValidCountingMessage,
  recordCorrectCount,
} from '../services/countingGameService.js';
import { getEconomyData, saveEconomyData } from '../utils/economy.js';

const MESSAGE_XP_RATE_LIMIT_ATTEMPTS = 12;
const MESSAGE_XP_RATE_LIMIT_WINDOW_MS = 10000;


export default {
  name: Events.MessageCreate,
  async execute(message, client) {
    try {
      if (message.author.bot || !message.guild) return;

      logger.debug(`Message received from ${message.author.tag}: ${message.content}`);

   const countingProcessed = await handleCountingGame(message, client);
if (countingProcessed) {
  return;
}

await handlePrefixCommand(message, client);

const reactionProcessed = await handleMeowieeReactions(message);
if (reactionProcessed) {
  return;
}

await handleWorkTask(message, client);

await handleLeveling(message, client);
    } catch (error) {
      logger.error('Error in messageCreate event:', error);
    }
  }
};
async function handleMeowieeReactions(message) {
  try {
    const word = message.content.trim().toLowerCase();

    const gifs = {
      yes: [
        'https://media1.tenor.com/m/dscrHX9CbssAAAAC/anime-ok.gif',
        'https://media1.tenor.com/m/_2dT6aW89tkAAAAC/keppeki-danshi-aoyama-kun-clean-freak-aoyama-kun.gif',
        'https://media1.tenor.com/m/KWpFVQPCRoYAAAAC/yes-anime.gif',
      ],

      no: [
        'https://media1.tenor.com/m/U_akTeYNf3oAAAAC/nope-anime.gif',
        'https://media1.tenor.com/m/0zfqxlPxYOYAAAAC/bocchi-the-rock-bocchi.gif',
        'https://media1.tenor.com/m/i3lUx_zoGZwAAAAC/k-on.gif',
      ],

      huh: [
        'https://media1.tenor.com/m/2ZuUWp5LDfIAAAAC/konata-lucky-star.gif',
        'https://media1.tenor.com/m/O-F65peFwqIAAAAC/gs-cingrey.gif',
        'https://media1.tenor.com/m/0ys1EkmlK48AAAAC/esiledoodles-esiledoodles-cora.gif',
      ],

      sorry: [
        'https://media.tenor.com/bFIY3KTS3-EAAAAi/vtuber-nuwa-ceres.gif',
        'https://media1.tenor.com/m/mQRY9rnQFc8AAAAC/anime-fox.gif',
        'https://media1.tenor.com/m/Up7hRFmFY9AAAAAd/anime-sad-anime-pout.gif',
      ],
    };

    // Only react to exactly:
    // yes
    // no
    // huh
    // sorry
    if (!gifs[word]) {
      return false;
    }

    // Pick one of the 3 GIFs randomly
    const randomGif =
      gifs[word][Math.floor(Math.random() * gifs[word].length)];

    // Display name of the user
    const displayName =
      message.member?.displayName ||
      message.author.globalName ||
      message.author.username;

    // User avatar
    const avatar = message.author.displayAvatarURL({
      extension: 'png',
      size: 128,
    });

    const embed = new EmbedBuilder()
      .setAuthor({
        name: `${displayName} says ${word}!`,
        iconURL: avatar,
      })
      .setImage(randomGif);

    await message.channel.send({
      embeds: [embed],
    });

    return true;
  } catch (error) {
    logger.error('Error handling Meowiee word reaction:', error);
    return false;
  }
}
async function handleWorkTask(message, client) {
  try {
    const guildId = message.guild.id;
    const userId = message.author.id;

    const data = await getEconomyData(client, guildId, userId);

    const task = data.workTask;

    // No active work task
    if (!task) {
      return;
    }

    // Task expired
    if (Date.now() > task.expiresAt) {
      delete data.workTask;
      await saveEconomyData(client, guildId, userId, data);

      await message.channel.send({
        content: `⏰ <@${userId}> your work task expired! Run \`/work\` to get a new task.`,
      }).catch(() => {});

      return;
    }

    // Only count message tasks
    if (task.type !== 'messages') {
      return;
    }

    // Don't count empty messages
    if (!message.content || !message.content.trim()) {
      return;
    }

    // Increase progress
    task.progress += 1;

    // Task completed
    if (task.progress >= task.required) {
      const reward = task.reward;

      data.wallet = (data.wallet || 0) + reward;

      delete data.workTask;

      await saveEconomyData(client, guildId, userId, data);

      await message.channel.send({
        content:
          `🎉 **Work Complete!**\n\n` +
          `<@${userId}> completed their work task!\n` +
          `💰 You earned **${reward.toLocaleString()} MeowCoins**!`,
      }).catch(() => {});

      return;
    }

    // Save progress
    await saveEconomyData(client, guildId, userId, data);

  } catch (error) {
    logger.error('Error handling work task:', error);
  }
}
async function handlePrefixCommand(message, client) {
  try {
    const guildConfig = await getGuildConfig(client, message.guild.id);

    // Prefixless command handling:
    // "help", "ping", "ticket" instead of "!help", "!ping", "!ticket"
    const content = message.content.trim();

    if (!content) {
      return;
    }

    const parts = content.split(/\s+/);
    let commandName = parts.shift().toLowerCase();
    let args = parts;

    // Music shortcuts
    const musicPrefixShortcut = commandName.toLowerCase();
    const MUSIC_PREFIX_SHORTCUTS = new Set([
      'leave',
      'pause',
      'resume',
      'skip',
      'stop',
      'volume',
    ]);

    if (MUSIC_PREFIX_SHORTCUTS.has(musicPrefixShortcut)) {
      commandName = 'music';
      args = [musicPrefixShortcut, ...args];
    }

    logger.info(
      `Prefixless command detected: ${commandName}, args: ${args.join(', ')}`
    );

    const resolvedCommandName = resolveCommandAlias(commandName);
    logger.info(`Resolved command name: ${resolvedCommandName}`);

    const command = client.commands.get(resolvedCommandName);

    if (!command) {
      // Not a command — ignore normal messages.
      return;
    }

    if (isMaintenanceMode() && !isBotOwner(message.author.id)) {
      await message.channel.send({
        embeds: [
          createEmbed({
            title: 'Maintenance Mode',
            description: getBotMessage('maintenanceMode'),
            color: 'warning',
          }),
        ],
      }).catch(() => {});
      return;
    }

    if (!isCommandCategoryEnabled(command.category)) {
      await message.channel.send({
        embeds: [
          createEmbed({
            title: 'Feature Disabled',
            description: getBotMessage('commandDisabled'),
            color: 'error',
          }),
        ],
      }).catch(() => {});
      return;
    }

    const restriction = getPrefixRestriction(
      command,
      args,
      resolveSubcommandAlias
    );

    if (!supportsPrefixExecution(command) || restriction.blocked) {
      if (restriction.blocked && restriction.reason) {
        const embed = createEmbed({
          title: 'Slash Command Only',
          description: `${restriction.reason}\nUse \`/${resolvedCommandName}\` instead.`,
          color: 'info',
        });

        await message.channel.send({ embeds: [embed] }).catch(() => {});
      }

      return;
    }

    if (
      !(await isCommandEnabled(
        client,
        message.guild.id,
        resolvePrefixAccessKey(command.data, args),
        command.category
      ))
    ) {
      const embed = createEmbed({
        title: 'Command Disabled',
        description: 'This command has been disabled for this server.',
        color: 'error',
      });

      await message.channel.send({ embeds: [embed] }).catch(() => {});
      return;
    }

    const mockInteractionForProtection = {
      guildId: message.guild.id,
      user: message.author,
    };

    const abuseProtection = await enforceAbuseProtection(
      mockInteractionForProtection,
      command,
      resolvedCommandName
    );

    if (!abuseProtection.allowed) {
      const formattedCooldown = formatCooldownDuration(
        abuseProtection.remainingMs
      );

      const embed = createEmbed({
        title: 'Command Cooldown',
        description: `This command is on cooldown. Please wait ${formattedCooldown} before trying again.`,
        color: 'error',
      });

      await message.channel.send({ embeds: [embed] }).catch(() => {});
      return;
    }

    logger.info(
      `Executing prefixless command: ${commandName} (resolved to ${resolvedCommandName}) by ${message.author.tag}`
    );

    // Empty prefix because commands are now prefixless.
    await executePrefixCommand(
      command,
      message,
      args,
      client,
      '',
      guildConfig
    );
  } catch (error) {
    logger.error('Error handling prefixless command:', error);
  }
}

async function handleCountingGame(message, client) {
  try {
    const config = await getCountingGameConfig(client, message.guild.id);
    if (!config.enabled || !config.channelId || message.channel.id !== config.channelId) {
      return false;
    }

    const content = message.content.trim();
    const validCount = isValidCountingMessage(content, config);
    const invalidAttempt = !validCount || message.author.id === config.lastUserId;

    if (invalidAttempt) {
      await message.delete().catch(() => {});
      await saveCountingGameConfig(client, message.guild.id, {
        ...config,
        nextNumber: 1,
        lastUserId: null,
        currentStreak: 0,
      });

      const failureMessage = await message.channel.send(`❌ Count broken by <@${message.author.id}>. The sequence has been reset to **1**.`);
      setTimeout(() => {
        failureMessage.delete().catch(() => {});
      }, 10000);

      return true;
    }

    await recordCorrectCount(client, message.guild.id, message.author.id);
    return true;
  } catch (error) {
    logger.error('Error handling counting game:', error);
    return false;
  }
}

async function handleLeveling(message, client) {
  try {
    const rateLimitKey = `xp-event:${message.guild.id}:${message.author.id}`;
    const canProcess = await checkRateLimit(rateLimitKey, MESSAGE_XP_RATE_LIMIT_ATTEMPTS, MESSAGE_XP_RATE_LIMIT_WINDOW_MS);
    if (!canProcess) {
      return;
    }


    const levelingConfig = await getLevelingConfig(client, message.guild.id);
    
    if (!levelingConfig?.enabled) {
      return;
    }

    if (levelingConfig.ignoredChannels?.includes(message.channel.id)) {
      return;
    }

    if (levelingConfig.ignoredRoles?.length > 0) {
      const member = await message.guild.members.fetch(message.author.id).catch(() => {
        return null;
      });
      if (member && member.roles.cache.some(role => levelingConfig.ignoredRoles.includes(role.id))) {
        return;
      }
    }

    if (levelingConfig.blacklistedUsers?.includes(message.author.id)) {
      return;
    }

    if (!message.content || message.content.trim().length === 0) {
      return;
    }

    const userData = await getUserLevelData(client, message.guild.id, message.author.id);

    const cooldownTime = levelingConfig.xpCooldown || 60;
    const now = Date.now();
    const timeSinceLastMessage = now - (userData.lastMessage || 0);

    if (timeSinceLastMessage < cooldownTime * 1000) {
      return;
    }

    const minXP = levelingConfig.xpRange?.min || levelingConfig.xpPerMessage?.min || 15;
    const maxXP = levelingConfig.xpRange?.max || levelingConfig.xpPerMessage?.max || 25;

    const safeMinXP = Math.max(1, minXP);
    const safeMaxXP = Math.max(safeMinXP, maxXP);

    const xpToGive = Math.floor(Math.random() * (safeMaxXP - safeMinXP + 1)) + safeMinXP;

    let finalXP = xpToGive;
    if (levelingConfig.xpMultiplier && levelingConfig.xpMultiplier > 1) {
      finalXP = Math.floor(finalXP * levelingConfig.xpMultiplier);
    }

    const result = await addXp(client, message.guild, message.member, finalXP);

    if (result?.leveledUp) {
      logger.info(
        `${message.author.tag} leveled up to level ${result.level} in ${message.guild.name}`
      );
    }
  } catch (error) {
    logger.error('Error handling leveling for message:', error);
  }
}
