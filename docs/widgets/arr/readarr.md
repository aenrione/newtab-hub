---
title: Readarr
description: Displays a summary of your book library including total books, owned, wanted, and queued.
---

# Readarr

Shows a high-level overview of your Readarr book library: total books tracked, how many you have, how many are wanted, and how many are currently in the download queue.

## Configuration

```js
{ id: "my-readarr", type: "readarr", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Readarr",
    url: "http://localhost:8787",
    apiKey: "your-api-key",
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"Readarr"` | Heading displayed on the widget. |
| `url` | string | `"http://localhost:8787"` | Base URL of your Readarr instance. |
| `apiKey` | string | — | Readarr API key. See [Credentials](#credentials). |

## Credentials

Open Readarr and navigate to **Settings > General**. Your API key is listed under the **Security** section. Copy it and paste it into the `apiKey` field.

!!! warning
    Keep your API key private. Anyone with the key can control your Readarr instance.

## Example

```js
{ id: "readarr-overview", type: "readarr", col: 7, row: 2, width: 6, height: 1,
  config: {
    title: "Books",
    url: "http://192.168.1.10:8787",
    apiKey: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  }
}
```

!!! tip
    Readarr pairs well with [Lidarr](lidarr.md) for a media-plus-books row on your dashboard.
