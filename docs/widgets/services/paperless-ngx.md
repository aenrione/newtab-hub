---
title: Paperless-ngx
description: Displays total documents, inbox count, tags, and correspondents from Paperless-ngx.
---

# Paperless-ngx

Shows a quick summary of your Paperless-ngx document archive: total documents stored, how many are in the inbox awaiting processing, number of tags, and number of correspondents.

## Configuration

```js
{ id: "my-paperless", type: "paperless-ngx", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Paperless-ngx",
    url: "http://localhost:8000",
    apiKey: "your-api-token",
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"Paperless-ngx"` | Heading displayed on the widget. |
| `url` | string | `"http://localhost:8000"` | Base URL of your Paperless-ngx instance. |
| `apiKey` | string | — | Paperless-ngx API token. See [Credentials](#credentials). |

## Credentials

You can obtain an API token in two ways:

- **Via the UI:** Open Paperless-ngx and go to **Settings > API Token**. Your token is displayed there.
- **Via the REST API:** Send a `POST` request to `/api/token/` with your username and password to receive a token programmatically.

Paste the token into the `apiKey` field.

!!! warning
    The API token grants full read/write access to your document archive. Store it securely and rotate it if you suspect it has been compromised.

## Example

```js
{ id: "paperless-overview", type: "paperless-ngx", col: 7, row: 2, width: 6, height: 1,
  config: {
    title: "Documents",
    url: "http://192.168.1.10:8000",
    apiKey: "abcdef1234567890abcdef1234567890abcdef12",
  }
}
```

!!! tip
    A non-zero inbox count means documents are waiting to be tagged and filed. Check your Paperless-ngx inbox regularly to keep your archive organised.
