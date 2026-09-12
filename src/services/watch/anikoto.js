const ANIKOTO_API = 'https://anikoto-api.onrender.com';

async function fetchJson(url) {
    const response = await fetch(url, {
        headers: {
            Accept: 'application/json',
            'User-Agent': 'Meowiee-Watch-Party',
        },
    });

    if (!response.ok) {
        throw new Error(
            `AniKoto API returned ${response.status} ${response.statusText}`
        );
    }

    const text = await response.text();

    if (!text.trim()) {
        return null;
    }

    try {
        return JSON.parse(text);
    } catch {
        throw new Error('AniKoto API returned invalid JSON');
    }
}

/**
 * Get anime information from AniKoto.
 *
 * Example:
 * /info?name=naruto-shippuden-c8gov
 */
export async function getAnimeInfo(slug) {
    const data = await fetchJson(
        `${ANIKOTO_API}/info?name=${encodeURIComponent(slug)}`
    );

    if (!data) {
        return null;
    }

    return data;
}

/**
 * Convert anime slug -> AniKoto numeric ID.
 *
 * The API documents /page?name=..., but the live endpoint
 * currently returns an empty body.
 */
export async function getAnimeId(slug) {
    const data = await fetchJson(
        `${ANIKOTO_API}/page?name=${encodeURIComponent(slug)}`
    );

    if (!data) {
        return null;
    }

    if (typeof data === 'number') {
        return data;
    }

    if (typeof data === 'string' && /^\d+$/.test(data)) {
        return Number(data);
    }

    const possibleId =
        data.id ??
        data.anime_id ??
        data.animeId ??
        data.malid ??
        data.data?.id ??
        data.data?.anime_id ??
        data.data?.animeId ??
        data.data?.malid;

    if (possibleId && /^\d+$/.test(String(possibleId))) {
        return Number(possibleId);
    }

    return null;
}

/**
 * Get all episodes using AniKoto's numeric anime ID.
 *
 * /episodes?id=10
 */
export async function getEpisodes(animeId) {
    if (!animeId) {
        return [];
    }

    const data = await fetchJson(
        `${ANIKOTO_API}/episodes?id=${encodeURIComponent(animeId)}`
    );

    if (!Array.isArray(data)) {
        return [];
    }

    return data;
}

/**
 * Find an episode by number.
 */
export function findEpisode(episodes, episodeNumber) {
    const number = Number(episodeNumber);

    if (!Number.isInteger(number) || number < 1) {
        return null;
    }

    return (
        episodes.find(
            (episode) => Number(episode.num) === number
        ) || null
    );
}

/**
 * Resolve an anime + episode.
 *
 * Returns the AniKoto episode information.
 */
export async function resolveWatchEpisode(
    animeQuery,
    episodeNumber = 1
) {
    const query = String(animeQuery || '').trim();

    if (!query) {
        return {
            ok: false,
            reason: 'anime_not_found',
        };
    }

    /*
     * If the user gives us a slug directly, use it.
     *
     * Example:
     * naruto-shippuden-c8gov
     */
    let slug = query
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');

    /*
     * Try the info endpoint first.
     *
     * This confirms whether the slug actually exists.
     */
    let anime = await getAnimeInfo(slug);

    /*
     * If the input isn't already a valid slug, try some
     * common slug forms.
     */
    if (!anime) {
        const simplified = query
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-');

        if (simplified !== slug) {
            slug = simplified;
            anime = await getAnimeInfo(slug);
        }
    }

    if (!anime) {
        return {
            ok: false,
            reason: 'anime_not_found',
            slug,
        };
    }

    /*
     * Get numeric ID from /page.
     *
     * The current live API appears to return an empty response
     * here, so this may currently return null.
     */
    const animeId = await getAnimeId(slug);

    if (!animeId) {
        return {
            ok: false,
            reason: 'anime_id_not_found',
            anime,
            slug,
        };
    }

    /*
     * Get episode list.
     */
    const episodes = await getEpisodes(animeId);

    if (!episodes.length) {
        return {
            ok: false,
            reason: 'episodes_not_found',
            anime,
            animeId,
            slug,
        };
    }

    const episode = findEpisode(
        episodes,
        episodeNumber
    );

    if (!episode) {
        return {
            ok: false,
            reason: 'episode_not_found',
            anime,
            animeId,
            episodes,
            slug,
        };
    }

    return {
        ok: true,
        anime,
        animeId,
        slug,
        episode,
        episodeNumber: Number(episode.num),
        episodes,
    };
}

export default {
    getAnimeInfo,
    getAnimeId,
    getEpisodes,
    findEpisode,
    resolveWatchEpisode,
};
