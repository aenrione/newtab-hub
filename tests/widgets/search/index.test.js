const {
  loadScript,
  registerWidgetSmokeSuite,
  setupWidgetTestGlobals,
  teardownWidgetTestGlobals
} = require("../helpers/widget-test-utils");

registerWidgetSmokeSuite({ widgetDir: "search" });

describe("search widget config", function () {
  let plugin;

  beforeEach(function () {
    setupWidgetTestGlobals();
    loadScript("js/search.js");
    loadScript("js/widgets/search/index.js");
    plugin = global.Hub.registry.get("search");
  });

  afterEach(function () {
    teardownWidgetTestGlobals();
  });

  test("defaults autofocus on when not configured", function () {
    expect(global.Hub.searchWidget.normalizeConfig({}).autoFocusOnLoad).toBe(true);
  });

  test("honors boolean false for autofocus", function () {
    expect(global.Hub.searchWidget.normalizeConfig({ autoFocusOnLoad: false }).autoFocusOnLoad).toBe(false);
  });

  test("treats string false as disabled autofocus", function () {
    expect(global.Hub.searchWidget.normalizeConfig({ autoFocusOnLoad: "false" }).autoFocusOnLoad).toBe(false);
  });

  test("default config includes focus settings", function () {
    expect(plugin.defaultConfig()).toEqual({
      searchBaseUrl: "https://duckduckgo.com/?q=",
      focusKey: "/",
      autoFocusOnLoad: true,
      placeholder: "Search links, feeds, or type a URL",
      sourceLimits: {
        dashboard: 6,
        bookmarks: 5,
        history: 5
      },
      sources: {
        dashboard: true,
        bookmarks: true,
        history: true,
        webSearch: true
      }
    });
  });

  test("normalizes focus key and sources", function () {
    expect(global.Hub.searchWidget.normalizeConfig({
      focusKey: "g",
      sources: { history: false, webSearch: "0" }
    })).toEqual({
      searchBaseUrl: "https://duckduckgo.com/?q=",
      focusKey: "g",
      autoFocusOnLoad: true,
      placeholder: "Search links, feeds, or type a URL",
      sourceLimits: {
        dashboard: 6,
        bookmarks: 5,
        history: 5
      },
      sources: {
        dashboard: true,
        bookmarks: true,
        history: false,
        webSearch: false
      }
    });
  });

  test("keeps the last typed focus key so replacing slash is easy", function () {
    expect(global.Hub.searchWidget.sanitizeFocusKeyInput("/.")).toBe(".");
    expect(global.Hub.searchWidget.sanitizeFocusKeyInput("g")).toBe("g");
  });

  test("renders the configured focus key as the icon", function () {
    const container = { style: {}, innerHTML: "" };

    plugin.render(container, { _id: "search-1", focusKey: "g" });

    expect(container.innerHTML).toContain('<span class="search-icon">G</span>');
  });
});
