/* ── ThemeSidebarKeyboard: vim-inspired keyboard navigation for theme sidebar ── */
/*
 * Mirrors EditorKeyboard's two-level modal model:
 *   section mode  (list mode)  — j/k navigate sections, Enter/i to dive in
 *   field mode    (item mode)  — hjkl spatial nav, Enter activates, Esc back
 *
 * Cmd/Ctrl+Enter or Cmd/Ctrl+S — save from any mode
 * Esc           — back one level (field → section → close)
 */

window.ThemeSidebarKeyboard = function ThemeSidebarKeyboard(sidebar, body, opts) {
  this.sidebar = sidebar;
  this.body = body;
  this.onSave = opts.onSave || function () {};
  this.onClose = opts.onClose || function () {};
  this.mode = "section";        // "section" | "field"
  this.activeSectionIndex = 0;
  this.activeFieldIndex = 0;
  this.sections = [];
  this._handler = this._onKey.bind(this);
  this._focusinHandler = this._onFocusin.bind(this);
};

/* ── Lifecycle ── */

ThemeSidebarKeyboard.prototype.attach = function () {
  this.sections = Array.from(this.body.querySelectorAll(".theme-section"));
  this.sidebar.addEventListener("keydown", this._handler);
  this.sidebar.addEventListener("focusin", this._focusinHandler);
  if (this.sections.length) this._focusSection(0);
};

ThemeSidebarKeyboard.prototype.detach = function () {
  this.sidebar.removeEventListener("keydown", this._handler);
  this.sidebar.removeEventListener("focusin", this._focusinHandler);
  this._clearRings();
  this._clearHints();
  this.sections.forEach(function (s) {
    s.classList.remove("theme-section-focused");
    s.removeAttribute("tabindex");
  });
};

/* ── Helpers ── */

ThemeSidebarKeyboard.prototype._getFields = function (section) {
  return Array.from(section.querySelectorAll(
    'input:not([type="file"]), select, textarea, button:not(.theme-sidebar-close)'
  )).filter(function (el) {
    return el.offsetParent !== null && el.style.display !== "none";
  });
};

ThemeSidebarKeyboard.prototype._focusSection = function (index) {
  this.mode = "section";
  this.activeFieldIndex = 0;
  var sections = this.sections;
  sections.forEach(function (s) { s.classList.remove("theme-section-focused"); });
  this._clearRings();
  this._clearHints();
  if (index < 0 || index >= sections.length) return;
  this.activeSectionIndex = index;
  var section = sections[index];
  section.classList.add("theme-section-focused");
  if (!section.hasAttribute("tabindex")) section.tabIndex = -1;
  section.focus({ preventScroll: true });
  section.scrollIntoView({ block: "nearest" });
  this._renderHints(section, "section");
};

ThemeSidebarKeyboard.prototype._enterFieldMode = function () {
  var section = this.sections[this.activeSectionIndex];
  if (!section) return;
  var fields = this._getFields(section);
  if (!fields.length) return;
  this.mode = "field";
  this.activeFieldIndex = 0;
  this._clearHints();
  this._renderHints(section, "field");
  fields[0].classList.add("editor-field-ring");
  fields[0].scrollIntoView({ block: "nearest" });
  section.focus({ preventScroll: true });
};

ThemeSidebarKeyboard.prototype._exitFieldMode = function () {
  this._clearRings();
  this._focusSection(this.activeSectionIndex);
};

ThemeSidebarKeyboard.prototype._moveField = function (dir) {
  var section = this.sections[this.activeSectionIndex];
  if (!section) return;
  var dirMap = { h: "left", l: "right", j: "down", k: "up" };
  var spatialDir = dirMap[dir];
  if (!spatialDir) return;
  var fields = this._getFields(section);
  if (!fields.length) return;
  var currentField = fields[this.activeFieldIndex] || fields[0];
  var result = Hub.keyboard.spatialMove(fields, currentField, spatialDir);
  if (!result) return;
  this._clearRings();
  result.classList.add("editor-field-ring");
  result.scrollIntoView({ block: "nearest" });
  this.activeFieldIndex = fields.indexOf(result);
};

ThemeSidebarKeyboard.prototype._activateField = function () {
  var section = this.sections[this.activeSectionIndex];
  if (!section) return;
  var fields = this._getFields(section);
  var field = fields[this.activeFieldIndex];
  if (!field) return;
  field.focus();
  var tag = field.tagName, type = (field.type || "").toLowerCase();
  if (tag === "BUTTON" || type === "checkbox" || type === "radio") field.click();
};

ThemeSidebarKeyboard.prototype._clearRings = function () {
  this.sidebar.querySelectorAll(".editor-field-ring").forEach(function (el) {
    el.classList.remove("editor-field-ring");
  });
};

ThemeSidebarKeyboard.prototype._clearHints = function () {
  this.sidebar.querySelectorAll(".editor-nav-hints").forEach(function (el) { el.remove(); });
};

ThemeSidebarKeyboard.prototype._renderHints = function (section, mode) {
  this._clearHints();
  var el = document.createElement("div");
  el.className = "editor-nav-hints";
  var hints = mode === "section"
    ? ["j/k sections", "↵ edit", "Cmd/Ctrl+S save", "Esc close"]
    : ["hjkl fields", "↵ edit", "Esc back"];
  hints.forEach(function (text) {
    var span = document.createElement("span");
    span.className = "editor-nav-hint";
    span.textContent = text;
    el.appendChild(span);
  });
  section.appendChild(el);
};

