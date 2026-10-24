# Development and hosting

Requires Node.js 22+ and pnpm 11.10.0. From this checkout:

```sh
pnpm install
pnpm cli render examples/01-sidebar.pug -o output/sidebar.html
pnpm check
```

For PNGs and browser tests, install Chromium once with `pnpm cli setup`. Run `pnpm test:browser` and `pnpm test:playground:browser` for browser verification.

## Playground

`pnpm site:dev` builds the static playground and serves it at `http://localhost:4173`. Rebuild after changing source, examples, or themes. The browser editor renders locally without a backend. It exports Pug and HTML; PNG export uses the CLI.

## GitHub Pages

Run `pnpm site:build` and commit `docs/index.html`, `docs/playground/`, and `docs/.nojekyll` with the source. In GitHub **Settings → Pages**, choose **Deploy from a branch → main → /docs**. Relative asset paths support repository subpaths. No custom Actions workflow is required; GitHub still runs its own Pages deployment workflow.

The repository is [lukeda/nofi](https://github.com/lukeda/nofi) and the Pages URL is [lukeda.github.io/nofi](https://lukeda.github.io/nofi/). Set the repository About website to that Pages URL after enabling deployment. These destinations are configured in the package metadata; they are not deployed by the local build.

See [GitHub's publishing guide](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## README visuals

The README embeds two PNG boards. To regenerate them after changing their examples:

```sh
pnpm cli board examples/login.board.yaml -o docs/assets/layout-options.png
pnpm cli board examples/screens.board.yaml -o docs/assets/screen-wireframes.png
```

The first compares four layouts for the same sign-in screen; the second shows four different app screens. Chromium must be installed and runnable for PNGs. Run the same commands with `.html` output paths to refresh the linked HTML boards without a browser. Commit regenerated assets with the example changes.

## Package distribution

The package already exposes the `nofi` binary and ships source, themes, examples, and the skill. `pnpm pack --dry-run` checks the package contents. The package is named `@lukeda/nofi`, with public publishing configured and GitHub, Pages, and issue links set. Publishing requires access to the npm `lukeda` scope.

To run a specific version:

```sh
npx --yes @lukeda/nofi@<version> board board.yaml -o board.html
npx --yes @lukeda/nofi@<version> setup
```

Replace `<version>` with a published version. `npx` resolves and caches the package; it does not require a global or project installation. Chromium is a separate download, installed by `setup` using the renderer's matching Playwright version. HTML does not require Chromium. A project-local pinned dev dependency is useful for repeated/reproducible workflows but is optional.

The unscoped npm name `nofi` belongs to another package. Always use `@lukeda/nofi` for this project.

Before publishing, verify the project:

```sh
pnpm install --frozen-lockfile
pnpm cli setup
pnpm check
pnpm test:browser
pnpm test:playground:browser
pnpm pack --dry-run
```

Keep the generated Pages files in sync with source changes.
