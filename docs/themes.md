# Themes

The wireframe theme supplies defaults for semantic HTML. Use layout utilities in Pug and semantic colour utilities when a component needs emphasis. Actual colour values belong in the theme.

```pug
section.bg-muted.text-foreground.border.border-border.p-4
  h2 Profile
  p.text-muted-foreground Update your account details.
  button.bg-primary.text-primary-foreground Save changes
```

## Colour roles

These are real Tailwind utilities, available in the CLI and playground. Their values follow the selected theme.

| Role                 | Utilities                                | Theme variables                                   |
| -------------------- | ---------------------------------------- | ------------------------------------------------- |
| Page                 | `bg-background text-foreground`          | `--nofi-paper`, `--nofi-ink`                      |
| Primary action       | `bg-primary text-primary-foreground`     | `--nofi-primary`, `--nofi-primary-foreground`     |
| Secondary action     | `bg-secondary text-secondary-foreground` | `--nofi-secondary`, `--nofi-secondary-foreground` |
| Subtle surface       | `bg-muted text-foreground`               | `--nofi-muted`, `--nofi-ink`                      |
| Supporting text      | `text-muted-foreground`                  | `--nofi-muted-foreground`                         |
| Selection / emphasis | `bg-accent text-accent-foreground`       | `--nofi-accent`, `--nofi-accent-foreground`       |
| Divider / outline    | `border border-border`                   | `--nofi-line`                                     |

Pair primary, secondary, and accent backgrounds with their matching foreground. The wireframe theme stays grayscale; Blueprint supplies its blue palette. Custom themes can make these roles more distinct.

Tailwind variants and opacity modifiers work too: `hover:bg-accent`, `md:bg-muted`, or `bg-primary/10`. For a translucent tint on the page surface, use normal `text-foreground`. Use quoted class attributes for punctuation, for example `div(class="bg-primary/10")`. Numeric shade scales such as `primary-100` are not defined.

Avoid fixed palettes (`bg-gray-100`, `text-blue-600`), white/black utilities, and hex/RGB literals in generated mockups unless a user requests an exact colour. They remain supported and override theme defaults, but keep the same colour when themes change.

## Author a theme

A custom theme is plain CSS layered on top of the wireframe defaults and below Tailwind utilities:

```css
:root {
  --nofi-ink: #263238;
  --nofi-paper: #fffdf7;
  --nofi-muted: #f3efe2;
  --nofi-muted-foreground: #68645b;
  --nofi-line: #a9a393;
  --nofi-primary: #315d45;
  --nofi-primary-foreground: #ffffff;
  --nofi-accent: #e0ecdf;
  --nofi-accent-foreground: #263238;
}

body {
  font-family: Georgia, serif;
}
button {
  border-radius: 6px;
}
```

```sh
pnpm cli render examples/01-sidebar.pug --theme ./brand.css -o output/brand.html
```

Write ordinary CSS rules, without an enclosing cascade layer. Nofi places your rules in `components` after the default theme; Tailwind utilities occupy the later `utilities` layer. The renderer maps semantic utilities to theme variables using Tailwind's inline theme tokens.

Existing themes that define only ink, paper, muted, and line still work. Primary defaults to ink with paper text; secondary and accent default to muted with ink text. Override paired roles together when adding your own colours. Themes can also target individual elements. Changing typography can affect wrapping and element sizes.

Themes should be self-contained. External fonts, imports, and images are not part of the supported theme contract. Use system fonts. See `themes/blueprint.css` for a small example.
