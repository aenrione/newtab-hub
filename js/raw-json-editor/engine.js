window.Hub = window.Hub || {};

Hub.rawJsonEditorEngine = (function () {
  var helpers = Hub.rawJsonEditorHelpers;
  var renderer = Hub.rawJsonEditorRenderer;

  function open(options) {
    options = options || {};
    var rawOverlay = document.createElement("div");
    var selection = Hub.rawJsonEditorSelection;
    var diagnosticsApi = Hub.rawJsonEditorDiagnostics;
    var schemaApi = Hub.rawJsonEditorSchema;
    rawOverlay.className = "modal-overlay raw-config-overlay";

    var rawPanel = document.createElement("div");
    rawPanel.className = "modal-panel raw-config-modal";

    var header = document.createElement("div");
    header.className = "modal-header";

    var title = document.createElement("h2");
    title.textContent = (options.title || "Widget") + " JSON";
    header.appendChild(title);

    var closeBtn = document.createElement("button");
    closeBtn.className = "modal-close";
    closeBtn.innerHTML = Hub.icons.x;
    closeBtn.type = "button";
    header.appendChild(closeBtn);

    var meta = document.createElement("div");
    meta.className = "raw-config-meta";

    var modeBadge = document.createElement("span");
    modeBadge.className = "raw-config-mode";
    meta.appendChild(modeBadge);

    var stats = document.createElement("span");
    stats.className = "raw-config-stats";
    meta.appendChild(stats);

    var schemaGuide = document.createElement("div");
    schemaGuide.className = "raw-config-schema-guide";

    var shell = document.createElement("div");
    shell.className = "raw-config-shell";

    var gutterEl = document.createElement("div");
    gutterEl.className = "raw-config-gutter";
    shell.appendChild(gutterEl);

    var highlightEl = document.createElement("pre");
    highlightEl.className = "raw-config-highlight";
    highlightEl.setAttribute("aria-hidden", "true");
    shell.appendChild(highlightEl);

    var visualLayerEl = document.createElement("div");
    visualLayerEl.className = "raw-config-visual-layer";
    visualLayerEl.setAttribute("aria-hidden", "true");
    shell.appendChild(visualLayerEl);

    var textarea = document.createElement("textarea");
    textarea.className = "raw-config-textarea";
    textarea.spellcheck = false;
    textarea.wrap = "off";
    textarea.value = helpers.formatConfigJSON(options.config || {}) + "\n";
    shell.appendChild(textarea);

    var caretEl = document.createElement("div");
    caretEl.className = "raw-config-caret";
    shell.appendChild(caretEl);

    var footer = document.createElement("div");
    footer.className = "raw-config-footer";

    var statusEl = document.createElement("div");
    statusEl.className = "raw-config-status";
    footer.appendChild(statusEl);

    var errorEl = document.createElement("div");
    errorEl.className = "raw-config-error";
    footer.appendChild(errorEl);

    var hints = document.createElement("div");
    hints.className = "raw-config-hints";
    footer.appendChild(hints);

    var actions = document.createElement("div");
    actions.className = "config-modal-actions raw-config-actions";

    var cancelBtn = document.createElement("button");
    cancelBtn.className = "toolbar-button toolbar-button-ghost";
    cancelBtn.type = "button";
    cancelBtn.textContent = "Cancel";
    actions.appendChild(cancelBtn);

    var applyBtn = document.createElement("button");
    applyBtn.className = "toolbar-button";
    applyBtn.type = "button";
    applyBtn.textContent = "Apply JSON";
    actions.appendChild(applyBtn);

    rawPanel.appendChild(header);
    rawPanel.appendChild(meta);
    rawPanel.appendChild(schemaGuide);
    rawPanel.appendChild(shell);
    rawPanel.appendChild(footer);
    rawPanel.appendChild(actions);
    rawOverlay.appendChild(rawPanel);
    document.body.appendChild(rawOverlay);

    var historyApi = Hub.rawJsonEditorHistory;
    var mode = "normal";
    var preferredColumn = null;
    var pendingAction = null;
    var lastFind = null;
    var clipboard = { type: "line", content: "" };
    var collapsedFolds = [];
    var searchState = { query: "", matches: [], index: -1, lastDirection: 1 };
    var diagnostics = { issues: [], firstMessage: "" };
    var schemaHints = schemaApi.collectHints(options.schema);
    var schemaValidation = { ok: true, issues: [], firstMessage: "" };
    var visualAnchor = null;
    var visualCaret = null;
    var visualKind = null;
    var blockInsert = null;

    function getMetrics() {
      var styles = window.getComputedStyle(textarea);
      var probe = document.createElement("span");
      probe.className = "raw-config-caret-probe";
      probe.textContent = "0";
      probe.style.font = styles.font;
      probe.style.letterSpacing = styles.letterSpacing;
      shell.appendChild(probe);
      var charWidth = probe.getBoundingClientRect().width || parseFloat(styles.fontSize) * 0.6;
      probe.remove();
      return {
        paddingTop: parseFloat(styles.paddingTop) || 0,
        paddingLeft: parseFloat(styles.paddingLeft) || 0,
        lineHeight: parseFloat(styles.lineHeight) || (parseFloat(styles.fontSize) || 13) * 1.6,
        charWidth: charWidth
      };
    }

    function normalizeEditorValue() {
      if (textarea.value.endsWith("\n")) return;
      var start = textarea.selectionStart;
      var end = textarea.selectionEnd;
      textarea.value += "\n";
      textarea.setSelectionRange(start, end, textarea.selectionDirection || "none");
    }

    function syncHighlightScroll() {
      highlightEl.style.transform = "translate(" + (-textarea.scrollLeft) + "px, " + (-textarea.scrollTop) + "px)";
    }

    function syncVisualLayerScroll() {
      visualLayerEl.style.transform = "translate(" + (-textarea.scrollLeft) + "px, " + (-textarea.scrollTop) + "px)";
    }

    function syncGutterScroll() {
      gutterEl.style.transform = "translateY(" + (-textarea.scrollTop) + "px)";
    }

    function getCursorPos() {
      return mode === "visual" && visualCaret !== null ? visualCaret : textarea.selectionEnd;
    }

    function getSelectionBounds() {
      if (mode === "visual" && visualAnchor !== null && visualCaret !== null) {
        if (visualKind === "line") {
          return selection.getLinewiseRange(textarea.value, visualAnchor, visualCaret);
        }
        if (visualKind === "block") {
          var blockRanges = selection.getBlockRanges(textarea.value, visualAnchor, visualCaret);
          return {
            start: blockRanges.length ? blockRanges[0].start : visualAnchor,
            end: blockRanges.length ? blockRanges[blockRanges.length - 1].end : visualCaret
          };
        }
        return { start: Math.min(visualAnchor, visualCaret), end: Math.max(visualAnchor, visualCaret) };
      }

      return {
        start: textarea.selectionStart,
        end: textarea.selectionEnd
      };
    }

    function getVisualRanges() {
      if (mode !== "visual" || visualAnchor === null || visualCaret === null) return [];
      if (visualKind === "line") return [selection.getLinewiseRange(textarea.value, visualAnchor, visualCaret)];
      if (visualKind === "block") return selection.getBlockRanges(textarea.value, visualAnchor, visualCaret);
      return [getSelectionBounds()];
    }

    function applyVisualSelection() {
      if (visualAnchor === null || visualCaret === null) return;
      if (visualKind === "block") {
        textarea.focus();
        textarea.setSelectionRange(visualCaret, visualCaret);
        return;
      }
      var bounds = getSelectionBounds();
      textarea.focus();
      textarea.setSelectionRange(bounds.start, bounds.end, visualCaret >= visualAnchor ? "forward" : "backward");
    }

    function renderVisualOverlay() {
      visualLayerEl.replaceChildren();
      if (mode !== "visual" || visualKind !== "block") return;

      var metrics = getMetrics();
      var ranges = getVisualRanges();
      ranges.forEach(function (range) {
        var startInfo = selection.getLineColumn(textarea.value, range.start);
        var width = Math.max(1, range.end - range.start) * metrics.charWidth;
        var top = metrics.paddingTop + (startInfo.line * metrics.lineHeight);
        var left = metrics.paddingLeft + (startInfo.column * metrics.charWidth);
        var rect = document.createElement("div");
        rect.className = "raw-config-visual-block-line";
        rect.style.top = top + "px";
        rect.style.left = left + "px";
        rect.style.width = Math.max(metrics.charWidth, width) + "px";
        rect.style.height = Math.max(16, Math.round(metrics.lineHeight)) + "px";
        visualLayerEl.appendChild(rect);
      });
      syncVisualLayerScroll();
    }

    function cloneCollapsedFolds() {
      return collapsedFolds.map(function (pair) {
        return {
          open: pair.open,
          close: pair.close,
          openChar: pair.openChar,
          closeChar: pair.closeChar
        };
      });
    }

    var history = historyApi.create({
      capture: function () {
        return {
          text: textarea.value,
          caret: getCursorPos(),
          selectionStart: textarea.selectionStart,
          selectionEnd: textarea.selectionEnd,
          selectionDirection: textarea.selectionDirection,
          folds: cloneCollapsedFolds()
        };
      },
      apply: function (snapshot) {
        textarea.value = snapshot.text;
        collapsedFolds = (snapshot.folds || []).map(function (pair) {
          return {
            open: pair.open,
            close: pair.close,
            openChar: pair.openChar,
            closeChar: pair.closeChar
          };
        });
        preferredColumn = null;
        visualAnchor = null;
        visualCaret = null;
        setError("");
        textarea.focus();
        textarea.setSelectionRange(
          snapshot.selectionStart,
          snapshot.selectionEnd,
          snapshot.selectionDirection || "none"
        );
        setCaret(snapshot.caret);
        requestAnimationFrame(function () {
          textarea.focus();
          textarea.setSelectionRange(snapshot.caret, snapshot.caret, "none");
          refreshEditorVisuals();
        });
      },
      onBoundary: setError
    });

    function rebuildSearchMatches() {
      var previous = searchState.matches[searchState.index] || null;
      searchState.matches = [];
      if (!searchState.query) {
        searchState.index = -1;
        return;
      }

      var flags = /[A-Z]/.test(searchState.query) ? "g" : "gi";
      var regex = new RegExp(helpers.rawEscapeRegExp(searchState.query), flags);
      var match;
      while ((match = regex.exec(textarea.value))) {
        searchState.matches.push({ start: match.index, end: match.index + match[0].length });
        if (!match[0].length) regex.lastIndex++;
      }

      if (!searchState.matches.length) {
        searchState.index = -1;
        return;
      }

      if (previous) {
        searchState.index = searchState.matches.findIndex(function (candidate) {
          return candidate.start === previous.start && candidate.end === previous.end;
        });
      }

      if (searchState.index < 0 || searchState.index >= searchState.matches.length) {
        searchState.index = 0;
      }
    }

    function isCollapsedFold(pair) {
      return collapsedFolds.some(function (entry) {
        return entry.open === pair.open && entry.close === pair.close;
      });
    }

    function collapseFold(pair) {
      if (!pair || isCollapsedFold(pair)) return;
      collapsedFolds.push({ open: pair.open, close: pair.close, openChar: pair.openChar, closeChar: pair.closeChar });
      collapsedFolds.sort(function (a, b) { return a.open - b.open; });
    }

    function expandFold(pair) {
      if (!pair) return;
      collapsedFolds = collapsedFolds.filter(function (entry) {
        return !(entry.open === pair.open && entry.close === pair.close);
      });
    }

    function findCollapsedFoldContaining(pos) {
      for (var i = 0; i < collapsedFolds.length; i++) {
        var pair = collapsedFolds[i];
        if (pair.open < pos && pair.close > pos) return pair;
      }
      return null;
    }

    function ensureCaretVisible() {
      var fold = findCollapsedFoldContaining(getCursorPos());
      if (fold && mode === "insert") expandFold(fold);
    }

    function toggleFoldAtCaret(forceOpen) {
      var pair = helpers.rawFindEnclosingFold(textarea.value, getCursorPos());
      if (!pair) {
        setError("No foldable JSON block here.");
        return;
      }

      if (forceOpen === true) expandFold(pair);
      else if (forceOpen === false) collapseFold(pair);
      else if (isCollapsedFold(pair)) expandFold(pair);
      else collapseFold(pair);

      refreshEditorVisuals();
    }

    function setAllFolds(openAll) {
      if (openAll) {
        collapsedFolds = [];
      } else {
        collapsedFolds = helpers.rawScanStructure(textarea.value).filter(function (pair) {
          return textarea.value.slice(pair.open, pair.close).indexOf("\n") !== -1;
        }).map(function (pair) {
          return { open: pair.open, close: pair.close, openChar: pair.openChar, closeChar: pair.closeChar };
        });
      }
      refreshEditorVisuals();
    }

    function updateStatus() {
      var text = "";
      statusEl.className = "raw-config-status";

      if (pendingAction && pendingAction.type === "search") {
        text = "/" + pendingAction.query;
        statusEl.classList.add("is-search");
      } else if (pendingAction) {
        if (pendingAction.type === "command") statusEl.classList.add("is-command");
        else statusEl.classList.add("is-pending");
        text = pendingAction.type === "command"
          ? ":" + pendingAction.query
          : pendingAction.type === "block-insert"
            ? (pendingAction.step + " " + (blockInsert && blockInsert.text ? blockInsert.text : ""))
            : pendingAction.step || pendingAction.label || "";
      } else if (searchState.query) {
        text = "/" + searchState.query + "  " + (searchState.matches.length ? (searchState.index + 1) + "/" + searchState.matches.length : "0/0");
        statusEl.classList.add("is-search");
      } else if (diagnostics.issues.length) {
        text = diagnostics.firstMessage;
        statusEl.classList.add("is-invalid");
      } else if (!schemaValidation.ok) {
        text = schemaValidation.firstMessage;
        statusEl.classList.add("is-invalid");
      }

      statusEl.textContent = text;
      statusEl.style.visibility = text ? "visible" : "hidden";
    }

    function getLineInfo(pos) {
      var value = textarea.value;
      var range = selection.getLineRange(value, pos, false);
      return { start: range.start, end: range.end, column: pos - range.start };
    }

    function updateGutter() {
      var contentLines = textarea.value ? textarea.value.split("\n").length : 1;
      var totalLines = contentLines + 1;
      var currentLine = textarea.value.slice(0, getCursorPos()).split("\n").length;
      var lineRange = mode === "visual" && visualKind === "line"
        ? selection.getLinewiseRange(textarea.value, visualAnchor, visualCaret)
        : null;
      var html = "";

      for (var i = 1; i <= totalLines; i++) {
        var lineStartPos = selection.getPositionFromLineColumn(textarea.value, Math.min(i - 1, Math.max(0, contentLines - 1)), 0);
        var lineClasses = [];
        if (i === currentLine) lineClasses.push("is-active");
        if (lineRange && lineStartPos >= lineRange.start && lineStartPos < lineRange.end) lineClasses.push("is-selected");
        html += '<div class="raw-config-gutter-line' + (lineClasses.length ? ' ' + lineClasses.join(' ') : '') + '">' + (i <= contentLines ? i : '&nbsp;') + '</div>';
      }

      gutterEl.innerHTML = html;
      syncGutterScroll();
    }

    function updateHighlight() {
      rebuildSearchMatches();
      diagnostics = diagnosticsApi.analyze(textarea.value);
      highlightEl.innerHTML = renderer.renderJSONHtml(textarea.value, searchState, collapsedFolds, diagnostics);
      schemaValidation = { ok: true, issues: [], firstMessage: "" };
      if (!diagnostics.issues.length) {
        var parsed = helpers.parseConfigJSON(textarea.value);
        if (parsed.ok) schemaValidation = schemaApi.validateWithRanges(options.schema, parsed.value, textarea.value);
      }
      var mergedDiagnostics = { issues: diagnostics.issues.concat(schemaValidation.issues || []) };
      highlightEl.innerHTML = renderer.renderJSONHtml(textarea.value, searchState, collapsedFolds, mergedDiagnostics);
      syncHighlightScroll();
      syncVisualLayerScroll();
      updateGutter();
      updateStatus();
    }

    function renderSchemaGuide() {
      if (!schemaHints.length) {
        schemaGuide.replaceChildren();
        schemaGuide.style.display = "none";
        return;
      }

      schemaGuide.style.display = "flex";
      schemaGuide.replaceChildren();
      schemaHints.forEach(function (hint) {
        var chip = document.createElement("div");
        chip.className = "raw-config-schema-chip";

        var name = document.createElement("span");
        name.className = "raw-config-schema-key";
        name.textContent = hint.key;
        chip.appendChild(name);

        var desc = [];
        if (hint.values.length) desc.push(hint.values.join(" | "));
        if (hint.type && hint.type !== "any" && !hint.values.length) desc.push(hint.type);
        if (hint.min !== undefined || hint.max !== undefined) {
          desc.push((hint.min !== undefined ? hint.min : "-") + ".." + (hint.max !== undefined ? hint.max : "-"));
        }
        if (hint.description) desc.push(hint.description);

        var detail = document.createElement("span");
        detail.className = "raw-config-schema-detail";
        detail.textContent = desc.join("  ");
        chip.appendChild(detail);

        schemaGuide.appendChild(chip);
      });

      var guideHint = document.createElement("div");
      guideHint.className = "raw-config-schema-hint";
      guideHint.textContent = "Defined fields and accepted values for this widget - Tab / Shift+Tab cycles enum values";
      schemaGuide.prepend(guideHint);
    }

    function cycleEnumValue(direction) {
      var context = schemaApi.getEnumContext(options.schema, textarea.value, getCursorPos());
      if (!context) {
        setError("No enum-backed field under cursor.");
        return;
      }

      var currentIndex = context.enum.indexOf(context.value);
      var nextIndex;
      if (currentIndex === -1) nextIndex = direction > 0 ? 0 : context.enum.length - 1;
      else nextIndex = (currentIndex + direction + context.enum.length) % context.enum.length;

      var nextValue = JSON.stringify(context.enum[nextIndex]);
      var nextText = textarea.value.slice(0, context.valueRange.start) + nextValue + textarea.value.slice(context.valueRange.end);
      setText(nextText, context.valueRange.start + nextValue.length - 1);
    }

    function updateCaretVisual() {
      if (document.activeElement !== textarea) {
        caretEl.style.opacity = "0";
        return;
      }

      var caret = getCursorPos();
      var before = textarea.value.slice(0, caret);
      var lineIndex = before.split("\n").length - 1;
      var info = getLineInfo(caret);
      var metrics = getMetrics();
      var top = metrics.paddingTop + (lineIndex * metrics.lineHeight) - textarea.scrollTop;
      var left = metrics.paddingLeft + (info.column * metrics.charWidth) - textarea.scrollLeft;

      caretEl.style.top = top + "px";
      caretEl.style.left = left + "px";
      caretEl.style.width = Math.max(2, Math.round(metrics.charWidth)) + "px";
      caretEl.style.height = Math.max(16, Math.round(metrics.lineHeight)) + "px";
      caretEl.style.opacity = "1";
      caretEl.classList.toggle("is-normal-mode", mode !== "insert");
      caretEl.classList.toggle("is-insert-mode", mode === "insert");
      caretEl.classList.toggle("is-visual-mode", mode === "visual");
    }

    function ensureCursorInView() {
      var caret = getCursorPos();
      var info = getLineInfo(caret);
      var before = textarea.value.slice(0, caret);
      var lineIndex = before.split("\n").length - 1;
      var metrics = getMetrics();
      var top = metrics.paddingTop + (lineIndex * metrics.lineHeight);
      var bottom = top + metrics.lineHeight;
      var left = metrics.paddingLeft + (info.column * metrics.charWidth);
      var right = left + metrics.charWidth;
      var viewportTop = textarea.scrollTop;
      var viewportBottom = viewportTop + textarea.clientHeight - metrics.lineHeight;
      var viewportLeft = textarea.scrollLeft;
      var viewportRight = viewportLeft + textarea.clientWidth - metrics.charWidth;

      if (top < viewportTop + metrics.lineHeight) textarea.scrollTop = Math.max(0, top - metrics.lineHeight);
      else if (bottom > viewportBottom) textarea.scrollTop = Math.max(0, bottom - textarea.clientHeight + (metrics.lineHeight * 2));

      if (left < viewportLeft) textarea.scrollLeft = Math.max(0, left - metrics.charWidth * 2);
      else if (right > viewportRight) textarea.scrollLeft = Math.max(0, right - textarea.clientWidth + (metrics.charWidth * 2));
    }

    function updateStats() {
      var caret = getCursorPos();
      var info = getLineInfo(caret);
      var line = textarea.value.slice(0, caret).split("\n").length;
      var lines = textarea.value ? textarea.value.split("\n").length : 1;
      stats.textContent = line + ":" + (info.column + 1) + "  -  " + lines + " lines";
    }

    function refreshEditorVisuals() {
      ensureCaretVisible();
      ensureCursorInView();
      updateStats();
      updateHighlight();
      renderVisualOverlay();
      updateCaretVisual();
    }

    function setCaret(pos) {
      var next = Math.max(0, Math.min(textarea.value.length, pos));
      textarea.focus();
      if (mode === "visual" && visualAnchor !== null) {
        visualCaret = next;
        applyVisualSelection();
      } else {
        textarea.setSelectionRange(next, next);
      }
      refreshEditorVisuals();
    }

    function enterVisualMode() {
      enterVisualModeOfKind("char");
    }

    function enterVisualModeOfKind(kind) {
      var caret = getCursorPos();
      visualKind = kind || "char";
      visualAnchor = caret;

      if (visualKind === "line") {
        visualCaret = caret;
      } else if (visualKind === "block") {
        visualCaret = caret;
      } else {
        visualCaret = Math.min(textarea.value.length, caret + 1);
        if (visualCaret === visualAnchor && visualAnchor > 0) visualAnchor -= 1;
      }

      mode = "visual";
      modeBadge.textContent = visualKind === "line" ? "VISUAL LINE" : (visualKind === "block" ? "VISUAL BLOCK" : "VISUAL");
      modeBadge.classList.remove("is-insert", "is-normal");
      modeBadge.classList.add("is-visual");
      textarea.classList.remove("is-insert-mode");
      textarea.classList.add("is-normal-mode");
      applyVisualSelection();
      setHints(["hjkl wbe {} move", "iw inner word", "y yank", "d/c/x edit", "I/A block insert", "Tab enum"]);
      refreshEditorVisuals();
    }

    function exitVisualMode(targetPos) {
      var next = targetPos === undefined ? getCursorPos() : targetPos;
      visualAnchor = null;
      visualCaret = null;
      visualKind = null;
      mode = "normal";
      modeBadge.classList.remove("is-insert", "is-visual");
      modeBadge.classList.add("is-normal");
      modeBadge.textContent = "NORMAL";
      textarea.classList.remove("is-insert-mode");
      textarea.classList.add("is-normal-mode");
      textarea.setSelectionRange(next, next);
      setHints(["i/a/A/C/o/s edit", "hjkl wbe {} move", "fFtT ; , find", "/ n N search", "u undo R redo", "Ctrl+d/u halfpage  Tab enum"]);
      refreshEditorVisuals();
    }

    function setError(message) {
      errorEl.textContent = message || "";
      errorEl.style.visibility = message ? "visible" : "hidden";
    }

    function setHints(items) {
      hints.replaceChildren();
      items.forEach(function (text) {
        var hint = document.createElement("span");
        hint.className = "raw-config-hint";
        hint.textContent = text;
        hints.appendChild(hint);
      });
    }

    function setMode(nextMode) {
      if (nextMode === "visual") {
        enterVisualMode();
        return;
      }
      if (nextMode === "insert" && mode !== "insert") {
        history.mark();
      }
      mode = nextMode;
      visualAnchor = null;
      visualCaret = null;
      visualKind = null;
      modeBadge.textContent = mode === "insert" ? "INSERT" : "NORMAL";
      modeBadge.classList.remove("is-visual");
      modeBadge.classList.toggle("is-insert", mode === "insert");
      modeBadge.classList.toggle("is-normal", mode !== "insert");
      textarea.classList.toggle("is-normal-mode", mode !== "insert");
      textarea.classList.toggle("is-insert-mode", mode === "insert");
      setHints(mode === "insert"
        ? ["Esc normal", "Cmd/Ctrl+Z undo", "Cmd/Ctrl+Shift+Z redo", "Cmd/Ctrl+Enter apply"]
        : ["i/a/A/C/o/s edit", "hjkl wbe {} move", "fFtT ; , find", "/ n N search", "u undo R redo", "Ctrl+d/u halfpage  Tab enum"]);
      textarea.focus();
      refreshEditorVisuals();
    }

    function setText(nextText, caretPos) {
      textarea.value = nextText.endsWith("\n") ? nextText : nextText + "\n";
      preferredColumn = null;
      setError("");
      setCaret(caretPos);
      history.push();
    }

    function moveHorizontal(delta) {
      preferredColumn = null;
      setCaret(getCursorPos() + delta);
    }

    function moveVertical(delta) {
      var pos = getCursorPos();
      var info = getLineInfo(pos);
      var column = preferredColumn === null ? info.column : preferredColumn;
      var targetAnchor = delta < 0 ? info.start - 1 : info.end + 1;
      if (targetAnchor < 0 || targetAnchor > textarea.value.length) return;
      var targetInfo = getLineInfo(targetAnchor);
      preferredColumn = column;
      setCaret(Math.min(targetInfo.start + column, targetInfo.end));
    }

    function moveHalfPage(direction) {
      var metrics = getMetrics();
      var visibleLines = Math.max(1, Math.floor(textarea.clientHeight / metrics.lineHeight));
      var steps = Math.max(1, Math.floor(visibleLines / 2));
      preferredColumn = null;
      for (var i = 0; i < steps; i++) moveVertical(direction);
    }

    function moveLineBoundary(toEnd) {
      preferredColumn = null;
      var info = getLineInfo(getCursorPos());
      setCaret(toEnd ? info.end : info.start);
    }

    function insertLineBelow() {
      var info = getLineInfo(getCursorPos());
      var insertPos = info.end;
      textarea.value = textarea.value.slice(0, insertPos) + "\n" + textarea.value.slice(insertPos);
      preferredColumn = null;
      setMode("insert");
      setCaret(insertPos + 1);
    }

    function moveToWordBackward() { preferredColumn = null; setCaret(helpers.rawMoveWordBackward(textarea.value, getCursorPos())); }
    function moveToWordForward() { preferredColumn = null; setCaret(helpers.rawMoveWordForward(textarea.value, getCursorPos())); }
    function moveToWordEnd() { preferredColumn = null; setCaret(helpers.rawMoveWordEnd(textarea.value, getCursorPos())); }
    function moveParagraphBackward() { preferredColumn = null; setCaret(helpers.rawMoveParagraphBackward(textarea.value, getCursorPos())); }
    function moveParagraphForward() { preferredColumn = null; setCaret(helpers.rawMoveParagraphForward(textarea.value, getCursorPos())); }

    function applyChangeInnerWord() {
      var range = helpers.rawFindInnerWordRange(textarea.value, getCursorPos());
      pendingAction = null;
      if (!range) {
        setError("No word under cursor.");
        updateStatus();
        return;
      }
      setText(textarea.value.slice(0, range.start) + textarea.value.slice(range.end), range.start);
      setMode("insert");
    }

    function getVisualSelectionText() {
      if (visualKind === "block") {
        return selection.rangesToText(textarea.value, getVisualRanges(), "\n");
      }
      var bounds = getSelectionBounds();
      return textarea.value.slice(bounds.start, bounds.end);
    }

    function yankVisualSelection() {
      var bounds = getSelectionBounds();
      if (bounds.start === bounds.end && visualKind !== "block") {
        setError("No selection to yank.");
        return;
      }
      clipboard = {
        type: visualKind === "line" ? "line" : (visualKind === "block" ? "block" : "text"),
        content: getVisualSelectionText()
      };
      exitVisualMode(bounds.start);
    }

    function deleteVisualSelection(changeMode) {
      var bounds = getSelectionBounds();
      var ranges = getVisualRanges();
      if (bounds.start === bounds.end && visualKind !== "block") {
        setError("No selection to delete.");
        return;
      }
      clipboard = {
        type: visualKind === "line" ? "line" : (visualKind === "block" ? "block" : "text"),
        content: getVisualSelectionText()
      };
      var nextText = visualKind === "block"
        ? selection.deleteRanges(textarea.value, ranges)
        : textarea.value.slice(0, bounds.start) + textarea.value.slice(bounds.end);
      visualAnchor = null;
      visualCaret = null;
      visualKind = null;
      textarea.setSelectionRange(bounds.start, bounds.start);
      setText(nextText, bounds.start);
      if (changeMode) setMode("insert");
      else setMode("normal");
    }

    function beginBlockInsert(position) {
      if (visualKind !== "block") return;
      history.mark();
      blockInsert = {
        position: position,
        text: ""
      };
      pendingAction = { type: "block-insert", step: position === "start" ? "I" : "A" };
      updateStatus();
    }

    function applyBlockInsert() {
      if (!blockInsert) return;
      var insertText = blockInsert.text;
      var ranges = getVisualRanges().slice().sort(function (a, b) { return b.start - a.start; });
      var applied = selection.applyBlockInsert(textarea.value, ranges, insertText, blockInsert.position);

      pendingAction = null;
      blockInsert = null;
      visualAnchor = null;
      visualCaret = null;
      visualKind = null;
      setText(applied.text, applied.caret);
      setMode("normal");
    }

    function moveToFindTarget(targetChar, options) {
      lastFind = { targetChar: targetChar, options: Object.assign({}, options || {}) };
      preferredColumn = null;
      setCaret(helpers.rawFindLineTarget(textarea.value, getCursorPos(), targetChar, options));
    }

    function repeatFind(reverse) {
      if (!lastFind) {
        setError("No previous find command.");
        return;
      }
      var optionsForRepeat = Object.assign({}, lastFind.options || {});
      if (reverse) optionsForRepeat.backward = !optionsForRepeat.backward;
      moveToFindTarget(lastFind.targetChar, optionsForRepeat);
    }

    function performSearch(direction, isRepeat) {
      if (!searchState.query) {
        setError("No active search.");
        return;
      }

      rebuildSearchMatches();
      if (!searchState.matches.length) {
        setError("No matches for /" + searchState.query + ".");
        updateHighlight();
        return;
      }

      var pos = getCursorPos();
      var nextIndex = -1;
      if (isRepeat && searchState.index >= 0) {
        nextIndex = (searchState.index + (direction > 0 ? 1 : -1) + searchState.matches.length) % searchState.matches.length;
      } else if (direction > 0) {
        nextIndex = searchState.matches.findIndex(function (match) { return match.start > pos; });
        if (nextIndex === -1) nextIndex = searchState.matches.findIndex(function (match) { return match.start >= pos; });
        if (nextIndex === -1) nextIndex = 0;
      } else {
        for (var i = searchState.matches.length - 1; i >= 0; i--) {
          if (searchState.matches[i].start < pos) {
            nextIndex = i;
            break;
          }
        }
        if (nextIndex === -1) nextIndex = searchState.matches.length - 1;
      }

      searchState.index = nextIndex;
      searchState.lastDirection = direction;
      setError("");
      setCaret(searchState.matches[nextIndex].start);
    }

    function deleteCurrentLine() {
      var result = helpers.rawDeleteCurrentLine(textarea.value, getCursorPos());
      clipboard = { type: "line", content: result.line };
      setText(result.text, result.caret);
    }

    function deleteCharAtCursor(enterInsert) {
      var cursor = getCursorPos();
      if (cursor >= textarea.value.length) {
        setError("No character under cursor.");
        return;
      }
      clipboard = { type: "text", content: textarea.value.charAt(cursor) };
      setText(textarea.value.slice(0, cursor) + textarea.value.slice(cursor + 1), cursor);
      if (enterInsert) setMode("insert");
    }

    function changeToLineEnd() {
      var cursor = getCursorPos();
      var line = getLineInfo(cursor);
      var end = line.end;
      if (cursor >= end) {
        setMode("insert");
        return;
      }
      clipboard = { type: "text", content: textarea.value.slice(cursor, end) };
      setText(textarea.value.slice(0, cursor) + textarea.value.slice(end), cursor);
      setMode("insert");
    }

    function yankCurrentLine() {
      clipboard = { type: "line", content: helpers.rawReadCurrentLine(textarea.value, getCursorPos()) };
      setError("");
      updateStatus();
    }

    function pasteLine(before) {
      if (!clipboard.content) {
        setError("Clipboard is empty.");
        return;
      }
      if (clipboard.type === "line") {
        var lineResult = helpers.rawPasteLine(textarea.value, getCursorPos(), clipboard.content, before);
        setText(lineResult.text, lineResult.caret);
        return;
      }
      if (clipboard.type === "block") {
        var blockLines = clipboard.content.split("\n");
        var origin = selection.getLineColumn(textarea.value, getCursorPos());
        var nextBlockText = textarea.value;
        for (var i = 0; i < blockLines.length; i++) {
          var insertPos = selection.getPositionFromLineColumn(nextBlockText, origin.line + i, origin.column);
          nextBlockText = nextBlockText.slice(0, insertPos) + blockLines[i] + nextBlockText.slice(insertPos);
        }
        setText(nextBlockText, selection.getPositionFromLineColumn(nextBlockText, origin.line, origin.column + blockLines[0].length));
        return;
      }
      var cursor = getCursorPos();
      var insertAt = before ? cursor : Math.min(textarea.value.length, cursor + 1);
      var nextText = textarea.value.slice(0, insertAt) + clipboard.content + textarea.value.slice(insertAt);
      setText(nextText, insertAt + clipboard.content.length);
    }

    function applyWithoutClose() {
      var parsed = helpers.parseConfigJSON(textarea.value);
      if (!parsed.ok) {
        setError(parsed.error);
        setMode("insert");
        return false;
      }
      var validated = schemaApi.validate(options.schema, parsed.value);
      if (!validated.ok) {
        setError(validated.firstMessage);
        refreshEditorVisuals();
        return false;
      }
      setError("");
      if (options.onApply) options.onApply(parsed.value);
      refreshEditorVisuals();
      return true;
    }

    function runCommand(rawCommand) {
      var command = String(rawCommand || "").trim();
      if (!command) return;
      if (command === "w") return void applyWithoutClose();
      if (command === "q" || command === "q!") return void close();
      if (command === "wq" || command === "x") {
        if (applyWithoutClose()) close();
        return;
      }
      if (command === "set foldopen") return void setAllFolds(true);
      if (command === "set foldclose") return void setAllFolds(false);
      setError("Unknown command: :" + command);
    }

    function applyAndClose() {
      var parsed = helpers.parseConfigJSON(textarea.value);
      if (!parsed.ok) {
        setError(parsed.error);
        setMode("insert");
        return;
      }
      var validated = schemaApi.validate(options.schema, parsed.value);
      if (!validated.ok) {
        setError(validated.firstMessage);
        refreshEditorVisuals();
        return;
      }
      setError("");
      if (options.onApply) options.onApply(parsed.value);
      close();
    }

    function close() {
      rawPanel.removeEventListener("keydown", onKeyDown);
      rawOverlay.remove();
      if (options.onClose) options.onClose();
      if (options.returnFocusEl && options.returnFocusEl.focus) options.returnFocusEl.focus();
    }

    function onKeyDown(e) {
      var meta = e.metaKey || e.ctrlKey;
      var isCtrlOnly = e.ctrlKey && !e.metaKey && !e.altKey;
      var isPrintable = e.key && e.key.length === 1 && !meta && !e.altKey;

      if (meta && e.key === "Enter") {
        e.preventDefault();
        applyAndClose();
        return;
      }

      if (isCtrlOnly && mode !== "insert" && e.key.toLowerCase() === "d") {
        e.preventDefault();
        moveHalfPage(1);
        return;
      }

      if (isCtrlOnly && mode !== "insert" && e.key.toLowerCase() === "u") {
        e.preventDefault();
        moveHalfPage(-1);
        return;
      }

      if ((meta && e.key.toLowerCase() === "z" && !e.shiftKey) || (mode !== "insert" && e.key === "u")) {
        e.preventDefault();
        history.undo();
        return;
      }

      if ((meta && e.key.toLowerCase() === "z" && e.shiftKey) || (meta && e.key.toLowerCase() === "r") || (mode !== "insert" && e.key === "R")) {
        e.preventDefault();
        history.redo();
        return;
      }

      if (pendingAction && pendingAction.type === "search") {
        if (e.key === "Escape") {
          e.preventDefault();
          pendingAction = null;
          updateStatus();
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          searchState.query = pendingAction.query;
          searchState.lastDirection = 1;
          pendingAction = null;
          if (!searchState.query) {
            searchState.matches = [];
            searchState.index = -1;
            updateHighlight();
            return;
          }
          performSearch(1, false);
          return;
        }
        if (e.key === "Backspace") {
          e.preventDefault();
          pendingAction.query = pendingAction.query.slice(0, -1);
          updateStatus();
          return;
        }
        if (isPrintable) {
          e.preventDefault();
          pendingAction.query += e.key;
          updateStatus();
          return;
        }
        e.preventDefault();
        return;
      }

      if (pendingAction && pendingAction.type === "block-insert") {
        if (e.key === "Escape") {
          e.preventDefault();
          applyBlockInsert();
          return;
        }
        if (e.key === "Backspace") {
          e.preventDefault();
          blockInsert.text = blockInsert.text.slice(0, -1);
          updateStatus();
          return;
        }
        if (!meta && !e.altKey && e.key && e.key.length === 1) {
          e.preventDefault();
          blockInsert.text += e.key;
          updateStatus();
          return;
        }
        e.preventDefault();
        return;
      }

      if (pendingAction && pendingAction.type === "find") {
        if (e.key === "Escape") {
          e.preventDefault();
          pendingAction = null;
          updateStatus();
          return;
        }
        if (isPrintable) {
          e.preventDefault();
          moveToFindTarget(e.key, pendingAction.options);
          pendingAction = null;
          updateStatus();
          return;
        }
        e.preventDefault();
        return;
      }

      if (pendingAction && pendingAction.type === "change") {
        if (e.key === "Escape") {
          e.preventDefault();
          pendingAction = null;
          updateStatus();
          return;
        }
        if (pendingAction.step === "c" && e.key === "i") {
          e.preventDefault();
          pendingAction.step = "ci";
          updateStatus();
          return;
        }
        if (pendingAction.step === "ci" && e.key === "w") {
          e.preventDefault();
          applyChangeInnerWord();
          return;
        }
        pendingAction = null;
        updateStatus();
      }

      if (pendingAction && pendingAction.type === "visual-object") {
        if (e.key === "Escape") {
          e.preventDefault();
          pendingAction = null;
          updateStatus();
          return;
        }
        if (pendingAction.step === "i" && e.key === "w") {
          e.preventDefault();
          var innerRange = helpers.rawFindInnerWordRange(textarea.value, getCursorPos());
          pendingAction = null;
          if (!innerRange) {
            setError("No inner word under cursor.");
            return;
          }
          visualKind = "char";
          visualAnchor = innerRange.start;
          visualCaret = innerRange.end;
          applyVisualSelection();
          refreshEditorVisuals();
          return;
        }
        pendingAction = null;
        updateStatus();
      }

      if (pendingAction && pendingAction.type === "goto") {
        if (e.key === "Escape") {
          e.preventDefault();
          pendingAction = null;
          updateStatus();
          return;
        }
        if (pendingAction.step === "g" && e.key === "g") {
          e.preventDefault();
          pendingAction = null;
          preferredColumn = null;
          setCaret(0);
          return;
        }
        pendingAction = null;
        updateStatus();
      }

      if (pendingAction && pendingAction.type === "delete") {
        if (e.key === "Escape") {
          e.preventDefault();
          pendingAction = null;
          updateStatus();
          return;
        }
        if (pendingAction.step === "d" && e.key === "d") {
          e.preventDefault();
          pendingAction = null;
          deleteCurrentLine();
          return;
        }
        pendingAction = null;
        updateStatus();
      }

      if (pendingAction && pendingAction.type === "yank") {
        if (e.key === "Escape") {
          e.preventDefault();
          pendingAction = null;
          updateStatus();
          return;
        }
        if (pendingAction.step === "y" && e.key === "y") {
          e.preventDefault();
          pendingAction = null;
          yankCurrentLine();
          return;
        }
        pendingAction = null;
        updateStatus();
      }

      if (pendingAction && pendingAction.type === "fold") {
        if (e.key === "Escape") {
          e.preventDefault();
          pendingAction = null;
          updateStatus();
          return;
        }
        if (pendingAction.step === "z") {
          e.preventDefault();
          pendingAction = null;
          if (e.key === "a") toggleFoldAtCaret();
          else if (e.key === "c") toggleFoldAtCaret(false);
          else if (e.key === "o") toggleFoldAtCaret(true);
          else if (e.key === "M") setAllFolds(false);
          else if (e.key === "R") setAllFolds(true);
          else updateStatus();
          return;
        }
      }

      if (pendingAction && pendingAction.type === "command") {
        if (e.key === "Escape") {
          e.preventDefault();
          pendingAction = null;
          updateStatus();
          return;
        }
        if (e.key === "Enter") {
          e.preventDefault();
          var nextCommand = pendingAction.query;
          pendingAction = null;
          updateStatus();
          runCommand(nextCommand);
          return;
        }
        if (e.key === "Backspace") {
          e.preventDefault();
          pendingAction.query = pendingAction.query.slice(0, -1);
          updateStatus();
          return;
        }
        if (isPrintable || e.key === "!" || e.key === " ") {
          e.preventDefault();
          pendingAction.query += e.key;
          updateStatus();
          return;
        }
        e.preventDefault();
        return;
      }

      if (mode === "visual") {
        if (e.key === "Escape" || e.key === "v") {
          e.preventDefault();
          exitVisualMode(getCursorPos());
          return;
        }
        if (e.key === "V") {
          e.preventDefault();
          enterVisualModeOfKind("line");
          return;
        }
        if (e.ctrlKey && e.key.toLowerCase() === "v" && !e.metaKey) {
          e.preventDefault();
          enterVisualModeOfKind("block");
          return;
        }
        if (e.key === "o") {
          e.preventDefault();
          var swap = visualAnchor;
          visualAnchor = visualCaret;
          visualCaret = swap;
          applyVisualSelection();
          refreshEditorVisuals();
          return;
        }
        if (visualKind === "block" && e.key === "I") {
          e.preventDefault();
          beginBlockInsert("start");
          return;
        }
        if (visualKind === "block" && e.key === "A") {
          e.preventDefault();
          beginBlockInsert("end");
          return;
        }
        if (e.key === "i") {
          e.preventDefault();
          pendingAction = { type: "visual-object", step: "i" };
          updateStatus();
          return;
        }
        if (e.key === "y") {
          e.preventDefault();
          yankVisualSelection();
          return;
        }
        if (e.key === "d" || e.key === "x") {
          e.preventDefault();
          deleteVisualSelection(false);
          return;
        }
        if (e.key === "c") {
          e.preventDefault();
          deleteVisualSelection(true);
          return;
        }
      }

      if (mode === "insert") {
        if (e.key === "Escape") {
          e.preventDefault();
          preferredColumn = null;
          setMode("normal");
          return;
        }
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        cycleEnumValue(e.shiftKey ? -1 : 1);
        return;
      }

      if (e.key === "Escape") { e.preventDefault(); close(); return; }
      if (e.key === "Enter") { e.preventDefault(); setMode("insert"); return; }
      if (e.key === "V") { e.preventDefault(); enterVisualModeOfKind("line"); return; }
      if (e.ctrlKey && e.key.toLowerCase() === "v" && !e.metaKey) { e.preventDefault(); enterVisualModeOfKind("block"); return; }
      if (e.key === "v") { e.preventDefault(); setMode("visual"); return; }
      if (e.key === "i") { e.preventDefault(); preferredColumn = null; setMode("insert"); return; }
      if (e.key === "a") { e.preventDefault(); moveHorizontal(1); setMode("insert"); return; }
      if (e.key === "A") { e.preventDefault(); moveLineBoundary(true); setMode("insert"); return; }
      if (e.key === "C") { e.preventDefault(); changeToLineEnd(); return; }
      if (e.key === "o") { e.preventDefault(); insertLineBelow(); return; }
      if (e.key === "w") { e.preventDefault(); moveToWordForward(); return; }
      if (e.key === "b") { e.preventDefault(); moveToWordBackward(); return; }
      if (e.key === "e") { e.preventDefault(); moveToWordEnd(); return; }
      if (e.key === "{") { e.preventDefault(); moveParagraphBackward(); return; }
      if (e.key === "}") { e.preventDefault(); moveParagraphForward(); return; }
      if (e.key === "f" || e.key === "t" || e.key === "F" || e.key === "T") {
        e.preventDefault();
        pendingAction = { type: "find", label: e.key, options: { till: e.key === "t" || e.key === "T", backward: e.key === "F" || e.key === "T" } };
        updateStatus();
        return;
      }
      if (e.key === "/") { e.preventDefault(); pendingAction = { type: "search", query: "" }; updateStatus(); return; }
      if (e.key === "n") { e.preventDefault(); performSearch(searchState.lastDirection || 1, true); return; }
      if (e.key === "N") { e.preventDefault(); performSearch((searchState.lastDirection || 1) * -1, true); return; }
      if (e.key === "c") { e.preventDefault(); pendingAction = { type: "change", step: "c" }; updateStatus(); return; }
      if (e.key === "d") { e.preventDefault(); pendingAction = { type: "delete", step: "d" }; updateStatus(); return; }
      if (e.key === "x") { e.preventDefault(); deleteCharAtCursor(false); return; }
      if (e.key === "s") { e.preventDefault(); deleteCharAtCursor(true); return; }
      if (e.key === "y") { e.preventDefault(); pendingAction = { type: "yank", step: "y" }; updateStatus(); return; }
      if (e.key === "p") { e.preventDefault(); pasteLine(false); return; }
      if (e.key === "P") { e.preventDefault(); pasteLine(true); return; }
      if (e.key === ";") { e.preventDefault(); repeatFind(false); return; }
      if (e.key === ",") { e.preventDefault(); repeatFind(true); return; }
      if (e.key === "%") {
        e.preventDefault();
        var matchPos = helpers.rawFindMatchingBracket(textarea.value, getCursorPos());
        if (matchPos === null) {
          setError("No matching bracket found.");
          return;
        }
        preferredColumn = null;
        setCaret(matchPos);
        return;
      }
      if (e.key === ":") { e.preventDefault(); pendingAction = { type: "command", query: "" }; updateStatus(); return; }
      if (e.key === "z") { e.preventDefault(); pendingAction = { type: "fold", step: "z" }; updateStatus(); return; }
      if (e.key === "h" || e.key === "ArrowLeft") { e.preventDefault(); moveHorizontal(-1); return; }
      if (e.key === "l" || e.key === "ArrowRight") { e.preventDefault(); moveHorizontal(1); return; }
      if (e.key === "j" || e.key === "ArrowDown") { e.preventDefault(); moveVertical(1); return; }
      if (e.key === "k" || e.key === "ArrowUp") { e.preventDefault(); moveVertical(-1); return; }
      if (e.key === "0" && !e.shiftKey) { e.preventDefault(); moveLineBoundary(false); return; }
      if (e.key === "$" || (e.key === "4" && e.shiftKey)) { e.preventDefault(); moveLineBoundary(true); return; }
      if (e.key === "g" && !e.shiftKey) { e.preventDefault(); pendingAction = { type: "goto", step: "g" }; updateStatus(); return; }
      if (e.key === "G") { e.preventDefault(); preferredColumn = null; setCaret(textarea.value.length); return; }
      if (!meta && !e.altKey) e.preventDefault();
    }

    textarea.addEventListener("input", function () {
      normalizeEditorValue();
      preferredColumn = null;
      collapsedFolds = [];
      setError("");
      refreshEditorVisuals();
      history.push();
    });
    textarea.addEventListener("click", refreshEditorVisuals);
    textarea.addEventListener("keyup", refreshEditorVisuals);
    textarea.addEventListener("focus", refreshEditorVisuals);
    textarea.addEventListener("blur", updateCaretVisual);
    textarea.addEventListener("scroll", function () {
      syncHighlightScroll();
      syncGutterScroll();
      syncVisualLayerScroll();
      updateCaretVisual();
    });
    textarea.addEventListener("select", refreshEditorVisuals);

    closeBtn.addEventListener("click", close);
    cancelBtn.addEventListener("click", close);
    applyBtn.addEventListener("click", applyAndClose);
    rawOverlay.addEventListener("click", function (e) {
      if (e.target === rawOverlay) close();
    });
    rawPanel.addEventListener("keydown", onKeyDown);

    setError("");
    renderSchemaGuide();
    history.push();
    setMode("normal");
    requestAnimationFrame(function () {
      textarea.scrollTop = 0;
      textarea.scrollLeft = 0;
      syncHighlightScroll();
      syncGutterScroll();
      syncVisualLayerScroll();
      setCaret(0);
      history.push();
    });
  }

  return { open: open };
})();
