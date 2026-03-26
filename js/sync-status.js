/* js/sync-status.js — Sync badge + toast notifications
   Sets Hub.syncStatus */

window.Hub = window.Hub || {};

Hub.syncStatus = (function () {

  /* ── Inline SVGs ── */

  var CLOUD_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/></svg>';
  var SPIN_SVG  = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="sync-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';
  var ALERT_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';
  var CONFLICT_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M16 3h3a2 2 0 0 1 2 2v3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/><path d="M8 21H5a2 2 0 0 1-2-2v-3"/><path d="M9 9l6 6"/><path d="M15 9l-6 6"/></svg>';

  /* ── State ── */

  var badge = null;
  var toastContainer = null;
  var pendingToast = null; /* "pull" | "push" | null */
  var currentData = {};

  /* ── Relative time helper ── */

  function relativeTime(iso) {
    if (!iso) return "Never synced";
    var diff = Math.floor((Date.now() - new Date(iso)) / 1000);
    if (diff < 10) return "Just now";
    if (diff < 60) return diff + "s ago";
    if (diff < 3600) return Math.floor(diff / 60) + "m ago";
    if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
    return Math.floor(diff / 86400) + "d ago";
  }

  function getDerivedConflictMessage(remoteUpdate, dirty) {
    if (!remoteUpdate || !dirty) return "";
    return "Cloud config changed while this device still has unsynced local edits. Resolve the conflict in the sync popup";
  }

  function isDisconnectedError(error) {
    var text = String(error || "").toLowerCase();
    return !!text && text !== "invalid credentials";
  }

  /* ── Badge rendering ── */

  function renderBadge(storage) {
    if (!badge) return;

    var url    = storage["new-tab-webdav-url"];
    var status = storage["new-tab-sync-status"] || "idle";
    var last   = storage["new-tab-sync-last"] || null;
    var error  = storage["new-tab-sync-error"] || null;
    var dirty  = !!storage["new-tab-sync-dirty"];
    var remoteUpdate = !!storage["new-tab-sync-remote-update-available"];
    var derivedConflict = getDerivedConflictMessage(remoteUpdate, dirty);

    /* Hide badge when no WebDAV URL is configured */
    if (!url) {
      badge.classList.add("hidden");
      return;
    }

    badge.classList.remove("hidden");

    var iconEl  = badge.querySelector(".sync-badge-icon");
    var labelEl = badge.querySelector(".sync-badge-label");

    if (status === "syncing") {
      badge.classList.remove("is-error");
      badge.classList.remove("is-conflict");
      iconEl.innerHTML = SPIN_SVG;
      labelEl.textContent = "";
      badge.title = "Syncing\u2026";
    } else if (status === "error") {
      badge.classList.add("is-error");
      badge.classList.remove("is-conflict");
      iconEl.innerHTML = ALERT_SVG;
      labelEl.textContent = isDisconnectedError(error) ? "Disconnected" : "Sync error";
      badge.title = error || "Unknown error";
    } else if (status === "conflict") {
      if (derivedConflict) {
        badge.classList.remove("is-error");
        badge.classList.add("is-conflict");
        iconEl.innerHTML = CONFLICT_SVG;
        labelEl.textContent = "Conflict";
        badge.title = error || derivedConflict;
      } else {
        badge.classList.add("is-error");
        badge.classList.remove("is-conflict");
        iconEl.innerHTML = ALERT_SVG;
        labelEl.textContent = "Upload blocked";
        badge.title = error || "Your local changes are preserved on this device";
      }
    } else {
      badge.classList.remove("is-error");
      badge.classList.remove("is-conflict");
      /* idle (default) */
      iconEl.innerHTML = CLOUD_SVG;
      if (derivedConflict) {
        labelEl.textContent = "Conflict";
        badge.title = derivedConflict;
      } else if (dirty) {
        labelEl.textContent = "Local changes";
        badge.title = last
          ? "Unsynced local changes since " + new Date(last).toLocaleString()
          : "Unsynced local changes on this device";
      } else if (remoteUpdate) {
        labelEl.textContent = "Cloud newer";
        badge.title = "Cloud has a newer snapshot available to pull. Local settings stay untouched until you pull manually.";
      } else if (last) {
        labelEl.textContent = relativeTime(last);
        badge.title = "Last synced: " + new Date(last).toLocaleString();
      } else {
        labelEl.textContent = "Never synced";
        badge.title = "Never synced";
      }
    }
  }

  /* ── Toast helpers ── */

  function showToast(text) {
    if (!toastContainer) return;

    var toast = document.createElement("div");
    toast.className = "sync-toast";
    toast.textContent = text;
    toastContainer.appendChild(toast);

    /* Trigger reflow then add .is-visible to fade in */
    /* jshint ignore:start */
    void toast.offsetWidth;
    /* jshint ignore:end */
    toast.classList.add("is-visible");

    setTimeout(function () {
      toast.classList.remove("is-visible");
      function onEnd() {
        toast.removeEventListener("transitionend", onEnd);
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }
      toast.addEventListener("transitionend", onEnd);
    }, 3000);
  }

  function showConfirmToast(onConfirm, options) {
    if (!toastContainer) return;
    options = options || {};
    var allowForce = !!options.allowForce;
    var onForce = typeof options.onForce === "function" ? options.onForce : null;
    var message = options.message || (allowForce ? "Push to WebDAV? Force overwrites cloud." : "Push to WebDAV?");
    var yesLabel = options.yesLabel || "Yes [Enter]";
    var noLabel = options.noLabel || "No [Esc]";

    var toast = document.createElement("div");
    toast.className = "sync-toast is-confirm";

    var msg = document.createElement("span");
    msg.textContent = message;

    var yesBtn = document.createElement("button");
    yesBtn.type = "button";
    yesBtn.className = "sync-toast-btn sync-toast-yes";
    yesBtn.textContent = yesLabel;

    var forceBtn = null;
    if (allowForce) {
      forceBtn = document.createElement("button");
      forceBtn.type = "button";
      forceBtn.className = "sync-toast-btn sync-toast-force";
      forceBtn.textContent = "Force [F]";
    }

    var noBtn = document.createElement("button");
    noBtn.type = "button";
    noBtn.className = "sync-toast-btn sync-toast-no";
    noBtn.textContent = noLabel;

    toast.appendChild(msg);
    toast.appendChild(yesBtn);
    if (forceBtn) toast.appendChild(forceBtn);
    toast.appendChild(noBtn);
    toastContainer.appendChild(toast);

    /* Trigger reflow then fade in (mirrors showToast) */
    /* jshint ignore:start */
    void toast.offsetWidth;
    /* jshint ignore:end */
    toast.classList.add("is-visible");

    function remove() {
      document.removeEventListener("keydown", onKey);
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }

    function onKey(e) {
      if (allowForce && onForce && ((e.key === "F" || e.key === "f") || (e.key === "Enter" && e.shiftKey))) {
        e.preventDefault();
        remove();
        onForce();
      } else if (e.key === "Enter" || e.key === "y" || e.key === "Y") {
        e.preventDefault();
        remove();
        onConfirm();
      } else if (e.key === "Escape" || e.key === "n" || e.key === "N") {
        e.preventDefault();
        remove();
      }
    }

    document.addEventListener("keydown", onKey);

    yesBtn.addEventListener("click", function () {
      remove();
      onConfirm();
    });

    if (forceBtn) {
      forceBtn.addEventListener("click", function () {
        remove();
        onForce();
      });
    }

    noBtn.addEventListener("click", function () {
      remove();
    });
  }

  /* ── Storage helpers ── */

  function storageGet(keys) {
    return new Promise(function (resolve) {
      if (typeof chrome === "undefined" || !chrome.storage) { resolve({}); return; }
      chrome.storage.local.get(keys, function (r) { resolve(r || {}); });
    });
  }

  /* ── Storage change listener ── */

  var WATCH_KEYS = ["new-tab-sync-status", "new-tab-sync-last", "new-tab-sync-error", "new-tab-sync-dirty", "new-tab-sync-remote-update-available", "new-tab-webdav-url"];

  function onStorageChanged(changes, area) {
    if (area !== "local") return;
    if (!WATCH_KEYS.some(function (k) { return changes[k]; })) return;

    WATCH_KEYS.forEach(function (k) {
      if (changes[k]) currentData[k] = changes[k].newValue;
    });
    renderBadge(currentData);

    /* Toast feedback for keyboard-triggered syncs */
    if (!pendingToast) return;

    var status = currentData["new-tab-sync-status"] || "idle";
    var errMsg = currentData["new-tab-sync-error"] || "Unknown error";

    /* Only fire toast when sync has settled (idle or error) */
    var kind = "";
    if (status === "idle") {
      kind = pendingToast;
      pendingToast = null;
      showToast(kind === "pull" ? "Pulled" : "Pushed");
    } else if (status === "error") {
      kind = pendingToast;
      pendingToast = null;
      showToast(kind === "pull" ? "Pull failed: " + errMsg : "Push failed: " + errMsg);
    } else if (status === "conflict") {
      kind = pendingToast;
      pendingToast = null;
      showToast(kind === "pull" ? "Pull blocked: " + errMsg : "Push blocked: " + errMsg);
    }
  }

  /* ── Public API ── */

  function init() {
    /* Create badge */
    badge = document.createElement("div");
    badge.className = "sync-badge hidden";
    badge.innerHTML = '<span class="sync-badge-icon"></span><span class="sync-badge-label"></span>';
    document.body.appendChild(badge);

    /* Create toast container */
    toastContainer = document.createElement("div");
    toastContainer.className = "sync-toast-container";
    document.body.appendChild(toastContainer);

    /* Read initial storage and render */
    storageGet(["new-tab-webdav-url", "new-tab-sync-status", "new-tab-sync-last", "new-tab-sync-error", "new-tab-sync-dirty", "new-tab-sync-remote-update-available"])
      .then(function (storage) {
        currentData = storage;
        renderBadge(currentData);
      });

    /* Refresh relative timestamp every 30 seconds */
    setInterval(function () {
      renderBadge(currentData);
    }, 30000);

    /* Listen for storage changes */
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(onStorageChanged);
    }
  }

  function pull() {
    if (!currentData["new-tab-webdav-url"]) return;
    if (currentData["new-tab-sync-status"] === "syncing") return;
    showConfirmToast(function () {
      pendingToast = "pull";
      if (typeof chrome !== "undefined" && chrome.runtime) {
        chrome.runtime.sendMessage({ action: "syncDownload" });
      }
    }, {
      message: "Pull from cloud? This saves a local backup first, replaces this device, and lets you undo the pull later.",
      yesLabel: "Pull [Enter]"
    });
  }

  function confirmPush() {
    if (!currentData["new-tab-webdav-url"]) return;
    if (currentData["new-tab-sync-status"] === "syncing") return;
    var allowForce = currentData["new-tab-sync-status"] === "conflict";
    showConfirmToast(function () {
      pendingToast = "push";
      if (typeof chrome !== "undefined" && chrome.runtime) {
        chrome.runtime.sendMessage({ action: "syncUpload" });
      }
    }, allowForce ? {
      allowForce: true,
      onForce: function () {
        pendingToast = "push";
        if (typeof chrome !== "undefined" && chrome.runtime) {
          chrome.runtime.sendMessage({ action: "syncUploadForce" });
        }
      }
    } : null);
  }

  return {
    init: init,
    pull: pull,
    confirmPush: confirmPush
  };

}());
