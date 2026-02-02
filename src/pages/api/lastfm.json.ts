export const prerender = false;

import type { APIRoute } from "astro";

const LASTFM_USER = "Zampa";

export const GET: APIRoute = async ({ locals }) => {
  const runtime = locals as { runtime?: { env?: Record<string, string> } };
  const env = runtime.runtime?.env ?? {};
  const apiKey = env.LASTFM_API_KEY ?? import.meta.env.LASTFM_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing Last.fm API key" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=user.getrecenttracks&user=${LASTFM_USER}&api_key=${apiKey}&format=json&limit=10`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Last.fm returned ${res.status}`);

    const data = await res.json();
    const tracks = data.recenttracks?.track ?? [];

    // Deduplicate by artist+track name, keep most recent
    const seen = new Set<string>();
    const deduped: typeof tracks = [];
    for (const t of tracks) {
      const key = `${t.artist["#text"]}|${t.name}`;
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(t);
      }
    }

    const recent = deduped.slice(0, 8).map((t: any) => ({
      track: t.name,
      artist: t.artist["#text"],
      album: t.album?.["#text"] || undefined,
      image: t.image?.[t.image.length - 1]?.["#text"] || null,
      url: t.url,
      nowPlaying: t["@attr"]?.nowplaying === "true",
    }));

    return new Response(JSON.stringify({ tracks: recent }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to fetch Last.fm data" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
