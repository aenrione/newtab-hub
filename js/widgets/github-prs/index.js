/* ── GitHub PRs widget plugin ── */

Hub.injectStyles("widget-github-prs", `
  .gh-pr-list { display: grid; gap: 1px; }
  .gh-pr-row {
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
  .gh-pr-row:hover { background: var(--surface-hover); }
  .gh-pr-top {
    display: flex;
    align-items: baseline;
    gap: 8px;
    width: 100%;
    min-width: 0;
  }
  .gh-pr-title {
    font-weight: 500;
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.3;
  }
  .gh-pr-right {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }
  .gh-pr-bottom {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .gh-pr-repo {
    color: var(--muted);
    font-size: 0.72rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
    min-width: 0;
  }
  .gh-pr-num {
    color: var(--muted);
    font-size: 0.7rem;
    font-family: var(--font-display);
    flex-shrink: 0;
  }
  .gh-pr-badges { display: flex; gap: 4px; flex-shrink: 0; }
  .gh-pr-badge {
    font-size: 0.62rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    padding: 1px 5px;
    border-radius: 3px;
  }
  .gh-pr-draft { background: rgba(148, 163, 184, 0.15); color: var(--muted); }
  .gh-pr-age { color: var(--muted); font-size: 0.68rem; flex-shrink: 0; }
  .editor-field--col { flex-direction: column; align-items: flex-start; gap: 4px; }
  .editor-field--col textarea {
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
  .editor-field--col textarea:focus { outline: none; border-color: var(--accent-2); }
`);

