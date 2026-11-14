// The Eye: turning sections is a plain slide (Starky, 14 Nov). No page turn:
// the page follows the finger and settles in 240ms on the curve
// (.4, 0, .2, 1), no bounce or curl. With Reduce Motion, a 150ms crossfade.
import { test, expect } from '@playwright/test';
import { freshPage } from './_helpers.mjs';

async function openEye(browser, testInfo) {
  const { ctx, page } = await freshPage(browser, testInfo, '/the-eye/', { returning: true });
  await page.setViewportSize({ width: 390, height: 844 });
  // Drawn again at the new size (the page measures the screen as it loads).
  await page.reload();
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.locator('#view-overview')).toBeVisible();
  return { ctx, page };
}

// The animation on the slide while it runs: its time, its curve and where it goes.
const slideAnimation = (page, sel) => page.$eval(sel, (el) => {
  const a = el.getAnimations()[0];
  const t = a.effect.getTiming();
  return { ms: t.duration, ease: t.easing, frames: a.effect.getKeyframes().map((k) => k.transform || String(k.opacity)) };
});

// A finger on the page: start, move along, let go (the page listens on the document).
const touch = (page, type, x, y) => page.evaluate(({ type, x, y }) => {
  const target = document.elementFromPoint(x, y) || document.body;
  const ev = new Event(type, { bubbles: true, cancelable: true });
  const point = [{ clientX: x, clientY: y, identifier: 1, target }];
  ev.touches = type === 'touchend' ? [] : point;
  ev.changedTouches = point;
  target.dispatchEvent(ev);
}, { type, x, y });

test.describe('The Eye: sections slide, never turn', () => {
  test('a tap on a section slides the page over in 240ms, with no page turn', async ({ browser }, testInfo) => {
    const { ctx, page } = await openEye(browser, testInfo);
    await page.click('.tabbar .tab[data-view="shoots"]');
    const anim = await slideAnimation(page, '.nb-slide-strip');
    expect(anim.ms).toBe(240);
    expect(anim.ease).toBe('cubic-bezier(0.4, 0, 0.2, 1)');
    expect(anim.frames).toEqual(['translate3d(0px, 0px, 0px)', 'translate3d(-390px, 0px, 0px)']);
    await expect(page.locator('.nb-turn')).toHaveCount(0);
    await expect(page.locator('.nb-slide')).toHaveCount(0, { timeout: 2000 });
    await expect(page.locator('#view-shoots')).toBeVisible();
    // Going back slides the other way.
    await page.click('.tabbar .tab[data-view="overview"]');
    expect((await slideAnimation(page, '.nb-slide-strip')).frames).toEqual(['translate3d(0px, 0px, 0px)', 'translate3d(390px, 0px, 0px)']);
    await expect(page.locator('.nb-slide')).toHaveCount(0, { timeout: 2000 });
    await expect(page.locator('#view-overview')).toBeVisible();
    await ctx.close();
  });

  test('with Reduce Motion it crossfades in 150ms', async ({ browser }, testInfo) => {
    const { ctx, page } = await openEye(browser, testInfo);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.click('.tabbar .tab[data-view="shoots"]');
    const anim = await slideAnimation(page, '.nb-slide-fade');
    expect(anim.ms).toBe(150);
    expect(anim.frames).toEqual(['1', '0']);
    await expect(page.locator('.nb-slide-strip')).toHaveCount(0);
    await expect(page.locator('.nb-slide')).toHaveCount(0, { timeout: 2000 });
    await expect(page.locator('#view-shoots')).toBeVisible();
    await ctx.close();
  });

  test('the page follows the finger, and goes on when let go far enough', async ({ browser }, testInfo) => {
    const { ctx, page } = await openEye(browser, testInfo);
    await touch(page, 'touchstart', 300, 500);
    await touch(page, 'touchmove', 280, 502);
    await touch(page, 'touchmove', 190, 505);
    // The two pages sit side by side, 110 along, under the finger.
    expect(await page.$eval('.nb-slide-strip', (el) => el.style.transform)).toBe('translate3d(-110px, 0px, 0px)');
    expect(await page.locator('.nb-slide-pane').count()).toBe(2);
    await touch(page, 'touchend', 190, 505);
    expect((await slideAnimation(page, '.nb-slide-strip')).frames).toEqual(['translate3d(-110px, 0px, 0px)', 'translate3d(-390px, 0px, 0px)']);
    await expect(page.locator('.nb-slide')).toHaveCount(0, { timeout: 2000 });
    await expect(page.locator('#view-shoots')).toBeVisible();
    await expect(page.locator('.tabbar .tab.active')).toHaveAttribute('data-view', 'shoots');
    await ctx.close();
  });

  test('let go too soon, it slides back and stays on the same section, where it was', async ({ browser }, testInfo) => {
    const { ctx, page } = await openEye(browser, testInfo);
    await page.click('.tabbar .tab[data-view="shoots"]');
    await expect(page.locator('.nb-slide')).toHaveCount(0, { timeout: 2000 });
    await touch(page, 'touchstart', 300, 500);
    await touch(page, 'touchmove', 320, 500);
    await touch(page, 'touchmove', 330, 501);
    expect(await page.$eval('.nb-slide-strip', (el) => el.style.transform)).toBe('translate3d(30px, 0px, 0px)');
    // The finger rests a moment before letting go: no flick.
    await page.waitForTimeout(150);
    await touch(page, 'touchend', 330, 501);
    expect((await slideAnimation(page, '.nb-slide-strip')).frames).toEqual(['translate3d(30px, 0px, 0px)', 'translate3d(0px, 0px, 0px)']);
    await expect(page.locator('.nb-slide')).toHaveCount(0, { timeout: 2000 });
    await expect(page.locator('#view-shoots')).toBeVisible();
    await expect(page.locator('.tabbar .tab.active')).toHaveAttribute('data-view', 'shoots');
    await ctx.close();
  });

  test('a finger going up and down scrolls; it never starts a slide', async ({ browser }, testInfo) => {
    const { ctx, page } = await openEye(browser, testInfo);
    await touch(page, 'touchstart', 200, 600);
    await touch(page, 'touchmove', 195, 560);
    await touch(page, 'touchmove', 150, 520);
    await expect(page.locator('.nb-slide')).toHaveCount(0);
    await touch(page, 'touchend', 150, 520);
    await expect(page.locator('#view-overview')).toBeVisible();
    await ctx.close();
  });
});
