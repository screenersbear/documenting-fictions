// The shelf, round 5 (06-cut-out-stickers): a sticker's Cut out shape. The
// picture is cut out on the device (nothing is sent anywhere), "Cutting it
// out" says how far along it is, the sticker takes the picture's outline with
// a white border or black outline, and it's kept that way. When nothing
// clear stands out it says so and offers Card.
import { test, expect } from '@playwright/test';
import { freshPage } from './_helpers.mjs';

const NOTEBOOKS = ['ref', 'the-eye', 'contact-sheet', 'rounds'];

// A picture drawn in the page: one red shape (with a blue block on top) on a
// plain ground, or nothing but the ground. It's what the photo library hands
// back next (the picker itself is the phone's: WebKit's test browser never opens it).
async function picture(page, withSubject) {
  await page.evaluate(async (subject) => {
    const c = document.createElement('canvas');
    c.width = 600; c.height = 450;
    const g = c.getContext('2d');
    g.fillStyle = '#ECE8E0'; g.fillRect(0, 0, 600, 450);
    if (subject) {
      g.fillStyle = '#C8323C'; g.beginPath(); g.ellipse(300, 240, 120, 150, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#2B6CB0'; g.fillRect(250, 60, 100, 70);
    }
    const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.9));
    window.DFStickers.pick = async () => new File([blob], 'picture.jpg', { type: 'image/jpeg' });
  }, withSubject);
}

// A tap. WebKit's test browser finds the wrong thing under the finger on the
// 3D shelf (the page itself, drawing the cover blank), so there the tap goes
// straight to the button; Chrome taps where it is, as a finger would.
let tap;
async function openShelf(browser, testInfo) {
  tap = (page, sel) => (testInfo.project.name === 'iphone' ? page.locator(sel).dispatchEvent('click') : page.click(sel));
  const { ctx, page, problems } = await freshPage(browser, testInfo, '/?still', { returning: true });
  await page.setViewportSize({ width: 390, height: 844 });
  const away = [];
  page.on('request', (r) => { if (!r.url().startsWith('blob:') && !r.url().startsWith('data:') && new URL(r.url()).origin !== new URL(page.url()).origin) away.push(r.url()); });
  page.on('request', (r) => { if (r.method() !== 'GET') away.push(`${r.method()} ${r.url()}`); });
  return { ctx, page, problems, away };
}

// Options (still open after the last sticker), ADD A STICKER, a picture: the placing screen.
async function startSticker(page, withSubject) {
  await picture(page, withSubject);
  const add = page.locator('[data-add]');
  if (!(await add.isVisible())) await tap(page, '#optionsBtn');
  await expect(add).toBeVisible();
  await tap(page, '[data-add]');
  await expect(page.locator('.place-sheet')).toBeVisible();
}

// Notes every hint and whether STICK IT ON could be pressed, as they change.
function watchSheet(page) {
  return page.evaluate(() => {
    window.__seen = [];
    const sheet = document.querySelector('.place-sheet');
    const note = () => window.__seen.push({ hint: sheet.querySelector('.place-hint').textContent, off: sheet.querySelector('[data-yes]').disabled });
    new MutationObserver(note).observe(sheet, { subtree: true, childList: true, characterData: true, attributes: true });
  });
}

const stored = (page) => page.evaluate((ids) => ids.flatMap((id) => window.DFStickers.list(id)).map((s) => ({ shape: s.shape, edge: s.edge, type: s.type, ratio: s.ratio, bytes: s.bytes.byteLength, mask: s.mask ? s.mask.byteLength : 0 })), NOTEBOOKS);
const checked = (page, row) => page.locator(`.place-seg [data-${row}][aria-checked="true"]`);

