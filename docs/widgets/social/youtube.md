---
title: YouTube
description: Latest videos from specified YouTube channels, sorted by publish date.
---

# YouTube

Fetches the most recent videos from one or more YouTube channels using the YouTube Data API v3 and displays them sorted by publish date.

## Configuration

```js
{
  id: "my-youtube",
  type: "youtube",
  col: 1, row: 1, width: 6, height: 3,
  config: {
    title: "YouTube",
    channels: [
      "UCBcRF18a7Qf58cCRy5xuWwQ",
      "UCWX3yGbODI3HLdQTe7HcNwg"
    ],
    limit: 5,
    apiKey: "AIza..."
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"YouTube"` | Card heading. |
| `channels` | array of strings | — | YouTube **channel IDs** to fetch. One ID per entry. |
| `limit` | number | `5` | Total videos to display across all channels. Range: **1 – 20**. |
| `apiKey` | string | — | YouTube Data API v3 key. **Required.** |

## Credentials

**`apiKey`** — A YouTube Data API v3 key from Google Cloud Console.

1. Go to [console.cloud.google.com](https://console.cloud.google.com).
2. Create or select a project.
3. Enable the **YouTube Data API v3** under **APIs & Services > Library**.
4. Go to **APIs & Services > Credentials** and click **Create credentials > API key**.
5. (Recommended) Restrict the key to the YouTube Data API and your dashboard's origin.

!!! warning "API key required"
    This widget will not function without a valid `apiKey`. The YouTube Data API v3 requires authentication for all requests.

!!! tip "Finding a channel ID"
    Channel IDs begin with `UC`. To find a channel's ID, open the channel page on YouTube and look at the URL: `youtube.com/channel/UC...`. Alternatively, use a tool like [commentpicker.com/youtube-channel-id.php](https://commentpicker.com/youtube-channel-id.php).

## Examples

**Two channels, 10 latest videos**

```js
{
  id: "yt-feed",
  type: "youtube",
  col: 1, row: 1, width: 6, height: 3,
  config: {
    title: "Tech Videos",
    channels: [
      "UCVhQ2NnY5Rskt6UjCUkJ_DA",
      "UC9-y-6csu5WGm29I7JiwpnA"
    ],
    limit: 10,
    apiKey: "AIza..."
  }
}
```

**Single channel**

```js
{
  id: "yt-single",
  type: "youtube",
  col: 7, row: 1, width: 5, height: 2,
  config: {
    channels: ["UCBcRF18a7Qf58cCRy5xuWwQ"],
    limit: 5,
    apiKey: "AIza..."
  }
}
```

!!! note "Quota"
    The YouTube Data API v3 free tier provides **10 000 units per day**. Each channel fetch costs a small number of units. For a handful of channels refreshed every few minutes, the quota is rarely exceeded.
