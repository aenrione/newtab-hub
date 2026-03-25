/* ── Markets widget plugin ── */

Hub.injectStyles("widget-markets", `
  .market-list { display: grid; gap: 1px; }
  .market-row {
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
    gap: 12px;
    padding: 8px 8px;
    border-radius: var(--radius-sm);
    transition: background 80ms;
  }
  .market-row:hover { background: var(--surface-hover); }
  .market-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
  }
  .market-symbol {
    font-size: 0.88rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--text);
    text-decoration: none;
    line-height: 1;
  }
  a.market-symbol:hover { opacity: 0.75; }
  .market-name {
    font-size: 0.72rem;
    color: var(--muted);
    font-weight: 400;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    line-height: 1;
  }
  .market-sparkline {
    display: flex;
    align-items: center;
    opacity: 0.85;
    transition: opacity 80ms;
  }
  a.market-sparkline:hover { opacity: 1; }
  .market-values {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 3px;
  }
  .market-change {
    font-size: 0.85rem;
    font-weight: 700;
    text-align: right;
    line-height: 1;
  }
  .market-change.is-up { color: var(--ok); }
  .market-change.is-down { color: var(--down); }
  .market-price {
    font-size: 0.72rem;
    color: var(--muted);
    text-align: right;
    font-family: var(--font-display);
    line-height: 1;
  }
`);

