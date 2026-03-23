/* js/webdav.js — WebDAV HTTP client
   Sets self.webdav — works in both window and service worker contexts. */

self.webdav = (function () {

  function authHeader(username, password) {
    return "Basic " + btoa(unescape(encodeURIComponent(username + ":" + password)));
  }

  function normalize(ok, status, message, data) {
    return { ok: ok, status: status, message: message, data: data || null };
  }

  /* If the URL looks like a directory (last segment has no dot), append newtab.json */
  function normalizeUrl(url) {
    var clean = url.replace(/\/$/, "");
    var last = clean.split("/").pop();
    return last.indexOf(".") === -1 ? clean + "/newtab.json" : clean;
  }

  async function test(url, username, password) {
    url = normalizeUrl(url);
    try {
      var resp = await fetch(url, {
        method: "HEAD",
        headers: { "Authorization": authHeader(username, password) }
      });
      if (resp.status === 401) return normalize(false, 401, "Invalid credentials");
      if (resp.status === 404) return normalize(false, 404, "File not found (will be created on first upload)");
      if (!resp.ok) return normalize(false, resp.status, "Server returned " + resp.status);
      return normalize(true, resp.status, "Connected");
    } catch (err) {
      return normalize(false, 0, err.message || "Network error");
    }
  }

  function parentUrl(url) {
    return url.replace(/\/[^/]+$/, "");
  }

  async function mkcol(url, username, password) {
    try {
      var resp = await fetch(url, {
        method: "MKCOL",
        headers: { "Authorization": authHeader(username, password) }
      });
      /* 201 = created, 405 = already exists — both mean the directory is usable */
      return resp.status === 201 || resp.status === 405;
    } catch (_) {
      return false;
    }
  }

  async function putOnce(url, username, password, body) {
    return fetch(url, {
      method: "PUT",
      headers: {
        "Authorization": authHeader(username, password),
        "Content-Type": "application/json"
      },
      body: body
    });
  }

  async function upload(url, username, password, payload) {
    url = normalizeUrl(url);
    try {
      var body = JSON.stringify(payload);
      var resp = await putOnce(url, username, password, body);
      if (resp.status === 401) return normalize(false, 401, "Invalid credentials");

      /* 404 or 409 usually means the parent directory doesn't exist — try MKCOL then retry */
      if (resp.status === 404 || resp.status === 409) {
        var ok = await mkcol(parentUrl(url), username, password);
        if (!ok) return normalize(false, resp.status, "Upload failed: parent directory could not be created (server returned " + resp.status + ")");
        resp = await putOnce(url, username, password, body);
        if (resp.status === 401) return normalize(false, 401, "Invalid credentials");
      }

      if (!resp.ok) return normalize(false, resp.status, "Upload failed: server returned " + resp.status);
      return normalize(true, resp.status, "Uploaded");
    } catch (err) {
      return normalize(false, 0, err.message || "Network error");
    }
  }

  async function download(url, username, password) {
    url = normalizeUrl(url);
    try {
      var resp = await fetch(url, {
        method: "GET",
        headers: { "Authorization": authHeader(username, password) }
      });
      if (resp.status === 401) return normalize(false, 401, "Invalid credentials");
      if (resp.status === 404) return normalize(false, 404, "No config file found on server");
      if (!resp.ok) return normalize(false, resp.status, "Download failed: server returned " + resp.status);
      var text = await resp.text();
      var data;
      try { data = JSON.parse(text); } catch (_) {
        return normalize(false, 0, "Server returned invalid JSON");
      }
      return normalize(true, resp.status, "Downloaded", data);
    } catch (err) {
      return normalize(false, 0, err.message || "Network error");
    }
  }

  return { test: test, upload: upload, download: download };

}());
