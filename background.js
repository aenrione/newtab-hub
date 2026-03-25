/* background.js — MV3 Service Worker for WebDAV sync */

importScripts("js/webdav.js");

/* ── Constants ── */

var SYNC_TRIGGER_SKIP = {
  "new-tab-webdav-url": 1,
  "new-tab-webdav-username": 1,
  "new-tab-webdav-password": 1,
  "new-tab-sync-status": 1,
  "new-tab-sync-last": 1,
  "new-tab-sync-error": 1,
  "new-tab-sync-auth-failed": 1,
  "new-tab-sync-pending": 1,
  "new-tab-sync-remote-etag": 1,
  "new-tab-sync-dirty": 1,
  "new-tab-sync-local-backups": 1
};

var SYNC_ETAG_KEY = "new-tab-sync-remote-etag";
var SYNC_DIRTY_KEY = "new-tab-sync-dirty";
var SYNC_BACKUPS_KEY = "new-tab-sync-local-backups";
var MAX_LOCAL_BACKUPS = 5;

var PAYLOAD_SKIP_EXACT = {
  "new-tab-cache": 1,
  "new-tab-v2-migrated": 1
};

function isPayloadKey(k) {
  if (PAYLOAD_SKIP_EXACT[k]) return false;
  if (k.startsWith("new-tab-webdav-")) return false;
  if (k.startsWith("new-tab-sync-")) return false;
  if (k.startsWith("new-tab-creds-")) return false;
  return true;
}

/* ── Storage helpers ── */

function storageGet(key) {
  return new Promise(function (resolve) {
    chrome.storage.local.get([key], function (r) { resolve(r ? r[key] : undefined); });
  });
}

function storageSet(obj) {
  return new Promise(function (resolve) {
    chrome.storage.local.set(obj, resolve);
  });
}

function storageRemove(keys) {
  return new Promise(function (resolve) {
    chrome.storage.local.remove(keys, resolve);
  });
}

function storageGetAll() {
  return new Promise(function (resolve) {
    chrome.storage.local.get(null, function (r) { resolve(r || {}); });
  });
}

async function setConflict(message) {
  await storageSet({
    "new-tab-sync-status": "conflict",
    "new-tab-sync-error": message,
    "new-tab-sync-pending": false
  });
}

async function saveLocalBackup(reason) {
  var all = await storageGetAll();
  var backups = await storageGet(SYNC_BACKUPS_KEY) || [];
  backups.unshift({
    id: String(Date.now()) + "-" + Math.random().toString(36).slice(2, 8),
    createdAt: new Date().toISOString(),
    reason: reason || "before-download",
    payload: buildPayload(all)
  });
  if (backups.length > MAX_LOCAL_BACKUPS) backups = backups.slice(0, MAX_LOCAL_BACKUPS);
  await storageSet((function () {
    var update = {};
    update[SYNC_BACKUPS_KEY] = backups;
    return update;
  }()));
}

function mergeObjectEntries(localValue, remoteValue) {
  if (!remoteValue || typeof remoteValue !== "object" || Array.isArray(remoteValue)) return remoteValue;
  if (!localValue || typeof localValue !== "object" || Array.isArray(localValue)) return remoteValue;
  return Object.assign({}, localValue, remoteValue);
}

