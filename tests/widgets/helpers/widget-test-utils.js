const fs = require("fs");
const path = require("path");
const vm = require("vm");

function repoPath(relPath) {
  return path.join(process.cwd(), relPath);
}

function loadScript(relPath) {
  const filePath = repoPath(relPath);
  const code = fs.readFileSync(filePath, "utf8");
  vm.runInNewContext(code, global, { filename: filePath });
}

function selectorTag(selector) {
  if (/input/i.test(selector)) return "input";
  if (/button/i.test(selector)) return "button";
  if (/select/i.test(selector)) return "select";
  if (/textarea/i.test(selector)) return "textarea";
  if (/iframe/i.test(selector)) return "iframe";
  if (/details/i.test(selector)) return "details";
  if (/summary/i.test(selector)) return "summary";
  if (/a(\W|$)/i.test(selector)) return "a";
  return "div";
}

class FakeClassList {
  constructor(owner) {
    this.owner = owner;
    this.names = new Set();
  }

  set(value) {
    this.names = new Set(String(value || "").split(/\s+/).filter(Boolean));
    this._sync();
  }

  add() {
    Array.from(arguments).forEach((value) => {
      if (value) this.names.add(value);
    });
    this._sync();
  }

  remove() {
    Array.from(arguments).forEach((value) => {
      this.names.delete(value);
    });
    this._sync();
  }

  toggle(value, force) {
    if (force === true) {
      this.names.add(value);
    } else if (force === false) {
      this.names.delete(value);
    } else if (this.names.has(value)) {
      this.names.delete(value);
    } else {
      this.names.add(value);
    }
    this._sync();
    return this.names.has(value);
  }

  contains(value) {
    return this.names.has(value);
  }

  _sync() {
    this.owner._className = Array.from(this.names).join(" ");
  }
}

class FakeElement {
  constructor(tagName) {
    this.tagName = String(tagName || "div").toUpperCase();
    this.children = [];
    this.childNodes = this.children;
    this.style = {};
    this.dataset = {};
    this.attributes = {};
    this.listeners = {};
    this.parentNode = null;
    this.innerHTML = "";
    this.textContent = "";
    this.value = "";
    this.checked = false;
    this.disabled = false;
    this.open = false;
    this._queries = new Map();
    this._className = "";
    this.classList = new FakeClassList(this);

    Object.defineProperty(this, "className", {
      get: () => this._className,
      set: (value) => {
        this.classList.set(value);
      }
    });
  }

