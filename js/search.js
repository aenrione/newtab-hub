/* ── Search engine ── */

window.Hub = window.Hub || {};

Hub.search = (function () {
  var state = {
    results: [],
    activeIndex: 0,
    searchBaseUrl: "https://duckduckgo.com/?q=",
    indexFn: null,
    sourceConfig: null,
    sourceLimits: null
  };

  var _debounceTimer = null;
  var _lastQuery = "";

  function looksLikeUrl(q) {
    var t = q.trim();
    if (!t || /\s/.test(t)) return false;
    return /^[a-z]+:\/\//i.test(t) || /^[^\s]+\.[^\s]{2,}(?:\/.*)?$/i.test(t) || /^brave:\/\//i.test(t);
  }

  function normalizeUrlInput(q) {
    var t = q.trim();
    if (/^[a-z]+:\/\//i.test(t) || /^brave:\/\//i.test(t)) return t;
    return "https://" + t;
  }

  function normalizeSourceConfig(config) {
    var normalized = Object.assign({
      dashboard: true,
      bookmarks: true,
      history: true,
      webSearch: true
    }, config || {});

    Object.keys(normalized).forEach(function (key) {
      if (normalized[key] === "false" || normalized[key] === "0" || normalized[key] === 0) normalized[key] = false;
      else normalized[key] = normalized[key] !== false;
    });

    return normalized;
  }

  function normalizeSourceLimits(limits) {
    var normalized = Object.assign({
      dashboard: 6,
      bookmarks: 5,
      history: 5
    }, limits || {});

    Object.keys(normalized).forEach(function (key) {
      var num = Number(normalized[key]);
      if (!Number.isFinite(num)) num = key === "dashboard" ? 6 : 5;
      normalized[key] = Math.max(1, Math.min(20, Math.round(num)));
    });

    return normalized;
  }

  function buildQueryAction(query, opts) {
    var t = query.trim();
    var sources = normalizeSourceConfig(opts && opts.sources);
    if (!t) return null;
    if (looksLikeUrl(t)) {
      var href = normalizeUrlInput(t);
      return { title: "Go to " + href, href: href, type: "URL" };
    }
    if (!sources.webSearch) return null;
    return { title: "Search the web for " + t, href: state.searchBaseUrl + encodeURIComponent(t), type: "Search" };
  }

  function buildSearchText(item) {
    return [
      item.searchText,
      item.title,
      item.type,
      item.subtitle,
      item.href,
      item.host
    ].filter(Boolean).join(" ");
  }

  function activateResult(item, newTab) {
    if (!item) return;
    if (typeof item.action === "function") {
      item.action({ newTab: !!newTab });
      return;
    }
    if (item.href) Hub.openItem(item.href, newTab);
  }

  function renderResults(els) {
    var frag = document.createDocumentFragment();
    state.results.forEach(function (item, i) {
      var btn = document.createElement("button");
      btn.className = "search-result" + (i === state.activeIndex ? " active-result" : "");
      btn.type = "button";
      btn.dataset.index = String(i);
      btn.innerHTML = "<strong>" + Hub.escapeHtml(item.title) + "</strong><small>" + Hub.escapeHtml(item.type || item.subtitle || Hub.formatHost(item.href)) + "</small>";
      btn.addEventListener("click", function () { activateResult(item, false); });
      frag.appendChild(btn);
    });
    els.resultsContainer.replaceChildren(frag);
    els.resultsContainer.classList.toggle("hidden", state.results.length === 0);
  }

  /* Query chrome.bookmarks + chrome.history in parallel, deduped against local results */
  function fetchBrowserResults(query, localHrefs, sourceConfig, sourceLimits) {
    var sources = normalizeSourceConfig(sourceConfig);
    var limits = normalizeSourceLimits(sourceLimits);
    var promises = [];
    if (sources.bookmarks && typeof chrome !== "undefined" && chrome.bookmarks) {
      promises.push(
        chrome.bookmarks.search(query).then(function (results) {
          return results.filter(function (b) { return b.url; }).slice(0, limits.bookmarks).map(function (b) {
            return { title: b.title || b.url, href: b.url, type: "Bookmark" };
          });
        }).catch(function () { return []; })
      );
    }
    if (sources.history && typeof chrome !== "undefined" && chrome.history) {
      promises.push(
        chrome.history.search({ text: query, maxResults: limits.history }).then(function (results) {
          return results.map(function (h) {
            return { title: h.title || h.url, href: h.url, type: "History" };
          });
        }).catch(function () { return []; })
      );
    }
    if (!promises.length) return Promise.resolve([]);
    return Promise.all(promises).then(function (arrays) {
      var seen = {};
      localHrefs.forEach(function (h) { seen[h] = true; });
      var merged = [];
      arrays.forEach(function (arr) {
        arr.forEach(function (item) {
          if (!item.href || seen[item.href]) return;
          seen[item.href] = true;
          merged.push(item);
        });
      });
      return merged.slice(0, limits.bookmarks + limits.history);
    });
  }

  function update(query, els, opts) {
    var nq = Hub.normalize(query);
    var sources = normalizeSourceConfig(opts && opts.sources);
    var limits = normalizeSourceLimits(opts && opts.sourceLimits);
    state.sourceConfig = sources;
    state.sourceLimits = limits;
    _lastQuery = query;

    if (!nq) {
      state.results = [];
      state.activeIndex = 0;
      els.resultsContainer.classList.add("hidden");
      els.resultsContainer.replaceChildren();
      clearTimeout(_debounceTimer);
      return;
    }

    /* Synchronous local results — render immediately */
    var matches = [];
    if (sources.dashboard) {
      var index = state.indexFn ? state.indexFn() : [];
      matches = index.filter(function (item) {
        return Hub.normalize(buildSearchText(item)).includes(nq);
      }).slice(0, limits.dashboard);
    }

    var qa = buildQueryAction(query, { sources: sources });
    state.results = qa ? [qa].concat(matches) : matches;
    state.activeIndex = 0;
    renderResults(els);

    /* Async browser results — debounced to avoid spamming APIs */
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(function () {
      var capturedQuery = query;
      var localHrefs = state.results.map(function (r) { return r.href; });
      fetchBrowserResults(query, localHrefs, sources, limits).then(function (browserResults) {
        if (_lastQuery !== capturedQuery || !browserResults.length) return;
        /* Append browser results after local ones, preserving active index */
        var prevLen = state.results.length;
        state.results = state.results.concat(browserResults);
        renderResults(els);
      });
    }, 150);
  }

  function cycle(step, container) {
    var buttons = Array.from(container.querySelectorAll(".search-result"));
    if (!buttons.length) return;
    state.activeIndex = (state.activeIndex + step + buttons.length) % buttons.length;
    buttons.forEach(function (b, i) { b.classList.toggle("active-result", i === state.activeIndex); });
  }

  function currentResult() {
    return state.results[state.activeIndex] || null;
  }

  return {
    state: state,
    update: update,
    cycle: cycle,
    currentResult: currentResult,
    buildQueryAction: buildQueryAction,
    activateResult: activateResult,
    normalizeSourceConfig: normalizeSourceConfig,
    normalizeSourceLimits: normalizeSourceLimits
  };
})();

Hub.openItem = function (href, newTab) {
  if (newTab) window.open(href, "_blank", "noopener,noreferrer");
  else window.location.href = href;
};
