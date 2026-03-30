---
title: Immich
description: Show photo and video counts and storage usage from your Immich instance.
---

# Immich

Displays total photos, videos, assets, and storage usage from your self-hosted Immich photo library.

## Configuration

```js
{ id: "my-immich", type: "immich", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Immich",
    url: "http://localhost:2283",
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"Immich"` | Label shown in the widget header. |
| `url` | string | `"http://localhost:2283"` | Base URL of your Immich instance. |

## Credentials

| Field | Type | Description |
|-------|------|-------------|
| `apiKey` | password | An Immich API key. |

To generate an API key: log in to Immich, open your **Account Settings** (avatar → Account Settings), scroll to the **API Keys** section, and click **New API Key**. Copy the key immediately — it will not be shown again.

!!! note
    The API key is scoped to the account that created it. Use an admin account if you want server-wide stats.

## Displayed stats

| Stat | Description |
|------|-------------|
| Photos | Total photo assets in the library. |
| Videos | Total video assets in the library. |
| Total Assets | Combined photo and video count. |
| Storage | Total disk usage for all assets. |

## Example

```js
{ id: "immich-1", type: "immich", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Immich",
    url: "http://192.168.1.75:2283",
  }
}
```