async function applyLocalPayload(payload, options) {
  options = options || {};
  var markDirty = !!options.markDirty;
  var clearRemoteBase = !!options.clearRemoteBase;
  var preserveLocalEntries = options.preserveLocalEntries !== false;
  var all = await storageGetAll();
  var incoming = payload && payload.data;
  if (!incoming || typeof incoming !== "object") throw new Error("Backup payload is invalid");

  var toWrite = {};
  Object.keys(incoming).forEach(function (k) {
    if (!k.startsWith("new-tab-") || !isPayloadKey(k)) return;
    toWrite[k] = incoming[k];
  });

  var objectMergeKeys = [
    "new-tab-bg-image",
    "new-tab-collapsed-groups",
    "new-tab-color-scheme",
    "new-tab-style-overrides",
    "new-tab-zen-settings"
  ];
  objectMergeKeys.forEach(function (key) {
    if (preserveLocalEntries && toWrite[key] && all[key]) {
      toWrite[key] = mergeObjectEntries(all[key], toWrite[key]);
    }
  });

  if (preserveLocalEntries && toWrite["new-tab-profiles"]) {
    var localProfiles = all["new-tab-profiles"] || {};
    var remoteProfiles = toWrite["new-tab-profiles"];
    var mergedProfiles = Object.assign({}, localProfiles);
    Object.keys(remoteProfiles).forEach(function (id) {
      if (!mergedProfiles[id]) {
        mergedProfiles[id] = remoteProfiles[id];
      } else {
        var localTime  = mergedProfiles[id]._savedAt || 0;
        var remoteTime = remoteProfiles[id]._savedAt || 0;
        if (remoteTime > localTime) mergedProfiles[id] = remoteProfiles[id];
      }
    });
    toWrite["new-tab-profiles"] = mergedProfiles;
  }

  if (preserveLocalEntries && toWrite["new-tab-profile-overrides"]) {
    var localOverrides = all["new-tab-profile-overrides"] || {};
    var remoteOverrides = toWrite["new-tab-profile-overrides"];
    var mergedOverrides = Object.assign({}, localOverrides);
    Object.keys(remoteOverrides).forEach(function (id) {
      if (!mergedOverrides[id]) {
        mergedOverrides[id] = remoteOverrides[id];
      } else {
        var localOvTime  = mergedOverrides[id]._savedAt || 0;
        var remoteOvTime = remoteOverrides[id]._savedAt || 0;
        if (remoteOvTime > localOvTime) mergedOverrides[id] = remoteOverrides[id];
      }
    });
    toWrite["new-tab-profile-overrides"] = mergedOverrides;
  }

  if (Object.keys(toWrite).length === 0) throw new Error("Backup payload was empty after filtering");

  toWrite["new-tab-sync-status"] = "idle";
  toWrite["new-tab-sync-error"] = null;
  toWrite["new-tab-sync-pending"] = false;
  toWrite["new-tab-sync-auth-failed"] = false;
  toWrite[SYNC_DIRTY_KEY] = markDirty;
  if (!markDirty) toWrite["new-tab-sync-last"] = new Date().toISOString();

  var removable = Object.keys(all).filter(function (k) { return k.startsWith("new-tab-") && isPayloadKey(k) && !Object.prototype.hasOwnProperty.call(toWrite, k); });
  isSuppressingUpload = true;
  if (removable.length) await storageRemove(removable);
  if (clearRemoteBase) await storageRemove([SYNC_ETAG_KEY]);
  await storageSet(toWrite);
  setTimeout(function () { isSuppressingUpload = false; }, 0);
}

/* ── Payload builder ── */

function buildPayload(all) {
  var data = {};
  Object.keys(all).forEach(function (k) {
    if (k.startsWith("new-tab-") && isPayloadKey(k)) {
      data[k] = all[k];
    }
  });

  /* Sanitize video backgrounds — strip non-http video srcs (blob:, data:) per profile */
  var bgKey = "new-tab-bg-image";
  var bgAll = data[bgKey];
  if (bgAll && typeof bgAll === "object" && bgAll.src === undefined) {
    var bgSanitized = {};
    Object.keys(bgAll).forEach(function (p) {
      var bg = bgAll[p];
      if (bg && bg.src && bg.type === "video" && !bg.src.startsWith("http")) {
        bgSanitized[p] = Object.assign({}, bg, { src: null });
      } else {
        bgSanitized[p] = bg;
      }
    });
    data[bgKey] = bgSanitized;
  }

  return { version: 1, exportedAt: new Date().toISOString(), data: data };
}

/* ── Core upload ── */

