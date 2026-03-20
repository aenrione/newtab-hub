/* ── Todo widget plugin ── */

Hub.registry.register("todo", {
  label: "Todo",
  icon: "\u2611",

  render: function (container, config, state) {
    var widgetId = container.closest("[data-widget-id]").dataset.widgetId;
    var title = config.title || "Todo";
    container.innerHTML =
      '<div class="widget-header">' +
        '<h2 class="todo-title" title="Double-click to rename">' + Hub.escapeHtml(title) + '</h2>' +
        '<button class="todo-clear-btn toolbar-button toolbar-button-ghost" type="button" title="Clear completed">Clear done</button>' +
      '</div>' +
      '<div class="todo-input-row">' +
        '<input type="text" class="todo-input" placeholder="Add a todo\u2026" data-focusable="true" />' +
      '</div>' +
      '<div class="todo-list"><div class="empty-state">Loading\u2026</div></div>';

    /* Inline rename on double-click */
    function attachRename(h2El) {
      h2El.addEventListener("dblclick", function startRename() {
        if (Hub.grid.isEditing()) return;
        var inp = document.createElement("input");
        inp.type = "text";
        inp.className = "todo-title-edit";
        inp.value = config.title || "Todo";
        h2El.replaceWith(inp);
        inp.focus();
        inp.select();

        var committed = false;
        function commit() {
          if (committed) return;
          committed = true;
          var newTitle = inp.value.trim() || "Todo";
          config.title = newTitle;
          var newH2 = document.createElement("h2");
          newH2.className = "todo-title";
          newH2.title = "Double-click to rename";
          newH2.textContent = newTitle;
          inp.replaceWith(newH2);
          attachRename(newH2);
          Hub.updateWidgetConfig(widgetId, { title: newTitle });
        }

        inp.addEventListener("blur", commit);
        inp.addEventListener("keydown", function (e) {
          if (e.key === "Enter") { e.preventDefault(); inp.blur(); }
          if (e.key === "Escape") { e.preventDefault(); inp.value = config.title || "Todo"; inp.blur(); }
        });
      });
    }
    attachRename(container.querySelector(".todo-title"));
  },

  load: async function (container, config, state, token) {
    var widgetId = container.closest("[data-widget-id]").dataset.widgetId;
    var storageKey = "new-tab-todos-" + widgetId;
    var store = state.store;
    var todos = (await store.get(storageKey)) || [];

    if (token !== state.renderToken) return;

    var listEl = container.querySelector(".todo-list");
    var inputEl = container.querySelector(".todo-input");
    var clearBtn = container.querySelector(".todo-clear-btn");

    function save() { store.set(storageKey, todos); }

    function renderList() {
      if (!todos.length) {
        listEl.innerHTML = '<div class="empty-state">No todos yet.</div>';
        updateClearBtn();
        return;
      }
      var frag = document.createDocumentFragment();
      todos.forEach(function (todo, i) {
        var row = document.createElement("div");
        row.className = "todo-row" + (todo.done ? " is-done" : "");
        row.setAttribute("data-focusable", "true");
        row.setAttribute("tabindex", "0");
        row.setAttribute("role", "button");
        row.setAttribute("data-title", todo.text);
        row.dataset.todoIndex = i;

        row.innerHTML =
          '<span class="todo-check">' + (todo.done ? "\u2611" : "\u2610") + '</span>' +
          '<span class="todo-text">' + Hub.escapeHtml(todo.text) + '</span>' +
          '<button class="todo-delete" type="button" tabindex="-1" title="Delete">' + Hub.icons.x + '</button>';

        /* Toggle done on click/Enter */
        row.addEventListener("click", function (e) {
          if (e.target.closest(".todo-delete")) return;
          todo.done = !todo.done;
          save();
          renderList();
        });

        row.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (e.target.closest(".todo-delete")) return;
            todo.done = !todo.done;
            save();
            renderList();
            /* Re-focus the same index */
            var rows = listEl.querySelectorAll(".todo-row");
            if (rows[i]) rows[i].focus();
          }
          if (e.key === "Delete" || e.key === "Backspace") {
            e.preventDefault();
            todos.splice(i, 1);
            save();
            renderList();
            var rows = listEl.querySelectorAll(".todo-row");
            var next = rows[Math.min(i, rows.length - 1)];
            if (next) next.focus();
            else inputEl.focus();
          }
        });

        /* Delete button */
        row.querySelector(".todo-delete").addEventListener("click", function (e) {
          e.stopPropagation();
          todos.splice(i, 1);
          save();
          renderList();
        });

        frag.appendChild(row);
      });
      listEl.replaceChildren(frag);
      updateClearBtn();
    }

    function updateClearBtn() {
      var hasDone = todos.some(function (t) { return t.done; });
      clearBtn.style.display = hasDone ? "" : "none";
    }

    /* Add todo on Enter, blur on Escape */
    inputEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        var text = inputEl.value.trim();
        if (!text) return;
        todos.unshift({ id: Hub.uid(), text: text, done: false, createdAt: Date.now() });
        inputEl.value = "";
        save();
        renderList();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        inputEl.value = "";
        inputEl.blur();
      }
    });

    /* Clear completed */
    clearBtn.addEventListener("click", function () {
      todos = todos.filter(function (t) { return !t.done; });
      save();
      renderList();
    });

    renderList();
  },

  renderEditor: function (container, config, onChange) {
    container.replaceChildren();
    var titleLabel = document.createElement("label");
    titleLabel.className = "editor-field";
    titleLabel.innerHTML = '<span>Widget title</span><input type="text" value="' + Hub.escapeHtml(config.title || "Todo") + '" />';
    titleLabel.querySelector("input").addEventListener("input", function (e) { config.title = e.target.value; onChange(config); });
    container.appendChild(titleLabel);
  },

  defaultConfig: function () {
    return { title: "Todo" };
  }
});
