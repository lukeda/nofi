import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { render } from '../src/index.js';
import { renderPreview } from '../.test-output/playground-render.mjs';

test('browser bundle matches CLI HTML for every example, theme, and viewport', async () => {
  const files = (
    await readdir(new URL('../examples/', import.meta.url))
  ).filter((file) => file.endsWith('.pug'));
  for (const file of files) {
    const source = await readFile(
      new URL(`../examples/${file}`, import.meta.url),
      'utf8',
    );
    for (const theme of ['wireframe', 'blueprint']) {
      for (const viewport of [
        [640, 480],
        [390, 844],
        [1280, 800],
      ]) {
        const options = {
          theme,
          viewport,
          filename: file,
          title: 'Runtime label',
        };
        assert.deepEqual(
          await renderPreview(source, options),
          await render(source, options),
          `${file}, ${theme}, ${viewport}`,
        );
      }
    }
  }
});

test('browser bundle rejects invalid markup and dimensions without evaluating code', async () => {
  for (const source of ['invalid', '- throw new Error("executed")', '']) {
    await assert.rejects(renderPreview(source));
  }
  await assert.rejects(renderPreview('p Hello', { viewport: [0, 400] }));
});