async function doUpload(isManual, options) {
  options = options || {};
  var force = !!options.force;

  /* Clear pending flag immediately — prevents a duplicate run if both the
     setTimeout path and the alarm safety-net path somehow both fire.
     Trade-off: if the SW is killed after this line but before the upload
     completes, the alarm will find pending=false and NOT retry. That is
     intentional — the next dashboard change will schedule a fresh debounce. */
  await storageSet({ "new-tab-sync-pending": false });

  var url = await storageGet("new-tab-webdav-url");
  var username = await storageGet("new-tab-webdav-username");
  var password = await storageGet("new-tab-webdav-password");
  var baseEtag = await storageGet(SYNC_ETAG_KEY);

  if (!url || !username) return;

  var uploadOptions = {};
  if (!force) {
    var check = await webdav.check(url, username, password || "");
    if (check.status === 401) {
      await storageSet({
        "new-tab-sync-status": "error",
        "new-tab-sync-error": "Invalid credentials",
        "new-tab-sync-auth-failed": true,
        "new-tab-sync-pending": false
      });
      return;
    }
    if (check.status === 404) {
      uploadOptions.ifNoneMatch = "*";
    } else if (!check.ok) {
      await storageSet({
        "new-tab-sync-status": "error",
        "new-tab-sync-error": check.message,
        "new-tab-sync-pending": false
      });
      return;
    } else if (!check.etag) {
      await setConflict("Cloud sync needs ETag or Last-Modified support before it can safely upload");
      return;
    } else if (!baseEtag) {
      await setConflict("Cloud config already exists for this path. Download first or force an upload to replace it");
      return;
    } else if (check.etag !== baseEtag) {
      await setConflict("Cloud config changed since this device last synced. Download first or force an upload to replace it");
      return;
    } else {
      uploadOptions.ifMatch = baseEtag;
    }
  }

  await storageSet({ "new-tab-sync-status": "syncing" });

  var all = await storageGetAll();
  var payload = buildPayload(all);
  var result = await webdav.upload(url, username, password || "", payload, uploadOptions);

  if (result.ok) {
    var update = {
      "new-tab-sync-status": "idle",
      "new-tab-sync-last": new Date().toISOString(),
      "new-tab-sync-error": null,
      "new-tab-sync-pending": false,
      "new-tab-sync-dirty": false,
      "new-tab-sync-auth-failed": false
    };
    if (result.etag) update[SYNC_ETAG_KEY] = result.etag;
    await storageSet(update);
  } else if (result.status === 401) {
    await storageSet({
      "new-tab-sync-status": "error",
      "new-tab-sync-error": "Invalid credentials",
      "new-tab-sync-auth-failed": true,
      "new-tab-sync-pending": false
    });
  } else if (result.status === 412) {
    await setConflict(result.message || "Cloud config changed during upload. Download first or force an upload to replace it");
  } else {
    await storageSet({
      "new-tab-sync-status": "error",
      "new-tab-sync-error": result.message,
      "new-tab-sync-pending": false
    });
  }
}

/* ── Core download ── */

async function doDownload(options) {
  options = options || {};
  var force = !!options.force;

  /* Clear pending flag to prevent a debounced upload from overwriting data
     we're about to download from the server. */
  await storageSet({ "new-tab-sync-pending": false });

  var url = await storageGet("new-tab-webdav-url");
  var username = await storageGet("new-tab-webdav-username");
  var password = await storageGet("new-tab-webdav-password");
  var isDirty = !!(await storageGet(SYNC_DIRTY_KEY));

  if (!url || !username) return;
  if (isDirty && !force) {
    await setConflict("Local changes have not been uploaded yet. Upload first or force a download to replace local data");
    return;
  }
  if (force) await saveLocalBackup("before-download");

  await storageSet({ "new-tab-sync-status": "syncing" });
  var result = await webdav.download(url, username, password || "");

  if (!result.ok) {
    /* 401 on download also sets auth-failed — bad credentials affect both directions */
    var extra = result.status === 401 ? { "new-tab-sync-auth-failed": true } : {};
    await storageSet(Object.assign({ "new-tab-sync-status": "error", "new-tab-sync-error": result.message }, extra));
    return;
  }

  var downloaded = result.data;
  if (!downloaded || typeof downloaded.data !== "object") {
    await storageSet({ "new-tab-sync-status": "error", "new-tab-sync-error": "Downloaded file is not a valid backup" });
    return;
  }
  if (downloaded.version > 1) {
    await storageSet({ "new-tab-sync-status": "error", "new-tab-sync-error": "Config was created by a newer version and cannot be imported" });
    return;
  }

  try {
    await applyLocalPayload(downloaded, { markDirty: false, clearRemoteBase: false, preserveLocalEntries: true });
  } catch (err) {
    await storageSet({ "new-tab-sync-status": "error", "new-tab-sync-error": err.message || "Downloaded data was empty after filtering" });
    return;
  }
  if (result.etag) await storageSet((function () {
    var update = {};
    update[SYNC_ETAG_KEY] = result.etag;
    return update;
  }()));
}

