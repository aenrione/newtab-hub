(window.SB_MOCKS = window.SB_MOCKS || []).unshift(
  {
    match: "/Items/Counts",
    data: {
      MovieCount:   1847,
      SeriesCount:  213,
      EpisodeCount: 6492,
      SongCount:    0,
      BookCount:    0
    }
  },
  {
    match: "/Sessions",
    data: [
      { Id: "s1", UserName: "alfredo", NowPlayingItem: { Name: "Dune: Part Two", Type: "Movie" }, Client: "Jellyfin Web" },
      { Id: "s2", UserName: "guest",   NowPlayingItem: { Name: "Severance S02E06", Type: "Episode" }, Client: "Roku" },
      { Id: "s3", UserName: "kids",    NowPlayingItem: null, Client: "Android TV" }
    ]
  }
);
