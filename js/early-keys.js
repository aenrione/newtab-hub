/* Capture keystrokes before search input is focused and replay them */
(function () {
  var buf = [];
  var listening = true;
  function earlyKey(e) {
    if (!listening) return;
    var input = document.getElementById("quick-search");
    if (input && document.activeElement === input) { stop(); return; }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      buf.push(e.key);
    }
  }
  function stop() {
    listening = false;
    document.removeEventListener("keydown", earlyKey, true);
  }
  document.addEventListener("keydown", earlyKey, true);
  window.__flushEarlyKeys = function () {
    stop();
    var input = document.getElementById("quick-search");
    if (input && buf.length) {
      input.value = buf.join("");
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    buf = [];
  };
})();
