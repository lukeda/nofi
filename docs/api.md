# Library API

Within this checkout:

```js
import { render, board, screenshot } from './src/index.js';
import { readFile, writeFile } from 'node:fs/promises';

const source = await readFile('examples/01-sidebar.pug', 'utf8');
const mockup = await render(source, {
  filename: 'sidebar.pug',
  theme: 'wireframe',
});
await writeFile('mockup.html', mockup.html);
await screenshot(mockup, 'mockup.png');

const options = board([mockup], { columns: 1 });
await writeFile('options.html', options.html);
```

The library does not search for project config automatically. Pass `defaults` explicitly, or load them with `loadConfig()`:

```js
import { loadConfig, render } from './src/index.js';

const defaults = await loadConfig();
const mockup = await render(source, { defaults, viewport: [390, 844] });
```

The `viewport` option overrides `defaults.viewport`. `theme` similarly overrides `defaults.theme`.

`render()` returns `{ title, viewport, html }`. `board()` accepts rendered documents and returns the same shape. `screenshot()` exports the configured viewport; overflowing content is clipped in the image.
