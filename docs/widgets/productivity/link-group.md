---
title: Link Group
description: Collapsible group of links displayed in a grid
---

# Link Group

A titled, collapsible group of links laid out in a responsive grid. The open/closed state is persisted per widget instance per profile, so your layout stays exactly as you left it.

## Configuration

```js
{ id: "my-group", type: "link-group", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Development",
    items: [
      { title: "GitHub", href: "https://github.com" }
    ]
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | — | Heading displayed at the top of the group. |
| `items` | array | — | Array of link objects (see sub-fields below). |
| `items[].title` | string | — | Display label for the link. |
| `items[].href` | string | — | Destination URL. |
| `items[].badge` | string | — | Optional badge text overlaid on the link. |
| `items[].healthCheck` | string \| boolean | — | Set to `"auto"` or supply an explicit URL to show an uptime indicator dot. |

## Examples

### Minimal

```js
{ id: "w1", type: "link-group", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Work",
    items: [
      { title: "Jira",      href: "https://jira.example.com" },
      { title: "Confluence", href: "https://confluence.example.com" },
      { title: "Slack",     href: "https://slack.com" }
    ]
  }
}
```

### Advanced

```js
{ id: "w1", type: "link-group", col: 1, row: 1, width: 6, height: 2,
  config: {
    title: "Homelab",
    items: [
      { title: "Portainer",  href: "https://portainer.home",  healthCheck: "auto" },
      { title: "Grafana",    href: "https://grafana.home",    healthCheck: "auto", badge: "Metrics" },
      { title: "Proxmox",    href: "https://proxmox.home",    healthCheck: "https://proxmox.home:8006" },
      { title: "Pi-hole",    href: "https://pihole.home/admin", healthCheck: "auto" }
    ]
  }
}
```

!!! tip
    Collapse groups you rarely use to keep the dashboard tidy. The state is saved automatically per profile.
