---
title: Netdata
description: Show real-time CPU and RAM usage from a Netdata agent.
---

# Netdata

Displays live CPU usage percentage and RAM usage from a Netdata agent. Netdata's API is unauthenticated by default, so no credentials are required for a standard local installation.

## Configuration

```js
{ id: "my-netdata", type: "netdata", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Netdata",
    url: "http://localhost:19999",
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"Netdata"` | Label shown in the widget header. |
| `url` | string | `"http://localhost:19999"` | Base URL of your Netdata agent. |

## Credentials

None required. Netdata's REST API is open by default on local installations.

!!! warning
    If your Netdata agent is exposed on a non-loopback interface, consider enabling Netdata's built-in access control or placing it behind an authenticated reverse proxy before connecting this widget to it.

!!! tip
    If you run Netdata Cloud and want metrics from a remote node, you can still point this widget at the agent's direct URL as long as it's reachable from your browser.

## Displayed stats

| Stat | Description |
|------|-------------|
| CPU % | Current CPU utilisation across all cores. |
| RAM % | Current memory utilisation percentage. |
| RAM | Absolute memory usage in human-readable form. |

## Example

```js
{ id: "nd-1", type: "netdata", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Netdata",
    url: "http://192.168.1.10:19999",
  }
}
```
