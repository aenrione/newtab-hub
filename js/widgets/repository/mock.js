(window.SB_MOCK_CONFIGS = window.SB_MOCK_CONFIGS || {})["repository"] = {
  repo:         "glanceapp/glance",
  prsLimit:     5,
  issuesLimit:  5,
  commitsLimit: 5
};

(window.SB_MOCKS = window.SB_MOCKS || []).unshift(
  {
    match: "api.github.com/repos/glanceapp%2Fglance",
    data: function (url) {
      if (url.includes("/pulls")) {
        return [
          { title: "feat: add calendar widget improvements",  number: 318, html_url: "https://github.com/glanceapp/glance/pull/318", updated_at: "2026-03-25T14:00:00Z" },
          { title: "fix: weather widget not updating on DST", number: 315, html_url: "https://github.com/glanceapp/glance/pull/315", updated_at: "2026-03-24T10:00:00Z" },
          { title: "chore: bump dependencies",                number: 312, html_url: "https://github.com/glanceapp/glance/pull/312", updated_at: "2026-03-23T08:00:00Z" }
        ];
      }
      if (url.includes("/issues")) {
        return [
          { title: "feat: add calendar widget improvements",  number: 318, html_url: "https://github.com/glanceapp/glance/pull/318",  updated_at: "2026-03-25T14:00:00Z", pull_request: {} },
          { title: "fix: weather widget not updating on DST", number: 315, html_url: "https://github.com/glanceapp/glance/pull/315",  updated_at: "2026-03-24T10:00:00Z", pull_request: {} },
          { title: "chore: bump dependencies",                number: 312, html_url: "https://github.com/glanceapp/glance/pull/312",  updated_at: "2026-03-23T08:00:00Z", pull_request: {} },
          { title: "RSS widget: support Atom feeds",          number: 287, html_url: "https://github.com/glanceapp/glance/issues/287", updated_at: "2026-03-25T09:00:00Z" },
          { title: "Docker: add arm64 image",                 number: 274, html_url: "https://github.com/glanceapp/glance/issues/274", updated_at: "2026-03-24T17:00:00Z" },
          { title: "Crash on startup with empty config",      number: 261, html_url: "https://github.com/glanceapp/glance/issues/261", updated_at: "2026-03-22T11:00:00Z" }
        ];
      }
      if (url.includes("/commits")) {
        return [
          { sha: "f3a1b29", html_url: "https://github.com/glanceapp/glance/commit/f3a1b29", commit: { message: "fix: handle empty feed gracefully", author: { date: "2026-03-25T16:00:00Z" } } },
          { sha: "c8d2e74", html_url: "https://github.com/glanceapp/glance/commit/c8d2e74", commit: { message: "feat: add Twitch top games widget", author: { date: "2026-03-24T12:00:00Z" } } },
          { sha: "b1a9f30", html_url: "https://github.com/glanceapp/glance/commit/b1a9f30", commit: { message: "chore: update go dependencies", author: { date: "2026-03-23T09:00:00Z" } } },
          { sha: "e4c7d82", html_url: "https://github.com/glanceapp/glance/commit/e4c7d82", commit: { message: "docs: add Docker Compose examples", author: { date: "2026-03-22T14:00:00Z" } } },
          { sha: "a2f5c61", html_url: "https://github.com/glanceapp/glance/commit/a2f5c61", commit: { message: "fix: timezone handling in calendar widget", author: { date: "2026-03-21T10:00:00Z" } } }
        ];
      }
      /* Base repo data */
      return {
        name:               "glance",
        full_name:          "glanceapp/glance",
        description:        "A self-hosted dashboard that puts all your feeds in one place",
        html_url:           "https://github.com/glanceapp/glance",
        stargazers_count:   14823,
        forks_count:        487,
        open_issues_count:  43,
        language:           "Go"
      };
    }
  }
);
