# Working on nofi

Nofi renders low-fidelity mockups from plain `.pug` files with Tailwind utilities. Keep source free of metadata headers; labels and dimensions belong in runtime options or project config.

Use Node.js 22+, native ES modules, and the existing small module structure. The library has no build step. The static playground uses `pnpm site:build`; its generated `docs/index.html` and `docs/playground/` output is ignored by Git and built by the Pages workflow. Run `pnpm site:build` to verify playground or shared renderer changes. Keep parsing declarative: never evaluate template code or attribute expressions. Use the Pug lexer/parser rather than inventing an incompatible indentation parser.

Run `pnpm test` and `pnpm run format:check`. For layout, theme, board, or screenshot changes, run `pnpm run test:browser` after installing Playwright Chromium. If dependencies or browser execution are unavailable, state which checks did not run.

Keep README commands accurate. Avoid badges or package installation instructions that imply an unpublished release exists. Instructions for agents using nofi are in `docs/agents.md`.

Generated mockups should use semantic colour utilities (`bg-primary`, `text-primary-foreground`, `bg-muted`, `border-border`) rather than fixed palettes or colour literals. Keep colour values in theme CSS. See `docs/themes.md` for the supported roles.
