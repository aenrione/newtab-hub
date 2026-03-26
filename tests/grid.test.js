const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadScript(relPath) {
  const filePath = path.join(process.cwd(), relPath);
  const code = fs.readFileSync(filePath, "utf8");
  vm.runInNewContext(code, global, { filename: filePath });
}

describe("grid layout resolution", function () {
  let baselineGlobals;

  beforeEach(function () {
    baselineGlobals = new Set(Object.getOwnPropertyNames(global));
    global.window = global;
    global.Hub = {
      keyboard: {
        getWidgetKeyMap() { return {}; },
        ERGO_KEYS: [],
        isReservedKey() { return false; }
      },
      icons: {},
      registry: {
        addable() { return []; }
      }
	    };

	    loadScript("js/raw-json-editor/helpers.js");
	    loadScript("js/raw-json-editor/render.js");
	    loadScript("js/raw-json-editor/history.js");
	    loadScript("js/raw-json-editor/selection.js");
	    loadScript("js/raw-json-editor/diagnostics.js");
	    loadScript("js/raw-json-editor/schema.js");
	    loadScript("js/raw-json-editor/engine.js");
	    loadScript("js/raw-json-editor/index.js");
	    loadScript("js/grid.js");
  });

  afterEach(function () {
    Object.getOwnPropertyNames(global).forEach((name) => {
      if (!baselineGlobals.has(name)) delete global[name];
    });
  });

  test("repositions colliding widgets sideways before pushing them down", function () {
    const next = Hub.grid.resolveLayoutChange([
      { widget: "search", col: 1, row: 1, width: 4, height: 1 },
      { widget: "feeds", col: 5, row: 1, width: 4, height: 1 }
    ], {
      widget: "search",
      col: 1,
      row: 1,
      width: 5,
      height: 1
    });

    expect(next).toEqual(expect.arrayContaining([
      expect.objectContaining({ widget: "search", col: 1, row: 1, width: 5, height: 1 }),
      expect.objectContaining({ widget: "feeds", col: 6, row: 1, width: 4, height: 1 })
    ]));
  });

  test("falls back to the next open row when no horizontal slot exists", function () {
    const next = Hub.grid.resolveLayoutChange([
      { widget: "search", col: 1, row: 1, width: 4, height: 1 },
      { widget: "daily", col: 5, row: 1, width: 4, height: 1 },
      { widget: "markets", col: 9, row: 1, width: 4, height: 1 }
    ], {
      widget: "search",
      col: 1,
      row: 1,
      width: 5,
      height: 1
    });

    expect(next).toEqual(expect.arrayContaining([
      expect.objectContaining({ widget: "daily", col: 5, row: 2, width: 4, height: 1 })
    ]));
  });

  test("respects widget minimum size when resizing", function () {
    const next = Hub.grid.resolveLayoutChange([
      { widget: "pomodoro", col: 1, row: 1, width: 4, height: 4, minWidth: 4, minHeight: 4 }
    ], {
      widget: "pomodoro",
      col: 1,
      row: 1,
      width: 1,
      height: 1,
      minWidth: 4,
      minHeight: 4
    });

    expect(next).toEqual(expect.arrayContaining([
      expect.objectContaining({ widget: "pomodoro", width: 4, height: 4, minWidth: 4, minHeight: 4 })
    ]));
  });

  test("formats widget config as pretty JSON", function () {
    expect(Hub.grid.formatConfigJSON({ title: "Weather", nested: { limit: 5 } })).toBe([
      "{",
      '  "title": "Weather",',
      '  "nested": {',
      '    "limit": 5',
      "  }",
      "}"
    ].join("\n"));
  });

  test("parses raw widget JSON only when it is an object", function () {
    expect(Hub.grid.parseConfigJSON('{"title":"Weather"}')).toEqual({
      ok: true,
      value: { title: "Weather" }
    });

    expect(Hub.grid.parseConfigJSON('["not","an","object"]').ok).toBe(false);
    expect(Hub.grid.parseConfigJSON('{broken json').ok).toBe(false);
  });

  test("supports vim-style raw editor word motions", function () {
    expect(Hub.grid.rawFindInnerWordRange('  "hello_world": true', 4)).toEqual({ start: 3, end: 14 });
    expect(Hub.grid.rawMoveWordBackward('foo bar baz', 8)).toBe(4);
    expect(Hub.grid.rawMoveWordForward('foo bar baz', 0)).toBe(4);
    expect(Hub.grid.rawMoveWordEnd('foo bar baz', 0)).toBe(2);
    expect(Hub.grid.rawMoveWordEnd('foo bar baz', 2)).toBe(6);
  });

  test("supports paragraph-style motions for blank-line blocks", function () {
    const text = 'alpha\nbeta\n\ngamma\ndelta\n\nomega';
    expect(Hub.grid.rawMoveParagraphForward(text, 0)).toBe(12);
    expect(Hub.grid.rawMoveParagraphBackward(text, text.length)).toBe(12);
  });

  test("finds matching json brackets for percent motion", function () {
    expect(Hub.grid.rawFindMatchingBracket('{"a":[1,2]}', 0)).toBe(10);
    expect(Hub.grid.rawFindMatchingBracket('{"a":[1,2]}', 5)).toBe(9);
  });

  test("supports line delete and paste helpers", function () {
    expect(Hub.grid.rawDeleteCurrentLine('one\ntwo\nthree\n', 5)).toEqual({
      text: 'one\nthree\n',
      caret: 4,
      line: 'two\n'
    });

    expect(Hub.grid.rawPasteLine('one\nthree\n', 1, 'two\n', false)).toEqual({
      text: 'one\ntwo\nthree\n',
      caret: 4
    });
  });

  test("supports linewise and blockwise visual selection helpers", function () {
    expect(Hub.rawJsonEditorSelection.getLinewiseRange('one\ntwo\nthree\n', 1, 6)).toEqual({
      start: 0,
      end: 8
    });

    expect(Hub.rawJsonEditorSelection.getBlockRanges('abcd\nefgh\nijkl', 1, 10)).toEqual([
      { start: 0, end: 2 },
      { start: 5, end: 7 },
      { start: 10, end: 12 }
    ]);

    expect(Hub.rawJsonEditorSelection.applyBlockInsert(
      'abcd\nefgh\nijkl',
      Hub.rawJsonEditorSelection.getBlockRanges('abcd\nefgh\nijkl', 1, 10),
      '//',
      'start'
    )).toEqual({
      text: '//abcd\n//efgh\n//ijkl',
      caret: 2
    });

    expect(Hub.rawJsonEditorSelection.applyBlockInsert(
      'abcd\nefgh\nijkl',
      Hub.rawJsonEditorSelection.getBlockRanges('abcd\nefgh\nijkl', 1, 10),
      '!',
      'end'
    )).toEqual({
      text: 'ab!cd\nef!gh\nij!kl',
      caret: 3
    });
  });

  test("detects common invalid json issues for inline highlighting", function () {
    expect(Hub.rawJsonEditorDiagnostics.analyze('{"a":1,}').issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'trailing-comma' })])
    );

    expect(Hub.rawJsonEditorDiagnostics.analyze('{"a":"oops}').issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'unclosed-string' })])
    );

    expect(Hub.rawJsonEditorDiagnostics.analyze('{"a":1').issues).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'unmatched-open' })])
    );
  });

  test("validates schema-defined enum values and ranges", function () {
    const schema = {
      fields: {
        mode: { type: "string", enum: ["alerts", "metrics"] },
        limit: { type: "number", min: 1, max: 10 }
      }
    };

    expect(Hub.rawJsonEditor.validateSchema(schema, { mode: "alerts", limit: 5 }).ok).toBe(true);
    expect(Hub.rawJsonEditor.validateSchema(schema, { mode: "wrong", limit: 5 }).ok).toBe(false);
    expect(Hub.rawJsonEditor.validateSchema(schema, { mode: "alerts", limit: 50 }).ok).toBe(false);
  });

  test("locates schema-backed value ranges and enum context", function () {
    const schema = {
      fields: {
        mode: { type: "string", enum: ["alerts", "metrics"] },
        limit: { type: "number", min: 1, max: 10 }
      }
    };
    const text = '{\n  "mode": "wrong",\n  "limit": 50\n}';
    const ranges = Hub.rawJsonEditorSchema.locateFieldRanges(text);

    expect(ranges.mode.valueRange).toEqual({ start: 12, end: 19 });
    expect(Hub.rawJsonEditorSchema.getEnumContext(schema, text, 14)).toEqual(
      expect.objectContaining({ key: "mode", value: "wrong", enum: ["alerts", "metrics"] })
    );

    expect(Hub.rawJsonEditorSchema.validateWithRanges(schema, { mode: "wrong", limit: 50 }, text).issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "mode", start: 12, end: 19, className: "raw-json-schema-invalid" }),
        expect.objectContaining({ path: "limit", className: "raw-json-schema-invalid" })
      ])
    );
  });
});
