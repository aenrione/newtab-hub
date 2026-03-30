---
title: AdGuard Home (legacy)
description: Show query and block stats from AdGuard Home using basic authentication.
---

# AdGuard Home

Displays total DNS queries, blocked queries, block rate percentage, and filter rule count from an AdGuard Home instance. Uses the AdGuard Home REST API with HTTP Basic authentication.

!!! tip
    This widget is also available via the unified [DNS Stats widget](dns-stats.md) with `service: "adguard"`. The DNS Stats widget is the recommended approach if you want a single widget type that can switch between AdGuard Home and Pi-hole.

## Configuration

```js
{ id: "my-adguard", type: "adguard", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "AdGuard Home",
    url: "http://localhost:3000",
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"AdGuard Home"` | Label shown in the widget header. |
| `url` | string | `"http://localhost:3000"` | Base URL of your AdGuard Home instance. |

## Credentials

| Field | Type | Description |
|-------|------|-------------|
| `username` | text | AdGuard Home admin username. |
| `password` | password | AdGuard Home admin password. |

Use the same username and password you use to log in to the AdGuard Home web interface. There are no API-specific tokens in AdGuard Home — standard Basic Auth credentials are used.

!!! note
    AdGuard Home defaults to port `3000` on initial setup but is often moved to port `80` or `443` after configuration. Check your AdGuard Home setup for the correct port.

## Displayed stats

| Stat | Description |
|------|-------------|
| Total Queries | DNS queries processed today. |
| Blocked | Queries blocked today. |
| Block % | Percentage of queries blocked. |
| Filter Rules | Total number of active filter rules. |

## Example

```js
{ id: "adg-1", type: "adguard", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "AdGuard Home",
    url: "http://192.168.1.1:3000",
  }
}
```
