/* ── Markdown widget plugin ── */

Hub.injectStyles("widget-markdown", `
  .markdown-content { overflow: hidden; }
  .markdown-content h1, .markdown-content h2, .markdown-content h3,
  .markdown-content h4, .markdown-content h5, .markdown-content h6 {
    margin: 0.75em 0 0.25em;
    line-height: 1.3;
    font-weight: 600;
    color: var(--text);
  }
  .markdown-content h1 { font-size: 1.3em; }
  .markdown-content h2 { font-size: 1.15em; }
  .markdown-content h3 { font-size: 1.05em; }
  .markdown-content h4, .markdown-content h5, .markdown-content h6 { font-size: 0.95em; }
  .markdown-content p { margin: 0.4em 0; }
  .markdown-content ul, .markdown-content ol {
    margin: 0.4em 0;
    padding-left: 1.4em;
  }
  .markdown-content li { margin: 0.15em 0; }
  .markdown-content a { color: var(--accent-2); }
  .markdown-content a:hover { text-decoration: underline; }
  .markdown-content code {
    background: var(--bg-offset, rgba(0,0,0,0.15));
    border-radius: 3px;
    padding: 0.1em 0.35em;
    font-family: var(--font-mono, monospace);
    font-size: 0.88em;
  }
  .markdown-content pre {
    background: var(--bg-offset, rgba(0,0,0,0.15));
    border-radius: var(--radius-sm);
    padding: 0.6em 0.8em;
    overflow-x: auto;
    margin: 0.5em 0;
  }
  .markdown-content pre code {
    background: none;
    padding: 0;
    font-size: 0.82em;
  }
  .markdown-content blockquote {
    border-left: 3px solid var(--accent-2);
    margin: 0.5em 0;
    padding: 0.1em 0.8em;
    color: var(--text-muted, var(--text));
    opacity: 0.8;
  }
  .markdown-content hr {
    border: none;
    border-top: 1px solid var(--border);
    margin: 0.75em 0;
  }
  .markdown-content strong { font-weight: 700; }
  .markdown-content em { font-style: italic; }
  .markdown-content s { text-decoration: line-through; }
  .markdown-content li.markdown-task { list-style: none; margin-left: -1.1em; display: flex; align-items: baseline; gap: 0.4em; }
  .markdown-content li.markdown-task input[type="checkbox"] {
    flex-shrink: 0;
    margin: 0;
    accent-color: var(--accent-2);
    cursor: default;
  }
  .markdown-content li.markdown-task.markdown-task--done > span { opacity: 0.5; text-decoration: line-through; }
  .markdown-content > *:first-child { margin-top: 0; }
  .markdown-content > *:last-child { margin-bottom: 0; }
  .widget-markdown .editor-field--col { flex-direction: column; align-items: flex-start; gap: 4px; }
  .widget-markdown .editor-field--col textarea {
    width: 100%;
    min-height: 140px;
    padding: 6px 8px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--bg);
    color: var(--text);
    font-size: 0.78rem;
    font-family: var(--font-mono, monospace);
    resize: vertical;
  }
  .widget-markdown .editor-field--col textarea:focus { outline: none; border-color: var(--accent-2); }
`);

Hub.registry.register("markdown", {
  label: "Markdown",
  icon: "text",

  render: function (container, config) {
    container.className += " widget-markdown";
    var title = (config.title || "").trim();
    container.innerHTML = title
      ? '<div class="widget-header"><h2>' + Hub.escapeHtml(title) + '</h2></div><div class="markdown-content"></div>'
      : '<div class="markdown-content"></div>';

    var contentEl = container.querySelector(".markdown-content");
    if (config.content) {
      contentEl.innerHTML = markdownToHtml(config.content);
    } else {
      contentEl.innerHTML = '<div class="empty-state">Add Markdown content in the widget editor.</div>';
    }
  },

  renderEditor: function (container, config, onChange) {
    container.replaceChildren();
    container.className += " widget-markdown";

    var titleLabel = document.createElement("label");
    titleLabel.className = "editor-field";
    titleLabel.innerHTML =
      '<span>Widget title (optional)</span>' +
      '<input type="text" value="' + Hub.escapeHtml(config.title || "") + '" placeholder="Leave blank to hide header" />';
    var titleInput = titleLabel.querySelector("input");
    titleInput.dataset.navHeaderField = "";
    titleInput.addEventListener("input", function (e) { config.title = e.target.value; onChange(config); });
    container.appendChild(titleLabel);

    var contentLabel = document.createElement("label");
    contentLabel.className = "editor-field editor-field--col";
    contentLabel.innerHTML =
      '<span>Markdown content</span>' +
      '<textarea rows="10" placeholder="## Reminders\n- Buy groceries\n- Call Alice\n\n**Important:** Deploy at 3pm">' +
      Hub.escapeHtml(config.content || "") +
      '</textarea>';
    contentLabel.querySelector("textarea").addEventListener("input", function (e) { config.content = e.target.value; onChange(config); });
    container.appendChild(contentLabel);
  },

  defaultConfig: function () {
    return { title: "", content: "" };
  }
});

