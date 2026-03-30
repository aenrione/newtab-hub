(window.SB_MOCKS = window.SB_MOCKS || []).unshift(
  {
    match: "/jsonrpc",
    data: {
      result: {
        DownloadRate:      9437184,  /* ~9 MB/s in bytes/s (NZBGet reports B/s) */
        RemainingSizeMB:   18240,
        DownloadPaused:    false,
        FreeDiskSpaceMB:   512000    /* ~500 GB */
      }
    }
  }
);
