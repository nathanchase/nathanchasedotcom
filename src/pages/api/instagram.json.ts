import type { APIRoute } from "astro";

export const prerender = false;

const INSTAGRAM_URL = "https://www.instagram.com/nathanchase/";
const CACHE_TTL = 3600; // 1 hour

interface InstagramImage {
  src: string;
  alt: string;
  url: string;
}

export const GET: APIRoute = async ({ request }) => {
  try {
    const res = await fetch(INSTAGRAM_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Cache-Control": "no-cache",
      },
    });

    if (!res.ok) {
      return new Response(JSON.stringify({ images: [], error: "Failed to fetch Instagram" }), {
        status: 502,
        headers: { "Content-Type": "application/json" },
      });
    }

    const html = await res.text();
    const images: InstagramImage[] = [];

    // Strategy 1: Extract from JSON embedded in script tags
    // Instagram embeds post data in various script formats
    const scriptPatterns = [
      // Modern: look for require("ScheduledServerJS").handle patterns with image URLs
      /\"display_url\"\s*:\s*\"(https:\/\/[^"]+)\"/g,
      // Also try thumbnail_src
      /\"thumbnail_src\"\s*:\s*\"(https:\/\/[^"]+)\"/g,
      // Try image_versions2 format
      /\"image_versions2\".*?\"url\"\s*:\s*\"(https:\/\/[^"]+)\"/g,
    ];

    const seen = new Set<string>();
    for (const pattern of scriptPatterns) {
      let match;
      while ((match = pattern.exec(html)) !== null) {
        const url = match[1].replace(/\\u0026/g, "&").replace(/\\\//g, "/");
        // Only include actual post images (not profile pics, stories, etc.)
        if (url.includes("scontent") && !seen.has(url)) {
          seen.add(url);
          images.push({ src: url, alt: "Instagram post", url: INSTAGRAM_URL });
        }
        if (images.length >= 8) break;
      }
      if (images.length >= 8) break;
    }

    // Strategy 2: Extract from og:image meta tags (fallback - usually just profile pic)
    if (images.length === 0) {
      const metaPattern = /<meta\s+(?:property|name)="og:image"\s+content="([^"]+)"/gi;
      let match;
      while ((match = metaPattern.exec(html)) !== null) {
        images.push({ src: match[1], alt: "Instagram", url: INSTAGRAM_URL });
      }
    }

    // Strategy 3: Look for any img tags with Instagram CDN URLs in the HTML
    if (images.length === 0) {
      const imgPattern = /src="(https:\/\/scontent[^"]+)"/g;
      let match;
      while ((match = imgPattern.exec(html)) !== null) {
        const url = match[1];
        if (!seen.has(url)) {
          seen.add(url);
          images.push({ src: url, alt: "Instagram post", url: INSTAGRAM_URL });
        }
        if (images.length >= 8) break;
      }
    }

    return new Response(JSON.stringify({ images: images.slice(0, 6) }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${CACHE_TTL}, s-maxage=${CACHE_TTL}`,
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ images: [], error: "Internal error" }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
