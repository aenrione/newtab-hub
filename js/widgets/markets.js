/* ── Markets widget plugin ── */

Hub.registry.register("markets", {
  label: "Markets",
  icon: "\u2197",

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Markets") + '</h2></div>' +
      '<div class="market-list"><div class="empty-state">Loading...</div></div>';
  },

  load: async function (container, config, state, token) {
    var items = config.items || [];
    var listEl = container.querySelector(".market-list");
    if (!items.length) { listEl.innerHTML = '<div class="empty-state">No markets configured.</div>'; return; }

    var cryptoItems = [];
    var stooqItems = [];
    items.forEach(function (m, i) {
      if (m.coinGeckoId) cryptoItems.push({ item: m, index: i });
      else stooqItems.push({ item: m, index: i });
    });

    var allResults = new Array(items.length);

    var store = state.store;
    var cryptoPromise = fetchCryptoBatch(cryptoItems.map(function (c) { return c.item; }), store)
      .then(function (res) { res.forEach(function (r, i) { allResults[cryptoItems[i].index] = { ok: true, value: r }; }); })
      .catch(function () { cryptoItems.forEach(function (c) { allResults[c.index] = { ok: false }; }); });

    var stooqPromises = stooqItems.map(function (s) {
      return fetchStooq(s.item, store)
        .then(function (r) { allResults[s.index] = { ok: true, value: r }; })
        .catch(function () { allResults[s.index] = { ok: false }; });
    });

    await Promise.allSettled([cryptoPromise].concat(stooqPromises));
    if (token !== state.renderToken) return;

    var frag = document.createDocumentFragment();
    items.forEach(function (m, i) {
      var r = allResults[i] || { ok: false };
      var market = r.ok ? r.value : m;
      if (r.ok) state.markets.push(market);

      var a = Hub.createLink("market-row", market.href, market.label);
      a.dataset.searchText = market.label + " " + (market.symbol || market.coinGeckoId || "");
      var hasData = r.ok && market.close != null;
      var cls = market.change >= 0 ? "is-up" : "is-down";
      var sym = String(market.symbol || market.coinGeckoId || "").toUpperCase();

      a.innerHTML =
        '<span class="market-symbol">' + Hub.escapeHtml(sym) + '</span>' +
        '<span class="market-label">' + Hub.escapeHtml(market.label) + '</span>' +
        '<span class="market-price">' + (hasData ? Hub.formatNumber(market.close) : "--") + '</span>' +
        '<span class="market-change ' + (hasData ? cls : "") + '">' + (hasData ? Hub.formatPercent(market.change) : "") + '</span>';
      frag.appendChild(a);
    });

    listEl.replaceChildren(frag.childNodes.length ? frag : emptyNode("No data."));
  },

  renderEditor: function (container, config, onChange, navOptions) {
    container.replaceChildren();

    var titleLabel = document.createElement("label");
    titleLabel.className = "editor-field";
    titleLabel.innerHTML = '<span>Widget title</span><input type="text" value="' + Hub.escapeHtml(config.title || "Markets") + '" />';
    var titleInput = titleLabel.querySelector("input");
    titleInput.dataset.navHeaderField = "";
    titleInput.addEventListener("input", function (e) {
      config.title = e.target.value;
      onChange(config);
    });
    container.appendChild(titleLabel);

    var hint = document.createElement("p");
    hint.className = "editor-hint";
    hint.textContent = "For crypto: add coinGeckoId (e.g. bitcoin, ethereum). For stocks: use stooq symbol (e.g. ^spx).";
    container.appendChild(hint);

    var itemsWrap = document.createElement("div");
    container.appendChild(itemsWrap);
    buildListEditor(itemsWrap, config, "items", onChange, [
      { key: "label", label: "Label" },
      { key: "symbol", label: "Symbol" },
      { key: "coinGeckoId", label: "CoinGecko ID", placeholder: "bitcoin, ethereum..." },
      { key: "href", label: "Chart URL" }
    ], function () { return { label: "", symbol: "", coinGeckoId: "", href: "https://" }; }, navOptions);
  },

  defaultConfig: function () {
    return {
      title: "Markets",
      items: [
        { label: "Bitcoin", symbol: "BTC", coinGeckoId: "bitcoin", href: "https://www.tradingview.com/symbols/BTCUSD/" },
        { label: "Ethereum", symbol: "ETH", coinGeckoId: "ethereum", href: "https://www.tradingview.com/symbols/ETHUSD/" }
      ]
    };
  }
});

/* ── Data fetchers (shared) ── */

function stooqUrl(symbol) { return "https://stooq.com/q/l/?s=" + encodeURIComponent(symbol) + "&i=d"; }

function parseStooqCsv(csv) {
  var lines = csv.trim().split(/\r?\n/).filter(Boolean);
  var row = lines[lines.length - 1];
  if (!row) throw new Error("No data");
  var p = row.split(",");
  return { close: Number(p[6]), open: Number(p[3]) };
}

async function fetchStooq(m, store) {
  var csv = await Hub.cachedFetch(stooqUrl(m.symbol), "markets", store);
  var parsed = parseStooqCsv(csv);
  var change = parsed.open ? ((parsed.close - parsed.open) / parsed.open) * 100 : 0;
  return Object.assign({}, m, { close: parsed.close, change: change });
}

async function fetchCryptoBatch(items, store) {
  if (!items.length) return [];
  var ids = items.map(function (m) { return m.coinGeckoId; }).join(",");
  var url = "https://api.coingecko.com/api/v3/simple/price?ids=" + encodeURIComponent(ids) + "&vs_currencies=usd&include_24hr_change=true";
  var data = await Hub.cachedFetchJSON(url, "markets", store);
  return items.map(function (m) {
    var coin = data[m.coinGeckoId];
    if (!coin) return Object.assign({}, m, { close: null, change: null });
    return Object.assign({}, m, { close: coin.usd, change: coin.usd_24h_change || 0 });
  });
}