Hub.registry.register("markets", {
  label: "Markets",
  icon: "trendingUp",

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Markets") + '</h2></div>' +
      '<div class="market-list"><div class="empty-state">Loading...</div></div>';
  },

  load: async function (container, config, state, token) {
    var items = config.items || [];
    var listEl = container.querySelector(".market-list");
    if (!items.length) { listEl.innerHTML = '<div class="empty-state">No markets configured.</div>'; return; }

    var chartLinkTpl = config["chart-link-template"] || "";
    var symbolLinkTpl = config["symbol-link-template"] || "";
    var sortBy = config["sort-by"] || "";
    var store = state.store;

    var results = await Promise.all(items.map(function (m) {
      return fetchYahooFinance(m, store)
        .then(function (r) { return { ok: true, value: r }; })
        .catch(function () { return { ok: false }; });
    }));

    if (token !== state.renderToken) return;

    var enriched = items.map(function (m, i) {
      var name = m.name || m.label || m.symbol;
      var r = results[i];
      if (!r.ok) return Object.assign({}, m, { name: name, ok: false });
      // Use the resolved symbol (may have been upgraded to BTC-USD etc.)
      var resolvedSym = yahooSymbol(m);
      return Object.assign({}, m, r.value, { name: name, symbol: resolvedSym, ok: true });
    });

    if (sortBy === "change") {
      enriched.sort(function (a, b) { return ((b.change != null ? b.change : -Infinity)) - ((a.change != null ? a.change : -Infinity)); });
    } else if (sortBy === "absolute-change") {
      enriched.sort(function (a, b) { return Math.abs(b.change || 0) - Math.abs(a.change || 0); });
    }

    var frag = document.createDocumentFragment();
    enriched.forEach(function (m) {
      var sym = String(m.symbol || "").toUpperCase(); // already resolved via yahooSymbol
      var chartLink = m["chart-link"] || m.href || (chartLinkTpl ? chartLinkTpl.replace("{SYMBOL}", encodeURIComponent(sym)) : "");
      var symbolLink = m["symbol-link"] || (symbolLinkTpl ? symbolLinkTpl.replace("{SYMBOL}", encodeURIComponent(sym)) : "");

      var row = document.createElement("div");
      row.className = "market-row";
      row.dataset.searchText = m.name + " " + sym;

      var isUp = (m.change || 0) >= 0;

      // Left: info block (symbol + name stacked)
      var infoEl = document.createElement("div");
      infoEl.className = "market-info";

      var symEl = symbolLink ? document.createElement("a") : document.createElement("span");
      symEl.className = "market-symbol";
      symEl.textContent = sym;
      if (symbolLink) {
        symEl.href = symbolLink;
        symEl.target = "_blank";
        symEl.rel = "noopener noreferrer";
      }

      var nameEl = document.createElement("span");
      nameEl.className = "market-name";
      nameEl.textContent = m.name;

      infoEl.appendChild(symEl);
      infoEl.appendChild(nameEl);

      // Middle: sparkline
      var sparkEl = chartLink ? document.createElement("a") : document.createElement("span");
      sparkEl.className = "market-sparkline";
      if (chartLink) {
        sparkEl.href = chartLink;
        sparkEl.target = "_blank";
        sparkEl.rel = "noopener noreferrer";
      }
      if (m.ok && m.closes && m.closes.length >= 2) {
        sparkEl.innerHTML = buildSparkline(m.closes, isUp);
      }

      // Right: values block (% change + price stacked)
      var valuesEl = document.createElement("div");
      valuesEl.className = "market-values";

      var changeEl = document.createElement("span");
      changeEl.className = "market-change" + (m.ok && m.change != null ? (isUp ? " is-up" : " is-down") : "");
      changeEl.textContent = m.ok && m.change != null ? Hub.formatPercent(m.change) : "--";

      var priceEl = document.createElement("span");
      priceEl.className = "market-price";
      priceEl.textContent = m.ok && m.close != null ? "$" + Hub.formatNumber(m.close) : "--";

      valuesEl.appendChild(changeEl);
      valuesEl.appendChild(priceEl);

      row.appendChild(infoEl);
      row.appendChild(sparkEl);
      row.appendChild(valuesEl);

      if (m.ok) state.markets.push(m);
      frag.appendChild(row);
    });

    listEl.replaceChildren(frag.childNodes.length ? frag : emptyNode("No data."));
  },

  renderEditor: function (container, config, onChange, navOptions) {
    container.replaceChildren();

    // Title
    var titleLabel = document.createElement("label");
    titleLabel.className = "editor-field";
    titleLabel.innerHTML = '<span>Widget title</span><input type="text" value="' + Hub.escapeHtml(config.title || "Markets") + '" />';
    var titleInput = titleLabel.querySelector("input");
    titleInput.dataset.navHeaderField = "";
    titleInput.addEventListener("input", function (e) { config.title = e.target.value; onChange(config); });
    container.appendChild(titleLabel);

    // Sort-by
    var sortLabel = document.createElement("label");
    sortLabel.className = "editor-field";
    sortLabel.innerHTML =
      '<span>Sort by</span>' +
      '<select>' +
        '<option value="">Order defined</option>' +
        '<option value="change">% Change (desc)</option>' +
        '<option value="absolute-change">|% Change| (desc)</option>' +
      '</select>';
    var sortSel = sortLabel.querySelector("select");
    sortSel.value = config["sort-by"] || "";
    sortSel.addEventListener("change", function (e) { config["sort-by"] = e.target.value; onChange(config); });
    container.appendChild(sortLabel);

    // Chart link template
    var chartTplLabel = document.createElement("label");
    chartTplLabel.className = "editor-field";
    chartTplLabel.innerHTML = '<span>Chart link template</span><input type="text" placeholder="https://…/{SYMBOL}" value="' + Hub.escapeHtml(config["chart-link-template"] || "") + '" />';
    var chartTplInput = chartTplLabel.querySelector("input");
    chartTplInput.addEventListener("input", function (e) { config["chart-link-template"] = e.target.value; onChange(config); });
    container.appendChild(chartTplLabel);

    // Symbol link template
    var symTplLabel = document.createElement("label");
    symTplLabel.className = "editor-field";
    symTplLabel.innerHTML = '<span>Symbol link template</span><input type="text" placeholder="https://finance.yahoo.com/quote/{SYMBOL}" value="' + Hub.escapeHtml(config["symbol-link-template"] || "") + '" />';
    var symTplInput = symTplLabel.querySelector("input");
    symTplInput.addEventListener("input", function (e) { config["symbol-link-template"] = e.target.value; onChange(config); });
    container.appendChild(symTplLabel);

    var hint = document.createElement("p");
    hint.className = "editor-hint";
    hint.textContent = "Use Yahoo Finance symbols: BTC-USD, ETH-USD, AAPL, ^GSPC, GC=F. Per-item links override templates.";
    container.appendChild(hint);

    var itemsWrap = document.createElement("div");
    container.appendChild(itemsWrap);
    buildListEditor(itemsWrap, config, "items", onChange, [
      { key: "symbol", label: "Symbol", placeholder: "BTC-USD, AAPL, ^GSPC…" },
      { key: "name",   label: "Name" },
      { key: "chart-link",  label: "Chart link",  placeholder: "overrides template" },
      { key: "symbol-link", label: "Symbol link", placeholder: "overrides template" }
    ], function () { return { symbol: "", name: "", "chart-link": "", "symbol-link": "" }; }, navOptions);
  },

  defaultConfig: function () {
    return {
      title: "Markets",
      "chart-link-template": "https://finance.yahoo.com/chart/{SYMBOL}",
      items: [
        { symbol: "BTC-USD",  name: "Bitcoin" },
        { symbol: "ETH-USD",  name: "Ethereum" },
        { symbol: "^GSPC",    name: "S&P 500" },
        { symbol: "GC=F",     name: "Gold" }
      ]
    };
  }
});

