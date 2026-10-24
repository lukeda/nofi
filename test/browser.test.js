import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { render, board, screenshot } from '../src/index.js';

const source = `main.flex.flex-col.gap-4.p-6\n  h1 Hello\n  button.bg-red-500 Save\n  div(class="hidden md:block") Desktop only\n`;

test('utilities override theme defaults; viewport controls responsive classes', async () => {
  const browser = await chromium.launch();
  const dir = await mkdtemp(join(tmpdir(), 'nofi-theme-'));
  try {
    const theme = join(dir, 'theme.css');
    await writeFile(theme, 'button { background-color: rgb(0, 0, 255); }');
    const document = await render(source, { theme });
    const page = await browser.newPage({
      viewport: { width: 640, height: 480 },
    });
    await page.setContent(document.html);
    assert.equal(
      await page.locator('main').evaluate((el) => getComputedStyle(el).display),
      'flex',
    );
    assert.notEqual(
      await page
        .locator('button')
        .evaluate((el) => getComputedStyle(el).backgroundColor),
      'rgb(0, 0, 255)',
    );
    assert.equal(await page.locator('main > div').isVisible(), false);
    await page.setViewportSize({ width: 900, height: 480 });
    assert.equal(await page.locator('main > div').isVisible(), true);
    await page.setContent(board([document], { columns: 1 }).html);
    const iframe = page.frameLocator('iframe');
    assert.equal(await iframe.locator('main > div').isVisible(), false);
    assert.equal(await iframe.locator('main').evaluate(() => innerWidth), 640);
  } finally {
    await browser.close();
    await rm(dir, { recursive: true, force: true });
  }
});

test('PNG export uses exact source dimensions', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'nofi-image-'));
  try {
    const output = join(dir, 'mockup.png');
    await screenshot(await render(source, { viewport: [390, 844] }), output);
    const image = await readFile(output);
    assert.equal(image.readUInt32BE(16), 390);
    assert.equal(image.readUInt32BE(20), 844);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('semantic colours follow the theme and pair surfaces with contrasting text', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const source =
      'button.bg-primary.text-primary-foreground Save\np.text-muted-foreground Hint';
    for (const [theme, background, foreground, muted] of [
      [
        'wireframe',
        'rgb(41, 41, 41)',
        'rgb(255, 255, 255)',
        'rgb(107, 107, 107)',
      ],
      [
        'blueprint',
        'rgb(219, 234, 254)',
        'rgb(23, 47, 80)',
        'rgb(166, 189, 214)',
      ],
    ]) {
      await page.setContent((await render(source, { theme })).html);
      const actual = await page.locator('button').evaluate((element) => ({
        background: getComputedStyle(element).backgroundColor,
        foreground: getComputedStyle(element).color,
      }));
      assert.deepEqual(actual, { background, foreground });
      assert.equal(
        await page
          .locator('p')
          .evaluate((element) => getComputedStyle(element).color),
        muted,
      );
    }
  } finally {
    await browser.close();
  }
});
