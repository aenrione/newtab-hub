---
title: Portainer
description: Show running and stopped container counts from your Portainer instance.
---

# Portainer

Displays the number of running containers, stopped containers, and the number of managed environments from your Portainer instance. Optionally scoped to a single environment.

## Configuration

```js
{ id: "my-portainer", type: "portainer", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Portainer",
    url: "http://localhost:9000",
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"Portainer"` | Label shown in the widget header. |
| `url` | string | `"http://localhost:9000"` | Base URL of your Portainer instance. |
| `envId` | number | *(optional)* | Portainer environment ID to scope results to. Leave blank to aggregate all environments. |

!!! tip
    To find an environment ID, open Portainer, go to **Environments**, and look at the URL when you click into one — it will contain `endpointId=N`. Enter that number as `envId`.

## Credentials

| Field | Type | Description |
|-------|------|-------------|
| `apiKey` | password | A Portainer API access token. |

To create an access token: in Portainer, click your **account name** (top-right), select **My account**, scroll to the **Access tokens** section, and click **Add access token**. Give it a description (e.g. "newtab-hub") and copy the token — it is only shown once.

## Displayed stats

| Stat | Description |
|------|-------------|
| Running | Containers currently in the running state. |
| Stopped | Containers in a stopped or exited state. |
| Environments | Number of Docker/Kubernetes environments registered. |

## Example

```js
{ id: "portainer-1", type: "portainer", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Portainer",
    url: "http://192.168.1.20:9000",
    envId: 1,
  }
}
```
