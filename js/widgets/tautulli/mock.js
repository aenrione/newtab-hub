(window.SB_MOCKS = window.SB_MOCKS || []).unshift(
  {
    match: "/api/v2",
    data: {
      response: {
        result: "success",
        data: {
          stream_count:              3,
          stream_count_direct_play:  2,
          stream_count_direct_stream: 0,
          stream_count_transcode:    1,
          total_bandwidth:           18400,
          lan_bandwidth:             12800,
          wan_bandwidth:             5600,
          sessions: []
        }
      }
    }
  }
);
