/* js/webdav.js — WebDAV HTTP client
   Sets self.webdav — works in both window and service worker contexts. */

self.webdav = (function () {

  function authHeader(username, password) {
    return "Basic " + btoa(unescape(encodeURIComponent(username + ":" + password)));
  }

  function normalize(ok, status, message, data) {
    return { ok: ok, status: status, message: message, data: data || null };
  }

  function canonicalizeEtag(value) {
    if (!value) return null;
    var etag = String(value).trim();
    if (!etag) return null;
    etag = etag.replace(/^W\//i, "");
    if (etag.charAt(0) === '"' && etag.charAt(etag.length - 1) === '"') {
      etag = etag.slice(1, -1);
    }
    etag = etag.replace(/-gzip$/i, "");
    return etag || null;
  }

  function extractRawEtag(resp) {
    return resp.headers.get("ETag") || resp.headers.get("Last-Modified") || null;
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

  async function putOnce(url, username, password, body, options) {
    options = options || {};
    var headers = {
      "Authorization": authHeader(username, password),
      "Content-Type": "application/json"
    };
    if (options.ifMatch) headers["If-Match"] = options.ifMatch;
    if (options.ifNoneMatch) headers["If-None-Match"] = options.ifNoneMatch;
    return fetch(url, {
      method: "PUT",
      headers: headers,
      body: body
    });
  }

  /* Extract the best available cache-validator from response headers.
     Prefer ETag (content-based); fall back to Last-Modified (time-based). */
  function extractEtag(resp) {
    return canonicalizeEtag(extractRawEtag(resp));
  }

  async function upload(url, username, password, payload, options) {
    url = normalizeUrl(url);
    options = options || {};
    try {
      var body = JSON.stringify(payload);
      var resp = await putOnce(url, username, password, body, options);
      if (resp.status === 401) return normalize(false, 401, "Invalid credentials");
      if (resp.status === 412) return normalize(false, 412, "Remote config changed; refusing to overwrite newer cloud data");

      /* 404 or 409 usually means the parent directory doesn't exist — try MKCOL then retry */
      if (resp.status === 404 || resp.status === 409) {
        var ok = await mkcol(parentUrl(url), username, password);
        if (!ok) return normalize(false, resp.status, "Upload failed: parent directory could not be created (server returned " + resp.status + ")");
        resp = await putOnce(url, username, password, body, options);
        if (resp.status === 401) return normalize(false, 401, "Invalid credentials");
        if (resp.status === 412) return normalize(false, 412, "Remote config changed; refusing to overwrite newer cloud data");
      }

      if (!resp.ok) return normalize(false, resp.status, "Upload failed: server returned " + resp.status);
      var r = normalize(true, resp.status, "Uploaded");
      r.etag = extractEtag(resp);
      r.rawEtag = extractRawEtag(resp);
      return r;
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
      var r = normalize(true, resp.status, "Downloaded", data);
      r.etag = extractEtag(resp);
      r.rawEtag = extractRawEtag(resp);
      return r;
    } catch (err) {
      return normalize(false, 0, err.message || "Network error");
    }
  }

  /* Lightweight remote-change check — HEAD only, no body transferred.
     Returns { ok, etag } where etag is ETag or Last-Modified. */
  async function check(url, username, password) {
    url = normalizeUrl(url);
    try {
      var resp = await fetch(url, {
        method: "HEAD",
        headers: { "Authorization": authHeader(username, password) }
      });
      if (!resp.ok) return normalize(false, resp.status, "Check failed");
      var r = normalize(true, resp.status, "OK");
      r.etag = extractEtag(resp);
      r.rawEtag = extractRawEtag(resp);
      return r;
    } catch (err) {
      return normalize(false, 0, err.message || "Network error");
    }
  }

  return { test: test, upload: upload, download: download, check: check, canonicalizeEtag: canonicalizeEtag };

}());
