const fs = require("fs");
const path = require("path");
const vm = require("vm");

function loadScript(relPath) {
  const filePath = path.join(process.cwd(), relPath);
  const code = fs.readFileSync(filePath, "utf8");
  vm.runInNewContext(code, global, { filename: filePath });
}

function createStore(snapshot) {
  const state = snapshot || {};
  return {
    state,
    async get(key) {
      return state[key];
    },
    async set(key, value) {
      state[key] = value;
    }
  };
}

describe("theme hint color persistence", function () {
  let baselineGlobals;
  let cssVars;

  function bootThemeRuntime() {
    cssVars = {};
    global.window = global;
    global.document = {
      documentElement: {
        style: {
          setProperty: jest.fn(function (key, value) {
            cssVars[key] = value;
          })
        }
      },
      body: (function () {
        var classes = [];
        return {
          style: { background: "" },
          classList: {
            add: function (cls) { if (classes.indexOf(cls) === -1) classes.push(cls); },
            remove: function (cls) { classes = classes.filter(function (c) { return c !== cls; }); },
            contains: function (cls) { return classes.indexOf(cls) !== -1; }
          }
        };
      }())
    };
    global.getComputedStyle = jest.fn(function () {
      return {
        getPropertyValue: function (key) {
          return cssVars[key] || "";
        }
      };
    });
    global.Hub = {};

    loadScript("js/theme.js");
  }

  beforeEach(function () {
    baselineGlobals = new Set(Object.getOwnPropertyNames(global));
    bootThemeRuntime();
  });

  afterEach(function () {
    Object.getOwnPropertyNames(global).forEach(function (name) {
      if (!baselineGlobals.has(name)) delete global[name];
    });
  });

  test("getThemeColorValue uses the active hint text overrides", function () {
    Hub.applyColorScheme(Object.assign({}, Hub.DEFAULT_COLORS, {
      hintText: "#123456",
      hintAccentText: "#abcdef"
    }));

    expect(Hub.getThemeColorValue("hintText")).toBe("#123456");
    expect(Hub.getThemeColorValue("hintAccentText")).toBe("#abcdef");
  });

  test("getThemeColorValue falls back to computed CSS vars", function () {
    Hub.currentColorScheme = {};
    cssVars["--hint-text"] = "#445566";

    expect(Hub.getThemeColorValue("hintText")).toBe("#445566");
  });

  test("prefers profile scope when profile-specific theme overrides already exist", function () {
    expect(Hub.getPreferredThemeScope({
      _global: { hintText: "#111111" },
      personal: { hintText: "#222222" }
    }, "personal")).toBe("profile");
  });

  test("defaults to global scope when the active profile has no saved override", function () {
    expect(Hub.getPreferredThemeScope({
      _global: { hintText: "#111111" }
    }, "personal")).toBe("global");
  });

  test("applyColorScheme updates the live background preview", function () {
    Hub.applyColorScheme(Object.assign({}, Hub.DEFAULT_COLORS, {
      bg: "#223344"
    }));

    expect(Hub.currentColorScheme.bg).toBe("#223344");
    expect(global.document.body.style.background).toContain("#223344");
  });

  test("saveThemeOverride and loadTheme preserve explicit hint text colors", async function () {
    const store = createStore();

    await Hub.saveThemeOverride(store, "personal", {
      hintText: "#112233",
      hintAccentText: "#ddeeff"
    }, false);

    bootThemeRuntime();

    const loaded = await Hub.loadTheme(store, "personal", {});

    expect(loaded.hintText).toBe("#112233");
    expect(loaded.hintAccentText).toBe("#ddeeff");
    expect(cssVars["--hint-text"]).toBe("#112233");
    expect(cssVars["--hint-accent-text"]).toBe("#ddeeff");
    expect(Hub.getThemeColorValue("hintText")).toBe("#112233");
    expect(Hub.getThemeColorValue("hintAccentText")).toBe("#ddeeff");
  });

  test("persists every color token through a simulated refresh", async function () {
    const store = createStore();
    const allColors = {
      bg: "#102030",
      surface: "#203040",
      surfaceHover: "#304050",
      text: "#405060",
      textMuted: "#506070",
      textMutedStrong: "#607080",
      accent: "#708090",
      accentAlt: "#8090a0",
      hintBg: "#90a0b0",
      hintText: "#a0b0c0",
      hintBorder: "#b0c0d0",
      hintAccentBg: "#c0d0e0",
      hintAccentText: "#d0e0f0",
      hintAccentBorder: "#e0f001",
      border: "#112244",
      borderStrong: "#223355",
      ok: "#334466",
      warn: "#445577",
      down: "#556688"
    };

    await Hub.saveThemeOverride(store, "personal", allColors, false);

    bootThemeRuntime();

    const loaded = await Hub.loadTheme(store, "personal", {});

    Object.keys(allColors).forEach(function (key) {
      expect(loaded[key]).toBe(allColors[key]);
      expect(Hub.currentColorScheme[key]).toBe(allColors[key]);
      expect(Hub.getThemeColorValue(key)).toBe(allColors[key]);
      expect(cssVars[Hub.CSS_VAR_MAP[key]]).toBe(allColors[key]);
    });
    expect(global.document.body.style.background).toContain(allColors.bg);
  });

  test("refresh keeps global, profile, and explicit hint overrides merged in the right order", async function () {
    const store = createStore();

    await Hub.saveThemeOverride(store, "personal", {
      bg: "#111111",
      text: "#eeeeee"
    }, true);
    await Hub.saveThemeOverride(store, "personal", {
      bg: "#222222",
      hintText: "#abcdef",
      hintAccentText: "#fedcba"
    }, false);

    bootThemeRuntime();

    const loaded = await Hub.loadTheme(store, "personal", {
      colorScheme: {
        bg: "#333333",
        surface: "#444444"
      }
    });

    expect(loaded.bg).toBe("#222222");
    expect(loaded.text).toBe("#eeeeee");
    expect(loaded.surface).toBe("#444444");
    expect(loaded.hintText).toBe("#abcdef");
    expect(loaded.hintAccentText).toBe("#fedcba");
  });

  test("profile hint overrides still shadow global values after refresh", async function () {
    const store = createStore();

    await Hub.saveThemeOverride(store, "personal", {
      hintText: "#101010"
    }, false);
    await Hub.saveThemeOverride(store, "personal", {
      hintText: "#f0f0f0"
    }, true);

    bootThemeRuntime();

    const loaded = await Hub.loadTheme(store, "personal", {});

    expect(loaded.hintText).toBe("#101010");
    expect(Hub.getPreferredThemeScope(store.state[Hub.STORAGE_THEME_KEY], "personal")).toBe("profile");
  });

  describe("applyStyleVariant", function () {
    test("adds theme-flat class when variant is flat", function () {
      Hub.applyStyleVariant("flat");
      expect(document.body.classList.contains("theme-flat")).toBe(true);
    });

    test("removes theme-flat class when switching to default", function () {
      Hub.applyStyleVariant("flat");
      Hub.applyStyleVariant("default");
      expect(document.body.classList.contains("theme-flat")).toBe(false);
    });

    test("removes theme-flat class when called with no argument", function () {
      Hub.applyStyleVariant("flat");
      Hub.applyStyleVariant();
      expect(document.body.classList.contains("theme-flat")).toBe(false);
    });

    test("applyStyleOverrides calls applyStyleVariant with styleVariant from styles", function () {
      Hub.applyStyleOverrides({ styleVariant: "flat" });
      expect(document.body.classList.contains("theme-flat")).toBe(true);
    });

    test("applyStyleOverrides uses DEFAULT_STYLE.styleVariant when not in overrides", function () {
      Hub.applyStyleVariant("flat");           // pre-set
      Hub.applyStyleOverrides({});             // no styleVariant key
      expect(document.body.classList.contains("theme-flat")).toBe(false);
    });
  });
});
