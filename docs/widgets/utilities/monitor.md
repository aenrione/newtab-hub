---
title: Monitor
description: Ping URLs and display response times or status badges.
---

# Monitor

Pings a list of URLs using a no-cors `fetch` request with an 8-second timeout. Each site shows its response time in milliseconds, or a **Down** / **Timeout** badge when unreachable.

## Configuration

```js
{
  id: "my-monitor",
  type: "monitor",
  col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Monitor",
    sites: [
      { label: "Home Assistant", url: "http://homeassistant.local:8123" },
      { label: "Plex",           url: "http://192.168.1.10:32400" },
      { label: "Router",         url: "http://192.168.1.1" }
    ]
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"Monitor"` | Card heading. |
| `sites` | array | — | List of sites to ping. Each entry requires `label` and `url`. |
| `sites[].label` | string | — | Display name shown next to the status badge. |
| `sites[].url` | string | — | Full URL to ping (include protocol and port). |

## Examples

**Minimal — single site**

```js
{
  id: "monitor-router",
  type: "monitor",
  col: 1, row: 1, width: 4, height: 1,
  config: {
    title: "Network",
    sites: [
      { label: "Router", url: "http://192.168.1.1" }
    ]
  }
}
```

**Multiple services**

```js
{
  id: "monitor-services",
  type: "monitor",
  col: 1, row: 2, width: 6, height: 1,
  config: {
    title: "Services",
    sites: [
      { label: "Portainer",      url: "http://192.168.1.10:9000" },
      { label: "Grafana",        url: "http://192.168.1.10:3000" },
      { label: "Uptime Kuma",    url: "http://192.168.1.10:3001" },
      { label: "Nextcloud",      url: "https://cloud.example.com" }
    ]
  }
}
```

!!! note "No-cors fetch"
    Requests use `mode: "no-cors"` so they work cross-origin without a proxy. Response time is measured from the browser, not the server, so values include network latency.

!!! tip "Timeout"
    Any site that does not respond within **8 seconds** is shown as **Timeout**. Sites that return a network error are shown as **Down**.
