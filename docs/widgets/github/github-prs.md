---
title: GitHub PRs
description: Open pull requests filtered by your role — authored, review-requested, assigned, or all.
---

# GitHub PRs

Lists open GitHub pull requests filtered by your relationship to them. Supports filtering by authored, review-requested, assigned, mentioned, or all PRs. Draft PRs are clearly labelled.

## Configuration

```js
{
  id: "my-github-prs",
  type: "github-prs",
  col: 1, row: 1, width: 6, height: 3,
  config: {
    title: "Pull Requests",
    filter: "authored",
    limit: 15,
    repos: [],
    token: "github_pat_..."
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"Pull Requests"` | Card heading. |
| `filter` | string | `"authored"` | Role filter — `"all"`, `"review-requested"`, `"authored"`, `"assigned"`, or `"mentioned"`. |
| `limit` | number | `15` | Maximum PRs to display. Hard cap of **50**. |
| `repos` | array of strings | `[]` | Restrict results to specific repos (`owner/repo`). Leave empty to search all repos. |
| `token` | string | — | GitHub Personal Access Token. **Required.** |

## Credentials

**`token`** — A GitHub Personal Access Token (PAT) with the `repo` scope.

- Go to **GitHub > Settings > Developer settings > Personal access tokens**.
- Grant the **`repo`** scope (required to search pull requests across repositories).
- For organisations using SSO, authorise the token for the relevant organisation after creation.

!!! warning "Token required"
    Unlike some other GitHub widgets, the GitHub PRs widget **requires** a token. PR search queries must be authenticated; unauthenticated requests will fail.

!!! tip "Fine-grained tokens"
    GitHub fine-grained PATs can be scoped to specific repositories. Grant **Pull requests: Read-only** and **Contents: Read-only** for least-privilege access.

## Examples

**PRs waiting for your review**

```js
{
  id: "prs-review",
  type: "github-prs",
  col: 1, row: 1, width: 6, height: 3,
  config: {
    title: "Needs Review",
    filter: "review-requested",
    limit: 20,
    token: "github_pat_..."
  }
}
```

**Your open PRs across all repos**

```js
{
  id: "prs-mine",
  type: "github-prs",
  col: 7, row: 1, width: 6, height: 2,
  config: {
    title: "My PRs",
    filter: "authored",
    limit: 10,
    token: "github_pat_..."
  }
}
```

**All open PRs in a specific repo**

```js
{
  id: "prs-repo",
  type: "github-prs",
  col: 1, row: 4, width: 6, height: 3,
  config: {
    title: "backend-api PRs",
    filter: "all",
    repos: ["my-org/backend-api"],
    limit: 25,
    token: "github_pat_..."
  }
}
```

!!! note "Draft PRs"
    Draft pull requests are included in results and shown with a **Draft** badge so you can distinguish them from ready-for-review PRs at a glance.
