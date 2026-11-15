// Send finals to Ref? (round 2, connect/18): right after finals are added in
// The Eye, a sheet shows the new ones, none picked, with TAGS (My work, the
// kind and the people on, suggestions off, + Tag). SEND N TO REF passes the
// picked ones on; Ref brings them in as its own photos, under those tags
// (its own tag of a name when it has one), the next time it opens. The
// shoot's More keeps Send finals to Ref for later.
import { test, expect } from '@playwright/test';
import { freshPage } from './_helpers.mjs';

function seed() {
  if (sessionStorage.getItem('eye-finals-seeded')) return;
  sessionStorage.setItem('eye-finals-seeded', '1');
  localStorage.setItem('ref-notebook-tags', 'off'); // Ref's labels: not what's tested, and its model is big
  const shoots = [{ id: 'p1', title: 'Rooftop portraits', category: 'headshot', status: 'delivered', date: '2026-11-07', startTime: '14:00', endTime: '16:30',
    location: { name: 'Rooftop', address: '' }, references: [], frameworkTags: [{ frameworkId: 'f1', tag: 'Golden hour' }], moodboardComplete: false, teamRequired: 'no',
    talents: [{ id: 't1', name: 'June Park', socialHandles: [{ platform: 'instagram', handle: 'junepark.jpg' }] }], teamMembers: [],
    shotList: [], lightingSetups: [], shootingNotes: '', lessonsLearned: '', archived: false }];
  localStorage.setItem('dailies_state_v1', JSON.stringify({ shoots, projects: [], journalEntries: [], frameworks: [{ id: 'f1', name: 'Light', tags: ['Golden hour', 'Blue hour'] }] }));
}
// Two small photos, as if picked from the phone.
async function photos(page) {
  const urls = await page.evaluate(() => ['#C98A57', '#7FA79A'].map((c) => {
    const cv = document.createElement('canvas');
    cv.width = 400; cv.height = 500;
    const x = cv.getContext('2d');
    x.fillStyle = c; x.fillRect(0, 0, 400, 500);
    return cv.toDataURL('image/jpeg', 0.8);
  }));
  return urls.map((u, i) => ({ name: `final-${i + 1}.jpg`, mimeType: 'image/jpeg', buffer: Buffer.from(u.split(',')[1], 'base64') }));
}
const finalsLinks = (page) => page.evaluate(() => window.DFData.linksWhere({ toApp: 'ref', type: 'finals-ref' }));
const refStore = (page, store) => page.evaluate((name) => new Promise((ok) => {
  const req = indexedDB.open('ref-notebook');
  req.onsuccess = () => { const g = req.result.transaction(name).objectStore(name).getAll(); g.onsuccess = () => { ok(g.result); req.result.close(); }; };
}), store);