test.describe('Shelf: cut-out stickers', () => {
  test('Cut out cuts the picture out on the device, with its border or outline, and keeps it', async ({ browser }, testInfo) => {
    test.setTimeout(90_000);
    const { ctx, page, problems, away } = await openShelf(browser, testInfo);
    await startSticker(page, true);
    await expect(page.locator('.place-seg [data-shape]')).toHaveText(['Circle', 'Square', 'Card', 'Cut out']);
    await watchSheet(page);
    await tap(page, '.place-seg [data-shape="cut"]');
    await expect(checked(page, 'shape')).toHaveText('Cut out');
    // Cut out, with the picture's own shape: masked to it, a drop shadow that follows it.
    const sticker = page.locator('.stickers .sticker.placing');
    await expect(sticker).toHaveClass(/\bcut\b/, { timeout: 60_000 });
    const seen = await page.evaluate(() => window.__seen);
    expect(seen.some((s) => /^Cutting it out, \d+%$/.test(s.hint) && s.off), 'it said how far along it was, with STICK IT ON waiting').toBe(true);
    await expect(page.locator('.place-hint')).toHaveText('Drag to move, pinch to size, twist to turn.');
    await expect(page.locator('[data-yes]')).toBeEnabled();
    const look = await sticker.evaluate((el) => {
      const cs = getComputedStyle(el), box = el.getBoundingClientRect();
      return { cut: el.style.getPropertyValue('--cut'), inside: !!el.querySelector('.cut-in .photo'), filter: cs.filter, shadow: cs.boxShadow, aspect: box.width / box.height };
    });
    expect(look.cut).toMatch(/^url\("blob:/);
    expect(look.inside).toBe(true);
    expect(look.filter).toContain('drop-shadow');
    expect(look.shadow).toBe('none');
    expect(look.aspect).toBeGreaterThan(0.65); // the red shape and its block, 240 by 330, plus the border
    expect(look.aspect).toBeLessThan(0.85);
    // Black outline: the same cut, with an ink line.
    await tap(page, '.place-seg [data-edge="outline"]');
    await expect(sticker).toHaveClass(/\bcut\b.*\boutline\b/);
    await tap(page, '[data-yes]');
    await expect(page.locator('.place-layer')).toHaveCount(0);
    const [s] = await stored(page);
    expect(s).toMatchObject({ shape: 'cut', edge: 'outline', type: 'image/jpeg' });
    expect(s.ratio).toBeCloseTo(look.aspect, 1);
    expect(s.bytes).toBeGreaterThan(1000);
    expect(s.mask).toBeGreaterThan(100);
    // Still a cut-out on its cover after the shelf opens again.
    await page.reload();
    await expect(page.locator('.stickers .sticker.cut .cut-in')).toHaveCount(1);
    expect(away, 'nothing left the device').toEqual([]);
    expect(problems).toEqual([]);
    await ctx.close();
  });

  test('a new sticker after a cut-out is cut out too, as a card while it is', async ({ browser }, testInfo) => {
    test.setTimeout(120_000);
    const { ctx, page, problems } = await openShelf(browser, testInfo);
    await startSticker(page, true);
    await tap(page, '.place-seg [data-shape="cut"]');
    await expect(page.locator('.stickers .sticker.placing')).toHaveClass(/\bcut\b/, { timeout: 60_000 });
    await tap(page, '[data-yes]');
    await expect(page.locator('.place-layer')).toHaveCount(0);
    await startSticker(page, true);
    await expect(checked(page, 'shape')).toHaveText('Cut out');
    await expect(page.locator('.stickers .sticker.placing')).toHaveClass(/\bcut\b/, { timeout: 60_000 });
    await tap(page, '[data-no]');
    await expect(page.locator('.place-layer')).toHaveCount(0);
    expect((await stored(page)).map((x) => x.shape)).toEqual(['cut']);
    expect(problems).toEqual([]);
    await ctx.close();
  });

  test('with nothing clear to cut out, it says so and offers Card', async ({ browser }, testInfo) => {
    test.setTimeout(90_000);
    const { ctx, page, problems, away } = await openShelf(browser, testInfo);
    await startSticker(page, false);
    const top = await page.locator('.place-sheet').evaluate((el) => el.getBoundingClientRect().top);
    await tap(page, '.place-seg [data-shape="cut"]');
    await expect(page.locator('.place-hint')).toHaveText('Nothing clear to cut out. Use Card', { timeout: 60_000 });
    // Back on the shape it was, and the sheet doesn't move.
    await expect(checked(page, 'shape')).toHaveText('Circle');
    await expect(page.locator('.stickers .sticker.placing')).toHaveClass(/\bcircle\b/);
    await expect(page.locator('[data-yes]')).toBeEnabled();
    expect(await page.locator('.place-sheet').evaluate((el) => el.getBoundingClientRect().top)).toBe(top);
    // Asked again, it says so again, without cutting again.
    await tap(page, '.place-seg [data-shape="square"]');
    await expect(page.locator('.place-hint')).toHaveText('Drag to move, pinch to size, twist to turn.');
    await tap(page, '.place-seg [data-shape="cut"]');
    await expect(page.locator('.place-hint')).toHaveText('Nothing clear to cut out. Use Card');
    await expect(checked(page, 'shape')).toHaveText('Square');
    await tap(page, '.place-card');
    await expect(checked(page, 'shape')).toHaveText('Card');
    await expect(page.locator('.place-hint')).toHaveText('Drag to move, pinch to size, twist to turn.');
    await tap(page, '[data-yes]');
    await expect(page.locator('.place-layer')).toHaveCount(0);
    expect((await stored(page)).map((x) => [x.shape, x.mask])).toEqual([['rect', 0]]);
    expect(away).toEqual([]);
    expect(problems).toEqual([]);
    await ctx.close();
  });
});
