---
title: Mealie
description: Displays recipe, user, category, and tag counts from your Mealie instance.
---

# Mealie

Shows a summary of your Mealie recipe manager: total recipes, number of users, categories, and tags. Supports both Mealie v1 and v2 API versions.

## Configuration

```js
{ id: "my-mealie", type: "mealie", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Mealie",
    url: "http://localhost:9000",
    version: 1,
    apiKey: "your-api-key",
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"Mealie"` | Heading displayed on the widget. |
| `url` | string | `"http://localhost:9000"` | Base URL of your Mealie instance. |
| `version` | number | `1` | Mealie API version to use — `1` or `2`. |
| `apiKey` | string | — | Mealie API token. See [Credentials](#credentials). |

## Credentials

Open Mealie and navigate to your **User Profile** (click your avatar in the top-right). Select **API Tokens** and create a new token. Copy it and paste it into the `apiKey` field.

!!! note
    Set `version: 2` if you are running Mealie v2 or later. Using the wrong version will cause requests to fail silently or return unexpected data.

## Example

```js
{ id: "mealie-recipes", type: "mealie", col: 1, row: 2, width: 6, height: 1,
  config: {
    title: "Recipes",
    url: "http://192.168.1.10:9000",
    version: 2,
    apiKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  }
}
```

!!! tip
    If you recently upgraded Mealie, double-check which API version your installation exposes and update the `version` field accordingly.
