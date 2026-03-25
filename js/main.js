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
    pendingDashboardRefresh: null,
    primarySearchWidgetId: null,
    searchWidgetConfigs: {},
    searchFocusWidgetIds: {},
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

  function isExplicitHealthCheck(item) {
    return typeof item.healthCheck === "string" && item.healthCheck.trim();
  }

  async function runSingleCheck(item, key) {
    var target = healthTarget(item);
    if (!supportsHealth(target)) return;
    state.healthResults[key] = { status: "checking" };
    var result = { status: "down" };
    try {
      var res;
      try { res = await Hub.fetchWithTimeout(target, { method: "HEAD" }, 4000); }
      catch (_) {
        if (!isExplicitHealthCheck(item)) throw _;
        res = await Hub.fetchWithTimeout(target, { method: "GET" }, 5000);
      }
      if (res.status >= 200 && res.status < 400) result = { status: "ok" };
      else if (res.status >= 400 && res.status < 500) result = { status: "warn" };
    } catch (_) {}
    state.healthResults[key] = result;
  }

  async function runHealthChecks(widgets, token) {
    var checks = [];
    var widgetIdsToRefresh = {};
    widgets.forEach(function (w) {
      var items = (w.config && w.config.items) || [];
      var scope = w.config && w.config.title || w.type;
      items.forEach(function (item) {
        if (supportsHealth(healthTarget(item))) {
          checks.push({ item: item, scope: scope });
          widgetIdsToRefresh[w.id] = true;
        }
      });
    });

    await Promise.allSettled(checks.map(function (c) {
      return runSingleCheck(c.item, Hub.healthKey(c.scope, c.item));
    }));

    /* Re-render only sync widgets that actually expose health dots.
       This avoids wiping widgets like search during startup. */
    if (token === state.renderToken) {
      var widgets = resolvedWidgets();
      widgets.forEach(function (w) {
        if (!widgetIdsToRefresh[w.id]) return;
        var plugin = Hub.registry.get(w.type);
        if (!plugin || !plugin.render || plugin.load) return; /* skip async widgets */
        var el = widgetElements[w.id];
        if (!el) return;
        state._collapsedGroups = new Set(state.collapsedGroups[state.activeProfile] || []);
        try {
          plugin.render(el, Object.assign({}, w.config || {}, { _id: w.id }), state);
        } catch (err) {
          renderWidgetError(el, w, "Failed to render widget.", err);
        }
      });
    }
  }

  function scheduleHealthRefresh() {
    if (state.healthTimer) clearTimeout(state.healthTimer);
    state.healthTimer = setTimeout(function () {
      if (state.activeProfile) {
        requestDashboardRefresh(function () {
          return renderDashboard(state.activeProfile, { preserveFocus: true, preserveSearch: true });
        });
      }
    }, 300000);
  }

  function isEditableElement(el) {
    if (!el) return false;
    if (el.isContentEditable) return true;
    if (el.classList && el.classList.contains("todo-title-edit")) return true;
    return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT";
  }

  function shouldDeferDashboardRefresh() {
    return Hub.grid.isEditing() || isEditableElement(document.activeElement);
  }

  function flushPendingDashboardRefresh() {
    if (!state.pendingDashboardRefresh || shouldDeferDashboardRefresh()) return;
    var pending = state.pendingDashboardRefresh;
    state.pendingDashboardRefresh = null;
    pending();
  }

  function requestDashboardRefresh(refreshFn) {
    if (shouldDeferDashboardRefresh()) {
      state.pendingDashboardRefresh = refreshFn;
      return;
    }
    refreshFn();
  }

  function getSearchElements(widgetId) {
    var selector = widgetId
      ? '.widget[data-widget-id="' + widgetId + '"] [data-search-input="true"]'
      : '[data-search-input="true"]';
    var input = document.querySelector(selector);
    if (!input) return null;
    var widget = input.closest('.widget[data-widget-id]');
    return {
      widget: widget,
      input: input,
      resultsContainer: widget ? widget.querySelector('[data-search-results="true"]') : null
    };
  }

  function getPrimarySearchElements() {
    return getSearchElements(state.primarySearchWidgetId) || getSearchElements(null);
  }

  function getSearchElementsForTarget(target) {
    if (!target) return getPrimarySearchElements();
    var targetKey = String(target).toLowerCase();
    var widgetId = state.searchFocusWidgetIds[targetKey] || target;
    return getSearchElements(widgetId) || getPrimarySearchElements();
  }

  function getPrimarySearchInput() {
    var els = getPrimarySearchElements();
    return els && els.input;
  }

  function getSearchWidgetConfig(widgetId) {
    return state.searchWidgetConfigs[widgetId] || (Hub.searchWidget && Hub.searchWidget.normalizeConfig ? Hub.searchWidget.normalizeConfig() : null);
  }

  function getSearchConfigForElement(el) {
    var widget = el && el.closest('.widget[data-widget-id]');
    return widget ? getSearchWidgetConfig(widget.dataset.widgetId) : getSearchWidgetConfig(state.primarySearchWidgetId);
  }

  function shouldAutoFocusSearchWidget(widget) {
    if (!widget) return false;
    if (Hub.searchWidget && Hub.searchWidget.normalizeConfig) {
      return Hub.searchWidget.normalizeConfig(widget.config).autoFocusOnLoad;
    }
    return !!(widget.config && widget.config.autoFocusOnLoad !== false);
  }

  function captureSearchState() {
    var input = getPrimarySearchInput();
    if (!input) return null;
    return {
      widgetId: input.closest('.widget[data-widget-id]') ? input.closest('.widget[data-widget-id]').dataset.widgetId : null,
      value: input.value,
      focused: document.activeElement === input,
      selectionStart: input.selectionStart,
      selectionEnd: input.selectionEnd
    };
  }

  function restoreSearchState(snapshot) {
    if (!snapshot) return false;
    var els = getSearchElements(snapshot.widgetId) || getPrimarySearchElements();
    var input = els && els.input;
    var resultsEl = els && els.resultsContainer;
    if (!input || !resultsEl) return false;

    input.value = snapshot.value || "";
    var searchConfig = getSearchWidgetConfig(snapshot.widgetId);
    Hub.search.state.searchBaseUrl = searchConfig.searchBaseUrl || "https://duckduckgo.com/?q=";
    Hub.search.update(input.value, { resultsContainer: resultsEl }, { sources: searchConfig.sources, sourceLimits: searchConfig.sourceLimits });

    if (snapshot.focused) {
      input.focus();
      if (typeof snapshot.selectionStart === "number" && typeof snapshot.selectionEnd === "number") {
        input.setSelectionRange(snapshot.selectionStart, snapshot.selectionEnd);
      }
    }

    return true;
  }

  function buildDomSearchIndex() {
    var seen = {};

    return Array.from(document.querySelectorAll('[data-focusable="true"]')).filter(function (el) {
      if (el.offsetParent === null) return false;
      if (el.matches('[data-search-input="true"]')) return false;
      return !el.closest(".widget-search");
    }).map(function (el, index) {
      var widgetEl = el.closest(".widget[data-widget-id]");
      var widgetTitleEl = widgetEl && widgetEl.querySelector(".widget-header h2, .widget-header h3");
      var widgetTitle = widgetTitleEl ? widgetTitleEl.textContent.trim() : (widgetEl && widgetEl.dataset.widgetType) || "Widget";
      var groupEl = el.closest("details.group");
      var groupTitle = groupEl && groupEl.dataset.groupTitle ? groupEl.dataset.groupTitle : "";
      var title = (el.dataset.title || el.getAttribute("aria-label") || el.textContent || el.placeholder || widgetTitle || "").trim();
      var href = el.href || "";
      var host = href ? Hub.formatHost(href) : "";
      var searchText = [
        el.dataset.searchText,
        el.dataset.title,
        el.textContent,
        el.getAttribute("title"),
        el.getAttribute("aria-label"),
        el.placeholder,
        widgetTitle,
        groupTitle,
        host,
        href
      ].filter(Boolean).join(" ").trim();

      if (!title || !searchText) return null;

      var key = href || [widgetTitle, groupTitle, title, index].join("::");
      if (seen[key]) return null;
      seen[key] = true;

      return {
        title: title,
        href: href || null,
        type: groupTitle || widgetTitle,
        host: host,
        searchText: searchText,
        action: href ? null : function () {
          if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") el.focus();
          else if (typeof el.click === "function") el.click();
          else el.focus();
        }
      };
    }).filter(Boolean);
  }

  /* ── Profile management ── */

  var PERSONAL_SEED = {
    label: "Personal",
    widgets: [
      { id: "search", type: "search", col: 1, row: 1, width: 12, height: 1, config: { searchBaseUrl: "https://duckduckgo.com/?q=" } },
      { id: "pinned", type: "pinned-links", col: 1, row: 2, width: 12, height: 1, config: {
        items: [
          { title: "Gmail", href: "https://mail.google.com/" },
          { title: "YouTube", href: "https://www.youtube.com/" },
          { title: "Spotify", href: "https://open.spotify.com/", badge: "Music", healthCheck: true },
          { title: "GitHub", href: "https://github.com/" },
          { title: "Notion", href: "https://www.notion.so/" },
          { title: "TradingView", href: "https://www.tradingview.com/", healthCheck: true }
        ]
      }},
      { id: "daily", type: "link-group", col: 1, row: 3, width: 4, height: 1, config: {
        title: "Daily",
        items: [
          { title: "Calendar", href: "https://calendar.google.com/" },
          { title: "Drive", href: "https://drive.google.com/" },
          { title: "WhatsApp", href: "https://web.whatsapp.com/" },
          { title: "Maps", href: "https://maps.google.com/" }
        ]
      }},
      { id: "read", type: "link-group", col: 5, row: 3, width: 4, height: 1, config: {
        title: "Read",
        items: [
          { title: "Hacker News", href: "https://news.ycombinator.com/" },
          { title: "The Verge", href: "https://www.theverge.com/" },
          { title: "Ars Technica", href: "https://arstechnica.com/" },
          { title: "YouTube", href: "https://www.youtube.com/" }
        ]
      }},
      { id: "markets", type: "markets", col: 9, row: 3, width: 4, height: 1, config: {
        title: "Markets",
        items: [
          { label: "Bitcoin", symbol: "BTC", coinGeckoId: "bitcoin", href: "https://www.tradingview.com/symbols/BTCUSD/" },
          { label: "Ethereum", symbol: "ETH", coinGeckoId: "ethereum", href: "https://www.tradingview.com/symbols/ETHUSD/" }
        ]
      }},
      { id: "finance", type: "link-group", col: 1, row: 4, width: 4, height: 1, config: {
        title: "Finance",
        items: [
          { title: "TradingView", href: "https://www.tradingview.com/", badge: "Charts" },
          { title: "Koyfin", href: "https://app.koyfin.com/" },
          { title: "Fintual", href: "https://fintual.cl/" },
          { title: "Fintoc", href: "https://app.fintoc.com/" }
        ]
      }},
      { id: "feeds", type: "feeds", col: 5, row: 4, width: 8, height: 1, config: {
        title: "Feeds",
        items: [
          { title: "HN Front Page", url: "https://hnrss.org/frontpage", site: "https://news.ycombinator.com/" },
          { title: "The Verge", url: "https://www.theverge.com/rss/index.xml", site: "https://www.theverge.com/" }
        ]
      }}
    ]
  };

  async function loadBundle() {
    var profiles = await state.store.get(Hub.STORAGE_PROFILES_KEY);

    /* Guard: seed personal if storage is empty (new install handled by onInstalled,
       this catches upgrade path and edge case where sync deleted all profiles). */
    if (!profiles || Object.keys(profiles).length === 0) {
      profiles = { personal: PERSONAL_SEED };
      await state.store.set(Hub.STORAGE_PROFILES_KEY, profiles);
      await state.store.set(Hub.STORAGE_DEFAULT_PROFILE_KEY, "personal");
    }

    var defaultProfile = (await state.store.get(Hub.STORAGE_DEFAULT_PROFILE_KEY))
      || Object.keys(profiles)[0];

    return { defaultProfile: defaultProfile, profiles: profiles };
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
    state.profileOverrides[state.activeProfile] = { widgets: widgets, _savedAt: Date.now() };
    await state.store.set(Hub.STORAGE_OVERRIDES_KEY, state.profileOverrides);
  };

  /* ── Render pipeline ── */

  var widgetElements = {};

  function renderWidgetError(el, widget, message, err) {
    var title = (widget.config && widget.config.title) || (Hub.registry.get(widget.type) || {}).label || widget.type || "Widget";
    el.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(title) + '</h2></div>' +
      '<div class="empty-state">' + Hub.escapeHtml(message) + '</div>';
    if (err) console.error("Widget failure", widget.type, widget.id, err);
  }

  function buildWidgetEl(w) {
    var plugin = Hub.registry.get(w.type);

    var el = document.createElement("div");
    el.className = "widget widget-" + w.type;
    el.id = "widget-" + w.id;
    el.dataset.widgetId = w.id;
    el.dataset.widgetType = w.type;
    if (w.cardColor) {
      el.style.setProperty("--widget-surface", "hsl(" + w.cardColor.h + ",30%," + w.cardColor.l + "%)");
    }
    if (!plugin) {
      renderWidgetError(el, w, 'Unknown widget type: ' + (w.type || "(none)"));
    }
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

      try {
        plugin.render(el, Object.assign({}, w.config || {}, { _id: w.id }), state);
      } catch (err) {
        renderWidgetError(el, w, "Failed to render widget.", err);
      }
    });
  }

  async function renderDashboard(profileName, opts) {
    opts = opts || {};
    var profile = state.bundle.profiles[profileName];
    if (!profile) return;
    var searchSnapshot = opts.preserveSearch ? captureSearchState() : null;

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

    /* Update profile label in topbar */
    var profileLabelEl = document.getElementById("profile-label");
    if (profileLabelEl) profileLabelEl.textContent = profile.label || profileName;

    /* Kick off theme/background loading early so visuals don't wait on widget fetches. */
    var visualPromises = [
      Hub.loadTheme(state.store, profileName, profile),
      Hub.loadBgImage(state.store, profileName)
    ];

    /* Set search base URL from search widget config */
    var searchWidget = widgets.find(function (w) { return w.type === "search"; });
    state.searchWidgetConfigs = {};
    state.searchFocusWidgetIds = {};
    widgets.filter(function (w) { return w.type === "search"; }).forEach(function (w) {
      var normalizedConfig = Hub.searchWidget && Hub.searchWidget.normalizeConfig
        ? Hub.searchWidget.normalizeConfig(w.config)
        : (w.config || {});
      state.searchWidgetConfigs[w.id] = normalizedConfig;
      if (normalizedConfig.focusKey && !state.searchFocusWidgetIds[normalizedConfig.focusKey]) {
        state.searchFocusWidgetIds[normalizedConfig.focusKey] = w.id;
      }
    });
    state.primarySearchWidgetId = state.searchFocusWidgetIds["/"] || (searchWidget ? searchWidget.id : null);
    var primarySearchConfig = state.primarySearchWidgetId ? getSearchWidgetConfig(state.primarySearchWidgetId) : null;
    Hub.keyboard.setSearchFocusKeys(Object.keys(state.searchFocusWidgetIds));
    if (primarySearchConfig) {
      Hub.search.state.searchBaseUrl = primarySearchConfig.searchBaseUrl || "https://duckduckgo.com/?q=";
    }

    /* Focus search immediately after DOM is ready — don't wait for async loads */
    if (!restoreSearchState(searchSnapshot)) {
      if (opts.suppressSearchAutoFocus) {
        if (window.__disableEarlyKeys) {
          window.__disableEarlyKeys();
          delete window.__disableEarlyKeys;
        }
      } else if (shouldAutoFocusSearchWidget({ config: primarySearchConfig })) {
        Hub.focusSearch();
      } else if (window.__disableEarlyKeys) {
        window.__disableEarlyKeys();
        delete window.__disableEarlyKeys;
        var input = getPrimarySearchInput();
        if (input && document.activeElement === input) input.blur();
      }
    }

    /* Search index — computed from the live DOM so slash-search can target any focusable item. */
    Hub.search.state.indexFn = function () {
      return buildDomSearchIndex();
    };

    /* Async loads */
    if (!opts.skipAsync) {
      var loadPromises = visualPromises.slice();
      widgets.forEach(function (w) {
        var el = widgetElements[w.id];
        var plugin = Hub.registry.get(w.type);
        if (el && plugin && plugin.load) {
          loadPromises.push(
            plugin.load(el, Object.assign({}, w.config || {}, { _id: w.id }), state, token).catch(function (err) {
              if (token !== state.renderToken) return;
              renderWidgetError(el, w, "Failed to load widget data.", err);
            })
          );
        }
      });
      loadPromises.push(runHealthChecks(widgets, token));
      await Promise.allSettled(loadPromises);
    } else {
      await Promise.allSettled(visualPromises);
    }

    if (token !== state.renderToken) return;
    scheduleHealthRefresh();

    /* Assign chord key shortcuts to widgets */
    Hub.keyboard.assignWidgetKeys();

    /* Cache favicons after images have a chance to load */
    setTimeout(function () { Hub.cacheFavicons(state.store); }, 2000);
  }

  /* ── Focus management ── */

  Hub.focusSearch = function (target) {
    var els = getSearchElementsForTarget(target);
    var input = els && els.input;
    if (!input) return;
    if (!target && window.__flushEarlyKeys) { window.__flushEarlyKeys(); delete window.__flushEarlyKeys; return; }
    if (!target && state.autoFocusPausedUntil > Date.now()) return;
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
      if (!e.target.matches('[data-search-input="true"]')) return;
      var widget = e.target.closest('.widget[data-widget-id]');
      var resultsEl = widget && widget.querySelector('[data-search-results="true"]');
      if (!resultsEl) return;
      var searchConfig = getSearchConfigForElement(e.target);
      Hub.search.state.searchBaseUrl = searchConfig.searchBaseUrl || "https://duckduckgo.com/?q=";
      Hub.search.update(e.target.value, { resultsContainer: resultsEl }, { sources: searchConfig.sources, sourceLimits: searchConfig.sourceLimits });
    });

    document.addEventListener("keydown", function (e) {
      if (!e.target.matches('[data-search-input="true"]')) return;
      var widget = e.target.closest('.widget[data-widget-id]');
      var resultsEl = widget && widget.querySelector('[data-search-results="true"]');
      var searchConfig = getSearchConfigForElement(e.target);
      if (!resultsEl) return;
      if (e.key === "ArrowDown") { e.preventDefault(); Hub.search.cycle(1, resultsEl); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); Hub.search.cycle(-1, resultsEl); return; }
      if (e.key === "Enter") {
        e.preventDefault();
        Hub.search.state.searchBaseUrl = searchConfig.searchBaseUrl || "https://duckduckgo.com/?q=";
        var target = Hub.search.currentResult() || Hub.search.buildQueryAction(e.target.value, { sources: searchConfig.sources });
        if (target) Hub.search.activateResult(target, e.metaKey || e.ctrlKey);
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
      document.querySelectorAll('[data-search-results="true"]').forEach(function (resultsEl) {
        var widget = resultsEl.closest('.widget[data-widget-id]');
        var input = widget && widget.querySelector('[data-search-input="true"]');
        if (!resultsEl.contains(e.target) && e.target !== input) {
          resultsEl.classList.add("hidden");
        }
      });
    });
  }

  function slugify(name) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "profile";
  }

  function uniqueProfileId(profiles, base) {
    if (!profiles[base]) return base;
    var n = 2;
    while (profiles[base + "-" + n]) { n++; }
    return base + "-" + n;
  }

  /* ── Profile switcher ── */

  function bindProfileSwitcher() {
    var btn = document.getElementById("profile-switcher-btn");
    var dropdown = document.getElementById("profile-dropdown");

    btn.innerHTML = Hub.icons.user + Hub.icons.chevronDown;

    function buildNewProfileInput() {
      var wrapper = document.createElement("div");
      wrapper.className = "profile-dropdown-new-input";

      var input = document.createElement("input");
      input.type = "text";
      input.placeholder = "Profile name";
      input.className = "profile-dropdown-input";

      async function createProfile() {
        var name = input.value.trim();
        if (!name) { renderDropdown(); return; }
        var profiles = (await state.store.get(Hub.STORAGE_PROFILES_KEY)) || {};
        var id = uniqueProfileId(profiles, slugify(name));
        profiles[id] = {
          label: name,
          _savedAt: Date.now(),
          widgets: [
            { id: "search", type: "search", col: 1, row: 1, width: 12, height: 1,
              config: { searchBaseUrl: "https://duckduckgo.com/?q=" } }
          ]
        };
        await state.store.set(Hub.STORAGE_PROFILES_KEY, profiles);
        await state.store.set(Hub.STORAGE_KEY, id);
        dropdown.classList.remove("is-open");
        state.bundle = await loadBundle();
        await renderDashboard(id);
      }

      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") { e.preventDefault(); createProfile(); }
        if (e.key === "Escape") { e.preventDefault(); renderDropdown(); }
      });

      wrapper.appendChild(input);
      setTimeout(function () { input.focus(); }, 0);
      return wrapper;
    }

    function buildDeleteConfirm(id, label, syncEnabled) {
      var panel = document.createElement("div");
      panel.className = "profile-dropdown-confirm";

      var msg = document.createElement("span");
      msg.className = "profile-dropdown-confirm-msg";
      msg.textContent = "Remove \u201c" + label + "\u201d?";
      panel.appendChild(msg);

      var actions = document.createElement("div");
      actions.className = "profile-dropdown-confirm-actions";

      var cancelBtn = document.createElement("button");
      cancelBtn.type = "button";
      cancelBtn.className = "profile-dropdown-confirm-btn";
      cancelBtn.textContent = "Cancel";
      cancelBtn.addEventListener("click", function (e) { e.stopPropagation(); renderDropdown(); });

      var localBtn = document.createElement("button");
      localBtn.type = "button";
      localBtn.className = "profile-dropdown-confirm-btn is-danger";
      localBtn.textContent = "Delete here";
      localBtn.addEventListener("click", async function (e) {
        e.stopPropagation();
        await doDeleteProfile(id, false);
      });

      actions.appendChild(cancelBtn);
      actions.appendChild(localBtn);

      if (syncEnabled) {
        var allBtn = document.createElement("button");
        allBtn.type = "button";
        allBtn.className = "profile-dropdown-confirm-btn is-danger";
        allBtn.textContent = "Delete everywhere";
        allBtn.addEventListener("click", async function (e) {
          e.stopPropagation();
          await doDeleteProfile(id, true);
        });
        actions.appendChild(allBtn);
      }

      panel.appendChild(actions);
      return panel;
    }

    async function doDeleteProfile(id, uploadAfter) {
      if (uploadAfter) {
        /* "Delete everywhere": write locally, then push to remote */
        var stored = (await state.store.get(Hub.STORAGE_PROFILES_KEY)) || {};
        delete stored[id];
        await state.store.set(Hub.STORAGE_PROFILES_KEY, stored);
        if (typeof chrome !== "undefined" && chrome.runtime) {
          chrome.runtime.sendMessage({ action: "syncUpload" });
        }
      } else {
        /* "Delete here": delegate to background, which suppresses auto-upload.
           Await the response so we know the write is done before reloading. */
        if (typeof chrome !== "undefined" && chrome.runtime) {
          await new Promise(function (resolve) {
            chrome.runtime.sendMessage({ action: "deleteProfileLocal", id: id }, function (response) {
              if (chrome.runtime.lastError) {
                console.error("deleteProfileLocal:", chrome.runtime.lastError.message);
              }
              resolve(response);
            });
          });
        }
      }
      state.bundle = await loadBundle();
      if (state.activeProfile === id) {
        await state.store.set(Hub.STORAGE_KEY, state.bundle.defaultProfile);
        dropdown.classList.remove("is-open");
        await renderDashboard(state.bundle.defaultProfile);
      } else {
        renderDropdown();
      }
    }

    function renderDropdown() {
      dropdown.replaceChildren();
      var profiles = state.bundle ? state.bundle.profiles : {};
      var defaultProfile = state.bundle ? state.bundle.defaultProfile : null;
      Object.keys(profiles).forEach(function (name) {
        var row = document.createElement("div");
        row.className = "profile-dropdown-row";

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
        row.appendChild(item);

        if (name !== defaultProfile) {
          var delBtn = document.createElement("button");
          delBtn.className = "profile-dropdown-delete";
          delBtn.type = "button";
          delBtn.title = "Remove profile";
          delBtn.innerHTML = "&#x2715;";
          delBtn.addEventListener("click", async function (e) {
            e.stopPropagation();
            var syncEnabled = !!(await state.store.get("new-tab-webdav-url"));
            row.replaceWith(buildDeleteConfirm(name, profiles[name].label || name, syncEnabled));
          });
          row.appendChild(delBtn);
        }

        dropdown.appendChild(row);
      });

      /* New profile entry */
      var newProfileBtn = document.createElement("button");
      newProfileBtn.className = "profile-dropdown-item profile-dropdown-new";
      newProfileBtn.type = "button";
      newProfileBtn.textContent = "+ New profile";
      newProfileBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        newProfileBtn.replaceWith(buildNewProfileInput());
      });
      dropdown.appendChild(newProfileBtn);

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
      /* Suppress autofocus — user is navigating via keyboard, not starting a search */
      state.autoFocusPausedUntil = Date.now() + 2000;
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
    var initialEditHash = null; /* djb2 hash of initial state for dirty detection */

    function hashString(str) {
      var hash = 5381;
      for (var i = 0; i < str.length; i++) {
        hash = (((hash << 5) + hash) ^ str.charCodeAt(i)) | 0;
      }
      return hash;
    }

    function editStateHash() {
      var clone = Hub.grid.getEditClone();
      if (!clone) return null;
      var gridEl = document.getElementById("dashboard-grid");
      var domLayout = Hub.grid.readLayoutFromDOM(gridEl);
      var posById = {};
      domLayout.forEach(function (l) { posById[l.widget] = l; });
      var state = clone.map(function (w) {
        var p = posById[w.id] || {};
        return { id: w.id, col: p.col || w.col, row: p.row || w.row,
                 width: p.width || w.width, height: p.height || w.height,
                 config: w.config, cardColor: w.cardColor || null };
      });
      return hashString(JSON.stringify(state));
    }

    function isLayoutDirty() {
      return initialEditHash !== null && editStateHash() !== initialEditHash;
    }

    async function saveLayout() {
      var gridEl = document.getElementById("dashboard-grid");
      if (!Hub.grid.isEditing()) return;

      /* Read layout positions from DOM and grab clone BEFORE exiting edit mode */
      var newLayout = Hub.grid.readLayoutFromDOM(gridEl);
      var clone = Hub.grid.getEditClone();

      if (editExitFn) editExitFn();
      editExitFn = null;
      savedOverrides = null;
      initialEditHash = null;

      if (clone) {
        newLayout.forEach(function (l) {
          var w = clone.find(function (ww) { return ww.id === l.widget; });
          if (w) { w.col = l.col; w.row = l.row; w.width = l.width; w.height = l.height; }
        });
        state.profileOverrides[state.activeProfile] = { widgets: clone, _savedAt: Date.now() };
        await state.store.set(Hub.STORAGE_OVERRIDES_KEY, state.profileOverrides);
      }

      await renderDashboard(state.activeProfile, { suppressSearchAutoFocus: true });
    }

    async function cancelLayout() {
      if (isLayoutDirty() && !window.confirm("Discard unsaved changes?")) return;
      initialEditHash = null;
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
      await renderDashboard(state.activeProfile, { suppressSearchAutoFocus: true });
    }

    async function onConfigSave(widgetId) {
      /* Persist config changes immediately when config modal closes */
      var clone = Hub.grid.getEditClone();
      if (clone) {
        state.profileOverrides[state.activeProfile] = { widgets: clone, _savedAt: Date.now() };
        await state.store.set(Hub.STORAGE_OVERRIDES_KEY, state.profileOverrides);
      }
      /* Preview the updated widget tile while still in edit mode */
      if (widgetId && clone) {
        var w = clone.find(function (ww) { return ww.id === widgetId; });
        var el = widgetElements[widgetId];
        if (w && el) {
          var plugin = Hub.registry.get(w.type);
          if (plugin && plugin.render) {
            state._collapsedGroups = new Set(state.collapsedGroups[state.activeProfile] || []);
            state._onToggleGroup = function (title, isOpen) {
              var s = new Set(state.collapsedGroups[state.activeProfile] || []);
              if (isOpen) s.delete(title); else s.add(title);
              state.collapsedGroups[state.activeProfile] = Array.from(s);
              state.store.set(Hub.STORAGE_COLLAPSED_KEY, state.collapsedGroups);
            };
            /* Save edit controls before render wipes innerHTML */
            var editControls = el.querySelector(".widget-edit-controls");
            var resizeHandle = el.querySelector(".widget-resize-handle");
            plugin.render(el, Object.assign({}, w.config || {}, { _id: w.id }), state);
            /* Restore edit controls so drag/gear/trash still work */
            if (editControls) el.prepend(editControls);
            if (resizeHandle) el.appendChild(resizeHandle);
            if (plugin.load) plugin.load(el, Object.assign({}, w.config || {}, { _id: w.id }), state, state.renderToken);
          }
        }
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
      renderDashboard(state.activeProfile, { suppressSearchAutoFocus: true }).then(function () {
        var gridEl = document.getElementById("dashboard-grid");
        Hub.grid.setEditClone(clone);
        editExitFn = Hub.grid.enterEditMode(gridEl, [], saveLayout, cancelLayout, onWidgetAdded, onConfigSave);
      });
    }

    function enterEdit() {
      var gridEl = document.getElementById("dashboard-grid");
      if (Hub.grid.isEditing()) return;
      if (Hub.zen.isActive()) {
        Hub.zen.exit();
        Hub.zen.updateButtonIcon();
      }
      var current = state.profileOverrides[state.activeProfile];
      savedOverrides = current ? JSON.parse(JSON.stringify(current)) : undefined;
      var widgets = resolvedWidgets();
      Hub.grid.setEditClone(widgets);
      editExitFn = Hub.grid.enterEditMode(gridEl, [], saveLayout, cancelLayout, onWidgetAdded, onConfigSave);
      initialEditHash = editStateHash();
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
    var activeProfile;
    if (state.bundle.profiles[saved]) {
      activeProfile = saved;
    } else {
      activeProfile = state.bundle.defaultProfile;
      await state.store.set(Hub.STORAGE_KEY, activeProfile);
    }

    /* Re-apply with profile-specific theme */
    if (savedTheme) {
      var pc = (state.bundle.profiles[activeProfile] && state.bundle.profiles[activeProfile].colorScheme) || {};
      Hub.applyColorScheme(Object.assign({}, Hub.DEFAULT_COLORS, savedTheme._global || {}, pc, savedTheme[activeProfile] || {}));
    }

    bindSearch();
    Hub.keyboard.bind(function () { return state; });
    Hub.syncStatus.init();
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

    /* Re-render when a WebDAV sync completes — picks up downloaded config
       without requiring a page reload. Fires on both upload and download
       completions; re-rendering after upload is harmless (same data). */
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(async function (changes, area) {
        if (area !== "local") return;
        if (!changes["new-tab-sync-last"]) return;
        requestDashboardRefresh(async function () {
          state.bundle = await loadBundle();
          state.profileOverrides = (await state.store.get(Hub.STORAGE_OVERRIDES_KEY)) || {};
          var activeProfile = state.bundle.profiles[state.activeProfile]
            ? state.activeProfile
            : state.bundle.defaultProfile;
          await renderDashboard(activeProfile, { preserveSearch: true });
        });
      });
    }

    document.addEventListener("focusout", function () {
      setTimeout(flushPendingDashboardRefresh, 0);
    });

    /* Auto-download on new tab open: HEAD-check the remote file first.
       Only triggers a full download if ETag/Last-Modified has changed
       since the last sync, keeping the check nearly free. The existing
       onChanged listener re-renders the page when the download completes. */
    if (typeof chrome !== "undefined" && chrome.runtime) {
      chrome.runtime.sendMessage({ action: "syncAutoDownload" });
    }

  }

  init().catch(function (err) { console.error("Failed to initialize New Tab Hub", err); });
})();
