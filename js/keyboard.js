/* ── Keyboard navigation ── */

window.Hub = window.Hub || {};

Hub.keyboard = (function () {
  var focusIndex = -1;

  function focusables() {
    return Array.from(document.querySelectorAll('[data-focusable="true"]')).filter(function (n) { return n.offsetParent !== null; });
  }

  function rectCenter(r) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }

  function overlap1d(a0, a1, b0, b1) { return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0)); }

  function score(cur, rect, dir) {
    var cc = rectCenter(cur), tc = rectCenter(rect);
    var ox = overlap1d(cur.left, cur.right, rect.left, rect.right);
    var oy = overlap1d(cur.top, cur.bottom, rect.top, rect.bottom);

    if (dir === "right") {
      if (tc.x <= cc.x + 4) return null;
      return (oy > 0 ? 0 : 10000) + Math.max(0, rect.left - cur.right) * 12 + Math.abs(tc.y - cc.y);
    }
    if (dir === "left") {
      if (tc.x >= cc.x - 4) return null;
      return (oy > 0 ? 0 : 10000) + Math.max(0, cur.left - rect.right) * 12 + Math.abs(tc.y - cc.y);
    }
    if (dir === "down") {
      if (tc.y <= cc.y + 4) return null;
      return (ox > 0 ? 0 : 10000) + Math.max(0, rect.top - cur.bottom) * 12 + Math.abs(tc.x - cc.x);
    }
    if (dir === "up") {
      if (tc.y >= cc.y - 4) return null;
      return (ox > 0 ? 0 : 10000) + Math.max(0, cur.top - rect.bottom) * 12 + Math.abs(tc.x - cc.x);
    }
    return null;
  }

  function highlight(index) {
    var nodes = focusables();
    nodes.forEach(function (n) { n.classList.remove("focus-ring"); });
    if (index < 0 || index >= nodes.length) { focusIndex = -1; return; }
    focusIndex = index;
    var node = nodes[index];
    node.classList.add("focus-ring");
    /* Don't auto-focus inputs/textareas — just highlight so hjkl can keep moving.
       User presses Enter to manually activate. */
    if (node.tagName !== "INPUT" && node.tagName !== "TEXTAREA") {
      node.focus({ preventScroll: true });
    }
    node.scrollIntoView({ block: "nearest", inline: "nearest" });
  }

  function navigate(direction) {
    var nodes = focusables();
    if (!nodes.length) return;
    if (focusIndex === -1) { highlight(0); return; }
    var cur = nodes[focusIndex].getBoundingClientRect();
    var best = null;
    nodes.forEach(function (node, i) {
      if (i === focusIndex) return;
      var s = score(cur, node.getBoundingClientRect(), direction);
      if (s != null && (!best || s < best.score)) best = { index: i, score: s };
    });
    if (best) highlight(best.index);
  }

  var DIR_MAP = {
    arrowright: "right", l: "right",
    arrowleft: "left", h: "left",
    arrowdown: "down", j: "down",
    arrowup: "up", k: "up"
  };

  /* ── Widget chord shortcuts (e.g. "t2" to open item 2 in group T) ── */

  /* Ergonomic priority: home row center outward, top row, bottom row.
     Excludes keys already bound: h j k l d u z e p t y */
  var ERGO_KEYS = "fgsatrewvbcniopqyxm".split("");
  var RESERVED = { h:1, j:1, k:1, l:1, d:1, u:1, z:1, e:1, p:1, t:1, a:1, y:1 };
  var searchFocusKeys = { "/": true };

  function isReservedKey(key) {
    return !!RESERVED[key] || !!searchFocusKeys[String(key || "").toLowerCase()];
  }

  function setSearchFocusKey(key) {
    setSearchFocusKeys([key || "/"]);
  }

  function setSearchFocusKeys(keys) {
    searchFocusKeys = {};
    (keys || ["/"]).forEach(function (key) {
      key = String(key || "").toLowerCase();
      if (!key) return;
      searchFocusKeys[key] = true;
    });
    if (!Object.keys(searchFocusKeys).length) searchFocusKeys["/"] = true;
  }

  /* Home-row letters for selecting items within an active chord.
     a=1st item, s=2nd, d=3rd … up to 9 items. */
  var CHORD_ITEM_KEYS = ["a","s","d","f","g","h","j","k","l"];

  var chordState = { active: false, container: null, key: null, timer: null };
  var widgetKeyMap = {}; /* letter → { widgetEl, container, title } */

  function clearChord() {
    if (chordState.timer) clearTimeout(chordState.timer);
    if (chordState.container) chordState.container.classList.remove("chord-active");
    document.querySelectorAll(".chord-index").forEach(function (el) { el.remove(); });
    chordState = { active: false, container: null, key: null, timer: null };
  }

  function getWidgetTitle(widgetEl) {
    var h = widgetEl.querySelector("h2, h3, summary h3");
    return h ? h.textContent.trim() : "";
  }

  function getContainerFocusables(container, includeInputs) {
    return Array.from(container.querySelectorAll('[data-focusable="true"]')).filter(function (n) {
      if (n.offsetParent === null) return false;
      if (!includeInputs && (n.tagName === "INPUT" || n.tagName === "TEXTAREA")) return false;
      if (n.classList.contains("chord-key-badge")) return false;
      return true;
    });
  }

  function assignWidgetKeys() {
    widgetKeyMap = {};
    var used = {};
    var widgets = Array.from(document.querySelectorAll(".widget[data-widget-type]")).filter(function (el) {
      return el.dataset.widgetType !== "pinned-links" && el.dataset.widgetType !== "search" && el.dataset.widgetType !== "clock";
    });

    /* For widgets with details.group inside, treat each group as a separate entry */
    var entries = [];
    widgets.forEach(function (el) {
      var groups = el.querySelectorAll("details.group");
      if (groups.length) {
        groups.forEach(function (g) { entries.push({ widgetEl: el, container: g, title: g.dataset.groupTitle || "" }); });
      } else {
        entries.push({ widgetEl: el, container: el, title: getWidgetTitle(el) });
      }
    });

    entries.forEach(function (entry) {
      var title = entry.title.toLowerCase().replace(/[^a-z]/g, "");
      var assigned = null;

      /* Collect unique letters from title, sorted by ergonomic priority */
      var titleLetters = [];
      for (var i = 0; i < title.length; i++) {
        if (!titleLetters.includes(title[i])) titleLetters.push(title[i]);
      }
      titleLetters.sort(function (a, b) {
        var ai = ERGO_KEYS.indexOf(a), bi = ERGO_KEYS.indexOf(b);
        if (ai === -1) ai = 999;
        if (bi === -1) bi = 999;
        return ai - bi;
      });

      for (var j = 0; j < titleLetters.length; j++) {
        var ch = titleLetters[j];
        if (!isReservedKey(ch) && !used[ch]) { assigned = ch; break; }
      }

      /* Fallback: first available ergonomic key */
      if (!assigned) {
        for (var k = 0; k < ERGO_KEYS.length; k++) {
          if (!isReservedKey(ERGO_KEYS[k]) && !used[ERGO_KEYS[k]]) { assigned = ERGO_KEYS[k]; break; }
        }
      }

      if (assigned) {
        used[assigned] = true;
        widgetKeyMap[assigned] = { widgetEl: entry.widgetEl, container: entry.container, title: entry.title };
        entry.container.dataset.chordKey = assigned;
      }
    });

    renderKeyBadges();
  }

  function renderKeyBadges() {
    document.querySelectorAll(".chord-key-badge").forEach(function (el) { el.remove(); });
    document.querySelectorAll(".widget-refresh-btn[data-chord-key]").forEach(function (el) {
      var letter = el.querySelector(".chord-btn-letter");
      if (letter) letter.remove();
      el.removeAttribute("data-chord-key");
      el.removeAttribute("aria-keyshortcuts");
    });

    Object.keys(widgetKeyMap).forEach(function (key) {
      var entry = widgetKeyMap[key];
      var target = entry.container.querySelector(".group-toggle, .widget-header");
      if (!target) return;
      var actions = target.querySelector(".widget-header-actions");
      var refreshBtn = actions && actions.querySelector(".widget-refresh-btn");
      if (refreshBtn) {
        /* Overlay the chord letter on the button as a small badge in its corner.
           The sync icon stays visible; the letter is a separate DOM node so no
           pseudo-element hacks are needed. */
        refreshBtn.setAttribute("data-chord-key", key.toUpperCase());
        refreshBtn.setAttribute("aria-keyshortcuts", key);
        var letter = document.createElement("span");
        letter.className = "chord-btn-letter";
        letter.setAttribute("aria-hidden", "true");
        letter.textContent = key.toUpperCase();
        refreshBtn.appendChild(letter);
        return;
      }
      var badge = document.createElement("span");
      badge.className = "chord-key-badge";
      badge.textContent = key.toUpperCase();
      (actions || target).appendChild(badge);
    });
  }

  function isTodoWidget(entry) {
    return entry.widgetEl && entry.widgetEl.dataset.widgetType === "todo";
  }

  function enterChord(key) {
    var entry = widgetKeyMap[key];
    if (!entry) return false;

    clearChord();
    chordState.active = true;
    chordState.key = key;
    chordState.container = entry.container;
    chordState.isTodo = isTodoWidget(entry);

    entry.container.classList.add("chord-active");
    entry.container.scrollIntoView({ block: "nearest", behavior: "smooth" });

    /* If group is collapsed, open it */
    if (entry.container.tagName === "DETAILS" && !entry.container.open) {
      entry.container.open = true;
    }

    /* Show home-row letter indices on all focusable items including the refresh button */
    var items = getContainerFocusables(entry.container, chordState.isTodo);
    items.forEach(function (item, i) {
      if (i >= CHORD_ITEM_KEYS.length) return;
      var idx = document.createElement("span");
      idx.className = "chord-index";
      idx.textContent = CHORD_ITEM_KEYS[i];
      if (item.tagName === "INPUT" || item.tagName === "TEXTAREA") {
        idx.classList.add("chord-index-input");
        item.parentNode.insertBefore(idx, item.nextSibling);
      } else {
        item.appendChild(idx);
      }
    });

    /* Move focus-ring to the first non-refresh-button content item */
    var nodes = focusables();
    var firstContent = items.find(function (n) { return !n.dataset.chordKey; });
    var firstItemIdx = firstContent ? nodes.indexOf(firstContent) : (items.length ? nodes.indexOf(items[0]) : -1);
    if (firstItemIdx !== -1) highlight(firstItemIdx);
    chordState.timer = setTimeout(clearChord, 1500);
    return true;
  }

  function handleChordNumber(num, metaKey) {
    if (!chordState.active) return false;
    var entry = widgetKeyMap[chordState.key];
    if (!entry) { clearChord(); return false; }

    var items = getContainerFocusables(entry.container, chordState.isTodo);
    var idx = num - 1;
    if (idx >= 0 && idx < items.length) {
      var el = items[idx];
      if (el.href) Hub.openItem(el.href, metaKey);
      else if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") el.focus();
      else el.click();
    }
    clearChord();
    return true;
  }

  function bind(getState) {
    document.addEventListener("keydown", function (e) {
      var key = e.key.toLowerCase();
      var tag = document.activeElement?.tagName;
      var typing = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if (document.querySelector(".customize-dialog[open]")) return;
      if (document.querySelector(".help-dialog[open]")) {
        if (key === "escape") document.querySelector(".help-dialog[open]").close();
        return;
      }
      /* Let theme sidebar handle its own keyboard events; only allow T toggle through (when not typing) */
      var themeSidebarOpen = document.querySelector(".theme-sidebar.is-open");
      if (themeSidebarOpen && !(key === "t" && !typing)) return;

      /* Config sidebar (EditorKeyboard) owns all keys when it has focus */
      var configSidebarEl = document.querySelector(".config-sidebar.is-open");
      if (configSidebarEl && configSidebarEl.contains(document.activeElement)) return;

      if ((e.metaKey || e.ctrlKey) && key === "l") return;
      if ((e.metaKey || e.ctrlKey) && key === "k") {
        e.preventDefault();
        Hub.focusSearch();
        return;
      }

      /* Ctrl/Cmd+S: save layout in edit mode */
      if ((e.metaKey || e.ctrlKey) && key === "s") {
        if (Hub.grid.isEditing()) {
          e.preventDefault();
          if (Hub.editMode) Hub.editMode.save();
          return;
        }
      }

      if (!typing && !Hub.grid.isEditing() && searchFocusKeys[key] && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); Hub.focusSearch(key); return; }

      if (!typing && key === "?") { e.preventDefault(); Hub.help.show(); return; }
      if (!typing && key === "z" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (e.shiftKey) { Hub.zen.toggleLock(); } else { Hub.zen.toggle(); Hub.zen.updateButtonIcon(); }
        return;
      }

      /* P / Shift+P: cycle profiles */
      if (!typing && (key === "p") && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (document.querySelector(".modal-overlay") || document.querySelector(".theme-sidebar.is-open")) return;
        e.preventDefault();
        if (Hub.cycleProfile) Hub.cycleProfile(e.shiftKey ? -1 : 1);
        return;
      }

      /* T: open theme sidebar */
      if (!typing && key === "t" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (document.querySelector(".modal-overlay") || Hub.grid.isEditing()) return;
        e.preventDefault();
        var sidebar = document.querySelector(".theme-sidebar");
        if (sidebar && sidebar.classList.contains("is-open")) {
          Hub.customize.closeThemeSidebar();
        } else {
          if (Hub.openTheme) Hub.openTheme();
        }
        return;
      }

      /* E: toggle edit mode */
      if (!typing && key === "e" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        if (document.querySelector(".modal-overlay")) return;
        e.preventDefault();
        if (Hub.grid.isEditing()) {
          if (Hub.editMode) Hub.editMode.save();
        } else {
          if (Hub.editMode) Hub.editMode.enter();
        }
        return;
      }

      /* A: add widget (only in edit mode) */
      if (!typing && key === "a" && !e.metaKey && !e.ctrlKey && !e.altKey && Hub.grid.isEditing()) {
        if (document.querySelector(".modal-overlay")) return;
        e.preventDefault();
        if (Hub.editMode) Hub.editMode.addWidget();
        return;
      }

      /* Edit mode keyboard controls: arrows move, shift+arrows resize, Enter/C config, Space grab */
      if (!typing && Hub.grid.isEditing() && !document.querySelector(".modal-overlay")) {
        if (Hub.grid.handleEditKey(e)) return;
      }

      /* Y / Shift+Y: pull / push WebDAV sync */
      if (!typing && key === "y" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        if (e.shiftKey) {
          if (Hub.syncStatus) Hub.syncStatus.confirmPush();
        } else {
          if (Hub.syncStatus) Hub.syncStatus.pull();
        }
        return;
      }

      /* Chord mode: item selection or escape while chord is active */
      if (!typing && chordState.active) {
        if (key === "escape") { e.preventDefault(); clearChord(); return; }

        /* Directional keys exit chord and continue with spatial nav */
        if (DIR_MAP[key]) { e.preventDefault(); clearChord(); navigate(DIR_MAP[key]); return; }

        /* Number keys (legacy + todo input via 0) */
        if (/^[0-9]$/.test(e.key)) {
          e.preventDefault();
          handleChordNumber(Number(e.key), e.metaKey || e.ctrlKey);
          return;
        }

        /* Home-row letter keys: a=1, s=2, d=3 … */
        var chordLetterIdx = CHORD_ITEM_KEYS.indexOf(key);
        if (chordLetterIdx !== -1) {
          e.preventDefault();
          handleChordNumber(chordLetterIdx + 1, e.metaKey || e.ctrlKey);
          return;
        }

        /* Another widget chord key → switch to that chord */
        if (!e.metaKey && !e.ctrlKey && !e.altKey && widgetKeyMap[key]) {
          clearChord();
          /* fall through to chord activation below */
        } else {
          /* Suppress everything else — no bleed-through while chord is active */
          e.preventDefault();
          clearChord();
          return;
        }
      }

      if (!typing && !e.metaKey && !e.ctrlKey && /^[1-9]$/.test(e.key)) {
        var st = getState();
        var item = st.pinned[Number(e.key) - 1];
        if (item) { e.preventDefault(); Hub.openItem(item.href, false); }
        return;
      }

      if (typing) return;

      /* Skip chord and spatial nav when in edit mode (handled above) */
      if (Hub.grid.isEditing()) return;

      /* Chord mode: letter press to enter chord (skip if modifier held) */
      if (!e.metaKey && !e.ctrlKey && !e.altKey && widgetKeyMap[key]) {
        e.preventDefault();
        enterChord(key);
        return;
      }

      if (DIR_MAP[key]) { e.preventDefault(); navigate(DIR_MAP[key]); return; }
      if (key === "d") { e.preventDefault(); window.scrollBy({ top: Math.round(window.innerHeight * 0.6), behavior: "smooth" }); return; }
      if (key === "u") { e.preventDefault(); window.scrollBy({ top: -Math.round(window.innerHeight * 0.6), behavior: "smooth" }); return; }
      if (key === "enter") {
        var nodes = focusables();
        var active = nodes[focusIndex];
        if (!active) return;
        if (active.href) { e.preventDefault(); Hub.openItem(active.href, e.metaKey || e.ctrlKey); }
        else if (active.tagName === "INPUT" || active.tagName === "TEXTAREA") { e.preventDefault(); active.focus(); }
      }
    });
  }

  function spatialMove(candidates, currentEl, dir) {
    if (!currentEl || !candidates.length) return null;
    var cur = currentEl.getBoundingClientRect();
    var best = null;
    candidates.forEach(function (el) {
      if (el === currentEl) return;
      var s = score(cur, el.getBoundingClientRect(), dir);
      if (s != null && (!best || s < best.score)) best = { el: el, score: s };
    });
    return best ? best.el : null;
  }

  return {
    bind: bind,
    highlight: highlight,
    navigate: navigate,
    getFocusIndex: function () { return focusIndex; },
    assignWidgetKeys: assignWidgetKeys,
    clearChord: clearChord,
    setSearchFocusKey: setSearchFocusKey,
    setSearchFocusKeys: setSearchFocusKeys,
    isReservedKey: isReservedKey,
    getWidgetKeyMap: function () { return widgetKeyMap; },
    ERGO_KEYS: ERGO_KEYS,
    RESERVED: RESERVED,
    spatialMove: spatialMove
  };
})();
