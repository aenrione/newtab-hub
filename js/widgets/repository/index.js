/* ── Repository widget plugin ── */

Hub.injectStyles("widget-repository", `
  .repo-stats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
    margin-bottom: 10px;
  }
  .repo-stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    padding: 6px 4px;
    border-radius: var(--radius-sm);
    background: var(--surface-hover);
    text-decoration: none;
    color: var(--text);
    transition: background 80ms;
  }
  .repo-stat:hover { background: var(--border); }
  .repo-stat-value {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 700;
    line-height: 1;
  }
  .repo-stat-label { font-size: 0.62rem; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
  .repo-section-title {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--muted);
    margin: 8px 0 4px 8px;
  }
  .repo-list { display: grid; gap: 1px; margin-bottom: 6px; }
  .repo-row {
    display: flex;
    align-items: baseline;
    gap: 8px;
    padding: 5px 8px;
    border-radius: var(--radius-sm);
    color: var(--text);
    text-decoration: none;
    font-size: 0.84rem;
    transition: background 80ms;
    overflow: hidden;
    min-width: 0;
  }
  .repo-row:hover { background: var(--surface-hover); }
  .repo-row-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
  .repo-row-num { font-size: 0.7rem; color: var(--muted); flex-shrink: 0; font-family: var(--font-display); }
  .repo-row-age { font-size: 0.68rem; color: var(--muted); flex-shrink: 0; }
  .repo-desc { font-size: 0.78rem; color: var(--muted); padding: 0 8px 8px; }
`);

