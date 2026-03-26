const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadScript(relPath) {
  const filePath = path.join(__dirname, "..", relPath);
  const code = fs.readFileSync(filePath, "utf8");
  vm.runInNewContext(code, global, { filename: filePath });
}

function createElement(tagName) {
  const listeners = {};
  const element = {
    tagName: String(tagName || "div").toUpperCase(),
    children: [],
    parentNode: null,
    className: "",
    textContent: "",
    type: "",
    offsetWidth: 0,
    appendChild(child) {
      child.parentNode = this;
      this.children.push(child);
      return child;
    },
    removeChild(child) {
      this.children = this.children.filter(function (item) { return item !== child; });
      child.parentNode = null;
    },
    addEventListener(event, handler) {
      listeners[event] = listeners[event] || [];
      listeners[event].push(handler);
    },
    removeEventListener(event, handler) {
      listeners[event] = (listeners[event] || []).filter(function (item) { return item !== handler; });
    },
    querySelector(selector) {
      if (!selector || selector.charAt(0) !== ".") return null;
      const className = selector.slice(1);
      const stack = this.children.slice();
      while (stack.length) {
        const node = stack.shift();
        const classes = String(node.className || "").split(/\s+/).filter(Boolean);
        if (classes.indexOf(className) !== -1) return node;
        Array.prototype.push.apply(stack, node.children || []);
      }
      return null;
    },
    click() {
      (listeners.click || []).forEach(function (handler) { handler({ preventDefault: function () {} }); });
    }
  };
  element.classList = {
    add() {
      const classes = String(element.className || "").split(/\s+/).filter(Boolean);
      Array.prototype.forEach.call(arguments, function (cls) {
        if (classes.indexOf(cls) === -1) classes.push(cls);
      });
      element.className = classes.join(" ");
    },
    remove() {
      let classes = String(element.className || "").split(/\s+/).filter(Boolean);
      Array.prototype.forEach.call(arguments, function (cls) {
        classes = classes.filter(function (item) { return item !== cls; });
      });
      element.className = classes.join(" ");
    },
    contains(cls) {
      return String(element.className || "").split(/\s+/).filter(Boolean).indexOf(cls) !== -1;
    }
  };
  let html = "";
  Object.defineProperty(element, "innerHTML", {
    get() {
      return html;
    },
    set(value) {
      html = String(value || "");
      element.children = [];
      if (html.indexOf("sync-badge-icon") !== -1) {
        const icon = createElement("span");
        icon.className = "sync-badge-icon";
        const label = createElement("span");
        label.className = "sync-badge-label";
        element.appendChild(icon);
        element.appendChild(label);
      }
    }
  });
  return element;
}

describe("Hub.syncStatus", function () {
  let documentKeyHandlers;
  let runtimeSendMessage;
  let storageSnapshot;

  beforeEach(function () {
    documentKeyHandlers = [];
    runtimeSendMessage = jest.fn();
    storageSnapshot = {
      "new-tab-webdav-url": "https://example.com/newtab.json",
      "new-tab-sync-status": "conflict",
      "new-tab-sync-error": "Remote changed",
      "new-tab-sync-last": "2026-03-25T00:00:00.000Z",
      "new-tab-sync-dirty": true,
      "new-tab-sync-remote-update-available": false
    };

    const body = createElement("body");

    global.window = global;
    global.document = {
      body: body,
      createElement: createElement,
      addEventListener(event, handler) {
        if (event === "keydown") documentKeyHandlers.push(handler);
      },
      removeEventListener(event, handler) {
        if (event !== "keydown") return;
        documentKeyHandlers = documentKeyHandlers.filter(function (item) { return item !== handler; });
      }
    };
    global.chrome = {
      storage: {
        local: {
          get(_keys, callback) {
            callback(storageSnapshot);
          }
        },
        onChanged: { addListener: jest.fn() }
      },
      runtime: { sendMessage: runtimeSendMessage }
    };
    global.setInterval = jest.fn();
    global.Hub = {};

    loadScript("js/sync-status.js");
  });

  afterEach(function () {
    delete global.window;
    delete global.document;
    delete global.chrome;
    delete global.Hub;
    delete global.setInterval;
  });

  test("Shift+Y confirm toast allows force push with F", async function () {
    global.Hub.syncStatus.init();
    await Promise.resolve();

    global.Hub.syncStatus.confirmPush();

    const keydownHandler = documentKeyHandlers[documentKeyHandlers.length - 1];
    const event = { key: "f", shiftKey: false, preventDefault: jest.fn() };
    keydownHandler(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(runtimeSendMessage).toHaveBeenCalledWith({ action: "syncUploadForce" });
  });

  test("pull asks for confirmation before downloading", async function () {
    storageSnapshot = {
      "new-tab-webdav-url": "https://example.com/newtab.json",
      "new-tab-sync-status": "idle",
      "new-tab-sync-error": null,
      "new-tab-sync-last": "2026-03-25T00:00:00.000Z",
      "new-tab-sync-dirty": false,
      "new-tab-sync-remote-update-available": true
    };

    global.Hub.syncStatus.init();
    await Promise.resolve();

    global.Hub.syncStatus.pull();

    const keydownHandler = documentKeyHandlers[documentKeyHandlers.length - 1];
    const event = { key: "Enter", shiftKey: false, preventDefault: jest.fn() };
    keydownHandler(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(runtimeSendMessage).toHaveBeenCalledWith({ action: "syncDownload" });
  });

  test("shows conflict label when remote changed and local edits exist", async function () {
    storageSnapshot = {
      "new-tab-webdav-url": "https://example.com/newtab.json",
      "new-tab-sync-status": "idle",
      "new-tab-sync-error": null,
      "new-tab-sync-last": "2026-03-25T00:00:00.000Z",
      "new-tab-sync-dirty": true,
      "new-tab-sync-remote-update-available": true
    };

    global.Hub.syncStatus.init();
    await Promise.resolve();

    const badge = global.document.body.children[0];
    const label = badge.querySelector(".sync-badge-label");
    expect(label.textContent).toBe("Conflict");
    expect(badge.title).toContain("Cloud config changed while this device still has unsynced local edits");
  });

  test("shows disconnected label for sync errors", async function () {
    storageSnapshot = {
      "new-tab-webdav-url": "https://example.com/newtab.json",
      "new-tab-sync-status": "error",
      "new-tab-sync-error": "Network error",
      "new-tab-sync-last": "2026-03-25T00:00:00.000Z",
      "new-tab-sync-dirty": false,
      "new-tab-sync-remote-update-available": false
    };

    global.Hub.syncStatus.init();
    await Promise.resolve();

    const badge = global.document.body.children[0];
    const label = badge.querySelector(".sync-badge-label");
    expect(label.textContent).toBe("Disconnected");
  });
});
