/* ── Zen mode: idle auto-hide & manual toggle ── */

window.Hub = window.Hub || {};

Hub.zen = (function () {
  var DEFAULT_IDLE_TIMEOUT = 5000;
  var idleTimeoutMs = DEFAULT_IDLE_TIMEOUT;
  var active = false;
  var timer = null;
  var getState = null;
  var shell = null;
  var manuallyToggled = false;

  function sanitizeIdleTimeoutMs(value) {
    var ms = Number(value);
    if (!Number.isFinite(ms)) return DEFAULT_IDLE_TIMEOUT;
    return Math.max(1000, Math.min(120000, Math.round(ms)));
  }

  function getStore() {
    var st = getState && getState();
    return st && st.store;
  }

  function hasBgImage() {
    var img = document.getElementById("hub-bg-image");
    if (img && img.style.backgroundImage && img.style.backgroundImage !== "none") return true;
    var vid = document.getElementById("hub-bg-video");
    return !!vid;
  }

  function isEditableElement(el) {
    if (!el) return false;
    if (el.isContentEditable) return true;
    if (el.classList && el.classList.contains("todo-title-edit")) return true;
    return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT";
  }

  function shouldBlockZen() {
    /* Block during edit mode */
    if (Hub.grid && Hub.grid.isEditing && Hub.grid.isEditing()) return true;
    /* Block while user is typing / focused in form controls */
    if (isEditableElement(document.activeElement)) return true;
    /* Block when theme sidebar is open */
    if (document.querySelector(".theme-sidebar.is-open")) return true;
    /* Block when help dialog is open */
    if (document.querySelector(".help-dialog[open]")) return true;
    /* Block when customize dialog is open */
    if (document.querySelector(".customize-dialog[open]")) return true;
    return false;
  }

  function enter() {
    if (active || shouldBlockZen()) return;
    active = true;
    shell.classList.add("zen-mode");
    clearTimeout(timer);
    timer = null;
  }

  function exit() {
    if (!active) return;
    active = false;
    manuallyToggled = false;
    shell.classList.remove("zen-mode");
    resetTimer();
  }

  function toggle() {
    if (active) {
      exit();
    } else {
      manuallyToggled = true;
      enter();
    }
    updateButtonIcon();
  }

  function updateButtonIcon() {
    var btn = document.getElementById("zen-toggle");
    if (!btn) return;
    btn.innerHTML = active ? Hub.icons.eyeOff : Hub.icons.eye;
    btn.title = active ? "Exit zen mode (z)" : "Zen mode (z)";
  }

  function resetTimer() {
    clearTimeout(timer);
    timer = null;
    if (!manuallyToggled && hasBgImage() && !shouldBlockZen()) {
      timer = setTimeout(enter, idleTimeoutMs);
    }
  }

  async function setIdleTimeoutMs(value, persist) {
    idleTimeoutMs = sanitizeIdleTimeoutMs(value);
    resetTimer();
    if (persist) {
      var store = getStore();
      if (store) {
        await store.set(Hub.STORAGE_ZEN_SETTINGS_KEY, { idleTimeoutMs: idleTimeoutMs });
      }
    }
    return idleTimeoutMs;
  }

  async function loadSettings() {
    var store = getStore();
    if (!store) return idleTimeoutMs;
    var saved = await store.get(Hub.STORAGE_ZEN_SETTINGS_KEY);
    if (saved && saved.idleTimeoutMs != null) {
      idleTimeoutMs = sanitizeIdleTimeoutMs(saved.idleTimeoutMs);
    }
    return idleTimeoutMs;
  }

  function onActivity() {
    if (active && !manuallyToggled) {
      exit();
      updateButtonIcon();
    } else if (!active) {
      resetTimer();
    }
  }

  function init(stateFn) {
    getState = stateFn;
    shell = document.querySelector(".shell");

    document.addEventListener("mousemove", onActivity);
    document.addEventListener("keydown", function (e) {
      /* Let the z keybind in keyboard.js handle the toggle;
         this just handles waking from idle-triggered zen */
      if (active && !manuallyToggled) {
        onActivity();
      } else if (!active) {
        resetTimer();
      }
    });
    document.addEventListener("click", onActivity);
    document.addEventListener("focusin", function () {
      if (shouldBlockZen()) {
        if (active && !manuallyToggled) {
          exit();
          updateButtonIcon();
        } else if (!active) {
          resetTimer();
        }
      }
    });

    updateButtonIcon();
    loadSettings().finally(resetTimer);
  }

  return {
    init: init,
    toggle: toggle,
    exit: exit,
    isActive: function () { return active; },
    getIdleTimeoutMs: function () { return idleTimeoutMs; },
    setIdleTimeoutMs: setIdleTimeoutMs,
    resetTimer: resetTimer,
    updateButtonIcon: updateButtonIcon
  };
})();
