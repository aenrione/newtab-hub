---
title: Markets
description: Stock, crypto, and index tracker with prices, % change, and sparkline charts
---

# Markets

Tracks stocks, cryptocurrencies, and market indices in one widget. Each entry shows the current price, percentage change, and a sparkline chart. Powered by Yahoo Finance — no API key required.

## Configuration

```js
{ id: "my-markets", type: "markets", col: 1, row: 1, width: 6, height: 2,
  config: {
    title: "Markets",
    items: [
      { symbol: "BTC-USD", name: "Bitcoin" },
      { symbol: "AAPL",    name: "Apple" }
    ]
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | — | Widget heading. |
| `sort-by` | string | `""` | Sort order for entries: `""` preserves the order defined in `items`, `"change"` sorts by percentage change (descending), `"absolute-change"` sorts by absolute percentage change (descending). |
| `chart-link-template` | string | Yahoo Finance URL | URL template for sparkline chart links. Use `{SYMBOL}` as a placeholder (e.g., `"https://finance.yahoo.com/quote/{SYMBOL}"`). |
| `symbol-link-template` | string | — | URL template for symbol label links. Use `{SYMBOL}` as a placeholder. |
| `items` | array | — | Array of market entries (see sub-fields below). |
| `items[].symbol` | string | — | Yahoo Finance ticker symbol (e.g., `"BTC-USD"`, `"AAPL"`, `"^GSPC"`, `"ETH-USD"`). |
| `items[].name` | string | — | Human-readable display name shown alongside the symbol. |
| `items[].chart-link` | string | — | Per-item override for the chart link URL. |
| `items[].symbol-link` | string | — | Per-item override for the symbol link URL. |

## Examples

### Minimal

```js
{ id: "w1", type: "markets", col: 1, row: 1, width: 6, height: 2,
  config: {
    items: [
      { symbol: "BTC-USD",  name: "Bitcoin" },
      { symbol: "ETH-USD",  name: "Ethereum" },
      { symbol: "^GSPC",    name: "S&P 500" }
    ]
  }
}
```

### Advanced

```js
{ id: "w1", type: "markets", col: 1, row: 1, width: 8, height: 3,
  config: {
    title: "Watchlist",
    "sort-by": "change",
    "chart-link-template": "https://finance.yahoo.com/chart/{SYMBOL}",
    "symbol-link-template": "https://finance.yahoo.com/quote/{SYMBOL}",
    items: [
      { symbol: "BTC-USD",  name: "Bitcoin" },
      { symbol: "ETH-USD",  name: "Ethereum" },
      { symbol: "AAPL",     name: "Apple" },
      { symbol: "MSFT",     name: "Microsoft" },
      { symbol: "^GSPC",    name: "S&P 500" },
      { symbol: "^DJI",     name: "Dow Jones",  "chart-link": "https://finance.yahoo.com/chart/%5EDJI" }
    ]
  }
}
```

!!! tip
    Yahoo Finance symbols for indices use a `^` prefix (e.g., `^GSPC` for S&P 500, `^IXIC` for NASDAQ). Crypto pairs append `-USD` (e.g., `BTC-USD`, `SOL-USD`).

!!! note
    No API key is required. Data is fetched from Yahoo Finance's public endpoints. Quote availability depends on Yahoo Finance's coverage and rate limits.
