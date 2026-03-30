(window.SB_MOCK_CONFIGS = window.SB_MOCK_CONFIGS || {})["custom-api"] = {
  title:    "Server Stats",
  url:      "http://localhost:8080/api/metrics",
  method:   "GET",
  template: "{{service}} — {{status}} ({{uptime}})",
  limit:    8
};

(window.SB_MOCKS = window.SB_MOCKS || []).unshift(
  {
    match: "localhost:8080/api/metrics",
    data: [
      { service: "nginx",       status: "running", uptime: "47d 3h" },
      { service: "postgresql",  status: "running", uptime: "47d 3h" },
      { service: "redis",       status: "running", uptime: "12d 7h" },
      { service: "caddy",       status: "running", uptime: "47d 3h" },
      { service: "gitea",       status: "running", uptime: "32d 1h" },
      { service: "vaultwarden", status: "running", uptime: "47d 3h" },
      { service: "uptime-kuma", status: "running", uptime: "15d 9h" },
      { service: "healthchecks",status: "stopped", uptime: "0d 0h"  }
    ]
  }
);
