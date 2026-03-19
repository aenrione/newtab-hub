/* ── Color scheme / theme engine ── */

window.Hub = window.Hub || {};

Hub.DEFAULT_COLORS = {
  bg: "#101828",
  surface: "#1a2438",
  surfaceHover: "#283755",
  text: "#e5e7eb",
  textMuted: "#94a3b8",
  textMutedStrong: "#cbd5e1",
  accent: "#8bd3dd",
  accentAlt: "#79aee8",
  border: "#293548",
  borderStrong: "#3d4f66",
  ok: "#4ade80",
  warn: "#fbbf24",
  down: "#f87171"
};

Hub.DEFAULT_STYLE = {
  borderRadius: "10",
  borderWidth: "1",
  widgetBorderRadius: "10",
  searchBorderRadius: "6"
};

Hub.CSS_VAR_MAP = {
  bg: "--bg",
  surface: "--surface",
  surfaceHover: "--surface-hover",
  text: "--text",
  textMuted: "--muted",
  textMutedStrong: "--muted-strong",
  accent: "--accent",
  accentAlt: "--accent-2",
  border: "--border",
  borderStrong: "--border-strong",
  ok: "--ok",
  warn: "--warn",
  down: "--down"
};

Hub.STYLE_VAR_MAP = {
  borderRadius: "--radius-lg",
  borderWidth: "--border-width",
  widgetBorderRadius: "--radius-lg",
  searchBorderRadius: "--radius-md"
};

Hub.STORAGE_CUSTOM_CSS_KEY = "new-tab-custom-css";
Hub.STORAGE_STYLE_KEY = "new-tab-style-overrides";

/* ── Theme presets ── */

