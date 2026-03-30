---
title: Hacker News
description: Top or new stories from Hacker News with scores and comment counts.
---

# Hacker News

Fetches stories from Hacker News via the Algolia HN API and displays them with scores, comment counts, and direct links to the story and its discussion thread.

## Configuration

```js
{
  id: "my-hn",
  type: "hacker-news",
  col: 1, row: 1, width: 6, height: 3,
  config: {
    title: "Hacker News",
    limit: 10,
    sort: "top"
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"Hacker News"` | Card heading. |
| `limit` | number | `10` | Number of stories to display. Range: **1 – 30**. |
| `sort` | string | `"top"` | Story feed — `"top"` for the front page or `"new"` for the newest submissions. |

!!! note "No API key required"
    This widget uses the public [Algolia HN API](https://hn.algolia.com/api). No account or key is needed.

## Examples

**Top 15 stories**

```js
{
  id: "hn-top",
  type: "hacker-news",
  col: 1, row: 1, width: 6, height: 3,
  config: {
    limit: 15,
    sort: "top"
  }
}
```

**Latest 20 new submissions**

```js
{
  id: "hn-new",
  type: "hacker-news",
  col: 7, row: 1, width: 6, height: 4,
  config: {
    title: "HN New",
    limit: 20,
    sort: "new"
  }
}
```

!!! tip "Pair with a Group widget"
    Combine `hacker-news`, `lobsters`, and `reddit` inside a [Group](../utilities/group.md) widget to keep your news feeds in a single card.
