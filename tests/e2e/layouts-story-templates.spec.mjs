// Story templates (Starky, 20 Nov): a Story gets story versions of the post
// layouts and no panoramas; posts keep theirs. No Instagram safe zone.
import { test, expect } from '@playwright/test';
import { freshPage } from './_helpers.mjs';

async function toTemplates(page, size) {
  await page.locator('.list-head .list-act', { hasText: 'New layout' }).click();
  await expect(page.locator('.sheet-guide')).toBeVisible();
  await page.locator('[data-next]').click();
  await page.locator(`.size-card[aria-label="${size}"]`).click();
  await page.locator('[data-next]').click();
  await expect(page.locator('.tpl-picks')).toBeVisible();
  return page.$$eval('.tpl-pick-name', (els) => els.map((e) => e.textContent));
}

test('Layouts: a Story offers story versions of the post layouts and no panoramas', async ({ browser }, testInfo) => {
  const { ctx, page } = await freshPage(browser, testInfo, '/contact-sheet/#/contents', { returning: true });
  await page.setViewportSize({ width: 390, height: 844 });
  const story = await toTemplates(page, 'Story 9:16');
  expect(story).toEqual(['Blank', 'Full bleed', 'Series of 3', 'White border', 'Two stacked', 'Three stacked', 'Big top, two below', 'Grid of 4', 'Grid of 6', 'Small, centred']);
  await expect(page.locator('.page-ask')).toHaveText('Start from a story layout, or blank.');
  // The Story set is built in: nothing to rename or delete.
  await expect(page.locator('.tpl-pick-more')).toHaveCount(0);

  // Back to a feed post: the panoramas are still there.
  await page.locator('.page-foot [data-back]').click();
  await page.locator('.size-card[aria-label="Feed post 3:4"]').click();
  await page.locator('[data-next]').click();
  const post = await page.$$eval('.tpl-pick-name', (els) => els.map((e) => e.textContent));
  expect(post).toEqual(['Blank', 'White border', 'Two-slide panorama', 'Panorama plus singles']);

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
});
