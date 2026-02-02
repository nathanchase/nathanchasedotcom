export const prerender = false;

import type { APIRoute } from "astro";

interface SteamGame {
  appid: number;
  name: string;
  playtime_forever: number;
  img_icon_url: string;
  rtime_last_played: number;
}

export const GET: APIRoute = async ({ locals }) => {
  const runtime = locals as { runtime?: { env?: { STEAM_API_KEY?: string } } };
  const apiKey = runtime.runtime?.env?.STEAM_API_KEY ?? import.meta.env.STEAM_API_KEY;
  const steamId = "76561197970320688";

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing Steam API key" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL("https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/");
    url.searchParams.set("key", apiKey);
    url.searchParams.set("steamid", steamId);
    url.searchParams.set("include_appinfo", "1");
    url.searchParams.set("include_played_free_games", "1");

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Steam API returned ${res.status}`);

    const data = await res.json();
    const games: SteamGame[] = data.response?.games ?? [];

    // Filter out demos and sort by most recently played
    const filtered = games.filter((g) => !g.name.toLowerCase().includes("demo"));
    filtered.sort((a, b) => b.rtime_last_played - a.rtime_last_played);
    const recent = filtered.slice(0, 8).map((g) => ({
      appid: g.appid,
      name: g.name,
      playtime_hours: Math.round(g.playtime_forever / 60),
      header_url: `https://cdn.cloudflare.steamstatic.com/steam/apps/${g.appid}/library_600x900_2x.jpg`,
      last_played: g.rtime_last_played,
    }));

    return new Response(JSON.stringify({ games: recent }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "Failed to fetch Steam games" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
