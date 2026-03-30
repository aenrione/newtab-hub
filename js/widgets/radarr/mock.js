(window.SB_MOCKS = window.SB_MOCKS || []).unshift(
  {
    match: "/api/v3/movie",
    data: [
      { id: 1,  title: "Dune: Part Two",        monitored: true,  hasFile: true  },
      { id: 2,  title: "A Quiet Place: Day One", monitored: true,  hasFile: true  },
      { id: 3,  title: "Gladiator II",           monitored: true,  hasFile: true  },
      { id: 4,  title: "Kingdom of the Planet of the Apes", monitored: true, hasFile: false },
      { id: 5,  title: "The Matrix Resurrections", monitored: false, hasFile: true },
      { id: 6,  title: "Blade Runner 2049",      monitored: false, hasFile: true  },
      { id: 7,  title: "Civil War",              monitored: true,  hasFile: false },
      { id: 8,  title: "Oppenheimer",            monitored: false, hasFile: true  },
      { id: 9,  title: "Poor Things",            monitored: true,  hasFile: true  },
      { id: 10, title: "The Zone of Interest",   monitored: true,  hasFile: false }
    ]
  },
  {
    match: "/api/v3/queue/status",
    data: { totalCount: 2 }
  }
);
