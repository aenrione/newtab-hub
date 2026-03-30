---
title: Configuration Overview
description: Overview of how New Tab Hub configuration works
---

# Configuration

New Tab Hub uses a **JavaScript-based config system** with two tiers:

| Tier | File | Committed to git? |
|------|------|-------------------|
| Shared | `config.shared.js`, `profiles/shared/*.js` | Yes |
| Private | `config.private.js`, `profiles/private/*.js` | No (git-ignored) |

Private files are loaded after shared ones, so they can extend or override any shared profile.

## Quick Start

The bare minimum to get a working dashboard:

```js
// config.shared.js
window.NEW_TAB_SHARED_CONFIG = {
  defaultProfile: "home",
  profiles: [
    { id: "home", file: "profiles/shared/home.js" }
  ]
};
```

```js
// profiles/shared/home.js
window.NEW_TAB_SHARED_PROFILES = window.NEW_TAB_SHARED_PROFILES || {};

window.NEW_TAB_SHARED_PROFILES.home = {
  label: "Home",
  widgets: [
    { id: "search", type: "search", col: 1, row: 1, width: 12, height: 1, config: {} },
    { id: "pinned", type: "pinned-links", col: 1, row: 2, width: 12, height: 1,
      config: { items: [{ title: "GitHub", href: "https://github.com" }] }
    }
  ]
};
```

## Next Steps

- **[Profiles](profiles.md)** — multiple dashboards, private overrides
- **[Grid Layout](grid-layout.md)** — positioning widgets on the 12-column grid
- **[Credentials](credentials.md)** — storing API keys securely
