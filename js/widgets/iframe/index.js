/* ── iFrame widget plugin ── */

Hub.injectStyles("widget-iframe", `
  .iframe-wrap { width: 100%; overflow: hidden; border-radius: var(--radius-sm); }
  .iframe-wrap iframe {
    width: 100%;
    border: none;
    display: block;
    background: #fff;
  }
`);

Hub.registry.register("iframe", {
  label: "iFrame",
  icon: "\uD83D\uDDBC",

  render: function (container, config) {
    var title = config.title || "iFrame";
    var url = config.url || "";
    var height = config.height || 300;

    container.innerHTML = '<div class="widget-header"><h2>' + Hub.escapeHtml(title) + '</h2></div>';

    if (!url) {
      container.insertAdjacentHTML("beforeend", '<div class="empty-state">Set a URL in the widget editor.</div>');
      return;
    }

    var wrap = document.createElement("div");
    wrap.className = "iframe-wrap";

    var iframe = document.createElement("iframe");
    iframe.src = url;
    iframe.style.height = height + "px";
    iframe.loading = "lazy";
    iframe.setAttribute("sandbox", "allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox");
    iframe.setAttribute("referrerpolicy", "no-referrer");

    wrap.appendChild(iframe);
    container.appendChild(wrap);
  },

  renderEditor: function (container, config, onChange) {
    container.replaceChildren();

    var titleLabel = document.createElement("label");
    titleLabel.className = "editor-field";
    titleLabel.innerHTML = '<span>Widget title</span><input type="text" value="' + Hub.escapeHtml(config.title || "iFrame") + '" />';
    titleLabel.querySelector("input").addEventListener("input", function (e) { config.title = e.target.value; onChange(config); });
    container.appendChild(titleLabel);

    var urlLabel = document.createElement("label");
    urlLabel.className = "editor-field";
    urlLabel.innerHTML = '<span>URL</span><input type="url" value="' + Hub.escapeHtml(config.url || "") + '" placeholder="https://\u2026" />';
    urlLabel.querySelector("input").addEventListener("input", function (e) { config.url = e.target.value; onChange(config); });
    container.appendChild(urlLabel);

    var heightLabel = document.createElement("label");
    heightLabel.className = "editor-field";
    heightLabel.innerHTML = '<span>Height (px)</span><input type="number" min="50" max="2000" value="' + (config.height || 300) + '" />';
    heightLabel.querySelector("input").addEventListener("input", function (e) {
      var n = parseInt(e.target.value, 10);
      if (n >= 50 && n <= 2000) { config.height = n; onChange(config); }
    });
    container.appendChild(heightLabel);
  },

  defaultConfig: function () {
    return { title: "iFrame", url: "", height: 300 };
  }
});
