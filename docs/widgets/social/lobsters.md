---
title: Lobsters
description: Stories from Lobsters with optional tag filtering.
---

# Lobsters

Fetches stories from [lobste.rs](https://lobste.rs) via its public JSON API. Supports hottest, newest, and active feeds, plus per-tag filtering for focused reading.

## Configuration

```js
{
  id: "my-lobsters",
  type: "lobsters",
  col: 1, row: 1, width: 6, height: 3,
  config: {
    title: "Lobsters",
    sort: "hottest",
    limit: 10,
    tags: []
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"Lobsters"` | Card heading. |
| `sort` | string | `"hottest"` | Feed sort — `"hottest"`, `"newest"`, or `"active"`. Ignored when `tags` is set. |
| `limit` | number | `10` | Number of stories to display. Range: **1 – 25**. |
| `tags` | array of strings | `[]` | Filter stories to specific tags (e.g. `["rust", "linux"]`). When non-empty, `sort` is ignored. |

!!! note "No API key required"
    This widget uses the public lobste.rs JSON API. No account or token is needed.

!!! warning "Tag overrides sort"
    When `tags` contains at least one value, the `sort` option has no effect. The API returns tag-filtered results in its own order.

## Examples

**Hottest stories — default**

```js
{
  id: "lobsters-hot",
  type: "lobsters",
  col: 1, row: 1, width: 6, height: 3,
  config: {
    limit: 15
  }
}
```

**Filter by tags**

```js
{
  id: "lobsters-rust",
  type: "lobsters",
  col: 7, row: 1, width: 6, height: 3,
  config: {
    title: "Rust & Linux",
    tags: ["rust", "linux"],
    limit: 20
  }
}
```

**Newest stories**

```js
{
  id: "lobsters-new",
  type: "lobsters",
  col: 1, row: 4, width: 5, height: 2,
  config: {
    title: "Lobsters New",
    sort: "newest",
    limit: 10
  }
}
```

!!! tip "Popular tags"
    Common lobste.rs tags include `programming`, `linux`, `security`, `web`, `rust`, `python`, `go`, `networking`, and `devops`. Browse all tags at [lobste.rs/tags](https://lobste.rs/tags).
