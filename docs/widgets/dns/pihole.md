---
title: Pi-hole (legacy)
description: Show query and block stats from Pi-hole v5 using the legacy API.
---

# Pi-hole

Displays total DNS queries, blocked queries, block rate percentage, and blocklist domain count from a Pi-hole instance. This widget uses the **Pi-hole v5 API** (`/admin/api.php`).

!!! warning
    This widget targets the Pi-hole v5 API. If you are running **Pi-hole v6**, use the [DNS Stats widget](dns-stats.md) with `service: "pihole6"` instead. The v5 API endpoint was removed in Pi-hole v6.

!!! tip
    The [DNS Stats widget](dns-stats.md) is the recommended approach for all Pi-hole versions. It supports v5, v6, and AdGuard Home from a single widget type.

## Configuration

```js
{ id: "my-pihole", type: "pihole", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Pi-hole",
    url: "http://pi.hole",
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"Pi-hole"` | Label shown in the widget header. |
| `url` | string | `"http://pi.hole"` | Base URL of your Pi-hole admin interface. |

## Credentials

| Field | Type | Description |
|-------|------|-------------|
| `apiKey` | password | Pi-hole v5 API token. |

To find your API token: open the Pi-hole admin panel, go to **Settings → API / Web interface**, and scroll to the **API token** section. Copy the long hex string shown there.

## Displayed stats

| Stat | Description |
|------|-------------|
| Total Queries | DNS queries processed today. |
| Blocked | Queries blocked today. |
| Block % | Percentage of queries blocked. |
| Blocklists | Number of domains on active blocklists. |

## Example

```js
{ id: "ph-1", type: "pihole", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Pi-hole",
    url: "http://192.168.1.1",
  }
}
```
