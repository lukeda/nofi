import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { highlightNofi } from '../playground/highlight.js';

function plain(html) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(
      /&(amp|lt|gt|quot|#39);/g,
      (_, entity) =>
        ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" })[entity],
    );
}

test('highlighting preserves every character of the bundled examples', async () => {
  for (const file of await readdir(new URL('../examples/', import.meta.url))) {
    if (!file.endsWith('.pug')) continue;
    const source = await readFile(
      new URL(`../examples/${file}`, import.meta.url),
      'utf8',
    );
    const html = highlightNofi(source);
    assert.equal(plain(html), source);
    assert.match(html, /class="syntax-tag"/);
    assert.match(html, /class="syntax-class"/);
  }
});

test('incomplete edits keep surrounding highlighting and escape HTML', () => {
  const source =
    'main.flex\n  input(placeholder="\n  p <img src=x onerror=alert(1)> & "text"\n';
  const html = highlightNofi(source);
  assert.equal(plain(html), source);
  assert.match(html, /class="syntax-tag">main/);
  assert.doesNotMatch(html, /<img/);
});

test('multiline attributes, comments, blank lines, and text retain their positions', () => {
  for (const source of [
    '',
    '\n\n',
    'input(\n  type="text"\n  placeholder="Hello"\n)\n',
    '// note\n  nested comment\np.\n  Some text\n  More text\n',
    'button#save(class="bg-primary/10") Save\n',
  ]) {
    assert.equal(plain(highlightNofi(source)), source);
  }
});
