---
title: Widgets
description: Overview of all available widgets in New Tab Hub
---

# Widgets

New Tab Hub has 50+ widgets across several categories. Every widget is a self-contained plugin registered at startup — unused widgets have zero overhead.

## Productivity

Day-to-day tools for the dashboard.

| Widget | Type | Description |
|--------|------|-------------|
| [Search](productivity/search.md) | `search` | Multi-source search bar with auto-focus |
| [Pinned Links](productivity/pinned-links.md) | `pinned-links` | Favourite links with `1`–`9` keyboard shortcuts |
| [Link Group](productivity/link-group.md) | `link-group` | Collapsible labelled group of links |
| [Bookmarks](productivity/bookmarks.md) | `bookmarks` | Multi-group bookmarks with favicons |
| [Feeds](productivity/feeds.md) | `feeds` | Inline RSS/Atom feed reader |
| [Clock](productivity/clock.md) | `clock` | Current time and date |
| [Weather](productivity/weather.md) | `weather` | Current weather + 24h chart (Open-Meteo, no key) |
| [Todo](productivity/todo.md) | `todo` | Persistent task list |
| [Calendar](productivity/calendar.md) | `calendar` | Month calendar view |
| [Pomodoro](productivity/pomodoro.md) | `pomodoro` | Pomodoro timer with phases |
| [Markets](productivity/markets.md) | `markets` | Stocks, crypto, and index tickers (Yahoo Finance, no key) |

## Utilities

General-purpose display and integration tools.

| Widget | Type | Description |
|--------|------|-------------|
| [Monitor](utilities/monitor.md) | `monitor` | URL uptime/response-time monitor |
| [Change Detection](utilities/change-detection.md) | `change-detection` | changedetection.io watched URLs |
| [iFrame](utilities/iframe.md) | `iframe` | Embed any URL in a sandboxed iframe |
| [HTML](utilities/html.md) | `html` | Render custom HTML content |
| [Custom API](utilities/custom-api.md) | `custom-api` | Fetch and display any JSON API |
| [Group (Tabs)](utilities/group.md) | `group` | Tabbed container for multiple widgets |
| [Repository](utilities/repository.md) | `repository` | GitHub repo stats, PRs, issues, commits |

## Social & News

| Widget | Type | Description |
|--------|------|-------------|
| [Hacker News](social/hacker-news.md) | `hacker-news` | Top/new stories (no API key) |
| [Reddit](social/reddit.md) | `reddit` | Subreddit posts (no API key) |
| [Lobsters](social/lobsters.md) | `lobsters` | Lobsters stories with tag filter (no API key) |
| [YouTube](social/youtube.md) | `youtube` | Latest videos from channels |
| [Twitch Channels](social/twitch-channels.md) | `twitch-channels` | Live/offline channel status |
| [Twitch Top Games](social/twitch-top-games.md) | `twitch-top-games` | Top trending games on Twitch |

## GitHub

| Widget | Type | Description |
|--------|------|-------------|
| [GitHub Releases](github/github-releases.md) | `github-releases` | Recent releases across repos |
| [GitHub PRs](github/github-prs.md) | `github-prs` | Open PRs filtered by your role |

## Media

| Widget | Type | Description |
|--------|------|-------------|
| [Plex](media/plex.md) | `plex` | Streams and library counts |
| [Jellyfin](media/jellyfin.md) | `jellyfin` | Library stats and active streams |
| [Immich](media/immich.md) | `immich` | Photo/video library stats |
| [Tautulli](media/tautulli.md) | `tautulli` | Plex activity monitoring |

## Infrastructure

| Widget | Type | Description |
|--------|------|-------------|
| [Home Assistant](infrastructure/home-assistant.md) | `home-assistant` | Single entity state |
| [Proxmox](infrastructure/proxmox.md) | `proxmox` | VM/LXC counts, CPU/RAM |
| [Portainer](infrastructure/portainer.md) | `portainer` | Container counts |
| [Nextcloud](infrastructure/nextcloud.md) | `nextcloud` | Active users, files, free space |
| [Grafana](infrastructure/grafana.md) | `grafana` | Alerts, metrics, or embedded panels |
| [Netdata](infrastructure/netdata.md) | `netdata` | CPU and RAM usage |
| [Speedtest Tracker](infrastructure/speedtest-tracker.md) | `speedtest-tracker` | Latest internet speed test |

## DNS & Network

| Widget | Type | Description |
|--------|------|-------------|
| [Pi-hole](dns/pihole.md) | `pihole` | Pi-hole v5 DNS stats |
| [AdGuard Home](dns/adguard.md) | `adguard` | AdGuard Home DNS stats |
| [DNS Stats (unified)](dns/dns-stats.md) | `dns-stats` | Pi-hole v5/v6 + AdGuard unified |

## *arr Stack

| Widget | Type | Description |
|--------|------|-------------|
| [Sonarr](arr/sonarr.md) | `sonarr` | Upcoming TV episodes |
| [Radarr](arr/radarr.md) | `radarr` | Movie library overview |
| [Lidarr](arr/lidarr.md) | `lidarr` | Music library overview |
| [Readarr](arr/readarr.md) | `readarr` | Book library overview |
| [Bazarr](arr/bazarr.md) | `bazarr` | Missing subtitle counts |
| [Prowlarr](arr/prowlarr.md) | `prowlarr` | Indexer statistics |
| [Overseerr](arr/overseerr.md) | `overseerr` | Media request pipeline |

## Downloads

| Widget | Type | Description |
|--------|------|-------------|
| [SABnzbd](downloads/sabnzbd.md) | `sabnzbd` | Usenet download queue |
| [NZBGet](downloads/nzbget.md) | `nzbget` | Usenet download status |
| [Transmission](downloads/transmission.md) | `transmission` | Torrent status |

## Services

| Widget | Type | Description |
|--------|------|-------------|
| [Miniflux](services/miniflux.md) | `miniflux` | Feed reader stats |
| [Mealie](services/mealie.md) | `mealie` | Recipe manager stats |
| [Paperless-ngx](services/paperless-ngx.md) | `paperless-ngx` | Document manager stats |
