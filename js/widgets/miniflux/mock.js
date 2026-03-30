(window.SB_MOCKS = window.SB_MOCKS || []).unshift(
  {
    match: "/v1/feeds",
    data: [
      { id: 1,  title: "The Verge",          site_url: "https://www.theverge.com" },
      { id: 2,  title: "Ars Technica",       site_url: "https://arstechnica.com"  },
      { id: 3,  title: "Lobsters",           site_url: "https://lobste.rs"        },
      { id: 4,  title: "Hacker News",        site_url: "https://news.ycombinator.com" },
      { id: 5,  title: "Jeff Geerling",      site_url: "https://www.jeffgeerling.com" },
      { id: 6,  title: "Low Tech Magazine",  site_url: "https://www.lowtechmagazine.com" },
      { id: 7,  title: "Drew DeVault",       site_url: "https://drewdevault.com"  },
      { id: 8,  title: "Julia Evans",        site_url: "https://jvns.ca"          },
      { id: 9,  title: "Simon Willison",     site_url: "https://simonwillison.net" },
      { id: 10, title: "WIRED",              site_url: "https://www.wired.com"    }
    ]
  },
  {
    match: "/v1/entries",
    data: { total: 142 }
  }
);
