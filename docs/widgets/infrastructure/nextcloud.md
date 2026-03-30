---
title: Nextcloud
description: Show active users, total files, and free space from your Nextcloud server.
---

# Nextcloud

Displays the number of active users (last 5 minutes), total file count, and available free space from the Nextcloud Server Info API.

## Configuration

```js
{ id: "my-nextcloud", type: "nextcloud", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Nextcloud",
    url: "https://cloud.example.com",
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"Nextcloud"` | Label shown in the widget header. |
| `url` | string | `"https://localhost"` | Base URL of your Nextcloud instance (typically HTTPS on port 443). |

## Credentials

| Field | Type | Description |
|-------|------|-------------|
| `username` | text | Admin username for your Nextcloud instance. |
| `password` | password | Password for the admin account. |

The widget calls the Nextcloud **Server Info** endpoint (`/ocs/v2.php/apps/serverinfo/api/v1/info`), which requires admin privileges. You can use an app password instead of your main password: go to **Settings → Security → Devices & sessions** and create a new app password.

!!! tip
    Using an app password is recommended over your main account password. App passwords can be revoked individually without changing your account credentials.

!!! warning
    Nextcloud typically runs on HTTPS. Make sure your server certificate is trusted by the browser, otherwise the request will be blocked by the browser's mixed-content or certificate policy.

## Displayed stats

| Stat | Description |
|------|-------------|
| Active Users | Users with activity in the last 5 minutes. |
| Total Files | Total file count across all users. |
| Free Space | Available disk space on the data directory. |

## Example

```js
{ id: "nc-1", type: "nextcloud", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Nextcloud",
    url: "https://cloud.homelab.local",
  }
}
```
