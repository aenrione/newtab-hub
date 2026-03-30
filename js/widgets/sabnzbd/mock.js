(window.SB_MOCKS = window.SB_MOCKS || []).unshift(
  {
    match: "/api?mode=queue",
    data: {
      queue: {
        noofslots: 4,
        kbpersec:  "8742.34",
        mbleft:    "23480",
        timeleft:  "0:46:12",
        paused:    false
      }
    }
  }
);