/* ── Focus tracking (mouse/Tab clicks into fields) ── */

ThemeSidebarKeyboard.prototype._onFocusin = function (e) {
  if (e.target === this.sidebar || e.target === this.body) return;
  var sections = this.sections;
  for (var i = 0; i < sections.length; i++) {
    if (sections[i] === e.target) return;   // focus on section container itself
    if (sections[i].contains(e.target)) {
      var fields = this._getFields(sections[i]);
      var fieldIdx = fields.indexOf(e.target);
      if (fieldIdx === -1) return;
      /* User clicked or tabbed into a field — sync state */
      sections.forEach(function (s) { s.classList.remove("theme-section-focused"); });
      this._clearHints();
      this.activeSectionIndex = i;
      this.mode = "field";
      this._clearRings();
      e.target.classList.add("editor-field-ring");
      this.activeFieldIndex = fieldIdx;
      this._renderHints(sections[i], "field");
      return;
    }
  }
};

/* ── Key handler ── */

ThemeSidebarKeyboard.prototype._onKey = function (e) {
  if (!this.sidebar.classList.contains("is-open")) return;
  var meta = e.metaKey || e.ctrlKey;
  var key = (e.key || "").toLowerCase();
  var saveModifier = meta && !e.altKey;

  /* Cmd/Ctrl+Enter or Cmd/Ctrl+S — save from any mode */
  if ((key === "enter" && saveModifier) || (key === "s" && saveModifier)) {
    e.preventDefault();
    this.onSave();
    return;
  }

  /* Escape when preset dropdown is open — close dropdown first */
  if (e.key === "Escape") {
    var openDropdown = this.sidebar.querySelector(".preset-dropdown.is-open");
    if (openDropdown) {
      e.preventDefault();
      e.stopPropagation();
      openDropdown.classList.remove("is-open");
      var psearch = this.sidebar.querySelector(".preset-search");
      if (psearch) psearch.focus();
      return;
    }
  }

  /* ────────── Section mode ────────── */
  if (this.mode === "section") {
    if ((e.key === "j" || e.key === "ArrowDown") && !e.shiftKey && !meta) {
      e.preventDefault();
      this._focusSection(Math.min(this.activeSectionIndex + 1, this.sections.length - 1));
      return;
    }
    if ((e.key === "k" || e.key === "ArrowUp") && !e.shiftKey && !meta) {
      e.preventDefault();
      this._focusSection(Math.max(this.activeSectionIndex - 1, 0));
      return;
    }
    if ((e.key === "Enter" || e.key === "i") && !meta) {
      e.preventDefault();
      this._enterFieldMode();
      return;
    }
    if (e.key === "r" && !e.shiftKey) {
      e.preventDefault();
      var resetBtn = this.sidebar.querySelector("[data-theme-reset]");
      if (resetBtn) resetBtn.click();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      this.onClose();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      e.shiftKey
        ? this._focusSection(Math.max(this.activeSectionIndex - 1, 0))
        : this._focusSection(Math.min(this.activeSectionIndex + 1, this.sections.length - 1));
      return;
    }
    return;
  }

  /* ────────── Field mode ────────── */
  if (this.mode === "field") {
    var section = this.sections[this.activeSectionIndex];
    var fields = section ? this._getFields(section) : [];
    var fieldIsActive = document.activeElement && fields.indexOf(document.activeElement) !== -1;

    if (fieldIsActive) {
      /* Field has browser focus — user is typing or interacting with the field */
      if (e.key === "Escape") {
        e.preventDefault();
        document.activeElement.blur();
        if (section) section.focus({ preventScroll: true });
        return;
      }
      if (e.key === "Tab") {
        var idx = fields.indexOf(document.activeElement);
        if (!e.shiftKey && idx >= fields.length - 1) { e.preventDefault(); this._exitFieldMode(); }
        else if (e.shiftKey && idx <= 0) { e.preventDefault(); this._exitFieldMode(); }
        /* else: let browser advance Tab naturally within the section */
        return;
      }
      return; /* pass all other keys to the active field */
    }

    /* Ring mode — section container has DOM focus, ring visible on a field */
    if (e.key === "h" || e.key === "j" || e.key === "k" || e.key === "l") {
      e.preventDefault();
      this._moveField(e.key);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      this._activateField();
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      this._exitFieldMode();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      if (!e.shiftKey) {
        if (this.activeFieldIndex < fields.length - 1) {
          this.activeFieldIndex++;
          this._clearRings();
          fields[this.activeFieldIndex].classList.add("editor-field-ring");
          fields[this.activeFieldIndex].scrollIntoView({ block: "nearest" });
        } else {
          this._exitFieldMode();
        }
      } else {
        if (this.activeFieldIndex > 0) {
          this.activeFieldIndex--;
          this._clearRings();
          fields[this.activeFieldIndex].classList.add("editor-field-ring");
          fields[this.activeFieldIndex].scrollIntoView({ block: "nearest" });
        } else {
          this._exitFieldMode();
        }
      }
      return;
    }
    return;
  }
};
