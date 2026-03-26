/* popup.js — Browser action popup */

var WEBDAV_URL_KEY  = "new-tab-webdav-url";
var WEBDAV_USER_KEY = "new-tab-webdav-username";
var WEBDAV_PASS_KEY = "new-tab-webdav-password";

var SYNC_STATUS_KEY      = "new-tab-sync-status";
var SYNC_LAST_KEY        = "new-tab-sync-last";
var SYNC_ERROR_KEY       = "new-tab-sync-error";
var SYNC_DIRTY_KEY       = "new-tab-sync-dirty";
var SYNC_BACKUPS_KEY     = "new-tab-sync-local-backups";
var SYNC_REMOTE_UPDATE_KEY    = "new-tab-sync-remote-update-available";
var SYNC_LAST_PULL_BACKUP_KEY = "new-tab-sync-last-pull-backup-id";
var SYNC_AUTH_FAILED_KEY = "new-tab-sync-auth-failed";

/* ── DOM refs ── */
var viewConfig  = document.getElementById("view-config");
var viewStatus  = document.getElementById("view-status");
var inpUrl      = document.getElementById("inp-url");
var inpUser     = document.getElementById("inp-user");
var inpPass     = document.getElementById("inp-pass");
var msgEl       = document.getElementById("msg");
var statusLine  = document.getElementById("status-line");
var statusHint  = document.getElementById("status-hint");
var btnTest     = document.getElementById("btn-test");
var btnSave     = document.getElementById("btn-save");
var btnUpload   = document.getElementById("btn-upload");
var btnDownload = document.getElementById("btn-download");
var btnUndoPull = document.getElementById("btn-undo-pull");
var btnConflictDetails = document.getElementById("btn-conflict-details");
var btnEdit     = document.getElementById("btn-edit");
var conflictDetails = document.getElementById("conflict-details");
var backupPanel = document.getElementById("backup-panel");
var backupList  = document.getElementById("backup-list");
var backupEmpty = document.getElementById("backup-empty");
var currentSyncData = {};
var conflictDetailsOpen = false;
var conflictDebugData = null;

/* ── Storage helpers ── */

function storageGet(keys) {
  return new Promise(function (resolve) {
    chrome.storage.local.get(keys, function (r) { resolve(r || {}); });
  });
}

function storageSet(obj) {
  return new Promise(function (resolve) {
    chrome.storage.local.set(obj, resolve);
  });
}

/* ── UI helpers ── */

function showMsg(text, cls) {
  msgEl.textContent = text;
  msgEl.className = cls || "";
}

function setButtons(disabled) {
  btnUpload.disabled  = disabled;
  btnDownload.disabled = disabled;
  btnUndoPull.disabled = disabled;
}

function renderUndoButton(data) {
  var visible = !!(data && data[SYNC_LAST_PULL_BACKUP_KEY]);
  btnUndoPull.classList.toggle("hidden", !visible);
}

function getConflictDetails(data) {
  var status = data[SYNC_STATUS_KEY];
  var err = data[SYNC_ERROR_KEY];
  var dirty = !!data[SYNC_DIRTY_KEY];
  var remoteUpdate = !!data[SYNC_REMOTE_UPDATE_KEY];
  var derivedConflict = getDerivedConflictMessage(remoteUpdate, dirty);

  if (status !== "conflict" && !derivedConflict) return null;
  if (!derivedConflict && !remoteUpdate) return null;

  return {
    title: derivedConflict || err || "Local and cloud changed",
    body: [
      dirty ? "<strong>Local:</strong> This device has edits that only exist here until you upload them." : "<strong>Local:</strong> No unsynced local edits detected.",
      remoteUpdate ? "<strong>Cloud:</strong> The cloud copy is newer than the last version this device synced against." : "<strong>Cloud:</strong> Remote state differs from this device.",
      "<strong>Safe actions:</strong> Upload to keep this device, or pull manually to restore the cloud copy. Pull is undoable.",
      "<strong>Automatic behavior:</strong> Nothing is overwritten automatically."
    ]
  };
}

