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
});
