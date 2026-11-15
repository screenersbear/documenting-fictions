// Back up (round 2, backup/01-back-up.html and NOTES.md, 15 Nov): one Back
// up button on the shelf and in each notebook's Options opens a sheet with
// Just <the notebook> and All four notebooks. Restore takes either kind: on
// the shelf a backup of one notebook puts back just that one and says which;
// inside a notebook a backup of all four asks first, Just <it> or All four.
// (What goes in and comes back out is unit tested: tests/unit/shared/backups*.)
import { test, expect } from '@playwright/test';
import { freshPage } from './_helpers.mjs';

async function onShelf(browser, testInfo) {
  const r = await freshPage(browser, testInfo, '/', { returning: true });
  await r.page.setViewportSize({ width: 390, height: 844 });
  await r.page.reload();
  await expect.poll(() => r.page.evaluate(() => Number(getComputedStyle(document.getElementById('shelfBar')).opacity)), { timeout: 5000 }).toBe(1);
  // Saving hands over by download here, as on a computer (a phone's share sheet can't be clicked through).
  await r.page.evaluate(() => Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true }));
  return r;
}
async function options(page) {
  await page.click('#optionsBtn');
  await expect(page.locator('.sheet.opts [data-connect]')).toBeVisible();
  await page.waitForTimeout(300);
}
// A backup made in the page (one notebook's, or all four's), as a file to pick.
async function backupFile(page, only) {
  const [name, b64] = await page.evaluate(async (app) => {
    const made = await window.DFBackups.makeBackup(undefined, app || undefined);
    const f = made.parts[0];
    const bytes = new Uint8Array(await f.arrayBuffer());
    let s = '';
    for (const b of bytes) s += String.fromCharCode(b);
    return [f.name, btoa(s)];
  }, only || null);
  return { name, mimeType: 'application/zip', buffer: Buffer.from(b64, 'base64') };
}
const state = (title) => JSON.stringify({ shoots: [{ id: 's1', title }] });
const eyeTitle = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('dailies_state_v1')).shoots[0].title);

test('the shelf: Back up is Just the notebook in front, or All four notebooks, each saved from a tap', async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await onShelf(browser, testInfo);
  await page.evaluate((s) => localStorage.setItem('dailies_state_v1', s), state('Rooftop'));
  await options(page);
  await expect(page.locator('.sheet.opts [data-backup]')).toHaveText('Back up');
  await expect(page.locator('.sheet.opts [data-restore]')).toHaveText('Restore a backup');
  await page.locator('.sheet.opts [data-backup]').click();
  const sheet = page.locator('.dfb-dim.in .dfb-sheet'); // the one up (one closing can still be there)
  await expect(sheet.locator('h2')).toHaveText('Back up');
  await expect(sheet.locator('.dfb-title')).toHaveText(['Just The Eye', 'All four notebooks']);
  await expect(sheet.locator('.dfb-line')).toHaveText(['The notebook in front. Shoots, guides, reflections and their photos.', 'Ref, The Eye, Layouts and Rounds in one backup, with the shelf.']);
  expect(await sheet.locator('.dfb-four span').evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor))).toEqual([
    'rgb(10, 79, 214)', 'rgb(255, 209, 0)', 'rgb(204, 46, 138)', 'rgb(49, 61, 69)']);

  await sheet.locator('.dfb-row').first().click();
  const save = sheet.locator('[data-save]');
  await expect(save).toHaveText('Save the backup');
  let [download] = await Promise.all([page.waitForEvent('download'), save.click()]);
  expect(download.suggestedFilename()).toMatch(/^the-eye-backup-\d{4}-\d\d-\d\d\.zip$/);
  await expect(sheet.locator('.dfb-note')).toHaveText('Backup saved.');
  await expect(save).toBeHidden();

  await sheet.locator('.dfb-row').nth(1).click();
  await expect(save).toHaveText('Save the backup');
  await expect(sheet.locator('.dfb-row.chosen .dfb-title')).toHaveText('All four notebooks');
  [download] = await Promise.all([page.waitForEvent('download'), save.click()]);
  expect(download.suggestedFilename()).toMatch(/^documenting-fictions-backup-\d{4}-\d\d-\d\d\.zip$/);
  // The Eye's "Last backup" counts it.
  expect(Number(await page.evaluate(() => localStorage.getItem('dailies_last_backup_v1')))).toBeGreaterThan(0);
  await sheet.locator('[data-close]').click();
  await expect(page.locator('.dfb-dim')).toHaveCount(0);
  expect(problems).toEqual([]);
  await ctx.close();
});

