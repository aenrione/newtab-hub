(window.SB_MOCKS = window.SB_MOCKS || []).unshift(
  {
    match: "/api/v1/book",
    data: [
      { id: 1,  title: "The Way of Kings",         statistics: { bookFileCount: 1 } },
      { id: 2,  title: "Words of Radiance",        statistics: { bookFileCount: 1 } },
      { id: 3,  title: "Oathbringer",              statistics: { bookFileCount: 1 } },
      { id: 4,  title: "Rhythm of War",            statistics: { bookFileCount: 1 } },
      { id: 5,  title: "The Final Empire",         statistics: { bookFileCount: 1 } },
      { id: 6,  title: "The Well of Ascension",    statistics: { bookFileCount: 1 } },
      { id: 7,  title: "The Hero of Ages",         statistics: { bookFileCount: 1 } },
      { id: 8,  title: "Elantris",                 statistics: { bookFileCount: 0 } },
      { id: 9,  title: "Warbreaker",               statistics: { bookFileCount: 0 } },
      { id: 10, title: "The Sunlit Man",           statistics: { bookFileCount: 0 } },
      { id: 11, title: "Tress of the Emerald Sea", statistics: { bookFileCount: 0 } },
      { id: 12, title: "Yumi and the Nightmare Painter", statistics: { bookFileCount: 0 } }
    ]
  },
  {
    match: "/api/v1/wanted/missing",
    data: { totalRecords: 5, records: [] }
  },
  {
    match: "/api/v1/queue/status",
    data: { totalCount: 1 }
  }
);
