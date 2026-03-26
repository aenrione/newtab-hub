window.Hub = window.Hub || {};

Hub.rawJsonEditorHelpers = (function () {
  function formatConfigJSON(config) {
    return JSON.stringify(config && typeof config === "object" ? config : {}, null, 2);
  }

  function parseConfigJSON(text) {
    try {
      var parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { ok: false, error: "Widget config must be a JSON object." };
      }
      return { ok: true, value: parsed };
    } catch (err) {
      return { ok: false, error: err && err.message ? err.message : "Invalid JSON." };
    }
  }

  function rawIsWordChar(char) {
    return /[A-Za-z0-9_-]/.test(char || "");
  }

  function rawFindInnerWordRange(text, pos) {
    var value = String(text || "");
    if (!value) return null;

    var index = Math.max(0, Math.min(value.length - 1, pos));
    if (!rawIsWordChar(value.charAt(index)) && index > 0 && rawIsWordChar(value.charAt(index - 1))) {
      index--;
    }

    if (!rawIsWordChar(value.charAt(index))) {
      while (index < value.length && !rawIsWordChar(value.charAt(index))) index++;
      if (index >= value.length) return null;
    }

    var start = index;
    var end = index;
    while (start > 0 && rawIsWordChar(value.charAt(start - 1))) start--;
    while (end < value.length && rawIsWordChar(value.charAt(end))) end++;
    return start === end ? null : { start: start, end: end };
  }

  function rawMoveWordBackward(text, pos) {
    var value = String(text || "");
    if (!value) return 0;
    var index = Math.max(0, Math.min(value.length - 1, pos - 1));
    while (index > 0 && !rawIsWordChar(value.charAt(index))) index--;
    while (index > 0 && rawIsWordChar(value.charAt(index - 1))) index--;
    return index;
  }

  function rawMoveWordForward(text, pos) {
    var value = String(text || "");
    if (!value) return 0;
    var index = Math.max(0, Math.min(value.length, pos + 1));
    while (index < value.length && rawIsWordChar(value.charAt(index - 1)) && rawIsWordChar(value.charAt(index))) index++;
    while (index < value.length && !rawIsWordChar(value.charAt(index))) index++;
    return Math.min(index, value.length);
  }

  function rawMoveWordEnd(text, pos) {
    var value = String(text || "");
    if (!value) return 0;
    var index = Math.max(0, Math.min(value.length - 1, pos));

    if (rawIsWordChar(value.charAt(index))) {
      while (index + 1 < value.length && rawIsWordChar(value.charAt(index + 1))) index++;
      if (index !== pos) return index;
      index++;
    }

    while (index < value.length && !rawIsWordChar(value.charAt(index))) index++;
    if (index >= value.length) return Math.max(0, value.length - 1);
    while (index + 1 < value.length && rawIsWordChar(value.charAt(index + 1))) index++;
    return index;
  }

  function rawFindLineTarget(text, pos, targetChar, options) {
    var value = String(text || "");
    var target = String(targetChar || "");
    if (!target) return pos;

    var infoStart = value.lastIndexOf("\n", Math.max(0, pos - 1)) + 1;
    var infoEnd = value.indexOf("\n", pos);
    if (infoEnd === -1) infoEnd = value.length;

    if (options && options.backward) {
      for (var i = Math.max(infoStart, pos - 1); i >= infoStart; i--) {
        if (value.charAt(i) === target) {
          return options.till ? Math.min(infoEnd, i + 1) : i;
        }
      }
      return pos;
    }

    for (var j = Math.min(infoEnd - 1, pos + 1); j < infoEnd; j++) {
      if (value.charAt(j) === target) {
        return options && options.till ? Math.max(infoStart, j - 1) : j;
      }
    }

    return pos;
  }

  function rawMoveParagraphForward(text, pos) {
    var value = String(text || "");
    if (!value) return 0;
    var index = Math.max(0, Math.min(value.length, pos));

    while (index < value.length && value.charAt(index) !== "\n") index++;
    while (index < value.length - 1) {
      var lineStart = index + 1;
      var lineEnd = value.indexOf("\n", lineStart);
      if (lineEnd === -1) lineEnd = value.length;
      var line = value.slice(lineStart, lineEnd);
      if (line.trim() === "") {
        while (lineEnd < value.length) {
          var nextStart = lineEnd + 1;
          var nextEnd = value.indexOf("\n", nextStart);
          if (nextEnd === -1) nextEnd = value.length;
          if (value.slice(nextStart, nextEnd).trim() !== "") return nextStart;
          lineEnd = nextEnd;
        }
        return value.length;
      }
      index = lineEnd;
    }

    return value.length;
  }

  function rawMoveParagraphBackward(text, pos) {
    var value = String(text || "");
    if (!value) return 0;
    var starts = [];
    var cursor = 0;
    while (cursor <= value.length) {
      starts.push(cursor);
      var nextBreak = value.indexOf("\n", cursor);
      if (nextBreak === -1) break;
      cursor = nextBreak + 1;
    }

    var lineIndex = 0;
    for (var i = 0; i < starts.length; i++) {
      if (starts[i] <= Math.max(0, pos - 1)) lineIndex = i;
      else break;
    }

    function lineText(idx) {
      var start = starts[idx];
      var end = idx + 1 < starts.length ? starts[idx + 1] - 1 : value.length;
      return value.slice(start, end);
    }

    while (lineIndex >= 0 && lineText(lineIndex).trim() === "") lineIndex--;
    while (lineIndex >= 0 && lineText(lineIndex).trim() !== "") lineIndex--;
    while (lineIndex >= 0 && lineText(lineIndex).trim() === "") lineIndex--;

    if (lineIndex < 0) return 0;
    while (lineIndex > 0 && lineText(lineIndex - 1).trim() !== "") lineIndex--;
    return starts[lineIndex];
  }

  function rawEscapeRegExp(value) {
    return String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function rawScanStructure(text) {
    var value = String(text || "");
    var stack = [];
    var pairs = [];
    var inString = false;
    var escaping = false;

    for (var i = 0; i < value.length; i++) {
      var ch = value.charAt(i);

      if (inString) {
        if (escaping) escaping = false;
        else if (ch === "\\") escaping = true;
        else if (ch === '"') inString = false;
        continue;
      }

      if (ch === '"') {
        inString = true;
        continue;
      }

      if (ch === "{" || ch === "[") {
        stack.push({ index: i, char: ch });
        continue;
      }

      if (ch === "}" || ch === "]") {
        var open = stack.pop();
        if (!open) continue;
        var isMatch = (open.char === "{" && ch === "}") || (open.char === "[" && ch === "]");
        if (!isMatch) continue;
        pairs.push({ open: open.index, close: i, openChar: open.char, closeChar: ch });
      }
    }

    pairs.sort(function (a, b) { return a.open - b.open; });
    return pairs;
  }

  function rawFindMatchingBracket(text, pos) {
    var value = String(text || "");
    if (!value) return null;
    var index = Math.max(0, Math.min(value.length - 1, pos));
    var target = value.charAt(index);
    if (!/[{}\[\]]/.test(target) && index > 0 && /[{}\[\]]/.test(value.charAt(index - 1))) {
      index--;
      target = value.charAt(index);
    }
    if (!/[{}\[\]]/.test(target)) return null;

    var pairs = rawScanStructure(value);
    for (var i = 0; i < pairs.length; i++) {
      if (pairs[i].open === index) return pairs[i].close;
      if (pairs[i].close === index) return pairs[i].open;
    }
    return null;
  }

  function rawFindEnclosingFold(text, pos) {
    var value = String(text || "");
    var pairs = rawScanStructure(value);
    var best = null;

    pairs.forEach(function (pair) {
      if (value.slice(pair.open, pair.close).indexOf("\n") === -1) return;
      if (pair.open <= pos && pair.close >= pos) {
        if (!best || (pair.close - pair.open) < (best.close - best.open)) best = pair;
      }
    });

    return best;
  }

  function rawDeleteCurrentLine(text, pos) {
    var value = String(text || "");
    var start = value.lastIndexOf("\n", Math.max(0, pos - 1)) + 1;
    var end = value.indexOf("\n", pos);
    if (end === -1) end = value.length;
    if (end < value.length) end += 1;
    var lineText = value.slice(start, end);
    var nextValue = value.slice(0, start) + value.slice(end);
    var nextPos = Math.min(start, nextValue.length);
    return { text: nextValue, caret: nextPos, line: lineText };
  }

  function rawReadCurrentLine(text, pos) {
    var value = String(text || "");
    var start = value.lastIndexOf("\n", Math.max(0, pos - 1)) + 1;
    var end = value.indexOf("\n", pos);
    if (end === -1) end = value.length;
    if (end < value.length) end += 1;
    return value.slice(start, end);
  }

  function rawPasteLine(text, pos, content, before) {
    var value = String(text || "");
    var chunk = String(content || "");
    if (!chunk) return { text: value, caret: pos };
    var start = value.lastIndexOf("\n", Math.max(0, pos - 1)) + 1;
    var end = value.indexOf("\n", pos);
    if (end === -1) end = value.length;
    if (end < value.length) end += 1;
    var insertAt = before ? start : end;
    var nextValue = value.slice(0, insertAt) + chunk + value.slice(insertAt);
    return { text: nextValue, caret: insertAt };
  }

  return {
    formatConfigJSON: formatConfigJSON,
    parseConfigJSON: parseConfigJSON,
    rawFindInnerWordRange: rawFindInnerWordRange,
    rawMoveWordBackward: rawMoveWordBackward,
    rawMoveWordForward: rawMoveWordForward,
    rawMoveWordEnd: rawMoveWordEnd,
    rawFindLineTarget: rawFindLineTarget,
    rawMoveParagraphForward: rawMoveParagraphForward,
    rawMoveParagraphBackward: rawMoveParagraphBackward,
    rawEscapeRegExp: rawEscapeRegExp,
    rawScanStructure: rawScanStructure,
    rawFindMatchingBracket: rawFindMatchingBracket,
    rawFindEnclosingFold: rawFindEnclosingFold,
    rawDeleteCurrentLine: rawDeleteCurrentLine,
    rawReadCurrentLine: rawReadCurrentLine,
    rawPasteLine: rawPasteLine
  };
})();
