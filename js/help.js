/* ── Help dialog (keyboard shortcuts reference + command palette) ── */

window.Hub = window.Hub || {};

Hub.help = (function () {
  var dialog = null;

  /* [key, description, action (optional)] */
  var SHORTCUTS = [
    ["/", "Focus search", function () { Hub.focusSearch(); }],
    ["Ctrl/Cmd + K", "Focus search", function () { Hub.focusSearch(); }],
    ["1 – 9", "Open pinned link"],
    ["H / Left", "Navigate left"],
    ["J / Down", "Navigate down"],
    ["K / Up", "Navigate up"],
    ["L / Right", "Navigate right"],
    ["Enter", "Open focused link"],
    ["U", "Scroll up"],
    ["D", "Scroll down"],
    ["Z", "Toggle zen mode", function () { Hub.zen.toggle(); Hub.zen.updateButtonIcon(); }],
    ["Shift+Z", "Lock / unlock zen auto-trigger", function () { Hub.zen.toggleLock(); }],
    ["<key>", "Focus widget group (shown on headers)"],
    ["<key> + 1-9", "Open Nth item in focused group"],
    ["<key> + 0", "Focus widget input (e.g. Todo)"],
    ["P / Shift+P", "Next / previous profile", function () { if (Hub.cycleProfile) Hub.cycleProfile(1); }],
    ["T", "Open / close theme sidebar", function () { if (Hub.openTheme) Hub.openTheme(); }],
    ["E", "Enter / save edit mode", function () { if (Hub.editMode) { if (Hub.grid.isEditing()) Hub.editMode.save(); else Hub.editMode.enter(); } }],
    ["A", "Add widget (in edit mode)", function () { if (Hub.grid.isEditing() && Hub.editMode) Hub.editMode.addWidget(); }],
    ["Tab / Shift+Tab", "Cycle widgets (in edit mode)"],
    ["Arrows", "Move widget (in edit mode)"],
    ["Shift + Arrows", "Resize widget (in edit mode)"],
    ["C / Enter", "Configure widget (in edit mode)"],
    ["Space", "Grab / release focused widget (in edit mode)"],
    ["X / Delete", "Remove widget (in edit mode)"],
    ["Ctrl/Cmd + S", "Save layout (in edit mode)", function () { if (Hub.grid.isEditing() && Hub.editMode) Hub.editMode.save(); }],
    ["Y", "Pull from WebDAV (manual, undoable)", function () { if (Hub.syncStatus) Hub.syncStatus.pull(); }],
    ["Shift+Y", "Push to WebDAV (F = force on conflict)", function () { if (Hub.syncStatus) Hub.syncStatus.confirmPush(); }],
    ["?", "Show this help"],
    ["Escape", "Close dialog / cancel edit / blur search"]
  ];

  var searchInput, tbody, focusedRow;

  function buildRow(s) {
    var tr = document.createElement("tr");
    tr.className = "help-row" + (s[2] ? " help-row-actionable" : "");
    tr.innerHTML = '<td><kbd>' + Hub.escapeHtml(s[0]) + '</kbd></td><td>' + Hub.escapeHtml(s[1]) + '</td>';
    if (s[2]) {
      tr.tabIndex = 0;
      tr.dataset.actionIdx = "1";
      tr.addEventListener("click", function () {
        dialog.close();
        s[2]();
      });
    }
    tr._shortcutData = s;
    return tr;
  }

  function renderRows(filter) {
    tbody.replaceChildren();
    focusedRow = -1;
    var filt = (filter || "").toLowerCase();
    var matches = SHORTCUTS.filter(function (s) {
      if (!filt) return true;
      return s[0].toLowerCase().includes(filt) || s[1].toLowerCase().includes(filt);
    });
    if (!matches.length) {
      var empty = document.createElement("tr");
      empty.innerHTML = '<td colspan="2" class="help-empty">No matching shortcuts</td>';
      tbody.appendChild(empty);
      return;
    }
    matches.forEach(function (s) { tbody.appendChild(buildRow(s)); });
  }

  function getActionableRows() {
    return Array.from(tbody.querySelectorAll(".help-row-actionable"));
  }

  function highlightRow(idx) {
    var rows = getActionableRows();
    rows.forEach(function (r) { r.classList.remove("help-row-focus"); });
    if (idx < 0 || idx >= rows.length) { focusedRow = -1; return; }
    focusedRow = idx;
    rows[idx].classList.add("help-row-focus");
    rows[idx].scrollIntoView({ block: "nearest" });
  }

  function create() {
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.className = "help-dialog";

    var content = document.createElement("div");
    content.className = "help-content";

    var header = document.createElement("div");
    header.className = "help-header";
    header.innerHTML = '<h2>Keyboard shortcuts</h2><button class="help-close" type="button">&times;</button>';
    content.appendChild(header);

    /* Search */
    var searchWrap = document.createElement("div");
    searchWrap.className = "help-search-wrap";
    searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.className = "help-search";
    searchInput.placeholder = "Search shortcuts or run action...";
    searchWrap.appendChild(searchInput);
    content.appendChild(searchWrap);

    var table = document.createElement("table");
    table.className = "help-table";
    tbody = document.createElement("tbody");
    table.appendChild(tbody);
    content.appendChild(table);

    /* Hint */
    var hint = document.createElement("div");
    hint.className = "help-hint";
    hint.textContent = "Highlighted rows are actionable — press Enter or click to trigger.";
    content.appendChild(hint);

    dialog.appendChild(content);

    /* Render all rows */
    renderRows("");

    /* Search filtering */
    searchInput.addEventListener("input", function () {
      renderRows(searchInput.value);
    });

    /* Keyboard nav within help */
    searchInput.addEventListener("keydown", function (e) {
      var rows = getActionableRows();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        highlightRow(focusedRow < rows.length - 1 ? focusedRow + 1 : 0);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        highlightRow(focusedRow > 0 ? focusedRow - 1 : rows.length - 1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (focusedRow >= 0 && focusedRow < rows.length) {
          rows[focusedRow].click();
        }
      }
    });

    header.querySelector(".help-close").addEventListener("click", function () { dialog.close(); });
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) dialog.close();
    });

    document.body.appendChild(dialog);
    return dialog;
  }

  function show() {
    create().showModal();
    /* Reset search and focus */
    searchInput.value = "";
    renderRows("");
    requestAnimationFrame(function () { searchInput.focus(); });
  }
  function hide() { if (dialog && dialog.open) dialog.close(); }

  return { show: show, hide: hide };
})();
