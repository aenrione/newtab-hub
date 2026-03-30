---
title: Custom API
description: Fetch any JSON API and render results with an optional HTML template.
---

# Custom API

Fetches any JSON endpoint and renders the response inside a card. Supports flat or nested arrays rendered via `{{field}}` template substitution, or an auto pretty-printed view for plain objects.

## Configuration

```js
{
  id: "my-custom-api",
  type: "custom-api",
  col: 1, row: 1, width: 6, height: 2,
  config: {
    title: "My API",
    url: "https://api.example.com/data",
    method: "GET",
    limit: 10,
    template: "<span>{{name}}</span> — <small>{{status}}</small>",
    headers: [
      { key: "Authorization", value: "Bearer TOKEN" }
    ]
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | — | Card heading. Omit to hide the title bar. |
| `url` | string | — | API endpoint URL. **Required.** |
| `method` | string | `"GET"` | HTTP method — `"GET"` or `"POST"`. |
| `limit` | number | `10` | Maximum rows to render when the response is an array. Hard cap of **50**. |
| `template` | string | — | HTML template applied to each item. Use `{{field}}` or `{{nested.field}}` for substitution. Omit to use the default pretty-print view. |
| `headers` | array | — | Additional request headers as `[{ key, value }]` pairs. |

## Examples

**Plain list — default pretty-print**

```js
{
  id: "api-plain",
  type: "custom-api",
  col: 1, row: 1, width: 5, height: 2,
  config: {
    url: "https://api.example.com/status"
  }
}
```

**Array with template**

```js
{
  id: "api-releases",
  type: "custom-api",
  col: 1, row: 1, width: 6, height: 2,
  config: {
    title: "Deployments",
    url: "https://api.example.com/deployments",
    limit: 5,
    template: "<strong>{{app}}</strong> <code>{{version}}</code> — {{environment}}"
  }
}
```

**POST with auth header**

```js
{
  id: "api-internal",
  type: "custom-api",
  col: 7, row: 1, width: 6, height: 2,
  config: {
    title: "Internal API",
    url: "https://internal.example.com/api/query",
    method: "POST",
    headers: [
      { key: "Authorization", value: "Bearer my-secret-token" },
      { key: "Content-Type",  value: "application/json" }
    ],
    limit: 20
  }
}
```

**Nested fields**

Given a response `[{ "user": { "name": "Alice" }, "score": 42 }]`:

```js
template: "{{user.name}} scored {{score}}"
```

!!! tip "Template fallback"
    If no `template` is provided and the response is an object (not an array), the widget renders a formatted key-value table automatically.

!!! note "CORS"
    The request is made directly from the browser. The target API must allow cross-origin requests (`Access-Control-Allow-Origin: *`), or you must route requests through a local proxy.

!!! warning "Sensitive tokens"
    Headers such as `Authorization` are stored in your config file in plain text. Avoid committing configs with secrets to public repositories.
