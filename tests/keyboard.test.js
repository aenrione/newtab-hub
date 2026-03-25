const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadScript(relPath) {
  const filePath = path.join(__dirname, "..", relPath);
  const code = fs.readFileSync(filePath, "utf8");
  vm.runInNewContext(code, global, { filename: filePath });
}

describe("keyboard search focus key", function () {
  let keydownHandler;

  beforeEach(function () {
    global.window = global;
    global.window.scrollBy = jest.fn();
    global.window.innerHeight = 900;
    global.document = {
      activeElement: { tagName: "BODY" },
      addEventListener: function (event, handler) {
        if (event === "keydown") keydownHandler = handler;
      },
      querySelector: function () { return null; },
      querySelectorAll: function () { return []; }
    };
    global.Hub = {
      focusSearch: jest.fn(),
      help: { show: jest.fn() },
      zen: { toggle: jest.fn(), updateButtonIcon: jest.fn() },
      grid: { isEditing: function () { return false; } },
      editMode: null
    };

    loadScript("js/keyboard.js");
    global.Hub.keyboard.bind(function () { return { pinned: [] }; });
  });

  afterEach(function () {
    delete global.window;
    delete global.document;
    delete global.Hub;
    keydownHandler = null;
  });

  test("uses the configured focus key instead of slash", function () {
    global.Hub.keyboard.setSearchFocusKey("g");
    const slashEvent = { key: "/", preventDefault: jest.fn(), metaKey: false, ctrlKey: false, altKey: false, shiftKey: false };
    const gEvent = { key: "g", preventDefault: jest.fn(), metaKey: false, ctrlKey: false, altKey: false, shiftKey: false };

    keydownHandler(slashEvent);
    keydownHandler(gEvent);

    expect(global.Hub.focusSearch).toHaveBeenCalledTimes(1);
    expect(global.Hub.focusSearch).toHaveBeenCalledWith("g");
    expect(gEvent.preventDefault).toHaveBeenCalled();
    expect(slashEvent.preventDefault).not.toHaveBeenCalled();
  });

  test("supports multiple search focus keys", function () {
    global.Hub.keyboard.setSearchFocusKeys(["/", "."]);
    const slashEvent = { key: "/", preventDefault: jest.fn(), metaKey: false, ctrlKey: false, altKey: false, shiftKey: false };
    const dotEvent = { key: ".", preventDefault: jest.fn(), metaKey: false, ctrlKey: false, altKey: false, shiftKey: false };

    keydownHandler(slashEvent);
    keydownHandler(dotEvent);

    expect(global.Hub.focusSearch).toHaveBeenNthCalledWith(1, "/");
    expect(global.Hub.focusSearch).toHaveBeenNthCalledWith(2, ".");
  });
});
