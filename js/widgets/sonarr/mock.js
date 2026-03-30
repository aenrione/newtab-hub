(window.SB_MOCKS = window.SB_MOCKS || []).unshift(
  {
    match: "/api/v3/calendar",
    data: [
      { seriesId: 1, seasonNumber: 2, episodeNumber: 6,  airDateUtc: "2026-03-26T02:00:00Z", title: "The Visitor" },
      { seriesId: 2, seasonNumber: 1, episodeNumber: 3,  airDateUtc: "2026-03-26T02:00:00Z", title: "Origins" },
      { seriesId: 1, seasonNumber: 2, episodeNumber: 7,  airDateUtc: "2026-03-27T02:00:00Z", title: "The Return" },
      { seriesId: 3, seasonNumber: 4, episodeNumber: 12, airDateUtc: "2026-03-28T02:00:00Z", title: "Finale" },
      { seriesId: 4, seasonNumber: 1, episodeNumber: 1,  airDateUtc: "2026-03-29T02:00:00Z", title: "Pilot" },
      { seriesId: 2, seasonNumber: 1, episodeNumber: 4,  airDateUtc: "2026-03-30T02:00:00Z", title: "The Deep" }
    ]
  },
  {
    match: "/api/v3/series",
    data: [
      { id: 1, title: "Severance",      titleSlug: "severance" },
      { id: 2, title: "Silo",           titleSlug: "silo" },
      { id: 3, title: "The Last of Us", titleSlug: "the-last-of-us" },
      { id: 4, title: "Andor",          titleSlug: "andor" }
    ]
  }
);
