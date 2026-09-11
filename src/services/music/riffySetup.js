```js
import { createRequire } from 'module';
import { GatewayDispatchEvents } from 'discord.js';
import { logger } from '../../utils/logger.js';
import lavalinkConfig from '../../config/music/lavalink.js';
import { setupPlayerHandler } from './playerHandler.js';

const require = createRequire(import.meta.url);
const { Riffy } = require('riffy');

export function initializeMusic(client) {
    if (!lavalinkConfig.nodes?.length) {
        logger.error(
            'No Lavalink nodes configured. Add lavalink/nodes.json, set LAVALINK_NODES, or set LAVALINK_HOST in your environment.',
        );
        return;
    }

    client.riffy = new Riffy(client, lavalinkConfig.nodes, {
        send: (payload) => {
            const guildId = payload?.d?.guild_id;

            if (!guildId) {
                return;
            }

            const guild = client.guilds.cache.get(guildId);

            if (guild?.shard) {
                guild.shard.send(payload);
                return;
            }

            const shardCount = client.ws.shards.size || 1;
            const shardId = Number(
                (BigInt(guildId) >> 22n) % BigInt(shardCount),
            );

            client.ws.shards.get(shardId)?.send(payload);
        },

        defaultSearchPlatform: lavalinkConfig.defaultSearchPlatform,
        restVersion: lavalinkConfig.restVersion,

        bypassChecks: {
            nodeFetchInfo: true,
        },
    });

    setupPlayerHandler(client);

    // Riffy MUST receive Discord voice state updates.
    client.on('raw', (packet) => {
        if (
            packet.t !== GatewayDispatchEvents.VoiceStateUpdate &&
            packet.t !== GatewayDispatchEvents.VoiceServerUpdate
        ) {
            return;
        }

        client.riffy.updateVoiceState(packet);
    });

    // IMPORTANT:
    // Riffy must be initialized AFTER Discord is ready.
    client.once('ready', () => {
        if (!client.riffy || !client.user?.id) {
            logger.error('Riffy could not initialize: Discord client is not ready.');
            return;
        }

        try {
            client.riffy.init(client.user.id);
            logger.info(`Riffy initialized as ${client.user.tag}.`);
        } catch (error) {
            logger.error('Failed to initialize Riffy:', error);
        }
    });

    client.riffy.on('nodeConnect', (node) => {
        logger.info(`Lavalink node "${node.name}" connected.`);
    });

    client.riffy.on('nodeDisconnect', (node, error) => {
        logger.warn(
            `Lavalink node "${node.name}" disconnected.${error ? ` ${error.message}` : ''}`,
        );
    });

    client.riffy.on('nodeError', (node, error) => {
        logger.error(
            `Lavalink node "${node.name}" error:`,
            error,
        );
    });

    client.riffy.on('playerError', (player, error) => {
        logger.error(
            `Music player error in guild ${player.guildId}:`,
            error,
        );
    });

    logger.info(
        `Music initialized with ${lavalinkConfig.nodes.length} Lavalink node(s).`,
    );
}

/*
 * Kept for compatibility in case another part of the project
 * wants to initialize Riffy manually after Discord becomes ready.
 */
export function initRiffyAfterReady(client) {
    if (!client.riffy || !client.user?.id) {
        return;
    }

    try {
        client.riffy.init(client.user.id);
        logger.info('Riffy voice connection manager initialized.');
    } catch (error) {
        logger.error('Failed to initialize Riffy:', error);
    }
}
```
