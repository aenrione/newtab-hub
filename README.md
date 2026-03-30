# New Tab Hub

<img width="1470" height="825" alt="New Tab Hub dashboard screenshot" src="https://github.com/user-attachments/assets/58839209-1595-4181-ab03-bc34081f3796" />

**A keyboard-first new tab dashboard for Chromium browsers.**

Replace your default new tab page with a configurable grid of 50+ widgets — search, pinned links, RSS feeds, market tickers, media servers, home automation, and more. Built with vanilla JavaScript: no frameworks, no build step, no runtime dependencies.

[![Docs](https://img.shields.io/badge/docs-aenrione.github.io%2Fnewtab--hub-blue)](https://aenrione.github.io/newtab-hub/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## Highlights

- **Search-first** — search bar auto-focuses on every new tab; type a URL to navigate directly
- **Keyboard navigation** — `h/j/k/l` or arrow keys move between widgets; `1`–`9` open pinned links
- **50+ widgets** — productivity, self-hosted services (*arr, Plex, Home Assistant, Pi-hole, ...), social feeds, and more
- **Theme engine** — 15+ presets (Gruvbox, Catppuccin, Nord, Dracula, ...) plus full custom colors
- **Multiple profiles** — separate Work and Personal dashboards, remembered per browser profile
- **Private config layer** — keep personal URLs and API keys out of version control
- **No cloud, no accounts** — everything runs locally inside the extension

## Quick Start

```bash
git clone https://github.com/aenrione/newtab-hub.git
```

1. Open `chrome://extensions` (or `brave://extensions`, `edge://extensions`)
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `newtab-hub` folder
4. Open a new tab

Full installation guide: [docs → Installation](https://aenrione.github.io/newtab-hub/installation/)

## Documentation

**[aenrione.github.io/newtab-hub](https://aenrione.github.io/newtab-hub/)**

- [Installation](https://aenrione.github.io/newtab-hub/installation/)
- [Configuration](https://aenrione.github.io/newtab-hub/configuration/)
- [All Widgets](https://aenrione.github.io/newtab-hub/widgets/)
- [Customization](https://aenrione.github.io/newtab-hub/customization/)
- [Keyboard Shortcuts](https://aenrione.github.io/newtab-hub/keyboard-shortcuts/)
- [Contributing](https://aenrione.github.io/newtab-hub/contributing/)

## Widget Categories

| Category | Examples |
|----------|---------|
| Productivity | Search, Pinned Links, Feeds, Weather, Todo, Pomodoro, Markets |
| Utilities | Monitor, Custom API, iFrame, HTML, Group (Tabs) |
| Social & News | Hacker News, Reddit, Lobsters, YouTube, Twitch |
| GitHub | GitHub Releases, GitHub PRs, Repository |
| Media | Plex, Jellyfin, Immich, Tautulli |
| Infrastructure | Home Assistant, Proxmox, Portainer, Grafana, Nextcloud |
| DNS | Pi-hole, AdGuard Home, DNS Stats |
| *arr Stack | Sonarr, Radarr, Lidarr, Readarr, Bazarr, Prowlarr, Overseerr |
| Downloads | SABnzbd, NZBGet, Transmission |
| Services | Miniflux, Mealie, Paperless-ngx |

## Development

```bash
npm install   # dev-only test tooling
npm test      # run the Jest suite
```

The extension has no runtime npm dependencies. Node is only used for tests.

## Contributing

Contributions welcome — bug fixes, new widgets, Firefox support, accessibility improvements, and tests. See [CONTRIBUTING](https://aenrione.github.io/newtab-hub/contributing/) for details.

> This project was vibecoded with AI assistance. The code prioritises shipping features over polish — contributions improving code quality are especially welcome.

## License

[MIT](LICENSE)
