// Ref's toast: a short bar at the bottom, in the middle. (It used to share
// its "show" class with the slideshow, whose rule made it a dark panel over
// half the screen.)
import { test, expect } from '@playwright/test';
import { freshPage } from './_helpers.mjs';

test("a toast is a short bar at the bottom, in the middle", async ({ browser }, testInfo) => {
  const { ctx, page } = await freshPage(browser, testInfo, '/ref/#/new', { returning: true });
  await expect(page.locator('.new-board .guide-title')).toHaveText('Name and page size');
  await page.locator('[data-next]').click();
  await page.locator('[data-next]').click();
  await page.locator('[data-start="fill"]').click();
  await page.locator('[data-next]').click();
  const toast = page.locator('#toast');
  await expect(toast).toHaveText('Pick a tag for Section 1, or start blank');
  const [box, vw, vh] = await toast.evaluate((el) => { const r = el.getBoundingClientRect(); return [{ x: r.x, y: r.y, w: r.width, h: r.height }, innerWidth, innerHeight]; });
  expect(box.h).toBeLessThan(80);
  expect(box.x).toBeGreaterThanOrEqual(0);
  expect(Math.abs(box.x + box.w / 2 - vw / 2)).toBeLessThan(2);
  expect(box.y).toBeGreaterThan(vh / 2);
  expect(await toast.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(49, 61, 69)');
  await ctx.close();
});
