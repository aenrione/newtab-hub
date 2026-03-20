/* ── Customize panel ── */

window.Hub = window.Hub || {};

Hub.customize = (function () {
  /* ── Theme sidebar ── */
  var themeSidebar = null;
  var themeOverlay = null;

  function ensureThemeSidebar() {
    if (themeSidebar) return themeSidebar;
    themeOverlay = document.createElement("div");
    themeOverlay.className = "theme-sidebar-overlay";
    document.body.appendChild(themeOverlay);
    themeSidebar = document.createElement("div");
    themeSidebar.className = "theme-sidebar";
    document.body.appendChild(themeSidebar);
    themeOverlay.addEventListener("click", closeThemeSidebar);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && themeSidebar && themeSidebar.classList.contains("is-open")) closeThemeSidebar();
    });
    return themeSidebar;
  }

  function closeThemeSidebar() {
    if (themeSidebar) themeSidebar.classList.remove("is-open");
    if (themeOverlay) themeOverlay.classList.remove("is-open");
  }

  function openThemeSidebar(store, profileName) {
    var sidebar = ensureThemeSidebar();
    sidebar.replaceChildren();

    /* Header */
    var header = document.createElement("div");
    header.className = "theme-sidebar-header";
    header.innerHTML = '<h2>Theme</h2><button class="theme-sidebar-close" type="button">&times;</button>';
    header.querySelector(".theme-sidebar-close").addEventListener("click", closeThemeSidebar);
    sidebar.appendChild(header);

    /* Preset dropdown */
    var presetSection = document.createElement("div");
    presetSection.className = "theme-presets";
    var presetRow = document.createElement("div");
    presetRow.className = "preset-row";
    presetRow.innerHTML =
      '<label class="customize-label">Preset</label>' +
      '<div class="preset-dropdown-wrap">' +
        '<input type="text" class="preset-search" placeholder="Search themes..." />' +
        '<div class="preset-dropdown"></div>' +
      '</div>';

    var searchInput = presetRow.querySelector(".preset-search");
    var dropdown = presetRow.querySelector(".preset-dropdown");

    function renderPresetOptions(filter) {
      dropdown.replaceChildren();
      var filt = (filter || "").toLowerCase();
      var matches = Object.keys(Hub.THEME_PRESETS).filter(function (n) { return !filt || n.toLowerCase().includes(filt); });
      matches.forEach(function (name) {
        var preset = Hub.THEME_PRESETS[name];
        var opt = document.createElement("button");
        opt.type = "button";
        opt.className = "preset-option";
        opt.innerHTML =
          '<span class="preset-swatches">' +
            '<span class="preset-swatch" style="background:' + preset.bg + '"></span>' +
            '<span class="preset-swatch" style="background:' + preset.surface + '"></span>' +
            '<span class="preset-swatch" style="background:' + preset.accent + '"></span>' +
            '<span class="preset-swatch" style="background:' + preset.text + '"></span>' +
          '</span><span class="preset-name">' + Hub.escapeHtml(name) + '</span>';
        opt.addEventListener("click", function () {
          Hub.applyColorScheme(preset);
          searchInput.value = name;
          dropdown.classList.remove("is-open");
          sidebar.querySelectorAll("[data-color-key]").forEach(function (inp) {
            var val = preset[inp.dataset.colorKey] || Hub.DEFAULT_COLORS[inp.dataset.colorKey];
            if (val && val.startsWith("#")) inp.value = val;
          });
        });
        dropdown.appendChild(opt);
      });
      if (!matches.length) dropdown.innerHTML = '<div class="preset-empty">No matching themes</div>';
    }

    var presetFocusIdx = -1;

    function focusPresetOption(idx) {
      var opts = dropdown.querySelectorAll(".preset-option");
      opts.forEach(function (o) { o.classList.remove("preset-option-focus"); });
      if (idx < 0 || idx >= opts.length) { presetFocusIdx = -1; return; }
      presetFocusIdx = idx;
      opts[idx].classList.add("preset-option-focus");
      opts[idx].scrollIntoView({ block: "nearest" });
    }

    searchInput.addEventListener("focus", function () { renderPresetOptions(searchInput.value); dropdown.classList.add("is-open"); presetFocusIdx = -1; });
    searchInput.addEventListener("input", function () { renderPresetOptions(searchInput.value); dropdown.classList.add("is-open"); presetFocusIdx = -1; });
    searchInput.addEventListener("keydown", function (e) {
      var opts = dropdown.querySelectorAll(".preset-option");
      if (e.key === "ArrowDown") {
        e.preventDefault();
        focusPresetOption(presetFocusIdx < opts.length - 1 ? presetFocusIdx + 1 : 0);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        focusPresetOption(presetFocusIdx > 0 ? presetFocusIdx - 1 : opts.length - 1);
      } else if (e.key === "Enter" && presetFocusIdx >= 0 && presetFocusIdx < opts.length) {
        e.preventDefault();
        opts[presetFocusIdx].click();
      }
    });
    document.addEventListener("click", function (e) { if (!presetRow.contains(e.target)) dropdown.classList.remove("is-open"); });
    presetSection.appendChild(presetRow);
    sidebar.appendChild(presetSection);

    /* Scope */
    var scopeWrap = document.createElement("div");
    scopeWrap.className = "theme-scope";
    scopeWrap.innerHTML =
      '<label class="theme-scope-label"><input type="radio" name="theme-scope" value="global" checked /> Global</label>' +
      '<label class="theme-scope-label"><input type="radio" name="theme-scope" value="profile" /> This profile only</label>';
    sidebar.appendChild(scopeWrap);

    /* Color pickers */
    var colorKeys = Object.keys(Hub.DEFAULT_COLORS).filter(function (k) { return Hub.DEFAULT_COLORS[k].startsWith("#"); });
    var grid = document.createElement("div");
    grid.className = "theme-grid";
    colorKeys.forEach(function (key) {
      var label = document.createElement("label");
      label.className = "theme-color-label";
      label.innerHTML = '<span>' + Hub.escapeHtml(key) + '</span><input type="color" data-color-key="' + key + '" value="' + Hub.escapeHtml(Hub.DEFAULT_COLORS[key]) + '" />';
      var input = label.querySelector("input");
      var cssVar = Hub.CSS_VAR_MAP[key];
      if (cssVar) {
        var current = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
        if (current && current.startsWith("#")) input.value = current;
      }
      input.addEventListener("input", function () { if (cssVar) document.documentElement.style.setProperty(cssVar, input.value); });
      grid.appendChild(label);
    });
    sidebar.appendChild(grid);

    /* Border / radius controls */
    var styleLabel = document.createElement("p");
    styleLabel.className = "customize-label";
    styleLabel.textContent = "Borders & radius";
    sidebar.appendChild(styleLabel);

    var styleGrid = document.createElement("div");
    styleGrid.className = "style-controls";
    var currentStyles = Object.assign({}, Hub.DEFAULT_STYLE);
    store.get(Hub.STORAGE_STYLE_KEY).then(function (saved) {
      if (saved) Object.assign(currentStyles, saved);
      styleGrid.querySelectorAll("[data-style-key]").forEach(function (inp) {
        if (currentStyles[inp.dataset.styleKey] != null) inp.value = currentStyles[inp.dataset.styleKey];
      });
    });

    [{ key: "borderRadius", label: "Widget radius", max: 24 },
     { key: "searchBorderRadius", label: "Search radius", max: 24 },
     { key: "borderWidth", label: "Border width", max: 4 }
    ].forEach(function (f) {
      var row = document.createElement("label");
      row.className = "style-control-row";
      row.innerHTML = '<span>' + f.label + '</span><input type="range" data-style-key="' + f.key + '" min="0" max="' + f.max + '" value="' + (currentStyles[f.key] || Hub.DEFAULT_STYLE[f.key]) + '" /><span class="style-value" data-style-display="' + f.key + '">' + (currentStyles[f.key] || Hub.DEFAULT_STYLE[f.key]) + 'px</span>';
      row.querySelector("input").addEventListener("input", function (e) {
        currentStyles[e.target.dataset.styleKey] = e.target.value;
        row.querySelector("[data-style-display]").textContent = e.target.value + "px";
        Hub.applyStyleOverrides(currentStyles);
      });
      styleGrid.appendChild(row);
    });
    sidebar.appendChild(styleGrid);

    /* Background image */
    var bgLabel = document.createElement("p");
    bgLabel.className = "customize-label";
    bgLabel.textContent = "Background";
    sidebar.appendChild(bgLabel);

    var bgWrap = document.createElement("div");
    bgWrap.className = "bg-image-controls";

    var currentBg = Object.assign({}, Hub.DEFAULT_BG);
    store.get(Hub.STORAGE_BG_IMAGE_KEY).then(function (saved) {
      if (saved) {
        Object.assign(currentBg, saved);
        bgUrlInput.value = currentBg.src || "";
        bgOpacityRange.value = currentBg.opacity;
        bgOpacityDisplay.textContent = Math.round(currentBg.opacity * 100) + "%";
        bgFitSelect.value = currentBg.fit;
        bgSurfaceRange.value = currentBg.surfaceOpacity;
        bgSurfaceDisplay.textContent = Math.round(currentBg.surfaceOpacity * 100) + "%";
        currentBg.type = Hub.detectBgType(currentBg.src);
        if (currentBg.src) updatePreview();
        updateVideoControls();
      }
    });

    /* URL input */
    var bgUrlRow = document.createElement("label");
    bgUrlRow.className = "editor-field";
    bgUrlRow.innerHTML = '<span>Image URL</span>';
    var bgUrlInput = document.createElement("input");
    bgUrlInput.type = "text";
    bgUrlInput.placeholder = "https://example.com/image.jpg or video.mp4";
    var bgUrlTimer = 0;
    bgUrlInput.addEventListener("input", function () {
      currentBg.src = bgUrlInput.value.trim();
      currentBg.type = Hub.detectBgType(currentBg.src);
      updateVideoControls();
      bgWarn.style.display = "none";
      if (currentBg.type === "video") {
        /* Don't apply video on every keystroke — wait for blur/Enter */
        bgPreview.style.backgroundImage = "";
        clearTimeout(bgUrlTimer);
      } else {
        bgPreview.style.backgroundImage = currentBg.src ? Hub.cssUrl(currentBg.src) : "";
        clearTimeout(bgUrlTimer);
        bgUrlTimer = setTimeout(function () { Hub.applyBgImage(currentBg); }, 300);
      }
    });
    bgUrlInput.addEventListener("blur", function () {
      if (currentBg.type === "video" && currentBg.src) {
        Hub.applyBgImage(currentBg);
        updatePreview();
      }
    });
    bgUrlInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && currentBg.type === "video" && currentBg.src) {
        Hub.applyBgImage(currentBg);
        updatePreview();
      }
    });
    bgUrlRow.appendChild(bgUrlInput);
    bgWrap.appendChild(bgUrlRow);

    /* File upload */
    var bgUploadRow = document.createElement("div");
    bgUploadRow.className = "bg-upload-row";
    var bgUploadBtn = document.createElement("button");
    bgUploadBtn.type = "button";
    bgUploadBtn.className = "toolbar-button";
    bgUploadBtn.textContent = "Upload file";
    var bgFileInput = document.createElement("input");
    bgFileInput.type = "file";
    bgFileInput.accept = "image/*,video/mp4,video/webm";
    bgFileInput.style.display = "none";
    bgUploadBtn.addEventListener("click", function () { bgFileInput.click(); });
    bgFileInput.addEventListener("change", function () {
      var file = bgFileInput.files[0];
      if (!file) return;
      currentBg.type = Hub.detectBgType(null, file.type);
      currentBg.mimeType = file.type;
      updateVideoControls();
      bgWarn.style.display = "none";

      /* Revoke previous object URL if any */
      if (Hub._bgObjectUrl) {
        URL.revokeObjectURL(Hub._bgObjectUrl);
        Hub._bgObjectUrl = null;
      }

      if (file.size > 5 * 1024 * 1024 && currentBg.type === "video") {
        bgWarn.textContent = "Video too large to persist — it will play now but won't survive a restart. Use a URL instead.";
        bgWarn.style.display = "";
      } else if (file.size > 10 * 1024 * 1024) {
        bgWarn.textContent = "Large file — consider using a URL for better performance";
        bgWarn.style.display = "";
      }

      if (currentBg.type === "video") {
        /* Use object URL for video (data URIs too large for storage) */
        Hub._bgObjectUrl = URL.createObjectURL(file);
        currentBg.src = Hub._bgObjectUrl;
        currentBg._isObjectUrl = true;
        bgUrlInput.value = "(uploaded video)";
        Hub.applyBgImage(currentBg);
        updatePreview();
      } else {
        var reader = new FileReader();
        reader.onload = function (ev) {
          currentBg.src = ev.target.result;
          currentBg._isObjectUrl = false;
          bgUrlInput.value = "(uploaded file)";
          Hub.applyBgImage(currentBg);
          bgPreview.style.backgroundImage = Hub.cssUrl(currentBg.src);
        };
        reader.readAsDataURL(file);
      }
    });
    bgUploadRow.appendChild(bgUploadBtn);
    bgUploadRow.appendChild(bgFileInput);

    var bgClearBtn = document.createElement("button");
    bgClearBtn.type = "button";
    bgClearBtn.className = "toolbar-button toolbar-button-ghost";
    bgClearBtn.textContent = "Clear";
    bgClearBtn.addEventListener("click", function () {
      currentBg = Object.assign({}, Hub.DEFAULT_BG);
      bgUrlInput.value = "";
      Hub.applyBgImage(null);
      bgPreview.style.backgroundImage = "";
      var pvVid = bgPreview.querySelector("video");
      if (pvVid) pvVid.remove();
      bgWarn.style.display = "none";
      if (Hub._bgObjectUrl) {
        URL.revokeObjectURL(Hub._bgObjectUrl);
        Hub._bgObjectUrl = null;
      }
      updateVideoControls();
    });
    bgUploadRow.appendChild(bgClearBtn);
    bgWrap.appendChild(bgUploadRow);

    var bgWarn = document.createElement("p");
    bgWarn.className = "bg-warn";
    bgWarn.style.display = "none";
    bgWrap.appendChild(bgWarn);

    /* Preview */
    function updatePreview() {
      bgPreview.style.backgroundImage = "";
      var existingVid = bgPreview.querySelector("video");
      if (existingVid) existingVid.remove();

      if (!currentBg.src) return;

      if ((currentBg.type || Hub.detectBgType(currentBg.src)) === "video") {
        var pv = document.createElement("video");
        pv.autoplay = true;
        pv.muted = true;
        pv.loop = true;
        pv.playsInline = true;
        pv.src = currentBg.src;
        pv.style.cssText = "width:100%;height:100%;object-fit:cover;";
        bgPreview.appendChild(pv);
      } else {
        bgPreview.style.backgroundImage = Hub.cssUrl(currentBg.src);
      }
    }

    var bgPreview = document.createElement("div");
    bgPreview.className = "bg-image-preview";
    bgWrap.appendChild(bgPreview);

    /* Opacity slider */
    var bgOpacityRow = document.createElement("label");
    bgOpacityRow.className = "style-control-row";
    bgOpacityRow.innerHTML = '<span>Opacity</span>';
    var bgOpacityRange = document.createElement("input");
    bgOpacityRange.type = "range";
    bgOpacityRange.min = "0";
    bgOpacityRange.max = "1";
    bgOpacityRange.step = "0.05";
    bgOpacityRange.value = "0.3";
    var bgOpacityDisplay = document.createElement("span");
    bgOpacityDisplay.className = "style-value";
    bgOpacityDisplay.textContent = "30%";
    bgOpacityRange.addEventListener("input", function () {
      currentBg.opacity = parseFloat(bgOpacityRange.value);
      bgOpacityDisplay.textContent = Math.round(currentBg.opacity * 100) + "%";
      Hub.applyBgImage(currentBg);
    });
    bgOpacityRow.appendChild(bgOpacityRange);
    bgOpacityRow.appendChild(bgOpacityDisplay);
    bgWrap.appendChild(bgOpacityRow);

    /* Surface opacity slider */
    var bgSurfaceRow = document.createElement("label");
    bgSurfaceRow.className = "style-control-row";
    bgSurfaceRow.innerHTML = '<span>Surface opacity</span>';
    var bgSurfaceRange = document.createElement("input");
    bgSurfaceRange.type = "range";
    bgSurfaceRange.min = "0";
    bgSurfaceRange.max = "1";
    bgSurfaceRange.step = "0.05";
    bgSurfaceRange.value = "1";
    var bgSurfaceDisplay = document.createElement("span");
    bgSurfaceDisplay.className = "style-value";
    bgSurfaceDisplay.textContent = "100%";
    bgSurfaceRange.addEventListener("input", function () {
      currentBg.surfaceOpacity = parseFloat(bgSurfaceRange.value);
      bgSurfaceDisplay.textContent = Math.round(currentBg.surfaceOpacity * 100) + "%";
      Hub.applyBgImage(currentBg);
    });
    bgSurfaceRow.appendChild(bgSurfaceRange);
    bgSurfaceRow.appendChild(bgSurfaceDisplay);
    bgWrap.appendChild(bgSurfaceRow);

    /* Fit mode */
    var bgFitRow = document.createElement("label");
    bgFitRow.className = "style-control-row";
    bgFitRow.innerHTML = '<span>Fit</span>';
    var bgFitSelect = document.createElement("select");
    bgFitSelect.innerHTML = '<option value="cover">Cover</option><option value="contain">Contain</option><option value="auto">Original</option>';
    bgFitSelect.addEventListener("change", function () {
      currentBg.fit = bgFitSelect.value;
      Hub.applyBgImage(currentBg);
    });
    bgFitRow.appendChild(bgFitSelect);
    bgWrap.appendChild(bgFitRow);

    /* ── Video-only controls ── */
    var videoControlsWrap = document.createElement("div");
    videoControlsWrap.className = "bg-video-controls";
    videoControlsWrap.style.display = "none";

    /* Speed slider */
    var bgSpeedRow = document.createElement("label");
    bgSpeedRow.className = "style-control-row";
    bgSpeedRow.innerHTML = '<span>Speed</span>';
    var bgSpeedRange = document.createElement("input");
    bgSpeedRange.type = "range";
    bgSpeedRange.min = "0.25";
    bgSpeedRange.max = "2";
    bgSpeedRange.step = "0.25";
    bgSpeedRange.value = "1";
    var bgSpeedDisplay = document.createElement("span");
    bgSpeedDisplay.className = "style-value";
    bgSpeedDisplay.textContent = "1x";
    bgSpeedRange.addEventListener("input", function () {
      currentBg.playbackRate = parseFloat(bgSpeedRange.value);
      bgSpeedDisplay.textContent = currentBg.playbackRate + "x";
      Hub.applyBgImage(currentBg);
    });
    bgSpeedRow.appendChild(bgSpeedRange);
    bgSpeedRow.appendChild(bgSpeedDisplay);
    videoControlsWrap.appendChild(bgSpeedRow);

    /* Quality dropdown */
    var bgQualityRow = document.createElement("label");
    bgQualityRow.className = "style-control-row";
    bgQualityRow.innerHTML = '<span>Quality</span>';
    var bgQualitySelect = document.createElement("select");
    bgQualitySelect.innerHTML = '<option value="auto">Auto</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>';
    var bgQualityHint = document.createElement("span");
    bgQualityHint.className = "style-hint";
    bgQualityHint.textContent = "Lower = less battery";
    bgQualitySelect.addEventListener("change", function () {
      currentBg.quality = bgQualitySelect.value;
      Hub.applyBgImage(currentBg);
    });
    bgQualityRow.appendChild(bgQualitySelect);
    bgQualityRow.appendChild(bgQualityHint);
    videoControlsWrap.appendChild(bgQualityRow);

    /* Pause/Play toggle */
    var bgPauseBtn = document.createElement("button");
    bgPauseBtn.type = "button";
    bgPauseBtn.className = "toolbar-button";
    bgPauseBtn.textContent = "Pause";
    bgPauseBtn.addEventListener("click", function () {
      var vid = document.getElementById("hub-bg-video");
      if (!vid) return;
      if (vid.paused) {
        Hub._bgManualPause = false;
        vid.play().catch(function () {});
        bgPauseBtn.textContent = "Pause";
      } else {
        Hub._bgManualPause = true;
        vid.pause();
        bgPauseBtn.textContent = "Play";
      }
    });
    videoControlsWrap.appendChild(bgPauseBtn);

    bgWrap.appendChild(videoControlsWrap);

    /* Show/hide video controls based on type */
    function updateVideoControls() {
      var isVideo = currentBg.type === "video";
      videoControlsWrap.style.display = isVideo ? "" : "none";
      if (isVideo) {
        bgSpeedRange.value = currentBg.playbackRate || 1;
        bgSpeedDisplay.textContent = (currentBg.playbackRate || 1) + "x";
        bgQualitySelect.value = currentBg.quality || "auto";
        bgPauseBtn.textContent = "Pause";
      }
    }

    /* Register error callback so applyBgImage can surface errors to UI */
    Hub._bgErrorCallback = function (msg) {
      bgWarn.textContent = msg;
      bgWarn.style.display = "";
    };

    sidebar.appendChild(bgWrap);

    /* Custom CSS */
    var cssLabel = document.createElement("p");
    cssLabel.className = "customize-label";
    cssLabel.textContent = "Custom CSS";
    sidebar.appendChild(cssLabel);

    var cssTextarea = document.createElement("textarea");
    cssTextarea.className = "custom-css-input";
    cssTextarea.placeholder = "/* your custom CSS here */";
    cssTextarea.spellcheck = false;
    store.get(Hub.STORAGE_CUSTOM_CSS_KEY).then(function (saved) { if (saved) cssTextarea.value = saved; });
    cssTextarea.addEventListener("input", function () { Hub.applyCustomCss(cssTextarea.value); });
    sidebar.appendChild(cssTextarea);

    /* Actions */
    var actions = document.createElement("div");
    actions.className = "theme-actions";
    actions.innerHTML =
      '<button class="toolbar-button toolbar-button-ghost" data-theme-reset type="button">Reset all</button>' +
      '<button class="toolbar-button toolbar-button-ghost" data-theme-export type="button">Export</button>' +
      '<button class="toolbar-button toolbar-button-ghost" data-theme-import type="button">Import</button>' +
      '<button class="toolbar-button" data-theme-save type="button">Save</button>';

    actions.querySelector("[data-theme-save]").addEventListener("click", async function () {
      var colors = {};
      grid.querySelectorAll("[data-color-key]").forEach(function (inp) { colors[inp.dataset.colorKey] = inp.value; });
      var isGlobal = sidebar.querySelector('input[name="theme-scope"]:checked').value === "global";
      await Hub.saveThemeOverride(store, profileName, colors, isGlobal);
      await store.set(Hub.STORAGE_STYLE_KEY, currentStyles);
      await store.set(Hub.STORAGE_CUSTOM_CSS_KEY, cssTextarea.value || "");
      var bgToSave = Object.assign({}, currentBg);
      if (bgToSave._isObjectUrl) {
        bgWarn.textContent = "Video won't persist after restart — use a URL instead";
        bgWarn.style.display = "";
        bgToSave.src = "";
      }
      delete bgToSave._isObjectUrl;
      delete bgToSave.mimeType;
      await Hub.saveBgImage(store, bgToSave);
      closeThemeSidebar();
    });

    actions.querySelector("[data-theme-export]").addEventListener("click", async function () {
      try {
        var all = await store.getAll();
        var data = {};
        var SKIP = { "new-tab-cache": 1, "new-tab-v2-migrated": 1 };
        Object.keys(all).forEach(function (k) {
          if (!k.startsWith("new-tab-") || SKIP[k]) return;
          data[k] = all[k];
        });
        /* Sanitize video backgrounds — keep URLs, strip blobs/object URLs */
        var bg = data[Hub.STORAGE_BG_IMAGE_KEY];
        if (bg && bg.src) {
          var isVideo = (bg.type === "video") || Hub.detectBgType(bg.src) === "video";
          if (isVideo && !bg.src.startsWith("http")) {
            bg = Object.assign({}, bg, { src: null });
            data[Hub.STORAGE_BG_IMAGE_KEY] = bg;
          }
        }
        var envelope = { version: 1, exportedAt: new Date().toISOString(), data: data };
        var blob = new Blob([JSON.stringify(envelope, null, 2)], { type: "application/json" });
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        var ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
        a.href = url;
        a.download = "newtab-hub-backup-" + ts + ".json";
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        alert("Export failed: " + err.message);
      }
    });

    var importFileInput = document.createElement("input");
    importFileInput.type = "file";
    importFileInput.accept = ".json";
    importFileInput.style.display = "none";
    actions.appendChild(importFileInput);

    actions.querySelector("[data-theme-import]").addEventListener("click", function () {
      importFileInput.click();
    });

    importFileInput.addEventListener("change", function () {
      var file = importFileInput.files[0];
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) { alert("File too large (max 10 MB)"); return; }
      var reader = new FileReader();
      reader.onload = async function (ev) {
        try {
          var parsed = JSON.parse(ev.target.result);
        } catch (_) { alert("Invalid file format — could not parse JSON"); return; }
        if (!parsed || typeof parsed.data !== "object" || !parsed.version) {
          alert("Not a valid NewTab Hub backup file"); return;
        }
        if (parsed.version > 1) {
          alert("This backup was created by a newer version and cannot be imported"); return;
        }
        if (!confirm("This will replace all your current settings. Continue?")) return;
        try {
          var keys = Object.keys(parsed.data).filter(function (k) {
            return k.startsWith("new-tab-") && k !== "new-tab-cache";
          });
          for (var i = 0; i < keys.length; i++) {
            await store.set(keys[i], parsed.data[keys[i]]);
          }
          location.reload();
        } catch (err) { alert("Failed to import settings: " + err.message); }
      };
      reader.readAsText(file);
      importFileInput.value = "";
    });

    actions.querySelector("[data-theme-reset]").addEventListener("click", async function () {
      Hub.applyColorScheme(Hub.DEFAULT_COLORS);
      Hub.applyStyleOverrides(Hub.DEFAULT_STYLE);
      Hub.applyCustomCss("");
      await store.set(Hub.STORAGE_THEME_KEY, {});
      await store.set(Hub.STORAGE_STYLE_KEY, {});
      await store.set(Hub.STORAGE_CUSTOM_CSS_KEY, "");
      await Hub.saveBgImage(store, null);
      var pvVid = bgPreview.querySelector("video");
      if (pvVid) pvVid.remove();
      bgWarn.style.display = "none";
      if (Hub._bgObjectUrl) {
        URL.revokeObjectURL(Hub._bgObjectUrl);
        Hub._bgObjectUrl = null;
      }
      updateVideoControls();
      grid.querySelectorAll("[data-color-key]").forEach(function (inp) { inp.value = Hub.DEFAULT_COLORS[inp.dataset.colorKey] || "#000000"; });
      cssTextarea.value = "";
      currentBg = Object.assign({}, Hub.DEFAULT_BG);
      bgUrlInput.value = "";
      bgPreview.style.backgroundImage = "";
      bgOpacityRange.value = currentBg.opacity;
      bgOpacityDisplay.textContent = Math.round(currentBg.opacity * 100) + "%";
      bgSurfaceRange.value = currentBg.surfaceOpacity;
      bgSurfaceDisplay.textContent = Math.round(currentBg.surfaceOpacity * 100) + "%";
      bgFitSelect.value = currentBg.fit;
    });
    sidebar.appendChild(actions);

    sidebar.classList.add("is-open");
    themeOverlay.classList.add("is-open");

    /* Keyboard navigation for theme sidebar */
    function getSidebarFocusable() {
      return Array.from(sidebar.querySelectorAll(
        'input:not([type="file"]), select, textarea, button:not(.theme-sidebar-close)'
      )).filter(function (el) { return el.offsetParent !== null && el.style.display !== "none"; });
    }

    function onSidebarKey(e) {
      if (!sidebar.classList.contains("is-open")) return;

      if (e.key === "Escape") {
        /* If preset dropdown open, close it first */
        if (dropdown.classList.contains("is-open")) {
          e.preventDefault(); e.stopPropagation();
          dropdown.classList.remove("is-open");
          return;
        }
        return; /* Let the existing escape handler close the sidebar */
      }

      /* Tab trap within sidebar */
      if (e.key === "Tab") {
        var focusable = getSidebarFocusable();
        if (!focusable.length) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    sidebar.addEventListener("keydown", onSidebarKey);

    /* Auto-focus preset search on open */
    requestAnimationFrame(function () { searchInput.focus(); });
  }

  return {
    openThemeSidebar: openThemeSidebar,
    closeThemeSidebar: closeThemeSidebar
  };
})();
