# Sonarr Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Sonarr "On Deck" calendar widget that shows upcoming TV episodes grouped by day, using `Hub.credentials` for API key storage.

**Architecture:** Single widget file (`js/widgets/sonarr.js`) that registers with `Hub.registry`. `render()` paints a skeleton synchronously; `load()` fetches the Sonarr calendar API and replaces the skeleton. Credentials are read from `Hub.credentials` (never stored in config). The spec-driven credential UI is injected automatically by `grid.js` via `credentialFields`.

**Tech Stack:** Vanilla JS (ES5 + async/await), `Hub.registry`, `Hub.credentials`, `Hub.escapeHtml`, Sonarr v3 REST API

---

## Files

| File | Action | Responsibility |
|---|---|---|
| `styles.css` | Modify | Add `.sonarr-list`, `.sonarr-day`, `.sonarr-episode`, `.sonarr-show`, `.sonarr-meta` |
| `js/icons.js` | Modify | Add `Hub.iconForType["sonarr"]` entry |
| `js/widgets/sonarr.js` | Create | Full widget — registration, render, load, renderEditor, helpers |
| `index.html` | Modify | Add `<script src="js/widgets/sonarr.js"></script>` |

---

## Context you need before starting

**No test runner exists in this project.** All verification is manual: load `index.html` in the browser (or open the extension) and confirm behavior visually and in the console.

**`Hub.credentials.load(widgetId)`** returns a Promise resolving to `{}` (empty object) if no credentials are stored, or `{ apiKey: "..." }` if they are. The widget ID comes from `config._id` which `main.js` injects before calling `render()` and `load()`.

**Existing widget pattern** (see `js/widgets/markets.js` and `js/widgets/feeds.js`):
- `render(container, config)` — synchronous, writes initial skeleton HTML
- `load(container, config, state, token)` — async, fetches data, updates DOM; MUST check `if (token !== state.renderToken) return` after any `await`
- `renderEditor(container, config, onChange, navOptions)` — builds the config form; call `container.replaceChildren()` first
- `defaultConfig()` — returns a plain object (function, NOT a bare object)

**`grid.js` auto-injects the credential section** into the editor modal when `credentialFields` is declared on the plugin. `renderEditor` should only render the three non-credential config fields.

**Available CSS variables:** `--text`, `--muted`, `--bg`, `--surface`, `--border`. Do NOT use `--fg`, `--text-muted`, or `--bg-secondary`.

**Available icons** in `Hub.icons`: `settings`, `trash2`, `plus`, `gripVertical`, `user`, `chevronDown`, `x`, `save`, `search`, `arrowDownRight`, `clock`, `star`, `list`, `trendingUp`, `rss`, `eye`, `eyeOff`, `checkSquare`. There is no "calendar" icon; use `"clock"`.

**Sonarr API:** `GET /api/v3/calendar?start=YYYY-MM-DD&end=YYYY-MM-DD` with header `X-Api-Key: {apiKey}`. Returns an array of episode objects. Fields used: `series.title`, `series.titleSlug` (may be absent — null-guard required), `seasonNumber`, `episodeNumber`, `airDateUtc`.

---

## Task 1: CSS styles

**Files:**
- Modify: `styles.css` (append near end, before `/* ── Utility ── */` section at ~line 1438)

- [ ] **Step 1: Open `styles.css` and find the insertion point**

  Search for `/* ── Utility ──` and insert the new block just before it:

  ```css
  /* ── Sonarr widget ── */
  .sonarr-list { overflow-y: auto; padding: 4px 0; }
  .sonarr-day {
    padding: 6px 12px 2px;
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
  .sonarr-episode {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 5px 12px;
    text-decoration: none;
    color: var(--text);
    gap: 8px;
  }
  a.sonarr-episode:hover { background: var(--surface); }
  .sonarr-show { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .sonarr-meta { color: var(--muted); font-size: 0.76rem; white-space: nowrap; flex-shrink: 0; }
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add styles.css
  git commit -m "feat(sonarr): add widget CSS"
  ```

---

## Task 2: Register icon

**Files:**
- Modify: `js/icons.js` (line ~35, inside the `Hub.iconForType` object)

- [ ] **Step 1: Open `js/icons.js` and add one entry to `Hub.iconForType`**

  Find `Hub.iconForType = {` (line 27). Add `"sonarr": "clock"` as the last entry:

  ```js
  Hub.iconForType = {
    "clock": "clock",
    "pinned-links": "star",
    "link-group": "list",
    "markets": "trendingUp",
    "feeds": "rss",
    "search": "search",
    "todo": "checkSquare",
    "sonarr": "clock"
  };
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add js/icons.js
  git commit -m "feat(sonarr): register widget icon"
  ```

