---
title: GitHub Releases
description: Recent releases across multiple repos, sorted by date, with pre-release badges.
---

# GitHub Releases

Fetches the latest releases from one or more GitHub repositories and lists them sorted by publication date. Pre-release versions are labelled with a badge.

## Configuration

```js
{
  id: "my-github-releases",
  type: "github-releases",
  col: 1, row: 1, width: 6, height: 3,
  config: {
    title: "Releases",
    repos: [
      "glanceapp/glance",
      "immich-app/immich",
      "paperless-ngx/paperless-ngx"
    ],
    limit: 10,
    token: "github_pat_..."
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"Releases"` | Card heading. |
| `repos` | array of strings | — | GitHub repositories in `owner/repo` format. **Required.** |
| `limit` | number | `10` | Maximum releases to display across all repos. Hard cap of **50**. |
| `token` | string | — | GitHub Personal Access Token. Strongly recommended to avoid rate limits. |

## Credentials

**`token`** — A GitHub Personal Access Token (PAT).

- Go to **GitHub > Settings > Developer settings > Personal access tokens**.
- For public repositories, a token with **no extra scopes** is sufficient.
- For private repositories, grant the `repo` scope.

!!! warning "Rate limits"
    Unauthenticated requests are limited to **60 per hour** from a single IP. With a token, the limit rises to **5 000 per hour**. Dashboards with many repos should always provide a token.

## Examples

**Self-hosted app releases**

```js
{
  id: "releases-selfhosted",
  type: "github-releases",
  col: 1, row: 1, width: 6, height: 3,
  config: {
    title: "App Updates",
    repos: [
      "glanceapp/glance",
      "immich-app/immich",
      "paperless-ngx/paperless-ngx",
      "jellyfin/jellyfin",
      "portainer/portainer"
    ],
    limit: 20,
    token: "github_pat_..."
  }
}
```

**Single repo, include pre-releases**

```js
{
  id: "releases-single",
  type: "github-releases",
  col: 7, row: 1, width: 5, height: 2,
  config: {
    repos: ["owner/my-app"],
    limit: 5,
    token: "github_pat_..."
  }
}
```

!!! tip "Pre-release badge"
    Releases tagged as pre-releases on GitHub are automatically marked with a **Pre-release** badge in the widget. No extra configuration is needed.

!!! note "Release vs tag"
    This widget fetches GitHub **Releases** (created via the Releases UI or API), not raw git tags. Repositories that only push tags without creating a release will not appear here.
