(window.SB_MOCK_CONFIGS = window.SB_MOCK_CONFIGS || {})["transmission"] = {
  url: "http://localhost:9091"
};

(window.SB_MOCKS = window.SB_MOCKS || []).unshift({
  match: "/transmission/rpc",
  data: {
    result: "success",
    arguments: {
      activeTorrentCount: 3,
      pausedTorrentCount: 5,
      downloadSpeed: 1536000,
      uploadSpeed:   204800,
      torrentCount:  8
    }
  }
});
