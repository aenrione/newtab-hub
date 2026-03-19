/* ── Zen mode: idle auto-hide & manual toggle ── */

window.Hub = window.Hub || {};

Hub.zen = (function () {
  var IDLE_TIMEOUT = 5000; // 10 seconds
  var active = false;
  var timer = null;
  var getState = null;
  var shell = null;
  var manuallyToggled = false;

  function hasBgImage() {
    var img = document.getElementById("hub-bg-image");
    if (img && img.style.backgroundImage && img.style.backgroundImage !== "none") return true;
    var vid = document.getElementById("hub-bg-video");
    return !!vid;
  }

  function shouldBlockZen() {
    if (!getState) return false;
    var st = getState();
    /* Block during edit mode */
    if (st.editing) return true;
    /* Block when theme sidebar is open */
    if (document.querySelector(".theme-sidebar")) return true;
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
      timer = setTimeout(enter, IDLE_TIMEOUT);
    }
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

    updateButtonIcon();
    resetTimer();
  }

  return {
    init: init,
    toggle: toggle,
    exit: exit,
    isActive: function () { return active; },
    resetTimer: resetTimer,
    updateButtonIcon: updateButtonIcon
  };
})();
