---
title: Profiles
description: How to set up multiple dashboard profiles in New Tab Hub
---

# Profiles

Profiles let you maintain multiple dashboards — for example, a Work profile and a Personal profile. The active profile is remembered per browser profile.

## Shared Config Manifest

`config.shared.js` declares all available profiles:

```js
window.NEW_TAB_SHARED_CONFIG = {
  defaultProfile: "work",
  profiles: [
    { id: "work",     file: "profiles/shared/work.js" },
    { id: "personal", file: "profiles/shared/personal.js" }
  ]
};
```

| Field | Description |
|-------|-------------|
| `defaultProfile` | Profile ID loaded on first run |
| `profiles` | Array of `{ id, file }` entries |

## Profile Files

Each profile file defines a `widgets` array:

```js
// profiles/shared/work.js
window.NEW_TAB_SHARED_PROFILES = window.NEW_TAB_SHARED_PROFILES || {};

window.NEW_TAB_SHARED_PROFILES.work = {
  label: "Work",
  widgets: [
    { id: "search", type: "search", col: 1, row: 1, width: 12, height: 1, config: {} },
    { id: "pinned", type: "pinned-links", col: 1, row: 2, width: 12, height: 1,
      config: {
        items: [
          { title: "GitHub",  href: "https://github.com" },
          { title: "Jira",    href: "https://yourorg.atlassian.net" }
        ]
      }
    }
  ]
};
```

## Private Profiles

To keep personal links out of the repo:

1. Copy `config.private.example.js` → `config.private.js`
2. Create profile files in `profiles/private/`

```js
// config.private.js
window.NEW_TAB_PRIVATE_CONFIG = {
  profiles: [
    { id: "personal", file: "profiles/private/personal.js" }
  ]
};
```

```js
// profiles/private/personal.js
window.NEW_TAB_SHARED_PROFILES = window.NEW_TAB_SHARED_PROFILES || {};

window.NEW_TAB_SHARED_PROFILES.personal = {
  label: "Personal",
  widgets: [
    { id: "bank", type: "pinned-links", col: 1, row: 1, width: 12, height: 1,
      config: {
        items: [
          { title: "Bank", href: "https://mybank.com" }
        ]
      }
    }
  ]
};
```

!!! tip
    Private files are git-ignored. They are never committed. Reference `profiles/examples/` for template files you can copy.

## Switching Profiles

Click the profile switcher in the top bar, or add multiple profile buttons. The active profile is saved per browser instance.
