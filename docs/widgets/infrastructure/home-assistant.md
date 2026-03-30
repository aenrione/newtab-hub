---
title: Home Assistant
description: Display the current state of any Home Assistant entity on your dashboard.
---

# Home Assistant

Shows the live state of a single Home Assistant entity — such as a temperature sensor, a switch, or a binary sensor. The widget displays the entity's state value, friendly name, and unit of measurement.

## Configuration

```js
{ id: "my-hass", type: "home-assistant", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Home Assistant",
    url: "http://localhost:8123",
    entityId: "sensor.living_room_temp",
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"Home Assistant"` | Label shown in the widget header. |
| `url` | string | `"http://localhost:8123"` | Base URL of your Home Assistant instance. |
| `entityId` | string | *(required)* | The entity ID to display, e.g. `sensor.living_room_temp`. |

!!! note
    `entityId` is required. Without it the widget cannot fetch any state. You can find entity IDs in **Settings → Devices & Services → Entities** or in the developer tools state browser (`/developer-tools/state`).

## Credentials

| Field | Type | Description |
|-------|------|-------------|
| `token` | password | A long-lived access token from your Home Assistant account. |

To create a token: in Home Assistant, click your **profile** (bottom-left avatar), scroll to the **Long-lived access tokens** section, and click **Create Token**. Give it a name (e.g. "newtab-hub") and copy the value — it is only shown once.

!!! warning
    Long-lived access tokens grant API access to your entire Home Assistant instance. Use a dedicated account with limited permissions if you need tighter security.

## Displayed data

| Field | Description |
|-------|-------------|
| State | The current state value of the entity (e.g. `21.3`). |
| Friendly name | Human-readable name from the entity's attributes. |
| Unit | Unit of measurement from the entity's attributes (e.g. `°C`). |

## Example

```js
{ id: "hass-1", type: "home-assistant", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Living Room",
    url: "http://192.168.1.10:8123",
    entityId: "sensor.living_room_temp",
  }
}
```