function formatConflictSummary(details) {
  if (!details || !details.diff) return "";
  var diff = details.diff;
  var parts = [];
  if (diff.differingKeys && diff.differingKeys.length) {
    parts.push("Top-level keys with different values: " + diff.differingKeys.join(", "));
  }
  if (diff.profiles && diff.profiles.changed && diff.profiles.changed.length) {
    parts.push("Profiles changed on both sides: " + diff.profiles.changed.join(", "));
  }
  if (diff.profiles && diff.profiles.localOnly && diff.profiles.localOnly.length) {
    parts.push("Profiles only on this device: " + diff.profiles.localOnly.join(", "));
  }
  if (diff.profiles && diff.profiles.remoteOnly && diff.profiles.remoteOnly.length) {
    parts.push("Profiles only in cloud: " + diff.profiles.remoteOnly.join(", "));
  }
  if (diff.overrides && diff.overrides.changed && diff.overrides.changed.length) {
    parts.push("Profile overrides changed on both sides: " + diff.overrides.changed.join(", "));
  }
  if (diff.overrides && diff.overrides.fieldDiffs) {
    Object.keys(diff.overrides.fieldDiffs).forEach(function (name) {
      var fields = (diff.overrides.fieldDiffs[name] || []).map(function (change) { return change.field; });
      if (fields.length) parts.push("Override fields changed for " + name + ": " + fields.join(", "));
    });
  }
  return parts.join("\n");
}

function safeJson(value) {
  return JSON.stringify(value, null, 2);
}

async function loadConflictDebugData() {
  btnConflictDetails.disabled = true;
  conflictDetails.innerHTML = "<p>Loading conflict details…</p>";
  conflictDetails.classList.remove("hidden");
  var resp = await sendToBackground({ action: "getSyncConflictDetails" });
  btnConflictDetails.disabled = false;
  if (resp.error) {
    conflictDebugData = { ok: false, message: "Could not reach background service" };
    return;
  }
  if (resp && resp.received === true && typeof resp.ok === "undefined") {
    conflictDebugData = {
      ok: false,
      message: "Conflict inspection is unavailable in the current service worker. Reload the extension or reopen the new tab, then try again."
    };
    return;
  }
  conflictDebugData = resp;
}

function renderConflictDetails(data) {
  var details = getConflictDetails(data || {});
  if (!details) {
    conflictDetailsOpen = false;
    conflictDebugData = null;
    btnConflictDetails.classList.add("hidden");
    conflictDetails.classList.add("hidden");
    conflictDetails.innerHTML = "";
    return;
  }

  btnConflictDetails.classList.remove("hidden");
  btnConflictDetails.textContent = conflictDetailsOpen ? "Hide conflict details" : "See conflict details";
  var html = "<p><strong>Conflict</strong></p><p>" + details.title + "</p><p>" + details.body.join("</p><p>") + "</p>";
  if (conflictDebugData) {
    html += "<p><strong>Debug summary</strong></p><p>" + (formatConflictSummary(conflictDebugData) || "No detailed differences detected yet.").replace(/\n/g, "</p><p>") + "</p>";
    html += "<pre>" + safeJson(conflictDebugData) + "</pre>";
  }
  conflictDetails.innerHTML = html;
  conflictDetails.classList.toggle("hidden", !conflictDetailsOpen);
}

function formatReason(reason) {
  if (reason === "before-pull") return "Saved before pulling from cloud";
  if (reason === "before-restore") return "Saved before restoring an older backup";
  if (reason === "before-undo-pull") return "Saved before undoing the previous pull";
  return reason || "Local snapshot";
}

function formatBackupTime(iso) {
  if (!iso) return "Unknown time";
  return new Date(iso).toLocaleString();
}

function getDerivedConflictMessage(remoteUpdate, dirty) {
  if (!remoteUpdate || !dirty) return "";
  return "Cloud config changed while this device still has unsynced local edits. Resolve the conflict in the sync popup";
}

function isDisconnectedError(error) {
  var text = String(error || "").toLowerCase();
  return !!text && text !== "invalid credentials";
}