Hub.THEME_PRESETS = {
  "Default": Hub.DEFAULT_COLORS,

  "Gruvbox Dark": {
    bg: "#282828",
    surface: "#3c3836",
    surfaceHover: "#504945",
    text: "#ebdbb2",
    textMuted: "#a89984",
    textMutedStrong: "#d5c4a1",
    accent: "#b8bb26",
    accentAlt: "#83a598",
    ok: "#b8bb26",
    warn: "#fabd2f",
    down: "#fb4934"
  },

  "Gruvbox Light": {
    bg: "#fbf1c7",
    surface: "#ebdbb2",
    surfaceHover: "#d5c4a1",
    text: "#3c3836",
    textMuted: "#665c54",
    textMutedStrong: "#504945",
    accent: "#79740e",
    accentAlt: "#076678",
    ok: "#79740e",
    warn: "#b57614",
    down: "#cc241d"
  },

  "Catppuccin Mocha": {
    bg: "#1e1e2e",
    surface: "#313244",
    surfaceHover: "#45475a",
    text: "#cdd6f4",
    textMuted: "#a6adc8",
    textMutedStrong: "#bac2de",
    accent: "#89b4fa",
    accentAlt: "#cba6f7",
    ok: "#a6e3a1",
    warn: "#f9e2af",
    down: "#f38ba8"
  },

  "Catppuccin Latte": {
    bg: "#eff1f5",
    surface: "#e6e9ef",
    surfaceHover: "#ccd0da",
    text: "#4c4f69",
    textMuted: "#8c8fa1",
    textMutedStrong: "#6c6f85",
    accent: "#1e66f5",
    accentAlt: "#8839ef",
    ok: "#40a02b",
    warn: "#df8e1d",
    down: "#d20f39"
  },

  "Catppuccin Frappe": {
    bg: "#303446",
    surface: "#414559",
    surfaceHover: "#51576d",
    text: "#c6d0f5",
    textMuted: "#a5adce",
    textMutedStrong: "#b5bfe2",
    accent: "#8caaee",
    accentAlt: "#ca9ee6",
    ok: "#a6d189",
    warn: "#e5c890",
    down: "#e78284"
  },

  "Nord": {
    bg: "#2e3440",
    surface: "#3b4252",
    surfaceHover: "#434c5e",
    text: "#eceff4",
    textMuted: "#d8dee9",
    textMutedStrong: "#e5e9f0",
    accent: "#88c0d0",
    accentAlt: "#81a1c1",
    ok: "#a3be8c",
    warn: "#ebcb8b",
    down: "#bf616a"
  },

  "Solarized Dark": {
    bg: "#002b36",
    surface: "#073642",
    surfaceHover: "#094352",
    text: "#839496",
    textMuted: "#657b83",
    textMutedStrong: "#93a1a1",
    accent: "#2aa198",
    accentAlt: "#268bd2",
    ok: "#859900",
    warn: "#b58900",
    down: "#dc322f"
  },

  "Solarized Light": {
    bg: "#fdf6e3",
    surface: "#eee8d5",
    surfaceHover: "#ddd6c1",
    text: "#657b83",
    textMuted: "#93a1a1",
    textMutedStrong: "#586e75",
    accent: "#2aa198",
    accentAlt: "#268bd2",
    ok: "#859900",
    warn: "#b58900",
    down: "#dc322f"
  },

  "Dracula": {
    bg: "#282a36",
    surface: "#44475a",
    surfaceHover: "#6272a4",
    text: "#f8f8f2",
    textMuted: "#6272a4",
    textMutedStrong: "#bd93f9",
    accent: "#ff79c6",
    accentAlt: "#8be9fd",
    ok: "#50fa7b",
    warn: "#f1fa8c",
    down: "#ff5555"
  },

  "Tokyo Night": {
    bg: "#1a1b26",
    surface: "#24283b",
    surfaceHover: "#343b58",
    text: "#c0caf5",
    textMuted: "#565f89",
    textMutedStrong: "#a9b1d6",
    accent: "#7aa2f7",
    accentAlt: "#bb9af7",
    ok: "#9ece6a",
    warn: "#e0af68",
    down: "#f7768e"
  },

  "Rosé Pine": {
    bg: "#191724",
    surface: "#1f1d2e",
    surfaceHover: "#26233a",
    text: "#e0def4",
    textMuted: "#6e6a86",
    textMutedStrong: "#908caa",
    accent: "#c4a7e7",
    accentAlt: "#ebbcba",
    ok: "#31748f",
    warn: "#f6c177",
    down: "#eb6f92"
  },

  "One Dark": {
    bg: "#282c34",
    surface: "#2c313a",
    surfaceHover: "#3e4452",
    text: "#abb2bf",
    textMuted: "#636d83",
    textMutedStrong: "#828997",
    accent: "#61afef",
    accentAlt: "#c678dd",
    ok: "#98c379",
    warn: "#e5c07b",
    down: "#e06c75"
  },

  "Monokai Pro": {
    bg: "#2d2a2e",
    surface: "#403e41",
    surfaceHover: "#5b595c",
    text: "#fcfcfa",
    textMuted: "#939293",
    textMutedStrong: "#c1c0c0",
    accent: "#ffd866",
    accentAlt: "#78dce8",
    ok: "#a9dc76",
    warn: "#ffd866",
    down: "#ff6188"
  },

  "Kanagawa": {
    bg: "#1f1f28",
    surface: "#2a2a37",
    surfaceHover: "#363646",
    text: "#dcd7ba",
    textMuted: "#727169",
    textMutedStrong: "#c8c093",
    accent: "#7e9cd8",
    accentAlt: "#957fb8",
    ok: "#76946a",
    warn: "#e6c384",
    down: "#c34043"
  },

  "Everforest": {
    bg: "#2d353b",
    surface: "#343f44",
    surfaceHover: "#3d484d",
    text: "#d3c6aa",
    textMuted: "#859289",
    textMutedStrong: "#9da9a0",
    accent: "#a7c080",
    accentAlt: "#7fbbb3",
    ok: "#a7c080",
    warn: "#dbbc7f",
    down: "#e67e80"
  }
};

Hub.applyColorScheme = function (scheme) {
  var merged = Object.assign({}, Hub.DEFAULT_COLORS, scheme || {});
  var root = document.documentElement;
  Object.keys(Hub.CSS_VAR_MAP).forEach(function (key) {
    root.style.setProperty(Hub.CSS_VAR_MAP[key], merged[key]);
  });

  /* Update body background gradient to match bg color */
  var bg = merged.bg;
  document.body.style.background = "linear-gradient(180deg, " + bg + " 0%, " + bg + " 100%)";
};

