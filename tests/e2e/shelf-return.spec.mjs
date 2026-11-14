// Coming back to the shelf from a notebook, the book shuts into the shelf
// and the bar under it (the front notebook's name, the dots, Options) stays
// hidden until it has. The bug (13 Nov): the bar showed for a moment first,
// then faded out, then faded back in; a click test that looked at the shelf
// at that moment missed the Options button.
import { test, expect } from '@playwright/test';
import { freshPage } from './_helpers.mjs';

// Notes the bar's opacity on every frame from the very first one.
function watchBar() {
  window.__bar = [];
  const t0 = performance.now();
  const look = () => {
    const bar = document.getElementById('shelfBar');
    if (bar) window.__bar.push([Math.round(performance.now() - t0), Number(getComputedStyle(bar).opacity)]);
    if (performance.now() - t0 < 4000) requestAnimationFrame(look);
  };
  requestAnimationFrame(look);
}

test('coming back from a notebook, the bar stays hidden until the book has shut, then shows', async ({ browser }, testInfo) => {
  const { ctx, page } = await freshPage(browser, testInfo, '/', { returning: true });
  await ctx.addInitScript(watchBar);
  await page.goto('/?from=contact-sheet');
  await page.waitForTimeout(600);
  const early = await page.evaluate(() => window.__bar.filter(([t]) => t < 500));
  expect(early.length).toBeGreaterThan(0);
  expect(early.filter(([, o]) => o > 0), 'the bar showed while the book was still shutting').toEqual([]);
  // Once the book has shut, the bar is back, with Options for the notebook you came from.
  await expect.poll(() => page.evaluate(() => Number(getComputedStyle(document.getElementById('shelfBar')).opacity)), { timeout: 5000 }).toBe(1);
  await expect(page.locator('#optionsBtn')).toHaveAttribute('aria-label', 'Options for Layouts');
  await ctx.close();
});

test('coming back quietly, the bar is there straight away', async ({ browser }, testInfo) => {
  const { ctx, page } = await freshPage(browser, testInfo, '/', { returning: true });
  await page.goto('/?from=contact-sheet&still');
  await page.waitForTimeout(500);
  expect(await page.evaluate(() => Number(getComputedStyle(document.getElementById('shelfBar')).opacity))).toBe(1);
  await expect(page.locator('html')).not.toHaveClass(/arriving/);
  await ctx.close();
});
