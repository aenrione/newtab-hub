---
title: Credentials
description: How to store API keys and passwords securely in New Tab Hub
---

# Credentials

Many widgets connect to self-hosted services that require authentication. New Tab Hub stores credentials separately from config using a `credentials` field on the widget, keeping them out of your shared config files.

## How Credentials Work

Credentials are defined per widget instance using a `credentials` object alongside `config`:

```js
{ id: "sonarr", type: "sonarr", col: 1, row: 3, width: 6, height: 1,
  config: {
    url: "http://192.168.1.100:8989"
  },
  credentials: {
    apiKey: "your-sonarr-api-key-here"
  }
}
```

!!! warning "Keep credentials in private profiles"
    Never put real API keys in `profiles/shared/`. Use `profiles/private/` (git-ignored) for any widget that requires credentials. See [Profiles](profiles.md) for setup.

## Credential Field Types

| Type | Usage |
|------|-------|
| `apiKey` | Most service widgets (Sonarr, Radarr, Jellyfin, etc.) |
| `token` | GitHub, Plex, Home Assistant |
| `username` + `password` | NZBGet, Transmission, Nextcloud |
| `clientId` + `accessToken` | Twitch widgets |

## Example: Private Profile with Credentials

```js
// profiles/private/home.js
window.NEW_TAB_SHARED_PROFILES = window.NEW_TAB_SHARED_PROFILES || {};

window.NEW_TAB_SHARED_PROFILES.home = {
  label: "Home",
  widgets: [
    { id: "sonarr", type: "sonarr",
      col: 1, row: 1, width: 6, height: 1,
      config: { url: "http://192.168.1.10:8989", title: "Sonarr" },
      credentials: { apiKey: "abc123..." }
    },
    { id: "plex", type: "plex",
      col: 7, row: 1, width: 6, height: 1,
      config: { url: "http://192.168.1.10:32400" },
      credentials: { token: "xyz789..." }
    }
  ]
};
```

## Finding API Keys

Each widget's documentation page includes a **Credentials** section that explains exactly where to find the key in that service's UI. See the [Widgets](../widgets/index.md) section.

!!! tip
    The `credentials` object is stored in browser memory and never sent anywhere other than the target service URL. However, for maximum security, keep private profile files outside your repo directory entirely and symlink them in.