  appendChild(child) {
    if (!child) return child;
    if (child.isFragment) {
      child.children.slice().forEach((node) => this.appendChild(node));
      return child;
    }
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  replaceChildren() {
    this.children = [];
    this.childNodes = this.children;
    Array.from(arguments).forEach((child) => this.appendChild(child));
  }

  insertAdjacentHTML(position, html) {
    if (position === "afterbegin") {
      this.innerHTML = String(html) + this.innerHTML;
      return;
    }
    this.innerHTML += String(html);
  }

  addEventListener(type, handler) {
    this.listeners[type] = handler;
  }

  removeEventListener(type) {
    delete this.listeners[type];
  }

  querySelector(selector) {
    if (!this._queries.has(selector)) {
      const el = new FakeElement(selectorTag(selector));
      el.parentNode = this;
      this._queries.set(selector, el);
    }
    return this._queries.get(selector);
  }

  querySelectorAll() {
    return [];
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    this[name] = String(value);
  }

  getAttribute(name) {
    return Object.prototype.hasOwnProperty.call(this.attributes, name)
      ? this.attributes[name]
      : null;
  }

  focus() {}

  blur() {}

  select() {}

  remove() {
    if (!this.parentNode) return;
    this.parentNode.children = this.parentNode.children.filter((child) => child !== this);
    this.parentNode.childNodes = this.parentNode.children;
  }

  replaceWith(node) {
    if (!this.parentNode) return;
    const index = this.parentNode.children.indexOf(this);
    if (index === -1) return;
    if (!node) {
      this.parentNode.children.splice(index, 1);
      return;
    }
    node.parentNode = this.parentNode;
    this.parentNode.children.splice(index, 1, node);
  }

  closest(selector) {
    if (selector === "[data-widget-id]") {
      const el = new FakeElement("div");
      el.dataset.widgetId = "widget-1";
      return el;
    }
    return this.parentNode || new FakeElement("div");
  }
}

function createDocument() {
  const body = new FakeElement("body");
  return {
    body: body,
    activeElement: body,
    createElement(tagName) {
      return new FakeElement(tagName);
    },
    createDocumentFragment() {
      const fragment = new FakeElement("fragment");
      fragment.isFragment = true;
      return fragment;
    },
    addEventListener() {},
    removeEventListener() {},
    querySelector(selector) {
      return body.querySelector(selector);
    },
    querySelectorAll(selector) {
      return body.querySelectorAll(selector);
    }
  };
}

function createAsyncStore() {
  const values = new Map();
  return {
    async get(key) {
      return values.get(key);
    },
    async set(key, value) {
      values.set(key, value);
      return value;
    }
  };
}

function createHub() {
  const registry = {};
  return {
    cache: createAsyncStore(),
    credentials: {
      async get() {
        return null;
      }
    },
    icons: {
      gripVertical: "",
      trash2: "",
      x: ""
    },
    grid: {
      isEditing() {
        return false;
      }
    },
    search: {
      normalizeSourceConfig(value) {
        return Object.assign({
          dashboard: true,
          bookmarks: true,
          history: true,
          webSearch: true
        }, value || {});
      }
    },
    registry: {
      register(type, plugin) {
        registry[type] = plugin;
      },
      get(type) {
        return registry[type] || null;
      },
      list() {
        return Object.keys(registry).map((type) => Object.assign({ type: type }, registry[type]));
      }
    },
    injectStyles() {},
    cacheFavicons() {},
    cachedFetch() {
      return Promise.resolve("");
    },
    cachedFetchJSON() {
      return Promise.resolve({});
    },
    fetchWithTimeout() {
      return Promise.resolve({
        ok: true,
        headers: { get() { return null; } },
        json() {
          return Promise.resolve({});
        },
        text() {
          return Promise.resolve("");
        }
      });
    },
    createLink(className, href, title) {
      const el = new FakeElement("a");
      el.className = className || "";
      el.href = href || "#";
      el.title = title || "";
      el.dataset.focusable = "true";
      return el;
    },
    escapeHtml(value) {
      return String(value || "");
    },
    normalize(value) {
      return String(value || "").toLowerCase();
    },
    formatHost(href) {
      try {
        return new URL(href).host;
      } catch (err) {
        return String(href || "");
      }
    },
    formatDate(value) {
      return String(value || "");
    },
    formatNumber(value) {
      return String(value || 0);
    },
    formatPercent(value) {
      return String(value || 0);
    },
    healthDot() {
      return "";
    },
    healthKey() {
      return "health";
    },
    iconMarkup() {
      return "";
    },
    uid() {
      return "widget-1";
    },
    updateWidgetConfig: jest.fn()
  };
}

function createWidgetState() {
  return {
    links: [],
    pinned: [],
    renderToken: 1,
    store: createAsyncStore(),
    _collapsedGroups: new Set()
  };
}

let baselineGlobals = null;

function setupWidgetTestGlobals() {
  baselineGlobals = new Set(Object.getOwnPropertyNames(global));
  jest.useFakeTimers();
  global.window = global;
  global.document = createDocument();
  global.Hub = createHub();
}

function teardownWidgetTestGlobals() {
  jest.clearAllTimers();
  jest.useRealTimers();
  if (!baselineGlobals) return;
  Object.getOwnPropertyNames(global).forEach((name) => {
    if (!baselineGlobals.has(name)) delete global[name];
  });
  baselineGlobals = null;
}

function registerWidgetSmokeSuite(options) {
  const widgetDir = typeof options === "string" ? options : options.widgetDir;
  const widgetType = typeof options === "string" ? options : (options.widgetType || options.widgetDir);

  describe(widgetDir + " widget smoke", function () {
    let plugin;

    beforeEach(function () {
      setupWidgetTestGlobals();
      if (widgetDir !== "pinned") loadScript("js/widgets/pinned/index.js");
      loadScript("js/widgets/" + widgetDir + "/index.js");
      plugin = global.Hub.registry.get(widgetType);
    });

    afterEach(function () {
      teardownWidgetTestGlobals();
    });

    test("registers the widget plugin", function () {
      expect(plugin).toEqual(expect.objectContaining({
        label: expect.any(String),
        icon: expect.any(String),
        render: expect.any(Function),
        renderEditor: expect.any(Function),
        defaultConfig: expect.any(Function)
      }));
    });

    test("returns a fresh default config object", function () {
      expect(plugin.defaultConfig()).not.toBe(plugin.defaultConfig());
    });

    test("returns a serializable default config", function () {
      const config = plugin.defaultConfig();
      expect(config).toBeTruthy();
      expect(typeof config).toBe("object");
      expect(function () {
        JSON.stringify(config);
      }).not.toThrow();
    });

    test("renders with its default config", function () {
      const container = new FakeElement("div");
      const config = plugin.defaultConfig();
      expect(function () {
        plugin.render(container, config, createWidgetState());
      }).not.toThrow();
    });

    test("renders its editor with its default config", function () {
      const container = new FakeElement("div");
      const config = plugin.defaultConfig();
      expect(function () {
        plugin.renderEditor(container, config, function () {}, {});
      }).not.toThrow();
    });
  });
}

module.exports = {
  FakeElement,
  createWidgetState,
  loadScript,
  registerWidgetSmokeSuite,
  setupWidgetTestGlobals,
  teardownWidgetTestGlobals
};