function renderBackups(backups) {
  backups = Array.isArray(backups) ? backups : [];
  backupList.innerHTML = "";
  backupPanel.classList.toggle("hidden", backups.length === 0);
  backupEmpty.classList.toggle("hidden", backups.length !== 0);
  backups.forEach(function (backup) {
    var item = document.createElement("div");
    item.className = "backup-item";

    var meta = document.createElement("div");
    meta.className = "backup-meta";
    meta.textContent = formatBackupTime(backup.createdAt);

    var reason = document.createElement("div");
    reason.className = "backup-reason";
    reason.textContent = formatReason(backup.reason);

    var restoreBtn = document.createElement("button");
    restoreBtn.type = "button";
    restoreBtn.textContent = "Restore this backup";
    restoreBtn.addEventListener("click", async function () {
      if (!confirm("Restore this local backup? Your current settings will be snapshotted first and the restored state will stay local until you upload it.")) return;
      setButtons(true);
      restoreBtn.disabled = true;
      var resp = await sendToBackground({ action: "restoreLocalBackup", id: backup.id });
      if (resp.error) { disableWithError(); return; }
    });

    item.appendChild(meta);
    item.appendChild(reason);
    item.appendChild(restoreBtn);
    backupList.appendChild(item);
  });
}

function formatStatus(data) {
  var status = data[SYNC_STATUS_KEY];
  var last   = data[SYNC_LAST_KEY];
  var err    = data[SYNC_ERROR_KEY];
  var dirty  = !!data[SYNC_DIRTY_KEY];
  var remoteUpdate = !!data[SYNC_REMOTE_UPDATE_KEY];
  var derivedConflict = getDerivedConflictMessage(remoteUpdate, dirty);

  setButtons(status === "syncing");
  statusHint.textContent = "";

  if (status === "syncing") {
    statusLine.className = "status-line syncing";
    statusLine.textContent = "Syncing…";
    if (dirty) statusHint.textContent = "Local edits are queued while sync runs.";
    return;
  }
  if (status === "error") {
    if (isDisconnectedError(err)) {
      statusLine.className = "status-line conflict";
      statusLine.textContent = "Disconnected";
      statusHint.textContent = dirty
        ? "Local changes are safe on this device. Reconnect, then upload when you are ready."
        : (err || "Could not reach cloud sync right now.");
    } else {
      statusLine.className = "status-line error";
      statusLine.textContent = "Error: " + (err || "unknown");
      if (dirty) statusHint.textContent = "Local changes are still waiting to be uploaded.";
    }
    return;
  }
  if (status === "conflict") {
    if (derivedConflict) {
      statusLine.className = "status-line conflict";
      statusLine.textContent = "Conflict: " + (err || derivedConflict);
      statusHint.textContent = "Upload to keep local changes or download to replace them. A backup is kept before destructive restores.";
      return;
    }
    statusLine.className = "status-line error";
    statusLine.textContent = "Upload blocked";
    statusHint.textContent = err || "Your local changes are preserved on this device.";
    return;
  }
  if (derivedConflict) {
    statusLine.className = "status-line conflict";
    statusLine.textContent = "Conflict: " + derivedConflict;
    statusHint.textContent = "Local changes are preserved until you manually choose upload or pull.";
    return;
  }
  if (dirty) {
    statusLine.className = "status-line dirty";
    statusLine.textContent = "Unsynced local changes";
    statusHint.textContent = last
      ? "Last clean sync: " + new Date(last).toLocaleString()
      : "These edits exist only on this device until you upload them.";
    return;
  }
  if (remoteUpdate) {
    statusLine.className = "status-line conflict";
    statusLine.textContent = "Cloud has a newer snapshot";
    statusHint.textContent = "Your current local setup is untouched. Pull manually if you want to restore the cloud version.";
    return;
  }
  statusLine.className = "status-line ok";
  statusLine.textContent = last
    ? "Last synced: " + new Date(last).toLocaleString()
    : "Never synced";
}

/* ── Views ── */

function showConfigView(url, username) {
  viewConfig.classList.remove("hidden");
  viewStatus.classList.add("hidden");
  if (url) inpUrl.value = url;
  if (username) inpUser.value = username;
  showMsg("", "");
}

function showStatusView(storageData) {
  viewConfig.classList.add("hidden");
  viewStatus.classList.remove("hidden");
  currentSyncData = storageData || {};
  setButtons(false);
  formatStatus(storageData);
  renderConflictDetails(currentSyncData);
  renderBackups(currentSyncData[SYNC_BACKUPS_KEY] || []);
  renderUndoButton(currentSyncData);
}

