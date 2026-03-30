---
title: Plex
description: Show active streams and library counts from your Plex Media Server.
---

# Plex

Displays the number of active streams alongside a count of your movie, TV, and music libraries. Connects directly to your Plex Media Server using a Plex token.

## Configuration

```js
{ id: "my-plex", type: "plex", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Plex",
    url: "http://localhost:32400",
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"Plex"` | Label shown in the widget header. |
| `url` | string | `"http://localhost:32400"` | Base URL of your Plex Media Server. |

## Credentials

| Field | Type | Description |
|-------|------|-------------|
| `token` | password | Your Plex authentication token. |

To find your token: open Plex Web, go to **Settings → Account → Plex.tv account**, then select **Get token** (or follow the [Plex support article](https://support.plex.tv/articles/204059436-finding-an-authentication-token-x-plex-token/)). The token is a 20-character alphanumeric string.

!!! warning
    The Plex token grants full access to your server. Store it as a credential and do not share it.

## Displayed stats

| Stat | Description |
|------|-------------|
| Streams | Number of currently active playback sessions. |
| Movie Libs | Count of movie library sections. |
| TV Libs | Count of TV show library sections. |
| Music Libs | Count of music/artist library sections. |

!!! tip
    For more detailed stream information — direct play vs. transcode, bandwidth, user activity — use the [Tautulli widget](tautulli.md) alongside or instead of this one.

## Example

```js
{ id: "plex-1", type: "plex", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Plex",
    url: "http://192.168.1.100:32400",
  }
}
```
