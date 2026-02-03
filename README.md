# nathanchase.com

Personal homepage for Nathan Chase — designer, developer, drummer, and dad based in Central Florida.

**Live site:** [https://www.nathanchase.com](https://www.nathanchase.com)

## Tech Stack

- [Astro 6](https://astro.build) (Beta)
- [Tailwind CSS v4](https://tailwindcss.com)
- Deployed on [Cloudflare Workers](https://workers.cloudflare.com)
- Server-side API routes with `stale-while-revalidate` caching

## Design

Retro/nostalgic aesthetic with:
- Warm muted color palette (cream, amber, faded red)
- Subtle film grain overlay
- Section-specific background textures (linen, leather, paper, concrete, etc.)
- CRT-inspired glow effects on headings
- Serif + sans-serif type pairing (Gloock, Sen, Ephesis)
- Mobile-responsive with hamburger navigation

## Sections

- **Hero** — Name and tagline
- **About** — Bio and background
- **Work** — Current consulting at O3 World, Flickchart, and notable clients
- **Music** — The Pauses, Unsung Zeros, Brownie Points (with Bandcamp embeds and album art)
- **Experiencing** — Recently watched (Plex/TMDB), recently played games (Steam), recently listened (Last.fm), Flickchart rankings/watchlist/reviews
- **Activity** — Bluesky posts and GitHub contributions
- **Links** — Social profiles

## API Routes

| Route | Source | Cache TTL |
|-------|--------|-----------|
| `/api/plex.json` | Plex + TMDB | 1 hour (SWR 24h) |
| `/api/steam.json` | Steam | 1 hour (SWR 24h) |
| `/api/lastfm.json` | Last.fm | 1 hour (SWR 24h) |

## Scripts

```bash
bun run dev        # Start dev server
bun run build      # Production build
bun run preview    # Preview production build

# Cache purging (requires CF_API_TOKEN env var)
bun run purge:plex
bun run purge:steam
bun run purge:lastfm
bun run purge:all
```

## Deployment

```bash
bun run build && bunx wrangler deploy
```
