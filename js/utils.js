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

/* ── Custom select component ──────────────────────────────────────────────────
   Replaces native <select> in widget editors with a keyboard-navigable dropdown.
   EditorKeyboard picks up the trigger button (data-custom-select) as a flat field.

   Usage:
     var field = Hub.createCustomSelect("Label", options, currentValue, onChange);
     container.appendChild(field);

   options:  [{value, label}, ...]
   onChange: function(newValue)
   Returns:  div.editor-field
── */
Hub.createCustomSelect = function (labelText, options, currentValue, onChange) {
  var current = currentValue;

  /* Wrapper styled as a regular editor field row */
  var wrap = document.createElement("div");
  wrap.className = "editor-field";

  var labelEl = document.createElement("span");
  labelEl.textContent = labelText;
  wrap.appendChild(labelEl);

  /* Inner container so the dropdown is positioned relative to the button */
  var inner = document.createElement("div");
  inner.className = "custom-select-wrap";
  wrap.appendChild(inner);

  /* Trigger button — included in EditorKeyboard flatFields via data-custom-select */
  var btn = document.createElement("button");
  btn.type = "button";
  btn.className = "custom-select-btn";
  btn.dataset.customSelect = "";

  var chevron = document.createElement("span");
  chevron.className = "custom-select-chevron";
  chevron.innerHTML = Hub.icons ? Hub.icons.chevronDown : "▾";

  var dropdown = document.createElement("div");
  dropdown.className = "custom-select-dropdown";

  var focusedIdx = -1;
  var isOpen = false;

  function getLabel(val) {
    for (var i = 0; i < options.length; i++) {
      if (options[i].value === val) return options[i].label;
    }
    return val;
  }

  function updateBtn() {
    btn.textContent = getLabel(current);
    btn.appendChild(chevron);
    btn.classList.toggle("is-open", isOpen);
  }

  function getOptionEls() {
    return Array.from(dropdown.querySelectorAll(".custom-select-option"));
  }

  function highlightOption(idx) {
    var els = getOptionEls();
    els.forEach(function (el) { el.classList.remove("is-focused"); });
    focusedIdx = Math.max(0, Math.min(els.length - 1, idx));
    if (els[focusedIdx]) els[focusedIdx].scrollIntoView({ block: "nearest" });
    if (els[focusedIdx]) els[focusedIdx].classList.add("is-focused");
  }

  function renderOptions() {
    dropdown.replaceChildren();
    focusedIdx = -1;
    options.forEach(function (opt, i) {
      var el = document.createElement("button");
      el.type = "button";
      el.className = "custom-select-option" + (opt.value === current ? " is-selected" : "");
      el.textContent = opt.label;
      if (opt.value === current) focusedIdx = i;
      el.addEventListener("mousedown", function (e) {
        e.preventDefault(); /* keep focus on btn */
      });
      el.addEventListener("click", function () {
        current = opt.value;
        onChange(current);
        close();
        /* Tell EditorKeyboard a selection was made — return to normal mode */
        btn.dispatchEvent(new CustomEvent("custom-select-picked", { bubbles: true }));
      });
      dropdown.appendChild(el);
    });
  }

  function open() {
    isOpen = true;
    renderOptions();
    dropdown.classList.add("is-open");
    updateBtn();
    /* Scroll focused option into view */
    var els = getOptionEls();
    if (focusedIdx >= 0 && els[focusedIdx]) els[focusedIdx].scrollIntoView({ block: "nearest" });
    if (els[focusedIdx]) els[focusedIdx].classList.add("is-focused");
  }

  function close() {
    isOpen = false;
    dropdown.classList.remove("is-open");
    updateBtn();
    btn.focus();
  }

  /* ── Button keyboard handling ── */
  btn.addEventListener("keydown", function (e) {
    /* When dropdown is closed: open on Enter, Space, or arrow keys */
    if (!isOpen) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault(); e.stopPropagation();
        open();
        if (e.key === "ArrowDown" || e.key === "j") highlightOption((focusedIdx >= 0 ? focusedIdx : -1) + 1);
        return;
      }
      if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault(); e.stopPropagation();
        open();
        if (focusedIdx > 0) highlightOption(focusedIdx - 1);
        return;
      }
      return; /* all other keys (including Escape) propagate normally */
    }

    /* When dropdown is open: navigate and confirm */
    if (e.key === "j" || e.key === "ArrowDown") {
      e.preventDefault(); e.stopPropagation();
      highlightOption(focusedIdx + 1);
      return;
    }
    if (e.key === "k" || e.key === "ArrowUp") {
      e.preventDefault(); e.stopPropagation();
      highlightOption(focusedIdx - 1);
      return;
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault(); e.stopPropagation();
      var els = getOptionEls();
      if (focusedIdx >= 0 && els[focusedIdx]) els[focusedIdx].click();
      return;
    }
    if (e.key === "Escape") {
      /* Close dropdown only — do NOT let onEditEscape or EditorKeyboard see this */
      e.preventDefault(); e.stopPropagation();
      close();
      return;
    }
  });

  btn.addEventListener("click", function (e) {
    e.stopPropagation();
    if (isOpen) close(); else open();
  });

  /* Close when clicking outside */
  var onDocClick = function (e) {
    if (!inner.contains(e.target) && isOpen) close();
    if (!document.body.contains(inner)) document.removeEventListener("click", onDocClick);
  };
  document.addEventListener("click", onDocClick);

  updateBtn();
  inner.appendChild(btn);
  inner.appendChild(dropdown);

  return wrap;
};
