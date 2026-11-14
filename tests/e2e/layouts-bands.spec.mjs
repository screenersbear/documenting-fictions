// Layouts' band (Starky, 14 Nov): only Notebooks and Options, no +. NEW
// LAYOUT sits beside the list it adds to, "Newest first N".
import { test, expect } from '@playwright/test';
import { freshPage } from './_helpers.mjs';

test('Layouts: Notebooks and Options only in the band; NEW LAYOUT beside the list starts a new one', async ({ browser }, testInfo) => {
  const { ctx, page } = await freshPage(browser, testInfo, '/contact-sheet/#/contents', { returning: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.band').first()).toBeVisible();
  const buttons = await page.$$eval('.band:not(.band-short) .band-btns button', (els) => els.map((b) => b.getAttribute('aria-label')));
  expect(buttons).toEqual(['Back to your notebooks', 'Options']);
  await expect(page.locator('[data-band-add]')).toHaveCount(0);
  const head = page.locator('.list-head', { hasText: 'Newest first' });
  const add = head.locator('.list-act', { hasText: 'New layout' });
  await expect(add).toBeVisible();
  expect(Math.round((await add.boundingBox()).height)).toBe(44);
  await add.click();
  await expect(page.locator('.sheet-guide')).toBeVisible();
  await ctx.close();
});
