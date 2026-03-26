/* ── Calendar widget plugin ── */

Hub.injectStyles("widget-calendar", `
  .cal-nav-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .cal-month-label {
    font-size: 0.82rem;
    font-weight: 600;
    color: var(--muted-strong);
  }
  .cal-nav-btn {
    background: none;
    border: none;
    color: var(--muted);
    cursor: pointer;
    font-size: 1rem;
    line-height: 1;
    padding: 2px 6px;
    border-radius: var(--radius-sm);
    transition: background 80ms;
  }
  .cal-nav-btn:hover { background: var(--surface-hover); color: var(--text); }
  .cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 2px;
    text-align: center;
  }
  .cal-day-name {
    font-size: 0.62rem;
    font-weight: 700;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 2px 0;
  }
  .cal-cell {
    font-size: 0.78rem;
    padding: 3px 1px;
    border-radius: var(--radius-sm);
    color: var(--muted);
    cursor: default;
    line-height: 1.5;
  }
  .cal-cell.in-month { color: var(--text); }
  .cal-cell.is-weekend { color: var(--muted); }
  .cal-cell.in-month.is-weekend { color: var(--muted-strong); }
  .cal-cell.is-today {
    background: var(--accent-2);
    color: #fff !important;
    font-weight: 700;
  }
`);

Hub.registry.register("calendar", {
  label: "Calendar",
  icon: "calendar",

  render: function (container, config) {
    container.innerHTML =
      '<div class="widget-header"><h2>' + Hub.escapeHtml(config.title || "Calendar") + '</h2></div>' +
      '<div class="cal-body"></div>';
    calRender(container.querySelector(".cal-body"), config, new Date());
  },

  renderEditor: function (container, config, onChange) {
    container.replaceChildren();

    var titleLabel = document.createElement("label");
    titleLabel.className = "editor-field";
    titleLabel.innerHTML = '<span>Widget title</span><input type="text" value="' + Hub.escapeHtml(config.title || "Calendar") + '" />';
    titleLabel.querySelector("input").addEventListener("input", function (e) { config.title = e.target.value; onChange(config); });
    container.appendChild(titleLabel);

    container.appendChild(Hub.createCustomSelect("First day of week", [
      { value: "sun", label: "Sunday" },
      { value: "mon", label: "Monday" }
    ], config.firstDay || "sun", function (v) { config.firstDay = v; onChange(config); }));
  },

  rawEditorSchema: {
    fields: {
      title: { type: "string" },
      firstDay: { type: "string", enum: ["sun", "mon"], description: "First day of week" }
    }
  },

  defaultConfig: function () {
    return { title: "Calendar", firstDay: "sun" };
  }
});

function calRender(body, config, date) {
  var startOnMon = config.firstDay === "mon";
  var today = new Date();
  var year = date.getFullYear();
  var month = date.getMonth();

  var monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(date);

  /* Navigation row */
  var navRow = document.createElement("div");
  navRow.className = "cal-nav-row";

  var prevBtn = document.createElement("button");
  prevBtn.type = "button";
  prevBtn.className = "cal-nav-btn";
  prevBtn.textContent = "\u2039";
  prevBtn.addEventListener("click", function () { calRender(body, config, new Date(year, month - 1, 1)); });

  var nextBtn = document.createElement("button");
  nextBtn.type = "button";
  nextBtn.className = "cal-nav-btn";
  nextBtn.textContent = "\u203A";
  nextBtn.addEventListener("click", function () { calRender(body, config, new Date(year, month + 1, 1)); });

  var monthEl = document.createElement("span");
  monthEl.className = "cal-month-label";
  monthEl.textContent = monthLabel;

  navRow.appendChild(prevBtn);
  navRow.appendChild(monthEl);
  navRow.appendChild(nextBtn);

  /* Day name headers */
  var grid = document.createElement("div");
  grid.className = "cal-grid";

  var dayNames = startOnMon
    ? ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]
    : ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  dayNames.forEach(function (name) {
    var el = document.createElement("div");
    el.className = "cal-day-name";
    el.textContent = name;
    grid.appendChild(el);
  });

  /* Calculate offset for first day of month */
  var firstOfMonth = new Date(year, month, 1).getDay(); /* 0=Sun */
  var offset = startOnMon ? (firstOfMonth + 6) % 7 : firstOfMonth;
  var daysInMonth = new Date(year, month + 1, 0).getDate();
  var prevMonthDays = new Date(year, month, 0).getDate();

  /* Leading padding from previous month */
  for (var p = 0; p < offset; p++) {
    var cell = document.createElement("div");
    cell.className = "cal-cell";
    cell.textContent = prevMonthDays - offset + 1 + p;
    grid.appendChild(cell);
  }

  /* Current month */
  for (var d = 1; d <= daysInMonth; d++) {
    var cell = document.createElement("div");
    var dow = new Date(year, month, d).getDay();
    var isWeekend = dow === 0 || dow === 6;
    var isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    cell.className = "cal-cell in-month" + (isToday ? " is-today" : "") + (isWeekend ? " is-weekend" : "");
    cell.textContent = d;
    grid.appendChild(cell);
  }

  /* Trailing padding */
  var total = offset + daysInMonth;
  var trailing = total % 7 === 0 ? 0 : 7 - (total % 7);
  for (var t = 1; t <= trailing; t++) {
    var cell = document.createElement("div");
    cell.className = "cal-cell";
    cell.textContent = t;
    grid.appendChild(cell);
  }

  body.replaceChildren(navRow, grid);
}
