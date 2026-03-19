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

    searchInput.addEventListener("focus", function () { renderPresetOptions(searchInput.value); dropdown.classList.add("is-open"); });
    searchInput.addEventListener("input", function () { renderPresetOptions(searchInput.value); dropdown.classList.add("is-open"); });
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
    bgLabel.textContent = "Background image";
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
        if (currentBg.src) bgPreview.style.backgroundImage = Hub.cssUrl(currentBg.src);
      }
    });

    /* URL input */
    var bgUrlRow = document.createElement("label");
    bgUrlRow.className = "editor-field";
    bgUrlRow.innerHTML = '<span>Image URL</span>';
    var bgUrlInput = document.createElement("input");
    bgUrlInput.type = "text";
    bgUrlInput.placeholder = "https://example.com/image.jpg";
    var bgUrlTimer = 0;
    bgUrlInput.addEventListener("input", function () {
      currentBg.src = bgUrlInput.value.trim();
      bgPreview.style.backgroundImage = currentBg.src ? Hub.cssUrl(currentBg.src) : "";
      clearTimeout(bgUrlTimer);
      bgUrlTimer = setTimeout(function () { Hub.applyBgImage(currentBg); }, 300);
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
    bgFileInput.accept = "image/*";
    bgFileInput.style.display = "none";
    bgUploadBtn.addEventListener("click", function () { bgFileInput.click(); });
    bgFileInput.addEventListener("change", function () {
      var file = bgFileInput.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function (ev) {
        currentBg.src = ev.target.result;
        bgUrlInput.value = "(uploaded file)";
        Hub.applyBgImage(currentBg);
        bgPreview.style.backgroundImage = Hub.cssUrl(currentBg.src);
      };
      reader.readAsDataURL(file);
    });
    bgUploadRow.appendChild(bgUploadBtn);
    bgUploadRow.appendChild(bgFileInput);

    var bgClearBtn = document.createElement("button");
    bgClearBtn.type = "button";
    bgClearBtn.className = "toolbar-button toolbar-button-ghost";
    bgClearBtn.textContent = "Clear";
    bgClearBtn.addEventListener("click", function () {
      currentBg.src = "";
      bgUrlInput.value = "";
      Hub.applyBgImage(null);
      bgPreview.style.backgroundImage = "";
    });
    bgUploadRow.appendChild(bgClearBtn);
    bgWrap.appendChild(bgUploadRow);

    /* Preview */
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
      '<button class="toolbar-button" data-theme-save type="button">Save</button>';

    actions.querySelector("[data-theme-save]").addEventListener("click", async function () {
      var colors = {};
      grid.querySelectorAll("[data-color-key]").forEach(function (inp) { colors[inp.dataset.colorKey] = inp.value; });
      var isGlobal = sidebar.querySelector('input[name="theme-scope"]:checked').value === "global";
      await Hub.saveThemeOverride(store, profileName, colors, isGlobal);
      await store.set(Hub.STORAGE_STYLE_KEY, currentStyles);
      await store.set(Hub.STORAGE_CUSTOM_CSS_KEY, cssTextarea.value || "");
      await Hub.saveBgImage(store, currentBg);
      closeThemeSidebar();
    });

    actions.querySelector("[data-theme-reset]").addEventListener("click", async function () {
      Hub.applyColorScheme(Hub.DEFAULT_COLORS);
      Hub.applyStyleOverrides(Hub.DEFAULT_STYLE);
      Hub.applyCustomCss("");
      await store.set(Hub.STORAGE_THEME_KEY, {});
      await store.set(Hub.STORAGE_STYLE_KEY, {});
      await store.set(Hub.STORAGE_CUSTOM_CSS_KEY, "");
      await Hub.saveBgImage(store, null);
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
  }

  return {
    openThemeSidebar: openThemeSidebar,
    closeThemeSidebar: closeThemeSidebar
  };
})();
