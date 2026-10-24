---
name: nofi
description: Create low-fidelity interface mockups and comparison boards with nofi using Pug and Tailwind. Use when the user wants wireframes, alternative UI layouts, or nofi mockups before implementation.
---

# Generate mockups with nofi

Use this single skill to create Pug mockups, render a comparison board, and carry the selected source into implementation. Complete the generation and rendering workflow when requested and permitted by the active mode. Label source-only proposals as unrendered.

## Deliver visuals without a format questionnaire

Default to a rendered PNG comparison board when the user asks for mockups. Choose reasonable filenames, dimensions, and temporary locations from the brief and available permissions. Do not ask the user to choose between inline Pug, HTML, and images, or to confirm routine rendering steps that are already authorized.

Use the host's actual instructions and capabilities, not the mode name alone. Planning may allow temporary visual artifacts while prohibiting project edits. When temporary output and browser execution are allowed, render and show the PNG directly. Inline `pug` in a board manifest avoids creating separate source files; use `-o` for the image in a permitted location.

When file creation is prohibited but execution is allowed, inline Pug with `--stdout` can return HTML for a host-provided preview. Use it only if the host permits the renderer invocation, including any npm cache writes; do not assume a preinstalled copy exists. If no visual route is permitted, provide concise Pug/layout proposals automatically, marked unrendered, and state the concrete blocker. Do not interrupt with a delivery-choice question.

Respect explicit restrictions: a mode that permits only a plan document does not permit PNGs elsewhere, and `/tmp` is not automatically exempt. Do not switch tools to bypass a denied operation, alter permissions automatically, or install packages/browsers when writes are forbidden. Use a native approval request only when the host requires it for the operation; this skill adds no extra confirmation step.

## Renderer setup

Assume the user has no local nofi installation or source checkout. Use `npx --yes @lukeda/nofi@latest` as the first renderer invocation; run the render command directly rather than discovering installations. Node.js 22+ is required. Skill installation supplies instructions; `npx` fetches the renderer separately. The unscoped npm name `nofi` belongs to another project; always use `@lukeda/nofi`.

Run commands from the user's mockup project directory so nofi finds that project's `nofi.config.yaml`. Do not search home/development directories, inspect the installed skill folder for renderer code, run `command -v nofi`, or look for `src/cli.js` as setup. The installed skill contains instructions; it is not a renderer checkout.

PNG export requires Chromium: run `npx --yes @lukeda/nofi@latest setup` once to install the browser matching the renderer’s Playwright version. HTML output requires no browser installation.

Only use a source checkout when the user explicitly asks to test local renderer changes and provides its location. If `npx` fails, report and address that specific error within the host’s permissions; do not silently switch to a discovered local copy.

## Browser execution permissions

When PNG output is needed, check browser execution with one small render before generating a large batch. A missing browser needs `setup`; a sandbox launch denial needs execution permission. Neither skill installation nor `npx` grants that permission.

If the host supports approval requests, request permission for the specific rendering command outside the sandbox after a sandbox denial. Respect the active approval policy; do not retry a forbidden escalation or change the user's permissions automatically. In standalone Codex CLI, users can enable requests with `codex --sandbox workspace-write --ask-for-approval on-request`. Host applications and managed policies may override this setting. If requests are disabled or an outer container still blocks Chromium, explain the blocker and provide the generated HTML and exact local rendering command. Do not claim PNG output or visual inspection succeeded.

## Generate alternatives

1. Establish the screen's purpose, required content, and target viewport from the user's brief.
2. Define one Pug source per option, either as inline `pug` in a board manifest or as a `.pug` file. Give each a descriptive, stable filename; labels are derived from filenames. Use the user’s requested output directory, or a unique temporary directory for disposable exploration, only where the active mode permits artifact creation. Keep those sources available through selection and iteration.
3. Write plain declarative Pug with Tailwind utilities; do not add YAML frontmatter or other metadata. Set a shared `viewport: [width, height]` in `nofi.config.yaml`, or pass CLI `--viewport WIDTHxHEIGHT`. Without either setting the viewport is 640×480.
4. Make options structurally different: navigation position, information hierarchy, content density, cards versus lists, or split versus stacked views. Preserve the brief's required content across options.
5. Render a comparison board and show the output. Inspect for clipping and unreadable text before presenting it.
6. When the user chooses, identify the exact source file or named inline item and retain that Pug as the implementation reference. Carry forward its layout and content hierarchy, then design the high fidelity treatment.

