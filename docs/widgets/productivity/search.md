---
title: Search
description: Auto-focused search bar with dashboard, bookmark, history, and web search integration
---

# Search

An auto-focused search bar that queries your dashboard items, browser bookmarks, browser history, and the web — all from a single input. Press the configured focus key (default `/`) at any time to jump to the search bar.

## Configuration

```js
{ id: "my-search", type: "search", col: 1, row: 1, width: 12, height: 1,
  config: {
    searchBaseUrl: "https://duckduckgo.com/?q="
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `searchBaseUrl` | string | `"https://duckduckgo.com/?q="` | Base URL for web searches. The query is appended to this string. |
| `placeholder` | string | — | Placeholder text shown inside the input. |
| `focusKey` | string | `"/"` | Keyboard shortcut that focuses the search input. |
| `autoFocusOnLoad` | boolean | `true` | Automatically focus the input when a new tab opens. |
| `sources.dashboard` | boolean | `true` | Include dashboard items (widgets, links) in results. |
| `sources.bookmarks` | boolean | `true` | Include browser bookmarks in results. |
| `sources.history` | boolean | `true` | Include browser history in results. |
| `sources.webSearch` | boolean | `true` | Show a "Search the web" action in results. |
| `sourceLimits.dashboard` | number | `6` | Maximum number of dashboard results to show. |
| `sourceLimits.bookmarks` | number | `5` | Maximum number of bookmark results to show. |
| `sourceLimits.history` | number | `5` | Maximum number of history results to show. |

## Examples

### Minimal

```js
{ id: "w1", type: "search", col: 1, row: 1, width: 12, height: 1,
  config: {
    searchBaseUrl: "https://duckduckgo.com/?q="
  }
}
```

### Advanced

```js
{ id: "w1", type: "search", col: 1, row: 1, width: 12, height: 1,
  config: {
    searchBaseUrl: "https://www.google.com/search?q=",
    placeholder: "Search…",
    focusKey: "/",
    autoFocusOnLoad: true,
    sources: {
      dashboard: true,
      bookmarks: true,
      history: false,
      webSearch: true
    },
    sourceLimits: {
      dashboard: 8,
      bookmarks: 6,
      history: 0
    }
  }
}
```

!!! tip
    Set `autoFocusOnLoad: false` if you have multiple search widgets or prefer not to steal focus on every new tab open.

!!! note
    Browser history and bookmark access require the extension to have the appropriate browser permissions granted.
