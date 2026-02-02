export const prerender = false;

import type { APIRoute } from "astro";

const PLEX_SERVER = import.meta.env.PLEX_SERVER_URL;
const TMDB_IMG = "https://image.tmdb.org/t/p/w300";
const ACCOUNT_ID = 1; // Zampa01

interface PlexHistoryItem {
  title: string;
  grandparentTitle?: string;
  type: "movie" | "episode";
  thumb?: string;
  parentThumb?: string;
  grandparentThumb?: string;
  key?: string;
  index?: number;
  parentIndex?: number;
  viewedAt: number;
  originallyAvailableAt?: string;
}

/** Try to get a Plex thumb path from the library */
async function fetchPlexThumb(token: string, item: PlexHistoryItem): Promise<string | null> {
  const existing = item.type === "episode"
    ? item.grandparentThumb ?? item.parentThumb ?? item.thumb
    : item.thumb;
  if (existing) return `${PLEX_SERVER}/photo/:/transcode?width=300&height=450&minSize=1&upscale=1&url=${encodeURIComponent(existing)}&X-Plex-Token=${token}`;

  if (item.key) {
    try {
      const res = await fetch(`${PLEX_SERVER}${item.key}?X-Plex-Token=${token}`, {
        headers: { Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        const meta = data.MediaContainer?.Metadata?.[0];
        const thumb = item.type === "episode"
          ? meta?.grandparentThumb ?? meta?.parentThumb ?? meta?.thumb
          : meta?.thumb;
        if (thumb) return `${PLEX_SERVER}/photo/:/transcode?width=300&height=450&minSize=1&upscale=1&url=${encodeURIComponent(thumb)}&X-Plex-Token=${token}`;
      }
    } catch {}
  }

  return null;
}

/** Fall back to TMDB for poster art */
async function fetchTmdbPoster(tmdbKey: string, title: string, type: "movie" | "episode", year?: string): Promise<string | null> {
  const endpoint = type === "episode" ? "search/tv" : "search/movie";
  const yearParam = year ? `&${type === "episode" ? "first_air_date_year" : "year"}=${year}` : "";
  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/${endpoint}?api_key=${tmdbKey}&query=${encodeURIComponent(title)}${yearParam}&limit=1`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const results = data.results ?? [];
    // Prefer exact title match
    const exact = results.find((r: { title?: string; name?: string }) =>
      (r.title ?? r.name)?.toLowerCase() === title.toLowerCase()
    );
    const best = exact ?? results[0];
    const poster = best?.poster_path;
    return poster ? `${TMDB_IMG}${poster}` : null;
  } catch {
    return null;
  }
}

export const GET: APIRoute = async ({ locals }) => {
  const runtime = locals as { runtime?: { env?: Record<string, string> } };
  const env = runtime.runtime?.env ?? {};
  const token = env.PLEX_TOKEN ?? import.meta.env.PLEX_TOKEN;
  const tmdbKey = env.TMDB_API_KEY ?? import.meta.env.TMDB_API_KEY;

  if (!token) {
    return new Response(JSON.stringify({ error: "Missing Plex token" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const url = `${PLEX_SERVER}/status/sessions/history/all?X-Plex-Token=${token}&sort=viewedAt:desc&accountID=${ACCOUNT_ID}&limit=20`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`Plex returned ${res.status}`);

    const data = await res.json();
    const items: PlexHistoryItem[] = data.MediaContainer?.Metadata ?? [];

    // Deduplicate
    const seen = new Set<string>();
    const deduped: PlexHistoryItem[] = [];
    for (const item of items) {
      const dedupKey = item.type === "episode" ? item.grandparentTitle ?? item.title : item.title;
      if (!seen.has(dedupKey)) {
        seen.add(dedupKey);
        deduped.push(item);
      }
    }

    const top = deduped.slice(0, 8);

    // Fetch thumbs: try Plex first, then TMDB
    const recent = await Promise.all(
      top.map(async (item) => {
        const displayTitle = item.type === "episode" ? item.grandparentTitle ?? item.title : item.title;

        let thumb = await fetchPlexThumb(token, item);
        if (!thumb && tmdbKey) {
          const year = item.originallyAvailableAt?.split("-")[0];
          thumb = await fetchTmdbPoster(tmdbKey, displayTitle, item.type, year);
        }

        return {
          title: displayTitle,
          subtitle: item.type === "episode"
            ? `S${item.parentIndex}E${item.index} — ${item.title}`
            : undefined,
          type: item.type,
          thumb,
          viewedAt: item.viewedAt,
        };
      })
    );

    return new Response(JSON.stringify({ items: recent }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to fetch Plex history" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
