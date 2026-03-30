/* ── Weather widget plugin ── */

Hub.injectStyles("widget-weather", `
  .weather-condition {
    text-align: center;
    padding: 10px 0 0;
  }
  .weather-cond-name {
    font-family: var(--font-display);
    font-size: 1.35rem;
    font-weight: 600;
    color: var(--text);
    line-height: 1.2;
    letter-spacing: -0.01em;
  }
  .weather-feels {
    font-size: 0.78rem;
    color: var(--muted-strong);
    margin-top: 4px;
  }
  .weather-chart-outer {
    position: relative;
    margin: 14px 0 0;
    padding-top: 20px;
  }
  .weather-chart {
    position: relative;
    height: 80px;
    box-sizing: border-box;
  }
  .weather-bars {
    position: relative;
    display: flex;
    align-items: flex-end;
    height: 100%;
    gap: 3px;
    padding: 0 4px;
    box-sizing: border-box;
  }
  .weather-daylight {
    position: absolute;
    top: 0; bottom: 0;
    background: linear-gradient(to bottom, rgba(230, 160, 40, 0.18) 0%, rgba(200, 120, 20, 0.07) 100%);
    border-radius: 4px;
    pointer-events: none;
    z-index: 0;
  }
  .weather-bar-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
    height: 100%;
    position: relative;
    z-index: 1;
  }
  .weather-precip-dot {
    width: 2px;
    height: 2px;
    border-radius: 50%;
    background: #5b9cf6;
    margin-bottom: 2px;
    visibility: hidden;
    flex-shrink: 0;
  }
  .weather-precip-dot.on { visibility: visible; }
  .weather-bar {
    width: 100%;
    border-radius: 99px 99px 2px 2px;
    background: rgba(255, 255, 255, 0.14);
    min-height: 4px;
    transition: background 0.15s;
  }
  .weather-bar.day {
    background: rgba(255, 255, 255, 0.22);
  }
  .weather-bar.now {
    background: rgba(255, 255, 255, 0.88);
  }
  .weather-now-badge {
    position: absolute;
    top: 0;
    transform: translateX(-50%);
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--text);
    white-space: nowrap;
    line-height: 1;
    pointer-events: none;
  }
  .weather-time-row {
    position: relative;
    height: 16px;
    margin: 3px 4px 0;
  }
  .weather-time-lbl {
    position: absolute;
    font-size: 0.62rem;
    color: var(--muted);
    transform: translateX(-50%);
    top: 0;
    white-space: nowrap;
  }
  .weather-loc {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
    padding: 7px 0 10px;
    font-size: 0.70rem;
    color: var(--muted);
    line-height: 1;
  }
  .weather-loc svg {
    flex-shrink: 0;
    opacity: 0.6;
  }
`);