Hub.registry.register("repository", {
  label: "Repository",
  icon: "folder",
  manualRefresh: true,

  credentialFields: [
    { key: "token", label: "GitHub PAT (optional)", type: "password" }
  ],

  render: function (container, config) {
    var repoName = (config.repo || "").split("/").pop() || "Repository";
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || repoName) + '</h2></div>' +
      '<div class="repo-body"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var bodyEl = container.querySelector(".repo-body");
    var repo = (config.repo || "").trim();
    if (!repo || !repo.includes("/")) {
      bodyEl.innerHTML = '<div class="empty-state">Set a repository (owner/repo) in the widget editor.</div>';
      return;
    }

    var creds = await Hub.credentials.load(config._id);
    var headers = { "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
    if (creds.token) headers["Authorization"] = "Bearer " + creds.token;

    var base = "https://api.github.com/repos/" + encodeURIComponent(repo);
    var store = state.store;

    try {
      var prsLimit = Math.min(config.prsLimit || 5, 20);
      var issuesLimit = Math.min(config.issuesLimit || 5, 20);
      var commitsLimit = Math.min(config.commitsLimit || 5, 20);

      var [repoData, prs, issues, commits] = await Promise.all([
        repoCachedFetch(base, headers, store, config._id),
        prsLimit > 0 ? repoCachedFetch(base + "/pulls?state=open&per_page=" + prsLimit + "&sort=updated", headers, store, config._id) : Promise.resolve([]),
        issuesLimit > 0 ? repoCachedFetch(base + "/issues?state=open&per_page=" + (issuesLimit + prsLimit) + "&filter=all", headers, store, config._id) : Promise.resolve([]),
        commitsLimit > 0 ? repoCachedFetch(base + "/commits?per_page=" + commitsLimit, headers, store, config._id) : Promise.resolve([])
      ]);

      if (token !== state.renderToken) return;

      /* Issues endpoint returns PRs too — filter them out */
      var realIssues = issues.filter(function (i) { return !i.pull_request; }).slice(0, issuesLimit);
      var prIds = new Set((prs || []).map(function (p) { return p.number; }));

      var html = "";

      /* Stats row */
      html +=
        '<div class="repo-stats">' +
          repoStatLink(repoData.html_url + "/stargazers", repoShortNum(repoData.stargazers_count), "Stars") +
          repoStatLink(repoData.html_url + "/network/members", repoShortNum(repoData.forks_count), "Forks") +
          repoStatLink(repoData.html_url + "/issues", repoShortNum(repoData.open_issues_count), "Issues") +
        '</div>';

      if (repoData.description) {
        html += '<div class="repo-desc">' + Hub.escapeHtml(repoData.description) + '</div>';
      }

      /* PRs */
      if (prsLimit > 0 && prs.length) {
        html += '<div class="repo-section-title">Pull Requests</div><div class="repo-list">';
        prs.forEach(function (pr) {
          html += repoRowHtml(pr.html_url, pr.title, "#" + pr.number, repoAge(pr.updated_at));
        });
        html += '</div>';
      }

      /* Issues */
      if (issuesLimit > 0 && realIssues.length) {
        html += '<div class="repo-section-title">Issues</div><div class="repo-list">';
        realIssues.forEach(function (issue) {
          html += repoRowHtml(issue.html_url, issue.title, "#" + issue.number, repoAge(issue.updated_at));
        });
        html += '</div>';
      }

      /* Commits */
      if (commitsLimit > 0 && commits.length) {
        html += '<div class="repo-section-title">Commits</div><div class="repo-list">';
        commits.forEach(function (c) {
          var msg = (c.commit && c.commit.message || "").split("\n")[0];
          var sha = (c.sha || "").slice(0, 7);
          html += repoRowHtml(c.html_url, msg, sha, repoAge(c.commit && c.commit.author && c.commit.author.date));
        });
        html += '</div>';
      }

      bodyEl.innerHTML = html || '<div class="empty-state">No data.</div>';

      /* Push to state.links */
      bodyEl.querySelectorAll("a[data-focusable]").forEach(function (a) {
        state.links.push({ title: a.dataset.title || "", href: a.href, type: "repository" });
      });
    } catch (_) {
      if (token !== state.renderToken) return;
      bodyEl.innerHTML = '<div class="empty-state">Failed to load repository data.</div>';
    }
  },

  renderEditor: function (container, config, onChange) {
    container.replaceChildren();

    var titleLabel = document.createElement("label");
    titleLabel.className = "editor-field";
    titleLabel.innerHTML = '<span>Widget title (optional)</span><input type="text" value="' + Hub.escapeHtml(config.title || "") + '" placeholder="Defaults to repo name" />';
    var titleInput = titleLabel.querySelector("input");
    titleInput.dataset.navHeaderField = "";
    titleInput.addEventListener("input", function (e) { config.title = e.target.value; onChange(config); });
    container.appendChild(titleLabel);

    var repoLabel = document.createElement("label");
    repoLabel.className = "editor-field";
    repoLabel.innerHTML = '<span>Repository</span><input type="text" placeholder="owner/repo" value="' + Hub.escapeHtml(config.repo || "") + '" />';
    repoLabel.querySelector("input").addEventListener("input", function (e) { config.repo = e.target.value.trim(); onChange(config); });
    container.appendChild(repoLabel);

    [
      { key: "prsLimit", label: "Max PRs to show", max: 20, def: 5 },
      { key: "issuesLimit", label: "Max issues to show", max: 20, def: 5 },
      { key: "commitsLimit", label: "Max commits to show", max: 20, def: 5 }
    ].forEach(function (f) {
      var label = document.createElement("label");
      label.className = "editor-field";
      label.innerHTML = '<span>' + f.label + '</span><input type="number" min="0" max="' + f.max + '" value="' + (config[f.key] !== undefined ? config[f.key] : f.def) + '" />';
      label.querySelector("input").addEventListener("input", function (e) {
        var n = parseInt(e.target.value, 10);
        if (!isNaN(n) && n >= 0 && n <= f.max) { config[f.key] = n; onChange(config); }
      });
      container.appendChild(label);
    });
  },

  defaultConfig: function () {
    return { title: "", repo: "", prsLimit: 5, issuesLimit: 5, commitsLimit: 5 };
  }
});

/* ── Helpers ── */

function repoCachedFetch(url, headers, store, cacheScope) {
  var cacheKey = Hub.cache.scopeKey(cacheScope, "repo::" + url);
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
}

function repoStatLink(href, value, label) {
  return '<a class="repo-stat" href="' + Hub.escapeHtml(href) + '" target="_self" rel="noreferrer">' +
    '<span class="repo-stat-value">' + Hub.escapeHtml(String(value)) + '</span>' +
    '<span class="repo-stat-label">' + Hub.escapeHtml(label) + '</span>' +
    '</a>';
}

function repoRowHtml(href, title, num, age) {
  return '<a class="repo-row" href="' + Hub.escapeHtml(href) + '" target="_self" rel="noreferrer" ' +
    'data-focusable="true" data-title="' + Hub.escapeHtml(title) + '">' +
    '<span class="repo-row-title">' + Hub.escapeHtml(title) + '</span>' +
    '<span class="repo-row-num">' + Hub.escapeHtml(num) + '</span>' +
    '<span class="repo-row-age">' + Hub.escapeHtml(age) + '</span>' +
    '</a>';
}

function repoShortNum(n) {
  if (!Number.isFinite(n)) return "0";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function repoAge(dateStr) {
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
