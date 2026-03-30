---
title: Bookmarks
description: Organises links into labelled groups with favicons
---

# Bookmarks

Organises a large collection of links into named groups, each item rendered with a favicon. Ideal as a replacement for your browser's bookmarks bar when you need more structure.

## Configuration

```js
{ id: "my-bookmarks", type: "bookmarks", col: 1, row: 1, width: 6, height: 2,
  config: {
    title: "Bookmarks",
    groups: [
      {
        title: "News",
        items: [
          { title: "Hacker News", href: "https://news.ycombinator.com" }
        ]
      }
    ]
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"Bookmarks"` | Widget heading. |
| `groups` | array | — | Array of bookmark group objects (see sub-fields below). |
| `groups[].title` | string | — | Optional heading for the group. Omit for an untitled group. |
| `groups[].items` | array | — | List of bookmark items inside this group. |
| `groups[].items[].title` | string | — | Display label for the bookmark. |
| `groups[].items[].href` | string | — | Destination URL. |

## Examples

### Minimal

```js
{ id: "w1", type: "bookmarks", col: 1, row: 1, width: 6, height: 2,
  config: {
    groups: [
      {
        items: [
          { title: "GitHub",   href: "https://github.com" },
          { title: "YouTube",  href: "https://youtube.com" }
        ]
      }
    ]
  }
}
```

### Advanced

```js
{ id: "w1", type: "bookmarks", col: 1, row: 1, width: 8, height: 3,
  config: {
    title: "My Bookmarks",
    groups: [
      {
        title: "News",
        items: [
          { title: "Hacker News",  href: "https://news.ycombinator.com" },
          { title: "The Verge",    href: "https://theverge.com" },
          { title: "Ars Technica", href: "https://arstechnica.com" }
        ]
      },
      {
        title: "Development",
        items: [
          { title: "MDN Web Docs", href: "https://developer.mozilla.org" },
          { title: "Can I Use",    href: "https://caniuse.com" },
          { title: "DevDocs",      href: "https://devdocs.io" }
        ]
      },
      {
        title: "Social",
        items: [
          { title: "GitHub",   href: "https://github.com" },
          { title: "Reddit",   href: "https://reddit.com" }
        ]
      }
    ]
  }
}
```

!!! tip
    For very large collections, split items across multiple `bookmarks` widgets placed side-by-side so each group stays readable without scrolling.
