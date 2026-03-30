---
title: Custom CSS
description: How to inject custom CSS into New Tab Hub
---

# Custom CSS

The theme sidebar includes a CSS editor that injects styles directly into the page. Use it to override any aspect of the dashboard's appearance.

## Where to Find It

Open the theme sidebar (half-circle icon) → scroll to the bottom → **Custom CSS** text area.

## Examples

### Hide the top bar

```css
.top-bar {
  display: none;
}
```

### Larger widget text

```css
.widget-card {
  font-size: 1.1em;
}
```

### Custom font

```css
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono&display=swap');

body {
  font-family: 'JetBrains Mono', monospace;
}
```

### Tighter widget spacing

```css
.grid-cell {
  padding: 4px;
}
```

## Tips

!!! tip
    Use your browser's DevTools (`F12`) to inspect element class names and experiment with styles before pasting them into the CSS editor.

!!! note
    Custom CSS is saved to `chrome.storage.local` and persists across sessions. It applies after all built-in styles, so it can override anything.

!!! warning
    Avoid using `!important` extensively — it can make future customization harder. Most built-in styles have low specificity and can be overridden without it.
