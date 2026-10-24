import test from 'node:test';
import assert from 'node:assert/strict';
import { parseBoardConfig } from '../src/board-config.js';

test('manifest resolves sources and custom themes relative to its file', () => {
  const config = parseBoardConfig(
    'viewport: [800, 600]\ncolumns: 2\ntheme: ./brand.css\nitems:\n  - file: ./sidebar.pug\n    name: Sidebar',
    { filename: 'boards/options.yaml', cwd: '/project' },
  );
  assert.deepEqual(config, {
    viewport: [800, 600],
    columns: 2,
    theme: '/project/boards/brand.css',
    items: [{ file: '/project/boards/sidebar.pug', name: 'Sidebar' }],
  });
});

test('stdin resolves sources from cwd and preserves builtin themes and optional names', () => {
  const config = parseBoardConfig(
    'theme: blueprint\nitems:\n  - file: a.pug\n  - file: b.pug\n    name: Another option',
    { cwd: '/project' },
  );
  assert.equal(config.theme, 'blueprint');
  assert.deepEqual(config.items, [
    { file: '/project/a.pug', name: undefined },
    { file: '/project/b.pug', name: 'Another option' },
  ]);
});

test('invalid manifests fail before rendering', () => {
  for (const source of [
    '',
    '[]',
    'items: []',
    'items: [a.pug]',
    'items: [{file: a.pug, name: ""}]',
    'items: [{file: ""}]',
    'items: [{file: a.pug, extra: true}]',
    'items: [{file: a.pug}]\ncolumns: 0',
    'items: [{file: a.pug}]\nviewport: [0, 600]',
    'items: [{file: a.pug}]\ntheme: 5',
    'items: [{file: a.pug}]\nextra: true',
    'items: []\nitems: []',
  ])
    assert.throws(() => parseBoardConfig(source), source);
});

test('CLI renders manifests and stdin, applies flag overrides, and rejects mixed inputs', async () => {
  const { mkdtemp, mkdir, writeFile, readFile, rm } =
    await import('node:fs/promises');
  const { tmpdir } = await import('node:os');
  const { join } = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const cli = fileURLToPath(new URL('../src/cli.js', import.meta.url));
  const root = await mkdtemp(join(tmpdir(), 'nofi-board-'));
  async function run(args, input) {
    // A redirected file exercises stdin like a shell heredoc, without a socket.
    const { open } = await import('node:fs/promises');
    const { spawn } = await import('node:child_process');
    let stream;
    if (input !== undefined) {
      await writeFile(join(root, 'stdin.txt'), input);
      stream = await open(join(root, 'stdin.txt'), 'r');
    }
    try {
      return await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [cli, ...args], {
          cwd: root,
          stdio: [stream?.fd ?? 'ignore', 'pipe', 'pipe'],
        });
        let output = '';
        child.stdout.on('data', (chunk) => {
          output += chunk;
        });
        child.stderr.on('data', (chunk) => {
          output += chunk;
        });
        child.on('error', reject);
        child.on('close', (code) =>
          code === 0 ? resolve(output) : reject(new Error(output)),
        );
      });
    } finally {
      await stream?.close();
    }
  }
  try {
    await mkdir(join(root, 'layouts'));
    await writeFile(
      join(root, 'nofi.config.yaml'),
      'viewport: [320, 400]\ntheme: wireframe',
    );
    await writeFile(join(root, 'layouts/a.pug'), 'main A');
    const yaml =
      'viewport: [800, 600]\ncolumns: 1\ntheme: blueprint\nitems:\n  - file: a.pug\n    name: Named layout';
    await writeFile(join(root, 'layouts/board.yaml'), yaml);
    await run(['board', 'layouts/board.yaml', '-o', 'board.html']);
    let html = await readFile(join(root, 'board.html'), 'utf8');
    assert.match(html, /width="800" height="600"/);
    assert.match(html, /Named layout/);
    assert.match(html, /#172f50/);
    await run(
      [
        'board',
        '-',
        '--viewport',
        '390x844',
        '--theme',
        'wireframe',
        '-o',
        'stdin.html',
      ],
      yaml.replace('file: a.pug', 'file: layouts/a.pug'),
    );
    html = await readFile(join(root, 'stdin.html'), 'utf8');
    assert.match(html, /width="390" height="844"/);
    assert.doesNotMatch(html, /#172f50/);
    await assert.rejects(run(['board', 'layouts/board.yaml', 'layouts/a.pug']));
    await assert.rejects(run(['board', '-'], 'items: []'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
