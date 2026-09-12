const ANIKOTO_API = 'https://anikoto-api.onrender.com';

async function fetchJson(url) {
    const response = await fetch(url, {
        headers: {
            Accept: 'application/json',
            'User-Agent': 'Meowiee-Watch-Party',
        },
    });

    const text = await response.text();

    if (!response.ok) {
        throw new Error(
            `AniKoto API returned ${response.status} ${response.statusText} for ${url}`
        );
    }

    if (!text.trim()) {
        return null;
    }

    try {
        return JSON.parse(text);
    } catch {
        throw new Error(`AniKoto returned invalid JSON for ${url}`);
    }
}

/**
 * Get anime information.
 *
 * Example:
 * /info?name=naruto-shippuden-c8gov
 */
export async function getAnimeInfo(slug) {
    if (!slug) {
        return null;
    }

    return fetchJson(
        `${ANIKOTO_API}/info?name=${encodeURIComponent(slug)}`
    );
}

/**
 * Get numeric AniKoto anime ID.
 *
 * Example:
 * /page?name=naruto-shippuden-c8gov
 */
export async function getAnimeId(slug) {
    if (!slug) {
        return null;
    }

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

    const id =
        data.id ??
        data.anime_id ??
        data.animeId ??
        data.malid ??
        data.data?.id ??
        data.data?.anime_id ??
        data.data?.animeId ??
        data.data?.malid;

    if (id && /^\d+$/.test(String(id))) {
        return Number(id);
    }

    return null;
}

/**
 * Get episode list.
 *
 * /episodes?id=<numeric id>
 */
export async function getEpisodes(animeId) {
    if (!animeId) {
        return [];
    }

    const data = await fetchJson(
        `${ANIKOTO_API}/episodes?id=${encodeURIComponent(animeId)}`
    );

    return Array.isArray(data) ? data : [];
}

/**
 * Find a specific episode.
 */
export function findEpisode(episodes, episodeNumber) {
    const number = Number(episodeNumber);

    if (!Number.isInteger(number) || number < 1) {
        return null;
    }

    return (
        episodes.find(
            episode => Number(episode.num) === number
        ) || null
    );
}

/**
 * Convert an anime title into a basic slug.
 *
 * Example:
 * Naruto Shippuden
 * ->
 * naruto-shippuden
 */
function normalizeSlug(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/['’]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Try AniKoto /info without crashing on a 404.
 */
async function tryInfo(slug) {
    try {
        return await getAnimeInfo(slug);
    } catch (error) {
        if (String(error.message).includes('404')) {
            return null;
        }

        throw error;
    }
}

/**
 * Build the MegaPlay embed URL.
 *
 * Newer AniKoto responses can contain:
 *
 * episode_embed_id
 *
 * Current AniKoto API responses instead give us:
 *
 * malid
 * num
 *
 * MegaPlay supports both formats.
 */
function buildEmbedUrl(episode, language = 'sub') {
    const lang = language === 'dub'
        ? 'dub'
        : 'sub';

    /*
     * Preferred method:
     * AniKoto episode_embed_id
     */
    if (episode?.episode_embed_id) {
        return (
            `https://megaplay.buzz/stream/s-2/` +
            `${encodeURIComponent(episode.episode_embed_id)}/` +
            `${lang}`
        );
    }

    /*
     * Current AniKoto API:
     * use MAL ID + episode number.
     *
     * Example:
     * https://megaplay.buzz/stream/mal/1735/1/sub
     */
    if (episode?.malid && episode?.num) {
        return (
            `https://megaplay.buzz/stream/mal/` +
            `${encodeURIComponent(episode.malid)}/` +
            `${encodeURIComponent(episode.num)}/` +
            `${lang}`
        );
    }

    return null;
}

/**
 * Resolve anime + episode + playable embed.
 *
 * Accepts:
 *
 * naruto-shippuden-c8gov
 *
 * or:
 *
 * Naruto Shippuden
 */
export async function resolveWatchEpisode(
    animeQuery,
    episodeNumber = 1,
    language = 'sub'
) {
    const query = String(animeQuery || '').trim();

    if (!query) {
        return {
            ok: false,
            reason: 'anime_not_found',
        };
    }

    console.log(
        `[Watch] Resolving anime query: "${query}"`
    );

    /*
     * First treat the query as an AniKoto slug.
     */
    let slug = normalizeSlug(query);

    let anime = await tryInfo(slug);

    /*
     * If the normalized slug failed,
     * try the original query too.
     */
    if (!anime && query !== slug) {
        anime = await tryInfo(query);
    }

    if (!anime) {
        console.log(
            `[Watch] Could not resolve "${query}" through AniKoto /info`
        );

        return {
            ok: false,
            reason: 'anime_not_found',
            query,
        };
    }

    console.log(
        `[Watch] Found anime: ${anime.title}`
    );

    /*
     * Get the numeric AniKoto ID.
     */
    const animeId = await getAnimeId(slug);

    if (!animeId) {
        console.log(
            `[Watch] /page returned no numeric ID for "${slug}"`
        );

        return {
            ok: false,
            reason: 'anime_id_not_found',
            anime,
            slug,
        };
    }

    console.log(
        `[Watch] AniKoto numeric ID: ${animeId}`
    );

    /*
     * Get all episodes.
     */
    const episodes = await getEpisodes(animeId);

    if (!episodes.length) {
        console.log(
            `[Watch] No episodes found for AniKoto ID ${animeId}`
        );

        return {
            ok: false,
            reason: 'episodes_not_found',
            anime,
            animeId,
            slug,
        };
    }

    /*
     * Find requested episode.
     */
    const episode = findEpisode(
        episodes,
        episodeNumber
    );

    if (!episode) {
        console.log(
            `[Watch] Episode ${episodeNumber} not found`
        );

        return {
            ok: false,
            reason: 'episode_not_found',
            anime,
            animeId,
            episodes,
            slug,
        };
    }

    console.log(
        `[Watch] Found episode ${episode.num}: ${episode.title || 'Untitled'}`
    );

    /*
     * Build playable MegaPlay embed URL.
     */
    const embedUrl = buildEmbedUrl(
        episode,
        language
    );

    if (!embedUrl) {
        console.log(
            `[Watch] Could not create an embed URL for episode ${episodeNumber}`
        );

        return {
            ok: false,
            reason: 'embed_not_found',
            anime,
            animeId,
            episode,
            episodes,
            slug,
        };
    }

    console.log(
        `[Watch] Embed URL: ${embedUrl}`
    );

    return {
        ok: true,

        anime,

        animeId,

        slug,

        episode,

        episodeNumber: Number(episode.num),

        language,

        embedUrl,

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
