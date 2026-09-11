const API_BASE = "https://anikotoapi.site";

class AniKoto {
    async recent(page = 1, perPage = 10) {
        const url =
            `${API_BASE}/recent-anime?page=${page}&per_page=${perPage}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`AniKoto API error: ${response.status}`);
        }

        return await response.json();
    }

    async getSeries(id) {
        const url =
            `${API_BASE}/series/${encodeURIComponent(id)}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`AniKoto API error: ${response.status}`);
        }

        return await response.json();
    }

    async getEpisodes(id) {
        const data = await this.getSeries(id);

        return data.episodes || [];
    }

    async getEpisode(id, episodeNumber, language = "sub") {
        const episodes = await this.getEpisodes(id);

        const episode = episodes.find(
            ep => String(ep.number) === String(episodeNumber)
        );

        if (!episode) {
            throw new Error(
                `Episode ${episodeNumber} was not found.`
            );
        }

        const embedUrl =
            episode.embed_url?.[language] ||
            episode.embed_url?.sub ||
            episode.embed_url?.dub;

        if (!embedUrl) {
            throw new Error(
                `No ${language} stream is available for episode ${episodeNumber}.`
            );
        }

        return {
            number: episode.number,
            embedUrl,
            language
        };
    }
}

module.exports = AniKoto;
