window.NEW_TAB_PRIVATE_PROFILES = window.NEW_TAB_PRIVATE_PROFILES || {};

window.NEW_TAB_PRIVATE_PROFILES.work = {
  pinnedLinks: [{ title: "Private Admin", href: "https://example.internal/" }],
  linkGroups: [
    {
      title: "Workspace",
      items: [{ title: "Staging", href: "https://staging.example.internal/" }]
    },
    {
      title: "Machine Local",
      items: [
        { title: "Router", href: "http://192.168.1.1/" },
        { title: "NAS", href: "http://nas.local/" }
      ]
    }
  ]
};