function disableWithError() {
  setButtons(true);
  statusLine.className = "status-line error";
  statusLine.textContent = "Could not reach background service. Try reopening the popup.";
}

/* ── WebDAV connection test (popup-local, intentionally different from webdav.js)
   Note: 404 is treated as ok:true here because for the "Test Connection" UX,
   a 404 means the server is reachable and auth passed — the file just doesn't
   exist yet, which is expected on first setup. webdav.js returns ok:false for
   404 in the download path because there it IS an error. ── */

function authHeader(u, p) { return "Basic " + btoa(unescape(encodeURIComponent(u + ":" + p))); }

async function webdavTest(url, username, password) {
  try {
    var resp = await fetch(url, {
      method: "HEAD",
      headers: { "Authorization": authHeader(username, password) }
    });
    if (resp.status === 401) return { ok: false, message: "Invalid credentials (401)" };
    if (resp.status === 404) return { ok: true,  message: "Connected (file will be created on first upload)" };
    if (!resp.ok) return { ok: false, message: "Server returned " + resp.status };
    return { ok: true, message: "Connected" };
  } catch (err) {
    return { ok: false, message: err.message || "Network error" };
  }
}

/* ── Messaging to background ── */

function sendToBackground(msg) {
  return new Promise(function (resolve) {
    function attempt(cb) {
      try {
        chrome.runtime.sendMessage(msg, function (resp) {
          if (chrome.runtime.lastError) { cb(null); } else { cb(resp || {}); }
        });
      } catch (_) { cb(null); }
    }

    attempt(function (resp) {
      if (resp !== null) { resolve(resp); return; }
      /* Retry once after 200ms to allow SW to wake */
      setTimeout(function () {
        attempt(function (resp2) {
          resolve(resp2 !== null ? resp2 : { error: true });
        });
      }, 200);
    });
  });
}

/* ── Credential save ── */

var SYNC_WATCHED_KEYS = [
  SYNC_STATUS_KEY, SYNC_LAST_KEY, SYNC_ERROR_KEY, SYNC_DIRTY_KEY,
  SYNC_BACKUPS_KEY, SYNC_REMOTE_UPDATE_KEY, SYNC_LAST_PULL_BACKUP_KEY
];

async function forceSave(url, user, pass) {
  await storageSet({
    [WEBDAV_URL_KEY]:      url,
    [WEBDAV_USER_KEY]:     user,
    [WEBDAV_PASS_KEY]:     pass,
    [SYNC_AUTH_FAILED_KEY]: false
  });
  btnSave.disabled = false;
  showStatusView({ [SYNC_STATUS_KEY]: "idle", [SYNC_LAST_KEY]: null, [SYNC_ERROR_KEY]: null });
}

/* ── Init ── */

function pickFromChanges(changes, key, fallback) {
  return changes[key] ? changes[key].newValue : fallback[key];
}

async function init() {
  var data = await storageGet([WEBDAV_URL_KEY, WEBDAV_USER_KEY].concat(SYNC_WATCHED_KEYS));

  if (data[WEBDAV_URL_KEY]) {
    showStatusView(data);
    renderBackups(data[SYNC_BACKUPS_KEY] || []);
  } else {
    showConfigView(null, null);
  }

  /* Live updates while popup is open — read directly from changes.newValue
     to avoid a redundant storageGet round-trip and stale-render risk. */
  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== "local") return;
    if (!SYNC_WATCHED_KEYS.some(function (k) { return changes[k]; })) return;
    var snapshot = {
      [SYNC_STATUS_KEY]:           pickFromChanges(changes, SYNC_STATUS_KEY, data),
      [SYNC_LAST_KEY]:             pickFromChanges(changes, SYNC_LAST_KEY, data),
      [SYNC_ERROR_KEY]:            pickFromChanges(changes, SYNC_ERROR_KEY, data),
      [SYNC_DIRTY_KEY]:            pickFromChanges(changes, SYNC_DIRTY_KEY, data),
      [SYNC_BACKUPS_KEY]:          pickFromChanges(changes, SYNC_BACKUPS_KEY, data),
      [SYNC_REMOTE_UPDATE_KEY]:    pickFromChanges(changes, SYNC_REMOTE_UPDATE_KEY, data),
      [SYNC_LAST_PULL_BACKUP_KEY]: pickFromChanges(changes, SYNC_LAST_PULL_BACKUP_KEY, data)
    };
    /* Keep data in sync for future events */
    Object.assign(data, snapshot);
    currentSyncData = data;
    formatStatus(snapshot);
    renderConflictDetails(snapshot);
    renderBackups(snapshot[SYNC_BACKUPS_KEY] || []);
    renderUndoButton(snapshot);
  });
}

