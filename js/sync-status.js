/* js/sync-status.js — Sync badge + toast notifications
   Sets Hub.syncStatus */

window.Hub = window.Hub || {};

Hub.syncStatus = (function () {

  /* ── Inline SVGs ── */

  var CLOUD_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/></svg>';
  var SPIN_SVG  = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="sync-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>';
  var ALERT_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>';

  /* ── State ── */

  var badge = null;
  var toastContainer = null;
  var pendingToast = null; /* "pull" | "push" | null */

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

  /* ── Badge rendering ── */

  function renderBadge(storage) {
    if (!badge) return;

    var url    = storage["new-tab-webdav-url"];
    var status = storage["new-tab-sync-status"] || "idle";
    var last   = storage["new-tab-sync-last"] || null;
    var error  = storage["new-tab-sync-error"] || null;

    /* Hide badge when no WebDAV URL is configured */
    if (!url) {
      badge.classList.add("hidden");
      return;
    }

    badge.classList.remove("hidden");

    if (status === "syncing") {
      badge.innerHTML = SPIN_SVG;
      badge.title = "Syncing\u2026";
    } else if (status === "error") {
      badge.innerHTML = ALERT_SVG + ' <span class="sync-badge-label">Sync error</span>';
      badge.title = error || "Unknown error";
    } else {
      /* idle (default) */
      var rel = relativeTime(last);
      badge.innerHTML = CLOUD_SVG + ' <span class="sync-badge-label">' + Hub.escapeHtml(rel) + '</span>';
      if (last) {
        badge.title = "Last synced: " + new Date(last).toLocaleString();
      } else {
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
      toast.addEventListener("transitionend", function () {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, { once: true });
    }, 3000);
  }

  function showConfirmToast(onConfirm) {
    if (!toastContainer) return;

    var toast = document.createElement("div");
    toast.className = "sync-toast is-confirm";

    var msg = document.createElement("span");
    msg.textContent = "Push to WebDAV?";

    var yesBtn = document.createElement("button");
    yesBtn.type = "button";
    yesBtn.className = "sync-toast-btn sync-toast-yes";
    yesBtn.textContent = "Yes";

    var noBtn = document.createElement("button");
    noBtn.type = "button";
    noBtn.className = "sync-toast-btn sync-toast-no";
    noBtn.textContent = "No";

    toast.appendChild(msg);
    toast.appendChild(yesBtn);
    toast.appendChild(noBtn);
    toastContainer.appendChild(toast);

    function remove() {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }

    yesBtn.addEventListener("click", function () {
      remove();
      onConfirm();
    });

    noBtn.addEventListener("click", function () {
      remove();
    });
  }

  /* ── Storage helpers ── */

  function storageGet(keys) {
    return new Promise(function (resolve) {
      chrome.storage.local.get(keys, function (r) { resolve(r || {}); });
    });
  }

  /* ── Storage change listener ── */

  function onStorageChanged(changes, area) {
    if (area !== "local") return;

    var relevant = ["new-tab-sync-status", "new-tab-sync-last", "new-tab-sync-error", "new-tab-webdav-url"];
    var hasRelevant = relevant.some(function (k) { return k in changes; });
    if (!hasRelevant) return;

    storageGet(["new-tab-webdav-url", "new-tab-sync-status", "new-tab-sync-last", "new-tab-sync-error"])
      .then(function (storage) {
        renderBadge(storage);

        /* Toast feedback for keyboard-triggered syncs */
        if (!pendingToast) return;

        var status = storage["new-tab-sync-status"] || "idle";
        var errMsg = storage["new-tab-sync-error"] || "Unknown error";

        /* Only fire toast when sync has settled (idle or error) */
        if (status === "idle") {
          var kind = pendingToast;
          pendingToast = null;
          showToast(kind === "pull" ? "Pulled" : "Pushed");
        } else if (status === "error") {
          var kind = pendingToast;
          pendingToast = null;
          showToast(kind === "pull" ? "Pull failed: " + errMsg : "Push failed: " + errMsg);
        }
      });
  }

  /* ── Public API ── */

  function init() {
    /* Create badge */
    badge = document.createElement("div");
    badge.className = "sync-badge hidden";
    document.body.appendChild(badge);

    /* Create toast container */
    toastContainer = document.createElement("div");
    toastContainer.className = "sync-toast-container";
    document.body.appendChild(toastContainer);

    /* Read initial storage and render */
    storageGet(["new-tab-webdav-url", "new-tab-sync-status", "new-tab-sync-last", "new-tab-sync-error"])
      .then(function (storage) {
        renderBadge(storage);
      });

    /* Refresh relative timestamp every 30 seconds */
    setInterval(function () {
      storageGet(["new-tab-webdav-url", "new-tab-sync-status", "new-tab-sync-last", "new-tab-sync-error"])
        .then(function (storage) {
          renderBadge(storage);
        });
    }, 30000);

    /* Listen for storage changes */
    chrome.storage.onChanged.addListener(onStorageChanged);
  }

  function pull() {
    storageGet(["new-tab-webdav-url", "new-tab-sync-status"]).then(function (storage) {
      var url    = storage["new-tab-webdav-url"];
      var status = storage["new-tab-sync-status"];
      if (!url) return;
      if (status === "syncing") return;
      pendingToast = "pull";
      chrome.runtime.sendMessage({ action: "syncDownload" });
    });
  }

  function confirmPush() {
    storageGet(["new-tab-webdav-url", "new-tab-sync-status"]).then(function (storage) {
      var url    = storage["new-tab-webdav-url"];
      var status = storage["new-tab-sync-status"];
      if (!url) return;
      if (status === "syncing") return;
      showConfirmToast(function () {
        pendingToast = "push";
        chrome.runtime.sendMessage({ action: "syncUpload" });
      });
    });
  }

  return {
    init: init,
    pull: pull,
    confirmPush: confirmPush
  };

}());