---

## Task 3: Widget scaffold — registration, helpers, render, renderEditor

**Files:**
- Create: `js/widgets/sonarr.js`

This task creates the full widget file minus `load()`, which is added in Task 4. The widget will register and display a static loading state. Verification is done by wiring into `index.html` in Task 5.

- [ ] **Step 1: Create `js/widgets/sonarr.js` with the full file (load stub only)**

  ```js
  /* ── Sonarr widget plugin ── */

  Hub.registry.register("sonarr", {
    label: "Sonarr",
    icon: "clock",

    defaultConfig: function () {
      return { title: "On Deck", url: "http://localhost:8989", days: 7 };
    },

    credentialFields: [{ key: "apiKey", label: "API Key", type: "password" }],

    render: function (container, config) {
      container.innerHTML =
        '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "On Deck") + "</h2></div>" +
        '<div class="sonarr-list"><div class="empty-state">Loading\u2026</div></div>';
    },

    load: async function (container, config, state, token) {
      /* implemented in next task */
    },

    renderEditor: function (container, config, onChange) {
      container.replaceChildren();

      var titleLabel = document.createElement("label");
      titleLabel.className = "editor-field";
      titleLabel.innerHTML =
        "<span>Widget title</span>" +
        '<input type="text" value="' + Hub.escapeHtml(config.title || "On Deck") + '" />';
      var titleInput = titleLabel.querySelector("input");
      titleInput.dataset.navHeaderField = "";
      titleInput.addEventListener("input", function (e) {
        config.title = e.target.value;
        onChange(config);
      });
      container.appendChild(titleLabel);

      var urlLabel = document.createElement("label");
      urlLabel.className = "editor-field";
      urlLabel.innerHTML =
        "<span>Sonarr URL</span>" +
        '<input type="text" value="' + Hub.escapeHtml(config.url || "http://localhost:8989") + '" />';
      urlLabel.querySelector("input").addEventListener("input", function (e) {
        config.url = e.target.value;
        onChange(config);
      });
      container.appendChild(urlLabel);

      var daysLabel = document.createElement("label");
      daysLabel.className = "editor-field";
      daysLabel.innerHTML =
        "<span>Days to show</span>" +
        '<input type="number" min="1" max="30" value="' + (config.days || 7) + '" />';
      daysLabel.querySelector("input").addEventListener("input", function (e) {
        config.days = parseInt(e.target.value, 10) || 7;
        onChange(config);
      });
      container.appendChild(daysLabel);
    }
  });

  /* ── Helpers ── */

  function sonarrFormatDate(d) {
    return d.getFullYear() + "-" + sonarrPad(d.getMonth() + 1) + "-" + sonarrPad(d.getDate());
  }

  function sonarrPad(n) {
    return n < 10 ? "0" + n : String(n);
  }
  ```

  > **Note on helper names:** Functions are module-level (not inside a closure) in this project. Prefix with `sonarr` to avoid collisions with any future widget that also needs `formatDate` / `pad`.

- [ ] **Step 2: Commit**

  ```bash
  git add js/widgets/sonarr.js
  git commit -m "feat(sonarr): scaffold widget with render and renderEditor"
  ```

---

## Task 4: Implement load()

**Files:**
- Modify: `js/widgets/sonarr.js` — replace the stub `load` function

