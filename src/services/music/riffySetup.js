import { createRequire } from 'module';
import { GatewayDispatchEvents } from 'discord.js';
import lavalinkConfig from '../../config/music/lavalink.js';
import { logger } from '../../utils/logger.js';
import { setupPlayerHandler } from './playerHandler.js';

const require = createRequire(import.meta.url);
const { Riffy } = require('riffy');

export function initializeMusic(client) {
    if (!lavalinkConfig.nodes?.length) {
        logger.error(
            'No Lavalink nodes configured. Add lavalink/nodes.json, set LAVALINK_NODES, or set LAVALINK_HOST in your environment.'
        );
        return;
    }

    client.riffy = new Riffy(client, lavalinkConfig.nodes, {
        send: (payload) => {
            const guildId = payload.d?.guild_id;

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
                (BigInt(guildId) >> 22n) % BigInt(shardCount)
            );

            client.ws.shards.get(shardId)?.send(payload);
        },

        defaultSearchPlatform:
            lavalinkConfig.defaultSearchPlatform,

        restVersion:
            lavalinkConfig.restVersion,

        // Keep trying if a Lavalink node disconnects.
        reconnectTries: Infinity,
        reconnectTimeout: 5000,

        bypassChecks: {
            nodeFetchInfo: true,
        },
    });

    setupPlayerHandler(client);

    // Forward Discord voice events to Riffy.
    client.on('raw', (packet) => {
        if (
            packet.t !== GatewayDispatchEvents.VoiceStateUpdate &&
            packet.t !== GatewayDispatchEvents.VoiceServerUpdate
        ) {
            return;
        }

        client.riffy.updateVoiceState(packet);
    });

    // Initialize Riffy after Discord is ready.
    client.once('ready', () => {
        if (!client.riffy || !client.user?.id) {
            logger.error(
                'Riffy could not initialize because the Discord client is not ready.'
            );
            return;
        }

        try {
            client.riffy.init(client.user.id);

            logger.info(
                `Riffy initialized as ${client.user.tag}.`
            );
        } catch (error) {
            logger.error(
                'Failed to initialize Riffy:',
                error
            );
        }
    });

    // Lavalink node connected.
    client.riffy.on('nodeConnect', (node) => {
        logger.info(
            `Lavalink node "${node.name}" connected.`
        );
    });

    // Lavalink node disconnected.
    client.riffy.on('nodeDisconnect', (node) => {
        logger.warn(
            `Lavalink node "${node.name}" disconnected.`
        );

        logger.warn(
            `Riffy will keep attempting to reconnect to "${node.name}".`
        );
    });

    // Lavalink node error.
    client.riffy.on('nodeError', (node, error) => {
        logger.error(
            `Lavalink node "${node.name}" error:`,
            error
        );
    });

    // Player error.
    client.riffy.on('playerError', (player, error) => {
        logger.error(
            `Music player error in guild ${player.guildId}:`,
            error
        );
    });

    logger.info(
        `Music initialized with ${lavalinkConfig.nodes.length} Lavalink node(s).`
    );

    logger.info(
        `Configured Lavalink nodes: ${lavalinkConfig.nodes
            .map((node) => node.name)
            .join(', ')}`
    );
}

export function initRiffyAfterReady(client) {
    if (!client.riffy || !client.user?.id) {
        logger.error(
            'Cannot initialize Riffy: client or Riffy is unavailable.'
        );
        return;
    }

    try {
        client.riffy.init(client.user.id);

        logger.info(
            `Riffy initialized as ${client.user.tag}.`
        );
    } catch (error) {
        logger.error(
            'Failed to initialize Riffy after ready:',
            error
        );
    }
}
