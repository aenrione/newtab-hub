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
  hintBg: "#21324a",
  hintText: "#a7b4c8",
  hintBorder: "#3c5678",
  hintAccentBg: "#79aee8",
  hintAccentText: "#101828",
  hintAccentBorder: "#8bd3dd",
  border: "#293548",
  borderStrong: "#3d4f66",
  ok: "#4ade80",
  warn: "#fbbf24",
  down: "#f87171"
};

Hub.currentColorScheme = Object.assign({}, Hub.DEFAULT_COLORS);

Hub.DEFAULT_STYLE = {
  borderRadius: "10",
  borderWidth: "1",
  widgetBorderRadius: "10",
  searchBorderRadius: "6"
};

Hub.HINT_KEYS = ["hintBg", "hintText", "hintBorder", "hintAccentBg", "hintAccentText", "hintAccentBorder"];

Hub.hexToRgb = function (hex) {
  var value = String(hex || "").trim();
  if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) return null;
  if (value.length === 4) {
    value = "#" + value[1] + value[1] + value[2] + value[2] + value[3] + value[3];
  }
  return {
    r: parseInt(value.slice(1, 3), 16),
    g: parseInt(value.slice(3, 5), 16),
    b: parseInt(value.slice(5, 7), 16)
  };
};

Hub.rgbToHex = function (rgb) {
  function toHex(channel) {
    return Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, "0");
  }
  return "#" + toHex(rgb.r) + toHex(rgb.g) + toHex(rgb.b);
};

Hub.mixHex = function (baseHex, mixHex, weight) {
  var base = Hub.hexToRgb(baseHex);
  var mix = Hub.hexToRgb(mixHex);
  if (!base && !mix) return Hub.DEFAULT_COLORS.surface;
  if (!base) return mixHex;
  if (!mix) return baseHex;
  var ratio = Math.max(0, Math.min(1, weight));
  return Hub.rgbToHex({
    r: base.r + (mix.r - base.r) * ratio,
    g: base.g + (mix.g - base.g) * ratio,
    b: base.b + (mix.b - base.b) * ratio
  });
};

Hub.relativeLuminance = function (hex) {
  var rgb = Hub.hexToRgb(hex);
  if (!rgb) return 0;
  function channel(value) {
    var normalized = value / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  }
  return 0.2126 * channel(rgb.r) + 0.7152 * channel(rgb.g) + 0.0722 * channel(rgb.b);
};

Hub.contrastRatio = function (a, b) {
  var lumA = Hub.relativeLuminance(a);
  var lumB = Hub.relativeLuminance(b);
  var lighter = Math.max(lumA, lumB);
  var darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
};

Hub.pickReadableText = function (bg, optionA, optionB) {
  return Hub.contrastRatio(bg, optionA) >= Hub.contrastRatio(bg, optionB) ? optionA : optionB;
};

Hub.hasLegacyHintColors = function (colors) {
  var hasBaseChange = Object.keys(Hub.DEFAULT_COLORS).some(function (key) {
    return Hub.HINT_KEYS.indexOf(key) === -1 && colors[key] != null && colors[key] !== Hub.DEFAULT_COLORS[key];
  });
  if (!hasBaseChange) return false;
  return Hub.HINT_KEYS.every(function (key) {
    return colors[key] == null || colors[key] === Hub.DEFAULT_COLORS[key];
  });
};

Hub.deriveHintColors = function (colors) {
  var accent = colors.accent || Hub.DEFAULT_COLORS.accent;
  var accentAlt = colors.accentAlt || accent;
  var hintAccentBg = Hub.mixHex(accentAlt, colors.surface || colors.bg, 0.12);
  return {
    hintBg: Hub.mixHex(colors.bg, colors.surfaceHover || colors.surface, 0.7),
    hintText: Hub.mixHex(colors.textMuted || colors.text, colors.textMutedStrong || colors.text, 0.6),
    hintBorder: Hub.mixHex(colors.surfaceHover || colors.surface, accent, 0.28),
    hintAccentBg: hintAccentBg,
    hintAccentText: Hub.pickReadableText(hintAccentBg, colors.bg || "#101828", colors.text || "#f8fafc"),
    hintAccentBorder: Hub.mixHex(accentAlt, accent, 0.4)
  };
};

