---
title: Twitch Top Games
description: Top trending games on Twitch with viewer counts and optional exclusions.
---

# Twitch Top Games

Displays the most-watched games on Twitch right now, ordered by total viewer count. Specific games can be excluded from the list.

## Configuration

```js
{
  id: "my-twitch-top-games",
  type: "twitch-top-games",
  col: 1, row: 1, width: 6, height: 2,
  config: {
    title: "Top Games",
    limit: 10,
    exclude: ["Just Chatting", "Special Events"],
    clientId: "YOUR_CLIENT_ID",
    accessToken: "YOUR_ACCESS_TOKEN"
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"Top Games"` | Card heading. |
| `limit` | number | `10` | Number of games to display. Range: **1 – 20**. |
| `exclude` | array of strings | `[]` | Game names to hide from the results (exact match). |
| `clientId` | string | — | Twitch application Client ID. **Required.** |
| `accessToken` | string | — | Twitch App Access Token. **Required.** |

## Credentials

This widget uses the same Twitch Developer Application credentials as [Twitch Channels](./twitch-channels.md).

1. Log in to [dev.twitch.tv/console](https://dev.twitch.tv/console) and register an application.
2. Copy the **Client ID**.
3. Generate an **App Access Token** via the Client Credentials flow:

```bash
curl -X POST "https://id.twitch.tv/oauth2/token" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "grant_type=client_credentials"
```

Use the returned `access_token` as `accessToken`.

!!! note "Same credentials for Twitch Channels"
    If you already have credentials set up for the [Twitch Channels](./twitch-channels.md) widget, reuse the same `clientId` and `accessToken` here.

!!! warning "Token expiry"
    App Access Tokens expire after roughly **60 days**. Regenerate and update your config when needed.

## Examples

**Default top 10**

```js
{
  id: "twitch-games",
  type: "twitch-top-games",
  col: 1, row: 1, width: 5, height: 2,
  config: {
    clientId: "abc123",
    accessToken: "def456"
  }
}
```

**Top 15, excluding non-gaming categories**

```js
{
  id: "twitch-games-filtered",
  type: "twitch-top-games",
  col: 7, row: 1, width: 5, height: 3,
  config: {
    title: "Top Games",
    limit: 15,
    exclude: ["Just Chatting", "Special Events", "Music", "IRL", "Talk Shows & Podcasts"],
    clientId: "abc123",
    accessToken: "def456"
  }
}
```

!!! tip "Combine with Twitch Channels"
    Place `twitch-top-games` and `twitch-channels` side by side — or inside a [Group](../utilities/group.md) widget — for a full Twitch overview in your dashboard.
