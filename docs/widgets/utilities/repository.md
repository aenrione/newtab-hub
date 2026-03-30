---
title: Repository
description: GitHub repo stats, open PRs, issues, and recent commits in one card.
---

# Repository

Displays an overview of a single GitHub repository — star count, fork count, and open issues — plus paginated lists of open pull requests, open issues, and recent commits.

## Configuration

```js
{
  id: "my-repo",
  type: "repository",
  col: 1, row: 1, width: 6, height: 3,
  config: {
    title: "my-app",
    repo: "owner/repo",
    prsLimit: 5,
    issuesLimit: 5,
    commitsLimit: 5,
    token: "github_pat_..."
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | repo name | Card heading. Defaults to the repository name when omitted. |
| `repo` | string | — | GitHub repository in `owner/repo` format. **Required.** |
| `prsLimit` | number | `5` | Max open PRs to list. Hard cap of **20**. |
| `issuesLimit` | number | `5` | Max open issues to list. Hard cap of **20**. |
| `commitsLimit` | number | `5` | Max recent commits to list. Hard cap of **20**. |
| `token` | string | — | GitHub Personal Access Token. Optional but strongly recommended. |

## Credentials

**`token`** — A GitHub Personal Access Token (PAT).

- Go to **GitHub > Settings > Developer settings > Personal access tokens**.
- For public repositories, a token with no extra scopes is sufficient.
- For private repositories, grant the `repo` scope.

!!! warning "Rate limits"
    Without a token, GitHub allows **60 requests per hour** from the same IP. A token raises this to **5 000 requests per hour**. If you have multiple GitHub widgets on your dashboard, a token is strongly recommended.

## Examples

**Public repo, default limits**

```js
{
  id: "oss-repo",
  type: "repository",
  col: 1, row: 1, width: 6, height: 3,
  config: {
    repo: "glanceapp/glance"
  }
}
```

**Private repo with higher limits**

```js
{
  id: "work-repo",
  type: "repository",
  col: 7, row: 1, width: 6, height: 4,
  config: {
    title: "Backend API",
    repo: "my-org/backend-api",
    prsLimit: 10,
    issuesLimit: 10,
    commitsLimit: 15,
    token: "github_pat_..."
  }
}
```

!!! tip "Fine-grained tokens"
    GitHub fine-grained PATs (beta) let you restrict access to specific repositories. Use one with **Contents: Read-only** and **Pull requests: Read-only** for least-privilege access.
