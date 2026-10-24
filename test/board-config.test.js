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
    'items: [{}]',
    'items: [{pug: null}]',
    'items: [{pug: 5}]',
    'items: [{pug: " "}]',
    'items: [{file: a.pug, pug: main}]',
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
  const { mkdtemp, mkdir, writeFile, readFile, readdir, rm } =
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
    const out = await open(join(root, 'stdout.txt'), 'w');
    const err = await open(join(root, 'stderr.txt'), 'w');
    try {
      const code = await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [cli, ...args], {
          cwd: root,
          stdio: [stream?.fd ?? 'ignore', out.fd, err.fd],
        });
        child.on('error', reject);
        child.on('close', resolve);
      });
      const stdout = await readFile(join(root, 'stdout.txt'), 'utf8');
      const stderr = await readFile(join(root, 'stderr.txt'), 'utf8');
      if (code !== 0) throw new Error(stderr);
      assert.equal(stderr, '');
      return stdout;
    } finally {
      await stream?.close();
      await out.close();
      await err.close();
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
    const inline =
      'viewport: [640, 480]\nitems:\n  - name: Sidebar\n    pug: |\n      main.flex\n        aside Navigation\n        section Content\n  - pug: main Second layout';
    // The fixture is test infrastructure; the CLI must create no files.
    await writeFile(join(root, 'stdin.txt'), inline);
    const before = await readdir(root, { recursive: true });
    const stdout = await run(['board', '-', '--stdout'], inline);
    assert.match(stdout, /^<!doctype html>/);
    assert.ok(stdout.endsWith('</html>'));
    assert.equal((stdout.match(/<iframe /g) ?? []).length, 2);
    assert.match(stdout, /Sidebar/);
    assert.match(stdout, /Option 2/);
    assert.doesNotMatch(stdout, /Rendered |inline-1.pug/);
    assert.deepEqual(await readdir(root, { recursive: true }), before);
    const mixed = await run(
      ['board', '-', '--stdout'],
      'items:\n  - file: layouts/a.pug\n  - pug: main Inline',
    );
    assert.equal((mixed.match(/<iframe /g) ?? []).length, 2);
    const single = await run(['render', 'layouts/a.pug', '--stdout']);
    assert.match(single, /^<!doctype html>/);
    await assert.rejects(
      run(['board', '-', '--stdout', '-o', 'invalid.png'], inline),
    );
    await assert.rejects(
      run(['board', '-', '--stdout'], 'items: [{pug: "- process.exit()"}]'),
    );
    await writeFile(join(root, 'layouts/bad-one.pug'), 'span.py-0.5 Paid');
    await writeFile(join(root, 'layouts/bad-two.pug'), 'span.w-2/3 Usage');
    await writeFile(join(root, 'existing.html'), 'Keep existing output');
    for (const outputArgs of [['--stdout'], ['-o', 'existing.html']]) {
      await assert.rejects(
        run([
          'board',
          'layouts/bad-one.pug',
          'layouts/a.pug',
          'layouts/bad-two.pug',
          'missing.pug',
          ...outputArgs,
        ]),
        (error) => {
          assert.match(error.message, /3 of 4 board inputs failed/);
          assert.match(error.message, /bad-one.pug/);
          assert.match(error.message, /bad-two.pug/);
          assert.match(error.message, /missing.pug/);
          assert.equal(
            (error.message.match(/Hint: Tailwind/g) ?? []).length,
            2,
          );
          return true;
        },
      );
      assert.equal(await readFile(join(root, 'stdout.txt'), 'utf8'), '');
      assert.equal(
        await readFile(join(root, 'existing.html'), 'utf8'),
        'Keep existing output',
      );
    }
    await assert.rejects(run(['board', 'layouts/board.yaml', 'layouts/a.pug']));
    await assert.rejects(run(['board', '-'], 'items: []'));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
