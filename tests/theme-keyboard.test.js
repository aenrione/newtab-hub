const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadScript(relPath) {
  const filePath = path.join(process.cwd(), relPath);
  const code = fs.readFileSync(filePath, "utf8");
  vm.runInNewContext(code, global, { filename: filePath });
}

describe("theme sidebar keyboard", function () {
  let baselineGlobals;
  let sidebarKeydownHandler;
  let sidebarFocusinHandler;
  let documentKeydownHandler;
  let section;
  let colorInput;
  let sidebar;
  let body;

  beforeEach(function () {
    baselineGlobals = new Set(Object.getOwnPropertyNames(global));

    colorInput = {
      tagName: "INPUT",
      type: "color",
      style: { display: "" },
      offsetParent: {},
      classList: { add: jest.fn(), remove: jest.fn() },
      scrollIntoView: jest.fn(),
      focus: jest.fn(),
      blur: jest.fn()
    };

    section = {
      classList: { add: jest.fn(), remove: jest.fn() },
      hasAttribute: jest.fn(function () { return false; }),
      removeAttribute: jest.fn(),
      focus: jest.fn(),
      scrollIntoView: jest.fn(),
      appendChild: jest.fn(),
      querySelectorAll: jest.fn(function (selector) {
        if (selector === 'input:not([type="file"]), select, textarea, button:not(.theme-sidebar-close)') return [colorInput];
        return [];
      }),
      contains: jest.fn(function (target) { return target === colorInput; })
    };

    sidebar = {
      classList: { contains: jest.fn(function (name) { return name === "is-open"; }) },
      addEventListener: jest.fn(function (event, handler) {
        if (event === "keydown") sidebarKeydownHandler = handler;
        if (event === "focusin") sidebarFocusinHandler = handler;
      }),
      removeEventListener: jest.fn(),
      querySelectorAll: jest.fn(function () { return []; }),
      querySelector: jest.fn(function () { return null; }),
      contains: jest.fn(function (target) { return target === colorInput || target === section; })
    };

    body = {
      querySelectorAll: jest.fn(function (selector) {
        if (selector === ".theme-section") return [section];
        return [];
      })
    };

    global.window = global;
    global.document = {
      activeElement: colorInput,
      addEventListener: jest.fn(function (event, handler, capture) {
        if (event === "keydown" && capture === true) documentKeydownHandler = handler;
      }),
      removeEventListener: jest.fn(),
      createElement: jest.fn(function () {
        return {
          className: "",
          textContent: "",
          appendChild: jest.fn()
        };
      })
    };
    global.Hub = {
      keyboard: {
        spatialMove: jest.fn(function () { return colorInput; })
      }
    };

    loadScript("js/theme-keyboard.js");
  });

  afterEach(function () {
    Object.getOwnPropertyNames(global).forEach(function (name) {
      if (!baselineGlobals.has(name)) delete global[name];
    });
  });

  test("captures Cmd/Ctrl+S for a focused color input", function () {
    const onSave = jest.fn();
    const keyboard = new global.ThemeSidebarKeyboard(sidebar, body, { onSave: onSave });

    keyboard.attach();

    const event = {
      key: "s",
      metaKey: true,
      ctrlKey: false,
      altKey: false,
      target: colorInput,
      preventDefault: jest.fn()
    };

    documentKeydownHandler(event);

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(event.preventDefault).toHaveBeenCalled();
    expect(typeof sidebarKeydownHandler).toBe("function");
    expect(typeof sidebarFocusinHandler).toBe("function");
  });
});
