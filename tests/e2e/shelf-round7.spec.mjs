// The shelf, round 7 (16 Nov): SAVE AS IMAGE in Options (08-save-as-image:
// the notebook in front flat on paper or the whole shelf, Post 4:5, Story
// 9:16 or Square, 1080 wide), PINCH TO ZOOM (09-pinch-close-up: two fingers
// apart bring the books close, a tap on the paper or two fingers together
// take them back), and no arrangement marks at the right edge.
import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { freshPage } from './_helpers.mjs';

async function onShelf(browser, testInfo) {
  const r = await freshPage(browser, testInfo, '/', { returning: true });
  await r.page.setViewportSize({ width: 390, height: 844 });
  await r.page.reload();
  await expect.poll(() => r.page.evaluate(() => Number(getComputedStyle(document.getElementById('shelfBar')).opacity)), { timeout: 5000 }).toBe(1);
  return r;
}
// Two fingers on the shelf, apart (out) or together, as touches do.
const pinch = (page, out) => page.evaluate((apart) => {
  const st = document.getElementById('stage');
  const ev = (type, id, x) => st.dispatchEvent(new PointerEvent(type, { pointerId: id, clientX: x, clientY: 600, pointerType: 'touch', bubbles: true, isPrimary: id === 11 }));
  const from = apart ? 35 : 115, to = apart ? 115 : 35;
  ev('pointerdown', 11, 195 - from); ev('pointerdown', 12, 195 + from);
  for (let k = 1; k <= 10; k++) { const d = from + (to - from) * k / 10; ev('pointermove', 11, 195 - d); ev('pointermove', 12, 195 + d); }
  ev('pointerup', 11, 195 - to); ev('pointerup', 12, 195 + to);
}, out);
// Somewhere on the paper with nothing on it (not a book, nor its floor shadow).
const clearPaper = (page) => page.evaluate(() => {
  for (let y = 780; y > 140; y -= 20) {
    for (let x = 20; x < 380; x += 20) {
      const el = document.elementFromPoint(x, y);
      if (el && el.id === 'stage') return { x, y };
    }
  }
  return null;
});
// Two stickers on The Eye's cover, as Options would leave them: a photo in a
// circle with its white edge, and a card turned a little, with an ink outline.
const stickers = (page) => page.evaluate(async () => {
  const c = document.createElement('canvas'); c.width = 300; c.height = 300;
  const x = c.getContext('2d'); x.fillStyle = '#3B4F6B'; x.fillRect(0, 0, 300, 300); x.fillStyle = '#F4E3C9'; x.fillRect(90, 90, 120, 120);
  const bytes = await (await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.9))).arrayBuffer();
  await window.DFStickers.ready;
  await window.DFStickers.putBack({ id: 'r7-a', app: 'the-eye', shape: 'circle', ratio: 1, x: 0.28, y: 0.2, size: 0.3, turn: 0, seed: 7, bytes, type: 'image/jpeg', edge: 'white', createdAt: 1 });
  await window.DFStickers.putBack({ id: 'r7-b', app: 'the-eye', shape: 'rect', ratio: 1.5, x: 0.7, y: 0.72, size: 0.4, turn: -8, seed: 9, bytes, type: 'image/jpeg', edge: 'outline', createdAt: 2 });
});
const isClose = (page) => page.evaluate(() => document.getElementById('shelf').classList.contains('close'));

test('pinch out brings the notebooks close; a tap on the paper, or pinching in, takes them back', async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await onShelf(browser, testInfo);
  const frontW = () => page.evaluate(() => {
    const i = Number(localStorage.getItem('df-suite-front') ?? 1);
    return document.querySelectorAll('.slot')[Number.isFinite(i) ? i : 1].querySelector('.front').getBoundingClientRect().width;
  });
  const before = await frontW();
  await pinch(page, true);
  await expect.poll(() => isClose(page)).toBe(true);
  await page.waitForTimeout(450); // settled
  expect(await frontW()).toBeGreaterThan(before * 1.6); // the front one fills most of the screen
  await expect(page.locator('#shelfBar')).toHaveCSS('opacity', '0'); // only the books
  // A tap on the paper: back as they stood.
  const paper = await clearPaper(page);
  expect(paper).not.toBeNull();
  await page.mouse.click(paper.x, paper.y);
  await expect.poll(() => isClose(page)).toBe(false);
  await page.waitForTimeout(450);
  expect(Math.abs(await frontW() - before)).toBeLessThan(4); // as it stood (give or take its slow bob)
  // Close again, then two fingers together.
  await pinch(page, true);
  await expect.poll(() => isClose(page)).toBe(true);
  await pinch(page, false);
  await expect.poll(() => isClose(page)).toBe(false);
  await expect(page.locator('#stage')).toHaveAttribute('style', /^(?!.*scale).*$/);
  expect(problems).toEqual([]);
  await ctx.close();
});