/* ── Data fetcher ── */

/**
 * Resolve the correct Yahoo Finance symbol from a market config item.
 * Old crypto configs had `coinGeckoId` + bare `symbol` (e.g. "BTC").
 * Yahoo Finance needs "BTC-USD" for crypto — bare "BTC" is a stock ticker.
 */
function yahooSymbol(m) {
  var sym = String(m.symbol || "").toUpperCase();
  // If item came from the old CoinGecko path and symbol has no currency suffix, append -USD
  if (m.coinGeckoId && sym && sym.indexOf("-") === -1) return sym + "-USD";
  return sym;
}

async function fetchYahooFinance(m, store) {
  var sym = yahooSymbol(m);
  var url = "https://query1.finance.yahoo.com/v8/finance/chart/" + encodeURIComponent(sym) + "?interval=1d&range=1mo&includePrePost=false";
  var data = await Hub.cachedFetchJSON(url, "markets", store);
  var result = data.chart && data.chart.result && data.chart.result[0];
  if (!result) throw new Error("No data for " + sym);
  var meta = result.meta;
  var closes = (result.indicators && result.indicators.quote && result.indicators.quote[0] && result.indicators.quote[0].close) || [];
  var close = meta.regularMarketPrice;
  var prevClose = meta.chartPreviousClose || meta.previousClose;
  var change = prevClose ? ((close - prevClose) / prevClose) * 100 : (meta.regularMarketChangePercent || 0);
  return { close: close, change: change, closes: closes };
}

/* ── Sparkline renderer ── */

function buildSparkline(prices, isUp) {
  var pts = prices.filter(function (p) { return p != null && !isNaN(p); });
  if (pts.length < 2) return "";
  var W = 88, H = 28, PAD = 2;
  var min = Math.min.apply(null, pts);
  var max = Math.max.apply(null, pts);
  var range = max - min || 1;
  var points = pts.map(function (p, i) {
    var x = PAD + (i / (pts.length - 1)) * (W - 2 * PAD);
    var y = (H - PAD) - ((p - min) / range) * (H - 2 * PAD);
    return x.toFixed(1) + "," + y.toFixed(1);
  }).join(" ");
  var color = isUp ? "var(--ok)" : "var(--down)";
  return '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" aria-hidden="true">' +
    '<polyline points="' + points + '" fill="none" stroke="' + color + '" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round"/>' +
    '</svg>';
}
