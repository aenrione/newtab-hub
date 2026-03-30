---
title: SABnzbd
description: Displays SABnzbd download queue stats including speed, remaining size, and ETA.
---

# SABnzbd

Shows the current state of your SABnzbd download queue: number of queued items, current download speed, remaining data size, and estimated time of completion.

## Configuration

```js
{ id: "my-sabnzbd", type: "sabnzbd", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "SABnzbd",
    url: "http://localhost:8080",
    apiKey: "your-api-key",
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"SABnzbd"` | Heading displayed on the widget. |
| `url` | string | `"http://localhost:8080"` | Base URL of your SABnzbd instance. |
| `apiKey` | string | — | SABnzbd API key. See [Credentials](#credentials). |

## Credentials

Open SABnzbd and navigate to **Config > General**. Your API key is shown in the **Security** section under **API Key**. Copy it and paste it into the `apiKey` field.

The widget appends the key as an `apikey` query parameter on all requests — no additional setup is needed.

!!! warning
    Keep your API key private. It allows full control over SABnzbd including adding and removing downloads.

## Example

```js
{ id: "sabnzbd-queue", type: "sabnzbd", col: 1, row: 3, width: 6, height: 1,
  config: {
    title: "Usenet",
    url: "http://192.168.1.10:8080",
    apiKey: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  }
}
```

!!! tip
    Place this widget next to [NZBGet](nzbget.md) or [Transmission](transmission.md) if you run multiple download clients side by side.
