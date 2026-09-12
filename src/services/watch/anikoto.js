const ANIKOTO_API = 'https://anikotoapi.site';

async function fetchJson(url) {
    const response = await fetch(url, {
        headers: {
            Accept: 'application/json',
            'User-Agent': 'Meowiee/WatchParty',
        },
    });

    if (!response.ok) {
        throw new Error(
            `AniKoto API returned ${response.status}`
        );
    }

    return response.json();
}

/**
 * Get a page of AniKoto's anime catalog.
 */
export async function getRecentAnime(page = 1, perPage = 100) {
    const url =
        `${ANIKOTO_API}/recent-anime` +
        `?page=${page}&per_page=${perPage}`;

    const data = await fetchJson(url);

    if (!data?.ok || !Array.isArray(data.data)) {
        throw new Error('Invalid AniKoto catalog response');
    }

    return data.data;
}

/**
 * Get a complete AniKoto series including episodes.
 */
export async function getSeries(seriesId) {
    const data = await fetchJson(
        `${ANIKOTO_API}/series/${encodeURIComponent(seriesId)}`
    );

    if (!data?.ok || !data.data?.anime || !Array.isArray(data.data.episodes)) {
        throw new Error('Invalid AniKoto series response');
    }

    return data.data;
}

/**
 * Find an anime from AniKoto's catalog.
 *
 * The official API currently exposes the catalog through
 * /recent-anime rather than a documented search endpoint.
 *
 * We check several catalog pages and score title matches.
 */
export async function searchAnime(query, options = {}) {
    const cleanQuery = String(query || '')
        .trim()
        .toLowerCase();

    if (!cleanQuery) {
        return [];
    }

    const pages = Math.max(
        1,
        Math.min(Number(options.pages) || 5, 20)
    );

    const results = [];

    for (let page = 1; page <= pages; page++) {
        let animeList;

        try {
            animeList = await getRecentAnime(page, 100);
        } catch (error) {
            console.error(
                `[AniKoto] Failed to load page ${page}:`,
                error.message
            );
            continue;
        }

        for (const anime of animeList) {
            const title = String(anime.title || '');
            const alternative = String(anime.alternative || '');
            const titles = String(anime.titles || '');

            const haystack = [
                title,
                alternative,
                titles,
            ]
                .join(' ')
                .toLowerCase();

            let score = 0;

            if (title.toLowerCase() === cleanQuery) {
                score += 100;
            }

            if (alternative.toLowerCase() === cleanQuery) {
                score += 90;
            }

            if (title.toLowerCase().includes(cleanQuery)) {
                score += 60;
            }

            if (alternative.toLowerCase().includes(cleanQuery)) {
                score += 50;
            }

            if (haystack.includes(cleanQuery)) {
                score += 20;
            }

            if (score > 0) {
                results.push({
                    ...anime,
                    _score: score,
                });
            }
        }
    }

    results.sort((a, b) => b._score - a._score);

    return results;
}

/**
 * Find a specific episode in a series.
 */
export function findEpisode(series, episodeNumber) {
    const number = Number(episodeNumber);

    if (!Number.isInteger(number) || number < 1) {
        return null;
    }

    return (
        series.episodes.find(
            (episode) => Number(episode.number) === number
        ) || null
    );
}

/**
 * Resolve an anime title + episode into a MegaPlay embed URL.
 */
export async function resolveWatchEpisode(
    animeQuery,
    episodeNumber = 1,
    language = 'sub'
) {
    const results = await searchAnime(animeQuery);

    if (!results.length) {
        return {
            ok: false,
            reason: 'anime_not_found',
            results: [],
        };
    }

    const anime = results[0];

    const series = await getSeries(anime.id);

    const episode = findEpisode(series, episodeNumber);

    if (!episode) {
        return {
            ok: false,
            reason: 'episode_not_found',
            anime,
            series,
            results,
        };
    }

    const embedUrl =
        episode.embed_url?.[language] ||
        episode.embed_url?.sub ||
        episode.embed_url?.dub ||
        null;

    if (!embedUrl) {
        return {
            ok: false,
            reason: 'embed_not_found',
            anime,
            series,
            episode,
            results,
        };
    }

    return {
        ok: true,

        anime: series.anime,

        episode,

        episodeNumber: episode.number,

        language,

        embedUrl,

        searchResults: results.slice(0, 5),
    };
}

export default {
    getRecentAnime,
    getSeries,
    searchAnime,
    findEpisode,
    resolveWatchEpisode,
};
