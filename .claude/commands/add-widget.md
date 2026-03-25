---
description: Research a homepage.dev widget and generate it for newtab-hub, or stop if it can't work in a browser extension.
argument-hint: <service-name>
---

You are implementing the `add-widget` skill for newtab-hub.

The user wants to add a widget for: **$ARGUMENTS**

Follow these steps exactly. Do not skip any step. Do not write any code until Step 4.

---

## Step 1 — Research the service

Use WebFetch and/or WebSearch to gather information about this service's widget on homepage.dev:

1. Fetch the homepage.dev widget docs: `https://gethomepage.dev/widgets/services/<service-name>/`
   (Try variations if that exact URL 404s — some services use different URL slugs)
2. Search the homepage.dev GitHub source for the widget's API integration:
   Search for the widget implementation at `github.com/gethomepage/homepage` under `src/widgets/<service-name>/`

Extract and note:
- Which HTTP API endpoint(s) the widget calls (full URL pattern)
- What authentication method is used (API key header name, bearer token, basic auth, etc.)
- Which data fields are displayed (counts, statuses, names, percentages, etc.)
- Whether any part of the widget requires server-side processing

---

## Step 2 — Feasibility check

Check each blocker. If ANY apply, **stop here** and explain to the user which blocker applies and why. Do not generate any files.

| Blocker | How to detect |
|---------|--------------|
| **CORS rejection** | The service API docs or source code show no CORS headers, or the service is known to restrict cross-origin requests. Widget fetches run from the new tab page directly — there is no background proxy. |
| **OAuth / server-side token exchange** | Auth flow requires redirects or server-to-server calls |
| **No REST/JSON API** | Service responds with HTML, binary, or a proprietary protocol |
| **Same-host-only API** | Docs or source indicate API only accepts requests from localhost/same-origin |
| **homepage.dev is mandatory middleman** | No public API for the service exists; homepage.dev fetches internal data via its own server-side config |

If feasibility is confirmed → proceed to Step 3.

---

## Step 3 — Select a reference widget

Read one reference widget **in full** before writing any code:

- `*arr` services (Radarr, Readarr, Lidarr, Prowlarr, etc.) → read `js/widgets/sonarr/index.js`
- Token-authenticated REST APIs where a single cached fetch suffices → read `js/widgets/sonarr/index.js`
- Token-authenticated REST APIs requiring parallel fetches or custom cache keys → read `js/widgets/github-prs/index.js`
- Simple stat/status REST APIs (local-network service, API key or no auth) → read `js/widgets/sonarr/index.js`

Use the reference widget's exact code structure and style as your template.

---

## Step 4 — Generate the widget

Write `js/widgets/<name>/index.js`. The file must follow these rules:

### Structure

```
/* ── <ServiceName> widget plugin ── */

Hub.injectStyles("widget-<name>", `
  /* scoped CSS — all class names prefixed with .<name>- */
`);

Hub.registry.register("<name>", {
  label: "<Service Display Name>",
  icon: "<emoji>",

  credentialFields: [ /* only if auth needed */
    { key: "<fieldKey>", label: "<Label>", type: "password" }
  ],

  defaultConfig: function () {
    return {
      title: "<Default Title>",
      url: "<default URL if applicable>",
      /* other numeric/string settings */
    };
  },

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "<Default Title>") + '</h2></div>' +
      '<div class="<name>-body"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var bodyEl = container.querySelector(".<name>-body");

    /* Load credentials if credentialFields declared */
    var creds = await Hub.credentials.load(config._id);
    if (token !== state.renderToken) return;
    if (!creds.<fieldKey>) {
      bodyEl.innerHTML = '<div class="empty-state">Add your <Label> in the widget editor.</div>';
      return;
    }

    try {
      var data = await Hub.cachedFetchJSON(
        /* replace <api-path> with the actual endpoint, e.g. /api/v3/movie */
        (config.url || "<default>").replace(/\/$/, "") + "/<api-path>",
        "<name>",
        state.store,
        { headers: { "<Auth-Header>": creds.<fieldKey> } }
      );
      if (token !== state.renderToken) return;
      /* render data */
    } catch (_) {
      if (token !== state.renderToken) return;
      bodyEl.innerHTML = '<div class="empty-state">Could not reach <ServiceName>.</div>';
      return;
    }
  },

  renderEditor: function (container, config, onChange, navOptions) {
    container.replaceChildren();

    var titleLabel = document.createElement("label");
    titleLabel.className = "editor-field";
    titleLabel.innerHTML =
      "<span>Widget title</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.title || "<Default Title>") + '" />';
    var titleInput = titleLabel.querySelector("input");
    titleInput.dataset.navHeaderField = "";
    titleInput.addEventListener("input", function (e) {
      config.title = e.target.value;
      onChange(config);
    });
    container.appendChild(titleLabel);

    /* Add URL field, numeric fields, selects, etc. as needed */
  }
});

/* ── Helpers ── */

/* name helper functions with the service prefix: function <name>Helper(...) { ... } */
```

### Rules

- Vanilla JS only — no `class`, no `import`, no arrow functions in older-style code (match reference widget's style)
- `Hub.escapeHtml()` on every API-returned or user-supplied string rendered into HTML
- `if (token !== state.renderToken) return` after **every** `await`, including inside `catch` before writing to DOM
- CSS class names: `.{name}-*` prefix only, never generic names like `.stat` or `.row`
- `credentialFields`: use `type: "password"` for secrets — never render credential inputs in `renderEditor`
- `dataset.navHeaderField = ""` on the title input in `renderEditor`
- If the widget shows navigable links: `state.links.push({ title: "...", href: "...", type: "<name>" })`
- If the widget shows clickable link rows, use `Hub.createLink("css-class", href, title)` to build the `<a>` element — this automatically sets `data-focusable` and `data-title` for keyboard navigation
- Cache category: pass the widget name string as the second argument to `Hub.cachedFetchJSON` / `Hub.cachedFetch`
- Helper functions at bottom of file, named `function <name>SomeName(...)`

---

## Step 5 — Update the manifest

Read `js/widgets/manifest.json` and add the new widget name to the array. Preserve the existing order; append at the end.

---

## Step 6 — Report

Tell the user:
1. What the widget displays and which API endpoint(s) it calls
2. Which credential fields they need to fill in (if any) after adding the widget to their dashboard
3. Any simplifications made vs the homepage.dev version (e.g., "homepage.dev shows a poster image; this widget shows text only")
4. CORS note if applicable: "If <ServiceName> is not configured to allow cross-origin requests, you may need to enable CORS in its settings."

If you stopped in Step 2: state the exact blocker and one sentence explaining why it prevents browser-side implementation.
