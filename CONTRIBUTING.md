# Contributing to nofi

Nofi is an early prototype. Useful contributions include small reproducible bug reports, clearer examples, parser diagnostics, and improvements to the default wireframe treatment.

## Local setup

Use Node.js 22 or newer, then run `pnpm install`. Run `pnpm test` and `pnpm run format:check` before opening a pull request. Run `pnpm run format` to format changes. Renderer changes also need `pnpm exec playwright install chromium` and `pnpm run test:browser`.

## Where things live

- `src/parse.js`: declarative Pug rendering.
- `src/index.js`: themes, boards, and screenshots.
- `src/document.js`: shared Tailwind compilation and HTML output.
- `src/board-config.js`: board manifest validation and path resolution.
- `src/cli.js`: command-line interface.
- `playground/`: browser editor and preview; `pnpm site:build` generates the committed GitHub Pages assets in `docs/`.
- `scripts/`: playground preparation and local preview server.
- `themes/`: default wireframe skin and a theme example.
- `examples/`: different layouts for the same project dashboard brief.
- `test/`: behaviour and browser checks.
- `docs/agents.md`: instructions for agents generating mockups.

## Design principles

Keep the source familiar. Prefer existing HTML and Tailwind concepts over new syntax. Make an unstyled button look useful. Keep output portable. Make errors actionable. Preserve viewport behaviour when comparing layouts.

For behavioural changes, include a focused test and the smallest example that demonstrates the outcome. Explain the problem and resulting behaviour in the pull request. Discuss larger syntax changes in an issue before implementing them.

Please be respectful, specific, and constructive in issues and reviews.

## Playground checks

Run `pnpm test:playground` to compare the browser bundle against the CLI across all examples, both themes, and mobile/desktop dimensions. Run `pnpm test:playground:browser` for editor, example, viewport, error, and download interactions. These interaction tests require Playwright Chromium. Keep generated Pages assets in sync with `pnpm site:build`.
