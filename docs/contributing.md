---
title: Contributing
description: How to contribute to New Tab Hub
---

# Contributing

Contributions are welcome! New Tab Hub is a vanilla JavaScript project — no build step, no framework, no toolchain to fight with.

## Ways to Contribute

- **New widgets** — the most impactful contributions
- **Firefox support** — port to the WebExtension manifest format
- **Bug fixes** — check open issues on GitHub
- **Code quality** — the codebase was vibecoded; improvements are appreciated
- **Accessibility** — keyboard navigation, ARIA labels, contrast improvements
- **Tests** — the Jest suite always needs more coverage
- **Documentation** — corrections, examples, missing widget docs

## Development Setup

```bash
git clone https://github.com/aenrione/newtab-hub.git
cd newtab-hub
npm install   # test tooling only
```

Load the folder as an unpacked extension (see [Installation](installation.md)), then edit and reload.

## Adding a Widget

1. Create `js/widgets/<widget-name>/index.js`
2. Register it with `Hub.registry.register("<type>", { label, icon, render, load })`
3. Add a `mock.js` for storybook preview (optional but helpful)
4. Add a doc page to `docs/widgets/<category>/<widget-name>.md`
5. Add the page to the `nav` section in `mkdocs.yml`

See any existing widget (e.g. `js/widgets/weather/index.js`) as a reference implementation.

## Code Style

- Vanilla JS only — no frameworks, no npm packages in the extension itself
- Prefer editing existing files to creating new abstractions
- Match surrounding code style (indentation, naming)
- Run `npm test` before submitting a PR

## Pull Request Process

1. Fork the repo and create a feature branch
2. Keep PRs focused — one feature or fix per PR
3. Include a description of what changed and why
4. Tests for new functionality are appreciated

## Reporting Bugs

Open an issue on GitHub with:
- Browser name and version
- Steps to reproduce
- Expected vs actual behaviour
- Console errors if any (F12 → Console)
