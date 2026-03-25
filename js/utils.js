/* ── Shared utilities ── */

window.Hub = window.Hub || {};

Hub.escapeHtml = function (value) {
  return String(value).replace(/[&<>"']/g, function (ch) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
  });
};

Hub.normalize = function (value) {
  return String(value || "").toLowerCase().trim();
};

Hub.initials = function (value) {
  var parts = String(value || "").trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return (parts.map(function (p) { return p[0]; }).join("") || String(value).slice(0, 2)).toUpperCase();
};

Hub.formatHost = function (url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); }
  catch (_) { return url; }
};

Hub.faviconUrl = function (url) {
  return "https://icons.duckduckgo.com/ip3/" + encodeURIComponent(Hub.formatHost(url)) + ".ico";
};

Hub.iconMarkup = function (url, title, small) {
  var cls = small ? " card-icon-small" : "";
  var faviconSrc = Hub.faviconUrl(url);

  /* Check in-memory favicon cache */
  var cached = Hub.cache ? Hub.cache.get("fav::" + Hub.formatHost(url)) : null;
  if (cached) faviconSrc = cached;

  return '<span class="card-icon' + cls + '">' +
    '<img class="card-favicon" src="' + Hub.escapeHtml(faviconSrc) + '" alt="" loading="lazy" ' +
    'onerror="this.style.display=\'none\'; this.nextElementSibling.style.display=\'flex\';" ' +
    'data-favicon-host="' + Hub.escapeHtml(Hub.formatHost(url)) + '" />' +
    '<span class="card-fallback">' + Hub.escapeHtml(Hub.initials(title)) + '</span></span>';
};

/** Cache favicons as data URIs after they load (called once after render) */
Hub.cacheFavicons = function (store) {
  document.querySelectorAll("img.card-favicon[data-favicon-host]").forEach(function (img) {
    var host = img.dataset.faviconHost;
    if (!host || Hub.cache.get("fav::" + host)) return;

    if (img.complete && img.naturalWidth > 0) {
      convertAndCache(img, host, store);
    } else {
      img.addEventListener("load", function () {
        convertAndCache(img, host, store);
      }, { once: true });
    }
  });
};

function convertAndCache(img, host, store) {
  try {
    var c = document.createElement("canvas");
    c.width = 16;
    c.height = 16;
    var ctx = c.getContext("2d");
    ctx.drawImage(img, 0, 0, 16, 16);
    var dataUrl = c.toDataURL("image/png");
    if (dataUrl && dataUrl.length < 8000) { /* only cache small icons */
      Hub.cache.set("fav::" + host, dataUrl, "favicon", store);
    }
  } catch (_) { /* CORS — can't cache cross-origin, that's fine */ }
}

Hub.createLink = function (className, href, title) {
  var a = document.createElement("a");
  a.className = className;
  a.href = href;
  a.target = "_self";
  a.rel = "noreferrer";
  a.dataset.focusable = "true";
  a.dataset.title = title;
  return a;
};

Hub.formatNumber = function (value) {
  if (!Number.isFinite(value)) return "--";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: value >= 1000 ? 2 : 4 }).format(value);
};

Hub.formatPercent = function (value) {
  if (!Number.isFinite(value)) return "--";
  return (value >= 0 ? "+" : "") + value.toFixed(2) + "%";
};

Hub.formatDate = function (dateString) {
  if (!dateString) return "";
  var d = new Date(dateString);
  if (Number.isNaN(d.valueOf())) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
};

Hub.injectStyles = function (id, css) {
  if (document.getElementById(id)) return;
  var el = document.createElement("style");
  el.id = id;
  el.textContent = css;
  document.head.appendChild(el);
};

Hub.fetchWithTimeout = async function (url, options, timeoutMs) {
  var controller = new AbortController();
  var timer = setTimeout(function () { controller.abort(); }, timeoutMs);
  try {
    return await fetch(url, Object.assign({}, options, { signal: controller.signal, cache: "no-store" }));
  } finally {
    clearTimeout(timer);
  }
};
