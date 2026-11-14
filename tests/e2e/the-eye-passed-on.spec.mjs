// How the notebooks connect (round 2, connect/02): a shoot delivered with its
// finals in hands them to Layouts (a 'finals' link, once), and its page shows
// PASSED ON and CAME IN, each row opening the other notebook.
import { test, expect } from '@playwright/test';
import { freshPage } from './_helpers.mjs';

// A shoot in the edit with its people, and one still to come.
function seed() {
  if (sessionStorage.getItem('eye-passed-seeded')) return;
  sessionStorage.setItem('eye-passed-seeded', '1');
  const shoot = (o) => ({ title: '', category: 'portfolio_building', startTime: '10:00', endTime: '18:00', location: { name: 'Studio', address: '' },
    references: [], frameworkTags: [], moodboardComplete: true, teamRequired: 'no', talents: [], teamMembers: [],
    shotList: [], lightingSetups: [], shootingNotes: '', lessonsLearned: '', archived: false, date: '2026-11-07', ...o });
  const shoots = [
    shoot({ id: 'r1', title: 'Rooftop portraits', status: 'editing', capturedAt: '2026-11-07T18:00:00.000Z', whatWentRight: 'The light.',
      talents: [{ id: 't1', name: 'June Park', socialHandles: [{ platform: 'instagram', handle: '@junepark.jpg' }] }],
      teamMembers: [{ role: 'Hair and makeup', name: 'Iryna V.', socialPlatform: 'instagram', socialHandle: 'iryna.hmua' }] }),
    shoot({ id: 'r2', title: 'Pier at dawn', status: 'editing', capturedAt: '2026-11-08T18:00:00.000Z', whatWentRight: 'Early.' }),
  ];
  localStorage.setItem('dailies_state_v1', JSON.stringify({ shoots, projects: [], journalEntries: [] }));
}

