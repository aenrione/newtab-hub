window.Hub = window.Hub || {};

Hub.rawJsonEditorRenderer = (function () {
  function renderHighlightedToken(text, className, start, searchState, diagnostics) {
    var tokenText = String(text || "");
    if (!tokenText) return "";

    var classes = className ? [className] : [];
    var matches = searchState && searchState.matches ? searchState.matches : [];
    var issues = diagnostics && diagnostics.issues ? diagnostics.issues : [];
    if (!matches.length && !issues.length) {
      return classes.length
        ? '<span class="' + classes.join(" ") + '">' + Hub.escapeHtml(tokenText) + '</span>'
        : Hub.escapeHtml(tokenText);
    }

    var tokenStart = start;
    var tokenEnd = tokenStart + tokenText.length;
    var boundaries = [tokenStart, tokenEnd];

    matches.forEach(function (match) {
      if (match.end <= tokenStart || match.start >= tokenEnd) return;
      boundaries.push(Math.max(tokenStart, match.start), Math.min(tokenEnd, match.end));
    });
    issues.forEach(function (issue) {
      if (issue.end <= tokenStart || issue.start >= tokenEnd) return;
      boundaries.push(Math.max(tokenStart, issue.start), Math.min(tokenEnd, issue.end));
    });

    boundaries = boundaries.sort(function (a, b) { return a - b; }).filter(function (value, index, arr) {
      return index === 0 || value !== arr[index - 1];
    });

    function wrap(segment, extraClasses) {
      if (!segment) return "";
      var names = classes.concat(extraClasses || []);
      return names.length
        ? '<span class="' + names.join(" ") + '">' + Hub.escapeHtml(segment) + '</span>'
        : Hub.escapeHtml(segment);
    }

    var html = "";
    for (var i = 0; i < boundaries.length - 1; i++) {
      var segStart = boundaries[i];
      var segEnd = boundaries[i + 1];
      if (segEnd <= segStart) continue;

      var extra = [];
      matches.forEach(function (match, matchIndex) {
        if (match.start < segEnd && match.end > segStart) {
          extra.push("raw-json-search");
          if (searchState.index === matchIndex) extra.push("is-current");
        }
      });
      issues.forEach(function (issue) {
        if (issue.start < segEnd && issue.end > segStart) {
          extra.push(issue.className || "raw-json-invalid");
        }
      });

      html += wrap(tokenText.slice(segStart - tokenStart, segEnd - tokenStart), extra);
    }

    return html;
  }

  function renderJSONHtml(text, searchState, collapsedFolds, diagnostics) {
    var value = String(text || "");
    var html = "";
    var i = 0;
    var foldsByStart = {};

    (collapsedFolds || []).forEach(function (pair) {
      foldsByStart[pair.open] = pair;
    });

    function pushToken(tokenText, className, start) {
      html += renderHighlightedToken(tokenText, className, start, searchState, diagnostics);
    }

    while (i < value.length) {
      var fold = foldsByStart[i];
      if (fold) {
        var foldedLines = value.slice(fold.open, fold.close).split("\n").length - 1;
        pushToken(value.charAt(fold.open), "raw-json-brace", fold.open);
        html += '<span class="raw-json-fold"> ... ' + foldedLines + ' lines ... </span>';
        pushToken(value.charAt(fold.close), "raw-json-brace", fold.close);
        i = fold.close + 1;
        continue;
      }

      var ch = value.charAt(i);

      if (ch === '"') {
        var j = i + 1;
        while (j < value.length) {
          if (value.charAt(j) === "\\") {
            j += 2;
            continue;
          }
          if (value.charAt(j) === '"') {
            j++;
            break;
          }
          j++;
        }
        var stringToken = value.slice(i, j);
        var probe = j;
        while (probe < value.length && /\s/.test(value.charAt(probe))) probe++;
        pushToken(stringToken, value.charAt(probe) === ":" ? "raw-json-key" : "raw-json-string", i);
        i = j;
        continue;
      }

      if (ch === "-" || /\d/.test(ch)) {
        var numberMatch = value.slice(i).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
        if (numberMatch) {
          pushToken(numberMatch[0], "raw-json-number", i);
          i += numberMatch[0].length;
          continue;
        }
      }

      if (value.slice(i, i + 4) === "true" && !/[A-Za-z0-9_]/.test(value.charAt(i + 4) || "")) {
        pushToken("true", "raw-json-boolean", i);
        i += 4;
        continue;
      }
      if (value.slice(i, i + 5) === "false" && !/[A-Za-z0-9_]/.test(value.charAt(i + 5) || "")) {
        pushToken("false", "raw-json-boolean", i);
        i += 5;
        continue;
      }
      if (value.slice(i, i + 4) === "null" && !/[A-Za-z0-9_]/.test(value.charAt(i + 4) || "")) {
        pushToken("null", "raw-json-null", i);
        i += 4;
        continue;
      }

      if (/[{}\[\]]/.test(ch)) {
        pushToken(ch, "raw-json-brace", i);
        i++;
        continue;
      }
      if (ch === ":") {
        pushToken(ch, "raw-json-colon", i);
        i++;
        continue;
      }
      if (ch === ",") {
        pushToken(ch, "raw-json-comma", i);
        i++;
        continue;
      }

      pushToken(ch, "", i);
      i++;
    }

    return html || " ";
  }

  return {
    renderHighlightedToken: renderHighlightedToken,
    renderJSONHtml: renderJSONHtml
  };
})();
