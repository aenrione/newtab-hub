const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadScript(relPath) {
  const filePath = path.join(__dirname, "..", relPath);
  const code = fs.readFileSync(filePath, "utf8");
  vm.runInNewContext(code, global, { filename: filePath });
}

describe("cache scope clearing", function () {
  beforeEach(async function () {
    global.window = global;
    global.Hub = {};
    loadScript("js/cache.js");
    await global.Hub.cache.init({ get: jest.fn().mockResolvedValue({}), set: jest.fn().mockResolvedValue() });
  });

  afterEach(function () {
    delete global.window;
    delete global.Hub;
  });

  test("removes only entries for the requested widget scope", function () {
    global.Hub.cache.set(global.Hub.cache.scopeKey("widget-a", "youtube::one"), { id: 1 }, "default");
    global.Hub.cache.set(global.Hub.cache.scopeKey("widget-a", "youtube::two"), { id: 2 }, "default");
    global.Hub.cache.set(global.Hub.cache.scopeKey("widget-b", "youtube::one"), { id: 3 }, "default");

    global.Hub.cache.clearScope("widget-a");

    expect(global.Hub.cache.get(global.Hub.cache.scopeKey("widget-a", "youtube::one"))).toBeNull();
    expect(global.Hub.cache.get(global.Hub.cache.scopeKey("widget-a", "youtube::two"))).toBeNull();
    expect(global.Hub.cache.get(global.Hub.cache.scopeKey("widget-b", "youtube::one"))).toEqual({ id: 3 });
  });
});