test("finals added in The Eye: pick, tag and send them to Ref, where they come in under those tags", async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await freshPage(browser, testInfo, '/ref/#/folders', { returning: true });
  await ctx.addInitScript(seed);
  // Ref already has a tag called "my work": the finals go in it, not in a second one.
  await expect.poll(() => refStore(page, 'folders').then((f) => Array.isArray(f))).toBe(true);
  await page.evaluate(() => new Promise((ok) => {
    const req = indexedDB.open('ref-notebook');
    req.onsuccess = () => { const t = req.result.transaction('folders', 'readwrite'); t.objectStore('folders').put({ id: 'mine', name: 'my work', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' }); t.oncomplete = () => { req.result.close(); ok(); }; };
  }));
  await page.goto('/the-eye/?shoot=p1');
  await expect(page.locator('#shootFront')).toBeVisible();
  await page.locator('#shootFront [data-page="postShootHeading"]').first().click();
  await page.locator('#finalImagesFileInput').setInputFiles(await photos(page));
  const sheet = page.locator('#finalsRefOverlay');
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('.finals-ref-title')).toHaveText('Send finals to Ref?');
  await expect(sheet.locator('#finalsRefLine')).toHaveText('Tap the ones you want as references. 0 of 2 picked.');
  await expect(sheet.locator('#finalsRefSend')).toBeDisabled();
  await expect(sheet.locator('.finals-ref-tag[data-tag]')).toHaveText(['My work', 'Headshot', 'June Park', 'Golden hour', 'Rooftop']);
  expect(await sheet.locator('.finals-ref-tag[data-tag]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-pressed')))).toEqual(['true', 'true', 'true', 'false', 'false']);
  await sheet.locator('[data-pick="0"]').click();
  await expect(sheet.locator('#finalsRefLine')).toHaveText('Tap the ones you want as references. 1 of 2 picked.');
  await expect(sheet.locator('[data-pick="0"]')).toHaveAttribute('aria-checked', 'true');
  await expect(sheet.locator('#finalsRefSend')).toHaveText('Send 1 to Ref');
  await sheet.locator('.finals-ref-tag', { hasText: 'Golden hour' }).click();
  await sheet.locator('.finals-ref-tag', { hasText: 'Headshot' }).click();
  await sheet.locator('[data-add-tag]').click();
  await sheet.locator('#finalsRefNew').fill('Winter');
  await sheet.locator('#finalsRefNew').press('Enter');
  await expect(sheet.locator('.finals-ref-tag[aria-pressed="true"]')).toHaveText(['My work', 'June Park', 'Golden hour', 'Winter']);
  await sheet.locator('#finalsRefSend').click();
  await expect(sheet).toBeHidden();
  await expect(page.locator('#toast')).toContainText('1 going to Ref. They come in when Ref opens.');
  const [l] = await finalsLinks(page);
  expect(l).toMatchObject({ fromApp: 'the-eye', fromId: 'p1', title: 'Rooftop portraits', count: 1, tags: ['My work', 'June Park', 'Golden hour', 'Winter'], importedAt: null });
  expect((await page.evaluate((id) => window.DFData.linkPictures(id), l.id)).photos).toHaveLength(1);

  // The shoot's More keeps Send finals to Ref, for all its finals.
  await page.locator('#shootBandMore').click();
  await expect(page.locator('#shootMoreFinalsRefBtn')).toBeVisible();
  await page.locator('#shootMoreFinalsRefBtn').click();
  await expect(sheet.locator('#finalsRefLine')).toHaveText('Tap the ones you want as references. 0 of 2 picked.');
  await sheet.locator('#finalsRefLater').click();
  await expect(sheet).toBeHidden();
  expect(await finalsLinks(page)).toHaveLength(1);

  // Ref, opened: the final comes in under those tags.
  await page.goto('/ref/#/folders');
  await expect(page.locator('#toast')).toHaveText('1 final from The Eye came in', { timeout: 10000 });
  const [photo] = await refStore(page, 'photos');
  const folders = await refStore(page, 'folders');
  const named = (id) => folders.find((f) => f.id === id).name;
  expect(photo.folderIds.map(named)).toEqual(['my work', 'June Park', 'Golden hour', 'Winter']);
  expect(folders).toHaveLength(4);
  const [done] = await finalsLinks(page);
  expect(done.importedAt).toBeTruthy();
  expect(done.photoIds).toEqual([photo.id]);
  expect((await page.evaluate((id) => window.DFData.linkPictures(id), l.id)).photos).toEqual([]);
  // Opened again, nothing comes in twice.
  await page.reload();
  await page.waitForTimeout(2500);
  expect(await refStore(page, 'photos')).toHaveLength(1);
  expect(problems).toEqual([]);
  await ctx.close();
});

test("NOT NOW sends nothing; outside the suite the sheet never shows", async ({ browser }, testInfo) => {
  const { ctx, page } = await freshPage(browser, testInfo, '/the-eye/', { returning: true });
  await ctx.addInitScript(seed);
  await page.goto('/the-eye/?shoot=p1');
  await page.locator('#shootFront [data-page="postShootHeading"]').first().click();
  await page.locator('#finalImagesFileInput').setInputFiles((await photos(page)).slice(0, 1));
  const sheet = page.locator('#finalsRefOverlay');
  await expect(sheet).toBeVisible();
  await sheet.locator('[data-pick="0"]').click();
  await sheet.locator('#finalsRefLater').click();
  await expect(sheet).toBeHidden();
  expect(await finalsLinks(page)).toEqual([]);
  // The Eye on its own (no shelf around it): no Ref to send to.
  await page.evaluate(() => { window.DF_SUITE = null; });
  await page.locator('#finalImagesFileInput').setInputFiles((await photos(page)).slice(1));
  await expect(page.locator('#finalImagesGrid .moodboard-thumb')).toHaveCount(2);
  await page.waitForTimeout(400);
  await expect(sheet).toBeHidden();
  await ctx.close();
});
