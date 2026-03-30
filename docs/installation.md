---
title: Installation
description: How to install New Tab Hub as an unpacked Chrome extension
---

# Installation

New Tab Hub is loaded as an **unpacked extension** using your browser's built-in developer mode. No extension store, no build step.

## Prerequisites

- A Chromium-based browser: Chrome, Brave, Edge, Vivaldi, or Arc
- Git (or download the ZIP from GitHub)

## Steps

### 1. Get the code

=== "Git"

    ```bash
    git clone https://github.com/aenrione/newtab-hub.git
    ```

=== "ZIP download"

    Download the repository ZIP from GitHub and extract it anywhere you like.

### 2. Open the extensions page

Navigate to your browser's extensions page:

| Browser | URL |
|---------|-----|
| Chrome  | `chrome://extensions` |
| Brave   | `brave://extensions` |
| Edge    | `edge://extensions` |
| Vivaldi | `vivaldi://extensions` |

### 3. Enable Developer Mode

Toggle **Developer mode** on (top-right corner in Chrome/Brave).

### 4. Load the extension

Click **Load unpacked** and select the `newtab-hub` folder.

### 5. Open a new tab

Open a new tab — the dashboard replaces the default page immediately.

---

## Updating

Pull the latest changes and reload the extension:

```bash
git pull
```

Then go to your extensions page and click the **reload** icon next to New Tab Hub, or press `Ctrl+R` on the extensions page.

---

## Running Tests

The extension ships with no runtime dependencies. Node is only used for the test suite:

```bash
npm install   # install Jest (dev only)
npm test      # run the test suite
```

---

!!! note "Firefox"
    Firefox is not currently supported. It would require porting to the WebExtension manifest format. Contributions are welcome — see [Contributing](contributing.md).
