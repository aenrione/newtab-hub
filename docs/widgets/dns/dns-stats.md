---
title: DNS Stats
description: Unified DNS stats widget supporting Pi-hole v5, Pi-hole v6, and AdGuard Home.
---

# DNS Stats

A single widget that surfaces DNS query and block statistics from three services: **Pi-hole v6**, **Pi-hole v5**, and **AdGuard Home**. It shows total queries, blocked queries, block rate percentage, a visual block-rate bar, and optionally a domains-blocked or active-clients footer.

!!! tip
    DNS Stats replaces both the legacy [Pi-hole widget](pihole.md) and the legacy [AdGuard Home widget](adguard.md). Use this widget for all new setups — it handles all three service variants from one configuration.

## Configuration

```js
{ id: "my-dns", type: "dns-stats", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "DNS Stats",
    service: "pihole6",
    url: "http://pi.hole",
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"DNS Stats"` | Label shown in the widget header. |
| `service` | string | `"pihole6"` | Which service to connect to: `"pihole6"`, `"pihole"`, or `"adguard"`. |
| `url` | string | *(required)* | Base URL of the DNS service instance. |

## Credentials

| Field | Type | Description |
|-------|------|-------------|
| `apiKey` | password | Credential value — meaning depends on the selected service (see below). |

### Credential by service

| Service | What to enter in `apiKey` |
|---------|--------------------------|
| `pihole6` | Your Pi-hole v6 **web password** (the password you use to log in to the admin UI). |
| `pihole` | Your Pi-hole v5 **API token** from **Settings → API / Web interface → API token**. |
| `adguard` | Your AdGuard Home credentials in `username:password` format (e.g. `admin:mysecret`). |

!!! note
    For Pi-hole v6, the widget authenticates via the `/api/auth` endpoint using your web password to obtain a session token, then queries `/api/stats/summary`. You do not need a separate API key — just your login password.

!!! warning
    For AdGuard Home, enter credentials as `username:password` (colon-separated) in the API Key field. This is used to build a Basic Auth header.

## Displayed stats

| Stat | Description |
|------|-------------|
| Queries today | Total DNS queries processed today. |
| Blocked today | Queries blocked today (highlighted). |
| Blocked % | Percentage of queries blocked (highlighted). |
| Domains blocked | Total domains on active blocklists (Pi-hole only). |
| Active clients | Number of active DNS clients (where available). |

A thin progress bar below the stats grid visualises the block rate at a glance.

## Examples

### Pi-hole v6

```js
{ id: "dns-1", type: "dns-stats", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Pi-hole",
    service: "pihole6",
    url: "http://192.168.1.1",
  }
}
```

### Pi-hole v5

```js
{ id: "dns-2", type: "dns-stats", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Pi-hole v5",
    service: "pihole",
    url: "http://192.168.1.1",
  }
}
```

### AdGuard Home

```js
{ id: "dns-3", type: "dns-stats", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "AdGuard Home",
    service: "adguard",
    url: "http://192.168.1.1:3000",
  }
}
```
