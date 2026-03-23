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
  "new-tab-sync-pending": 1
};

var PAYLOAD_SKIP_EXACT = {
  "new-tab-cache": 1,
  "new-tab-v2-migrated": 1
};

function isPayloadKey(k) {
  if (PAYLOAD_SKIP_EXACT[k]) return false;
  if (k.startsWith("new-tab-webdav-")) return false;
  if (k.startsWith("new-tab-sync-")) return false;
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

function storageGetAll() {
  return new Promise(function (resolve) {
    chrome.storage.local.get(null, function (r) { resolve(r || {}); });
  });
}

/* ── Payload builder ── */

function buildPayload(all) {
  var data = {};
  Object.keys(all).forEach(function (k) {
    if (k.startsWith("new-tab-") && isPayloadKey(k)) {
      data[k] = all[k];
    }
  });

  /* Sanitize video backgrounds — strip non-http video src (blob:, data:, object:) */
  var bgKey = "new-tab-bg-image";
  var bg = data[bgKey];
  if (bg && bg.src && bg.type === "video" && !bg.src.startsWith("http")) {
    data[bgKey] = Object.assign({}, bg, { src: null });
  }

  return { version: 1, exportedAt: new Date().toISOString(), data: data };
}

/* ── Core upload ── */

async function doUpload(isManual) {
  /* Clear pending flag immediately — prevents a duplicate run if both the
     setTimeout path and the alarm safety-net path somehow both fire.
     Trade-off: if the SW is killed after this line but before the upload
     completes, the alarm will find pending=false and NOT retry. That is
     intentional — the next dashboard change will schedule a fresh debounce. */
  await storageSet({ "new-tab-sync-pending": false });

  var url = await storageGet("new-tab-webdav-url");
  var username = await storageGet("new-tab-webdav-username");
  var password = await storageGet("new-tab-webdav-password");

  if (!url || !username) return;

  await storageSet({ "new-tab-sync-status": "syncing" });

  var all = await storageGetAll();
  var payload = buildPayload(all);
  var result = await webdav.upload(url, username, password || "", payload);

  if (result.ok) {
    var update = {
      "new-tab-sync-status": "idle",
      "new-tab-sync-last": new Date().toISOString(),
      "new-tab-sync-error": null,
      "new-tab-sync-pending": false
    };
    if (isManual) update["new-tab-sync-auth-failed"] = false;
    await storageSet(update);
  } else if (result.status === 401) {
    await storageSet({
      "new-tab-sync-status": "error",
      "new-tab-sync-error": "Invalid credentials",
      "new-tab-sync-auth-failed": true,
      "new-tab-sync-pending": false
    });
  } else {
    await storageSet({
      "new-tab-sync-status": "error",
      "new-tab-sync-error": result.message,
      "new-tab-sync-pending": false
    });
  }
}

/* ── Core download ── */

async function doDownload() {
  var url = await storageGet("new-tab-webdav-url");
  var username = await storageGet("new-tab-webdav-username");
  var password = await storageGet("new-tab-webdav-password");

  if (!url || !username) return;

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

  /* Strip local-only keys before writing */
  var toWrite = {};
  Object.keys(downloaded.data).forEach(function (k) {
    if (k.startsWith("new-tab-webdav-")) return;
    if (k.startsWith("new-tab-sync-")) return;
    toWrite[k] = downloaded.data[k];
  });

  if (Object.keys(toWrite).length === 0) {
    await storageSet({ "new-tab-sync-status": "error", "new-tab-sync-error": "Downloaded data was empty after filtering" });
    return;
  }

  toWrite["new-tab-sync-status"] = "idle";
  toWrite["new-tab-sync-last"] = new Date().toISOString();
  toWrite["new-tab-sync-error"] = null;
  toWrite["new-tab-sync-auth-failed"] = false;
  await storageSet(toWrite);
}

/* ── Debounce ── */

var debounceTimer = null;

async function scheduleUpload() {
  var authFailed = await storageGet("new-tab-sync-auth-failed");
  if (authFailed) return;

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
  }, 4000);

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
    doUpload(true);
    return;
  }

  /* Any other credential change: clear auth-failed flag so auto-sync resumes.
     Does NOT trigger an upload — the next dashboard edit will. */
  var credKeys = ["new-tab-webdav-url", "new-tab-webdav-username", "new-tab-webdav-password"];
  if (credKeys.some(function (k) { return changes[k]; })) {
    storageSet({ "new-tab-sync-auth-failed": false });
    return;
  }

  /* Check if any non-excluded dashboard key changed */
  var relevant = Object.keys(changes).some(function (k) {
    return k.startsWith("new-tab-") && !SYNC_TRIGGER_SKIP[k];
  });
  if (!relevant) return;

  scheduleUpload();
});

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

/* ── Message listener (from popup) ── */

chrome.runtime.onMessage.addListener(function (msg, _sender, sendResponse) {
  sendResponse({ received: true });
  if (msg.action === "syncUpload") {
    doUpload(true);
  } else if (msg.action === "syncDownload") {
    doDownload();
  }
  return false; /* sendResponse already called synchronously */
});