Hub.applyStyleOverrides = function (styles) {
  var merged = Object.assign({}, Hub.DEFAULT_STYLE, styles || {});
  var root = document.documentElement;
  root.style.setProperty("--radius-lg", merged.borderRadius + "px");
  root.style.setProperty("--radius-md", merged.searchBorderRadius + "px");
  root.style.setProperty("--radius-sm", Math.max(2, Math.floor(parseInt(merged.searchBorderRadius) / 2)) + "px");
  root.style.setProperty("--border-width", merged.borderWidth + "px");
};

Hub.applyCustomCss = function (css) {
  var id = "hub-custom-css";
  var existing = document.getElementById(id);
  if (existing) existing.remove();
  if (!css || !css.trim()) return;
  var style = document.createElement("style");
  style.id = id;
  style.textContent = css;
  document.head.appendChild(style);
};

Hub.loadCustomCss = async function (store) {
  var css = await store.get(Hub.STORAGE_CUSTOM_CSS_KEY);
  if (css) Hub.applyCustomCss(css);
  return css || "";
};

Hub.loadStyleOverrides = async function (store) {
  var styles = await store.get(Hub.STORAGE_STYLE_KEY);
  if (styles) Hub.applyStyleOverrides(styles);
  return styles || {};
};

/* ── Background image ── */

Hub.DEFAULT_BG = { src: "", opacity: 0.3, surfaceOpacity: 1, fit: "cover", position: "center center" };

Hub.cssUrl = function (src) {
  return 'url("' + src.replace(/"/g, '\\"') + '")';
};

Hub.applyBgImage = function (settings) {
  var el = document.getElementById("hub-bg-image");
  if (!settings || !settings.src) {
    if (el) el.remove();
    document.documentElement.style.setProperty("--surface-opacity", 1);
    return;
  }
  var d = Hub.DEFAULT_BG;
  if (!el) {
    el = document.createElement("div");
    el.id = "hub-bg-image";
    document.body.insertBefore(el, document.body.firstChild);
  }
  el.style.backgroundImage = Hub.cssUrl(settings.src);
  el.style.opacity = settings.opacity != null ? settings.opacity : d.opacity;
  el.style.backgroundSize = settings.fit || d.fit;
  el.style.backgroundPosition = settings.position || d.position;
  var surfOp = settings.surfaceOpacity != null ? settings.surfaceOpacity : d.surfaceOpacity;
  document.documentElement.style.setProperty("--surface-opacity", surfOp);
};

Hub.loadBgImage = async function (store) {
  var settings = await store.get(Hub.STORAGE_BG_IMAGE_KEY);
  Hub.applyBgImage(settings);
  return settings || {};
};

Hub.saveBgImage = async function (store, settings) {
  if (settings && settings.src) {
    await store.set(Hub.STORAGE_BG_IMAGE_KEY, settings);
  } else {
    await store.set(Hub.STORAGE_BG_IMAGE_KEY, null);
  }
};

Hub.loadTheme = async function (store, profileName, profileConfig) {
  var globalOverride = await store.get(Hub.STORAGE_THEME_KEY) || {};
  var profileColors = (profileConfig && profileConfig.colorScheme) || {};
  var runtimeColors = (globalOverride[profileName]) || {};
  var merged = Object.assign({}, Hub.DEFAULT_COLORS, globalOverride._global || {}, profileColors, runtimeColors);
  Hub.applyColorScheme(merged);
  return merged;
};

Hub.saveThemeOverride = async function (store, profileName, colors, isGlobal) {
  var existing = await store.get(Hub.STORAGE_THEME_KEY) || {};
  if (isGlobal) {
    existing._global = Object.assign({}, existing._global || {}, colors);
  } else {
    existing[profileName] = Object.assign({}, existing[profileName] || {}, colors);
  }
  await store.set(Hub.STORAGE_THEME_KEY, existing);
};