Hub.registry.register("weather", {
  label: "Weather",
  icon: "cloud",

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Weather") + '</h2></div>' +
      '<div class="weather-body"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var bodyEl = container.querySelector(".weather-body");
    var location = (config.location || "").trim();
    if (!location) {
      bodyEl.innerHTML = '<div class="empty-state">Set a location in the widget editor.</div>';
      return;
    }

    var units = config.units === "fahrenheit" ? "fahrenheit" : "celsius";
    var unitSym = units === "fahrenheit" ? "\u00B0F" : "\u00B0C";
    var store = state.store;

    try {
      var geo = await Hub.cachedFetchJSON(
        "https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(location) + "&count=1&language=en&format=json",
        "weather",
        store
      );
      if (token !== state.renderToken) return;

      if (!geo.results || !geo.results.length) {
        bodyEl.innerHTML = '<div class="empty-state">Location not found.</div>';
        return;
      }

      var place = geo.results[0];
      var locationName = place.name + (place.country ? ", " + place.country : "");

      var weatherUrl =
        "https://api.open-meteo.com/v1/forecast" +
        "?latitude=" + place.latitude +
        "&longitude=" + place.longitude +
        "&current=temperature_2m,apparent_temperature,weathercode" +
        "&hourly=temperature_2m,precipitation_probability" +
        "&daily=sunrise,sunset" +
        "&temperature_unit=" + units +
        "&timezone=auto&forecast_days=1";

      var w = await Hub.cachedFetchJSON(weatherUrl, "weather", store);
      if (token !== state.renderToken) return;

      var cur = w.current;
      var hourly = w.hourly;
      var daily = w.daily;

      var nowHour = parseInt(cur.time.slice(11, 13), 10);

      var sunriseHour = daily.sunrise[0] ? parseInt(daily.sunrise[0].slice(11, 13), 10) : 6;
      var sunriseMin  = daily.sunrise[0] ? parseInt(daily.sunrise[0].slice(14, 16), 10) : 0;
      var sunsetHour  = daily.sunset[0]  ? parseInt(daily.sunset[0].slice(11, 13), 10) : 20;
      var sunsetMin   = daily.sunset[0]  ? parseInt(daily.sunset[0].slice(14, 16), 10) : 0;

      var temps   = hourly.temperature_2m.slice(0, 24);
      var precips = hourly.precipitation_probability.slice(0, 24);

      var minT  = Math.min.apply(null, temps);
      var maxT  = Math.max.apply(null, temps);
      var range = (maxT - minT) || 1;

      var riseLeft  = ((sunriseHour + sunriseMin / 60) / 24 * 100).toFixed(1);
      var setRight  = (100 - (sunsetHour + sunsetMin / 60) / 24 * 100).toFixed(1);

      var barsHtml = "";
      var badgeLeftPct = ((nowHour + 0.5) / 24 * 100).toFixed(1);
      for (var i = 0; i < 24; i++) {
        var heightPct = Math.max(5, ((temps[i] - minT) / range) * 76 + 8);
        var isNow   = (i === nowHour);
        var isDay   = (i >= sunriseHour && i <= sunsetHour);
        var showDot = (precips[i] >= 40);
        var barClass = "weather-bar" + (isNow ? " now" : (isDay ? " day" : ""));
        barsHtml +=
          '<div class="weather-bar-col">' +
            '<div class="weather-precip-dot' + (showDot ? ' on' : '') + '"></div>' +
            '<div class="' + barClass + '" style="height:' + heightPct.toFixed(0) + '%"></div>' +
          '</div>';
      }

      var timePoints = [{ h: 6, label: "6am" }, { h: 14, label: "2pm" }, { h: 22, label: "10pm" }];
      var timeLabelsHtml = "";
      for (var j = 0; j < timePoints.length; j++) {
        var leftPct = ((timePoints[j].h + 0.5) / 24 * 100).toFixed(1);
        timeLabelsHtml += '<span class="weather-time-lbl" style="left:' + leftPct + '%">' + timePoints[j].label + '</span>';
      }

      bodyEl.innerHTML =
        '<div class="weather-condition">' +
          '<div class="weather-cond-name">' + Hub.escapeHtml(weatherWmoDesc(cur.weathercode)) + '</div>' +
          '<div class="weather-feels">Feels like ' + Math.round(cur.apparent_temperature) + unitSym + '</div>' +
        '</div>' +
        '<div class="weather-chart-outer">' +
          '<span class="weather-now-badge" style="left:' + badgeLeftPct + '%">' + Math.round(cur.temperature_2m) + unitSym + '</span>' +
          '<div class="weather-chart">' +
            '<div class="weather-bars">' +
              '<div class="weather-daylight" style="left:' + riseLeft + '%;right:' + setRight + '%"></div>' +
              barsHtml +
            '</div>' +
          '</div>' +
          '<div class="weather-time-row">' + timeLabelsHtml + '</div>' +
        '</div>' +
        '<div class="weather-loc">' +
          '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/></svg>' +
          Hub.escapeHtml(locationName) +
        '</div>';

    } catch (_) {
      if (token !== state.renderToken) return;
      bodyEl.innerHTML = '<div class="empty-state">Failed to load weather.</div>';
    }
  },

  renderEditor: function (container, config, onChange) {
    container.replaceChildren();

    var titleLabel = document.createElement("label");
    titleLabel.className = "editor-field";
    titleLabel.innerHTML = '<span>Widget title</span><input type="text" value="' + Hub.escapeHtml(config.title || "Weather") + '" />';
    var titleInput = titleLabel.querySelector("input");
    titleInput.addEventListener("input", function (e) { config.title = e.target.value; onChange(config); });
    container.appendChild(titleLabel);

    var locLabel = document.createElement("label");
    locLabel.className = "editor-field";
    locLabel.innerHTML = '<span>Location</span><input type="text" placeholder="New York, London, Tokyo\u2026" value="' + Hub.escapeHtml(config.location || "") + '" />';
    locLabel.querySelector("input").addEventListener("input", function (e) { config.location = e.target.value; onChange(config); });
    container.appendChild(locLabel);

    container.appendChild(Hub.createCustomSelect("Units", [
      { value: "celsius", label: "Celsius (\u00B0C)" },
      { value: "fahrenheit", label: "Fahrenheit (\u00B0F)" }
    ], config.units || "celsius", function (v) { config.units = v; onChange(config); }));
  },

  rawEditorSchema: {
    fields: {
      title: { type: "string" },
      location: { type: "string" },
      units: { type: "string", enum: ["celsius", "fahrenheit"] }
    }
  },

  defaultConfig: function () {
    return { title: "Weather", location: "", units: "celsius" };
  }
});

/* ── WMO weather code helpers ── */

function weatherWmoIcon(code) {
  if (code === 0) return "\u2600\uFE0F";
  if (code <= 2) return "\u26C5";
  if (code === 3) return "\u2601\uFE0F";
  if (code <= 49) return "\uD83C\uDF2B\uFE0F";
  if (code <= 67) return "\uD83C\uDF27\uFE0F";
  if (code <= 79) return "\uD83C\uDF28\uFE0F";
  if (code <= 84) return "\uD83C\uDF27\uFE0F";
  return "\u26C8\uFE0F";
}

function weatherWmoDesc(code) {
  var map = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast",
    45: "Foggy", 48: "Icy fog",
    51: "Light drizzle", 53: "Moderate drizzle", 55: "Dense drizzle",
    61: "Slight rain", 63: "Moderate rain", 65: "Heavy rain",
    71: "Slight snow", 73: "Moderate snow", 75: "Heavy snow", 77: "Snow grains",
    80: "Slight showers", 81: "Moderate showers", 82: "Violent showers",
    85: "Snow showers", 86: "Heavy snow showers",
    95: "Thunderstorm", 96: "Thunderstorm w/ hail", 99: "Thunderstorm w/ heavy hail"
  };
  return map[code] || "Unknown";
}
