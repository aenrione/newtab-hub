/* -- Pomodoro widget plugin -- */

Hub.injectStyles("widget-pomodoro", `
  .widget-pomodoro {
    display: grid;
    gap: 14px;
    min-height: 100%;
  }
  .pomodoro-meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    font-size: 0.72rem;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.12em;
  }
  .pomodoro-phase {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-weight: 700;
    color: var(--text);
  }
  .pomodoro-phase-dot {
    width: 8px;
    height: 8px;
    border-radius: 999px;
    background: var(--accent-2);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent-2) 18%, transparent);
  }
  .pomodoro-phase.is-break .pomodoro-phase-dot {
    background: var(--ok);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--ok) 18%, transparent);
  }
  .pomodoro-phase.is-long-break .pomodoro-phase-dot {
    background: var(--accent);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--accent) 18%, transparent);
  }
  .pomodoro-timer-wrap {
    display: grid;
    place-items: center;
    padding: 18px 10px;
    border-radius: calc(var(--radius) + 4px);
    background:
      radial-gradient(circle at top, color-mix(in srgb, var(--accent-2) 14%, transparent), transparent 60%),
      linear-gradient(180deg, color-mix(in srgb, var(--surface) 88%, white 12%), var(--surface));
    border: 1px solid color-mix(in srgb, var(--border) 80%, var(--accent-2) 20%);
  }
  .pomodoro-timer {
    font-family: var(--font-display);
    font-size: clamp(2.3rem, 7vw, 3.4rem);
    line-height: 1;
    letter-spacing: -0.06em;
    font-variant-numeric: tabular-nums;
  }
  .pomodoro-note {
    margin-top: 8px;
    text-align: center;
    font-size: 0.84rem;
    color: var(--muted);
  }
  .pomodoro-controls {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }
  .pomodoro-button {
    border: 1px solid var(--border);
    background: var(--surface);
    color: var(--text);
    border-radius: var(--radius-sm);
    padding: 8px 10px;
    font-size: 0.8rem;
    cursor: pointer;
    transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
  }
  .pomodoro-button:hover {
    background: var(--surface-hover);
    border-color: var(--accent-2);
    transform: translateY(-1px);
  }
  .pomodoro-button.is-primary {
    background: var(--accent-2);
    color: var(--accent-contrast, #08111b);
    border-color: color-mix(in srgb, var(--accent-2) 72%, black 28%);
  }
  .pomodoro-button.is-primary:hover {
    background: color-mix(in srgb, var(--accent-2) 86%, white 14%);
  }
  .pomodoro-stats {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    font-size: 0.78rem;
    color: var(--muted);
  }
  .pomodoro-stat strong {
    display: block;
    margin-bottom: 2px;
    color: var(--text);
    font-size: 0.95rem;
  }
  .pomodoro-editor-section-title {
    margin: 4px 0 -2px;
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
  }
  .pomodoro-editor-grid {
    display: grid;
    gap: 10px;
  }
`);

