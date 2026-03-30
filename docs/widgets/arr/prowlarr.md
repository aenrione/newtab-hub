---
title: Prowlarr
description: Displays indexer statistics including grabs, queries, and failed grabs.
---

# Prowlarr

Shows a summary of your Prowlarr indexer activity: total configured indexers, number of grabs, queries made, and failed grabs. Useful for monitoring the health of your indexer setup.

## Configuration

```js
{ id: "my-prowlarr", type: "prowlarr", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Prowlarr",
    url: "http://localhost:9696",
    apiKey: "your-api-key",
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"Prowlarr"` | Heading displayed on the widget. |
| `url` | string | `"http://localhost:9696"` | Base URL of your Prowlarr instance. |
| `apiKey` | string | — | Prowlarr API key. See [Credentials](#credentials). |

## Credentials

Open Prowlarr and navigate to **Settings > General**. Your API key is listed under the **Security** section. Copy it and paste it into the `apiKey` field.

!!! warning
    Keep your API key private. Anyone with the key can manage your indexers.

## Example

```js
{ id: "prowlarr-stats", type: "prowlarr", col: 7, row: 1, width: 6, height: 1,
  config: {
    title: "Indexers",
    url: "http://192.168.1.10:9696",
    apiKey: "a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4",
  }
}
```

!!! note
    A high failed-grabs count may indicate an indexer is down or your credentials have expired. Check **Indexers** in Prowlarr for details.