/* ── Debounce ── */

var debounceTimer = null;
var isSuppressingUpload = false; /* True while writing downloaded data or a local-only profile delete — prevents onChanged from triggering a re-upload */

async function scheduleUpload() {
  var authFailed = await storageGet("new-tab-sync-auth-failed");
  if (authFailed) return;

  var status = await storageGet("new-tab-sync-status");
  if (status === "conflict") return;

  var url = await storageGet("new-tab-webdav-url");
  if (!url) return;

  /* Clear existing in-memory debounce FIRST, then mark pending, then
     create alarm — this order ensures no stale timer survives the reschedule. */
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
  }
  await storageSet({ "new-tab-sync-pending": true });

  /* 4-second debounce (in-memory, fast path) */
  debounceTimer = setTimeout(async function () {
    debounceTimer = null;
    chrome.alarms.clear("webdav-sync-pending");
    var pending = await storageGet("new-tab-sync-pending");
    if (!pending) return; /* Already handled */
    await doUpload(false);
  }, 2000);

  /* 1-minute safety net alarm — fires if SW is killed before setTimeout runs */
  chrome.alarms.create("webdav-sync-pending", { delayInMinutes: 1 });
}

/* ── Storage change listener ── */

chrome.storage.onChanged.addListener(function (changes, area) {
  if (area !== "local") return;

  /* First-time credential save: URL changed from empty to non-empty.
     Triggers an immediate upload so the user sees sync is working right away.
     Note: subsequent URL edits (old value → new value) fall through to the
     credential-change branch below, which only clears the auth-failed flag
     without triggering an upload. This asymmetry is intentional — first save
     is the only case where we can be sure the user just finished setup. */
  var urlChange = changes["new-tab-webdav-url"];
  if (urlChange && !urlChange.oldValue && urlChange.newValue) {
    doUpload(true).catch(console.error);
    return;
  }

  /* Any other credential change: clear auth-failed flag so auto-sync resumes.
     Does NOT trigger an upload — the next dashboard edit will. */
  var credKeys = ["new-tab-webdav-url", "new-tab-webdav-username", "new-tab-webdav-password"];
  if (credKeys.some(function (k) { return changes[k]; })) {
    storageSet({ "new-tab-sync-auth-failed": false }).catch(console.error);
    return;
  }

  /* Check if any non-excluded dashboard key changed */
  if (isSuppressingUpload) return;
  var relevant = Object.keys(changes).some(function (k) {
    return k.startsWith("new-tab-") && !SYNC_TRIGGER_SKIP[k] && !k.startsWith("new-tab-sync-") && !k.startsWith("new-tab-creds-");
  });
  if (!relevant) return;

  storageSet((function () {
    var update = {};
    update[SYNC_DIRTY_KEY] = true;
    return update;
  }())).catch(console.error);
  scheduleUpload().catch(console.error);
});

/* ── Startup recovery ── */

/* If the SW was killed while a sync was in-flight, status will be stuck
   at "syncing" forever. Reset it to "error" on every SW startup so the
   popup never shows a permanent "Syncing…" spinner. */
(async function recoverStaleSyncing() {
  var status = await storageGet("new-tab-sync-status");
  if (status === "syncing") {
    await storageSet({
      "new-tab-sync-status": "error",
      "new-tab-sync-error": "Sync was interrupted (service worker restarted)"
    });
  }
}());

/* ── Alarm listener (safety net for killed SW) ── */

chrome.alarms.onAlarm.addListener(async function (alarm) {
  if (alarm.name !== "webdav-sync-pending") return;
  /* Cancel the in-memory debounce timer if SW is still alive */
  if (debounceTimer !== null) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  var pending = await storageGet("new-tab-sync-pending");
  if (!pending) return; /* Already completed by setTimeout path */
  await doUpload(false);
});

/* ── Auto-download on new tab open ── */

