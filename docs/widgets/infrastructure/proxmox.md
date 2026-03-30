---
title: Proxmox
description: Show running VMs, LXC containers, and cluster CPU/RAM usage from Proxmox VE.
---

# Proxmox

Displays the number of running VMs and LXC containers, plus cluster-wide CPU and RAM utilisation percentages. Connects to the Proxmox API using an API token.

## Configuration

```js
{ id: "my-proxmox", type: "proxmox", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Proxmox",
    url: "https://localhost:8006",
  }
}
```

## Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `title` | string | `"Proxmox"` | Label shown in the widget header. |
| `url` | string | `"https://localhost:8006"` | Base URL of your Proxmox web UI. Must use `https://`. |

## Credentials

| Field | Type | Description |
|-------|------|-------------|
| `apiToken` | password | A Proxmox API token in the format `user@realm!tokenid=uuid`. |

To create an API token: in the Proxmox UI, go to **Datacenter → Permissions → API Tokens**, click **Add**, select the user and realm (e.g. `root@pam`), enter a token ID, and copy both the token ID and secret. The full credential string to enter is:

```
user@pam!my-token=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

!!! warning
    Proxmox uses HTTPS with a self-signed certificate by default. Your browser must trust the certificate or the request will be blocked. Either install the Proxmox CA cert in your browser/OS trust store, or replace the self-signed cert with one from a trusted CA. There is no `verify_ssl=false` bypass — the extension fetches directly from the browser context.

!!! tip
    Create a dedicated API token with read-only (`PVEAuditor`) permissions scoped to the cluster rather than using the root account token.

## Displayed stats

| Stat | Description |
|------|-------------|
| Running VMs | Count of QEMU virtual machines in the running state. |
| Running LXC | Count of LXC containers in the running state. |
| CPU % | Cluster-wide CPU utilisation percentage. |
| RAM % | Cluster-wide memory utilisation percentage. |

## Example

```js
{ id: "pve-1", type: "proxmox", col: 1, row: 1, width: 6, height: 1,
  config: {
    title: "Proxmox",
    url: "https://192.168.1.5:8006",
  }
}
```
