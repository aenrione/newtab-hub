/* ── Clock widget plugin ── */

Hub.injectStyles("widget-clock", `
  .widget-clock { display: flex; flex-direction: column; align-items: center; justify-content: center; }
  .clock-time {
    font-family: var(--font-display);
    font-size: 1.6rem;
    font-weight: 600;
    letter-spacing: -0.03em;
  }
  .clock-date { font-size: 0.76rem; color: var(--muted); }
`);

Hub.registry.register("clock", {
  label: "Clock",
  icon: "\u231A",

  render: function (container, config) {
    var now = new Date();
    var time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(now);
    var date = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(now);
    container.innerHTML =
      '<div class="clock-time">' + Hub.escapeHtml(time) + '</div>' +
      '<div class="clock-date">' + Hub.escapeHtml(date) + '</div>';

    if (!container._clockInterval) {
      container._clockInterval = setInterval(function () {
        var n = new Date();
        var t = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(n);
        var d = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(n);
        var tEl = container.querySelector(".clock-time");
        var dEl = container.querySelector(".clock-date");
        if (tEl) tEl.textContent = t;
        if (dEl) dEl.textContent = d;
      }, 30000);
    }
  },

  renderEditor: function (container, config, onChange) {
    container.innerHTML = '<p class="editor-hint">No configuration needed for the clock widget.</p>';
  },

  defaultConfig: function () { return {}; }
});