/* Called when the newtab page loads. Does a cheap HEAD check first —
   only proceeds to a full download if ETag/Last-Modified has changed
   since the last sync. Skips entirely if a local upload is pending
   (local data is newer than remote). */
async function doAutoDownload() {
  var url      = await storageGet("new-tab-webdav-url");
  var username = await storageGet("new-tab-webdav-username");
  var password = await storageGet("new-tab-webdav-password");
  var isDirty  = !!(await storageGet(SYNC_DIRTY_KEY));

  if (!url || !username) return;
  if (await storageGet("new-tab-sync-auth-failed")) return;
  if (await storageGet("new-tab-sync-pending")) return;

  var check = await webdav.check(url, username, password || "");
  if (!check.ok) return;

  var remoteEtag = check.etag;
  var storedEtag = await storageGet(SYNC_ETAG_KEY);

  /* If we have a stored ETag and it matches the remote, nothing changed */
  if (remoteEtag && remoteEtag === storedEtag) return;

  if (isDirty) {
    await setConflict("Cloud config changed while this device still has unsynced local edits. Resolve the conflict in the sync popup");
    return;
  }

  await doDownload();
}

/* ── Message listener (from popup and newtab page) ── */

chrome.runtime.onMessage.addListener(function (msg, _sender, sendResponse) {
  if (msg.action === "deleteProfileLocal") {
    /* Async handler — must return true to keep message channel open until
       sendResponse is called. The response signals main.js the write is done. */
    (async function () {
      try {
        /* Clear any pending upload so a queued alarm cannot push this deletion to remote */
        await storageSet({ "new-tab-sync-pending": false });
        if (debounceTimer !== null) { clearTimeout(debounceTimer); debounceTimer = null; }
        chrome.alarms.clear("webdav-sync-pending");

        isSuppressingUpload = true;
        var profiles = (await storageGet("new-tab-profiles")) || {};
        delete profiles[msg.id];
        await storageSet({ "new-tab-profiles": profiles });
        /* Reset flag and respond after a tick — the tick ensures onChanged has fired
           before we clear isSuppressingUpload, and the response signals main.js that
           the full operation (including flag reset) is complete. */
        setTimeout(function () { isSuppressingUpload = false; sendResponse({ received: true }); }, 0);
      } catch (err) {
        console.error(err);
        isSuppressingUpload = false;
        sendResponse({ error: err.message });
      }
    }());
    return true; /* keep channel open for async sendResponse */
  }

  sendResponse({ received: true });
  if (msg.action === "syncUpload") {
    doUpload(true).catch(console.error);
  } else if (msg.action === "syncUploadForce") {
    doUpload(true, { force: true }).catch(console.error);
  } else if (msg.action === "syncDownload") {
    doDownload().catch(console.error);
  } else if (msg.action === "syncDownloadForce") {
    doDownload({ force: true }).catch(console.error);
  } else if (msg.action === "restoreLocalBackup") {
    (async function () {
      try {
        var backups = await storageGet(SYNC_BACKUPS_KEY) || [];
        var backup = backups.find(function (item) { return item && item.id === msg.id; });
        if (!backup) throw new Error("Backup not found");
        await saveLocalBackup("before-restore");
        await applyLocalPayload(backup.payload, { markDirty: true, clearRemoteBase: true, preserveLocalEntries: false });
      } catch (err) {
        await storageSet({ "new-tab-sync-status": "error", "new-tab-sync-error": err.message || "Backup restore failed" });
      }
    }()).catch(console.error);
  } else if (msg.action === "syncAutoDownload") {
    doAutoDownload().catch(console.error);
  }
  return false; /* sendResponse already called synchronously */
});

/* ── First-install seeding ── */

chrome.runtime.onInstalled.addListener(async function (details) {
  if (details.reason !== "install") return;
  var existing = await storageGet("new-tab-profiles");
  if (existing) return; /* Already seeded (shouldn't happen on fresh install, but be safe) */
  await storageSet({
    "new-tab-profiles": {
      /* Keep in sync with PERSONAL_SEED in js/main.js */
      personal: {
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
      }
    },
    "new-tab-default-profile": "personal",
    "new-tab-active-profile": "personal"
  });
});
