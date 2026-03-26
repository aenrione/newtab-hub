window.Hub = window.Hub || {};

Hub.rawJsonEditorDiagnostics = (function () {
  function analyze(text) {
    var value = String(text || "");
    var issues = [];
    var stack = [];
    var inString = false;
    var escaping = false;
    var stringStart = -1;

    function pushIssue(start, end, code, message) {
      issues.push({ start: start, end: Math.max(start + 1, end), code: code, message: message });
    }

    for (var i = 0; i < value.length; i++) {
      var ch = value.charAt(i);

      if (inString) {
        if (escaping) {
          escaping = false;
        } else if (ch === "\\") {
          escaping = true;
        } else if (ch === '"') {
          inString = false;
          stringStart = -1;
        }
        continue;
      }

      if (ch === '"') {
        inString = true;
        stringStart = i;
        continue;
      }

      if (ch === "{" || ch === "[") {
        stack.push({ char: ch, index: i });
        continue;
      }

      if (ch === "}" || ch === "]") {
        var open = stack[stack.length - 1];
        var isMatch = open && ((open.char === "{" && ch === "}") || (open.char === "[" && ch === "]"));
        if (isMatch) {
          stack.pop();
        } else {
          pushIssue(i, i + 1, "unmatched-close", "Unmatched closing " + ch + ".");
        }
        continue;
      }

      if (ch === ",") {
        var j = i + 1;
        while (j < value.length && /\s/.test(value.charAt(j))) j++;
        var next = value.charAt(j);
        if (!next || next === "}" || next === "]") {
          pushIssue(i, i + 1, "trailing-comma", "Trailing commas are not valid JSON.");
        }
      }
    }

    if (inString && stringStart >= 0) {
      pushIssue(stringStart, value.length, "unclosed-string", "String is missing a closing quote.");
    }

    stack.forEach(function (entry) {
      pushIssue(entry.index, entry.index + 1, "unmatched-open", "Unmatched opening " + entry.char + ".");
    });

    return {
      issues: issues,
      firstMessage: issues.length ? issues[0].message : ""
    };
  }

  return { analyze: analyze };
})();
