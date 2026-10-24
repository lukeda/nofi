import test from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseNofi, render, board } from '../src/index.js';

const runCli = promisify(execFile);

const source = (markup) => `${markup}\n`;

test('renders nesting, text, and punctuation-bearing class attributes', () => {
  const result = parseNofi(
    source('main.flex\n  button(class="gap-2.5 md:w-1/2") Save & continue'),
  );
  assert.equal(
    result.html,
    '<body><main class="flex"><button class="gap-2.5 md:w-1/2">Save &amp; continue</button></main></body>',
  );
  assert.deepEqual(result.classes, ['flex', 'gap-2.5', 'md:w-1/2']);
});

test('accepts a single body and rejects nested or duplicate bodies', () => {
  assert.equal(
    parseNofi(source('body.p-4\n  p Hello')).html,
    '<body class="p-4"><p>Hello</p></body>',
  );
  assert.throws(() => parseNofi(source('div\n  body')), /body must/);
  assert.throws(() => parseNofi(source('body\np Hello')), /body must/);
});

test('plain Pug derives labels from filenames and accepts runtime titles', () => {
  assert.equal(parseNofi('main Hello').title, 'Mockup');
  assert.equal(
    parseNofi('main Hello', { filename: 'options/01-sidebar-layout.pug' })
      .title,
    'Sidebar layout',
  );
  assert.equal(
    parseNofi('main Hello', {
      filename: 'options\\compact_view.pug',
      title: 'Custom option',
    }).title,
    'Custom option',
  );
  assert.throws(() => parseNofi('main', { title: '' }), /title/);
  assert.throws(() => parseNofi(''), /markup/);
  assert.throws(() => parseNofi('---\ntitle: Old\n---\nmain'), /plain Pug/);
  for (const viewport of [
    [0, 480],
    [640.5, 480],
    [640, 480, 1],
  ]) {
    assert.throws(() => parseNofi('main', { viewport }), /viewport/);
  }
  assert.throws(() => parseNofi('main\n  script alert(1)'), /Line 2/);
});

test('rejects executable Pug and active HTML without executing it', () => {
  for (const markup of [
    '- throw new Error("executed")',
    'p= process.version',
    'p #{process.version}',
    'include /etc/passwd',
    'each item in [1,2]\n  p= item',
    'button(onclick="alert(1)") Save',
    'div(class=process.version)',
    'script alert(1)',
    '| <script>alert(1)</script>\nscript',
  ]) {
    assert.throws(() => parseNofi(source(markup)));
  }
  assert.match(
    parseNofi(source('p <strong>Literal</strong>')).html,
    /&lt;strong&gt;/,
  );
});

test('renders every example with compiled Tailwind and no CDN', async () => {
  for (const name of (
    await readdir(new URL('../examples/', import.meta.url))
  ).filter((name) => name.endsWith('.pug'))) {
    const result = await render(
      await readFile(new URL(`../examples/${name}`, import.meta.url), 'utf8'),
    );
    assert.match(result.html, /display:\s*flex/);
    assert.match(result.html, /Content-Security-Policy/);
    assert.doesNotMatch(result.html, /<script|<link/);
    assert.deepEqual(result.viewport, [640, 480]);
  }
});

test('boards isolate viewport dimensions and escape titles', () => {
  const result = board(
    [
      {
        title: '<Example>',
        viewport: [640, 480],
        html: '<body>Example</body>',
      },
    ],
    { columns: 1 },
  );
  assert.match(result.html, /iframe sandbox/);
  assert.match(result.html, /width="640" height="480"/);
  assert.match(result.html, /transform:scale\(0.5\)/);
  assert.match(result.html, /&lt;Example&gt;/);
  assert.throws(() => board([]), /at least one/);
  assert.throws(() => board([{}], { columns: 0 }), /columns/);
});

