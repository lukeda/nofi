import {
  mkdir,
  readFile,
  readdir,
  writeFile,
  copyFile,
} from 'node:fs/promises';
import { parseNofi } from '../src/parse.js';
import { loadConfig } from '../src/config.js';

const root = new URL('../', import.meta.url);
const defaults = await loadConfig(root.pathname);
const examples = [];
for (const filename of (await readdir(new URL('examples/', root)))
  .filter((name) => name.endsWith('.pug'))
  .sort()) {
  const source = await readFile(new URL(`examples/${filename}`, root), 'utf8');
  examples.push({
    filename,
    title: parseNofi(source, { defaults, filename }).title,
    source,
  });
}
await mkdir(new URL('docs/playground/', root), { recursive: true });
await writeFile(
  new URL('playground/generated.js', root),
  `export const defaults = ${JSON.stringify({ viewport: defaults.viewport, theme: defaults.theme })};\nexport const examples = ${JSON.stringify(examples)};\n`,
);
await copyFile(
  new URL('playground/index.html', root),
  new URL('docs/index.html', root),
);
await copyFile(
  new URL('playground/style.css', root),
  new URL('docs/playground/style.css', root),
);
await writeFile(new URL('docs/.nojekyll', root), '');
console.log('Prepared playground with', examples.length, 'examples.');
