/* Capture keystrokes before search input is focused and replay them */
(function () {
  var buf = [];
  var listening = true;

  function flushBufferedKeys(input) {
    if (!input || !buf.length) return;
    input.value = buf.join("") + input.value;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    buf = [];
  }

  function earlyKey(e) {
    if (!listening) return;
    var input = document.querySelector('[data-search-input="true"]');
    if (input && document.activeElement === input) {
      flushBufferedKeys(input);
      stop();
      return;
    }
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
    var input = document.querySelector('[data-search-input="true"]');
    if (input) {
      flushBufferedKeys(input);
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  };
  window.__disableEarlyKeys = function () {
    buf = [];
    stop();
  };
})();