test('runtime viewport overrides project defaults', async () => {
  const markup = 'main Hello';
  assert.deepEqual(parseNofi(markup).viewport, [640, 480]);
  const defaults = { viewport: [800, 600], theme: 'blueprint' };
  assert.deepEqual(parseNofi(markup, { defaults }).viewport, [800, 600]);
  const rendered = await render(markup, {
    defaults,
    viewport: [390, 844],
    title: 'Mobile',
  });
  assert.deepEqual(rendered.viewport, [390, 844]);
  assert.equal(rendered.title, 'Mobile');
  assert.match(rendered.html, /#172f50/);
  assert.match(board([rendered]).html, /width="390" height="844"/);
});

test('runtime board labels are validated, escaped, and do not mutate inputs', () => {
  const mockup = {
    title: 'Original',
    viewport: [640, 480],
    html: '<body>Hello</body>',
  };
  const result = board([mockup], { names: ['<Sidebar>'] });
  assert.match(result.html, /&lt;Sidebar&gt;/);
  assert.equal(mockup.title, 'Original');
  for (const names of [[], ['A', 'B'], [''], [42], 'A'])
    assert.throws(() => board([mockup], { names }), /names|title/);
});

test('CLI batch loads project defaults and overrides every file on request', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'nofi-cli-'));
  try {
    await writeFile(
      join(directory, 'nofi.config.yaml'),
      'viewport: [800, 600]\ntheme: wireframe\n',
    );
    await writeFile(join(directory, 'a.pug'), source('main A'));
    await writeFile(join(directory, 'b.pug'), source('main B'));
    const cli = fileURLToPath(new URL('../src/cli.js', import.meta.url));
    const args = [cli, 'board', 'a.pug', 'b.pug', '-o', 'board.html'];
    await runCli(process.execPath, args, { cwd: directory });
    let html = await readFile(join(directory, 'board.html'), 'utf8');
    assert.match(html, /width="800" height="600"/);
    assert.equal((html.match(/width="800" height="600"/g) ?? []).length, 2);
    await runCli(process.execPath, [...args, '--viewport', '390x844'], {
      cwd: directory,
    });
    html = await readFile(join(directory, 'board.html'), 'utf8');
    assert.equal((html.match(/width="390" height="844"/g) ?? []).length, 2);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('boards reserve columns only for available mockups and wrap overflow', () => {
  const mockup = {
    title: 'Example',
    viewport: [640, 480],
    html: '<body>Example</body>',
  };
  assert.deepEqual(board([mockup]).viewport, [370, 374]);
  assert.deepEqual(board([mockup, mockup]).viewport, [712, 374]);
  assert.deepEqual(board([mockup], { columns: 8 }).viewport, [370, 374]);
  assert.deepEqual(board(Array(5).fill(mockup)).viewport, [1396, 720]);
  assert.match(board([mockup]).html, /grid-template-columns:repeat\(1,322px\)/);
});

test('semantic colour utilities compile to theme variables, including tints', async () => {
  const markup = source(
    'main.bg-background.text-foreground\n  button.bg-primary.text-primary-foreground Save\n  button.bg-secondary.text-secondary-foreground Cancel\n  div.bg-muted.text-muted-foreground Muted\n  div.bg-accent.text-accent-foreground.border.border-border Selected\n  div(class="bg-primary/10 hover:bg-accent") Tint',
  );
  for (const theme of ['wireframe', 'blueprint']) {
    const { html } = await render(markup, { theme });
    for (const variable of [
      'paper',
      'ink',
      'primary',
      'primary-foreground',
      'secondary',
      'secondary-foreground',
      'muted',
      'muted-foreground',
      'accent',
      'accent-foreground',
      'line',
    ]) {
      assert.match(
        html,
        new RegExp(
          `(?:background-color|color|border-color): var\\(--nofi-${variable}\\)`,
        ),
      );
    }
    assert.match(
      html,
      /color-mix\(in oklab, var\(--nofi-primary\) 10%, transparent\)/,
    );
  }
});