Hub.resolveColorScheme = function (scheme) {
  var merged = Object.assign({}, Hub.DEFAULT_COLORS, scheme || {});
  if (Hub.hasLegacyHintColors(merged)) {
    Object.assign(merged, Hub.deriveHintColors(merged));
  }
  return merged;
};

Hub.createThemePreset = function (colors) {
  return Hub.resolveColorScheme(colors);
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
  hintBg: "--hint-bg",
  hintText: "--hint-text",
  hintBorder: "--hint-border",
  hintAccentBg: "--hint-accent-bg",
  hintAccentText: "--hint-accent-text",
  hintAccentBorder: "--hint-accent-border",
  border: "--border",
  borderStrong: "--border-strong",
  ok: "--ok",
  warn: "--warn",
  down: "--down"
};

Hub.getThemeColorValue = function (key) {
  var currentScheme = Hub.currentColorScheme || {};
  var currentValue = typeof currentScheme[key] === "string" ? currentScheme[key].trim() : "";
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(currentValue)) return currentValue;

  var cssVar = Hub.CSS_VAR_MAP[key];
  if (cssVar && typeof getComputedStyle === "function" && typeof document !== "undefined" && document.documentElement) {
    var computedValue = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(computedValue)) return computedValue;
  }

  return Hub.DEFAULT_COLORS[key];
};

Hub.getPreferredThemeScope = function (themeState, profileName) {
  var state = themeState || {};
  var profileOverride = state[profileName];
  if (profileOverride && Object.keys(profileOverride).length) return "profile";
  return "global";
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
  "Default": Hub.resolveColorScheme(Hub.DEFAULT_COLORS),

  "Gruvbox Dark": Hub.createThemePreset({
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
  }),

  "Gruvbox Light": Hub.createThemePreset({
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
  }),

  "Catppuccin Mocha": Hub.createThemePreset({
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
  }),

  "Catppuccin Latte": Hub.createThemePreset({
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
  }),

  "Catppuccin Frappe": Hub.createThemePreset({
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
  }),

  "Nord": Hub.createThemePreset({
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
  }),

  "Solarized Dark": Hub.createThemePreset({
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
  }),

  "Solarized Light": Hub.createThemePreset({
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
  }),

  "Dracula": Hub.createThemePreset({
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
  }),

  "Tokyo Night": Hub.createThemePreset({
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
  }),

  "Rosé Pine": Hub.createThemePreset({
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
  }),

  "One Dark": Hub.createThemePreset({
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
  }),

  "Monokai Pro": Hub.createThemePreset({
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
  }),

  "Kanagawa": Hub.createThemePreset({
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
  }),

  "Everforest": Hub.createThemePreset({
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
  })
};

