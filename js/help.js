/* ── Help dialog (keyboard shortcuts reference) ── */

window.Hub = window.Hub || {};

Hub.help = (function () {
  var dialog = null;

  var SHORTCUTS = [
    ["/", "Focus search"],
    ["Ctrl/Cmd + K", "Focus search"],
    ["1 – 9", "Open pinned link"],
    ["H / Left", "Navigate left"],
    ["J / Down", "Navigate down"],
    ["K / Up", "Navigate up"],
    ["L / Right", "Navigate right"],
    ["Enter", "Open focused link"],
    ["U", "Scroll up"],
    ["D", "Scroll down"],
    ["?", "Show this help"],
    ["Escape", "Close dialog / blur search"]
  ];

  function create() {
    if (dialog) return dialog;

    dialog = document.createElement("dialog");
    dialog.className = "help-dialog";

    var rows = SHORTCUTS.map(function (s) {
      return '<tr><td><kbd>' + Hub.escapeHtml(s[0]) + '</kbd></td><td>' + Hub.escapeHtml(s[1]) + '</td></tr>';
    }).join("");

    dialog.innerHTML =
      '<div class="help-content">' +
        '<div class="help-header">' +
          '<h2>Keyboard shortcuts</h2>' +
          '<button class="help-close" type="button">&times;</button>' +
        '</div>' +
        '<table class="help-table"><tbody>' + rows + '</tbody></table>' +
      '</div>';

    dialog.querySelector(".help-close").addEventListener("click", function () { dialog.close(); });
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) dialog.close();
    });

    document.body.appendChild(dialog);
    return dialog;
  }

  function show() { create().showModal(); }
  function hide() { if (dialog && dialog.open) dialog.close(); }

  return { show: show, hide: hide };
})();
