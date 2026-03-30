(window.SB_MOCKS = window.SB_MOCKS || []).unshift(
  {
    match: "/api/v1/indexer",
    data: [
      { id: 1, name: "1337x",       enable: true  },
      { id: 2, name: "RARBG Mirror", enable: true  },
      { id: 3, name: "NZBGeek",     enable: true  },
      { id: 4, name: "Jackett",     enable: true  },
      { id: 5, name: "YTS",         enable: true  },
      { id: 6, name: "EZTV",        enable: false }
    ]
  },
  {
    match: "/api/v1/indexerstats",
    data: {
      indexers: [
        { indexerId: 1, numberOfGrabs: 142, numberOfQueries: 3821, numberOfFailedGrabs: 3  },
        { indexerId: 2, numberOfGrabs: 87,  numberOfQueries: 2143, numberOfFailedGrabs: 1  },
        { indexerId: 3, numberOfGrabs: 215, numberOfQueries: 4902, numberOfFailedGrabs: 7  },
        { indexerId: 4, numberOfGrabs: 63,  numberOfQueries: 1872, numberOfFailedGrabs: 0  },
        { indexerId: 5, numberOfGrabs: 34,  numberOfQueries: 987,  numberOfFailedGrabs: 2  },
        { indexerId: 6, numberOfGrabs: 0,   numberOfQueries: 0,    numberOfFailedGrabs: 0  }
      ]
    }
  }
);
