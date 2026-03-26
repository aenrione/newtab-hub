/* ── EditorKeyboard: vim-inspired keyboard navigation for widget config forms ── */

window.EditorKeyboard = function EditorKeyboard(panel) {
  this.panel = panel;

  /* Flat-mode state */
  this.flatFields = [];      /* all focusable inputs visible in the panel */
  this.flatFieldIndex = -1;  /* which field has the ring (-1 = none) */
  this.flatInsert = false;   /* true = browser focus is on a field */

  this._handler = this._onKey.bind(this);
  this._hintBuf = "";   /* accumulates hint chars for fields beyond 9 */
};

EditorKeyboard.prototype.attach = function () {
  this.rescan();
  document.addEventListener("keydown", this._handler);
  this._focusinHandler = this._onFocusin.bind(this);
  this.panel.addEventListener("focusin", this._focusinHandler);
  this._pickedHandler = function (e) {
    var idx = this.flatFields.indexOf(e.target);
    if (idx !== -1) this._enterFlatNormal(idx);
  }.bind(this);
  this.panel.addEventListener("custom-select-picked", this._pickedHandler);
};

EditorKeyboard.prototype.detach = function () {
  document.removeEventListener("keydown", this._handler);
  if (this._focusinHandler) this.panel.removeEventListener("focusin", this._focusinHandler);
  if (this._pickedHandler) this.panel.removeEventListener("custom-select-picked", this._pickedHandler);
  this._hintBuf = "";
  this._clearFlatChords();
  this.panel.querySelectorAll(".editor-card[data-remove-active]").forEach(function (el) {
    el.removeAttribute("data-remove-active");
  });
  this.flatFields.forEach(function (f) { f.classList.remove("editor-field-ring"); });
  this.panel.classList.remove("flat-normal", "flat-insert");
};

EditorKeyboard.prototype._onFocusin = function (e) {
  var idx = this.flatFields.indexOf(e.target);
  if (idx !== -1) {
    /* Field gained focus via mouse click or programmatic focus — enter insert mode */
    this.flatInsert = true;
    this.flatFieldIndex = idx;
    this._updateFlatRing();
    this.panel.classList.remove("flat-normal");
    this.panel.classList.add("flat-insert");
  }
};

EditorKeyboard.prototype.rescan = function () {
  var prevCount = this.flatFields.length;
  var prevIdx = this.flatFieldIndex;
  var prevField = prevIdx >= 0 ? this.flatFields[prevIdx] : null;
  this._buildFlatFields();
  var newCount = this.flatFields.length;
  if (!newCount) {
    this._enterFlatNormal(-1);
    return;
  }
  /* If the previously-ringed element is still in the DOM (e.g. a collapsible summary
     that just toggled its children), keep the ring on that same element. */
  if (prevField) {
    var sameIdx = this.flatFields.indexOf(prevField);
    if (sameIdx !== -1) { this._enterFlatNormal(sameIdx); return; }
  }
  /* Element gone — if fields grew (list item added) jump to first new field */
  if (prevCount > 0 && newCount > prevCount) {
    this._enterFlatNormal(prevCount);
    return;
  }
  /* Item removed or full rebuild — clamp to valid range */
  this._enterFlatNormal(Math.min(Math.max(prevIdx, 0), newCount - 1));
};

/* ── Flat-mode helpers ── */

EditorKeyboard.prototype._buildFlatFields = function () {
  this._clearFlatChords();
  this.flatFields = Array.from(this.panel.querySelectorAll(
    'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"])' +
    ':not([type="color"]):not([type="button"]):not([type="submit"]):not([type="range"]):not([disabled]),' +
    'select:not([disabled]),' +
    'textarea:not([disabled]),' +
    'button[data-custom-select]:not([disabled]),' +
    'button[data-custom-picker]:not([disabled]),' +
    '[data-nav-toggle]:not([disabled])'
  )).filter(function (el) {
    if (el.offsetParent === null) return false;
    /* Skip fields inside a closed <details> — summaries are always visible and exempt */
    if (el.tagName !== "SUMMARY") {
      var d = el.closest("details");
      if (d && !d.open) return false;
    }
    return true;
  });

  var self = this;
  this.flatFields.forEach(function (field, i) {
    var container = field.closest(".editor-field, .style-control-row, .widget-editor-credentials-row");
    if (!container) container = field.parentElement;
    if (container && !container.dataset.flatChord) {
      container.dataset.flatChord = self._hintLabel(i);
    }
  });
};

