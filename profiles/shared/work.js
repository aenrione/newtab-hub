window.NEW_TAB_SHARED_PROFILES = window.NEW_TAB_SHARED_PROFILES || {};

window.NEW_TAB_SHARED_PROFILES.work = {
  label: "Work",
  widgets: [
    { id: "search", type: "search", col: 1, row: 1, width: 12, height: 1, config: { searchBaseUrl: "https://duckduckgo.com/?q=" } },
    { id: "pinned", type: "pinned-links", col: 1, row: 2, width: 12, height: 1, config: {
      items: [
        { title: "Gmail", href: "https://mail.google.com/", badge: "Inbox" },
        { title: "Calendar", href: "https://calendar.google.com/" },
        { title: "Linear", href: "https://linear.app/", healthCheck: true },
        { title: "GitHub", href: "https://github.com/", badge: "PRs" },
        { title: "Notion", href: "https://www.notion.so/" },
        { title: "Figma", href: "https://www.figma.com/files/" }
      ]
    }},
    { id: "workspace", type: "link-group", col: 1, row: 3, width: 4, height: 1, config: {
      title: "Workspace",
      items: [
        { title: "Slack", href: "https://app.slack.com/", healthCheck: true },
        { title: "Docs", href: "https://docs.google.com/" },
        { title: "Drive", href: "https://drive.google.com/" },
        { title: "Brave Settings", href: "brave://settings/" }
      ]
    }},
    { id: "build", type: "link-group", col: 5, row: 3, width: 4, height: 1, config: {
      title: "Build",
      items: [
        { title: "OpenRouter", href: "https://openrouter.ai/", badge: "LLM", healthCheck: true },
        { title: "Vercel", href: "https://vercel.com/dashboard" },
        { title: "Railway", href: "https://railway.app/dashboard", healthCheck: true },
        { title: "Cloudflare", href: "https://dash.cloudflare.com/" }
      ]
    }},
    { id: "markets", type: "markets", col: 9, row: 3, width: 4, height: 2, config: {
      title: "Markets",
      items: [
        { label: "Bitcoin", symbol: "BTC", coinGeckoId: "bitcoin", href: "https://www.tradingview.com/symbols/BTCUSD/" },
        { label: "Ethereum", symbol: "ETH", coinGeckoId: "ethereum", href: "https://www.tradingview.com/symbols/ETHUSD/" }
      ]
    }},
    { id: "research", type: "link-group", col: 1, row: 4, width: 4, height: 1, config: {
      title: "Research",
      items: [
        { title: "Hacker News", href: "https://news.ycombinator.com/" },
        { title: "Ars Technica", href: "https://arstechnica.com/" },
        { title: "The Verge", href: "https://www.theverge.com/" },
        { title: "YouTube", href: "https://www.youtube.com/" }
      ]
    }},
    { id: "feeds", type: "feeds", col: 5, row: 4, width: 4, height: 1, config: {
      title: "Feeds",
      items: [
        { title: "HN Front Page", url: "https://hnrss.org/frontpage", site: "https://news.ycombinator.com/" },
        { title: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index", site: "https://arstechnica.com/" }
      ]
    }}
  ]
};
