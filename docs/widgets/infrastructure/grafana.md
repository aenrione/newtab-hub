---
title: Grafana
description: Show Grafana alerts, live Prometheus metric values, or embedded dashboard panels.
---

# Grafana

The Grafana widget supports three independent display modes:

- **Alerts** — live alert list from the Grafana Alertmanager API
- **Metrics** — current values for one or more Prometheus instant queries
- **Panels** — embedded dashboard panels via iframe

!!! note
    Panels mode does not require a service account token — panels are embedded as public iframes. Alerts and Metrics modes both require a token.

## Configuration

### Alerts mode (default)

```js
{ id: "grafana-alerts", type: "grafana", col: 1, row: 1, width: 6, height: 2,
  config: {
    title: "Grafana",
    instanceUrl: "http://grafana.local:3000",
    mode: "alerts",
    alertLimit: 10,
    showSuppressed: false,
  }
}
```

### Metrics mode

```js
{ id: "grafana-metrics", type: "grafana", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Grafana",
    instanceUrl: "http://grafana.local:3000",
    mode: "metrics",
    metrics: [
      { label: "CPU", datasourceUid: "abc123", expr: "100 - avg(rate(node_cpu_seconds_total{mode='idle'}[5m])) * 100", unit: "%" },
      { label: "RAM", datasourceUid: "abc123", expr: "node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes * 100", unit: "%" }
    ],
  }
}
```

### Panels mode

```js
{ id: "grafana-panels", type: "grafana", col: 1, row: 1, width: 6, height: 2,
  config: {
    title: "Grafana",
    instanceUrl: "http://grafana.local:3000",
    mode: "panels",
    theme: "dark",
    orgId: 1,
    panels: [
      { title: "CPU Overview", dashboardUid: "AbCdEfGh", panelId: "2", height: 200 }
    ],
  }
}
```

## Options

### Common

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"Grafana"` | Label shown in the widget header. |
| `instanceUrl` | string | *(required)* | Base URL of your Grafana instance. |
| `mode` | string | `"alerts"` | Display mode: `"alerts"`, `"metrics"`, or `"panels"`. |

### Alerts mode

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `alertLimit` | number | `10` | Maximum number of alerts to display (1–50). |
| `showSuppressed` | boolean | `false` | Whether to include silenced/suppressed alerts. |

### Metrics mode

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `metrics` | array | `[]` | List of metric definitions (see below). |

Each entry in `metrics`:

| Field | Type | Description |
|-------|------|-------------|
| `label` | string | Display label for the metric card. |
| `datasourceUid` | string | UID of the Prometheus datasource. Find it under **Connections → Data sources** in the datasource URL (`/datasources/edit/<uid>`). |
| `expr` | string | Prometheus instant query expression. |
| `unit` | string | Optional unit suffix (e.g. `%`, `MB`, `req/s`). |

### Panels mode

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `theme` | string | `"dark"` | Panel iframe theme: `"dark"` or `"light"`. |
| `orgId` | number | `1` | Grafana organisation ID. |
| `panels` | array | `[]` | List of panel definitions (see below). |

Each entry in `panels`:

| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Optional label shown above the panel iframe. |
| `dashboardUid` | string | Dashboard UID from the URL: `/d/<uid>/dashboard-name`. |
| `panelId` | string | Panel ID. Find it via **panel menu → Edit** — the URL will contain `?editPanel=N`. |
| `height` | number | iframe height in pixels (default `200`). |

## Credentials

| Field | Type | Description |
|-------|------|-------------|
| `token` | password | A Grafana service account token (not needed for Panels mode). |

To create a service account token: go to **Administration → Service accounts**, click **Add service account**, assign at minimum the **Viewer** role, then open the account and click **Add service account token**. Copy the generated token.

!!! warning
    Panels mode embeds iframes directly from Grafana. Make sure **Allow embedding** is enabled in your Grafana config (`allow_embedding = true` under `[security]`), otherwise the panels will be blocked.

## Example

```js
{ id: "g1", type: "grafana", col: 1, row: 1, width: 6, height: 2,
  config: {
    title: "Alerts",
    instanceUrl: "http://192.168.1.30:3000",
    mode: "alerts",
    alertLimit: 10,
    showSuppressed: false,
  }
}
```
