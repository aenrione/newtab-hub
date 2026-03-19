window.NEW_TAB_SHARED_PROFILES = window.NEW_TAB_SHARED_PROFILES || {};

window.NEW_TAB_SHARED_PROFILES.personal = {
  label: "Personal",
  widgets: [
    { id: "search", type: "search", col: 1, row: 1, width: 12, height: 1, config: { searchBaseUrl: "https://duckduckgo.com/?q=" } },
    { id: "pinned", type: "pinned-links", col: 1, row: 2, width: 12, height: 1, config: {
      items: [
        { title: "Gmail", href: "https://mail.google.com/" },
        { title: "YouTube", href: "https://www.youtube.com/" },
        { title: "Spotify", href: "https://open.spotify.com/", badge: "Music", healthCheck: true },
        { title: "GitHub", href: "https://github.com/" },
        { title: "Notion", href: "https://www.notion.so/" },
        { title: "TradingView", href: "https://www.tradingview.com/", healthCheck: true }
      ]
    }},
    { id: "daily", type: "link-group", col: 1, row: 3, width: 4, height: 1, config: {
      title: "Daily",
      items: [
        { title: "Calendar", href: "https://calendar.google.com/" },
        { title: "Drive", href: "https://drive.google.com/" },
        { title: "WhatsApp", href: "https://web.whatsapp.com/" },
        { title: "Maps", href: "https://maps.google.com/" }
      ]
    }},
    { id: "read", type: "link-group", col: 5, row: 3, width: 4, height: 1, config: {
      title: "Read",
      items: [
        { title: "Hacker News", href: "https://news.ycombinator.com/" },
        { title: "The Verge", href: "https://www.theverge.com/" },
        { title: "Ars Technica", href: "https://arstechnica.com/" },
        { title: "YouTube", href: "https://www.youtube.com/" }
      ]
    }},
    { id: "markets", type: "markets", col: 9, row: 3, width: 4, height: 1, config: {
      title: "Markets",
      items: [
        { label: "Bitcoin", symbol: "BTC", coinGeckoId: "bitcoin", href: "https://www.tradingview.com/symbols/BTCUSD/" },
        { label: "Ethereum", symbol: "ETH", coinGeckoId: "ethereum", href: "https://www.tradingview.com/symbols/ETHUSD/" }
      ]
    }},
    { id: "finance", type: "link-group", col: 1, row: 4, width: 4, height: 1, config: {
      title: "Finance",
      items: [
        { title: "TradingView", href: "https://www.tradingview.com/", badge: "Charts" },
        { title: "Koyfin", href: "https://app.koyfin.com/" },
        { title: "Fintual", href: "https://fintual.cl/" },
        { title: "Fintoc", href: "https://app.fintoc.com/" }
      ]
    }},
    { id: "feeds", type: "feeds", col: 5, row: 4, width: 8, height: 1, config: {
      title: "Feeds",
      items: [
        { title: "HN Front Page", url: "https://hnrss.org/frontpage", site: "https://news.ycombinator.com/" },
        { title: "The Verge", url: "https://www.theverge.com/rss/index.xml", site: "https://www.theverge.com/" }
      ]
    }}
  ]
};