Hub.registry.register("github-prs", {
  label: "GitHub PRs",
  icon: "\u2387",

  credentialFields: [
    { key: "token", label: "GitHub PAT", type: "password" }
  ],

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Pull Requests") + '</h2></div>' +
      '<div class="gh-pr-list"><div class="empty-state">Loading...</div></div>';
  },

  load: async function (container, config, state, token) {
    var listEl = container.querySelector(".gh-pr-list");

    var creds = await Hub.credentials.load(config._id);
    if (!creds.token) {
      listEl.innerHTML = '<div class="empty-state">Add your GitHub PAT in the widget editor.</div>';
      return;
    }

    var filter = config.filter || "authored";
    var repos = (config.repos || []).filter(Boolean);
    var limit = Math.min(config.limit || 15, 50);

    var data;
    try {
      if (filter === "all") {
        var results = await Promise.all([
          ghFetch(buildGhQuery("review-requested", repos), limit, creds.token, state.store),
          ghFetch(buildGhQuery("authored", repos), limit, creds.token, state.store)
        ]);
        var seen = {};
        var merged = [];
        results[0].concat(results[1]).forEach(function (pr) {
          var key = pr.repository_url + "#" + pr.number;
          if (!seen[key]) { seen[key] = true; merged.push(pr); }
        });
        merged.sort(function (a, b) { return new Date(b.updated_at) - new Date(a.updated_at); });
        data = merged.slice(0, limit);
      } else {
        data = await ghFetch(buildGhQuery(filter, repos), limit, creds.token, state.store);
      }
    } catch (err) {
      if (token !== state.renderToken) return;
      var msg = err.message === "401" ? "Invalid GitHub token — check your PAT."
               : err.message === "403" ? "GitHub API rate limited. Try again soon."
               : "Failed to load PRs.";
      listEl.innerHTML = '<div class="empty-state">' + Hub.escapeHtml(msg) + '</div>';
      return;
    }

    if (token !== state.renderToken) return;

    if (!data.length) {
      listEl.innerHTML = '<div class="empty-state">No open pull requests.</div>';
      return;
    }

    var frag = document.createDocumentFragment();
    data.forEach(function (pr) {
      var repoName = ghRepoName(pr.repository_url);
      var age = ghAge(pr.updated_at);

      state.links.push({ title: pr.title + " — " + repoName, href: pr.html_url, type: "github-pr" });

      var a = Hub.createLink("gh-pr-row", pr.html_url, pr.title);
      a.dataset.searchText = pr.title + " " + repoName + " #" + pr.number;

      var badges = "";
      if (pr.draft) badges += '<span class="gh-pr-badge gh-pr-draft">Draft</span>';

      a.innerHTML =
        '<span class="gh-pr-top">' +
          '<span class="gh-pr-title">' + Hub.escapeHtml(pr.title) + '</span>' +
          '<span class="gh-pr-right">' +
            '<span class="gh-pr-num">#' + pr.number + '</span>' +
            '<span class="gh-pr-age">' + Hub.escapeHtml(age) + '</span>' +
          '</span>' +
        '</span>' +
        '<span class="gh-pr-bottom">' +
          '<span class="gh-pr-repo">' + Hub.escapeHtml(repoName) + '</span>' +
          (badges ? '<span class="gh-pr-badges">' + badges + '</span>' : '') +
        '</span>';

      frag.appendChild(a);
    });

    listEl.replaceChildren(frag);
  },

  renderEditor: function (container, config, onChange, navOptions) {
    container.replaceChildren();

    var titleLabel = document.createElement("label");
    titleLabel.className = "editor-field";
    titleLabel.innerHTML =
      '<span>Widget title</span>' +
      '<input type="text" value="' + Hub.escapeHtml(config.title || "Pull Requests") + '" />';
    var titleInput = titleLabel.querySelector("input");
    titleInput.dataset.navHeaderField = "";
    titleInput.addEventListener("input", function (e) { config.title = e.target.value; onChange(config); });
    container.appendChild(titleLabel);

    var filterVal = config.filter || "authored";
    var filterLabel = document.createElement("label");
    filterLabel.className = "editor-field";
    filterLabel.innerHTML =
      '<span>Show PRs</span>' +
      '<select>' +
        '<option value="all"' + (filterVal === "all" ? " selected" : "") + '>All (review-req + authored)</option>' +
        '<option value="review-requested"' + (filterVal === "review-requested" ? " selected" : "") + '>Review requested</option>' +
        '<option value="authored"' + (filterVal === "authored" ? " selected" : "") + '>Authored by me</option>' +
        '<option value="assigned"' + (filterVal === "assigned" ? " selected" : "") + '>Assigned to me</option>' +
        '<option value="mentioned"' + (filterVal === "mentioned" ? " selected" : "") + '>Mentioning me</option>' +
      '</select>';
    filterLabel.querySelector("select").addEventListener("change", function (e) {
      config.filter = e.target.value;
      onChange(config);
    });
    container.appendChild(filterLabel);

    var limitLabel = document.createElement("label");
    limitLabel.className = "editor-field";
    limitLabel.innerHTML =
      '<span>Max PRs</span>' +
      '<input type="number" min="1" max="50" value="' + (config.limit || 15) + '" />';
    limitLabel.querySelector("input").addEventListener("input", function (e) {
      var n = parseInt(e.target.value, 10);
      if (n > 0 && n <= 50) { config.limit = n; onChange(config); }
    });
    container.appendChild(limitLabel);

    var hint = document.createElement("p");
    hint.className = "editor-hint";
    hint.textContent = 'Optionally restrict to specific repos (one per line, "owner/repo"). Leave empty for all your repos.';
    container.appendChild(hint);

    var reposLabel = document.createElement("label");
    reposLabel.className = "editor-field editor-field--col";
    reposLabel.innerHTML =
      '<span>Repos (optional)</span>' +
      '<textarea rows="3" placeholder="owner/repo&#10;another/repo">' +
      Hub.escapeHtml((config.repos || []).join("\n")) +
      '</textarea>';
    reposLabel.querySelector("textarea").addEventListener("input", function (e) {
      config.repos = e.target.value.split("\n").map(function (r) { return r.trim(); }).filter(Boolean);
      onChange(config);
    });
    container.appendChild(reposLabel);
  },

  defaultConfig: function () {
    return {
      title: "Pull Requests",
      filter: "authored",
      limit: 15,
      repos: []
    };
  }
});

/* ── Helpers ── */

async function ghFetch(query, limit, tokenStr, store) {
  var url = "https://api.github.com/search/issues" +
    "?q=" + encodeURIComponent(query) +
    "&per_page=" + limit +
    "&sort=updated&order=desc";

  var cacheKey = "gh-prs::" + query + "::" + limit;
  var cached = Hub.cache.get(cacheKey);
  if (cached !== null) return cached;

  var res = await Hub.fetchWithTimeout(url, {
    headers: {
      "Authorization": "Bearer " + tokenStr,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28"
    }
  }, 12000);

  if (!res.ok) throw new Error(String(res.status));

  var data = await res.json();
  var items = (data && data.items) || [];

  Hub.cache.set(cacheKey, items, "default", store);
  return items;
}

function buildGhQuery(filter, repos) {
  var parts = ["is:pr", "is:open"];

  if (filter === "authored")          parts.push("author:@me");
  else if (filter === "assigned")     parts.push("assignee:@me");
  else if (filter === "mentioned")    parts.push("mentions:@me");
  else                                parts.push("review-requested:@me");

  if (repos && repos.length) {
    repos.forEach(function (r) { parts.push("repo:" + r); });
  }

  return parts.join(" ");
}

function ghRepoName(repositoryUrl) {
  if (!repositoryUrl) return "";
  var m = repositoryUrl.match(/\/repos\/(.+)$/);
  return m ? m[1] : repositoryUrl;
}

function ghAge(dateStr) {
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
