import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { readdir } from 'node:fs/promises';

test('playground edits, presets, examples, errors, and downloads', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(new URL('../docs/index.html', import.meta.url).href);
    await page.waitForFunction(
      () => !document.querySelector('#download-html').disabled,
    );
    assert.equal(
      await page.locator('#example option').count(),
      (await readdir(new URL('../examples/', import.meta.url))).filter((file) =>
        file.endsWith('.pug'),
      ).length,
    );
    assert.ok((await page.locator('#highlight-code .syntax-tag').count()) > 0);
    assert.equal(
      await page.locator('#highlight-code').textContent(),
      (await page.inputValue('#source')) + '\n',
    );
    const frame = page.frameLocator('#preview');
    assert.equal(await frame.locator('h1').textContent(), 'Projects');
    await page.selectOption('#preset', '390x844');
    await page.waitForFunction(
      () =>
        document.querySelector('#preview').style.width === '390px' &&
        !document.querySelector('#download-html').disabled,
    );
    assert.equal(await frame.locator('body').evaluate(() => innerWidth), 390);
    await page.selectOption('#example', '04-list.pug');
    await page.waitForFunction(
      () => document.querySelector('#preview').title === 'List',
    );
    assert.equal(await frame.locator('table').count(), 1);
    await page.fill('#source', 'main.p-6\n  h1 Hello from nofi');
    await page.waitForFunction(
      () => !document.querySelector('#download-html').disabled,
    );
    await frame.locator('h1').filter({ hasText: 'Hello from nofi' }).waitFor();
    assert.equal(await frame.locator('h1').textContent(), 'Hello from nofi');
    assert.equal(
      await page.locator('#highlight-code').textContent(),
      (await page.inputValue('#source')) + '\n',
    );
    await page.fill('#width', '500');
    await page.waitForFunction(
      () =>
        document.querySelector('#preview').style.width === '500px' &&
        !document.querySelector('#download-html').disabled,
    );
    assert.equal(await page.inputValue('#preset'), 'custom');
    const download = page.waitForEvent('download');
    await page.click('#download-html');
    assert.match((await download).suggestedFilename(), /\.html$/);
    await page.fill('#source', 'not valid nofi');
    await page.waitForSelector('#error-panel:not([hidden])');
    assert.equal(await page.locator('#download-html').isDisabled(), true);
    assert.equal(await frame.locator('h1').textContent(), 'Hello from nofi');
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
});

test('playground restores old drafts as plain Pug without dropping edits', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.addInitScript(() => {
      localStorage.removeItem('nofi-playground-v2');
      localStorage.setItem(
        'nofi-playground-v1',
        JSON.stringify({
          filename: '01-sidebar.nofi',
          source:
            '---\ntitle: My saved edit\nviewport: [800, 600]\n---\nmain\n  h1 Keep my changes',
          preset: 'source',
          width: '800',
          height: '600',
          theme: 'blueprint',
        }),
      );
    });
    await page.goto(new URL('../docs/index.html', import.meta.url).href);
    await page.waitForFunction(
      () => !document.querySelector('#download-source').disabled,
    );
    assert.equal(
      await page.inputValue('#source'),
      'main\n  h1 Keep my changes',
    );
    assert.equal(await page.inputValue('#example'), '01-sidebar.pug');
    assert.equal(await page.inputValue('#width'), '800');
    const download = page.waitForEvent('download');
    await page.click('#download-source');
    assert.equal((await download).suggestedFilename(), '01-sidebar.pug');
  } finally {
    await browser.close();
  }
});
