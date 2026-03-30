(window.SB_MOCK_CONFIGS = window.SB_MOCK_CONFIGS || {})["change-detection"] = {
  url:   "http://localhost:5000",
  limit: 10
};

(window.SB_MOCKS = window.SB_MOCKS || []).unshift(
  {
    match: "/api/v1/watch",
    data: {
      "a1b2c3d4-0001": {
        url:          "https://store.example.com/product/gpu",
        title:        "GPU price tracker",
        last_changed: Math.floor(Date.now() / 1000) - 3600,
        last_checked: Math.floor(Date.now() / 1000) - 300,
        last_error:   false
      },
      "a1b2c3d4-0002": {
        url:          "https://github.com/glanceapp/glance/releases",
        title:        "Glance releases",
        last_changed: Math.floor(Date.now() / 1000) - 86400,
        last_checked: Math.floor(Date.now() / 1000) - 600,
        last_error:   false
      },
      "a1b2c3d4-0003": {
        url:          "https://pve.example.local",
        title:        "Proxmox login page",
        last_changed: Math.floor(Date.now() / 1000) - 1209600,
        last_checked: Math.floor(Date.now() / 1000) - 120,
        last_error:   "Connection refused"
      },
      "a1b2c3d4-0004": {
        url:          "https://docs.example.com/changelog",
        title:        "Internal docs changelog",
        last_changed: Math.floor(Date.now() / 1000) - 7200,
        last_checked: Math.floor(Date.now() / 1000) - 180,
        last_error:   false
      },
      "a1b2c3d4-0005": {
        url:          "https://status.example.com",
        title:        "Service status page",
        last_changed: Math.floor(Date.now() / 1000) - 604800,
        last_checked: Math.floor(Date.now() / 1000) - 60,
        last_error:   false
      }
    }
  }
);
