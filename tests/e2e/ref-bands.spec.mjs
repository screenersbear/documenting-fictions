// Ref's bands (Starky, 14 Nov): only Notebooks and Options in the band, no
// +. Adding sits beside the list it adds to: NEW BOARD beside "Boards N",
// NEW TAG beside "Your tags N". And the band's rising mark is the 2 x 2
// board turned 45 degrees and cut by the band's edge, a peak 80 wide and 40
// tall (ref/NOTES.md, round 2).
import { test, expect } from '@playwright/test';
import { freshPage } from './_helpers.mjs';

async function openRef(browser, testInfo, hash) {
  const { ctx, page } = await freshPage(browser, testInfo, `/ref/${hash}`, { returning: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.band').first()).toBeVisible();
  return { ctx, page };
}

const bandButtons = (page) => page.$$eval('.band:not(.band-short) .band-btns button', (els) => els.map((b) => b.getAttribute('aria-label')));

test.describe('Ref: two buttons in the band, adding beside the list, the turned mark', () => {
  test('Mood boards: Notebooks and Options only; NEW BOARD beside the count opens a new board', async ({ browser }, testInfo) => {
    const { ctx, page } = await openRef(browser, testInfo, '#/boards');
    expect(await bandButtons(page)).toEqual(['Back to your notebooks', 'Options']);
    const add = page.locator('.list-head .list-act', { hasText: 'New board' });
    await expect(add).toBeVisible();
    await add.click();
    await expect(page).toHaveURL(/#\/new$/);
    await ctx.close();
  });

  test('Tags: Notebooks and Options only; NEW TAG beside Your tags opens New tag', async ({ browser }, testInfo) => {
    const { ctx, page } = await openRef(browser, testInfo, '#/folders');
    expect(await bandButtons(page)).toEqual(['Back to your notebooks', 'Options']);
    const head = page.locator('.tag-mine-head');
    await expect(head.locator('h2')).toContainText('Your tags');
    const add = head.locator('.list-act', { hasText: 'New tag' });
    await expect(add).toBeVisible();
    // Only one NEW TAG on the page, even with no tags yet.
    await expect(page.locator('.list-act', { hasText: 'New tag' })).toHaveCount(1);
    const h2 = await head.locator('h2').boundingBox();
    const btn = await add.boundingBox();
    expect(Math.abs((btn.y + btn.height / 2) - (h2.y + h2.height / 2))).toBeLessThan(3);
    expect(Math.round(btn.height)).toBe(44);
    await add.click();
    await expect(page.locator('.field-label', { hasText: 'Tag name' })).toBeVisible();
    await ctx.close();
  });

  test('the band mark is the board turned 45 degrees, rising 40 out of the band\'s foot', async ({ browser }, testInfo) => {
    const { ctx, page } = await openRef(browser, testInfo, '#/boards');
    const mark = page.locator('.band:not(.band-short) .band-mark').first();
    await expect(mark).toHaveAttribute('viewBox', '0 0 80 40');
    expect(await mark.locator('g').getAttribute('transform')).toContain('rotate(45)');
    const box = await mark.boundingBox();
    const band = await page.locator('.band:not(.band-short)').first().boundingBox();
    expect(Math.round(box.width)).toBe(80);
    expect(Math.round(box.height)).toBe(40);
    expect(Math.round(box.y + box.height)).toBe(Math.round(band.y + band.height));
    expect(Math.round(box.x - band.x)).toBe(16);
    // Salmon top-left and bottom-right, white the other two.
    expect(await mark.locator('rect').evaluateAll((rs) => rs.map((r) => r.getAttribute('class')))).toEqual(['mk-p', 'mk-w', 'mk-w', 'mk-p']);
    await ctx.close();
  });
});
