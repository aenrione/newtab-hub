window.Hub = window.Hub || {};

Hub.rawJsonEditorSelection = (function () {
  function getLineColumn(text, pos) {
    var value = String(text || "");
    var safePos = Math.max(0, Math.min(value.length, pos));
    var line = value.slice(0, safePos).split("\n").length - 1;
    var lineStart = value.lastIndexOf("\n", Math.max(0, safePos - 1)) + 1;
    return { line: line, column: safePos - lineStart };
  }

  function getPositionFromLineColumn(text, line, column) {
    var value = String(text || "");
    var lines = value.split("\n");
    var safeLine = Math.max(0, Math.min(lines.length - 1, line));
    var offset = 0;
    for (var i = 0; i < safeLine; i++) offset += lines[i].length + 1;
    return offset + Math.min(Math.max(0, column), lines[safeLine].length);
  }

  function getLineRange(text, pos, includeTrailingNewline) {
    var value = String(text || "");
    var safePos = Math.max(0, Math.min(value.length, pos));
    var start = value.lastIndexOf("\n", Math.max(0, safePos - 1)) + 1;
    var end = value.indexOf("\n", safePos);
    if (end === -1) end = value.length;
    if (includeTrailingNewline && end < value.length) end += 1;
    return { start: start, end: end };
  }

  function getLinewiseRange(text, anchorPos, caretPos) {
    var startRange = getLineRange(text, Math.min(anchorPos, caretPos), false);
    var endRange = getLineRange(text, Math.max(anchorPos, caretPos), true);
    return { start: startRange.start, end: endRange.end };
  }

  function getBlockRanges(text, anchorPos, caretPos) {
    var value = String(text || "");
    var anchor = getLineColumn(value, anchorPos);
    var caret = getLineColumn(value, caretPos);
    var startLine = Math.min(anchor.line, caret.line);
    var endLine = Math.max(anchor.line, caret.line);
    var startCol = Math.min(anchor.column, caret.column);
    var endCol = Math.max(anchor.column, caret.column);
    var ranges = [];

    for (var line = startLine; line <= endLine; line++) {
      var start = getPositionFromLineColumn(value, line, startCol);
      var end = getPositionFromLineColumn(value, line, endCol + 1);
      ranges.push({ start: start, end: Math.max(start, end) });
    }

    return ranges;
  }

  function deleteRanges(text, ranges) {
    var value = String(text || "");
    var sorted = (ranges || []).slice().sort(function (a, b) { return b.start - a.start; });
    sorted.forEach(function (range) {
      value = value.slice(0, range.start) + value.slice(range.end);
    });
    return value;
  }

  function rangesToText(text, ranges, joiner) {
    var value = String(text || "");
    return (ranges || []).map(function (range) {
      return value.slice(range.start, range.end);
    }).join(joiner == null ? "" : joiner);
  }

  function applyBlockInsert(text, ranges, insertText, position) {
    var value = String(text || "");
    var inserted = String(insertText || "");
    var sorted = (ranges || []).slice().sort(function (a, b) { return b.start - a.start; });
    var caret = 0;

    sorted.forEach(function (range) {
      var insertAt = position === "start" ? range.start : range.end;
      value = value.slice(0, insertAt) + inserted + value.slice(insertAt);
      caret = insertAt + inserted.length;
    });

    return { text: value, caret: caret };
  }

  return {
    getLineColumn: getLineColumn,
    getPositionFromLineColumn: getPositionFromLineColumn,
    getLineRange: getLineRange,
    getLinewiseRange: getLinewiseRange,
    getBlockRanges: getBlockRanges,
    deleteRanges: deleteRanges,
    rangesToText: rangesToText,
    applyBlockInsert: applyBlockInsert
  };
})();
