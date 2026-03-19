/* ── Search engine ── */

window.Hub = window.Hub || {};

Hub.search = (function () {
  var state = {
    results: [],
    activeIndex: 0,
    searchBaseUrl: "https://duckduckgo.com/?q=",
    indexFn: null
  };

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

  function update(query, els) {
    var nq = Hub.normalize(query);
    if (!nq) {
      state.results = [];
      state.activeIndex = 0;
      els.resultsContainer.classList.add("hidden");
      els.resultsContainer.replaceChildren();
      return;
    }

    var index = state.indexFn ? state.indexFn() : [];
    var matches = index.filter(function (item) {
      return Hub.normalize(item.title + " " + (item.type || "") + " " + (item.href || "")).includes(nq);
    }).slice(0, 6);

    var qa = buildQueryAction(query);
    state.results = qa ? [qa].concat(matches) : matches;
    state.activeIndex = 0;

    var frag = document.createDocumentFragment();
    state.results.forEach(function (item, i) {
      var btn = document.createElement("button");
      btn.className = "search-result" + (i === 0 ? " active-result" : "");
      btn.type = "button";
      btn.dataset.index = String(i);
      btn.innerHTML = "<strong>" + Hub.escapeHtml(item.title) + "</strong><small>" + Hub.escapeHtml(item.type || Hub.formatHost(item.href)) + "</small>";
      btn.addEventListener("click", function () { Hub.openItem(item.href, false); });
      frag.appendChild(btn);
    });

    els.resultsContainer.replaceChildren(frag);
    els.resultsContainer.classList.remove("hidden");
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