test('no arrangement marks: a swipe up still changes how they stand, and nothing says which', async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await onShelf(browser, testInfo);
  const was = await page.evaluate(() => localStorage.getItem('df-suite-layout'));
  await page.mouse.move(195, 640);
  await page.mouse.down();
  await page.mouse.move(195, 560, { steps: 6 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('df-suite-layout'))).not.toBe(was);
  await expect(page.locator('.shape-marks, .shape-name')).toHaveCount(0);
  expect(problems).toEqual([]);
  await ctx.close();
});

test('SAVE AS IMAGE: a preview, the notebook in front or the whole shelf, three sizes, and a 1080-wide picture', async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await onShelf(browser, testInfo);
  await stickers(page);
  await page.reload();
  await expect(page.locator('.slot .front .sticker')).toHaveCount(2);
  await page.click('#optionsBtn');
  await expect(page.locator('.sheet.opts [data-image]')).toHaveText('Save as image');
  await page.waitForTimeout(300);
  await page.locator('.sheet.opts [data-image]').click();
  const s = page.locator('.sheet.save-image');
  await expect(s.locator('.sheet-head h2')).toHaveText('Save as image');
  await expect(s.locator('.opt-label')).toHaveText(['What', 'Size']);
  await expect(s.locator('[data-what]')).toHaveText(['The Eye', 'The whole shelf']);
  await expect(s.locator('[data-size]')).toHaveText(['Post 4:5', 'Story 9:16', 'Square']);
  await expect(s.locator('[data-what="front"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(s.locator('[data-size="post"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(s.locator('[data-save]')).toHaveText('Save and share');
  const preview = s.locator('.save-preview img');
  await expect(preview).toHaveAttribute('src', /^data:image\/png/);
  const ratio = () => preview.evaluate((img) => img.naturalWidth && img.naturalHeight / img.naturalWidth);
  await expect.poll(ratio).toBeCloseTo(1.25, 2);
  // The picture is the notebook, not blank paper: its yellow is in it.
  const yellow = () => preview.evaluate((img) => {
    // Mid-swap the new picture isn't decoded yet: no size to read, so poll again.
    if (!img.complete || !img.naturalWidth) return NaN;
    const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
    const x = c.getContext('2d'); x.drawImage(img, 0, 0);
    const d = x.getImageData(0, 0, c.width, c.height).data;
    let n = 0;
    for (let k = 0; k < d.length; k += 4) if (d[k] > 230 && d[k + 1] > 190 && d[k + 2] < 60) n++;
    return n / (c.width * c.height);
  });
  await expect.poll(yellow).toBeGreaterThan(0.2);
  await s.locator('[data-size="story"]').click();
  await expect.poll(ratio).toBeCloseTo(16 / 9, 2);
  await s.locator('[data-size="square"]').click();
  await expect.poll(ratio).toBeCloseTo(1, 2);
  await expect(s.locator('[data-size="square"]')).toHaveAttribute('aria-pressed', 'true');
  // The whole shelf: all four, so less of it is the front one's yellow.
  await s.locator('[data-what="shelf"]').click();
  await expect.poll(yellow).toBeLessThan(0.15);
  await expect.poll(yellow).toBeGreaterThan(0.02);
  await s.locator('[data-what="front"]').click();
  await s.locator('[data-size="post"]').click();
  await expect.poll(ratio).toBeCloseTo(1.25, 2);
  // SAVE AND SHARE: the share sheet on a phone; here, where there's none, a download.
  await page.evaluate(() => Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true }));
  const [download] = await Promise.all([page.waitForEvent('download'), s.locator('[data-save]').click()]);
  expect(download.suggestedFilename().replace(/_/g, ' ')).toBe('The Eye.png');
  await expect(page.locator('.toast')).toContainText('The picture is in your downloads');
  const size = await page.evaluate(async (url) => {
    const img = new Image();
    img.src = url;
    await img.decode();
    return [img.naturalWidth, img.naturalHeight];
  }, `data:image/png;base64,${(await readFile(await download.path())).toString('base64')}`);
  expect(size).toEqual([1080, 1350]);
  await s.locator('[data-close]').click();
  await expect(s).toHaveCount(0);
  expect(problems).toEqual([]);
  await ctx.close();
});