- [ ] **Step 1: Replace the stub load function with the full implementation**

  Replace `load: async function (container, config, state, token) { /* implemented in next task */ },` with:

  ```js
  load: async function (container, config, state, token) {
    var listEl = container.querySelector(".sonarr-list");

    /* ── 1. Credential check ── */
    var creds = await Hub.credentials.load(config._id);
    if (token !== state.renderToken) return;
    if (!creds.apiKey) {
      listEl.innerHTML = '<div class="empty-state">Add your Sonarr API key<br>in the widget editor.</div>';
      return;
    }

    /* ── 2. Build request ── */
    var days = Math.max(1, Math.min(30, parseInt(config.days, 10) || 7));
    var today = new Date();
    var start = sonarrFormatDate(today);
    var end = sonarrFormatDate(new Date(today.getTime() + days * 86400000));
    var base = (config.url || "http://localhost:8989").replace(/\/$/, "");

    /* ── 3. Fetch ── */
    var episodes;
    try {
      var resp = await fetch(
        base + "/api/v3/calendar?start=" + start + "&end=" + end,
        { headers: { "X-Api-Key": creds.apiKey } }
      );
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      episodes = await resp.json();
    } catch (_) {
      if (token !== state.renderToken) return;
      listEl.innerHTML = '<div class="empty-state">Could not reach Sonarr.</div>';
      return;
    }

    /* ── 4. Stale-render guard ── */
    if (token !== state.renderToken) return;

    /* ── 5. Empty state ── */
    if (!Array.isArray(episodes) || !episodes.length) {
      listEl.innerHTML = '<div class="empty-state">No episodes in the next ' + days + " days.</div>";
      return;
    }

    /* ── 6. Group by local date ── */
    var groups = {};
    var order = [];
    episodes.forEach(function (ep) {
      var d = new Date(ep.airDateUtc);
      var key = d.toDateString();
      if (!groups[key]) {
        groups[key] = { date: d, episodes: [] };
        order.push(key);
      }
      groups[key].episodes.push(ep);
    });

    var todayStr = today.toDateString();
    var tomorrow = new Date(today.getTime() + 86400000);
    var tomorrowStr = tomorrow.toDateString();

    /* ── 7. Render list ── */
    var html = "";
    order.forEach(function (key) {
      var g = groups[key];
      var dayLabel;
      if (key === todayStr) dayLabel = "Today";
      else if (key === tomorrowStr) dayLabel = "Tomorrow";
      else dayLabel = g.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

      html += '<div class="sonarr-day">' + Hub.escapeHtml(dayLabel) + "</div>";

      g.episodes.forEach(function (ep) {
        var show = (ep.series && ep.series.title) || "Unknown";
        var slug = ep.series && ep.series.titleSlug;
        var epNum = "S" + sonarrPad(ep.seasonNumber) + "E" + sonarrPad(ep.episodeNumber);
        var time = new Date(ep.airDateUtc).toLocaleTimeString("en-US", {
          hour: "2-digit", minute: "2-digit", hour12: false
        });
        var meta = Hub.escapeHtml(epNum + "\u00B7" + time);
        var showHtml = '<span class="sonarr-show">' + Hub.escapeHtml(show) + "</span>";
        var metaHtml = '<span class="sonarr-meta">' + meta + "</span>";

        if (slug) {
          html += '<a class="sonarr-episode" href="' +
            Hub.escapeHtml(base + "/series/" + slug) +
            '" target="_blank" rel="noreferrer">' + showHtml + metaHtml + "</a>";
        } else {
          html += '<div class="sonarr-episode">' + showHtml + metaHtml + "</div>";
        }
      });
    });

    listEl.innerHTML = html;
  },
  ```

- [ ] **Step 2: Commit**

  ```bash
  git add js/widgets/sonarr.js
  git commit -m "feat(sonarr): implement async load with calendar fetch and day grouping"
  ```

---

## Task 5: Wire up and smoke test

**Files:**
- Modify: `index.html` (line ~57, after the last `widgets/` script tag)

- [ ] **Step 1: Add the script tag to `index.html`**

  Find:
  ```html
      <script src="js/widgets/todo.js"></script>
  ```

  Add after it:
  ```html
      <script src="js/widgets/sonarr.js"></script>
  ```

  > **Important:** Do NOT place this tag after `customize.js`, `sync-status.js`, or `main.js`. `Hub.registry.register()` must run before `main.js` initialises the dashboard.

- [ ] **Step 2: Load the extension and verify the Add Widget picker**

  Open the new tab page. Enter edit mode (pencil icon). Click "Add widget". Confirm:
  - "Sonarr" appears in the widget list with a clock icon
  - Adding it creates an "On Deck" widget that shows "Loading…" briefly

- [ ] **Step 3: Verify no-credentials state**

  If no API key has been saved, the widget should show:
  > Add your Sonarr API key
  > in the widget editor.

  Open the gear (⚙) icon on the widget. Confirm the editor shows:
  - Widget title field
  - Sonarr URL field
  - Days to show field
  - A "Credentials" section with an API Key password input and "Remove credentials" button (injected by grid.js)

- [ ] **Step 4: Verify with real credentials (if Sonarr is available)**

  Enter your Sonarr URL and API key in the editor. Save. Confirm:
  - Episodes appear grouped under Today / Tomorrow / date headers
  - Clicking a row opens the Sonarr series page in a new tab
  - Row layout: show name left, `S01E05·21:00` right

- [ ] **Step 5: Verify error state**

  Enter an invalid URL or wrong API key. Confirm the widget shows:
  > Could not reach Sonarr.

- [ ] **Step 6: Commit**

  ```bash
  git add index.html
  git commit -m "feat(sonarr): wire widget into index.html"
  ```
