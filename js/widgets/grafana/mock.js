(window.SB_MOCK_CONFIGS = window.SB_MOCK_CONFIGS || {})["grafana"] = {
  instanceUrl: "http://localhost:3000",
  mode:        "alerts"
};

(window.SB_MOCKS = window.SB_MOCKS || []).unshift(
  {
    match: "/api/alertmanager/grafana/api/v2/alerts",
    data: [
      {
        labels:      { alertname: "HighCPUUsage", severity: "warning", instance: "pve1:9100" },
        annotations: { summary: "CPU usage above 85% for 10 minutes" },
        status:      { state: "active" },
        startsAt:    "2026-03-26T13:45:00Z"
      },
      {
        labels:      { alertname: "DiskSpaceLow", severity: "critical", instance: "nas:9100", mountpoint: "/data" },
        annotations: { summary: "Disk at 92% capacity" },
        status:      { state: "active" },
        startsAt:    "2026-03-26T12:00:00Z"
      },
      {
        labels:      { alertname: "ContainerRestarting", severity: "warning", container: "prowlarr" },
        annotations: { summary: "Container has restarted 3 times in 1 hour" },
        status:      { state: "unprocessed" },
        startsAt:    "2026-03-26T14:10:00Z"
      },
      {
        labels:      { alertname: "BackupFailed", severity: "warning", job: "restic-nas" },
        annotations: { summary: "Last successful backup was 26 hours ago" },
        status:      { state: "suppressed" },
        startsAt:    "2026-03-25T10:00:00Z"
      }
    ]
  },
  {
    match: "/api/ds/query",
    data: {
      results: {
        A: {
          frames: [{
            data: {
              values: [
                [1743000000000],
                [18.6]
              ]
            }
          }]
        }
      }
    }
  }
);
