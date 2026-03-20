/* ── Search engine ── */

window.Hub = window.Hub || {};

Hub.search = (function () {
  var state = {
    results: [],
    activeIndex: 0,
    searchBaseUrl: "https://duckduckgo.com/?q=",
    indexFn: null
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

  function buildQueryAction(query) {
    var t = query.trim();
    if (!t) return null;
    if (looksLikeUrl(t)) {
      var href = normalizeUrlInput(t);
      return { title: "Go to " + href, href: href, type: "URL" };
    }
    return { title: "Search the web for " + t, href: state.searchBaseUrl + encodeURIComponent(t), type: "Search" };
  }

  function renderResults(els) {
    var frag = document.createDocumentFragment();
    state.results.forEach(function (item, i) {
      var btn = document.createElement("button");
      btn.className = "search-result" + (i === state.activeIndex ? " active-result" : "");
      btn.type = "button";
      btn.dataset.index = String(i);
      btn.innerHTML = "<strong>" + Hub.escapeHtml(item.title) + "</strong><small>" + Hub.escapeHtml(item.type || Hub.formatHost(item.href)) + "</small>";
      btn.addEventListener("click", function () { Hub.openItem(item.href, false); });
      frag.appendChild(btn);
    });
    els.resultsContainer.replaceChildren(frag);
    els.resultsContainer.classList.toggle("hidden", state.results.length === 0);
  }

  /* Query chrome.bookmarks + chrome.history in parallel, deduped against local results */
  function fetchBrowserResults(query, localHrefs) {
    var promises = [];
    if (typeof chrome !== "undefined" && chrome.bookmarks) {
      promises.push(
        chrome.bookmarks.search(query).then(function (results) {
          return results.filter(function (b) { return b.url; }).slice(0, 5).map(function (b) {
            return { title: b.title || b.url, href: b.url, type: "Bookmark" };
          });
        }).catch(function () { return []; })
      );
    }
    if (typeof chrome !== "undefined" && chrome.history) {
      promises.push(
        chrome.history.search({ text: query, maxResults: 5 }).then(function (results) {
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
      return merged.slice(0, 6);
    });
  }

  function update(query, els) {
    var nq = Hub.normalize(query);
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
    var index = state.indexFn ? state.indexFn() : [];
    var matches = index.filter(function (item) {
      return Hub.normalize(item.title + " " + (item.type || "") + " " + (item.href || "")).includes(nq);
    }).slice(0, 6);

    var qa = buildQueryAction(query);
    state.results = qa ? [qa].concat(matches) : matches;
    state.activeIndex = 0;
    renderResults(els);

    /* Async browser results — debounced to avoid spamming APIs */
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(function () {
      var capturedQuery = query;
      var localHrefs = state.results.map(function (r) { return r.href; });
      fetchBrowserResults(query, localHrefs).then(function (browserResults) {
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
    buildQueryAction: buildQueryAction
  };
})();

Hub.openItem = function (href, newTab) {
  if (newTab) window.open(href, "_blank", "noopener,noreferrer");
  else window.location.href = href;
};
