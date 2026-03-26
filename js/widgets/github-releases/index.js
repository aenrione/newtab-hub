/* ── GitHub Releases widget plugin ── */

Hub.injectStyles("widget-github-releases", `
  .gh-rel-list { display: grid; gap: 1px; }
  .gh-rel-row {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 6px 8px;
    border-radius: var(--radius-sm);
    color: var(--text);
    text-decoration: none;
    font-size: 0.86rem;
    transition: background 80ms;
    overflow: hidden;
    min-width: 0;
  }
  .gh-rel-row:hover { background: var(--surface-hover); }
  .gh-rel-top {
    display: flex;
    align-items: baseline;
    gap: 8px;
    min-width: 0;
  }
  .gh-rel-repo {
    font-size: 0.7rem;
    color: var(--muted);
    flex-shrink: 0;
    max-width: 110px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .gh-rel-name {
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }
  .gh-rel-tag {
    font-size: 0.7rem;
    font-family: var(--font-display);
    color: var(--muted);
    flex-shrink: 0;
  }
  .gh-rel-age { color: var(--muted); font-size: 0.68rem; flex-shrink: 0; margin-left: auto; }
  .gh-rel-pre {
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 1px 4px;
    border-radius: 3px;
    background: rgba(251, 191, 36, 0.15);
    color: rgb(251, 191, 36);
    flex-shrink: 0;
  }
  .widget-github-releases .editor-field--col { flex-direction: column; align-items: flex-start; gap: 4px; }
  .widget-github-releases .editor-field--col textarea {
    width: 100%;
    min-height: 60px;
    padding: 6px 8px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg);
    color: var(--text);
    font-size: 0.82rem;
    font-family: var(--font-body);
    resize: vertical;
  }
  .widget-github-releases .editor-field--col textarea:focus { outline: none; border-color: var(--accent-2); }
`);

Hub.registry.register("github-releases", {
  label: "GitHub Releases",
  icon: "github",
  manualRefresh: true,

  credentialFields: [
    { key: "token", label: "GitHub PAT (optional)", type: "password" }
  ],

  render: function (container, config) {
    container.className += " widget-github-releases";
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Releases") + '</h2></div>' +
      '<div class="gh-rel-list"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var listEl = container.querySelector(".gh-rel-list");
    var repos = (config.repos || []).filter(Boolean);
    if (!repos.length) {
      listEl.innerHTML = '<div class="empty-state">Add repositories in the widget editor.</div>';
      return;
    }

    var creds = await Hub.credentials.load(config._id);
    var headers = { "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
    if (creds.token) headers["Authorization"] = "Bearer " + creds.token;

    var limit = Math.min(config.limit || 10, 50);
    var store = state.store;

    try {
      var allReleases = [];
      var results = await Promise.allSettled(repos.map(function (repo) {
        var url = "https://api.github.com/repos/" + encodeURIComponent(repo) + "/releases?per_page=3";
        var cacheKey = Hub.cache.scopeKey(config._id, "gh-releases::" + repo);
        var cached = Hub.cache.get(cacheKey);
        if (cached !== null) return Promise.resolve(cached);
        return Hub.fetchWithTimeout(url, { headers: headers }, 12000)
          .then(function (res) {
            if (!res.ok) throw new Error(String(res.status));
            return res.json();
          })
          .then(function (data) {
            Hub.cache.set(cacheKey, data, "default", store);
            return data;
          });
      }));

      results.forEach(function (r, i) {
        if (r.status === "fulfilled" && Array.isArray(r.value)) {
          r.value.forEach(function (rel) {
            allReleases.push(Object.assign({}, rel, { _repo: repos[i] }));
          });
        }
      });

      allReleases.sort(function (a, b) {
        return new Date(b.published_at) - new Date(a.published_at);
      });

      if (token !== state.renderToken) return;

      if (!allReleases.length) {
        listEl.innerHTML = '<div class="empty-state">No releases found.</div>';
        return;
      }

      var frag = document.createDocumentFragment();
      allReleases.slice(0, limit).forEach(function (rel) {
        var name = rel.name || rel.tag_name;
        var repoShort = (rel._repo || "").split("/").pop();
        var age = relAge(rel.published_at);

        state.links.push({ title: name + " \u2014 " + rel._repo, href: rel.html_url, type: "github-release" });

        var a = Hub.createLink("gh-rel-row", rel.html_url, name);
        a.dataset.searchText = name + " " + rel._repo + " " + rel.tag_name;
        a.innerHTML =
          '<span class="gh-rel-top">' +
            '<span class="gh-rel-repo">' + Hub.escapeHtml(repoShort) + '</span>' +
            '<span class="gh-rel-name">' + Hub.escapeHtml(name) + '</span>' +
            (rel.prerelease ? '<span class="gh-rel-pre">pre</span>' : '') +
            '<span class="gh-rel-tag">' + Hub.escapeHtml(rel.tag_name) + '</span>' +
            '<span class="gh-rel-age">' + Hub.escapeHtml(age) + '</span>' +
          '</span>';
        frag.appendChild(a);
      });

      listEl.replaceChildren(frag);
    } catch (_) {
      if (token !== state.renderToken) return;
      listEl.innerHTML = '<div class="empty-state">Failed to load releases.</div>';
    }
  },

  renderEditor: function (container, config, onChange) {
    container.replaceChildren();

    var titleLabel = document.createElement("label");
    titleLabel.className = "editor-field";
    titleLabel.innerHTML = '<span>Widget title</span><input type="text" value="' + Hub.escapeHtml(config.title || "Releases") + '" />';
    var titleInput = titleLabel.querySelector("input");
    titleInput.addEventListener("input", function (e) { config.title = e.target.value; onChange(config); });
    container.appendChild(titleLabel);

    var limitLabel = document.createElement("label");
    limitLabel.className = "editor-field";
    limitLabel.innerHTML = '<span>Max releases</span><input type="number" min="1" max="50" value="' + (config.limit || 10) + '" />';
    limitLabel.querySelector("input").addEventListener("input", function (e) {
      var n = parseInt(e.target.value, 10);
      if (n > 0 && n <= 50) { config.limit = n; onChange(config); }
    });
    container.appendChild(limitLabel);

    var hint = document.createElement("p");
    hint.className = "editor-hint";
    hint.textContent = "One repo per line (owner/repo). A GitHub PAT is optional for public repos but increases rate limits.";
    container.appendChild(hint);

    var reposLabel = document.createElement("label");
    reposLabel.className = "editor-field editor-field--col";
    reposLabel.innerHTML =
      '<span>Repositories</span>' +
      '<textarea rows="4" placeholder="owner/repo&#10;another/repo">' +
      Hub.escapeHtml((config.repos || []).join("\n")) +
      '</textarea>';
    reposLabel.querySelector("textarea").addEventListener("input", function (e) {
      config.repos = e.target.value.split("\n").map(function (r) { return r.trim(); }).filter(Boolean);
      onChange(config);
    });
    container.appendChild(reposLabel);
  },

  defaultConfig: function () {
    return { title: "Releases", repos: [], limit: 10 };
  }
});

function relAge(dateStr) {
  if (!dateStr) return "";
  var diff = Date.now() - new Date(dateStr).getTime();
  var mins = Math.floor(diff / 60000);
  if (mins < 60) return mins + "m";
  var hours = Math.floor(mins / 60);
  if (hours < 24) return hours + "h";
  var days = Math.floor(hours / 24);
  if (days < 30) return days + "d";
  return Math.floor(days / 30) + "mo";
}
