---
title: Overseerr
description: Displays a summary of media requests including pending, approved, available, and total counts.
---

# Overseerr

Shows a snapshot of your Overseerr request pipeline: how many requests are pending review, approved and processing, already available, and the total request count.

## Configuration

```js
{ id: "my-overseerr", type: "overseerr", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Overseerr",
    url: "http://localhost:5055",
    apiKey: "your-api-key",
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"Overseerr"` | Heading displayed on the widget. |
| `url` | string | `"http://localhost:5055"` | Base URL of your Overseerr instance. |
| `apiKey` | string | — | Overseerr API key. See [Credentials](#credentials). |

## Credentials

Open Overseerr and navigate to **Settings > General**. Your API key is shown in the **API Key** field. Copy it and paste it into the `apiKey` field.

!!! warning
    Keep your API key private. It grants access to request data and user information.

## Example

```js
{ id: "overseerr-requests", type: "overseerr", col: 1, row: 2, width: 6, height: 1,
  config: {
    title: "Requests",
    url: "http://192.168.1.10:5055",
    apiKey: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  }
}
```

!!! tip
    Place this widget alongside [Radarr](radarr.md) and [Sonarr](sonarr.md) for a complete view from request through to availability.
