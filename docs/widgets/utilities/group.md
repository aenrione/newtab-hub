---
title: Group (Tabs)
description: Tabbed container that hosts multiple child widgets in a single card.
---

# Group (Tabs)

A tabbed card that renders multiple child widgets in the same grid cell. Each tab hosts one full widget. Switch between them by clicking the tab labels.

## Configuration

```js
{
  id: "my-group",
  type: "group",
  col: 1, row: 1, width: 6, height: 2,
  config: {
    title: "My Tabs",
    tabs: [
      {
        label: "Reddit",
        type: "reddit",
        config: { subreddit: "selfhosted", limit: 10 }
      },
      {
        label: "Hacker News",
        type: "hacker-news",
        config: { limit: 10 }
      }
    ]
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | — | Card heading. Leave blank or omit to hide the title bar. |
| `tabs` | array | — | One or more tab definitions. **Required.** |
| `tabs[].label` | string | — | Text shown on the tab button. |
| `tabs[].type` | string | — | Widget type to render inside the tab. Cannot be `"group"`. |
| `tabs[].config` | object | — | Full config object passed to the child widget. |

## Examples

**News feeds in one card**

```js
{
  id: "news-tabs",
  type: "group",
  col: 1, row: 1, width: 6, height: 3,
  config: {
    tabs: [
      {
        label: "HN",
        type: "hacker-news",
        config: { limit: 15 }
      },
      {
        label: "Lobsters",
        type: "lobsters",
        config: { limit: 15 }
      },
      {
        label: "r/programming",
        type: "reddit",
        config: { subreddit: "programming", limit: 15 }
      }
    ]
  }
}
```

**Monitoring + iframe**

```js
{
  id: "infra-tabs",
  type: "group",
  col: 7, row: 1, width: 6, height: 3,
  config: {
    title: "Infrastructure",
    tabs: [
      {
        label: "Status",
        type: "monitor",
        config: {
          sites: [
            { label: "Portainer", url: "http://192.168.1.10:9000" },
            { label: "Grafana",   url: "http://192.168.1.10:3000" }
          ]
        }
      },
      {
        label: "Grafana",
        type: "iframe",
        config: { url: "http://192.168.1.10:3000/d/home?kiosk", height: 500 }
      }
    ]
  }
}
```

!!! warning "No nesting"
    A `group` widget **cannot** be used as a child inside another `group`. Setting `type: "group"` inside a tab definition is not supported and will be ignored.

!!! tip "Shared space"
    All tabs share the same card dimensions (`width` and `height`). Size the card to fit the tallest child widget.
