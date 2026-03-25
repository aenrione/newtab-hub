/* ── Sonarr widget plugin ── */

Hub.registry.register("sonarr", {
  label: "Sonarr",
  icon: "clock",

  defaultConfig: function () {
    return { title: "On Deck", url: "http://localhost:8989", days: 7 };
  },

  credentialFields: [{ key: "apiKey", label: "API Key", type: "password" }],

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "On Deck") + "</h2></div>" +
      '<div class="sonarr-list"><div class="empty-state">Loading\u2026</div></div>';
  },

  load: async function (container, config, state, token) {
    /* implemented in Task 4 */
  },

  renderEditor: function (container, config, onChange) {
    container.replaceChildren();

    var titleLabel = document.createElement("label");
    titleLabel.className = "editor-field";
    titleLabel.innerHTML =
      "<span>Widget title</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.title || "On Deck") + '" />';
    var titleInput = titleLabel.querySelector("input");
    titleInput.dataset.navHeaderField = "";
    titleInput.addEventListener("input", function (e) {
      config.title = e.target.value;
      onChange(config);
    });
    container.appendChild(titleLabel);

    var urlLabel = document.createElement("label");
    urlLabel.className = "editor-field";
    urlLabel.innerHTML =
      "<span>Sonarr URL</span>" +
      '<input type="text" value="' + Hub.escapeHtml(config.url || "http://localhost:8989") + '" />';
    urlLabel.querySelector("input").addEventListener("input", function (e) {
      config.url = e.target.value;
      onChange(config);
    });
    container.appendChild(urlLabel);

    var daysLabel = document.createElement("label");
    daysLabel.className = "editor-field";
    daysLabel.innerHTML =
      "<span>Days to show</span>" +
      '<input type="number" min="1" max="30" value="' + (config.days || 7) + '" />';
    daysLabel.querySelector("input").addEventListener("input", function (e) {
      config.days = parseInt(e.target.value, 10) || 7;
      onChange(config);
    });
    container.appendChild(daysLabel);
  }
});

/* ── Helpers ── */

function sonarrFormatDate(d) {
  return d.getFullYear() + "-" + sonarrPad(d.getMonth() + 1) + "-" + sonarrPad(d.getDate());
}

function sonarrPad(n) {
  return n < 10 ? "0" + n : String(n);
}
