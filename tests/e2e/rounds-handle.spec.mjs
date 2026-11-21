// The @ in the Instagram field (rounds/NOTES.md, 21 Nov): adding a person
// and editing one, the Instagram box (and TikTok's) has an @ fixed at its
// start, so only the handle is typed. Typing or pasting "@june.park" or a
// profile link leaves just "june.park"; spaces go. Saved as before.
import { test, expect } from '@playwright/test';
import { openRounds, opened } from './_rounds.mjs';

async function menu(page, name, label) {
  await page.click('#view [data-band-more]');
  const m = await opened(page, name);
  await m.locator('.choice', { hasText: label }).click();
}

test.describe('Rounds: the @ in the handle boxes', () => {
  test('Add someone: an @ before the box, and just the handle typed, pasted or linked', async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openRounds(browser, testInfo, '/rounds/#/people');
    await page.click('#view .list-head [data-add]');
    const add = await opened(page, 'Add someone');
    const box = add.locator('.handle-box', { has: page.locator('input[name="instagram"]') });
    const ig = box.locator('input');
    await expect(box.locator('.handle-at')).toHaveText('@');
    await expect(ig).toHaveAttribute('placeholder', 'handle');
    await expect(ig).toHaveValue('');
    // The @ is ink, the size of the text, and the cursor starts right after it.
    const look = await box.evaluate((b) => {
      const at = getComputedStyle(b.querySelector('.handle-at'));
      const input = getComputedStyle(b.querySelector('input'));
      const ink = getComputedStyle(document.documentElement).getPropertyValue('--band').trim();
      return { atSize: at.fontSize, inputSize: input.fontSize, color: at.color, ink };
    });
    expect(look.atSize).toBe(look.inputSize);
    expect(look.color).toBe(await page.evaluate((hex) => { const d = document.createElement('span'); d.style.color = hex; document.body.appendChild(d); const c = getComputedStyle(d).color; d.remove(); return c; }, look.ink));
    await box.locator('.handle-at').click();
    await expect(ig).toBeFocused();
    // Typed with its @: the @ goes.
    await ig.pressSequentially('@june.park');
    await expect(ig).toHaveValue('june.park');
    // A profile link pasted: just the handle.
    await ig.fill('https://www.instagram.com/june.park/?igsh=MWQ1ZGUxMzBkMA==');
    await expect(ig).toHaveValue('june.park');
    await ig.fill('instagram.com/june.park');
    await expect(ig).toHaveValue('june.park');
    // Spaces go.
    await ig.fill(' june .park ');
    await expect(ig).toHaveValue('june.park');
    await add.locator('input[name="name"]').fill('June Park');
    await add.locator('button[type="submit"]').click();
    await expect(page.locator('#view .person-handle')).toHaveText('@june.park');
    expect(problems).toEqual([]);
    await ctx.close();
  });

  test('Edit: Instagram and TikTok both start with the @, and keep what was saved', async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openRounds(browser, testInfo, '/rounds/#/people');
    await page.click('#view .list-head [data-add]');
    const add = await opened(page, 'Add someone');
    await add.locator('input[name="name"]').fill('June Park');
    await add.locator('input[name="instagram"]').fill('@june.park');
    await add.locator('button[type="submit"]').click();
    await expect(page.locator('#view .person-name')).toHaveText('June Park');
    await menu(page, 'June Park', 'Edit');
    const edit = await opened(page, 'Edit');
    await expect(edit.locator('.handle-box .handle-at')).toHaveText(['@', '@']);
    await expect(edit.locator('input[name="instagram"]')).toHaveValue('june.park');
    const tt = edit.locator('input[name="tiktok"]');
    await expect(tt).toHaveValue('');
    await tt.fill('https://www.tiktok.com/@june.dances?lang=en');
    await expect(tt).toHaveValue('june.dances');
    await edit.locator('button[type="submit"]').click();
    await expect(edit).toHaveCount(0);
    await menu(page, 'June Park', 'Edit');
    const again = await opened(page, 'Edit');
    await expect(again.locator('input[name="tiktok"]')).toHaveValue('june.dances');
    await expect(again.locator('input[name="instagram"]')).toHaveValue('june.park');
    expect(problems).toEqual([]);
    await ctx.close();
  });
});
