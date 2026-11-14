// The Eye's viewport tag: interactive-widget (the page shrinks for the
// keyboard) only on Android, whose browsers know it. Safari logs
// 'Viewport argument key "interactive-widget" not recognized and ignored.'
// as an error for it: GitHub's iPhone tests caught that (14 Nov).
import { test, expect } from '@playwright/test';

const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36';

for (const [phone, userAgent, has] of [['an iPhone', IPHONE, false], ['Android', ANDROID, true]]) {
  test(`on ${phone}, The Eye's viewport tag ${has ? 'has' : 'leaves out'} interactive-widget`, async ({ browser }) => {
    const ctx = await browser.newContext({ userAgent });
    const page = await ctx.newPage();
    await page.goto('/the-eye/');
    const content = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(content.includes('interactive-widget=resizes-content')).toBe(has);
    expect(content).toContain('width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1');
    await ctx.close();
  });
}

// Turning the phone (or resizing the window) breaks the pages again. Since
// Archive mode was merged (13 Nov) that called a step that's gone, and the
// error stopped the shoot mode's pages from following.
test("resizing The Eye breaks its pages again without an error", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/the-eye/');
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.setViewportSize({ width: 844, height: 390 });
  await page.waitForTimeout(600);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(600);
  expect(errors).toEqual([]);
  await ctx.close();
});
