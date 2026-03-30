---
title: Reddit
description: Posts from any subreddit with scores, comment counts, and flair.
---

# Reddit

Fetches posts from a chosen subreddit via the Reddit JSON API and displays them with upvote scores, comment counts, and post flair.

## Configuration

```js
{
  id: "my-reddit",
  type: "reddit",
  col: 1, row: 1, width: 6, height: 3,
  config: {
    title: "r/selfhosted",
    subreddit: "selfhosted",
    sort: "hot",
    limit: 10
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | — | Card heading. Omit to hide the title bar. |
| `subreddit` | string | `"programming"` | Subreddit name **without** the `r/` prefix. |
| `sort` | string | `"hot"` | Feed sort — `"hot"`, `"new"`, `"top"`, or `"rising"`. |
| `limit` | number | `10` | Number of posts to display. Range: **1 – 25**. |

!!! note "No API key required"
    Posts are fetched from the public Reddit JSON endpoint (`reddit.com/r/{sub}/{sort}.json`). No account or OAuth token is needed.

## Examples

**Hot posts from r/homelab**

```js
{
  id: "hl-reddit",
  type: "reddit",
  col: 1, row: 1, width: 6, height: 3,
  config: {
    title: "Homelab",
    subreddit: "homelab",
    sort: "hot",
    limit: 15
  }
}
```

**Top posts today from r/linux**

```js
{
  id: "linux-reddit",
  type: "reddit",
  col: 7, row: 1, width: 6, height: 3,
  config: {
    subreddit: "linux",
    sort: "top",
    limit: 10
  }
}
```

**Rising posts — no title**

```js
{
  id: "rising-news",
  type: "reddit",
  col: 1, row: 4, width: 5, height: 2,
  config: {
    subreddit: "worldnews",
    sort: "rising",
    limit: 8
  }
}
```

!!! tip "Multiple subreddits"
    To show several subreddits at once, use a [Group](../utilities/group.md) widget and add one Reddit tab per subreddit.

!!! warning "Reddit rate limiting"
    Reddit may throttle unauthenticated requests. If posts fail to load, try reducing `limit` or refreshing after a moment.