```pug
main.flex.gap-6.p-6
  nav.flex.w-40.shrink-0.flex-col.gap-3
    a Profile
    a Notifications
    a Billing
  section.flex.flex-1.flex-col.gap-4
    h1 Profile
    input(placeholder="Your name")
    input(placeholder="Email address")
    button Save changes
```

Prefer semantic HTML and layout utilities. Let the theme style buttons, inputs, and headings. Use `figure` with `figcaption` for image placeholders. Use quoted `class` attributes for decimal spacing (`py-0.5`, `gap-2.5`), fractions (`w-2/3`), variants (`md:flex-row`), arbitrary values (`text-[13px]`), and opacity (`bg-primary/10`). For example, write `span.rounded-full(class="py-0.5 px-2 text-xs bg-primary/10") Paid`, never `.py-0.5` or `.w-2/3`. Simple classes such as `.flex` and `.p-4` can stay in dot shorthand.

### Theme-aware colour

Use semantic Tailwind colour utilities instead of fixed colours in generated Pug. Avoid palette names (`bg-gray-100`, `text-blue-600`), `white`/`black`, hex/RGB values, and arbitrary colour literals unless the user explicitly requests an exact colour. Put brand colours in theme CSS, not individual mockups.

- Page surfaces: `bg-background text-foreground`.
- Primary actions: `bg-primary text-primary-foreground`.
- Secondary actions: `bg-secondary text-secondary-foreground`.
- Subtle panels: `bg-muted text-foreground`; supporting text: `text-muted-foreground`.
- Selected items or emphasis: `bg-accent text-accent-foreground`.
- Dividers and outlines: `border-border` alongside `border`, `border-b`, etc.

Pair coloured surfaces with their matching foreground to keep text readable across light and dark themes. Use opacity modifiers such as `bg-primary/10` for a subtle tint, with normal `text-foreground`, rather than inventing unsupported names like `primary-100`. Existing literal colour utilities still work but do not adapt to themes.

```pug
section.bg-muted.text-foreground.border.border-border.p-4
  h2 Profile
  p.text-muted-foreground Update your account details.
  button.bg-primary.text-primary-foreground Save changes
```

Do not use Pug JavaScript expressions, interpolation, loops, includes, mixins, raw HTML, or scripts. Write repeated elements explicitly. Attributes accept literal values only. Use common structural HTML, text, lists, tables, forms, and figures. Links are visual placeholders without `href`. External images, inline styles, event handlers, and embedded content are unsupported; use figure placeholders instead.

## Render and compare

From the mockup project directory:

```sh
npx --yes @lukeda/nofi@latest board mockups/*.pug --columns 2 -o output/options.html
npx --yes @lukeda/nofi@latest board mockups/*.pug --columns 2 -o output/options.png
npx --yes @lukeda/nofi@latest render mockups/sidebar.pug -o output/sidebar.png
```

### Inline board without mockup files

For a permitted no-output-file workflow, put each layout directly in the YAML and emit HTML to stdout. For normal visual delivery, use the same inline items with `-o /permitted/path/board.png` instead of `--stdout`:

```sh
npx --yes @lukeda/nofi@latest board - --stdout <<'EOF'
viewport: [640, 480]
columns: 2
items:
  - name: Sidebar
    pug: |
      main.flex.gap-4.p-6
        aside.w-40 Navigation
        section.flex-1 Content
  - name: Top navigation
    pug: |
      main.space-y-4.p-6
        nav Navigation
        section Content
EOF
```

Each item accepts exactly one of `pug` or `file`, plus an optional `name`. Mix inline and file-backed items when useful. Unnamed inline items are labeled “Option N” by their board position. To save an artifact when writes are permitted, replace `--stdout` with `-o board.html` or `-o board.png`.

`--stdout` emits HTML only, has no success message, and cannot be combined with `--output`. Nofi creates no source or output files and launches no browser for this path. In read-only modes, `npx` may still require cache writes or package downloads. If those are prohibited, report the limitation rather than searching for local source or assuming that an installed binary exists. A shell may use a temporary file for a heredoc; use only the host's permitted input mechanism. Do not redirect stdout to a file or use this path to bypass an execution denial. If there is no permitted command/preview route, provide the Pug in the response as an unrendered proposal.

Keep the inline source available in the conversation so the selected item can be reused without reconstructing it from HTML.

### Temporary exploration in one shell invocation