/* ── Helpers ── */

function markdownToHtml(md) {
  var lines = md.split("\n");
  var out = [];
  var i = 0;

  while (i < lines.length) {
    var line = lines[i];

    /* fenced code block */
    if (/^```/.test(line)) {
      var lang = line.slice(3).trim();
      var codeLines = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) {
        codeLines.push(markdownEscapeHtml(lines[i]));
        i++;
      }
      out.push("<pre><code" + (lang ? ' class="language-' + markdownEscapeHtml(lang) + '"' : "") + ">" + codeLines.join("\n") + "</code></pre>");
      i++;
      continue;
    }

    /* headings */
    var headingMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (headingMatch) {
      var level = headingMatch[1].length;
      out.push("<h" + level + ">" + markdownInline(headingMatch[2]) + "</h" + level + ">");
      i++;
      continue;
    }

    /* horizontal rule */
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      out.push("<hr>");
      i++;
      continue;
    }

    /* blockquote */
    if (/^>\s?/.test(line)) {
      var quoteLines = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ""));
        i++;
      }
      out.push("<blockquote>" + markdownInline(quoteLines.join(" ")) + "</blockquote>");
      continue;
    }

    /* unordered list (including task checkboxes) */
    if (/^[*\-+]\s/.test(line)) {
      var ulItems = [];
      while (i < lines.length && /^[*\-+]\s/.test(lines[i])) {
        var itemText = lines[i].replace(/^[*\-+]\s/, "");
        var checkboxMatch = itemText.match(/^\[(x| |)\]\s*(.*)/i);
        if (checkboxMatch) {
          var checked = checkboxMatch[1].toLowerCase() === "x";
          ulItems.push(
            '<li class="markdown-task' + (checked ? " markdown-task--done" : "") + '">' +
            '<input type="checkbox"' + (checked ? " checked" : "") + ' disabled>' +
            "<span>" + markdownInline(checkboxMatch[2]) + "</span>" +
            "</li>"
          );
        } else {
          ulItems.push("<li>" + markdownInline(itemText) + "</li>");
        }
        i++;
      }
      out.push("<ul>" + ulItems.join("") + "</ul>");
      continue;
    }

    /* ordered list */
    if (/^\d+\.\s/.test(line)) {
      var olItems = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        olItems.push("<li>" + markdownInline(lines[i].replace(/^\d+\.\s/, "")) + "</li>");
        i++;
      }
      out.push("<ol>" + olItems.join("") + "</ol>");
      continue;
    }

    /* blank line */
    if (line.trim() === "") {
      i++;
      continue;
    }

    /* paragraph */
    var paraLines = [];
    while (i < lines.length && lines[i].trim() !== "" && !/^(#{1,6}\s|```|[*\-+]\s|\d+\.\s|>\s?|(-{3,}|\*{3,}|_{3,})$)/.test(lines[i])) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length) {
      out.push("<p>" + markdownInline(paraLines.join(" ")) + "</p>");
    }
  }

  return out.join("\n");
}

function markdownInline(text) {
  /* escape HTML first, then restore intentional markup */
  text = markdownEscapeHtml(text);

  /* inline code (must come before bold/italic to avoid mangling backtick content) */
  text = text.replace(/`([^`]+)`/g, "<code>$1</code>");

  /* bold+italic */
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, "<strong><em>$1</em></strong>");
  text = text.replace(/___(.+?)___/g, "<strong><em>$1</em></strong>");

  /* bold */
  text = text.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  text = text.replace(/__(.+?)__/g, "<strong>$1</strong>");

  /* italic */
  text = text.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  text = text.replace(/_([^_]+)_/g, "<em>$1</em>");

  /* strikethrough */
  text = text.replace(/~~(.+?)~~/g, "<s>$1</s>");

  /* links */
  text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, function (_, label, href) {
    /* href was already HTML-escaped; unescape for attribute, then re-escape */
    var rawHref = href.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
    return '<a href="' + markdownEscapeHtml(rawHref) + '" target="_blank" rel="noopener">' + label + "</a>";
  });

  return text;
}

function markdownEscapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