EditorKeyboard.prototype._clearFlatChords = function () {
  this.panel.querySelectorAll("[data-flat-chord]").forEach(function (el) {
    el.removeAttribute("data-flat-chord");
  });
};

/* Letters that don't conflict with any EditorKeyboard nav key (j k i o a n d x r)
   OR any global keyboard.js reserved key (h j k l d u z e p t a y). */
EditorKeyboard._hintChars = "bcfgmqsvw";

/* Returns the hint label for the i-th field (0-based).
   0-8 → "1"-"9".
   9+  → letters from _hintChars, using prefix-partitioning so no 1-char hint
          is ever a prefix of a 2-char hint (avoids Vimium-style ambiguity):
          - Compute r = how many chars to reserve as 2-char prefixes so that
            (n-r) 1-char hints + r*n 2-char hints >= total letter-labeled fields.
          - Reserved prefix chars are never emitted as standalone 1-char hints. */
EditorKeyboard.prototype._hintLabel = function (i) {
  if (i < 9) return String(i + 1);
  var chars = EditorKeyboard._hintChars;
  var n = chars.length;
  var letterIdx = i - 9;
  var k = Math.max(0, this.flatFields.length - 9); /* total letter-labeled slots needed */

  /* Minimum prefix chars needed so (n-r) + r*n >= k */
  var r = k <= n ? 0 : Math.min(n, Math.ceil((k - n) / (n - 1)));
  var oneCharCount = n - r;

  if (letterIdx < oneCharCount) return chars[letterIdx];
  var twoIdx = letterIdx - oneCharCount;
  return chars[oneCharCount + Math.floor(twoIdx / n)] + chars[twoIdx % n];
};

EditorKeyboard.prototype._enterFlatNormal = function (idx) {
  this.flatInsert = false;
  this.flatFieldIndex = idx;
  this._updateFlatRing();
  if (!this.panel.hasAttribute("tabindex")) this.panel.setAttribute("tabindex", "-1");
  this.panel.classList.add("flat-normal");
  this.panel.classList.remove("flat-insert");
  this.panel.focus({ preventScroll: true });
};

EditorKeyboard.prototype._enterFlatInsert = function (idx) {
  var field = this.flatFields[idx];
  if (!field) return;
  this.flatInsert = true;
  this.flatFieldIndex = idx;
  this._updateFlatRing();
  this.panel.classList.remove("flat-normal");
  this.panel.classList.add("flat-insert");
  field.focus();
  if (field.tagName === "SELECT" || "customSelect" in field.dataset || "customPicker" in field.dataset) {
    field.click();
  } else if (field.select && (field.type === "text" || field.type === "url" || field.type === "email" || field.type === "number")) {
    field.select();
  }
};

EditorKeyboard.prototype._updateFlatRing = function () {
  var idx = this.flatFieldIndex;
  /* Clear delete-active marker from all cards first */
  this.panel.querySelectorAll(".editor-card[data-remove-active]").forEach(function (el) {
    el.removeAttribute("data-remove-active");
  });
  this.flatFields.forEach(function (f, i) {
    f.classList.toggle("editor-field-ring", i === idx);
  });
  /* Mark the card containing the ringed field so its remove button shows the 'd' hint */
  var ringed = idx >= 0 ? this.flatFields[idx] : null;
  var card = ringed && ringed.closest(".editor-card");
  if (card) card.dataset.removeActive = "";
  /* Scroll the ringed field into view */
  if (ringed) ringed.scrollIntoView({ block: "nearest" });
};