(function () {
  var STORAGE_PREFIX = "pomodoro-widget-";
  var LEGACY_STORAGE_PREFIX = "new-tab-pomodoro-";

  function asPositiveInt(value, fallback) {
    var num = parseInt(value, 10);
    if (!isFinite(num) || num <= 0) return fallback;
    return Math.max(1, Math.min(180, num));
  }

  function asBool(value, fallback) {
    if (value === true || value === false) return value;
    if (value === "true" || value === "1") return true;
    if (value === "false" || value === "0") return false;
    return fallback;
  }

  function normalizeConfig(config) {
    var base = config || {};
    var legacyAutoStart = asBool(base.autoStartNext, false);
    return {
      title: String(base.title || "Pomodoro").trim() || "Pomodoro",
      focusMinutes: asPositiveInt(base.focusMinutes, 25),
      breakMinutes: asPositiveInt(base.breakMinutes, 5),
      longBreakMinutes: asPositiveInt(base.longBreakMinutes, 15),
      sessionsUntilLongBreak: asPositiveInt(base.sessionsUntilLongBreak, 4),
      autoStartBreak: asBool(base.autoStartBreak, legacyAutoStart),
      autoStartFocus: asBool(base.autoStartFocus, legacyAutoStart),
      notifications: asBool(base.notifications, true),
      sound: asBool(base.sound, true),
      soundVolume: Math.max(0, Math.min(100, parseInt(base.soundVolume, 10) || 60))
    };
  }

  function durationMs(phase, config) {
    if (phase === "longBreak") return config.longBreakMinutes * 60 * 1000;
    return (phase === "shortBreak" ? config.breakMinutes : config.focusMinutes) * 60 * 1000;
  }

  function shouldAutoStartPhase(phase, config) {
    return phase === "focus" ? config.autoStartFocus : config.autoStartBreak;
  }

  function nextPhase(current, config) {
    if (current.phase !== "focus") return "focus";
    if (current.completedFocusCount % Math.max(1, config.sessionsUntilLongBreak) === 0) return "longBreak";
    return "shortBreak";
  }

  function formatRemaining(ms) {
    var totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    return String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
  }

  function defaultSession(config, now) {
    return {
      phase: "focus",
      running: false,
      remainingMs: durationMs("focus", config),
      endsAt: null,
      completedFocusCount: 0,
      updatedAt: now
    };
  }

  function normalizeSession(session, config, now) {
    var safe = Object.assign({}, session || {});
    var phase = (safe.phase === "shortBreak" || safe.phase === "longBreak" || safe.phase === "break")
      ? (safe.phase === "break" ? "shortBreak" : safe.phase)
      : "focus";
    var fallbackMinutes = phase === "longBreak"
      ? config.longBreakMinutes
      : (phase === "shortBreak" ? config.breakMinutes : config.focusMinutes);
    var remaining = asPositiveInt(Math.ceil(Number(safe.remainingMs || 0) / 60000), fallbackMinutes) * 60 * 1000;
    if (safe.remainingMs && Number(safe.remainingMs) > 0) {
      remaining = Math.max(1000, Number(safe.remainingMs));
    }
    return {
      phase: phase,
      running: !!safe.running,
      remainingMs: remaining,
      endsAt: typeof safe.endsAt === "number" ? safe.endsAt : null,
      completedFocusCount: Math.max(0, parseInt(safe.completedFocusCount, 10) || 0),
      updatedAt: typeof safe.updatedAt === "number" ? safe.updatedAt : now
    };
  }

  function syncSession(session, now, config) {
    var current = normalizeSession(session, config, now);
    var completed = [];

    if (!current.running || !current.endsAt) {
      current.remainingMs = Math.max(1000, current.remainingMs || durationMs(current.phase, config));
      current.updatedAt = now;
      return { session: current, completed: completed };
    }

    while (current.running && current.endsAt <= now) {
      var finishedPhase = current.phase;
      if (finishedPhase === "focus") current.completedFocusCount += 1;
      completed.push(finishedPhase);

      current.phase = nextPhase(current, config);
      current.remainingMs = durationMs(current.phase, config);

      if (!shouldAutoStartPhase(current.phase, config)) {
        current.running = false;
        current.endsAt = null;
        current.updatedAt = now;
        return { session: current, completed: completed };
      }

      current.endsAt += current.remainingMs;
    }

    current.remainingMs = Math.max(1000, current.endsAt - now);
    current.updatedAt = now;
    return { session: current, completed: completed };
  }

  function startSession(session, now) {
    var current = Object.assign({}, session);
    if (current.running) return current;
    current.running = true;
    current.endsAt = now + Math.max(1000, current.remainingMs);
    current.updatedAt = now;
    return current;
  }

  function pauseSession(session, now) {
    var current = Object.assign({}, session);
    if (!current.running || !current.endsAt) return current;
    current.remainingMs = Math.max(1000, current.endsAt - now);
    current.running = false;
    current.endsAt = null;
    current.updatedAt = now;
    return current;
  }

  function resetSession(config, now) {
    return defaultSession(config, now);
  }

  function skipSession(session, config, now) {
    var current = Object.assign({}, session);
    current.phase = current.phase === "focus" ? "shortBreak" : "focus";
    current.remainingMs = durationMs(current.phase, config);
    current.endsAt = current.running ? now + current.remainingMs : null;
    current.updatedAt = now;
    return current;
  }

  function phaseLabel(phase) {
    if (phase === "longBreak") return "Long Break";
    if (phase === "shortBreak") return "Break";
    return "Focus";
  }

  function phaseMessage(phase) {
    if (phase === "longBreak") return "You earned a longer reset. Step away and recharge.";
    if (phase === "shortBreak") return "Step away for a few minutes, then come back fresh.";
    return "Pick one task and stay with it until the bell.";
  }

  function completionMessage(finishedPhase) {
    if (finishedPhase === "focus") {
      return { title: "Focus session complete", body: "Take a break before the next sprint." };
    }
    if (finishedPhase === "longBreak") {
      return { title: "Long break complete", body: "You are ready for the next focus block." };
    }
    return { title: "Break complete", body: "Time to get back into focus." };
  }

  function notifyCompletion(finishedPhase, config) {
    if (!config.notifications || typeof Notification === "undefined") return Promise.resolve(false);
    var message = completionMessage(finishedPhase);

    function show() {
      try {
        new Notification(message.title, { body: message.body, silent: true });
        return true;
      } catch (err) {
        return false;
      }
    }

    if (Notification.permission === "granted") return Promise.resolve(show());
    if (Notification.permission === "denied" || typeof Notification.requestPermission !== "function") {
      return Promise.resolve(false);
    }
    return Promise.resolve(Notification.requestPermission()).then(function (permission) {
      return permission === "granted" ? show() : false;
    }).catch(function () {
      return false;
    });
  }

  function playCompletionSound(config, deps) {
    if (!config.sound) return false;
    var root = deps || window;
    var AudioCtor = root.AudioContext || root.webkitAudioContext;
    if (!AudioCtor) return false;

    try {
      var ctx = new AudioCtor();
      var startAt = ctx.currentTime || 0;
      [659.25, 523.25, 783.99].forEach(function (freq, index) {
        var offset = index * 0.14;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, startAt + offset);
        gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, config.soundVolume / 2000), startAt + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + offset + 0.11);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startAt + offset);
        osc.stop(startAt + offset + 0.12);
      });
      if (typeof ctx.close === "function") {
        setTimeout(function () { ctx.close(); }, 550);
      }
      return true;
    } catch (err) {
      return false;
    }
  }

  function saveSession(store, storageKey, session) {
    return store.set(storageKey, {
      phase: session.phase,
      running: session.running,
      remainingMs: session.remainingMs,
      endsAt: session.endsAt,
      completedFocusCount: session.completedFocusCount,
      updatedAt: session.updatedAt
    });
  }

  function sessionFingerprint(session) {
    return JSON.stringify({
      phase: session.phase,
      running: session.running,
      remainingMs: session.remainingMs,
      endsAt: session.endsAt,
      completedFocusCount: session.completedFocusCount,
      updatedAt: session.updatedAt
    });
  }

  Hub.pomodoroWidget = {
    normalizeConfig: normalizeConfig,
    defaultSession: defaultSession,
    syncSession: syncSession,
    startSession: startSession,
    pauseSession: pauseSession,
    resetSession: resetSession,
    skipSession: skipSession,
    formatRemaining: formatRemaining,
    completionMessage: completionMessage,
    notifyCompletion: notifyCompletion,
    playCompletionSound: playCompletionSound
  };

  Hub.registry.register("pomodoro", {
    label: "Pomodoro",
    icon: "timer",
    minSize: { cols: 4, rows: 4 },

    render: function (container, config) {
      var safe = normalizeConfig(config);
      container.classList.add("widget-pomodoro");
      container.innerHTML =
        '<div class="widget-header"><h2>' + Hub.escapeHtml(safe.title) + '</h2></div>' +
        '<div class="pomodoro-meta">' +
          '<span class="pomodoro-phase"><span class="pomodoro-phase-dot"></span><span class="pomodoro-phase-label">Focus</span></span>' +
          '<span class="pomodoro-status">Ready</span>' +
        '</div>' +
        '<div class="pomodoro-timer-wrap">' +
          '<div class="pomodoro-timer">25:00</div>' +
          '<div class="pomodoro-note"></div>' +
        '</div>' +
        '<div class="pomodoro-controls">' +
          '<button type="button" class="pomodoro-button pomodoro-start is-primary" data-focusable="true">Start</button>' +
          '<button type="button" class="pomodoro-button pomodoro-reset" data-focusable="true">Reset</button>' +
          '<button type="button" class="pomodoro-button pomodoro-skip" data-focusable="true">Skip</button>' +
        '</div>' +
        '<div class="pomodoro-stats">' +
          '<div class="pomodoro-stat"><strong class="pomodoro-count">0</strong>completed</div>' +
          '<div class="pomodoro-stat"><strong>' + Hub.escapeHtml(String(safe.focusMinutes)) + '/' + Hub.escapeHtml(String(safe.breakMinutes)) + '/' + Hub.escapeHtml(String(safe.longBreakMinutes)) + '</strong>focus/break/long</div>' +
        '</div>';
    },

    load: async function (container, config, state, token) {
      var now = Date.now();
      var safeConfig = normalizeConfig(config);
      var widgetId = container.closest("[data-widget-id]").dataset.widgetId;
      var storageKey = STORAGE_PREFIX + widgetId;
      var legacyStorageKey = LEGACY_STORAGE_PREFIX + widgetId;
      var store = state.store;
      var savedSession = await store.get(storageKey);
      if (!savedSession) savedSession = await store.get(legacyStorageKey);
      if (token !== state.renderToken) return;

      if (container._pomodoroInterval) clearInterval(container._pomodoroInterval);

      var synced = savedSession
        ? syncSession(savedSession, now, safeConfig).session
        : defaultSession(safeConfig, now);
      var session = synced;

      var phaseEl = container.querySelector(".pomodoro-phase");
      var phaseLabelEl = container.querySelector(".pomodoro-phase-label");
      var statusEl = container.querySelector(".pomodoro-status");
      var timerEl = container.querySelector(".pomodoro-timer");
      var noteEl = container.querySelector(".pomodoro-note");
      var countEl = container.querySelector(".pomodoro-count");
      var startBtn = container.querySelector(".pomodoro-start");
      var resetBtn = container.querySelector(".pomodoro-reset");
      var skipBtn = container.querySelector(".pomodoro-skip");
      var lastPersisted = sessionFingerprint(session);

      function persistIfChanged() {
        var nextFingerprint = sessionFingerprint(session);
        if (nextFingerprint === lastPersisted) return;
        lastPersisted = nextFingerprint;
        saveSession(store, storageKey, session);
      }

      function updateUi() {
        var live = session.running ? syncSession(session, Date.now(), safeConfig) : { session: session, completed: [] };
        session = live.session;
        phaseLabelEl.textContent = phaseLabel(session.phase);
        phaseEl.classList.toggle("is-break", session.phase === "shortBreak" || session.phase === "longBreak");
        phaseEl.classList.toggle("is-long-break", session.phase === "longBreak");
        statusEl.textContent = session.running ? "Running" : "Paused";
        timerEl.textContent = formatRemaining(session.running && session.endsAt ? (session.endsAt - Date.now()) : session.remainingMs);
        noteEl.textContent = phaseMessage(session.phase);
        countEl.textContent = String(session.completedFocusCount);
        startBtn.textContent = session.running ? "Pause" : "Start";

        if (live.completed.length) {
          persistIfChanged();
          var lastCompleted = live.completed[live.completed.length - 1];
          playCompletionSound(safeConfig, window);
          notifyCompletion(lastCompleted, safeConfig);
        }
      }

      startBtn.addEventListener("click", function () {
        session = session.running
          ? pauseSession(session, Date.now())
          : startSession(session, Date.now());
        persistIfChanged();
        updateUi();
      });

      resetBtn.addEventListener("click", function () {
        session = resetSession(safeConfig, Date.now());
        persistIfChanged();
        updateUi();
      });

      skipBtn.addEventListener("click", function () {
        session = skipSession(session, safeConfig, Date.now());
        persistIfChanged();
        updateUi();
      });

      container._pomodoroInterval = setInterval(function () {
        updateUi();
      }, 1000);

      updateUi();
    },

    renderEditor: function (container, config, onChange) {
      var safe = normalizeConfig(config);
      container.replaceChildren();
      container.classList.add("pomodoro-editor-grid");

      var titleLabel = document.createElement("label");
      titleLabel.className = "editor-field";
      titleLabel.innerHTML = '<span>Widget title</span><input type="text" value="' + Hub.escapeHtml(safe.title) + '" />';
      titleLabel.querySelector("input").addEventListener("input", function (e) {
        config.title = e.target.value;
        onChange(normalizeConfig(config));
      });
      container.appendChild(titleLabel);

      var focusLabel = document.createElement("label");
      focusLabel.className = "editor-field";
      focusLabel.innerHTML = '<span>Focus minutes</span><input type="number" min="1" max="180" step="1" value="' + Hub.escapeHtml(String(safe.focusMinutes)) + '" />';
      focusLabel.querySelector("input").addEventListener("input", function (e) {
        config.focusMinutes = e.target.value;
        var normalized = normalizeConfig(config);
        e.target.value = String(normalized.focusMinutes);
        onChange(normalized);
      });
      container.appendChild(focusLabel);

      var breakLabel = document.createElement("label");
      breakLabel.className = "editor-field";
      breakLabel.innerHTML = '<span>Short break minutes</span><input type="number" min="1" max="180" step="1" value="' + Hub.escapeHtml(String(safe.breakMinutes)) + '" />';
      breakLabel.querySelector("input").addEventListener("input", function (e) {
        config.breakMinutes = e.target.value;
        var normalized = normalizeConfig(config);
        e.target.value = String(normalized.breakMinutes);
        onChange(normalized);
      });
      container.appendChild(breakLabel);

      var longBreakLabel = document.createElement("label");
      longBreakLabel.className = "editor-field";
      longBreakLabel.innerHTML = '<span>Long break minutes</span><input type="number" min="1" max="180" step="1" value="' + Hub.escapeHtml(String(safe.longBreakMinutes)) + '" />';
      longBreakLabel.querySelector("input").addEventListener("input", function (e) {
        config.longBreakMinutes = e.target.value;
        var normalized = normalizeConfig(config);
        e.target.value = String(normalized.longBreakMinutes);
        onChange(normalized);
      });
      container.appendChild(longBreakLabel);

      var cycleLabel = document.createElement("label");
      cycleLabel.className = "editor-field";
      cycleLabel.innerHTML = '<span>Focus sessions before long break</span><input type="number" min="1" max="180" step="1" value="' + Hub.escapeHtml(String(safe.sessionsUntilLongBreak)) + '" />';
      cycleLabel.querySelector("input").addEventListener("input", function (e) {
        config.sessionsUntilLongBreak = e.target.value;
        var normalized = normalizeConfig(config);
        e.target.value = String(normalized.sessionsUntilLongBreak);
        onChange(normalized);
      });
      container.appendChild(cycleLabel);

      var behaviorTitle = document.createElement("p");
      behaviorTitle.className = "pomodoro-editor-section-title";
      behaviorTitle.textContent = "Behavior";
      container.appendChild(behaviorTitle);

      [
        { key: "autoStartBreak", label: "Auto-start breaks", checked: safe.autoStartBreak },
        { key: "autoStartFocus", label: "Auto-start focus after breaks", checked: safe.autoStartFocus },
        { key: "notifications", label: "Browser notifications", checked: safe.notifications },
        { key: "sound", label: "Play sound on phase change", checked: safe.sound }
      ].forEach(function (item) {
        var row = document.createElement("label");
        row.className = "theme-scope-label";
        row.innerHTML = '<input type="checkbox" ' + (item.checked ? 'checked' : '') + ' /> ' + Hub.escapeHtml(item.label);
        row.querySelector("input").addEventListener("change", function (e) {
          config[item.key] = e.target.checked;
          onChange(normalizeConfig(config));
        });
        container.appendChild(row);
      });

      var soundLabel = document.createElement("label");
      soundLabel.className = "editor-field";
      soundLabel.innerHTML = '<span>Sound volume</span><input type="range" min="0" max="100" step="5" value="' + Hub.escapeHtml(String(safe.soundVolume)) + '" />';
      soundLabel.querySelector("input").addEventListener("input", function (e) {
        config.soundVolume = e.target.value;
        onChange(normalizeConfig(config));
      });
      container.appendChild(soundLabel);
    },

    defaultConfig: function () {
      return normalizeConfig({});
    }
  });
})();
