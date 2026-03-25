const {
  FakeElement,
  createWidgetState,
  loadScript,
  registerWidgetSmokeSuite,
  setupWidgetTestGlobals,
  teardownWidgetTestGlobals
} = require("../helpers/widget-test-utils");

registerWidgetSmokeSuite({ widgetDir: "pomodoro" });

describe("pomodoro widget helpers", function () {
  let plugin;
  let api;

  beforeEach(function () {
    setupWidgetTestGlobals();
    loadScript("js/widgets/pomodoro/index.js");
    plugin = global.Hub.registry.get("pomodoro");
    api = global.Hub.pomodoroWidget;
  });

  afterEach(function () {
    teardownWidgetTestGlobals();
  });

  test("default config exposes a simple focus and break setup", function () {
    expect(plugin.defaultConfig()).toEqual({
      title: "Pomodoro",
      focusMinutes: 25,
      breakMinutes: 5,
      longBreakMinutes: 15,
      sessionsUntilLongBreak: 4,
      autoStartBreak: false,
      autoStartFocus: false,
      notifications: true,
      sound: true,
      soundVolume: 60
    });
  });

  test("declares a minimum card size so the full timer UI stays visible", function () {
    expect(plugin.minSize).toEqual({ cols: 4, rows: 4 });
  });

  test("normalizes noisy config values safely", function () {
    expect(api.normalizeConfig({
      title: "",
      focusMinutes: "0",
      breakMinutes: "12",
      longBreakMinutes: "18",
      sessionsUntilLongBreak: "3",
      autoStartBreak: "1",
      autoStartFocus: "0",
      notifications: "false",
      sound: "0",
      soundVolume: "85"
    })).toEqual({
      title: "Pomodoro",
      focusMinutes: 25,
      breakMinutes: 12,
      longBreakMinutes: 18,
      sessionsUntilLongBreak: 3,
      autoStartBreak: true,
      autoStartFocus: false,
      notifications: false,
      sound: false,
      soundVolume: 85
    });
  });

  test("moves from focus to short break and pauses when auto-start is off", function () {
    const config = api.normalizeConfig({ autoStartBreak: false });
    const result = api.syncSession({
      phase: "focus",
      running: true,
      remainingMs: 1000,
      endsAt: 5000,
      completedFocusCount: 1,
      updatedAt: 4000
    }, 5000, config);

    expect(result.completed).toEqual(["focus"]);
    expect(result.session).toMatchObject({
      phase: "shortBreak",
      running: false,
      remainingMs: 5 * 60 * 1000,
      completedFocusCount: 2,
      endsAt: null
    });
  });

  test("auto-start continues into the next phase when enabled for breaks", function () {
    const config = api.normalizeConfig({ autoStartBreak: true, breakMinutes: 7 });
    const result = api.syncSession({
      phase: "focus",
      running: true,
      remainingMs: 1000,
      endsAt: 5000,
      completedFocusCount: 0,
      updatedAt: 4000
    }, 5000, config);

    expect(result.completed).toEqual(["focus"]);
    expect(result.session.phase).toBe("shortBreak");
    expect(result.session.running).toBe(true);
    expect(result.session.endsAt).toBe(5000 + 7 * 60 * 1000);
    expect(result.session.remainingMs).toBe(7 * 60 * 1000);
    expect(result.session.completedFocusCount).toBe(1);
  });

  test("switches to a long break after the configured number of focus sessions", function () {
    const config = api.normalizeConfig({
      autoStartBreak: false,
      longBreakMinutes: 20,
      sessionsUntilLongBreak: 4
    });
    const result = api.syncSession({
      phase: "focus",
      running: true,
      remainingMs: 1000,
      endsAt: 5000,
      completedFocusCount: 3,
      updatedAt: 4000
    }, 5000, config);

    expect(result.completed).toEqual(["focus"]);
    expect(result.session).toMatchObject({
      phase: "longBreak",
      running: false,
      remainingMs: 20 * 60 * 1000,
      completedFocusCount: 4,
      endsAt: null
    });
  });

  test("uses legacy autoStartNext as fallback for separate auto-start settings", function () {
    expect(api.normalizeConfig({ autoStartNext: true })).toMatchObject({
      autoStartBreak: true,
      autoStartFocus: true
    });
  });

  test("creates a browser notification when permission is granted", async function () {
    const notifications = [];

    global.Notification = function (title, options) {
      notifications.push({ title, options });
    };
    global.Notification.permission = "granted";

    const shown = await api.notifyCompletion("focus", plugin.defaultConfig());

    expect(shown).toBe(true);
    expect(notifications).toEqual([
      {
        title: "Focus session complete",
        options: {
          body: "Take a break before the next sprint.",
          silent: true
        }
      }
    ]);
  });

  test("plays a short chime sequence when audio is available", function () {
    const oscillators = [];
    const gains = [];

    function FakeAudioContext() {
      this.currentTime = 10;
      this.destination = {};
    }

    FakeAudioContext.prototype.createOscillator = function () {
      const osc = {
        frequency: { value: 0 },
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn()
      };
      oscillators.push(osc);
      return osc;
    };

    FakeAudioContext.prototype.createGain = function () {
      const gain = {
        gain: {
          setValueAtTime: jest.fn(),
          exponentialRampToValueAtTime: jest.fn()
        },
        connect: jest.fn()
      };
      gains.push(gain);
      return gain;
    };

    FakeAudioContext.prototype.close = jest.fn();

    const played = api.playCompletionSound(plugin.defaultConfig(), {
      AudioContext: FakeAudioContext
    });

    expect(played).toBe(true);
    expect(oscillators).toHaveLength(3);
    expect(gains).toHaveLength(3);
    expect(oscillators[0].start).toHaveBeenCalledWith(10);
    expect(oscillators[2].stop).toHaveBeenCalledWith(10 + 0.28 + 0.12);
    expect(gains[0].gain.exponentialRampToValueAtTime).toHaveBeenCalledWith(0.03, 10.02);
  });

  test("persists timer state only on meaningful changes, not every tick", async function () {
    const store = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined)
    };
    const state = createWidgetState();
    state.store = store;

    const container = new FakeElement("div");
    plugin.render(container, plugin.defaultConfig(), state);
    await plugin.load(container, { _id: "pomodoro-1" }, state, state.renderToken);

    expect(store.get).toHaveBeenNthCalledWith(1, "pomodoro-widget-widget-1");
    expect(store.get).toHaveBeenNthCalledWith(2, "new-tab-pomodoro-widget-1");
    expect(store.set).not.toHaveBeenCalled();

    const startButton = container.querySelector(".pomodoro-start");
    startButton.listeners.click({});

    expect(store.set).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(3000);

    expect(store.set).toHaveBeenCalledTimes(1);
  });
});
