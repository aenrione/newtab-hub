/* ── Home Assistant widget plugin ── */

Hub.injectStyles("widget-home-assistant", `
  .home-assistant-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 6px;
    padding: 8px 12px 12px;
  }
  .home-assistant-stat {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px 10px;
    border-radius: var(--radius-sm);
    background: var(--surface);
  }
  .home-assistant-stat-value {
    font-size: 1.15rem;
    font-weight: 700;
    font-family: var(--font-display);
    color: var(--text);
    line-height: 1;
  }
  .home-assistant-stat-label {
    font-size: 0.68rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }
  .home-assistant-note {
    font-size: 0.7rem;
    color: var(--muted);
    padding: 0 12px 8px;
    line-height: 1.4;
  }
`);

Hub.registry.register("home-assistant", {
  label: "Home Assistant",
  icon: "https://www.home-assistant.io/favicon.ico",
  manualRefresh: true,

  credentialFields: [
    { key: "token", label: "Long-Lived Token", type: "password" }
  ],

  defaultConfig: function () {
    return { title: "Home Assistant", url: "http://localhost:8123", entityId: "" };
  },

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Home Assistant") + "</h2></div>" +
      '<div class="home-assistant-stats"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    var statsEl = container.querySelector(".home-assistant-stats");

    var creds = await Hub.credentials.load(config._id);
    if (token !== state.renderToken) return;
    if (!creds || !creds.token) {
      statsEl.innerHTML = '<div class="empty-state">Add your Long-Lived Token<br>in the widget editor.</div>';
      return;
    }

    var base = (config.url || "http://localhost:8123").replace(/\/$/, "");
    var entityId = (config.entityId || "").trim();
    var opts = { headers: { "Authorization": "Bearer " + creds.token } };

    if (!entityId) {
      if (token !== state.renderToken) return;
      statsEl.innerHTML = '<div class="empty-state">Set an Entity ID<br>in the widget editor.</div>';
      return;
    }

    var data;
    try {
      data = await Hub.cachedFetchJSON(
        base + "/api/states/" + entityId,
        "home-assistant",
        state.store,
        opts,
        Hub.cache.scopeKey(config._id, "homeAssistant::" + base + "::" + entityId)
      );
    } catch (_) {
      if (token !== state.renderToken) return;
      statsEl.innerHTML = '<div class="empty-state">Could not reach Home Assistant.</div>';
      return;
    }

    if (token !== state.renderToken) return;

    var friendlyName = homeAssistantFormat(
      data && data.attributes && data.attributes.friendly_name
        ? data.attributes.friendly_name
        : entityId
    );
    var stateVal = homeAssistantFormat(
      data && data.state ? data.state : "\u2014"
    );
    var unit = (data && data.attributes && data.attributes.unit_of_measurement)
      ? data.attributes.unit_of_measurement
      : "";

    var stats = [
      { label: Hub.escapeHtml(friendlyName), value: Hub.escapeHtml(stateVal + (unit ? " " + unit : "")) }
    ];

    var html = "";
    stats.forEach(function (s) {
      html +=
        '<div class="home-assistant-stat">' +
          '<span class="home-assistant-stat-value">' + s.value + "</span>" +
          '<span class="home-assistant-stat-label">' + s.label + "</span>" +
        "</div>";
    });

    statsEl.innerHTML = html;
  },

  renderEditor: function (container, config, onChange) {
    container.replaceChildren();

    var titleLabel = document.createElement("label");
    titleLabel.className = "editor-field";
    titleLabel.innerHTML =
      "<span>Widget title</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.title || "Home Assistant") + '" />';
    var titleInput = titleLabel.querySelector("input");
    titleInput.addEventListener("input", function (e) {
      config.title = e.target.value;
      onChange(config);
    });
    container.appendChild(titleLabel);

    var urlLabel = document.createElement("label");
    urlLabel.className = "editor-field";
    urlLabel.innerHTML =
      "<span>Home Assistant URL</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.url || "http://localhost:8123") + '" />';
    urlLabel.querySelector("input").addEventListener("input", function (e) {
      config.url = e.target.value;
      onChange(config);
    });
    container.appendChild(urlLabel);

    var entityLabel = document.createElement("label");
    entityLabel.className = "editor-field";
    entityLabel.innerHTML =
      "<span>Entity ID</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.entityId || "") + '" placeholder="e.g. sensor.living_room_temp" />';
    entityLabel.querySelector("input").addEventListener("input", function (e) {
      config.entityId = e.target.value;
      onChange(config);
    });
    container.appendChild(entityLabel);

    var note = document.createElement("p");
    note.className = "home-assistant-note";
    note.textContent = "You may need to enable CORS in Home Assistant\u2019s configuration.yaml";
    container.appendChild(note);
  }
});

/* ── Helpers ── */
function homeAssistantFormat(state) {
  if (state === null || state === undefined) return "\u2014";
  return String(state);
}
