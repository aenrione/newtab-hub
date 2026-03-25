/* ── Widget Playground (storybook) logic ── */

(function () {

  /* ── State ──────────────────────────────────────────────────── */
  /* "live" | "mock" | "empty" | "error" */
  var sbState = "live";

  /* ── Hub method patching ───────────────────────────────────── */
  var _origCFJ   = Hub.cachedFetchJSON;
  var _origCF    = Hub.cachedFetch;
  var _origFWT   = Hub.fetchWithTimeout;
  var _origCreds = Hub.credentials.load.bind(Hub.credentials);

  function sbFindMock(url) {
    var mocks = window.SB_MOCKS || [];
    for (var i = 0; i < mocks.length; i++) {
      if (url.indexOf(mocks[i].match) !== -1) return mocks[i];
    }
    return null;
  }

  function sbMockData(url) {
    var entry = sbFindMock(url);
    if (!entry) return null;
    return typeof entry.data === "function" ? entry.data(url) : entry.data;
  }

  function sbEmptyFor(url) {
    if (url.indexOf("algolia") !== -1)            return { hits: [] };
    if (url.indexOf("reddit.com") !== -1)         return { data: { children: [] } };
    if (url.indexOf("api.github.com/search") !== -1) return { items: [], total_count: 0 };
    if (url.indexOf("api.github.com/repos") !== -1)  return [];
    if (url.indexOf("geocoding-api") !== -1)      return { results: [] };
    if (url.indexOf("lobste.rs") !== -1)          return [];
    return [];
  }

  /** Returns a Response-like object (for Hub.fetchWithTimeout callers). */
  function sbFakeResponse(data) {
    return {
      ok: true, status: 200,
      json: function () { return Promise.resolve(data); },
      text: function () { return Promise.resolve(typeof data === "string" ? data : JSON.stringify(data)); }
    };
  }

  /* Patch Hub.cachedFetchJSON */
  Hub.cachedFetchJSON = async function (url, category, store, opts, cacheKeyOverride) {
    if (sbState === "error") throw new Error("Simulated error — widget fetch failed");
    if (sbState === "mock") {
      var d = sbMockData(url);
      return d !== null ? d : sbEmptyFor(url);
    }
    if (sbState === "empty") return sbEmptyFor(url);
    return _origCFJ(url, category, store, opts, cacheKeyOverride);
  };

  /* Patch Hub.cachedFetch (RSS/text responses — feeds widget) */
  Hub.cachedFetch = async function (url, category, store, opts, cacheKeyOverride) {
    if (sbState === "error") throw new Error("Simulated error — widget fetch failed");
    if (sbState === "mock") {
      var d = sbMockData(url);
      return d !== null ? d : "";
    }
    if (sbState === "empty") return "";
    return _origCF(url, category, store, opts, cacheKeyOverride);
  };

  /* Patch Hub.fetchWithTimeout (github-prs, github-releases, monitor, etc.) */
  Hub.fetchWithTimeout = function (url, opts, timeout) {
    if (sbState === "error")
      return Promise.reject(new Error("Simulated error — widget fetch failed"));
    if (sbState === "mock") {
      var d = sbMockData(url);
      return Promise.resolve(sbFakeResponse(d !== null ? d : sbEmptyFor(url)));
    }
    if (sbState === "empty")
      return Promise.resolve(sbFakeResponse(sbEmptyFor(url)));
    return _origFWT(url, opts, timeout);
  };

  /* Patch Hub.credentials.load — return fake creds in non-live modes */
  Hub.credentials.load = function (widgetId) {
    if (sbState !== "live") {
      var plugin = Hub.registry.get(activeType);
      if (plugin && plugin.credentialFields && plugin.credentialFields.length) {
        var fake = {};
        plugin.credentialFields.forEach(function (f) { fake[f.key] = "mock-" + f.key; });
        return Promise.resolve(fake);
      }
    }
    return _origCreds(widgetId);
  };

  /* ── Widget state ──────────────────────────────────────────── */
  var WIDTHS = [
    { label: "300px", px: 300 },
    { label: "420px", px: 420 },
    { label: "580px", px: 580 }
  ];

  var activeType   = null;
  var activeConfig = null;
  var activeState  = null;
  var widgetEl     = null;
  var frameEl      = null;

  /* ── Sidebar ────────────────────────────── */
  function buildSidebar(filter) {
    var list  = document.getElementById("sb-list");
    var q     = (filter || "").trim().toLowerCase();
    var items = Hub.registry.list().slice().sort(function (a, b) {
      return (a.label || a.type).localeCompare(b.label || b.type);
    });

    list.innerHTML = "";

    var shown = 0;
    items.forEach(function (p) {
      var label = p.label || p.type;
      if (q && label.toLowerCase().indexOf(q) === -1) return;
      shown++;
      var el = document.createElement("div");
      el.className = "sb-item" + (p.type === activeType ? " active" : "");
      el.textContent = label;
      el.addEventListener("click", function () { selectWidget(p.type); });
      list.appendChild(el);
    });

    if (!shown) {
      var empty = document.createElement("div");
      empty.className = "sb-empty-list";
      empty.textContent = "No widgets match.";
      list.appendChild(empty);
    }
  }

  document.getElementById("sb-search").addEventListener("input", function (e) {
    buildSidebar(e.target.value);
  });

  /* ── Select widget ──────────────────────── */
  function selectWidget(type) {
    activeType = type;
    var plugin = Hub.registry.get(type);
    if (!plugin) return;

    var saved = null;
    try { saved = JSON.parse(sessionStorage.getItem("sb-cfg:" + type)); } catch (_) {}
    var defaults = plugin.defaultConfig ? plugin.defaultConfig() : {};
    activeConfig = Object.assign({}, defaults, saved || {});
    activeConfig._id = "storybook:" + type;

    buildSidebar(document.getElementById("sb-search").value);
    buildPreview();
    buildEditor();
    syncUrl();
  }

  /* ── Preview ────────────────────────────── */
  function buildPreview() {
    var plugin = Hub.registry.get(activeType);
    if (!plugin) return;

    var pane   = document.getElementById("sb-preview");
    var splash = document.getElementById("sb-splash");
    splash.style.display = "none";

    var old = document.getElementById("sb-preview-content");
    if (old) old.remove();

    var wrap = document.createElement("div");
    wrap.id = "sb-preview-content";

    /* Heading */
    var heading = document.createElement("div");
    var titleEl = document.createElement("div");
    titleEl.className = "sb-preview-title";
    titleEl.textContent = plugin.label || activeType;
    var subtitleEl = document.createElement("div");
    subtitleEl.className = "sb-preview-subtitle";
    subtitleEl.textContent = "type: " + activeType;
    heading.appendChild(titleEl);
    heading.appendChild(subtitleEl);
    wrap.appendChild(heading);

    /* Controls row */
    var ctrlRow = document.createElement("div");
    ctrlRow.className = "sb-controls";

    /* State buttons */
    var stateLabel = document.createElement("span");
    stateLabel.className = "sb-controls-label";
    stateLabel.textContent = "State";
    ctrlRow.appendChild(stateLabel);

    var STATES = [
      { key: "live",  label: "Live"  },
      { key: "mock",  label: "Mock"  },
      { key: "empty", label: "Empty" },
      { key: "error", label: "Error" }
    ];
    STATES.forEach(function (s) {
      var btn = document.createElement("button");
      btn.className = "sb-btn sb-state-btn" + (sbState === s.key ? " active" : "");
      btn.textContent = s.label;
      btn.dataset.state = s.key;
      btn.addEventListener("click", function () {
        sbState = s.key;
        ctrlRow.querySelectorAll(".sb-state-btn").forEach(function (b) { b.classList.toggle("active", b.dataset.state === s.key); });
        syncUrl();
        runLoad();
      });
      ctrlRow.appendChild(btn);
    });

    /* Separator */
    var div1 = document.createElement("span");
    div1.className = "sb-divider";
    div1.textContent = "\u00b7";
    ctrlRow.appendChild(div1);

    /* Width buttons */
    var widthLabel = document.createElement("span");
    widthLabel.className = "sb-controls-label";
    widthLabel.textContent = "Width";
    ctrlRow.appendChild(widthLabel);

    WIDTHS.forEach(function (w, i) {
      var btn = document.createElement("button");
      btn.className = "sb-btn sb-width-btn" + (i === 0 ? " active" : "");
      btn.textContent = w.label;
      btn.dataset.role = "width";
      btn.addEventListener("click", function () {
        ctrlRow.querySelectorAll(".sb-width-btn").forEach(function (b) { b.classList.remove("active"); });
        btn.classList.add("active");
        if (frameEl) frameEl.style.width = w.px + "px";
      });
      ctrlRow.appendChild(btn);
    });

    /* Separator + refresh */
    var div2 = document.createElement("span");
    div2.className = "sb-divider";
    div2.textContent = "\u00b7";
    ctrlRow.appendChild(div2);

    var refreshBtn = document.createElement("button");
    refreshBtn.className = "sb-btn";
    refreshBtn.textContent = "\u21ba Refresh";
    refreshBtn.addEventListener("click", function () { runLoad(); });
    ctrlRow.appendChild(refreshBtn);

    wrap.appendChild(ctrlRow);

    /* Widget frame */
    frameEl = document.createElement("div");
    frameEl.className = "sb-widget-frame";
    frameEl.style.width = WIDTHS[0].px + "px";

    widgetEl = document.createElement("div");
    widgetEl.className = "widget";
    frameEl.appendChild(widgetEl);
    wrap.appendChild(frameEl);

    pane.appendChild(wrap);
    runLoad();
  }

  function runLoad() {
    var plugin = Hub.registry.get(activeType);
    if (!plugin || !widgetEl) return;

    activeState = { store: null, renderToken: {}, links: [] };
    var token = activeState.renderToken;

    plugin.render(widgetEl, activeConfig, activeState);
    if (plugin.load) {
      plugin.load(widgetEl, activeConfig, activeState, token);
    }
  }

  /* ── Editor ─────────────────────────────── */
  function buildEditor() {
    var plugin   = Hub.registry.get(activeType);
    var editorEl = document.getElementById("sb-editor-body");
    editorEl.innerHTML = "";

    if (!plugin || !plugin.renderEditor) {
      var empty = document.createElement("div");
      empty.className = "sb-editor-empty";
      empty.textContent = "This widget has no editor.";
      editorEl.appendChild(empty);
      return;
    }

    plugin.renderEditor(editorEl, activeConfig, function (newCfg) {
      activeConfig = newCfg;
      try { sessionStorage.setItem("sb-cfg:" + activeType, JSON.stringify(activeConfig)); } catch (_) {}
      syncUrl();
      runLoad();
    });
  }

  /* ── URL params ─────────────────────────── */
  function syncUrl() {
    if (!activeType) return;
    var params = new URLSearchParams();
    params.set("widget", activeType);
    if (sbState !== "live") params.set("state", sbState);
    if (activeConfig) {
      var stripped = Object.assign({}, activeConfig);
      delete stripped._id;
      params.set("config", JSON.stringify(stripped));
    }
    history.replaceState(null, "", "?" + params.toString());
  }

  function readUrl() {
    var params = new URLSearchParams(location.search);
    var type   = params.get("widget") || null;
    var state  = params.get("state")  || null;
    var cfg    = null;
    try { cfg = params.get("config") ? JSON.parse(params.get("config")) : null; } catch (_) {}
    return { type: type, state: state, config: cfg };
  }

  /* ── Init ───────────────────────────────── */
  buildSidebar();

  var fromUrl = readUrl();
  if (fromUrl.state && ["live","mock","empty","error"].indexOf(fromUrl.state) !== -1) {
    sbState = fromUrl.state;
  }
  if (fromUrl.type && Hub.registry.get(fromUrl.type)) {
    if (fromUrl.config) {
      try { sessionStorage.setItem("sb-cfg:" + fromUrl.type, JSON.stringify(fromUrl.config)); } catch (_) {}
    }
    selectWidget(fromUrl.type);
  } else {
    var all = Hub.registry.list().slice().sort(function (a, b) {
      return (a.label || a.type).localeCompare(b.label || b.type);
    });
    if (all.length) selectWidget(all[0].type);
  }
})();
