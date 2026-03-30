(window.SB_MOCKS = window.SB_MOCKS || []).unshift(
  {
    match: "/status/sessions",
    data: {
      MediaContainer: {
        size: 2,
        Metadata: [
          { title: "Oppenheimer", type: "movie",   User: { title: "alfredo" } },
          { title: "The Bear S03E01", type: "episode", User: { title: "guest" } }
        ]
      }
    }
  },
  {
    match: "/library/sections",
    data: {
      MediaContainer: {
        Directory: [
          { type: "movie",  title: "Movies",       key: "1" },
          { type: "movie",  title: "4K Movies",    key: "2" },
          { type: "show",   title: "TV Shows",     key: "3" },
          { type: "show",   title: "Anime",        key: "4" },
          { type: "artist", title: "Music",        key: "5" }
        ]
      }
    }
  }
);
