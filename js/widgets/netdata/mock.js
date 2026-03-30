(window.SB_MOCKS = window.SB_MOCKS || []).unshift(
  {
    match: "/api/v1/data?chart=system.cpu",
    data: {
      labels: ["time", "user", "system", "iowait", "irq", "softirq"],
      data: [[1743000000, 14.2, 3.8, 0.6, 0.1, 0.3]]
    }
  },
  {
    match: "/api/v1/data?chart=system.ram",
    data: {
      labels: ["time", "used", "cached", "buffers", "free"],
      data: [[1743000000, 6580, 3210, 890, 5700]]
    }
  }
);
