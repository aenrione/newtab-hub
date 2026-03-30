---
title: Feeds
description: Inline RSS/Atom feed reader with up to 4 headlines per source
---

# Feeds

An inline RSS/Atom feed reader that fetches XML directly in the browser — no external service or API key required. Shows up to 4 headlines per feed alongside publication dates and a link to the feed's homepage.

## Configuration

```js
{ id: "my-feeds", type: "feeds", col: 1, row: 1, width: 6, height: 3,
  config: {
    title: "News",
    items: [
      { title: "Hacker News", url: "https://news.ycombinator.com/rss", site: "https://news.ycombinator.com" }
    ]
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | — | Widget heading. |
| `items` | array | — | Array of feed source objects (see sub-fields below). |
| `items[].title` | string | — | Display name of the feed. |
| `items[].url` | string | — | Full RSS or Atom feed URL. |
| `items[].site` | string | — | Homepage URL for the feed. Shown as an "Open" link next to the feed title. |

## Examples

### Minimal

```js
{ id: "w1", type: "feeds", col: 1, row: 1, width: 6, height: 3,
  config: {
    items: [
      { title: "Hacker News", url: "https://news.ycombinator.com/rss", site: "https://news.ycombinator.com" }
    ]
  }
}
```

### Advanced

```js
{ id: "w1", type: "feeds", col: 1, row: 1, width: 8, height: 4,
  config: {
    title: "Tech News",
    items: [
      {
        title: "Hacker News",
        url: "https://news.ycombinator.com/rss",
        site: "https://news.ycombinator.com"
      },
      {
        title: "The Verge",
        url: "https://www.theverge.com/rss/index.xml",
        site: "https://theverge.com"
      },
      {
        title: "Ars Technica",
        url: "https://feeds.arstechnica.com/arstechnica/index",
        site: "https://arstechnica.com"
      }
    ]
  }
}
```

!!! note
    Feed fetching is done directly from the browser. If a feed blocks cross-origin requests (CORS), it will not load. Most RSS feeds are publicly accessible without restrictions.

!!! tip
    Increase widget `height` to give each feed more room to display headlines without truncation.