Use this pattern only when file creation and rendering are permitted. Heredocs are a file-writing convenience, not an exception to plan/read-only restrictions. Multiple quoted heredocs can run in one multiline shell command. Use one file per layout and render them together; there is no need to compress the script into one line. This small example demonstrates the mechanics; adapt content and layout depth to the brief:

```sh
nofi_workdir=$(mktemp -d "${TMPDIR:-/tmp}/nofi.XXXXXX") || exit 1

cat > "$nofi_workdir/01-sidebar.pug" <<'PUG'
main.flex.gap-6.p-6
  nav.w-32.shrink-0
    h2 Workspace
    p Projects
    p Activity
  section.flex-1
    h1 Projects
    article.border.p-4 Project Alpha
PUG

cat > "$nofi_workdir/02-topbar.pug" <<'PUG'
main.flex.flex-col.gap-6.p-6
  header.flex.justify-between
    h2 Workspace
    button New project
  h1 Projects
  article.border.p-4 Project Alpha
PUG

cat > "$nofi_workdir/03-split.pug" <<'PUG'
main.grid.grid-cols-2.gap-6.p-6
  section
    h1 Projects
    button Project Alpha
  aside.border.p-4
    h2 Project Alpha
    p Project details
PUG

cat > "$nofi_workdir/04-list.pug" <<'PUG'
main.flex.flex-col.gap-4.p-6
  h1 Projects
  input(placeholder="Find a project")
  article.flex.justify-between.border-b.p-4
    span Project Alpha
    button Open
PUG

(
  cd "$nofi_workdir" || exit 1
  npx --yes @lukeda/nofi@latest board - -o board.html <<'YAML'
viewport: [800, 600]
columns: 2
items:
  - file: 01-sidebar.pug
    name: Sidebar navigation
  - file: 02-topbar.pug
    name: Top navigation
  - file: 03-split.pug
    name: Split view
  - file: 04-list.pug
    name: Compact list
YAML
)
```

Use `.png` output when an image is needed and Chromium is available. Return the actual artifact path using the host’s file/image display capabilities. Keep the directory until the user has selected a layout; do not attach an exit trap that deletes the deliverables. For a durable handoff, copy the selected Pug to the project’s chosen location. If PNG rendering is unavailable, provide the HTML and explain the limitation; inspect it only if browser tools are available.

The CLI accepts Pug file paths, a single YAML manifest, or `board -` for YAML on stdin. A manifest supports `viewport`, `theme`, `columns`, and `items` containing exactly one of `file` or `pug`, plus optional `name`. Paths resolve relative to the manifest file, or the working directory for stdin. Output paths resolve from the working directory. CLI flags override manifest settings. Temporary exploration needs no project config; a saved manifest is useful for repeatable boards.

Generate the number of alternatives the user needs; four strong options are a useful starting point. Expand to sixteen when exploring a broader design space. Do not equate a themed render with a finished implementation.

## Shared settings and themes

A project-level `nofi.config.yaml` can contain:

```yaml
viewport: [640, 480]
theme: wireframe
```

Viewport precedence is CLI `--viewport 390x844`, board manifest, project config, then 640×480. Dimensions must be integers from 1 to 4096. The CLI uses the nearest config in the working directory or its ancestors. Standalone HTML fills the browser window; PNGs and board frames use the resolved viewport.

The default `wireframe` theme supplies the basic visual treatment. Use `--theme blueprint` or `--theme ./brand.css` when requested. Custom CSS extends wireframe defaults; explicit Tailwind utilities override theme defaults. Config theme paths resolve relative to the config file, and CLI paths relative to the working directory.

A board's `--columns 4` arranges sixteen supplied files into four columns; it does not generate options. Retain each file and use its displayed filename to identify the user's choice. If rendering fails, report the actual failure and keep the source files available; do not present an unrendered layout as inspected output.

## Runtime labels

Use descriptive filenames such as `sidebar-layout.pug`; nofi derives “Sidebar layout”. Prefer these filename-derived labels for boards so agents do not need to coordinate a separate ordered list of names. For a single render, use `--title "Project overview"`. Labels and viewport options stay outside Pug source. Use a board manifest when labels need to differ from filenames; the CLI does not accept JSON `--names`.

## Fixing render errors

Board commands report the first failure from each failing input in one run, including file paths or inline item numbers/names. Fix every reported input before retrying. Errors within an individual Pug file may still require another pass. Failed boards produce no new output and leave existing output untouched; do not mistake an older artifact for a successful render. For a Tailwind shorthand hint, move all punctuation-bearing classes in the affected source to quoted attributes, not just the first reported class.