/* ── Event handlers ── */

btnTest.addEventListener("click", async function () {
  var url  = inpUrl.value.trim();
  var user = inpUser.value.trim();
  var pass = inpPass.value;
  if (!url || !user) { showMsg("URL and username are required", "error"); return; }
  showMsg("Testing…", "");
  btnTest.disabled = true;
  var result = await webdavTest(url, user, pass);
  btnTest.disabled = false;
  showMsg(result.message, result.ok ? "ok" : "error");
});

btnSave.addEventListener("click", async function () {
  var url  = inpUrl.value.trim();
  var user = inpUser.value.trim();
  var pass = inpPass.value;
  if (!url || !user) { showMsg("URL and username are required", "error"); return; }

  showMsg("Testing connection…", "");
  btnSave.disabled = true;
  var result = await webdavTest(url, user, pass);

  if (!result.ok) {
    btnSave.disabled = false;
    /* Show error + "Save anyway" inline link */
    msgEl.textContent = result.message + " — ";
    msgEl.className = "error";
    var link = document.createElement("a");
    link.textContent = "Save anyway";
    link.style.cssText = "color:#6af;cursor:pointer;text-decoration:underline;";
    link.addEventListener("click", function () { forceSave(inpUrl.value.trim(), inpUser.value.trim(), inpPass.value); });
    msgEl.appendChild(link);
    return;
  }

  await forceSave(url, user, pass);
});

btnEdit.addEventListener("click", async function () {
  var data = await storageGet([WEBDAV_URL_KEY, WEBDAV_USER_KEY]);
  showConfigView(data[WEBDAV_URL_KEY], data[WEBDAV_USER_KEY]);
});

btnUpload.addEventListener("click", async function () {
  var action = "syncUpload";
  if (viewStatus.classList.contains("hidden")) return;
  if (statusLine.classList.contains("conflict")) {
    if (!confirm("This will overwrite the cloud copy with your local settings. Continue?")) return;
    action = "syncUploadForce";
  }
  setButtons(true);
  var resp = await sendToBackground({ action: action });
  if (resp.error) { disableWithError(); return; }
  /* Buttons stay disabled; formatStatus re-enables them via storage.onChanged
     once the background reports the final status (idle or error). */
});

btnDownload.addEventListener("click", async function () {
  var action = "syncDownload";
  var prompt = "This will save a local backup, replace this device with the cloud copy, and let you undo that pull later. Continue?";
  if (!confirm(prompt)) return;
  setButtons(true);
  var resp = await sendToBackground({ action: action });
  if (resp.error) { disableWithError(); return; }
  /* Buttons stay disabled; formatStatus re-enables them via storage.onChanged
     once the background reports the final status (idle or error). */
});

btnUndoPull.addEventListener("click", async function () {
  if (!confirm("Undo the last pull and restore the local state from before it?")) return;
  setButtons(true);
  var resp = await sendToBackground({ action: "undoLastPull" });
  if (resp.error) { disableWithError(); return; }
});

btnConflictDetails.addEventListener("click", function () {
  conflictDetailsOpen = !conflictDetailsOpen;
  if (!conflictDetailsOpen) {
    renderConflictDetails(currentSyncData);
    return;
  }
  loadConflictDebugData().then(function () {
    renderConflictDetails(currentSyncData);
  }).catch(function () {
    conflictDebugData = { ok: false, message: "Could not load conflict details" };
    renderConflictDetails(currentSyncData);
  });
});

init();
