window.Hub = window.Hub || {};

Hub.rawJsonEditorSchema = (function () {
  function normalizeEnum(value) {
    return Array.isArray(value) ? value.slice() : [];
  }

  function collectHints(schema) {
    if (!schema || !schema.fields) return [];
    return Object.keys(schema.fields).map(function (key) {
      var field = schema.fields[key] || {};
      return {
        key: key,
        description: field.description || "",
        values: normalizeEnum(field.enum),
        type: field.type || "any",
        min: field.min,
        max: field.max
      };
    }).filter(function (item) {
      return item.values.length || item.type !== "any" || item.min !== undefined || item.max !== undefined || item.description;
    });
  }

  function validate(schema, config) {
    var issues = [];
    if (!schema || !schema.fields || !config || typeof config !== "object" || Array.isArray(config)) {
      return { ok: true, issues: issues, firstMessage: "" };
    }

    Object.keys(schema.fields).forEach(function (key) {
      var rule = schema.fields[key] || {};
      var value = config[key];

      if (value === undefined || value === null || value === "") {
        if (rule.required) {
          issues.push({ path: key, message: key + " is required." });
        }
        return;
      }

      if (rule.type === "string" && typeof value !== "string") {
        issues.push({ path: key, message: key + " must be a string." });
      }
      if (rule.type === "number" && typeof value !== "number") {
        issues.push({ path: key, message: key + " must be a number." });
      }
      if (rule.type === "boolean" && typeof value !== "boolean") {
        issues.push({ path: key, message: key + " must be true or false." });
      }

      if (Array.isArray(rule.enum) && rule.enum.length && rule.enum.indexOf(value) === -1) {
        issues.push({ path: key, message: key + " must be one of: " + rule.enum.join(", ") + "." });
      }

      if (typeof value === "number") {
        if (typeof rule.min === "number" && value < rule.min) {
          issues.push({ path: key, message: key + " must be >= " + rule.min + "." });
        }
        if (typeof rule.max === "number" && value > rule.max) {
          issues.push({ path: key, message: key + " must be <= " + rule.max + "." });
        }
      }
    });

    return {
      ok: issues.length === 0,
      issues: issues,
      firstMessage: issues.length ? issues[0].message : ""
    };
  }

  function scanString(text, start) {
    var value = String(text || "");
    var i = start + 1;
    while (i < value.length) {
      var ch = value.charAt(i);
      if (ch === "\\") {
        i += 2;
        continue;
      }
      if (ch === '"') return i + 1;
      i++;
    }
    return value.length;
  }

  function scanCompound(text, start, openChar, closeChar) {
    var value = String(text || "");
    var depth = 1;
    var i = start + 1;
    while (i < value.length) {
      var ch = value.charAt(i);
      if (ch === '"') {
        i = scanString(value, i);
        continue;
      }
      if (ch === openChar) depth++;
      if (ch === closeChar) {
        depth--;
        if (depth === 0) return i + 1;
      }
      i++;
    }
    return value.length;
  }

  function scanPrimitive(text, start) {
    var value = String(text || "");
    var i = start;
    while (i < value.length && !/[\s,}\]]/.test(value.charAt(i))) i++;
    return i;
  }

  function scanValue(text, start) {
    var value = String(text || "");
    var ch = value.charAt(start);
    if (ch === '"') return scanString(value, start);
    if (ch === "{") return scanCompound(value, start, "{", "}");
    if (ch === "[") return scanCompound(value, start, "[", "]");
    return scanPrimitive(value, start);
  }

  function locateFieldRanges(text) {
    var value = String(text || "");
    var result = {};
    var i = 0;
    var depth = 0;

    while (i < value.length) {
      var ch = value.charAt(i);
      if (ch === '"') {
        var stringEnd = scanString(value, i);
        if (depth === 1) {
          var afterKey = stringEnd;
          while (afterKey < value.length && /\s/.test(value.charAt(afterKey))) afterKey++;
          if (value.charAt(afterKey) === ":") {
            var key = JSON.parse(value.slice(i, stringEnd));
            var valueStart = afterKey + 1;
            while (valueStart < value.length && /\s/.test(value.charAt(valueStart))) valueStart++;
            var valueEnd = scanValue(value, valueStart);
            result[key] = {
              keyRange: { start: i, end: stringEnd },
              valueRange: { start: valueStart, end: valueEnd },
              rawValue: value.slice(valueStart, valueEnd)
            };
            i = valueEnd;
            continue;
          }
        }
        i = stringEnd;
        continue;
      }
      if (ch === "{") depth++;
      if (ch === "}") depth = Math.max(0, depth - 1);
      i++;
    }

    return result;
  }

  function validateWithRanges(schema, config, text) {
    var base = validate(schema, config);
    var ranges = locateFieldRanges(text);
    base.issues = base.issues.map(function (issue) {
      var rangeInfo = ranges[issue.path];
      return Object.assign({}, issue, rangeInfo ? {
        start: rangeInfo.valueRange.start,
        end: rangeInfo.valueRange.end,
        className: "raw-json-schema-invalid"
      } : {});
    });
    return base;
  }

  function getEnumContext(schema, text, pos) {
    if (!schema || !schema.fields) return null;
    var ranges = locateFieldRanges(text);
    var keys = Object.keys(ranges);
    for (var i = 0; i < keys.length; i++) {
      var key = keys[i];
      var field = schema.fields[key] || {};
      var enumValues = normalizeEnum(field.enum);
      var info = ranges[key];
      if (!enumValues.length) continue;
      if (pos >= info.keyRange.start && pos <= info.valueRange.end) {
        var currentValue;
        try {
          currentValue = JSON.parse(info.rawValue);
        } catch (_) {
          currentValue = info.rawValue;
        }
        return {
          key: key,
          enum: enumValues,
          value: currentValue,
          valueRange: info.valueRange,
          keyRange: info.keyRange
        };
      }
    }
    return null;
  }

  return {
    collectHints: collectHints,
    validate: validate,
    validateWithRanges: validateWithRanges,
    locateFieldRanges: locateFieldRanges,
    getEnumContext: getEnumContext
  };
})();