// Finals for a shoot, as The Eye keeps them (small grey pictures).
async function putFinals(page, shootId, n) {
  await page.evaluate(async ({ shootId, n }) => {
    const c = document.createElement('canvas');
    c.width = 30; c.height = 40;
    c.getContext('2d').fillStyle = '#888';
    c.getContext('2d').fillRect(0, 0, 30, 40);
    const src = c.toDataURL('image/jpeg', 0.7);
    await new Promise((resolve, reject) => {
      const req = indexedDB.open('starky-moodboards', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('images');
      req.onsuccess = () => {
        const tx = req.result.transaction('images', 'readwrite');
        tx.objectStore('images').put(Array.from({ length: n }, () => ({ src, caption: '' })), `${shootId}__final`);
        tx.oncomplete = () => { req.result.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
  }, { shootId, n });
}

async function openEye(browser, testInfo) {
  const { ctx, page } = await freshPage(browser, testInfo, '/the-eye/', { returning: true });
  await ctx.addInitScript(seed);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.waitForLoadState('networkidle').catch(() => {});
  return { ctx, page };
}

async function openShoot(page, title) {
  await page.click('.tabbar .tab[data-view="shoots"]');
  await page.waitForFunction(() => !document.querySelector('.nb-turn, .nb-slide'), null, { timeout: 3000 });
  await page.locator('#view-shoots .shoot-row', { hasText: title }).first().click();
  await expect(page.locator('#shootFront')).toBeVisible();
}

async function deliver(page) {
  await page.locator('#shootStatusTag').click();
  await expect(page.locator('#shootStatusSheetOverlay')).toBeVisible();
  await page.click('#shootStatusSheetList [data-status="delivered"]');
  await expect(page.locator('#shootStatusTagText')).toHaveText('Delivered');
}

// Delivered with its finals and reflection in, a shoot completes itself
// (next-step.js) and goes to the archive: its report opens from there.
async function openFromArchive(page, name) {
  await expect(page.locator('#shootFront')).toBeHidden();
  await page.click('.tabbar .tab[data-view="archive"]');
  await page.waitForFunction(() => !document.querySelector('.nb-turn, .nb-slide'), null, { timeout: 3000 });
  await page.getByRole('button', { name: /^November/ }).click();
  await page.locator('#view-archive .shoot-row', { hasText: name }).first().click();
  await expect(page.locator('#shootFront')).toBeVisible();
}

// A one-pixel picture, as if picked from the phone.
const PNG = { name: 'x.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64') };

const finalsLinks = (page) => page.evaluate(async () => window.DFData.linksWhere({ type: 'finals' }));

test.describe('The Eye: what a delivered shoot passed on', () => {
  test('delivered with finals in, they pass to Layouts once, with a caption from its people', async ({ browser }, testInfo) => {
    const { ctx, page } = await openEye(browser, testInfo);
    await putFinals(page, 'r1', 3);
    await openShoot(page, 'June Park'); // a portfolio shoot is listed by its talent
    await expect(page.locator('#shootPassedOn')).toBeHidden();
    await deliver(page);
    await expect.poll(async () => (await finalsLinks(page)).length).toBe(1);
    const [link] = await finalsLinks(page);
    expect(link).toMatchObject({
      fromApp: 'the-eye', fromId: 'r1', toApp: 'contact-sheet', count: 3, title: 'Rooftop portraits',
      caption: 'Rooftop portraits with June Park @junepark.jpg. Hair and makeup @iryna.hmua.',
    });
    expect(link.credits.talent).toEqual([{ name: 'June Park', handle: 'junepark.jpg' }]);
    // The record on its report: one row, opening Layouts on those finals.
    await openFromArchive(page, 'June Park');
    const row = page.locator('#shootPassedOn .df-record-row');
    await expect(row).toHaveCount(1);
    await expect(row.locator('.df-record-title')).toHaveText('3 finals to Layouts');
    await expect(row.locator('.df-record-line')).toHaveText('Waiting there.');
    await expect(row).toHaveAttribute('href', `../contact-sheet/?posts=${link.id}`);
    await expect(row).toBeVisible();
    await expect(page.locator('#shootPassedOn .front-title')).toHaveText('Passed on');
    // More finals before Layouts has made its posts: the same link, following them.
    await page.locator('#finalImagesFileInput').setInputFiles(PNG);
    await expect(row.locator('.df-record-title')).toHaveText('4 finals to Layouts');
    expect(await finalsLinks(page)).toMatchObject([{ id: link.id, count: 4 }]);
    await ctx.close();
  });

  test('what came in and the people passed on show too; Layouts having made its posts says so', async ({ browser }, testInfo) => {
    const { ctx, page } = await openEye(browser, testInfo);
    await putFinals(page, 'r1', 12);
    await page.evaluate(async () => {
      const D = window.DFData;
      await D.saveLink({ type: 'moodboard', fromApp: 'ref', fromId: 'b1', toApp: 'the-eye', toId: 'r1', name: 'Rooftop, golden hour', frozenAt: new Date(2026, 10, 7, 12).toISOString() });
      await D.saveLink({ type: 'people', fromApp: 'the-eye', fromId: 'r1', toApp: 'rounds', names: ['June Park', 'Iryna V.'] });
      await D.saveLink({ type: 'moodboard', fromApp: 'ref', fromId: 'b2', toApp: 'the-eye', toId: 'r2', name: 'Pier', frozenAt: new Date(2026, 10, 8, 12).toISOString() });
    });
    await openShoot(page, 'June Park'); // a portfolio shoot is listed by its talent
    await deliver(page);
    await openFromArchive(page, 'June Park');
    const rows = page.locator('#shootPassedOn .df-record-row');
    await expect(rows).toHaveCount(3);
    await page.evaluate(() => document.getElementById('shootPassedOn').scrollIntoView({ block: 'center' }));
    await expect(rows.first()).toBeVisible();
    await expect(rows.locator('.df-record-title')).toHaveText(['12 finals to Layouts', '2 people to Rounds', 'Rooftop, golden hour']);
    await expect(rows.nth(1).locator('.df-record-line')).toHaveText('June Park, Iryna V. Thank-yous ready.');
    await expect(rows.nth(1)).toHaveAttribute('href', '../rounds/?at=people');
    await expect(rows.nth(2).locator('.df-record-line')).toHaveText('Mood board from Ref, as of 7 Nov.');
    await expect(rows.nth(2)).toHaveAttribute('href', '../ref/?board=b1');
    await expect(page.locator('#shootPassedOn .front-title')).toHaveText(['Passed on', 'Came in']);
    // Layouts made its posts: the row says so, and more finals don't change what it has.
    await page.evaluate(async () => {
      const [l] = await window.DFData.linksWhere({ type: 'finals' });
      await window.DFData.saveLink({ ...l, madeAt: new Date().toISOString() });
    });
    await page.locator('#finalImagesFileInput').setInputFiles(PNG);
    await expect(rows.first().locator('.df-record-line')).toHaveText('Two posts made, waiting there.');
    expect((await finalsLinks(page))[0].count).toBe(12);
    await ctx.close();
  });

  test('with the hand-off switched off, or no finals, nothing passes', async ({ browser }, testInfo) => {
    const { ctx, page } = await openEye(browser, testInfo);
    await page.evaluate(() => localStorage.setItem('df-connect', JSON.stringify({ finals: false })));
    await putFinals(page, 'r1', 2);
    await openShoot(page, 'June Park'); // a portfolio shoot is listed by its talent
    await deliver(page);
    await page.waitForTimeout(400);
    expect(await finalsLinks(page)).toHaveLength(0);
    await expect(page.locator('#shootPassedOn')).toBeHidden();
    await page.evaluate(() => localStorage.removeItem('df-connect'));
    await ctx.close();
  });

  test('a shoot delivered with no finals passes nothing until they come in', async ({ browser }, testInfo) => {
    const { ctx, page } = await openEye(browser, testInfo);
    await openShoot(page, 'Pier at dawn');
    await deliver(page);
    await page.waitForTimeout(400);
    expect(await finalsLinks(page)).toHaveLength(0);
    await page.locator('#finalImagesFileInput').setInputFiles(PNG);
    await expect.poll(async () => (await finalsLinks(page)).length).toBe(1);
    await expect(page.locator('#shootPassedOn .df-record-title')).toHaveText('1 final to Layouts');
    await ctx.close();
  });
});
