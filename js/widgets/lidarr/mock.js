(window.SB_MOCKS = window.SB_MOCKS || []).unshift(
  {
    match: "/api/v1/artist",
    data: [
      { id: 1,  artistName: "Radiohead" },
      { id: 2,  artistName: "Boards of Canada" },
      { id: 3,  artistName: "Four Tet" },
      { id: 4,  artistName: "Aphex Twin" },
      { id: 5,  artistName: "Portishead" },
      { id: 6,  artistName: "Massive Attack" },
      { id: 7,  artistName: "The National" },
      { id: 8,  artistName: "Bon Iver" },
      { id: 9,  artistName: "Nick Cave & The Bad Seeds" },
      { id: 10, artistName: "PJ Harvey" },
      { id: 11, artistName: "Burial" },
      { id: 12, artistName: "Floating Points" }
    ]
  },
  {
    match: "/api/v1/wanted/missing",
    data: { totalRecords: 7, records: [] }
  },
  {
    match: "/api/v1/queue/status",
    data: { totalCount: 3 }
  }
);
