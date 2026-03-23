/* popup.js — Browser action popup */

var WEBDAV_URL_KEY  = "new-tab-webdav-url";
var WEBDAV_USER_KEY = "new-tab-webdav-username";
var WEBDAV_PASS_KEY = "new-tab-webdav-password";

/* ── DOM refs ── */
var viewConfig  = document.getElementById("view-config");
var viewStatus  = document.getElementById("view-status");
var inpUrl      = document.getElementById("inp-url");
var inpUser     = document.getElementById("inp-user");
var inpPass     = document.getElementById("inp-pass");
var msgEl       = document.getElementById("msg");
var statusLine  = document.getElementById("status-line");
var btnTest     = document.getElementById("btn-test");
var btnSave     = document.getElementById("btn-save");
var btnUpload   = document.getElementById("btn-upload");
var btnDownload = document.getElementById("btn-download");
var btnEdit     = document.getElementById("btn-edit");

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
}

function formatStatus(data) {
  var status = data["new-tab-sync-status"];
  var last   = data["new-tab-sync-last"];
  var err    = data["new-tab-sync-error"];

  setButtons(status === "syncing");

  if (status === "syncing") {
    statusLine.className = "status-line syncing";
    statusLine.textContent = "Syncing…";
    return;
  }
  if (status === "error") {
    statusLine.className = "status-line error";
    statusLine.textContent = "Error: " + (err || "unknown");
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
  setButtons(false);
  formatStatus(storageData);
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

async function forceSave(url, user, pass) {
  await storageSet({
    [WEBDAV_URL_KEY]:  url,
    [WEBDAV_USER_KEY]: user,
    [WEBDAV_PASS_KEY]: pass,
    "new-tab-sync-auth-failed": false
  });
  btnSave.disabled = false;
  showStatusView({ "new-tab-sync-status": "idle", "new-tab-sync-last": null, "new-tab-sync-error": null });
}

/* ── Init ── */

async function init() {
  var data = await storageGet([
    WEBDAV_URL_KEY, WEBDAV_USER_KEY,
    "new-tab-sync-status", "new-tab-sync-last", "new-tab-sync-error"
  ]);

  if (data[WEBDAV_URL_KEY]) {
    showStatusView(data);
  } else {
    showConfigView(null, null);
  }

  /* Live updates while popup is open — read directly from changes.newValue
     to avoid a redundant storageGet round-trip and stale-render risk. */
  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== "local") return;
    var syncKeys = ["new-tab-sync-status", "new-tab-sync-last", "new-tab-sync-error"];
    if (!syncKeys.some(function (k) { return changes[k]; })) return;
    var snapshot = {
      "new-tab-sync-status": changes["new-tab-sync-status"]
        ? changes["new-tab-sync-status"].newValue : data["new-tab-sync-status"],
      "new-tab-sync-last": changes["new-tab-sync-last"]
        ? changes["new-tab-sync-last"].newValue : data["new-tab-sync-last"],
      "new-tab-sync-error": changes["new-tab-sync-error"]
        ? changes["new-tab-sync-error"].newValue : data["new-tab-sync-error"]
    };
    /* Keep data in sync for future events */
    Object.assign(data, snapshot);
    formatStatus(snapshot);
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
  setButtons(true);
  var resp = await sendToBackground({ action: "syncUpload" });
  if (resp.error) { disableWithError(); return; }
  /* Buttons stay disabled; formatStatus re-enables them via storage.onChanged
     once the background reports the final status (idle or error). */
});

btnDownload.addEventListener("click", async function () {
  if (!confirm("This will replace all your current settings. Continue?")) return;
  setButtons(true);
  var resp = await sendToBackground({ action: "syncDownload" });
  if (resp.error) { disableWithError(); return; }
  /* Buttons stay disabled; formatStatus re-enables them via storage.onChanged
     once the background reports the final status (idle or error). */
});

init();
