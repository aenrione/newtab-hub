(window.SB_MOCK_CONFIGS = window.SB_MOCK_CONFIGS || {})["github-releases"] = {
  repos: ["traefik/traefik", "pi-hole/pi-hole", "nicholaswilde/helm-charts"]
};

/* Releases data is covered by the global storybook-mocks.js:
   match: "api.github.com/repos" → [{name, tag_name, html_url, published_at, prerelease}] */
