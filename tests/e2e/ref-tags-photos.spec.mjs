// Ref, 21 Nov (Starky): bringing photos in from the first visit and from
// Tags, what Ref found in the photos listed as tags, and deleting a tag
// asking what goes: just the tag, or the tag and its photos.
import { test, expect } from '@playwright/test';
import { freshPage } from './_helpers.mjs';

// The sheets ignore taps for their first 450ms (components/sheet.js).
const settle = (page) => page.waitForTimeout(500);
const photo = async (page, name, w, h) => {
  const url = await page.evaluate(([w, h]) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = '#C9A27A'; x.fillRect(0, 0, w, h); return c.toDataURL('image/jpeg', 0.8); }, [w, h]);
  return { name, mimeType: 'image/jpeg', buffer: Buffer.from(url.split(',')[1], 'base64') };
};
const three = async (page) => [await photo(page, 'a.jpg', 300, 400), await photo(page, 'b.jpg', 400, 300), await photo(page, 'c.jpg', 300, 300)];
const tagsOff = () => localStorage.setItem('ref-notebook-tags', 'off'); // Ref's own labels: set by hand below
// Ref's photos and tags, straight from its database.
const store = (page, name) => page.evaluate((n) => new Promise((ok) => {
  const req = indexedDB.open('ref-notebook');
  req.onsuccess = () => { const g = req.result.transaction(n).objectStore(n).getAll(); g.onsuccess = () => { ok(g.result); req.result.close(); }; };
}), name);
const putAll = (page, name, list) => page.evaluate(([n, rows]) => new Promise((ok) => {
  const req = indexedDB.open('ref-notebook');
  req.onsuccess = () => { const t = req.result.transaction(n, 'readwrite'); rows.forEach((r) => t.objectStore(n).put(r)); t.oncomplete = () => { req.result.close(); ok(); }; };
}), [name, list]);
const sheetCalled = (page, title) => page.locator('.sheet', { has: page.locator('h2', { hasText: title }) });

test('the first visit asks to bring your photos in, and they land in Incoming', async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await freshPage(browser, testInfo, '/ref/');
  await ctx.addInitScript(tagsOff);
  await page.reload();
  const hello = page.locator('.sheet.intro');
  await expect(hello).toBeVisible({ timeout: 5000 });
  for (const step of ['next', 'no', 'done']) { await settle(page); await hello.locator(`[data-step="${step}"]`).click(); }
  const ask = sheetCalled(page, 'Bring your photos in');
  await expect(ask).toBeVisible();
  await expect(ask.locator('.sheet-message')).toHaveText('Ref works best with your own photos in it. Pick the ones you love from your phone. Ref keeps its own copy.');
  await expect(ask.locator('button')).toHaveText(['', 'Later', 'Open your photos']);
  await settle(page);
  const chooser = page.waitForEvent('filechooser');
  await ask.locator('[data-yes]').click();
  await (await chooser).setFiles(await three(page));
  await expect(page).toHaveURL(/#\/folder\/incoming$/);
  await expect(page.locator('.grid .tile[data-i]')).toHaveCount(3, { timeout: 15000 });
  await expect(page.locator('.guide-note .guide-title')).toHaveText('Now tag them');
  expect(problems).toEqual([]);
  await ctx.close();
});

test('Later goes to Incoming, as before', async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await freshPage(browser, testInfo, '/ref/');
  await ctx.addInitScript(tagsOff);
  await page.reload();
  const hello = page.locator('.sheet.intro');
  await expect(hello).toBeVisible({ timeout: 5000 });
  for (const step of ['next', 'no', 'done']) { await settle(page); await hello.locator(`[data-step="${step}"]`).click(); }
  const ask = sheetCalled(page, 'Bring your photos in');
  await settle(page);
  await ask.locator('[data-no]').click();
  await expect(ask).toHaveCount(0);
  await expect(page).toHaveURL(/#\/folder\/incoming$/);
  await expect(page.locator('.guide-note .guide-title')).toHaveText('Bring your photos in');
  expect(problems).toEqual([]);
  await ctx.close();
});

