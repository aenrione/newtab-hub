# New Tab Hub

<img width="1470" height="825" alt="image" src="https://github.com/user-attachments/assets/58839209-1595-4181-ab03-bc34081f3796" />

A keyboard-first new tab dashboard for Chromium browsers (Brave, Chrome, Edge, etc.). Replaces the default new tab page with a configurable grid of widgets: pinned links, link groups, RSS feeds, market tickers, and more.

Built entirely with vanilla JavaScript — no frameworks, no build step, no dependencies.

> **Note**: This project was vibecoded with AI assistance. The code prioritizes shipping features over polish, and contributions improving code quality are welcome.

## Features

- **Search-first** — search bar auto-focuses on every new tab; type a URL to navigate directly
- **Keyboard navigation** — arrow keys or `h/j/k/l` to move between widgets, `1`-`9` to open pinned links
- **Widget grid** — 12-column CSS Grid layout with drag-and-drop reordering in edit mode
- **Multiple profiles** — switch between "Work" and "Personal" dashboards, remembered per browser profile
- **Theme engine** — 15+ built-in presets (Gruvbox, Catppuccin, Nord, Dracula, etc.) plus custom colors
- **Background images** — URL or file upload with opacity and surface transparency controls
- **Custom CSS** — inject your own styles from the theme sidebar
- **RSS feeds** — inline feed reader with headline display
- **Market tickers** — crypto (CoinGecko) and stock quotes (Stooq) with change indicators
- **Health checks** — optional status dots on links that verify site availability
- **Private config layer** — keep personal links and URLs out of version control
- **Collapsible groups** — open/close state saved per profile
- **No external dependencies** — pure HTML/CSS/JS, Manifest V3 extension

## Tests

- Install test-only tooling with `npm install`
- Run the Jest suite with `npm test`
- The extension still ships with no runtime build step or app dependencies; Node is only used for tests

## Installation

1. Clone or download this repository
2. Open your browser's extensions page:
   - Brave: `brave://extensions`
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
3. Enable **Developer mode**
4. Click **Load unpacked** and select the project folder
5. Open a new tab — the dashboard replaces the default page

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `/` or `Ctrl+K` | Focus search |
| `1`-`9` | Open pinned link |
| `Arrow keys` or `h/j/k/l` | Navigate between items |
| `Enter` | Open focused link |
| `u` / `d` | Scroll up / down |
| `?` | Show shortcuts help |
| `Escape` | Close dialogs / clear search |

## Configuration

The config system uses a two-tier approach: **shared** profiles that live in the repo, and **private** profiles that stay local.

### Shared config (committed)

`config.shared.js` — the manifest that lists available profiles:

```js
window.NEW_TAB_SHARED_CONFIG = {
  defaultProfile: "work",
  profiles: [
    { id: "work", file: "profiles/shared/work.js" },
    { id: "personal", file: "profiles/shared/personal.js" }
  ]
};
```

Each profile file defines a `widgets` array with layout and config:

```js
window.NEW_TAB_SHARED_PROFILES = window.NEW_TAB_SHARED_PROFILES || {};

window.NEW_TAB_SHARED_PROFILES.work = {
  label: "Work",
  widgets: [
    { id: "search", type: "search", col: 1, row: 1, width: 12, height: 1,
      config: { searchBaseUrl: "https://duckduckgo.com/?q=" } },
    { id: "pinned", type: "pinned-links", col: 1, row: 2, width: 12, height: 1,
      config: {
        items: [
          { title: "Gmail", href: "https://mail.google.com/", badge: "Inbox" },
          { title: "GitHub", href: "https://github.com/", healthCheck: true }
        ]
      }
    },
    { id: "feeds", type: "feeds", col: 1, row: 3, width: 6, height: 1,
      config: {
        title: "Feeds",
        items: [
          { title: "HN", url: "https://hnrss.org/frontpage", site: "https://news.ycombinator.com/" }
        ]
      }
    }
  ]
};
```

### Private config (git-ignored)

To add links you don't want in the repo (banking, internal tools, etc.):

1. Copy `config.private.example.js` to `config.private.js`
2. Create files in `profiles/private/` (see `profiles/examples/` for reference)
3. These files are loaded after shared profiles, so private widgets merge into existing profiles or define entirely new ones

### Widget types

| Type | Description | Config |
|------|-------------|--------|
| `search` | Search bar with URL detection | `searchBaseUrl` |
| `pinned-links` | Quick-access links with `1-9` shortcuts | `items[]` with `title`, `href`, optional `badge`, `healthCheck` |
| `link-group` | Collapsible group of links | `title`, `items[]` |
| `feeds` | RSS/Atom feed reader | `title`, `items[]` with `title`, `url`, `site` |
| `markets` | Crypto & stock tickers | `title`, `items[]` with `label`, `symbol`, `coinGeckoId` or `stooqSymbol` |
| `clock` | Time and date display | *(none)* |

### Grid layout

Each widget specifies its position in a 12-column grid:

- `col` — starting column (1-12)
- `row` — starting row
- `width` — column span (1-12)
- `height` — row span

You can also reposition widgets visually using the grid edit button in the top bar.

## Runtime customization

Click the **theme button** (half-circle icon) in the top bar to open the theme sidebar:

- Pick a preset theme or customize individual colors
- Adjust widget border radius and border width
- Set a background image (URL or file upload) with opacity controls
- Write custom CSS
- Save globally or per-profile

Click the **grid button** (four squares) to enter layout edit mode:

- Drag widgets to reorder
- Resize widgets
- Add or remove widgets
- Changes are saved to browser storage

## Project structure

```
newtab-hub/
  assets/              # Extension icons
  js/
    widgets/           # Widget plugins (search, pinned, links, feeds, markets, clock)
    cache.js           # TTL-based cache (memory + storage)
    customize.js       # Theme sidebar UI
    grid.js            # 12-column grid layout engine
    help.js            # Keyboard shortcuts dialog
    icons.js           # Inline SVG icon set
    keyboard.js        # Spatial keyboard navigation
    main.js            # App orchestrator and startup
    registry.js        # Widget plugin registry
    search.js          # Search engine and URL detection
    storage.js         # chrome.storage.local abstraction
    theme.js           # Color scheme and style engine
    utils.js           # Shared utilities
  profiles/
    shared/            # Committed profile configs
    private/           # Git-ignored private overrides
    examples/          # Reference profile templates
  config.shared.js     # Profile manifest (committed)
  config.private.example.js  # Template for private config
  index.html           # Extension entry point
  manifest.json        # Chrome Manifest V3
  styles.css           # All styles
```

## Browser compatibility

Built as a Manifest V3 extension. Works with any Chromium-based browser:

- Brave
- Google Chrome
- Microsoft Edge
- Vivaldi
- Arc

Firefox support would require porting to the WebExtension manifest format — contributions welcome.

## Contributing

Contributions are welcome, especially:

- Firefox WebExtension port
- Code quality improvements
- New widget types
- Accessibility enhancements
- Tests

## License

MIT
