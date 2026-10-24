---
name: nofi
description: Create low-fidelity interface mockups and comparison boards with nofi using Pug and Tailwind. Use when the user wants wireframes, alternative UI layouts, or nofi mockups before implementation.
---

# Create and render mockups with nofi

Turn the user's brief into a rendered PNG comparison board. Write the layouts, render them, inspect the result, fix problems, and return the images or shared file paths. Keep working through actionable errors until the visuals are ready. Pasted Pug, raw HTML, and descriptions are not finished mockups unless the user asks for source only.

Treat exploratory mockups as planning artifacts. Choose sensible dimensions and filenames from the brief. Set `NOFI_ARTIFACT_DIR` to an absolute path in the host-designated artifact or temporary location, and use it for mockup sources and renders. Keep project source unchanged during exploration. Do not ask the user to choose a delivery format or confirm routine steps. A shared image path is a useful deliverable even without an inline image viewer.

## Run the renderer

Use `npx --yes @lukeda/nofi@latest`. Assume the user has no local installation or checkout. Start with the render command; do not search home directories, inspect the skill folder for renderer code, or look for `src/cli.js`. Only use local source when the user explicitly asks to test it and supplies the location. The unscoped npm package `nofi` is a different project.

Node.js 22+ is required. PNG export uses Chromium. If the renderer reports that the browser is missing, install it and retry:

```sh
npx --yes @lukeda/nofi@latest setup
```

## Create alternatives

1. Identify the screen's purpose, required content, and target viewport from the brief.
2. Create structurally different options: navigation placement, hierarchy, density, cards versus lists, or split versus stacked views. Keep the same required content across alternatives for one screen. Four options are a useful default; follow the user's requested count.
3. Start with inline Pug in a stdin board manifest. Do not create `.pug` files or `board.yaml` as a preliminary step for a one-off exploration. Use separate files when the user requests reusable sources or when iteration would benefit from them. Pug files contain markup only, with no metadata header.
4. Render the board as PNG. Inspect it using an image-reading or browser tool, then correct clipping, unreadable text, and missing content. If inspection tools are unavailable, return the image and state that it was not visually inspected.
5. Present the board with clear option labels. Retain the source and output while the user chooses. Carry the selected layout and content hierarchy into the high-fidelity implementation.

## Inline board

Use the inline stdin board first for one-off comparisons, including planning workflows. It avoids dedicated file-tool calls for source creation: the manifest and Pug go directly to the renderer. PNG export still writes the output artifact; inline mode does not change the host’s write rules. Resolve `NOFI_ARTIFACT_DIR` from the host's environment instructions first; it is a task variable, not a predefined environment variable. Replace the placeholder below with that actual absolute directory and the sample content with the user's brief:

```sh
NOFI_ARTIFACT_DIR="/absolute/host-designated/artifact-directory/nofi-session"

npx --yes @lukeda/nofi@latest board - -o "$NOFI_ARTIFACT_DIR/options.png" <<'EOF_BOARD'
viewport: [800, 600]
columns: 2
items:
  - name: Sidebar navigation
    pug: |
      main.flex.gap-6.p-6
        nav.w-40.shrink-0.space-y-3
          h2 Acme
          a.block Projects
          a.block Team
        section.flex-1.space-y-4
          h1 Projects
          button New project
          article.border.p-4 Website
  - name: Top navigation
    pug: |
      main.space-y-6.p-6
        header.flex.items-center.justify-between
          h2 Acme
          nav.flex.gap-4
            a Projects
            a Team
        section.space-y-4
          h1 Projects
          button New project
          article.border.p-4 Website
EOF_BOARD
```

Keep the assignment and render command as separate lines in the same shell invocation. Do not collapse them into `NOFI_ARTIFACT_DIR=... npx ... -o "$NOFI_ARTIFACT_DIR/options.png"`: the shell expands the output argument before that prefix assignment takes effect. Across separate shell invocations, repeat the assignment or use the literal absolute output path; do not assume the variable persists.

Revise an inline board by sending the complete updated manifest again.

Each item accepts exactly one of `pug` or `file`, plus optional `name`. Mix inline and file-backed items when useful. Unnamed inline items use “Option N” by board position. Keep the inline source available for iteration and selection.

## Files and reusable boards

For larger iterations, save each layout to a descriptive `.pug` file under `NOFI_ARTIFACT_DIR` using quoted heredocs or file tools. Use a unique subdirectory for each exploration. Keep it until the user has selected a layout; do not delete deliverables with an exit trap.

