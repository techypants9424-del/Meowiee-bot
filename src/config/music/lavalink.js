import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const projectRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../../..',
);

function parseBoolean(value, defaultValue = false) {
    if (value === undefined || value === null || value === '') {
        return defaultValue;
    }

    return ['true', '1', 'yes'].includes(String(value).toLowerCase());
}

function parseNodesFromEnv() {
    const raw = process.env.LAVALINK_NODES?.trim();

    if (!raw) {
        return null;
    }

    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : null;
    } catch (error) {
        console.error('[Lavalink] Invalid LAVALINK_NODES JSON:', error);
        return null;
    }
}

function parseNodesPayload(parsed) {
    if (Array.isArray(parsed)) {
        return parsed;
    }

    if (Array.isArray(parsed?.nodes)) {
        return parsed.nodes;
    }

    return null;
}

function loadNodesFromFile() {
    const nodesFile =
        process.env.LAVALINK_NODES_FILE?.trim() ||
        path.join(projectRoot, 'lavalink', 'nodes.json');

    if (!existsSync(nodesFile)) {
        return null;
    }

    try {
        const parsed = JSON.parse(readFileSync(nodesFile, 'utf8'));
        return parseNodesPayload(parsed);
    } catch (error) {
        console.error(`[Lavalink] Failed to read ${nodesFile}:`, error);
        return null;
    }
}

export function getLavalinkNodes() {
    // 1. Railway environment variable
    const fromEnv = parseNodesFromEnv();

    if (fromEnv?.length) {
        return fromEnv;
    }

    // 2. nodes.json
    const fromFile = loadNodesFromFile();

    if (fromFile?.length) {
        return fromFile;
    }

    // 3. Individual environment variables
    const host = process.env.LAVALINK_HOST?.trim();

    if (!host) {
        console.error(
            '[Lavalink] No Lavalink host configured. Set LAVALINK_NODES or LAVALINK_HOST.',
        );

        return [];
    }

    const port = Number(process.env.LAVALINK_PORT || 2333);
    const password =
        process.env.LAVALINK_PASSWORD || 'youshallnotpass';

    const secure = parseBoolean(
        process.env.LAVALINK_SECURE,
        false,
    );

    return [
        {
            name: process.env.LAVALINK_NAME || 'Main',
            host,
            port,
            password,
            secure,
        },
    ];
}

export const lavalinkConfig = {
    nodes: getLavalinkNodes(),

    // Search by song name rather than requiring YouTube URLs.
    defaultSearchPlatform:
        process.env.LAVALINK_SEARCH_PLATFORM || 'ytmsearch',

    // Lavalink v4.
    restVersion:
        process.env.LAVALINK_REST_VERSION || 'v4',
};

export default lavalinkConfig;
