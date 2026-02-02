# nathanchase.com

Personal homepage for Nathan Chase — designer, developer, and drummer based in Central Florida.

**Live site:** [nathanchase.com](https://nathanchase.com)

## Tech Stack

- [Astro](https://astro.build)
- Deployed on [Cloudflare Workers](https://workers.cloudflare.com)
- Server-side API routes for Steam, Plex, Last.fm, and TMDB

## Sections

- **About** — Bio and background
- **Work** — Current consulting, Flickchart, and notable clients
- **Music** — The Pauses, Unsung Zeros, Brownie Points (with Bandcamp embeds)
- **Experiencing** — Recently watched (Plex/TMDB), recently played games (Steam), recently listened (Last.fm)
- **Activity** — Bluesky posts and GitHub activity/contributions
- **Links** — Social profiles

## Development

```sh
bun install
bun dev
```

## Build & Deploy

```sh
bun run build
bunx wrangler deploy
```
