import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { head, renderDocument } from './document.js';
import { parseNofi, escapeHtml } from './parse.js';
import { validateNames } from './labels.js';
export { parseNofi } from './parse.js';
export { loadConfig } from './config.js';

const require = createRequire(import.meta.url);
const themePath = (name) => new URL(`../themes/${name}.css`, import.meta.url);
/** Render a Pug source into a standalone HTML document. */
export async function render(
  source,
  { theme, filename, title, viewport, defaults = {} } = {},
) {
  theme = theme ?? defaults.theme ?? 'wireframe';
  const parsed = parseNofi(source, { filename, title, viewport, defaults });
  const base = await readFile(themePath('wireframe'), 'utf8');
  const extra =
    theme === 'wireframe'
      ? ''
      : await readFile(
          theme === 'blueprint' ? themePath(theme) : theme,
          'utf8',
        );
  return renderDocument(parsed, {
    base,
    extra,
    loadStylesheet: async (id) => {
      const path = require.resolve(id);
      return {
        path,
        base: dirname(path),
        content: await readFile(path, 'utf8'),
      };
    },
  });
}

/** Build a comparison board. Each iframe retains its original viewport. */
export function board(
  mockups,
  { columns = 4, thumbnailWidth = 320, names } = {},
) {
  if (!mockups.length) throw new Error('A board needs at least one mockup.');
  if (names !== undefined) {
    validateNames(names, mockups.length);
    mockups = mockups.map((mockup, index) => ({
      ...mockup,
      title: names[index],
    }));
  }
  if (!Number.isInteger(columns) || columns < 1 || columns > 8)
    throw new Error('columns must be an integer from 1 to 8.');
  if (
    !Number.isInteger(thumbnailWidth) ||
    thumbnailWidth < 100 ||
    thumbnailWidth > 1024
  )
    throw new Error('thumbnailWidth must be an integer from 100 to 1024.');
  columns = Math.min(columns, mockups.length);
  const cards = mockups
    .map((mockup, i) => {
      const [width, height] = mockup.viewport;
      const scale = thumbnailWidth / width;
      return `<article><header><b>${String.fromCharCode(65 + (i % 26))}${i >= 26 ? Math.floor(i / 26) : ''}</b> <span>${escapeHtml(mockup.title)}</span></header><div class="mockup-frame"><div class="preview" style="width:${thumbnailWidth}px;height:${height * scale}px"><iframe sandbox title="${escapeHtml(mockup.title)}" width="${width}" height="${height}" style="transform:scale(${scale});transform-origin:top left" srcdoc="${escapeHtml(mockup.html)}"></iframe></div></div><footer>${width} × ${height}${mockup.filename ? ` · ${escapeHtml(mockup.filename)}` : ''}</footer></article>`;
    })
    .join('');
  const width = columns * (thumbnailWidth + 2) + (columns - 1) * 20 + 48;
  const rowHeights = [];
  for (let i = 0; i < mockups.length; i += columns)
    rowHeights.push(
      Math.max(
        ...mockups
          .slice(i, i + columns)
          .map((m) => (m.viewport[1] * thumbnailWidth) / m.viewport[0]),
      ) + 86,
    );
  const height = Math.ceil(
    48 + rowHeights.reduce((a, b) => a + b, 0) + (rowHeights.length - 1) * 20,
  );
  return {
    title: 'nofi · Layout options',
    viewport: [width, height],
    html: `<!doctype html><html lang="en"><head>${head('nofi · Layout options')}<style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#eee;color:#292929;font:13px/1.5 Arial,sans-serif}main{display:grid;grid-template-columns:repeat(${columns},${thumbnailWidth + 2}px);gap:20px;align-items:start}article{min-width:0}header{height:24px;margin-bottom:12px;display:flex;align-items:center;gap:8px}header b{display:grid;place-items:center;min-width:24px;height:24px;padding:0 6px;background:#ddd;border-radius:4px}header span{overflow:hidden;white-space:nowrap;text-overflow:ellipsis}footer{height:36px;margin-top:12px;color:#666;font-size:11px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.mockup-frame{border:1px solid #bbb;background:white}.preview{overflow:hidden}iframe{border:0;display:block}</style></head><body><main>${cards}</main></body></html>`,
  };
}

/** Export at the configured viewport. Install Chromium with pnpm exec playwright install chromium. */
export async function screenshot(document, path) {
  const { chromium } = await import('playwright');
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: document.viewport[0], height: document.viewport[1] },
      deviceScaleFactor: 1,
    });
    await page.route('**/*', (route) => route.abort());
    await page.setContent(document.html, { waitUntil: 'load' });
    await Promise.all(
      page.frames().map((frame) => frame.evaluate(() => document.fonts.ready)),
    );
    await page.screenshot({ path, animations: 'disabled' });
  } finally {
    await browser.close();
  }
}
