---
title: Speedtest Tracker
description: Show the latest download speed, upload speed, and ping from Speedtest Tracker.
---

# Speedtest Tracker

Displays the most recent speedtest results from your Speedtest Tracker instance: download speed (Mbps), upload speed (Mbps), and ping (ms).

## Configuration

```js
{ id: "my-speedtest", type: "speedtest-tracker", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Speedtest Tracker",
    url: "http://localhost:80",
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"Speedtest Tracker"` | Label shown in the widget header. |
| `url` | string | `"http://localhost:80"` | Base URL of your Speedtest Tracker instance. |

## Credentials

| Field | Type | Description |
|-------|------|-------------|
| `apiKey` | password | Speedtest Tracker API key. |

To find or generate an API key: open your Speedtest Tracker instance, go to **Settings → API**, and copy the key shown. If no key exists, generate one from the same page.

## Displayed stats

| Stat | Description |
|------|-------------|
| Download | Latest download result in Mbps. |
| Upload | Latest upload result in Mbps. |
| Ping | Latest latency result in ms. |

!!! note
    The widget shows the most recent completed test result, not a live measurement. Speedtest Tracker runs tests on a schedule you configure within the app itself.

!!! tip
    Set Speedtest Tracker to run tests frequently (e.g. every hour) to keep the displayed values fresh and useful for spotting ISP issues at a glance.

## Example

```js
{ id: "spt-1", type: "speedtest-tracker", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Speedtest Tracker",
    url: "http://192.168.1.10:80",
  }
}
```
