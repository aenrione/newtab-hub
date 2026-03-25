const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadScript(relPath) {
  const filePath = path.join(__dirname, "..", relPath);
  const code = fs.readFileSync(filePath, "utf8");
  vm.runInNewContext(code, global, { filename: filePath });
}

describe("Hub.search", function () {
  beforeEach(function () {
    global.window = global;
    global.Hub = {
      normalize: function (value) {
        return String(value || "").toLowerCase();
      },
      formatHost: function (href) {
        return new URL(href).host;
      },
      escapeHtml: function (value) {
        return String(value || "");
      }
    };

    loadScript("js/search.js");
    global.Hub.openItem = jest.fn();
  });

  afterEach(function () {
    delete global.Hub;
    delete global.window;
  });

  test("treats bare domains as direct URLs", function () {
    const result = global.Hub.search.buildQueryAction("example.com/docs");

    expect(result).toEqual({
      title: "Go to https://example.com/docs",
      href: "https://example.com/docs",
      type: "URL"
    });
  });

  test("turns normal text into a web search action", function () {
    const result = global.Hub.search.buildQueryAction("alpha beta");

    expect(result.title).toBe("Search the web for alpha beta");
    expect(result.href).toBe("https://duckduckgo.com/?q=alpha%20beta");
    expect(result.type).toBe("Search");
  });

  test("can disable web search action via sources config", function () {
    const result = global.Hub.search.buildQueryAction("alpha beta", { sources: { webSearch: false } });

    expect(result).toBe(null);
  });

  test("normalizes source limits safely", function () {
    expect(global.Hub.search.normalizeSourceLimits({ dashboard: "9", bookmarks: 0, history: 99 })).toEqual({
      dashboard: 9,
      bookmarks: 1,
      history: 20
    });
  });

  test("runs inline actions without calling openItem", function () {
    const action = jest.fn();

    global.Hub.search.activateResult({ action: action }, false);

    expect(action).toHaveBeenCalledWith({ newTab: false });
    expect(global.Hub.openItem).not.toHaveBeenCalled();
  });

  test("opens href results through Hub.openItem", function () {
    global.Hub.search.activateResult({ href: "https://example.com" }, true);

    expect(global.Hub.openItem).toHaveBeenCalledWith("https://example.com", true);
  });
});
