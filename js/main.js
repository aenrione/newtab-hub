/* ── Main orchestrator (plugin architecture) ── */

(function () {
  var state = {
    bundle: null,
    activeProfile: null,
    pinned: [],
    links: [],
    feedEntries: [],
    markets: [],
    renderToken: 0,
    store: null,
    profileOverrides: {},
    collapsedGroups: {},
    healthResults: {},
    healthTimer: null,
    autoFocusPausedUntil: 0,
    _collapsedGroups: new Set(),
    _onToggleGroup: null
  };

  var editExitFn = null; /* accessible to both bindLayoutButton and bindProfileSwitcher */

  /* ── Health checks ── */

  Hub.healthKey = function (scope, item) {
    return scope + "::" + (item.title || item.label || "") + "::" + (item.href || item.url || "");
  };

  Hub.healthDot = function (item, key, st) {
    var r = key ? st.healthResults[key] : null;
    var status = r ? r.status : (item.health || null);
    if (!status) return "";
    return '<span class="status-dot status-dot-' + Hub.escapeHtml(status) + '" aria-label="' + Hub.escapeHtml(status) + '"></span>';
  };

  function healthTarget(item) {
    if (item.healthCheck === true || item.healthCheck === "auto") return item.href;
    if (typeof item.healthCheck === "string" && item.healthCheck.trim()) return item.healthCheck.trim();
    return null;
  }

  function supportsHealth(url) { return /^https?:\/\//i.test(String(url || "")); }

  async function runSingleCheck(item, key) {
    var target = healthTarget(item);
    if (!supportsHealth(target)) return;
    state.healthResults[key] = { status: "checking" };
    var result = { status: "down" };
    try {
      var res;
      try { res = await Hub.fetchWithTimeout(target, { method: "HEAD" }, 4000); }
      catch (_) { res = await Hub.fetchWithTimeout(target, { method: "GET" }, 5000); }
      if (res.status >= 200 && res.status < 400) result = { status: "ok" };
      else if (res.status >= 400 && res.status < 500) result = { status: "warn" };
    } catch (_) {}
    state.healthResults[key] = result;
  }

  async function runHealthChecks(widgets, token) {
    var checks = [];
    widgets.forEach(function (w) {
      var items = (w.config && w.config.items) || [];
      var scope = w.config && w.config.title || w.type;
      items.forEach(function (item) {
        if (supportsHealth(healthTarget(item))) {
          checks.push({ item: item, scope: scope });
        }
      });
    });

    await Promise.allSettled(checks.map(function (c) {
      return runSingleCheck(c.item, Hub.healthKey(c.scope, c.item));
    }));

    /* Re-render only sync widgets (pinned, link-groups) to update health dots.
       Skip widgets with async loaders (markets, feeds) to avoid resetting their content. */
    if (token === state.renderToken) {
      var widgets = resolvedWidgets();
      widgets.forEach(function (w) {
        var plugin = Hub.registry.get(w.type);
        if (!plugin || !plugin.render || plugin.load) return; /* skip async widgets */
        var el = widgetElements[w.id];
        if (!el) return;
        state._collapsedGroups = new Set(state.collapsedGroups[state.activeProfile] || []);
        plugin.render(el, w.config || {}, state);
      });
    }
  }

  function scheduleHealthRefresh() {
    if (state.healthTimer) clearTimeout(state.healthTimer);
    state.healthTimer = setTimeout(function () {
      if (state.activeProfile) renderDashboard(state.activeProfile, { preserveFocus: true });
    }, 300000);
  }

  /* ── Profile management ── */

  function normalizeManifest(src) {
    if (!src) return { defaultProfile: "default", profiles: [] };
    if (Array.isArray(src.profiles)) return { defaultProfile: src.defaultProfile || src.profiles[0]?.id || "default", profiles: src.profiles };
    return { defaultProfile: "default", profiles: [] };
  }

  function optionalScript(path) {
    return new Promise(function (resolve) {
      var s = document.createElement("script");
      s.src = path; s.async = false;
      s.onload = function () { resolve(true); };
      s.onerror = function () { resolve(false); };
      document.head.appendChild(s);
    });
  }

  function mergeWidgets(shared, priv) {
    var map = new Map();
    (shared || []).forEach(function (w) {
      map.set(w.id, Object.assign({}, w, { config: JSON.parse(JSON.stringify(w.config || {})) }));
    });
    (priv || []).forEach(function (w) {
      if (map.has(w.id)) {
        var existing = map.get(w.id);
        var ec = existing.config || {};
        var pc = w.config || {};

        /* Merge grid position only if private explicitly provides it */
        if (w.col) existing.col = w.col;
        if (w.row) existing.row = w.row;
        if (w.width) existing.width = w.width;
        if (w.height) existing.height = w.height;

        /* For configs with items arrays, concatenate instead of overwrite */
        if (Array.isArray(ec.items) && Array.isArray(pc.items)) {
          ec.items = ec.items.concat(pc.items);
        } else {
          Object.assign(ec, pc);
        }
      } else {
        map.set(w.id, Object.assign({}, w, { config: JSON.parse(JSON.stringify(w.config || {})) }));
      }
    });
    return Array.from(map.values());
  }

  async function loadBundle() {
    await optionalScript("config.private.js");
    var sm = normalizeManifest(window.NEW_TAB_SHARED_CONFIG);
    var pm = normalizeManifest(window.NEW_TAB_PRIVATE_CONFIG);
    window.NEW_TAB_SHARED_PROFILES = window.NEW_TAB_SHARED_PROFILES || {};
    window.NEW_TAB_PRIVATE_PROFILES = window.NEW_TAB_PRIVATE_PROFILES || {};
    await Promise.all(sm.profiles.concat(pm.profiles).map(function (e) { return optionalScript(e.file); }));

    var sp = window.NEW_TAB_SHARED_PROFILES || {};
    var pp = window.NEW_TAB_PRIVATE_PROFILES || {};
    var names = new Set(Object.keys(sp).concat(Object.keys(pp)));
    var profiles = {};
    names.forEach(function (n) {
      var shared = sp[n] || {};
      var priv = pp[n] || {};
      profiles[n] = {
        label: priv.label || shared.label || n,
        widgets: mergeWidgets(shared.widgets, priv.widgets)
      };
    });

    return {
      defaultProfile: sm.defaultProfile || pm.defaultProfile || Object.keys(profiles)[0],
      profiles: profiles
    };
  }

  function resolvedWidgets() {
    var profile = state.bundle.profiles[state.activeProfile];
    if (!profile) return [];
    var override = state.profileOverrides[state.activeProfile];
    if (override && override.widgets) return override.widgets;
    return profile.widgets || [];
  }

  /* ── Live widget config update (outside edit mode) ── */

  Hub.updateWidgetConfig = async function (widgetId, patch) {
    var widgets = resolvedWidgets().map(function (w) {
      return Object.assign({}, w, { config: JSON.parse(JSON.stringify(w.config || {})) });
    });
    var w = widgets.find(function (ww) { return ww.id === widgetId; });
    if (!w) return;
    Object.assign(w.config, patch);
    state.profileOverrides[state.activeProfile] = { widgets: widgets };
    await state.store.set(Hub.STORAGE_OVERRIDES_KEY, state.profileOverrides);
  };

  /* ── Render pipeline ── */

  var widgetElements = {};

  function buildWidgetEl(w) {
    var plugin = Hub.registry.get(w.type);
    if (!plugin) return null;

    var el = document.createElement("div");
    el.className = "widget widget-" + w.type;
    el.id = "widget-" + w.id;
    el.dataset.widgetId = w.id;
    el.dataset.widgetType = w.type;
    return el;
  }

  function renderAllWidgets() {
    var widgets = resolvedWidgets();
    state.pinned = [];
    state.links = [];

    widgets.forEach(function (w) {
      var el = widgetElements[w.id];
      if (!el) return;
      var plugin = Hub.registry.get(w.type);
      if (!plugin || !plugin.render) return;

      /* Prepare state for link-group collapsed handling */
      state._collapsedGroups = new Set(state.collapsedGroups[state.activeProfile] || []);
      state._onToggleGroup = function (title, isOpen) {
        var s = new Set(state.collapsedGroups[state.activeProfile] || []);
        if (isOpen) s.delete(title); else s.add(title);
        state.collapsedGroups[state.activeProfile] = Array.from(s);
        state.store.set(Hub.STORAGE_COLLAPSED_KEY, state.collapsedGroups);
      };

      plugin.render(el, w.config || {}, state);
    });
  }

  async function renderDashboard(profileName, opts) {
    opts = opts || {};
    var profile = state.bundle.profiles[profileName];
    if (!profile) return;

    state.activeProfile = profileName;
    state.renderToken++;
    var token = state.renderToken;
    state.pinned = [];
    state.links = [];
    state.feedEntries = [];
    state.markets = [];

    var widgets = resolvedWidgets();
    var gridEl = document.getElementById("dashboard-grid");

    /* Build widget elements */
    widgetElements = {};
    var layoutItems = [];

    widgets.forEach(function (w) {
      var el = buildWidgetEl(w);
      if (!el) return;
      widgetElements[w.id] = el;
      layoutItems.push({ widget: w.id, col: w.col || 1, row: w.row || 1, width: w.width || 4, height: w.height || 1 });
    });

    /* Apply grid layout */
    Hub.grid.applyLayout(gridEl, layoutItems, widgetElements);

    /* Sync render */
    renderAllWidgets();

    /* Focus search immediately after DOM is ready — don't wait for async loads */
    Hub.focusSearch();

    /* Set search base URL from search widget config */
    var searchWidget = widgets.find(function (w) { return w.type === "search"; });
    if (searchWidget && searchWidget.config) {
      Hub.search.state.searchBaseUrl = searchWidget.config.searchBaseUrl || "https://duckduckgo.com/?q=";
    }

    /* Async loads */
    if (!opts.skipAsync) {
      var loadPromises = [];
      widgets.forEach(function (w) {
        var el = widgetElements[w.id];
        var plugin = Hub.registry.get(w.type);
        if (el && plugin && plugin.load) {
          loadPromises.push(plugin.load(el, w.config || {}, state, token));
        }
      });
      loadPromises.push(runHealthChecks(widgets, token));
      await Promise.allSettled(loadPromises);
    }

    if (token !== state.renderToken) return;
    scheduleHealthRefresh();

    /* Assign chord key shortcuts to widgets */
    Hub.keyboard.assignWidgetKeys();

    /* Search index (deduplicated by href) */
    Hub.search.state.indexFn = function () {
      var all = state.links
        .concat(state.markets.map(function (m) { return { title: m.label, href: m.href, type: "Market" }; }))
        .concat(state.feedEntries);
      var seen = {};
      return all.filter(function (item) {
        if (!item.href || seen[item.href]) return false;
        seen[item.href] = true;
        return true;
      });
    };

    /* Apply theme */
    await Hub.loadTheme(state.store, profileName, profile);

    /* Cache favicons after images have a chance to load */
    setTimeout(function () { Hub.cacheFavicons(state.store); }, 2000);
  }

  /* ── Focus management ── */

  Hub.focusSearch = function () {
    var input = document.getElementById("quick-search");
    if (!input) return;
    if (window.__flushEarlyKeys) { window.__flushEarlyKeys(); delete window.__flushEarlyKeys; return; }
    /* Don't disrupt the user if they're already typing */
    if (document.activeElement === input) return;
    input.focus();
    if (!input.value) input.select();
  };

  /* ── Topbar clock ── */

  function updateClock() {
    var el = document.getElementById("topbar-time");
    if (!el) return;
    el.textContent = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date());
  }

  /* ── Search binding ── */

  function bindSearch() {
    document.addEventListener("input", function (e) {
      if (e.target.id !== "quick-search") return;
      Hub.search.update(e.target.value, { resultsContainer: document.getElementById("search-results") });
    });

    document.addEventListener("keydown", function (e) {
      if (e.target.id !== "quick-search") return;
      var resultsEl = document.getElementById("search-results");
      if (e.key === "ArrowDown") { e.preventDefault(); Hub.search.cycle(1, resultsEl); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); Hub.search.cycle(-1, resultsEl); return; }
      if (e.key === "Enter") {
        e.preventDefault();
        var target = Hub.search.currentResult() || Hub.search.buildQueryAction(e.target.value);
        if (target) Hub.openItem(target.href, e.metaKey || e.ctrlKey);
        return;
      }
      if (e.key === "Escape") {
        state.autoFocusPausedUntil = Date.now() + 1500;
        e.target.value = "";
        Hub.search.update("", { resultsContainer: resultsEl });
        e.target.blur();
      }
    });

    document.addEventListener("click", function (e) {
      var resultsEl = document.getElementById("search-results");
      if (resultsEl && !resultsEl.contains(e.target) && e.target.id !== "quick-search") {
        resultsEl.classList.add("hidden");
      }
    });
  }

  /* ── Profile switcher ── */

  function bindProfileSwitcher() {
    var btn = document.getElementById("profile-switcher-btn");
    var dropdown = document.getElementById("profile-dropdown");

    btn.innerHTML = Hub.icons.user + Hub.icons.chevronDown;

    function renderDropdown() {
      dropdown.replaceChildren();
      var profiles = state.bundle ? state.bundle.profiles : {};
      Object.keys(profiles).forEach(function (name) {
        var item = document.createElement("button");
        item.className = "profile-dropdown-item" + (name === state.activeProfile ? " is-active" : "");
        item.type = "button";
        item.textContent = profiles[name].label || name;
        item.addEventListener("click", async function () {
          dropdown.classList.remove("is-open");
          /* Cancel edit mode if active */
          if (Hub.grid.isEditing() && editExitFn) { editExitFn(); editExitFn = null; }
          await state.store.set(Hub.STORAGE_KEY, name);
          await renderDashboard(name);
        });
        dropdown.appendChild(item);
      });

      /* Divider + Reset */
      var divider = document.createElement("div");
      divider.className = "profile-dropdown-divider";
      dropdown.appendChild(divider);

      var resetBtn = document.createElement("button");
      resetBtn.className = "profile-dropdown-item is-danger";
      resetBtn.type = "button";
      resetBtn.textContent = "Reset to defaults";
      resetBtn.addEventListener("click", async function () {
        dropdown.classList.remove("is-open");
        delete state.profileOverrides[state.activeProfile];
        await state.store.set(Hub.STORAGE_OVERRIDES_KEY, state.profileOverrides);
        await renderDashboard(state.activeProfile);
      });
      dropdown.appendChild(resetBtn);
    }

    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      renderDropdown();
      dropdown.classList.toggle("is-open");
    });

    /* Expose profile cycling for keyboard shortcut */
    Hub.cycleProfile = async function (direction) {
      var profiles = state.bundle ? state.bundle.profiles : {};
      var names = Object.keys(profiles);
      if (names.length <= 1) return;
      var idx = names.indexOf(state.activeProfile);
      var next = (idx + (direction || 1) + names.length) % names.length;
      if (Hub.grid.isEditing() && editExitFn) { editExitFn(); editExitFn = null; }
      await state.store.set(Hub.STORAGE_KEY, names[next]);
      await renderDashboard(names[next]);
    };

    document.addEventListener("click", function (e) {
      if (!dropdown.contains(e.target) && e.target !== btn) {
        dropdown.classList.remove("is-open");
      }
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && dropdown.classList.contains("is-open")) {
        dropdown.classList.remove("is-open");
      }
    });
  }

  /* ── Layout edit (topbar button) ── */

  function bindLayoutButton() {
    var btn = document.getElementById("layout-edit-toggle");
    var savedOverrides = null; /* snapshot for cancel */

    async function saveLayout() {
      var gridEl = document.getElementById("dashboard-grid");
      if (!Hub.grid.isEditing()) return;

      /* Read layout positions from DOM and grab clone BEFORE exiting edit mode */
      var newLayout = Hub.grid.readLayoutFromDOM(gridEl);
      var clone = Hub.grid.getEditClone();

      if (editExitFn) editExitFn();
      editExitFn = null;
      savedOverrides = null;

      if (clone) {
        newLayout.forEach(function (l) {
          var w = clone.find(function (ww) { return ww.id === l.widget; });
          if (w) { w.col = l.col; w.row = l.row; w.width = l.width; w.height = l.height; }
        });
        state.profileOverrides[state.activeProfile] = { widgets: clone };
        await state.store.set(Hub.STORAGE_OVERRIDES_KEY, state.profileOverrides);
      }

      await renderDashboard(state.activeProfile);
    }

    async function cancelLayout() {
      if (editExitFn) editExitFn();
      editExitFn = null;
      /* Restore original overrides (undo any temporary writes from onWidgetAdded) */
      if (savedOverrides !== null) {
        if (savedOverrides === undefined) {
          delete state.profileOverrides[state.activeProfile];
        } else {
          state.profileOverrides[state.activeProfile] = savedOverrides;
        }
        await state.store.set(Hub.STORAGE_OVERRIDES_KEY, state.profileOverrides);
      }
      savedOverrides = null;
      await renderDashboard(state.activeProfile);
    }

    async function onConfigSave() {
      /* Persist config changes immediately when config modal closes */
      var clone = Hub.grid.getEditClone();
      if (clone) {
        state.profileOverrides[state.activeProfile] = { widgets: clone };
        await state.store.set(Hub.STORAGE_OVERRIDES_KEY, state.profileOverrides);
      }
    }

    function onWidgetAdded(newWidget) {
      /* Re-enter edit mode with updated clone to show new widget.
         We temporarily write the clone to overrides so renderDashboard picks it up,
         but savedOverrides preserves the original state for cancel.
         Grab clone BEFORE exitEditMode clears it. */
      var clone = Hub.grid.getEditClone();
      if (editExitFn) editExitFn();
      editExitFn = null;
      state.profileOverrides[state.activeProfile] = { widgets: clone };
      renderDashboard(state.activeProfile).then(function () {
        var gridEl = document.getElementById("dashboard-grid");
        Hub.grid.setEditClone(clone);
        editExitFn = Hub.grid.enterEditMode(gridEl, [], saveLayout, cancelLayout, onWidgetAdded, onConfigSave);
      });
    }

    function enterEdit() {
      var gridEl = document.getElementById("dashboard-grid");
      if (Hub.grid.isEditing()) return;
      var current = state.profileOverrides[state.activeProfile];
      savedOverrides = current ? JSON.parse(JSON.stringify(current)) : undefined;
      var widgets = resolvedWidgets();
      Hub.grid.setEditClone(widgets);
      editExitFn = Hub.grid.enterEditMode(gridEl, [], saveLayout, cancelLayout, onWidgetAdded, onConfigSave);
    }

    btn.addEventListener("click", function () {
      if (Hub.grid.isEditing()) {
        saveLayout();
      } else {
        enterEdit();
      }
    });

    /* Expose edit mode API for keyboard shortcuts */
    Hub.editMode = {
      enter: enterEdit,
      save: saveLayout,
      cancel: cancelLayout,
      addWidget: function () {
        var gridEl = document.getElementById("dashboard-grid");
        Hub.grid.openAddWidgetModal(gridEl, onWidgetAdded);
      }
    };
  }

  /* ── Init ── */

  async function init() {
    updateClock();
    setInterval(updateClock, 30000);

    state.store = Hub.storageApi();
    await Hub.cache.init(state.store);

    /* Apply saved theme immediately */
    var savedTheme = await state.store.get(Hub.STORAGE_THEME_KEY);
    if (savedTheme) {
      Hub.applyColorScheme(Object.assign({}, Hub.DEFAULT_COLORS, savedTheme._global || {}));
    }
    await Hub.loadStyleOverrides(state.store);
    await Hub.loadCustomCss(state.store);
    await Hub.loadBgImage(state.store);

    state.bundle = await loadBundle();
    state.profileOverrides = (await state.store.get(Hub.STORAGE_OVERRIDES_KEY)) || {};

    /* v2 migration: clear overrides saved by old format (they had separate pinned/linkGroups/feeds/markets keys) */
    /* One-time v2 migration: wipe all overrides from pre-plugin era.
       Remove this block after all users have migrated. */
    var V2_MIGRATED_KEY = "new-tab-v2-migrated";
    var migrated = await state.store.get(V2_MIGRATED_KEY);
    if (!migrated) {
      state.profileOverrides = {};
      await state.store.set(Hub.STORAGE_OVERRIDES_KEY, {});
      await state.store.set(V2_MIGRATED_KEY, true);
    }

    state.collapsedGroups = (await state.store.get(Hub.STORAGE_COLLAPSED_KEY)) || {};
    var saved = await state.store.get(Hub.STORAGE_KEY);
    var activeProfile = state.bundle.profiles[saved] ? saved : state.bundle.defaultProfile;

    /* Re-apply with profile-specific theme */
    if (savedTheme) {
      var pc = (state.bundle.profiles[activeProfile] && state.bundle.profiles[activeProfile].colorScheme) || {};
      Hub.applyColorScheme(Object.assign({}, Hub.DEFAULT_COLORS, savedTheme._global || {}, pc, savedTheme[activeProfile] || {}));
    }

    bindSearch();
    Hub.keyboard.bind(function () { return state; });
    bindProfileSwitcher();
    bindLayoutButton();

    document.getElementById("theme-button").addEventListener("click", function () {
      Hub.customize.openThemeSidebar(state.store, state.activeProfile);
    });

    Hub.openTheme = function () {
      Hub.customize.openThemeSidebar(state.store, state.activeProfile);
    };

    document.getElementById("help-button").addEventListener("click", function () { Hub.help.show(); });

    document.getElementById("zen-toggle").innerHTML = Hub.icons.eye;
    document.getElementById("zen-toggle").addEventListener("click", function () { Hub.zen.toggle(); });
    Hub.zen.init(function () { return state; });

    await renderDashboard(activeProfile);

    Hub.focusSearch();
  }

  init().catch(function (err) { console.error("Failed to initialize New Tab Hub", err); });
})();
