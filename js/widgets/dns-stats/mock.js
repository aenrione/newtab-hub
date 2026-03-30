(window.SB_MOCK_CONFIGS = window.SB_MOCK_CONFIGS || {})["dns-stats"] = {
  url:     "http://pi.hole",
  service: "pihole6"
};

(window.SB_MOCKS = window.SB_MOCKS || []).unshift(
  /* Pi-hole v6 auth */
  {
    match: "/api/auth",
    data: {
      session: { valid: true, sid: "mock-sid-abc123", message: "success", csrf: "" }
    }
  },
  /* Pi-hole v6 summary */
  {
    match: "/api/stats/summary",
    data: {
      queries: {
        total:   28473,
        blocked: 5312,
        percent_blocked: 18.66
      },
      gravity: {
        domains_being_blocked: 127834
      },
      clients: {
        active: 11,
        total:  23
      }
    }
  }
);
