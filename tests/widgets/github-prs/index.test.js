const {
  FakeElement,
  createWidgetState,
  loadScript,
  registerWidgetSmokeSuite,
  setupWidgetTestGlobals,
  teardownWidgetTestGlobals
} = require("../helpers/widget-test-utils");

registerWidgetSmokeSuite({ widgetDir: "github-prs" });

describe("github-prs credential cache scoping", function () {
  let plugin;

  beforeEach(function () {
    setupWidgetTestGlobals();
    loadScript("js/cache.js");
    loadScript("js/widgets/github-prs/index.js");
    plugin = global.Hub.registry.get("github-prs");

    global.Hub.credentials = {
      load: jest.fn(function (widgetId) {
        return Promise.resolve({ token: widgetId === "gh-a" ? "token-a" : "token-b" });
      })
    };

    global.Hub.fetchWithTimeout = jest.fn(function (_url, opts) {
      const token = opts && opts.headers && opts.headers.Authorization;
      const suffix = token === "Bearer token-a" ? "a" : "b";
      return Promise.resolve({
        ok: true,
        json: function () {
          return Promise.resolve({
            items: [{
              repository_url: "https://api.github.com/repos/acme/repo",
              number: suffix === "a" ? 1 : 2,
              title: "PR " + suffix.toUpperCase(),
              updated_at: "2026-03-25T12:00:00Z",
              html_url: "https://github.com/acme/repo/pull/" + (suffix === "a" ? 1 : 2),
              draft: false
            }]
          });
        }
      });
    });
  });

  afterEach(function () {
    teardownWidgetTestGlobals();
  });

  test("does not reuse cached PR data across widget credentials", async function () {
    const state = createWidgetState();
    const first = new FakeElement("div");
    const second = new FakeElement("div");

    plugin.render(first, { title: "PRs" });
    plugin.render(second, { title: "PRs" });

    await plugin.load(first, { _id: "gh-a", filter: "authored", repos: [], limit: 5 }, state, state.renderToken);
    await plugin.load(second, { _id: "gh-b", filter: "authored", repos: [], limit: 5 }, state, state.renderToken);

    expect(global.Hub.fetchWithTimeout).toHaveBeenCalledTimes(2);
  });
});
