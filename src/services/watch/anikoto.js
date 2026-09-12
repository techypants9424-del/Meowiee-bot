```js
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
 * The documented /page endpoint currently returns an empty
 * response on the live API, so this is kept defensive.
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
 * Turn:
 *
 * Naruto Shippuden
 *
 * into:
 *
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
 * Try an AniKoto slug.
 *
 * IMPORTANT:
 * We do NOT throw on a 404 here.
 * A 404 simply means this guessed slug doesn't exist.
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
 * Resolve anime + episode.
 *
 * This accepts either:
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
     * First assume the user supplied an AniKoto slug.
     */
    let slug = normalizeSlug(query);

    let anime = await tryInfo(slug);

    /*
     * If that failed, we currently don't have a search endpoint
     * from the documented API.
     *
     * HOWEVER, some AniKoto queries may already contain the
     * actual slug, so try the original value as-is too.
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
     * The API docs say /page converts the slug into
     * the numeric ID required by /episodes.
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

    /*
     * IMPORTANT:
     *
     * /episodes currently gives us metadata such as:
     *
     * num
     * malid
     * title
     * data_id
     * slug
     * timestamp
     *
     * It does NOT give us an embed URL.
     *
     * So we return the raw episode data for the next
     * watch-player resolution step.
     */
    return {
        ok: true,
        anime,
        animeId,
        slug,
        episode,
        episodeNumber: Number(episode.num),
        language,
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
```
