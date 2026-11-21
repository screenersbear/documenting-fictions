// Story templates (Starky, 20 Nov): a Story gets story versions of the post
// layouts and no panoramas; posts keep theirs. No Instagram safe zone.
import { test, expect, chromium } from '@playwright/test';
import { freshPage } from './_helpers.mjs';

async function toTemplates(page, size) {
  await page.locator('.list-head .list-act', { hasText: 'New layout' }).click();
  await expect(page.locator('.sheet-guide')).toBeVisible();
  // A sheet ignores taps for its first 450ms (components/sheet.js).
  await page.waitForTimeout(500);
  await page.locator(`.size-card[aria-label="${size}"]`).click();
  await page.locator('[data-next]').click();
  await expect(page.locator('.tpl-picks')).toBeVisible();
}

test('Layouts: a Story offers story versions of the post layouts and no panoramas', async ({ browser }, testInfo) => {
  // As in layouts-from-eye: Chromium made to look like the iPhone, at the
  // phone's size from the first load.
  const own = browser.browserType().name() === 'webkit' ? await chromium.launch() : null;
  const { ctx, page } = await freshPage(own || browser, testInfo, '/contact-sheet/#/contents', { returning: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator('.list-head')).toBeVisible();
  await toTemplates(page, 'Story 9:16');
  await expect(page.locator('.tpl-pick-name')).toHaveText(['Blank', 'Full bleed', 'Series of 3', 'White border', 'Two stacked', 'Three stacked', 'Big top, two below', 'Grid of 4', 'Grid of 6', 'Small, centred']);
  await expect(page.locator('.page-ask')).toHaveText('Start from a story layout, or blank.');
  // The Story set is built in: nothing to rename or delete.
  await expect(page.locator('.tpl-pick-more')).toHaveCount(0);

  // Back to a feed post: the panoramas are still there.
  await page.locator('.page-foot [data-back]').click();
  await page.locator('.size-card[aria-label="Feed post 3:4"]').click();
  await page.locator('[data-next]').click();
  // The Template step draws once the saved templates are read: wait for it.
  await expect(page.locator('.tpl-pick-name')).toHaveText(['Blank', 'White border', 'Two-slide panorama', 'Panorama plus singles']);

  // Made as a Story from Grid of 4: four boxes, and no Instagram safe zone.
  await page.locator('.page-foot [data-back]').click();
  await page.locator('.size-card[aria-label="Story 9:16"]').click();
  await page.locator('[data-next]').click();
  await page.locator('.tpl-pick-btn', { hasText: 'Grid of 4' }).click();
  await expect(page.locator('.tpl-pick.on .tpl-pick-name')).toHaveText('Grid of 4');
  await page.locator('[data-next]').click();
  await expect(page).toHaveURL(/#\/edit\//);
  await expect(page.locator('.strip-frames .fr')).toHaveCount(4);
  await expect(page.getByText('Instagram covers this')).toHaveCount(0);
  await expect(page.locator('.safe-band')).toHaveCount(0);
  await ctx.close();
  if (own) await own.close();
});