```sh
npx --yes @lukeda/nofi@latest board "$NOFI_ARTIFACT_DIR"/*.pug --columns 2 --viewport 800x600 -o "$NOFI_ARTIFACT_DIR/options.png"
npx --yes @lukeda/nofi@latest render "$NOFI_ARTIFACT_DIR/sidebar.pug" -o "$NOFI_ARTIFACT_DIR/sidebar.png"
npx --yes @lukeda/nofi@latest board "$NOFI_ARTIFACT_DIR/board.yaml" -o "$NOFI_ARTIFACT_DIR/options.png"
```

A reusable manifest saved as `$NOFI_ARTIFACT_DIR/board.yaml`, alongside its Pug files:

```yaml
viewport: [800, 600]
columns: 2
theme: wireframe
items:
  - file: sidebar.pug
    name: Sidebar navigation
  - file: topbar.pug
    name: Top navigation
```

File and custom theme paths in a board resolve relative to the manifest file; stdin paths resolve from the working directory. Output paths always resolve from the working directory. Use absolute paths when running from a different directory. Labels default to filenames: `01-sidebar-layout.pug` becomes “Sidebar layout”. Use item names for custom board labels or `--title` for a single render; the CLI does not accept `--names`.

Use `.html` output for a standalone browser preview. `--stdout` emits only HTML and cannot be combined with `--output`; use it to feed a preview tool, not to dump markup into chat. Return an image, attachment, preview link, or exact shared file path that the user can open.

## Pug and Tailwind

Prefer semantic HTML and layout utilities. Let the theme style buttons, inputs, and headings. Use `figure` with `figcaption` for crossed image placeholders.

Use quoted `class` attributes for decimal spacing (`py-0.5`, `gap-2.5`), fractions (`w-2/3`), variants (`md:flex-row`), arbitrary values (`text-[13px]`), and opacity (`bg-primary/10`). Simple classes such as `.flex` and `.p-4` work in dot shorthand.

```pug
span.rounded-full(class="py-0.5 px-2 text-xs bg-primary/10") Paid
figure.h-40
  figcaption Project preview
```

Do not write `.py-0.5` or `.w-2/3`: punctuation-bearing classes need the quoted attribute. Write repeated elements explicitly. Attributes accept literal strings, numbers, or booleans only. Pug JavaScript, interpolation, loops, includes, mixins, raw HTML, scripts, external images, inline styles, event handlers, and embedded content are unsupported. Links are visual placeholders without `href`.

### Theme-aware colour

Use semantic utilities instead of palette names, `white`/`black`, or colour literals unless the user requests an exact colour. Put brand colours in theme CSS.

- Page surfaces: `bg-background text-foreground`.
- Primary actions: `bg-primary text-primary-foreground`.
- Secondary actions: `bg-secondary text-secondary-foreground`.
- Subtle panels: `bg-muted text-foreground`; supporting text: `text-muted-foreground`.
- Selection/emphasis: `bg-accent text-accent-foreground`.
- Outlines: `border-border` with `border`, `border-b`, etc.

Pair surfaces with their matching foreground. Use `bg-primary/10` with `text-foreground` for a subtle tint; names such as `primary-100` are unsupported.

## Dimensions and themes

Default viewport: 640×480. Dimensions must be integers from 1 to 4096; board columns range from 1 to 8. Columns arrange the supplied layouts, not generate them.

Precedence: CLI flags → board manifest → project config → built-in defaults. The CLI finds the nearest `nofi.config.yaml` from the working directory upward. Project config supports `viewport: [800, 600]` and `theme: wireframe`.

`wireframe` is the default theme. Use `--theme blueprint` or `--theme ./brand.css` when requested. Custom CSS extends wireframe; explicit Tailwind utilities override theme defaults. Config theme paths resolve relative to the config file; CLI paths resolve from the working directory. PNGs and board frames use the selected viewport; standalone HTML fills its browser window.

## Fix rendering errors

Read the actual error, correct its cause, and rerun the render. Board commands report the first failure from every failing input together. Fix all reported inputs before retrying; more errors within a source may appear on the next pass.

For Tailwind shorthand errors, move all punctuation-bearing classes in the affected source into quoted attributes. For missing files, check the command's working directory and use the correct absolute paths. For a missing Chromium installation, run `setup` and retry.

Failed boards leave existing output untouched. Verify that the new render succeeded before presenting an image; never mistake a stale artifact for the result. Report any unresolved error accurately rather than claiming a render or inspection succeeded.
