const ANIKOTO_API = 'https://anikotoapi.site';
const ANIKOTO_SITE = 'https://anikototv.to';

async function fetchJson(url) {
    const response = await fetch(url, {
        headers: {
            Accept: 'application/json',
            'User-Agent': 'Mozilla/5.0 (Meowiee Watch Party)',
        },
    });

    if (!response.ok) {
        throw new Error(
            `Request failed: ${response.status} ${response.statusText}`
        );
    }

    return response.json();
}

async function fetchText(url) {
    const response = await fetch(url, {
        headers: {
            Accept: 'text/html,application/xhtml+xml',
            'User-Agent': 'Mozilla/5.0 (Meowiee Watch Party)',
        },
    });

    if (!response.ok) {
        throw new Error(
            `AniKoto website returned ${response.status}`
        );
    }

    return response.text();
}

export async function getSeries(seriesId) {
    const data = await fetchJson(
        `${ANIKOTO_API}/series/${encodeURIComponent(seriesId)}`
    );

    if (
        !data?.ok ||
        !data.data?.anime ||
        !Array.isArray(data.data.episodes)
    ) {
        throw new Error('Invalid AniKoto series response');
    }

    return data.data;
}

function decodeHtml(value) {
    return String(value || '')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>');
}

function stripHtml(value) {
    return decodeHtml(
        String(value || '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
    );
}

/**
 * Search AniKoto's website.
 *
 * AniKoto's public API does not currently document a search endpoint,
 * so this uses the site's search page and extracts the result links.
 */
export async function searchAnime(query) {
    const cleanQuery = String(query || '').trim();

    if (!cleanQuery) {
        return [];
    }

    const url =
        `${ANIKOTO_SITE}/search?keyword=` +
        encodeURIComponent(cleanQuery);

    const html = await fetchText(url);

    const results = [];
    const seen = new Set();

    /*
     * Look for AniKoto anime links.
     *
     * Example:
     * /anime/naruto-shippuden-c8gov
     */
    const linkRegex =
        /href=["'](?:https?:\/\/[^"']+)?\/(?:anime|watch)\/([^"'?#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;

    let match;

    while ((match = linkRegex.exec(html)) !== null) {
        const slug = decodeHtml(match[1]);
        const rawText = match[2];

        const title = stripHtml(rawText);

        if (!slug || !title) {
            continue;
        }

        const key = slug.toLowerCase();

        if (seen.has(key)) {
            continue;
        }

        seen.add(key);

        results.push({
            title,
            slug,
        });
    }

    /*
     * Fallback: search for common data attributes if the page
     * uses a different HTML structure.
     */
    if (!results.length) {
        const slugRegex =
            /(?:data-slug|data-anime-slug)=["']([^"']+)["']/gi;

        while ((match = slugRegex.exec(html)) !== null) {
            const slug = decodeHtml(match[1]);

            if (!slug || seen.has(slug.toLowerCase())) {
                continue;
            }

            seen.add(slug.toLowerCase());

            results.push({
                title: slug.replace(/-/g, ' '),
                slug,
            });
        }
    }

    /*
     * Rank results.
     */
    const normalizedQuery = cleanQuery.toLowerCase();

    results.sort((a, b) => {
        const aTitle = a.title.toLowerCase();
        const bTitle = b.title.toLowerCase();

        const aExact = aTitle === normalizedQuery ? 100 : 0;
        const bExact = bTitle === normalizedQuery ? 100 : 0;

        const aStarts = aTitle.startsWith(normalizedQuery) ? 50 : 0;
        const bStarts = bTitle.startsWith(normalizedQuery) ? 50 : 0;

        const aContains = aTitle.includes(normalizedQuery) ? 20 : 0;
        const bContains = bTitle.includes(normalizedQuery) ? 20 : 0;

        return (
            bExact +
            bStarts +
            bContains -
            (aExact + aStarts + aContains)
        );
    });

    return results.slice(0, 10);
}

/**
 * Try to resolve an AniKoto website slug into an AniKoto API ID.
 *
 * The official API uses numeric series IDs, while the website
 * search returns slugs.
 */
async function resolveSeriesIdFromSlug(slug) {
    /*
     * First try the website page.
     */
    const url =
        `${ANIKOTO_SITE}/anime/${encodeURIComponent(slug)}`;

    const html = await fetchText(url);

    /*
     * Look for numeric AniKoto IDs in common attributes.
     */
    const patterns = [
        /data-id=["'](\d+)["']/i,
        /data-anime-id=["'](\d+)["']/i,
        /anime[_-]?id["']?\s*[:=]\s*["'](\d+)["']/i,
        /"id"\s*:\s*(\d+)/i,
    ];

    for (const pattern of patterns) {
        const match = html.match(pattern);

        if (match?.[1]) {
            return Number(match[1]);
        }
    }

    return null;
}

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

    const selected = results[0];

    /*
     * Try to get the numeric ID from the AniKoto website.
     */
    const seriesId = await resolveSeriesIdFromSlug(
        selected.slug
    );

    if (!seriesId) {
        return {
            ok: false,
            reason: 'series_id_not_found',
            results,
            selected,
        };
    }

    const series = await getSeries(seriesId);

    const episode = findEpisode(
        series,
        episodeNumber
    );

    if (!episode) {
        return {
            ok: false,
            reason: 'episode_not_found',
            anime: series.anime,
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
            anime: series.anime,
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

        searchResults: results,
    };
}

export default {
    getSeries,
    searchAnime,
    findEpisode,
    resolveWatchEpisode,
};
