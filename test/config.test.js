import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadConfig, parseViewport, resolveViewport } from '../src/config.js';

test('viewport precedence is override, project, built-in', () => {
  assert.deepEqual(resolveViewport(), [640, 480]);
  assert.deepEqual(resolveViewport({ fallback: [800, 600] }), [800, 600]);
  assert.deepEqual(
    resolveViewport({ fallback: [800, 600], override: [390, 844] }),
    [390, 844],
  );
  for (const value of [
    null,
    [],
    [0, 10],
    [10.5, 20],
    [4097, 20],
    ['640', 480],
  ]) {
    assert.throws(() => resolveViewport({ fallback: value }), /viewport/);
    assert.throws(() => resolveViewport({ override: value }), /viewport/);
  }
});

test('CLI viewport accepts only valid dimensions', () => {
  assert.deepEqual(parseViewport('390x844'), [390, 844]);
  for (const value of [
    '600',
    '600,600',
    '1.5x600',
    '0x600',
    '4097x600',
    '640x480extra',
  ])
    assert.throws(() => parseViewport(value), /viewport/);
});

test('config discovery uses nearest ancestor and resolves theme paths from it', async () => {
  const root = await mkdtemp(join(tmpdir(), 'nofi-config-'));
  try {
    const child = join(root, 'options');
    const nested = join(child, 'mobile');
    await mkdir(nested, { recursive: true });
    await writeFile(
      join(root, 'nofi.config.yaml'),
      'viewport: [800, 600]\ntheme: ./brand.css\n',
    );
    assert.deepEqual(await loadConfig(nested), {
      viewport: [800, 600],
      theme: join(root, 'brand.css'),
    });
    await writeFile(
      join(child, 'nofi.config.yaml'),
      'viewport: [390, 844]\ntheme: blueprint\n',
    );
    assert.deepEqual(await loadConfig(nested), {
      viewport: [390, 844],
      theme: 'blueprint',
    });
    for (const source of [
      'viewport: [0, 10]',
      'viewport: null',
      'theme: 5',
      'unknown: true',
      '[]',
      '',
      'viewport: [640, 480]\nviewport: [1, 1]',
    ]) {
      await writeFile(join(child, 'nofi.config.yaml'), source);
      await assert.rejects(loadConfig(nested));
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