Hub.applyColorScheme = function (scheme) {
  var merged = Hub.resolveColorScheme(scheme);
  Hub.currentColorScheme = Object.assign({}, merged);
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

Hub.DEFAULT_BG = { src: "", type: "image", opacity: 0.3, surfaceOpacity: 1, fit: "cover", position: "center center", playbackRate: 1, quality: "auto" };

Hub.cssUrl = function (src) {
  return 'url("' + src.replace(/"/g, '\\"') + '")';
};

Hub.detectBgType = function (src, mimeType) {
  if (mimeType) {
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType === "image/gif") return "gif";
    return "image";
  }
  if (!src) return "image";
  var ext = src.split("?")[0].split("#")[0].split(".").pop().toLowerCase();
  /* Only mp4 and webm — .mov is NOT supported in Chromium */
  if (ext === "mp4" || ext === "webm") return "video";
  if (ext === "gif") return "gif";
  return "image";
};

Hub._bgVisibilityHandler = null;
Hub._bgMotionMql = null;
Hub._bgObjectUrl = null;
Hub._bgCachedObjectUrl = null;
Hub._bgManualPause = false;
Hub._bgErrorCallback = null;
Hub._bgMotionChangeHandler = null;
Hub.BG_CACHE_NAME = "new-tab-bg-v1";

Hub.isRemoteBgSrc = function (src) {
  return /^https?:\/\//i.test(String(src || ""));
};

Hub.isCacheableBg = function (settings) {
  if (!settings || !settings.src) return false;
  var type = settings.type || Hub.detectBgType(settings.src, settings.mimeType);
  return Hub.isRemoteBgSrc(settings.src) && type !== "video";
};

Hub.clearCachedBgObjectUrl = function () {
  if (Hub._bgCachedObjectUrl) {
    URL.revokeObjectURL(Hub._bgCachedObjectUrl);
    Hub._bgCachedObjectUrl = null;
  }
};

Hub.getCachedBgObjectUrl = async function (src) {
  if (!Hub.isRemoteBgSrc(src) || typeof caches === "undefined") return null;
  try {
    var cache = await caches.open(Hub.BG_CACHE_NAME);
    var res = await cache.match(src);
    if (!res) return null;
    var blob = await res.blob();
    if (!blob || !blob.size) return null;
    Hub.clearCachedBgObjectUrl();
    Hub._bgCachedObjectUrl = URL.createObjectURL(blob);
    return Hub._bgCachedObjectUrl;
  } catch (_) {
    return null;
  }
};

Hub.cacheBgAsset = async function (settings) {
  if (!Hub.isCacheableBg(settings) || typeof caches === "undefined") return false;
  try {
    var cache = await caches.open(Hub.BG_CACHE_NAME);
    var existing = await cache.match(settings.src);
    if (existing) return true;
    var res = await fetch(settings.src, { cache: "force-cache" });
    if (!res.ok) return false;
    await cache.put(settings.src, res.clone());
    return true;
  } catch (_) {
    return false;
  }
};

Hub.evictCachedBgAsset = async function (src) {
  if (!Hub.isRemoteBgSrc(src) || typeof caches === "undefined") return false;
  try {
    var cache = await caches.open(Hub.BG_CACHE_NAME);
    return await cache.delete(src);
  } catch (_) {
    return false;
  }
};

Hub._teardownBg = function () {
  var imgEl = document.getElementById("hub-bg-image");
  var vidEl = document.getElementById("hub-bg-video");
  if (imgEl) imgEl.remove();
  if (vidEl) {
    vidEl.pause();
    vidEl.removeAttribute("src");
    vidEl.load();
    vidEl.remove();
  }
  if (Hub._bgVisibilityHandler) {
    document.removeEventListener("visibilitychange", Hub._bgVisibilityHandler);
    Hub._bgVisibilityHandler = null;
  }
  if (Hub._bgMotionMql && Hub._bgMotionChangeHandler) {
    Hub._bgMotionMql.removeEventListener("change", Hub._bgMotionChangeHandler);
    Hub._bgMotionChangeHandler = null;
  }
  Hub.clearCachedBgObjectUrl();
  Hub._bgManualPause = false;
  Hub._bgErrorCallback = null;
};

Hub.applyBgImage = function (settings) {
  var d = Hub.DEFAULT_BG;

  if (!settings || !settings.src) {
    Hub._teardownBg();
    document.documentElement.style.setProperty("--surface-opacity", 1);
    return;
  }

  var type = settings.type || Hub.detectBgType(settings.src);
  var opacity = settings.opacity != null ? settings.opacity : d.opacity;
  var fit = settings.fit || d.fit;
  var position = settings.position || d.position;
  var surfOp = settings.surfaceOpacity != null ? settings.surfaceOpacity : d.surfaceOpacity;
  document.documentElement.style.setProperty("--surface-opacity", surfOp);

  if (type === "video") {
    /* Remove image element if switching from image to video */
    var imgEl = document.getElementById("hub-bg-image");
    if (imgEl) imgEl.remove();

    var video = document.getElementById("hub-bg-video");
    var isNewVideo = !video || video.src !== settings.src;

    if (isNewVideo) {
      /* Full teardown and create new video */
      Hub._teardownBg();
      video = document.createElement("video");
      video.id = "hub-bg-video";
      video.autoplay = true;
      video.muted = true;
      video.loop = true;
      video.playsInline = true;
      video.preload = "auto";
      video.src = settings.src;

      /* Seamless looping: seek back before the end to avoid the native loop gap */
      video.addEventListener("timeupdate", function () {
        if (video.duration && video.currentTime > video.duration - 0.3) {
          video.currentTime = 0;
        }
      });

      /* Error handling — notify UI via callback */
      video.addEventListener("error", function () {
        video.remove();
        document.documentElement.style.setProperty("--surface-opacity", 1);
        if (Hub._bgErrorCallback) Hub._bgErrorCallback("Video failed to load");
      });

      document.body.insertBefore(video, document.body.firstChild);

      /* Visibility optimization */
      Hub._bgVisibilityHandler = function () {
        if (Hub._bgManualPause) return;
        if (document.hidden) video.pause();
        else video.play().catch(function () {});
      };
      document.addEventListener("visibilitychange", Hub._bgVisibilityHandler);

      /* Reduced motion */
      if (!Hub._bgMotionMql) {
        Hub._bgMotionMql = window.matchMedia("(prefers-reduced-motion: reduce)");
      }
      Hub._bgMotionChangeHandler = function () {
        if (Hub._bgManualPause) return;
        if (Hub._bgMotionMql.matches) video.pause();
        else if (!document.hidden) video.play().catch(function () {});
      };
      Hub._bgMotionMql.addEventListener("change", Hub._bgMotionChangeHandler);
      video.addEventListener("loadeddata", function () {
        if (Hub._bgMotionMql.matches && !Hub._bgManualPause) video.pause();
      });
    }

    /* Update properties in-place (no restart) */
    video.style.objectFit = fit;
    video.style.objectPosition = position;
    video.style.opacity = opacity;
    video.playbackRate = settings.playbackRate || d.playbackRate;

    /* Quality scaling via dimensions */
    var q = settings.quality || d.quality;
    if (q === "low" || q === "medium") {
      var pct = q === "low" ? "50%" : "75%";
      video.style.width = pct;
      video.style.height = pct;
      video.style.inset = "auto";
      video.style.top = "50%";
      video.style.left = "50%";
      video.style.transform = "translate(-50%, -50%)";
    } else {
      video.style.width = "100%";
      video.style.height = "100%";
      video.style.inset = "0";
      video.style.top = "";
      video.style.left = "";
      video.style.transform = "";
    }
  } else {
    /* Image / GIF path — remove video if switching */
    var vidEl = document.getElementById("hub-bg-video");
    if (vidEl) Hub._teardownBg();

    var el = document.getElementById("hub-bg-image");
    if (!el) {
      el = document.createElement("div");
      el.id = "hub-bg-image";
      document.body.insertBefore(el, document.body.firstChild);
    }
    el.style.backgroundImage = Hub.cssUrl(settings.src);
    el.style.opacity = opacity;
    el.style.backgroundSize = fit;
    el.style.backgroundPosition = position;
  }
};

Hub.loadBgImage = async function (store, profileName) {
  var all = await store.get(Hub.STORAGE_BG_IMAGE_KEY);
  /* Migrate flat legacy format (had top-level src) — discard and write clean object */
  if (all && all.src !== undefined) {
    await store.set(Hub.STORAGE_BG_IMAGE_KEY, {});
    all = {};
  }
  var settings = (all && profileName && all[profileName]) || null;
  if (settings && settings.src) {
    settings.type = Hub.detectBgType(settings.src);
  }
  var settingsToApply = settings ? Object.assign({}, settings) : settings;
  if (Hub.isCacheableBg(settings)) {
    var cachedSrc = await Hub.getCachedBgObjectUrl(settings.src);
    if (cachedSrc) {
      settingsToApply.src = cachedSrc;
    } else {
      Hub.cacheBgAsset(settings);
    }
  }
  Hub.applyBgImage(settingsToApply);
  return settings || {};
};

Hub.saveBgImage = async function (store, profileName, settings) {
  var all = await store.get(Hub.STORAGE_BG_IMAGE_KEY) || {};
  /* Guard against stale flat format */
  if (all.src !== undefined) all = {};
  var previous = all[profileName];
  if (settings && settings.src) {
    all[profileName] = settings;
  } else {
    delete all[profileName];
  }
  await store.set(Hub.STORAGE_BG_IMAGE_KEY, all);
  if (previous && previous.src && (!settings || previous.src !== settings.src)) {
    Hub.evictCachedBgAsset(previous.src);
  }
  if (Hub.isCacheableBg(settings)) {
    Hub.cacheBgAsset(settings);
  }
};

Hub.loadTheme = async function (store, profileName, profileConfig) {
  var globalOverride = await store.get(Hub.STORAGE_THEME_KEY) || {};
  var profileColors = (profileConfig && profileConfig.colorScheme) || {};
  var runtimeColors = (globalOverride[profileName]) || {};
  var merged = Hub.resolveColorScheme(Object.assign({}, globalOverride._global || {}, profileColors, runtimeColors));
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
