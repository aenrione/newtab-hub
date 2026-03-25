/* ── HTML widget plugin ── */

Hub.injectStyles("widget-html", `
  .html-content { overflow: hidden; }
  .html-content a { color: var(--accent-2); }
  .widget-html .editor-field--col { flex-direction: column; align-items: flex-start; gap: 4px; }
  .widget-html .editor-field--col textarea {
    width: 100%;
    min-height: 120px;
    padding: 6px 8px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg);
    color: var(--text);
    font-size: 0.78rem;
    font-family: var(--font-display);
    resize: vertical;
  }
  .widget-html .editor-field--col textarea:focus { outline: none; border-color: var(--accent-2); }
`);

Hub.registry.register("html", {
  label: "HTML",
  icon: "\uD83D\uDCDD",

  render: function (container, config) {
    container.className += " widget-html";
    var title = (config.title || "").trim();
    container.innerHTML = title
      ? '<div class="widget-header"><h2>' + Hub.escapeHtml(title) + '</h2></div><div class="html-content"></div>'
      : '<div class="html-content"></div>';

    var contentEl = container.querySelector(".html-content");
    if (config.content) {
      contentEl.innerHTML = config.content;
    } else {
      contentEl.innerHTML = '<div class="empty-state">Add HTML content in the widget editor.</div>';
    }
  },

  renderEditor: function (container, config, onChange) {
    container.replaceChildren();
    container.className += " widget-html";

    var titleLabel = document.createElement("label");
    titleLabel.className = "editor-field";
    titleLabel.innerHTML = '<span>Widget title (optional)</span><input type="text" value="' + Hub.escapeHtml(config.title || "") + '" placeholder="Leave blank to hide header" />';
    titleLabel.querySelector("input").addEventListener("input", function (e) { config.title = e.target.value; onChange(config); });
    container.appendChild(titleLabel);

    var contentLabel = document.createElement("label");
    contentLabel.className = "editor-field editor-field--col";
    contentLabel.innerHTML =
      '<span>HTML content</span>' +
      '<textarea rows="8" placeholder="<p>Hello world</p>">' +
      Hub.escapeHtml(config.content || "") +
      '</textarea>';
    contentLabel.querySelector("textarea").addEventListener("input", function (e) { config.content = e.target.value; onChange(config); });
    container.appendChild(contentLabel);
  },

  defaultConfig: function () {
    return { title: "", content: "" };
  }
});
