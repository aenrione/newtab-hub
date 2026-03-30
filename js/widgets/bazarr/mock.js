(window.SB_MOCKS = window.SB_MOCKS || []).unshift(
  {
    match: "/api/movies/wanted",
    data: { total: 14, data: [] }
  },
  {
    match: "/api/episodes/wanted",
    data: { total: 37, data: [] }
  }
);
