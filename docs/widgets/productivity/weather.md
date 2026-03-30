---
title: Weather
description: Current weather with a 24-hour temperature chart and sunrise/sunset overlay
---

# Weather

Shows current conditions for any location along with a 24-hour temperature chart, hourly precipitation dots, and a sunrise/sunset time overlay. Powered by [Open-Meteo](https://open-meteo.com/) — completely free with no API key required.

## Configuration

```js
{ id: "my-weather", type: "weather", col: 1, row: 1, width: 6, height: 2,
  config: {
    location: "New York"
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | — | Widget heading. |
| `location` | string | — | Location name to fetch weather for (e.g., `"London, UK"`, `"Tokyo"`, `"Sydney"`). |
| `units` | string | `"celsius"` | Temperature unit: `"celsius"` or `"fahrenheit"`. |

## Examples

### Minimal

```js
{ id: "w1", type: "weather", col: 1, row: 1, width: 6, height: 2,
  config: {
    location: "London, UK"
  }
}
```

### Advanced

```js
{ id: "w1", type: "weather", col: 1, row: 1, width: 6, height: 2,
  config: {
    title: "New York Weather",
    location: "New York, US",
    units: "fahrenheit"
  }
}
```

!!! tip
    No API key is needed. Open-Meteo geocodes the `location` string automatically, so plain city names like `"Paris"` work as well as more specific strings like `"Paris, France"`.