test('Tags: ADD PHOTOS, the tags Ref found, and deleting a tag asks what goes', async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await freshPage(browser, testInfo, '/ref/#/folders', { returning: true });
  await ctx.addInitScript(tagsOff);
  await page.reload();
  const head = page.locator('.tag-photos-head');
  await expect(head.locator('h2')).toHaveText('Your photos 0');
  // Before opening any tag.
  const chooser = page.waitForEvent('filechooser');
  await head.locator('[data-add]').click();
  await (await chooser).setFiles(await three(page));
  await expect(page.locator('#toast')).toContainText('3 photos added', { timeout: 15000 });
  await expect(head.locator('h2')).toHaveText('Your photos 3');
  await expect(page.locator('.tag-found-head')).toHaveCount(0);
  // What Ref found in them, and one of your own tags with two of them.
  const [a, b, c] = (await store(page, 'photos')).sort((x, y) => x.name.localeCompare(y.name));
  await putAll(page, 'folders', [{ id: 'f1', name: 'Beach', createdAt: '2026-11-21T10:00:00.000Z', updatedAt: '2026-11-21T10:00:00.000Z' }]);
  await putAll(page, 'photos', [{ ...a, tags: ['dog', 'park'], folderIds: ['f1'] }, { ...b, tags: ['dog'], folderIds: ['f1'] }, { ...c, tags: [] }]);
  await page.reload();
  await expect(page.locator('.tag-found-head h2')).toHaveText('Found in your photos 2');
  await expect(page.locator('.tag-row.found .tag-name')).toHaveText(['Dog', 'Park']);
  await expect(page.locator('.tag-row.found .tag-count')).toHaveText(['2', '1']);
  await page.locator('.tag-row.found', { hasText: 'Dog' }).click();
  await expect(page).toHaveURL(/#\/folder\/found%3Adog$/);
  await expect(page.locator('.band-line b')).toHaveText('Dog');
  await expect(page.locator('.grid .tile[data-i]')).toHaveCount(2);
  // A found tag: no Rename; Just the tag takes it off the photos, for good.
  await page.locator('[data-band-more]').click();
  await settle(page);
  await expect(page.locator('.sheet .choice-label')).toHaveText(['Delete tag']);
  await page.locator('.sheet .choice', { hasText: 'Delete tag' }).click();
  await settle(page);
  await expect(page.locator('.sheet .choice-label')).toHaveText(['Just the tag', 'The tag and its 2 photos']);
  await page.locator('.sheet .choice', { hasText: 'Just the tag' }).click();
  await expect(page).toHaveURL(/#\/folders$/);
  await expect(page.locator('.tag-row.found .tag-name')).toHaveText(['Park']);
  let photos = await store(page, 'photos');
  expect(photos).toHaveLength(3);
  expect(photos.filter((p) => (p.tags || []).includes('dog'))).toHaveLength(0);
  expect(photos.filter((p) => p.tagsEdited)).toHaveLength(2);
  // Your own tag, with its photos: they go, and Undo brings them back.
  await page.goto('/ref/#/folder/f1');
  await page.locator('[data-band-more]').click();
  await settle(page);
  await expect(page.locator('.sheet .choice-label')).toHaveText(['Rename', 'Delete tag']);
  await page.locator('.sheet .choice', { hasText: 'Delete tag' }).click();
  await settle(page);
  await expect(sheetCalled(page, 'Delete Beach?')).toBeVisible();
  await expect(page.locator('.sheet .choice-detail').first()).toHaveText('Its 2 photos stay in the notebook, without this tag');
  await page.locator('.sheet .choice', { hasText: 'The tag and its 2 photos' }).click();
  await expect(page).toHaveURL(/#\/folders$/);
  await expect(page.locator('#toast')).toContainText('Tag and 2 photos deleted');
  await expect(head.locator('h2')).toHaveText('Your photos 1');
  await expect(page.locator('.tag-row.mine')).toHaveCount(0);
  expect(await store(page, 'folders')).toHaveLength(0);
  await page.locator('#toast .toast-action').click();
  await expect(page).toHaveURL(/#\/folder\/f1$/);
  await expect(page.locator('.grid .tile[data-i]')).toHaveCount(2);
  photos = await store(page, 'photos');
  expect(photos).toHaveLength(3);
  expect(photos.filter((p) => p.folderIds.includes('f1'))).toHaveLength(2);
  expect(problems).toEqual([]);
  await ctx.close();
});
