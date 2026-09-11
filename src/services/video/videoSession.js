class VideoSession {
    constructor(guildId) {
        this.guildId = guildId;
        this.url = null;
        this.title = null;
        this.episode = null;
        this.playing = false;
        this.startedAt = null;
    }

    start({ title, episode, url }) {
        this.title = title;
        this.episode = episode;
        this.url = url;
        this.playing = true;
        this.startedAt = Date.now();
    }

    stop() {
        this.playing = false;
        this.url = null;
        this.title = null;
        this.episode = null;
        this.startedAt = null;
    }

    pause() {
        this.playing = false;
    }

    resume() {
        this.playing = true;
    }

    getStatus() {
        return {
            guildId: this.guildId,
            title: this.title,
            episode: this.episode,
            playing: this.playing,
            startedAt: this.startedAt
        };
    }
}

module.exports = VideoSession;
