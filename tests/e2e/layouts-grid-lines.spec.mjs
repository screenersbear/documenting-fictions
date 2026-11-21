// Grid lines (Starky, 21 Nov): "when you're in layout and choose a grid
// layout style, it doesn't show lines of division to see where an image goes
// in the actual slide". A feed post has no border, so a Grid of 4 is four
// empty boxes touching; each empty box now has an edge you can see, in the
// editor only (exports leave empty boxes as background, components/render.js).
import { test, expect } from '@playwright/test';
import { freshPage } from './_helpers.mjs';

test('Layouts: each empty box in a grid shows its edge on the slide', async ({ browser }, testInfo) => {
  const { ctx, page } = await freshPage(browser, testInfo, '/contact-sheet/#/contents', { returning: true });
  await expect(page.locator('.list-head')).toBeVisible();
  await page.locator('.list-head .list-act', { hasText: 'New layout' }).click();
  await expect(page.locator('.sheet-guide')).toBeVisible();
  // A sheet ignores taps for its first 450ms (components/sheet.js).
  await page.waitForTimeout(500);
  await page.locator('.size-card[aria-label="Feed post 3:4"]').click();
  await page.locator('[data-next]').click();
  await expect(page.locator('.tpl-pick-name').first()).toHaveText('Blank');
  await page.locator('[data-next]').click();
  await expect(page).toHaveURL(/#\/edit\//);
  // No Name step (21 Nov): it's named for the day, and renamed from its button.
  await expect(page.locator('.ed-name-btn span')).toHaveText(/^Layout, \d{1,2} [A-Z][a-z]{2}$/);

  // The Grid button, then Grid of 4: four boxes with no space between them.
  await page.locator('.ed-tools .tool', { hasText: 'Grid' }).click();
  await page.waitForTimeout(500);
  await page.locator('.layout-opt', { hasText: 'Grid of 4' }).click();
  const empties = page.locator('.strip-frames .fr.is-empty .fr-empty');
  await expect(empties).toHaveCount(4);
  for (let i = 0; i < 4; i++) {
    const edge = await empties.nth(i).evaluate((el) => getComputedStyle(el).boxShadow);
    expect(edge).not.toBe('none');
    expect(edge).toContain('inset');
  }
  await ctx.close();
});
