---
title: Twitch Channels
description: Live/offline status for specified Twitch channels with viewer counts.
---

# Twitch Channels

Shows the live/offline status of a list of Twitch channels. Live channels display the current viewer count and stream title. Offline channels can be shown or hidden.

## Configuration

```js
{
  id: "my-twitch-channels",
  type: "twitch-channels",
  col: 1, row: 1, width: 6, height: 2,
  config: {
    title: "Twitch",
    channels: ["shroud", "summit1g", "lirik"],
    showOffline: true,
    clientId: "YOUR_CLIENT_ID",
    accessToken: "YOUR_ACCESS_TOKEN"
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"Twitch"` | Card heading. |
| `channels` | array of strings | — | Twitch channel **login names** (lowercase, as they appear in the URL). |
| `showOffline` | boolean | `true` | When `false`, offline channels are hidden from the list. |
| `clientId` | string | — | Twitch application Client ID. **Required.** |
| `accessToken` | string | — | Twitch App Access Token. **Required.** |

## Credentials

This widget requires a **Twitch Developer Application**.

1. Log in to [dev.twitch.tv/console](https://dev.twitch.tv/console).
2. Click **Register Your Application**.
3. Set the **OAuth Redirect URL** to `http://localhost` (not used, but required by the form).
4. Copy the **Client ID** shown after saving.
5. Generate an **App Access Token** using the Client Credentials flow:

```bash
curl -X POST "https://id.twitch.tv/oauth2/token" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "grant_type=client_credentials"
```

The response contains `access_token` — use this as `accessToken`.

!!! warning "Token expiry"
    App Access Tokens expire after roughly **60 days**. You will need to regenerate the token and update your config when it expires.

!!! note "Same credentials for Twitch Top Games"
    The [Twitch Top Games](./twitch-top-games.md) widget uses the same `clientId` and `accessToken`.

## Examples

**Live channels only**

```js
{
  id: "twitch-live",
  type: "twitch-channels",
  col: 1, row: 1, width: 5, height: 2,
  config: {
    title: "Live Now",
    channels: ["shroud", "pokimane", "xqc"],
    showOffline: false,
    clientId: "abc123",
    accessToken: "def456"
  }
}
```

**All channels including offline**

```js
{
  id: "twitch-all",
  type: "twitch-channels",
  col: 7, row: 1, width: 5, height: 3,
  config: {
    channels: ["shroud", "summit1g", "lirik", "sodapoppin"],
    showOffline: true,
    clientId: "abc123",
    accessToken: "def456"
  }
}
```
