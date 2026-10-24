import { escapeHtml } from './parse.js';
import { compile } from 'tailwindcss';

const policy =
  "default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src data:; frame-src 'self' about:; base-uri 'none'; form-action 'none'";
export const head = (title) =>
  `<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="${policy}"><title>${escapeHtml(title)}</title>`;

const semanticColors = `@theme inline {
  --color-background: var(--nofi-paper);
  --color-foreground: var(--nofi-ink);
  --color-primary: var(--nofi-primary);
  --color-primary-foreground: var(--nofi-primary-foreground);
  --color-secondary: var(--nofi-secondary);
  --color-secondary-foreground: var(--nofi-secondary-foreground);
  --color-muted: var(--nofi-muted);
  --color-muted-foreground: var(--nofi-muted-foreground);
  --color-accent: var(--nofi-accent);
  --color-accent-foreground: var(--nofi-accent-foreground);
  --color-border: var(--nofi-line);
}`;

/** Compile the same document in Node and the browser. */
export async function renderDocument(
  parsed,
  { base, extra = '', loadStylesheet },
) {
  const input = `@layer theme, base, components, utilities;\n@import "tailwindcss/theme.css" layer(theme);\n@import "tailwindcss/preflight.css" layer(base);\n${semanticColors}\n@layer components { ${base}\n${extra} }\n@tailwind utilities;`;
  const compiler = await compile(input, { loadStylesheet });
  const css = compiler.build(parsed.classes).replace(/<\/style/gi, '<\\/style');
  return {
    title: parsed.title,
    viewport: parsed.viewport,
    html: `<!doctype html><html lang="en"><head>${head(parsed.title)}<style>${css}</style></head>${parsed.html}</html>`,
  };
}