/* ── Utility button finders ── */

EditorKeyboard.prototype._getAddBtn = function () {
  return this.panel.querySelector("[data-nav-add]");
};

EditorKeyboard.prototype._getRawBtn = function () {
  return this.panel.querySelector("[data-nav-raw]");
};

EditorKeyboard.prototype._getSaveBtn = function () {
  return this.panel.querySelector("[data-nav-save]");
};

/* ── Key handler ── */

EditorKeyboard.prototype._onKey = function (e) {
  /* Only handle keys when focus is inside this panel (prevents conflicts with grid navigation) */
  if (!this.panel.contains(document.activeElement)) return;

  var meta = e.metaKey || e.ctrlKey;

  /* Ctrl+D / Ctrl+U — scroll panel half-page down / up (vim-style, any mode) */
  if ((e.key === "d" || e.key === "u") && e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    var scrollEl = this.panel.querySelector(".config-modal-body") || this.panel;
    var half = Math.round(scrollEl.clientHeight / 2) || 200;
    scrollEl.scrollBy({ top: e.key === "d" ? half : -half, behavior: "smooth" });
    return;
  }

  /* ⌘S / Ctrl+S: save grid layout and exit edit mode (any mode) */
  if (e.key === "s" && meta) {
    e.preventDefault();
    if (window.Hub && Hub.editMode) Hub.editMode.save();
    return;
  }

  /* ⌘Enter / Ctrl+Enter: save and close from any mode */
  if (e.key === "Enter" && meta) {
    e.preventDefault();
    var saveBtn = this._getSaveBtn();
    if (saveBtn) saveBtn.click();
    return;
  }

  var activeInFlat = this.flatFields.indexOf(document.activeElement);

  /* If an editable element is focused but not in flatFields (e.g. a picker's search input),
     let all keys pass through so the element's own handlers work uninterrupted. */
  if (activeInFlat === -1) {
    var ae = document.activeElement;
    var tag = ae ? ae.tagName : "";
    if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
  }

  /* ── INSERT mode: a tracked field has browser focus ── */
  if (activeInFlat !== -1) {
    if (e.key === "Escape") {
      e.preventDefault();
      this._enterFlatNormal(activeInFlat);
      return;
    }
    /* Enter on a plain text input — stay in insert, don't submit */
    if (e.key === "Enter" && document.activeElement && document.activeElement.tagName === "INPUT") {
      e.preventDefault();
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      var nextIdx = e.shiftKey
        ? (activeInFlat - 1 + this.flatFields.length) % this.flatFields.length
        : (activeInFlat + 1) % this.flatFields.length;
      this._enterFlatInsert(nextIdx);
      return;
    }
    /* All other keys go directly to the focused field */
    return;
  }

  /* ── NORMAL mode: panel has focus (not a field) ── */

  /* 1-9 — immediate jump to that field */
  if (/^[1-9]$/.test(e.key) && !meta && !e.altKey) {
    var n = parseInt(e.key, 10);
    if (n <= this.flatFields.length) {
      e.preventDefault();
      this._hintBuf = "";
      this._enterFlatInsert(n - 1);
    }
    return;
  }

  /* Hint letters — Vimium-style: type the badge label for immediate access to any field.
     Single letter jumps instantly when unique; first letter of a 2-char hint waits for one more key. */
  if (EditorKeyboard._hintChars.indexOf(e.key) !== -1 && !meta && !e.altKey && !e.shiftKey) {
    e.preventDefault();
    this._hintBuf += e.key;
    var buf = this._hintBuf;
    var matches = [];
    for (var hi = 0; hi < this.flatFields.length; hi++) {
      var lbl = this._hintLabel(hi);
      if (lbl === buf) { matches = [hi]; break; }          /* exact — stop early */
      if (lbl.length > buf.length && lbl.indexOf(buf) === 0) matches.push(hi);
    }
    if (matches.length === 1) { this._hintBuf = ""; this._enterFlatInsert(matches[0]); }
    else if (!matches.length)  { this._hintBuf = ""; }
    /* else: multiple candidates, keep buf and wait for next letter */
    return;
  }

  /* Any non-hint key clears the buffer before further processing */
  this._hintBuf = "";

  if (e.key === "Escape") {
    /* Let onEditEscape in grid.js handle returning to the grid */
    return;
  }

  /* j / ↓ — move ring down */
  if ((e.key === "j" || e.key === "ArrowDown") && !meta && !e.shiftKey) {
    e.preventDefault();
    if (!this.flatFields.length) return;
    this.flatFieldIndex = this.flatFieldIndex < this.flatFields.length - 1 ? this.flatFieldIndex + 1 : 0;
    this._updateFlatRing();
    return;
  }

  /* k / ↑ — move ring up */
  if ((e.key === "k" || e.key === "ArrowUp") && !meta && !e.shiftKey) {
    e.preventDefault();
    if (!this.flatFields.length) return;
    this.flatFieldIndex = this.flatFieldIndex > 0 ? this.flatFieldIndex - 1 : this.flatFields.length - 1;
    this._updateFlatRing();
    return;
  }

  /* Enter / Space / i / o — activate the ringed field */
  var ringedField = this.flatFieldIndex >= 0 ? this.flatFields[this.flatFieldIndex] : null;
  var ringedIsInteractive = ringedField && ("customSelect" in ringedField.dataset || "customPicker" in ringedField.dataset || "navToggle" in ringedField.dataset);
  if ((e.key === "Enter" || (e.key === " " && ringedIsInteractive) || e.key === "i" || e.key === "o") && this.flatFieldIndex >= 0) {
    e.preventDefault();
    /* data-nav-toggle elements toggle in-place without entering insert mode */
    if (ringedField && "navToggle" in ringedField.dataset) {
      ringedField.click();
    } else {
      this._enterFlatInsert(this.flatFieldIndex);
    }
    return;
  }

  /* Tab — cycle ring (normal mode) */
  if (e.key === "Tab" && this.flatFields.length) {
    e.preventDefault();
    this.flatFieldIndex = e.shiftKey
      ? (this.flatFieldIndex - 1 + this.flatFields.length) % this.flatFields.length
      : (this.flatFieldIndex + 1) % this.flatFields.length;
    this._updateFlatRing();
    return;
  }

  /* a / n — add a new item (clicks the [data-nav-add] button if present) */
  if ((e.key === "a" || e.key === "n") && !meta && !e.shiftKey) {
    var addBtn = this._getAddBtn();
    if (addBtn) { e.preventDefault(); addBtn.click(); return; }
  }

  /* d / x — delete the item whose card contains the ringed field */
  if ((e.key === "d" || e.key === "x") && !meta && this.flatFieldIndex >= 0) {
    var ringedField = this.flatFields[this.flatFieldIndex];
    var card = ringedField && ringedField.closest(".editor-card");
    var removeBtn = card && card.querySelector(".editor-remove");
    if (removeBtn) { e.preventDefault(); removeBtn.click(); return; }
  }

  /* r / R — open raw JSON editor */
  if ((e.key === "r" || e.key === "R") && !meta) {
    var rawBtn = this._getRawBtn();
    if (rawBtn) { e.preventDefault(); rawBtn.click(); return; }
  }

  /* z — collapse / expand all <details> sections */
  if (e.key === "z" && !meta && !e.shiftKey) {
    var details = Array.from(this.panel.querySelectorAll("details"));
    if (!details.length) return;
    e.preventDefault();
    var allOpen = details.every(function (d) { return d.open; });
    details.forEach(function (d) { d.open = !allOpen; });
    this.rescan();
    return;
  }
};
