const API_BASE = 'https://anikotoapi.site';

async function apiRequest(path) {
    const response = await fetch(`${API_BASE}${path}`, {
        headers: {
            Accept: 'application/json',
            'User-Agent': 'Meowiee Watch Party',
        },
    });

    if (!response.ok) {
        throw new Error(`AniKoto API returned ${response.status}`);
    }

    const json = await response.json();

    if (!json?.ok) {
        throw new Error('AniKoto API returned an unsuccessful response');
    }

    return json.data;
}

export async function getSeries(seriesId) {
    return apiRequest(`/series/${seriesId}`);
}

export async function searchAnime(query) {
    const data = await apiRequest(
        `/search?q=${encodeURIComponent(query)}`
    );

    return Array.isArray(data) ? data : data?.data ?? [];
}

export async function getEpisode(seriesId, episodeNumber, language = 'sub') {
    const data = await getSeries(seriesId);

    const episode = data?.episodes?.find(
        (ep) => Number(ep.number) === Number(episodeNumber)
    );

    if (!episode) {
        throw new Error(
            `Episode ${episodeNumber} was not found for this anime`
        );
    }

    const embedUrl = episode?.embed_url?.[language];

    if (!embedUrl) {
        throw new Error(
            `No ${language} stream is available for episode ${episodeNumber}`
        );
    }

    return {
        anime: data.anime,
        episode,
        embedUrl,
    };
}
