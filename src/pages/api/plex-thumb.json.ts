export const prerender = false;

import type { APIRoute } from "astro";

export const GET: APIRoute = async ({ url, locals }) => {
  const runtime = locals as { runtime?: { env?: Record<string, string> } };
  const env = runtime.runtime?.env ?? {};
  const token = env.PLEX_TOKEN ?? import.meta.env.PLEX_TOKEN;
  const server = env.PLEX_SERVER_URL ?? import.meta.env.PLEX_SERVER_URL;

  const path = url.searchParams.get("path");

  if (!token || !server || !path) {
    return new Response(null, { status: 400 });
  }

  // Only allow Plex library thumb paths
  if (!path.startsWith("/library/")) {
    return new Response(null, { status: 400 });
  }

  try {
    const plexUrl = `${server}/photo/:/transcode?width=300&height=450&minSize=1&upscale=1&url=${encodeURIComponent(path)}&X-Plex-Token=${token}`;
    const res = await fetch(plexUrl);
    if (!res.ok) return new Response(null, { status: 502 });

    return new Response(res.body, {
      headers: {
        "Content-Type": res.headers.get("Content-Type") ?? "image/jpeg",
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    });
  } catch {
    return new Response(null, { status: 502 });
  }
};
