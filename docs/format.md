# Pug mockups

A mockup is a `.pug` file containing declarative Pug with Tailwind classes. There is no metadata header.

```pug
main.flex.flex-col.gap-4.p-6
  h1 Projects
  button New project
```

## Labels and dimensions

Nofi derives labels from filenames: `01-sidebar-layout.pug` becomes “Sidebar layout”. A single render can override this with `--title "Project overview"`. For named comparison boards, use a YAML manifest.

## Boards

From a checkout, run `pnpm cli board examples/projects.board.yaml -o output/board.html`. Direct Pug inputs also work: `pnpm cli board examples/*.pug --columns 4 -o output/board.html`.

For a one-off board, pipe YAML directly without saving a manifest:

```sh
pnpm cli board - -o output/board.html <<'EOF'
viewport: [640, 480]
theme: wireframe
columns: 2
items:
  - file: examples/01-sidebar.pug
    name: Sidebar navigation
  - file: examples/02-topbar.pug
    name: Top navigation
EOF
```

Each item requires `file`; `name` is optional and defaults to the filename. A manifest needs at least one item. File and custom theme paths resolve relative to the manifest file, or the working directory for stdin. Output paths always resolve from the working directory. Do not combine a manifest with other positional inputs. The CLI's former `--names` JSON option is replaced by item names in YAML.

Shared `viewport`, `theme`, and `columns` are optional. Dimensions must be integers from 1 to 4096; columns range from 1 to 8. Precedence is **CLI flags → board manifest → project config → built-in defaults**. Project config supports viewport and theme, while columns default to 4.

Set `viewport: [640, 480]` and `theme: wireframe` in `nofi.config.yaml` for project defaults. Discovery starts in the working directory and searches ancestors. CLI flags such as `--viewport 390x844` and `--theme blueprint` override the whole batch. Without settings, dimensions are 640×480 and the theme is wireframe.

## Library and viewport behaviour

Library callers use `render(source, { filename: 'sidebar.pug', title: 'Sidebar', viewport: [640, 480] })`. `title` is optional; without a filename or title the label is “Mockup”. `board(mockups, { names: ['Sidebar', 'Cards'] })` overrides board labels. Pass `defaults: await loadConfig()` to use project defaults; the library does not discover config automatically. Different viewport sizes in one board can be supplied by rendering each source with different options before calling `board()`.

Viewport dimensions control PNG exports and board frames. Standalone HTML fills the browser window. Playground controls select viewport and theme independently of the source; a downloaded `.pug` contains only markup.

## Markup

Indentation nests elements. Dots add classes. Text after the tag and classes is literal content. Pug's `|` text lines and static attributes are supported. An optional `body` must be the only root element. Otherwise the renderer supplies it.

Use quoted class attributes for Tailwind classes containing punctuation:

```pug
div(class="grid grid-cols-1 md:grid-cols-2 gap-2.5")
  input(type="text" placeholder="Project name")
  button.bg-primary.text-primary-foreground Create
```

Use semantic colours from [the theme guide](themes.md) so mockups adapt to different themes.

Nofi supports a declarative subset of Pug, not its full template programming language. Attribute values must be string, number, or boolean literals. Arrays, objects, functions, interpolation, loops, mixins, includes, extends, filters, raw HTML, and executable JavaScript are unsupported. Text is HTML-escaped. Errors refer to the original source line numbers.

Common structural HTML, headings, text, lists, tables, forms, and figures are supported. The exact tag and attribute allowlists live in `src/parse.js`. Event handlers, URLs, scripts, embedded content, and inline styles are excluded. Links are visual placeholders without navigation.

## Image placeholders

```pug
figure.h-40
  figcaption Product image
```

The default theme renders a crossed rectangle. External images are not loaded.

## Migration from .nofi

Remove the `---` metadata block and rename the file to `.pug`. Move dimensions and theme to project config or render options. Use filenames, `--title`, or board item names for labels. The playground migrates old saved drafts to plain Pug when restoring them.