test("the shelf: Restore a backup of one notebook puts back just that one, and says which", async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await onShelf(browser, testInfo);
  await page.evaluate((s) => localStorage.setItem('dailies_state_v1', s), state('From the backup'));
  const file = await backupFile(page, 'the-eye');
  await page.evaluate((s) => localStorage.setItem('dailies_state_v1', s), state('Changed since'));
  await options(page);
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.locator('.sheet.opts [data-restore]').click()]);
  await chooser.setFiles(file);
  const sheet = page.locator('.dfb-dim.in .dfb-sheet'); // the one up (one closing can still be there)
  await expect(sheet.locator('h2')).toHaveText('Restore The Eye?');
  await expect(sheet.locator('.dfb-text')).toContainText('Everything in The Eye on this device is swapped');
  await expect(sheet.locator('.dfb-text')).toContainText('The other notebooks stay as they are.');
  await Promise.all([page.waitForEvent('load'), sheet.locator('[data-yes]').click()]);
  expect(await eyeTitle(page)).toBe('From the backup');
  expect(problems).toEqual([]);
  await ctx.close();
});

test('inside a notebook: Back up is Just this notebook or All four, and a backup of all four asks first', async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await onShelf(browser, testInfo);
  await page.evaluate((s) => localStorage.setItem('dailies_state_v1', s), state('Rooftop'));
  const all = await backupFile(page);
  await page.goto('/ref/#/boards');
  await page.locator('[data-app-menu]').first().click();
  await expect(page.locator('[data-backup]')).toBeVisible();
  await page.waitForTimeout(600); // Ref's sheets let a tap through only once they've been up 450 ms (components/sheet.js)
  await page.locator('[data-backup]').click();
  const sheet = page.locator('.dfb-dim.in .dfb-sheet'); // the one up (one closing can still be there)
  await expect(sheet.locator('.dfb-title')).toHaveText(['Just this notebook', 'All four notebooks']);
  await expect(sheet.locator('.dfb-line').first()).toHaveText('Mood boards, tags and their photos.');
  await sheet.locator('[data-close]').click();
  await expect(page.locator('.dfb-dim')).toHaveCount(0);

  // Restore with a backup of all four: Just Ref goes on to Ref's own Restore.
  let [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.locator('[data-restore-backup]').click()]);
  await chooser.setFiles(all);
  await expect(sheet.locator('.dfb-text')).toHaveText('This backup has all four notebooks.');
  await expect(sheet.locator('.dfb-btn')).toHaveText(['Just Ref', 'All four']);
  await sheet.locator('[data-just]').click();
  await expect(page.locator('.sheet-message')).toHaveText("Everything in ref now is swapped for what's in the file.");
  await page.waitForTimeout(600);
  await page.locator('[data-no]').click();
  await expect(page.locator('.sheet-message')).toHaveCount(0);

  // All four: the last word on all of them.
  [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.locator('[data-restore-backup]').click()]);
  await chooser.setFiles(all);
  await sheet.locator('[data-all]').click();
  await expect(sheet.locator('h2')).toHaveText('Restore all four?');
  await sheet.locator('[data-close]').first().click();
  await expect(page.locator('.dfb-dim')).toHaveCount(0);
  expect(problems).toEqual([]);
  await ctx.close();
});
