---
title: Sonarr
description: Displays upcoming TV episodes within a configurable number of days.
---

# Sonarr

Shows upcoming TV episodes organised by air date, pulling from your Sonarr calendar. Useful for keeping track of what is airing soon without opening the full Sonarr UI.

## Configuration

```js
{ id: "my-sonarr", type: "sonarr", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "On Deck",
    url: "http://localhost:8989",
    days: 7,
    apiKey: "your-api-key",
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"On Deck"` | Heading displayed on the widget. |
| `url` | string | `"http://localhost:8989"` | Base URL of your Sonarr instance. |
| `days` | number | `7` | Number of upcoming days to fetch episodes for (1–30). |
| `apiKey` | string | — | Sonarr API key. See [Credentials](#credentials). |

## Credentials

Open Sonarr and navigate to **Settings > General**. Your API key is listed under the **Security** section. Copy it and paste it into the `apiKey` field.

!!! warning
    Keep your API key private. Anyone with the key can control your Sonarr instance.

## Example

```js
{ id: "sonarr-upcoming", type: "sonarr", col: 1, row: 1, width: 8, height: 2,
  config: {
    title: "Airing This Week",
    url: "http://192.168.1.10:8989",
    days: 7,
    apiKey: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  }
}
```

!!! tip
    Pair this widget with the [Bazarr](bazarr.md) widget to monitor subtitle availability for upcoming episodes.
