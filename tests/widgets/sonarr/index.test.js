const {
  FakeElement,
  createWidgetState,
  loadScript,
  registerWidgetSmokeSuite,
  setupWidgetTestGlobals,
  teardownWidgetTestGlobals
} = require("../helpers/widget-test-utils");

registerWidgetSmokeSuite({ widgetDir: "sonarr" });

describe("sonarr credential cache scoping", function () {
  let plugin;

  beforeEach(function () {
    setupWidgetTestGlobals();
    loadScript("js/cache.js");
    loadScript("js/widgets/sonarr/index.js");
    plugin = global.Hub.registry.get("sonarr");

    global.Hub.credentials = {
      load: jest.fn(function (widgetId) {
        return Promise.resolve({ apiKey: widgetId === "sonarr-a" ? "key-a" : "key-b" });
      })
    };

    global.fetch = jest.fn(function (url) {
      return Promise.resolve({
        ok: true,
        json: function () {
          if (String(url).includes("/api/v3/series")) {
            return Promise.resolve([{ id: 1, title: "Show", titleSlug: "show" }]);
          }
          return Promise.resolve([]);
        }
      });
    });
  });

  afterEach(function () {
    teardownWidgetTestGlobals();
  });

  test("does not reuse cached API responses across widget credentials", async function () {
    const state = createWidgetState();
    const first = new FakeElement("div");
    const second = new FakeElement("div");
    const config = { title: "On Deck", url: "http://localhost:8989", days: 7 };

    plugin.render(first, config);
    plugin.render(second, config);

    await plugin.load(first, Object.assign({ _id: "sonarr-a" }, config), state, state.renderToken);
    await plugin.load(second, Object.assign({ _id: "sonarr-b" }, config), state, state.renderToken);

    expect(global.fetch).toHaveBeenCalledTimes(4);
  });
});
