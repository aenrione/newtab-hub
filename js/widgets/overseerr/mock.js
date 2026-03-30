(window.SB_MOCKS = window.SB_MOCKS || []).unshift(
  {
    match: "/api/v1/request/count",
    data: {
      pending:   8,
      approved:  23,
      available: 187,
      total:     218
    }
  }
);
