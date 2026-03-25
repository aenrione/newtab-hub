/* ── Weather widget plugin ── */

Hub.injectStyles("widget-weather", `
  .weather-current {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 4px 0 8px;
  }
  .weather-icon { font-size: 2.4rem; line-height: 1; }
  .weather-info { display: flex; flex-direction: column; gap: 2px; }
  .weather-temp {
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 600;
    letter-spacing: -0.03em;
    line-height: 1;
  }
  .weather-desc { font-size: 0.82rem; color: var(--muted-strong); }
  .weather-wind { font-size: 0.72rem; color: var(--muted); }
  .weather-forecast {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 4px;
    padding-top: 8px;
    border-top: 1px solid var(--border);
  }
  .weather-day {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
  }
  .weather-day-label {
    font-size: 0.64rem;
    font-weight: 700;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .weather-day-icon { font-size: 1.1rem; }
  .weather-day-range { font-size: 0.68rem; color: var(--muted); }
`);

Hub.registry.register("weather", {
  label: "Weather",
  icon: "\u2600",

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
    var windUnit = units === "fahrenheit" ? "mph" : "km/h";
    var store = state.store;

    try {
      var geo = await Hub.cachedFetchJSON(
        "https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(location) + "&count=1&language=en&format=json",
        "default",
        store
      );

      if (!geo.results || !geo.results.length) {
        bodyEl.innerHTML = '<div class="empty-state">Location not found.</div>';
        return;
      }

      var place = geo.results[0];
      var weatherUrl =
        "https://api.open-meteo.com/v1/forecast" +
        "?latitude=" + place.latitude +
        "&longitude=" + place.longitude +
        "&current=temperature_2m,weathercode,windspeed_10m" +
        "&daily=temperature_2m_max,temperature_2m_min,weathercode" +
        "&temperature_unit=" + units +
        "&windspeed_unit=" + (units === "fahrenheit" ? "mph" : "kmh") +
        "&timezone=auto&forecast_days=5";

      var w = await Hub.cachedFetchJSON(weatherUrl, "default", store);
      if (token !== state.renderToken) return;

      var cur = w.current;
      var daily = w.daily;
      var today = new Date();

      var forecastHtml = "";
      for (var i = 0; i < 5; i++) {
        var dayLabel = i === 0
          ? "Today"
          : new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(new Date(daily.time[i] + "T12:00:00"));
        forecastHtml +=
          '<div class="weather-day">' +
            '<span class="weather-day-label">' + Hub.escapeHtml(dayLabel) + '</span>' +
            '<span class="weather-day-icon">' + weatherWmoIcon(daily.weathercode[i]) + '</span>' +
            '<span class="weather-day-range">' +
              Math.round(daily.temperature_2m_max[i]) + '/' +
              Math.round(daily.temperature_2m_min[i]) +
            '</span>' +
          '</div>';
      }

      bodyEl.innerHTML =
        '<div class="weather-current">' +
          '<span class="weather-icon">' + weatherWmoIcon(cur.weathercode) + '</span>' +
          '<div class="weather-info">' +
            '<span class="weather-temp">' + Math.round(cur.temperature_2m) + unitSym + '</span>' +
            '<span class="weather-desc">' + Hub.escapeHtml(weatherWmoDesc(cur.weathercode)) + '</span>' +
            '<span class="weather-wind">\uD83D\uDCA8 ' + Math.round(cur.windspeed_10m) + ' ' + windUnit + '</span>' +
          '</div>' +
        '</div>' +
        '<div class="weather-forecast">' + forecastHtml + '</div>';
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
    titleLabel.querySelector("input").addEventListener("input", function (e) { config.title = e.target.value; onChange(config); });
    container.appendChild(titleLabel);

    var locLabel = document.createElement("label");
    locLabel.className = "editor-field";
    locLabel.innerHTML = '<span>Location</span><input type="text" placeholder="New York, London, Tokyo\u2026" value="' + Hub.escapeHtml(config.location || "") + '" />';
    locLabel.querySelector("input").addEventListener("input", function (e) { config.location = e.target.value; onChange(config); });
    container.appendChild(locLabel);

    var unitsLabel = document.createElement("label");
    unitsLabel.className = "editor-field";
    var unitsVal = config.units || "celsius";
    unitsLabel.innerHTML =
      '<span>Units</span>' +
      '<select>' +
        '<option value="celsius"' + (unitsVal === "celsius" ? " selected" : "") + '>Celsius (\u00B0C)</option>' +
        '<option value="fahrenheit"' + (unitsVal === "fahrenheit" ? " selected" : "") + '>Fahrenheit (\u00B0F)</option>' +
      '</select>';
    unitsLabel.querySelector("select").addEventListener("change", function (e) { config.units = e.target.value; onChange(config); });
    container.appendChild(unitsLabel);
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
