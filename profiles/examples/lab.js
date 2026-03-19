window.NEW_TAB_PRIVATE_PROFILES = window.NEW_TAB_PRIVATE_PROFILES || {};

window.NEW_TAB_PRIVATE_PROFILES.lab = {
  label: "Lab",
  widgets: [
    { id: "search", type: "search", col: 1, row: 1, width: 12, height: 1, config: { searchBaseUrl: "https://duckduckgo.com/?q=" } },
    { id: "pinned", type: "pinned-links", col: 1, row: 2, width: 12, height: 1, config: {
      items: [
        { title: "Router", href: "http://192.168.1.1/" },
        { title: "Proxmox", href: "https://proxmox.local/" }
      ]
    }},
    { id: "infra", type: "link-group", col: 1, row: 3, width: 6, height: 1, config: {
      title: "Infrastructure",
      items: [
        { title: "NAS", href: "http://nas.local/" },
        { title: "Pi-hole", href: "http://pi.hole/admin/" }
      ]
    }}
  ]
};
