---
title: Pomodoro
description: Pomodoro timer with focus/break phases, notifications, and audio chimes
---

# Pomodoro

A full-featured Pomodoro timer with configurable focus, short break, and long break durations. Displays the current phase, completed session count, and Start / Pause / Reset / Skip controls. Timer state persists across tab reloads so a refresh never loses your progress.

!!! warning "Minimum size"
    This widget requires at least a **4 × 4** grid area to render correctly. Use `width: 4, height: 4` or larger.

## Configuration

```js
{ id: "my-pomodoro", type: "pomodoro", col: 1, row: 1, width: 4, height: 4,
  config: {
    focusMinutes: 25,
    breakMinutes: 5
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"Pomodoro"` | Widget heading. |
| `focusMinutes` | number | `25` | Focus session length in minutes (1–180). |
| `breakMinutes` | number | `5` | Short break length in minutes (1–180). |
| `longBreakMinutes` | number | `15` | Long break length in minutes (1–180). |
| `sessionsUntilLongBreak` | number | `4` | Number of focus sessions completed before a long break is triggered (1–180). |
| `autoStartBreak` | boolean | `false` | Automatically start the break timer when a focus session ends. |
| `autoStartFocus` | boolean | `false` | Automatically start the next focus session when a break ends. |
| `notifications` | boolean | `true` | Send a browser notification when a phase completes. |
| `sound` | boolean | `true` | Play an audio chime when a phase completes. |
| `soundVolume` | number | `60` | Chime volume level (0–100). |

## Examples

### Minimal

```js
{ id: "w1", type: "pomodoro", col: 1, row: 1, width: 4, height: 4,
  config: {}
}
```

### Advanced

```js
{ id: "w1", type: "pomodoro", col: 1, row: 1, width: 6, height: 4,
  config: {
    title: "Focus Timer",
    focusMinutes: 50,
    breakMinutes: 10,
    longBreakMinutes: 30,
    sessionsUntilLongBreak: 3,
    autoStartBreak: true,
    autoStartFocus: false,
    notifications: true,
    sound: true,
    soundVolume: 40
  }
}
```

!!! tip
    Enable `autoStartBreak: true` for a fully hands-free flow where breaks kick off automatically. Leave `autoStartFocus: false` so you consciously choose when to start the next session.

!!! note
    Browser notifications require permission. The first time a phase completes, your browser will prompt you to allow notifications from this page.
