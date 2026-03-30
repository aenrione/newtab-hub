(window.SB_MOCKS = window.SB_MOCKS || []).unshift(
  {
    match: "/api/endpoints",
    data: [
      { Id: 1, Name: "local",   Type: 1 },
      { Id: 2, Name: "staging", Type: 1 }
    ]
  },
  {
    match: "/docker/containers/json",
    data: [
      { Id: "abc001", Names: ["/sonarr"],        State: "running", Status: "Up 5 days"              },
      { Id: "abc002", Names: ["/radarr"],        State: "running", Status: "Up 5 days"              },
      { Id: "abc003", Names: ["/jellyfin"],      State: "running", Status: "Up 12 days"             },
      { Id: "abc004", Names: ["/portainer"],     State: "running", Status: "Up 14 days"             },
      { Id: "abc005", Names: ["/overseerr"],     State: "running", Status: "Up 3 days"              },
      { Id: "abc006", Names: ["/prowlarr"],      State: "exited",  Status: "Exited (1) 2 hours ago" },
      { Id: "abc007", Names: ["/sabnzbd"],       State: "running", Status: "Up 2 days"              },
      { Id: "abc008", Names: ["/nextcloud"],     State: "running", Status: "Up 21 days"             },
      { Id: "abc009", Names: ["/paperless-ngx"], State: "running", Status: "Up 7 days"              },
      { Id: "abc010", Names: ["/mealie"],        State: "running", Status: "Up 7 days"              },
      { Id: "abc011", Names: ["/immich"],        State: "running", Status: "Up 3 days"              },
      { Id: "abc012", Names: ["/traefik"],       State: "running", Status: "Up 30 days"             }
    ]
  }
);
