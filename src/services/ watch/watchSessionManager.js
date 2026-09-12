import crypto from 'node:crypto';

class WatchSessionManager {
    constructor() {
        this.sessions = new Map();
    }

    create({
        guildId,
        hostId,
        title,
        episode,
        language = 'sub',
        watchUrl = null,
    }) {
        // One active room per Discord server
        const existing = this.getByGuild(guildId);

        if (existing) {
            this.stop(existing.roomId);
        }

        const roomId = crypto.randomBytes(6).toString('base64url');

        const session = {
            roomId,
            guildId,
            hostId,

            title,
            episode,
            language,

            watchUrl,

            playing: false,
            position: 0,
            updatedAt: Date.now(),

            createdAt: Date.now(),
        };

        this.sessions.set(roomId, session);

        return session;
    }

    get(roomId) {
        return this.sessions.get(roomId) || null;
    }

    getByGuild(guildId) {
        for (const session of this.sessions.values()) {
            if (session.guildId === guildId) {
                return session;
            }
        }

        return null;
    }

    update(roomId, changes = {}) {
        const session = this.get(roomId);

        if (!session) {
            return null;
        }

        Object.assign(session, changes);

        session.updatedAt = Date.now();

        return session;
    }

    stop(roomId) {
        return this.sessions.delete(roomId);
    }

    list() {
        return [...this.sessions.values()];
    }
}

export const watchSessions = new WatchSessionManager();

export default WatchSessionManager;
