/* ── Storybook mock data ──
   Each entry: { match: <url-substring>, data: <object|fn(url)> }
   The first match wins. Used by all three Hub interceptors.
── */

window.SB_MOCKS = [

  /* ── Weather (open-meteo) ── */
  {
    match: "geocoding-api.open-meteo.com",
    data: {
      results: [{
        name: "San Francisco", country: "United States", country_code: "US",
        latitude: 37.7749, longitude: -122.4194
      }]
    }
  },
  {
    match: "api.open-meteo.com/v1/forecast",
    data: {
      current: {
        time: "2026-03-25T14:00",
        temperature_2m: 18, apparent_temperature: 15, weathercode: 2
      },
      hourly: {
        temperature_2m: [12,12,11,11,11,12,13,14,15,16,17,18,18,18,18,17,16,15,14,14,13,13,12,12],
        precipitation_probability: [0,0,0,0,0,0,0,0,0,5,10,15,20,15,10,5,0,0,0,0,0,0,0,0]
      },
      daily: {
        sunrise: ["2026-03-25T06:48"],
        sunset:  ["2026-03-25T19:33"]
      }
    }
  },

  /* ── Hacker News (Algolia) ── */
  {
    match: "hn.algolia.com/api/v1/search",
    data: {
      hits: [
        { objectID: "42000001", title: "Show HN: I built a self-hosted dashboard in vanilla JS", url: "https://github.com/example/dashboard", points: 847, num_comments: 234, created_at: "2026-03-25T08:00:00.000Z" },
        { objectID: "42000002", title: "Ask HN: What's your home server setup in 2026?", url: null, points: 634, num_comments: 412, created_at: "2026-03-25T07:00:00.000Z" },
        { objectID: "42000003", title: "SQLite is not a toy database", url: "https://antonz.org/sqlite-is-not-a-toy-database/", points: 512, num_comments: 89, created_at: "2026-03-25T06:00:00.000Z" },
        { objectID: "42000004", title: "The unreasonable effectiveness of just showing up", url: "https://example.com/showing-up", points: 498, num_comments: 67, created_at: "2026-03-25T05:00:00.000Z" },
        { objectID: "42000005", title: "Postgres is eating the database world", url: "https://medium.com/example/postgres", points: 443, num_comments: 156, created_at: "2026-03-25T04:00:00.000Z" },
        { objectID: "42000006", title: "How we reduced our cloud bill by 70%", url: "https://blog.example.com/cloud-costs", points: 389, num_comments: 201, created_at: "2026-03-25T03:00:00.000Z" },
        { objectID: "42000007", title: "Launch HN: Glance — a self-hosted dashboard", url: "https://github.com/glanceapp/glance", points: 356, num_comments: 78, created_at: "2026-03-25T02:00:00.000Z" },
        { objectID: "42000008", title: "Why I stopped using VS Code", url: "https://example.com/vscode", points: 312, num_comments: 445, created_at: "2026-03-25T01:00:00.000Z" }
      ]
    }
  },

  /* ── Lobsters ── */
  {
    match: "lobste.rs",
    data: [
      { url: "https://example.com/rust-async", comments_url: "https://lobste.rs/s/abc1", title: "Understanding async Rust from the ground up", created_at: "2026-03-25T09:00:00.000Z", tags: ["rust", "programming"], score: 87, comment_count: 23 },
      { url: "https://example.com/nix-intro", comments_url: "https://lobste.rs/s/abc2", title: "NixOS: reproducible systems for the rest of us", created_at: "2026-03-25T08:30:00.000Z", tags: ["linux", "nix"], score: 74, comment_count: 18 },
      { url: "https://example.com/sql-tricks", comments_url: "https://lobste.rs/s/abc3", title: "10 SQL tricks you might not know", created_at: "2026-03-25T07:15:00.000Z", tags: ["sql"], score: 61, comment_count: 9 },
      { url: "https://example.com/go-gc", comments_url: "https://lobste.rs/s/abc4", title: "Deep dive into Go's garbage collector", created_at: "2026-03-25T06:00:00.000Z", tags: ["go", "programming"], score: 55, comment_count: 12 },
      { url: "https://example.com/terminal-ux", comments_url: "https://lobste.rs/s/abc5", title: "The case for better terminal UX", created_at: "2026-03-25T05:00:00.000Z", tags: ["cli", "ux"], score: 49, comment_count: 31 }
    ]
  },

  /* ── Reddit ── */
  {
    match: "reddit.com/r/",
    data: {
      data: {
        children: [
          { data: { title: "I built a home lab with 3 Raspberry Pis and learned more than any tutorial", is_self: true, permalink: "/r/homelab/comments/ex1/", url: "https://reddit.com/r/homelab/comments/ex1/", score: 4821, num_comments: 312, link_flair_text: "Success", created_utc: 1742900000 } },
          { data: { title: "Release: v4.0 of my open-source monitoring tool", is_self: false, permalink: "/r/selfhosted/comments/ex2/", url: "https://github.com/example/monitor", score: 2134, num_comments: 89, link_flair_text: null, created_utc: 1742890000 } },
          { data: { title: "PSA: back up your configs before upgrading Docker", is_self: true, permalink: "/r/selfhosted/comments/ex3/", url: "https://reddit.com/r/selfhosted/comments/ex3/", score: 1876, num_comments: 145, link_flair_text: "Tips", created_utc: 1742880000 } },
          { data: { title: "After 2 years on Plex I switched to Jellyfin – here's why", is_self: true, permalink: "/r/selfhosted/comments/ex4/", url: "https://reddit.com/r/selfhosted/comments/ex4/", score: 1543, num_comments: 267, link_flair_text: null, created_utc: 1742870000 } },
          { data: { title: "Proxmox 8.2 released with improved cluster management", is_self: false, permalink: "/r/homelab/comments/ex5/", url: "https://forum.proxmox.com/", score: 987, num_comments: 54, link_flair_text: "News", created_utc: 1742860000 } }
        ]
      }
    }
  },

  /* ── Markets (Yahoo Finance) ── */
  {
    match: "query1.finance.yahoo.com",
    data: function (url) {
      var sym = (url.match(/chart\/([^?]+)/) || [])[1] || "DEMO";
      var base = { AAPL: 213.49, TSLA: 248.80, NVDA: 875.40, MSFT: 415.20, BTC: 72400, ETH: 3890 }[sym] || 100;
      var prev = +(base * 0.98).toFixed(2);
      var prices = [];
      for (var i = 0; i < 22; i++) prices.push(+(prev + (Math.random() - 0.5) * prev * 0.02).toFixed(2));
      prices.push(base);
      return {
        chart: {
          result: [{
            meta: {
              regularMarketPrice: base,
              chartPreviousClose: prev,
              previousClose: prev,
              regularMarketChangePercent: +((base - prev) / prev * 100).toFixed(2)
            },
            indicators: { quote: [{ close: prices }] }
          }]
        }
      };
    }
  },

  /* ── Sonarr ── */
  {
    match: "/api/v3/calendar",
    data: [
      { seriesId: 1, seasonNumber: 2, episodeNumber: 6,  airDateUtc: "2026-03-25T02:00:00Z", title: "The Visitor" },
      { seriesId: 2, seasonNumber: 1, episodeNumber: 3,  airDateUtc: "2026-03-25T02:00:00Z", title: "Origins" },
      { seriesId: 1, seasonNumber: 2, episodeNumber: 7,  airDateUtc: "2026-03-26T02:00:00Z", title: "The Return" },
      { seriesId: 3, seasonNumber: 4, episodeNumber: 12, airDateUtc: "2026-03-27T02:00:00Z", title: "Finale" }
    ]
  },
  {
    match: "/api/v3/series",
    data: [
      { id: 1, title: "Severance",    titleSlug: "severance" },
      { id: 2, title: "Silo",         titleSlug: "silo" },
      { id: 3, title: "The Last of Us", titleSlug: "the-last-of-us" }
    ]
  },

  /* ── Radarr ── */
  {
    match: "/api/v3/movie",
    data: [
      { id: 1,  title: "Dune: Part Two",   monitored: true,  hasFile: true },
      { id: 2,  title: "A Quiet Place 3",  monitored: true,  hasFile: false },
      { id: 3,  title: "Gladiator II",     monitored: true,  hasFile: true },
      { id: 4,  title: "Interstellar 2",   monitored: false, hasFile: false },
      { id: 5,  title: "The Matrix 5",     monitored: true,  hasFile: false },
      { id: 6,  title: "Blade Runner 3",   monitored: true,  hasFile: true },
      { id: 7,  title: "Avatar 4",         monitored: false, hasFile: false },
      { id: 8,  title: "Oppenheimer 2",    monitored: true,  hasFile: true }
    ]
  },
  {
    match: "/api/v3/queue/status",
    data: { totalCount: 2 }
  },

  /* ── GitHub PRs (fetchWithTimeout → res.json()) ── */
  {
    match: "api.github.com/search/issues",
    data: {
      total_count: 5,
      items: [
        { title: "feat: add dark mode toggle",           number: 142, html_url: "https://github.com/org/repo/pull/142", repository_url: "https://api.github.com/repos/org/frontend", updated_at: "2026-03-25T10:30:00Z", draft: false },
        { title: "fix: memory leak in event listeners",  number: 141, html_url: "https://github.com/org/repo/pull/141", repository_url: "https://api.github.com/repos/org/frontend", updated_at: "2026-03-25T09:00:00Z", draft: false },
        { title: "refactor: migrate to TypeScript",      number: 138, html_url: "https://github.com/org/repo/pull/138", repository_url: "https://api.github.com/repos/org/backend",  updated_at: "2026-03-24T18:00:00Z", draft: true  },
        { title: "docs: update API reference",           number: 137, html_url: "https://github.com/org/repo/pull/137", repository_url: "https://api.github.com/repos/org/docs",     updated_at: "2026-03-24T15:00:00Z", draft: false },
        { title: "chore: bump dependencies",             number: 135, html_url: "https://github.com/org/repo/pull/135", repository_url: "https://api.github.com/repos/org/backend",  updated_at: "2026-03-24T12:00:00Z", draft: false }
      ]
    }
  },

  /* ── GitHub Releases (fetchWithTimeout → res.json()) ── */
  {
    match: "api.github.com/repos",
    data: [
      { name: "v3.2.0",      tag_name: "v3.2.0",      html_url: "https://github.com/org/repo/releases/tag/v3.2.0",      published_at: "2026-03-20T12:00:00Z", prerelease: false },
      { name: "v3.1.4",      tag_name: "v3.1.4",      html_url: "https://github.com/org/repo/releases/tag/v3.1.4",      published_at: "2026-03-10T10:00:00Z", prerelease: false },
      { name: "v3.2.0-beta", tag_name: "v3.2.0-beta", html_url: "https://github.com/org/repo/releases/tag/v3.2.0-beta", published_at: "2026-03-25T08:00:00Z", prerelease: true  }
    ]
  },

  /* ── Pi-hole ── */
  {
    match: "/admin/api.php",
    data: {
      dns_queries_today: 18453,
      ads_blocked_today: 2847,
      ads_percentage_today: 15.43,
      domains_being_blocked: 93542
    }
  },

  /* ── AdGuard ── */
  {
    match: "/control/stats",
    data: {
      num_dns_queries: 21870,
      num_blocked_filtering: 3241,
      num_replaced_safebrowsing: 12,
      num_replaced_parental: 0,
      avg_processing_time: 0.0042
    }
  },

  /* ── Portainer endpoints ── */
  {
    match: "/api/endpoints",
    data: [{ Id: 1, Name: "local", Type: 1 }]
  },
  /* Portainer containers (any endpoint ID) */
  {
    match: "/docker/containers/json",
    data: [
      { Id: "abc001", Names: ["/sonarr"],      State: "running", Status: "Up 3 days" },
      { Id: "abc002", Names: ["/radarr"],      State: "running", Status: "Up 3 days" },
      { Id: "abc003", Names: ["/jellyfin"],    State: "running", Status: "Up 3 days" },
      { Id: "abc004", Names: ["/portainer"],   State: "running", Status: "Up 5 days" },
      { Id: "abc005", Names: ["/overseerr"],   State: "running", Status: "Up 2 days" },
      { Id: "abc006", Names: ["/prowlarr"],    State: "exited",  Status: "Exited (1) 2 hours ago" },
      { Id: "abc007", Names: ["/sabnzbd"],     State: "running", Status: "Up 1 day" },
      { Id: "abc008", Names: ["/nextcloud"],   State: "running", Status: "Up 7 days" }
    ]
  },

  /* ── Proxmox ── */
  {
    match: "/api2/json/cluster/resources",
    data: {
      data: [
        { type: "node",   id: "node/pve1",     status: "online",  maxcpu: 8,  cpu: 0.12, maxmem: 34359738368, mem: 12884901888 },
        { type: "node",   id: "node/pve2",     status: "online",  maxcpu: 4,  cpu: 0.05, maxmem: 17179869184, mem: 4294967296 },
        { type: "qemu",   id: "qemu/100",      status: "running", maxcpu: 2,  cpu: 0.08, maxmem: 4294967296,  mem: 2147483648, template: 0 },
        { type: "qemu",   id: "qemu/101",      status: "running", maxcpu: 4,  cpu: 0.22, maxmem: 8589934592,  mem: 6442450944, template: 0 },
        { type: "qemu",   id: "qemu/102",      status: "stopped", maxcpu: 2,  cpu: 0,    maxmem: 4294967296,  mem: 0,          template: 0 },
        { type: "lxc",    id: "lxc/200",       status: "running", maxcpu: 1,  cpu: 0.02, maxmem: 1073741824,  mem: 536870912,  template: 0 },
        { type: "lxc",    id: "lxc/201",       status: "running", maxcpu: 1,  cpu: 0.01, maxmem: 2147483648,  mem: 1073741824, template: 0 }
      ]
    }
  },

  /* ── Miniflux ── */
  {
    match: "/v1/feeds",
    data: [
      { id: 1, title: "The Verge" },
      { id: 2, title: "Ars Technica" },
      { id: 3, title: "Lobsters" },
      { id: 4, title: "HN" },
      { id: 5, title: "Hacker News" }
    ]
  },
  {
    match: "/v1/entries",
    data: { total: 47 }
  },

  /* ── Speedtest Tracker ── */
  {
    match: "/api/v1/results/latest",
    data: {
      data: { download: 948.7, upload: 487.3, ping: 4.2 }
    }
  },

  /* ── YouTube ── */
  {
    match: "googleapis.com/youtube/v3/search",
    data: {
      items: [
        { id: { videoId: "dQw4w9WgXcQ" }, snippet: { title: "Building a home lab in 2026",          publishedAt: "2026-03-25T10:00:00Z", channelTitle: "Tech With Tim",     thumbnails: { medium: { url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg" } } } },
        { id: { videoId: "dQw4w9WgXcE" }, snippet: { title: "NixOS full setup guide",               publishedAt: "2026-03-24T18:00:00Z", channelTitle: "Tech With Tim",     thumbnails: { medium: { url: "https://i.ytimg.com/vi/dQw4w9WgXcE/mqdefault.jpg" } } } },
        { id: { videoId: "dQw4w9WgXcR" }, snippet: { title: "Self-hosting everything in 2026",      publishedAt: "2026-03-23T14:00:00Z", channelTitle: "Wolfgang's Channel", thumbnails: { medium: { url: "https://i.ytimg.com/vi/dQw4w9WgXcR/mqdefault.jpg" } } } },
        { id: { videoId: "dQw4w9WgXcT" }, snippet: { title: "Proxmox cluster setup from scratch",   publishedAt: "2026-03-22T12:00:00Z", channelTitle: "Tech With Tim",     thumbnails: { medium: { url: "https://i.ytimg.com/vi/dQw4w9WgXcT/mqdefault.jpg" } } } }
      ]
    }
  },

  /* ── Feeds (RSS — Hub.cachedFetch returns text) ── */
  {
    match: "rss",
    data: '<?xml version="1.0"?><rss version="2.0"><channel><title>Mock Feed</title><item><title>Self-hosted tools you should know in 2026</title><link>https://example.com/article1</link><pubDate>Tue, 25 Mar 2026 08:00:00 GMT</pubDate></item><item><title>How to set up Tailscale on your home server</title><link>https://example.com/article2</link><pubDate>Mon, 24 Mar 2026 12:00:00 GMT</pubDate></item><item><title>Nginx vs Caddy in 2026: a practical guide</title><link>https://example.com/article3</link><pubDate>Sun, 23 Mar 2026 09:00:00 GMT</pubDate></item></channel></rss>'
  },

  /* ── Monitor (Hub.fetchWithTimeout — just needs ok:true) ── */
  /* Handled by the default "ok" fallback in the interceptor */

  /* ── Catch-all: any /api/ call returns 200 OK with empty array ── */
  {
    match: "/api/",
    data: []
  }
];
