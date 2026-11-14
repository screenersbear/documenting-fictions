// Ref: going between Mood boards and Tags is a plain slide (Starky, 14 Nov).
// No page turn: the page follows the finger and settles in 240ms on the
// curve (.4, 0, .2, 1), no bounce or curl. With Reduce Motion, a 150ms
// crossfade.
import { test, expect } from '@playwright/test';
import { freshPage } from './_helpers.mjs';

async function openRef(browser, testInfo) {
  const { ctx, page } = await freshPage(browser, testInfo, '/ref/#/boards', { returning: true });
  await page.setViewportSize({ width: 390, height: 844 });
  // Drawn again at the new size (the page measures the screen as it loads).
  await page.reload();
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.locator('#view .list-head', { hasText: 'Boards' })).toBeVisible();
  return { ctx, page };
}

// The animation on the frame while it slides: its time, its curve and where it goes.
// (It starts once the section beside is drawn.)
const slideStarted = (page) => page.waitForFunction(() => document.getElementById('frame').getAnimations().length > 0, null, { timeout: 2000 });
const frameAnimation = (page) => page.$eval('#frame', (el) => {
  const a = el.getAnimations()[0];
  if (!a) return null;
  const t = a.effect.getTiming();
  return { ms: t.duration, ease: t.easing, frames: a.effect.getKeyframes().map((k) => k.transform) };
});
const leafFade = async (page) => {
  await page.waitForFunction(() => document.querySelector('.slide-leaf.slide-fade')?.getAnimations().length > 0, null, { timeout: 2000 });
  return page.$eval('.slide-leaf.slide-fade', (el) => {
  const a = el.getAnimations()[0];
    return { ms: a.effect.getTiming().duration, frames: a.effect.getKeyframes().map((k) => String(k.opacity)) };
  });
};

test.describe('Ref: sections slide, never turn', () => {
  test('a tap on Tags slides the page over in 240ms, with no page turn', async ({ browser }, testInfo) => {
    const { ctx, page } = await openRef(browser, testInfo);
    await page.click('#navbar .sec-tags');
    await slideStarted(page);
    const anim = await frameAnimation(page);
    expect(anim).toEqual({ ms: 240, ease: 'cubic-bezier(0.4, 0, 0.2, 1)', frames: ['translate3d(0px, 0px, 0px)', 'translate3d(-390px, 0px, 0px)'] });
    await expect(page.locator('.turn-leaf')).toHaveCount(0);
    await expect(page).toHaveURL(/#\/folders$/);
    await expect(page.locator('.slide-leaf')).toHaveCount(0, { timeout: 2000 });
    await expect(page.locator('#view .tag-mine-head')).toBeVisible();
    expect(await page.$eval('#frame', (el) => el.style.transform)).toBe('');
    // And back: the other way.
    await page.click('#navbar .sec-boards');
    await slideStarted(page);
    expect((await frameAnimation(page)).frames).toEqual(['translate3d(0px, 0px, 0px)', 'translate3d(390px, 0px, 0px)']);
    await expect(page).toHaveURL(/#\/boards$/);
    await expect(page.locator('.slide-leaf')).toHaveCount(0, { timeout: 2000 });
    await ctx.close();
  });

  test('with Reduce Motion it crossfades in 150ms', async ({ browser }, testInfo) => {
    const { ctx, page } = await openRef(browser, testInfo);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.click('#navbar .sec-tags');
    expect(await leafFade(page)).toEqual({ ms: 150, frames: ['1', '0'] });
    expect(await frameAnimation(page)).toBeNull();
    await expect(page).toHaveURL(/#\/folders$/);
    await expect(page.locator('.slide-leaf')).toHaveCount(0, { timeout: 2000 });
    await ctx.close();
  });

  test('the page follows the finger, with Tags beside it, and goes on when let go far enough', async ({ browser }, testInfo) => {
    const { ctx, page } = await openRef(browser, testInfo);
    await page.mouse.move(300, 500);
    await page.mouse.down();
    await page.mouse.move(280, 502);
    await page.mouse.move(190, 505);
    expect(await page.$eval('#frame', (el) => el.style.transform)).toBe('translate3d(-110px, 0px, 0px)');
    // Tags is drawn beside the page, a page to the right, moving with it.
    const leaf = page.locator('.slide-leaf');
    await expect(leaf.locator('.tag-mine-head')).toHaveCount(1);
    const box = await leaf.boundingBox();
    expect(Math.round(box.x)).toBe(390 - 110);
    await page.mouse.up();
    await slideStarted(page);
    expect((await frameAnimation(page)).frames).toEqual(['translate3d(-110px, 0px, 0px)', 'translate3d(-390px, 0px, 0px)']);
    await expect(page).toHaveURL(/#\/folders$/);
    await expect(page.locator('.slide-leaf')).toHaveCount(0, { timeout: 2000 });
    await ctx.close();
  });

  test('let go too soon, it slides back and stays on Mood boards', async ({ browser }, testInfo) => {
    const { ctx, page } = await openRef(browser, testInfo);
    await page.mouse.move(300, 500);
    await page.mouse.down();
    await page.mouse.move(285, 500);
    await page.mouse.move(270, 501);
    expect(await page.$eval('#frame', (el) => el.style.transform)).toBe('translate3d(-30px, 0px, 0px)');
    await page.mouse.up();
    await slideStarted(page);
    const anim = await frameAnimation(page);
    expect(anim).toEqual({ ms: 240, ease: 'cubic-bezier(0.4, 0, 0.2, 1)', frames: ['translate3d(-30px, 0px, 0px)', 'translate3d(0px, 0px, 0px)'] });
    await expect(page.locator('.slide-leaf')).toHaveCount(0, { timeout: 2000 });
    await expect(page).toHaveURL(/#\/boards$/);
    await ctx.close();
  });
});
