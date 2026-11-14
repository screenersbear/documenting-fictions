// How the notebooks connect, in Ref (round 2, connect/06): a yes passed on
// by Rounds shows once as a slip on Mood boards. START THE BOARD makes a
// board named for them, their handle kept on it; NOT NOW tucks the slip
// away and the offer waits in Options; Rounds' OPEN (?client=) starts it or
// opens it. A new shoot in The Eye made from that board has them as its
// talent. With Mood boards switched off, Send to shoot isn't offered.
import { test, expect } from '@playwright/test';
import { freshPage } from './_helpers.mjs';

async function openRef(browser, testInfo, path = '/ref/#/boards') {
  const { ctx, page } = await freshPage(browser, testInfo, path, { returning: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.band').first()).toBeVisible();
  return { ctx, page };
}

// A yes from Rounds, as Rounds passes it on: a 'new-client' link with a photo.
const passYes = (page, more = {}) => page.evaluate(async (m) => {
  const c = document.createElement('canvas');
  c.width = 44; c.height = 54;
  c.getContext('2d').fillStyle = '#7FA79A';
  c.getContext('2d').fillRect(0, 0, 44, 54);
  const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.8));
  const cover = { type: 'image/jpeg', bytes: await blob.arrayBuffer() };
  const link = { fromApp: 'rounds', fromId: 'p1', toApp: 'ref', toId: '', type: 'new-client', name: 'Dana Ortiz', handle: 'danaortiz.studio', pitched: '2026-11-03', ...m };
  return (await window.DFData.saveLink(link, { cover })).id;
}, more);

const link = (page, id) => page.evaluate((x) => window.DFData.getLink(x), id);
// The sheets ignore taps for their first 450ms (components/sheet.js).
async function sheetOpen(page, title) {
  const s = page.locator('.sheet', { has: page.locator('.sheet-header h2', { hasText: title }) });
  await expect(s).toBeVisible();
  await page.waitForTimeout(500);
  return s;
}

test.describe('Ref: a new client from Rounds', () => {
  test('a yes shows once as a slip; START THE BOARD makes a board named for them', async ({ browser }, testInfo) => {
    const { ctx, page } = await openRef(browser, testInfo);
    const id = await passYes(page);
    await page.reload();
    const slip = page.locator('.df-slip');
    await expect(slip).toBeVisible();
    await expect(slip.locator('.df-slip-tag')).toHaveText('From Rounds');
    await expect(slip.locator('.df-slip-title')).toHaveText('Dana Ortiz said yes');
    await expect(slip.locator('.df-slip-line')).toHaveText('A new board for the shoot, named for Dana.');
    await expect(slip.locator('.ref-slip-handle')).toHaveText('@danaortiz.studio');
    await expect(slip.locator('.ref-slip-when')).toHaveText('Pitched 3 Nov.');
    await expect(slip.locator('.ref-slip-photo img')).toHaveCount(1);
    await expect(slip.locator('[data-slip-open]')).toHaveText('Start the board');
    expect((await page.evaluate(() => window.DFConnect.waitingByApp())).ref).toEqual([{ from: 'rounds', what: 'a new client from Rounds' }]);
    await slip.locator('[data-slip-open]').click();
    await expect(page).toHaveURL(/#\/board\/.+$/);
    const made = await link(page, id);
    expect(made.openedAt).toBeTruthy();
    expect(page.url()).toContain(`#/board/${made.toId}`);
    await page.goto('/ref/#/boards');
    const card = page.locator('.board-card', { hasText: 'Dana Ortiz' });
    await expect(card.locator('.card-name')).toHaveText('Dana Ortiz');
    await expect(card.locator('.card-meta')).toContainText('3 pages');
    await expect(card.locator('.flag')).toHaveText('@danaortiz.studio');
    await expect(page.locator('.df-slip')).toHaveCount(0);
    await ctx.close();
  });

  test('NOT NOW tucks it away; the offer waits in Options until the board is started', async ({ browser }, testInfo) => {
    const { ctx, page } = await openRef(browser, testInfo);
    const id = await passYes(page, { pitched: '' });
    await page.reload();
    await expect(page.locator('.df-slip .ref-slip-when')).toContainText('Said yes');
    await page.locator('.df-slip [data-slip-later]').click();
    await expect(page.locator('.df-slip')).toHaveCount(0);
    expect((await link(page, id)).tuckedAt).toBeTruthy();
    await page.click('[data-app-menu]');
    const opts = await sheetOpen(page, 'Options');
    const offer = opts.locator('[data-offer]');
    await expect(offer).toContainText('Start a board for Dana Ortiz');
    await offer.click();
    await expect(page).toHaveURL(/#\/board\/.+$/);
    expect((await link(page, id)).toId).toBeTruthy();
    await page.goto('/ref/#/boards');
    await page.click('[data-app-menu]');
    await expect((await sheetOpen(page, 'Options')).locator('[data-offer]')).toHaveCount(0);
    await ctx.close();
  });

  test("Rounds' OPEN starts the board once, then opens that same board", async ({ browser }, testInfo) => {
    const { ctx, page } = await openRef(browser, testInfo);
    const id = await passYes(page);
    await page.goto(`/ref/?client=${id}`);
    await expect(page).toHaveURL(/#\/board\/.+$/);
    const { toId } = await link(page, id);
    expect(page.url()).toContain(`#/board/${toId}`);
    await page.goto(`/ref/?client=${id}`);
    await expect(page).toHaveURL(new RegExp(`#/board/${toId}$`));
    await page.goto('/ref/#/boards');
    await expect(page.locator('.board-card')).toHaveCount(1);
    await ctx.close();
  });

  test('with Mood boards switched off, Send to shoot is not offered', async ({ browser }, testInfo) => {
    const { ctx, page } = await openRef(browser, testInfo);
    const id = await passYes(page);
    await page.goto(`/ref/?client=${id}`);
    await expect(page).toHaveURL(/#\/board\/.+$/);
    await page.goto('/ref/#/boards');
    await page.locator('.board-card [data-more]').click();
    await expect((await sheetOpen(page, 'Dana Ortiz')).locator('.choice', { hasText: 'Send to shoot' })).toHaveCount(1);
    await page.evaluate(() => localStorage.setItem('df-connect', JSON.stringify({ moodboards: false })));
    await page.reload();
    await page.locator('.board-card [data-more]').click();
    const menu = await sheetOpen(page, 'Dana Ortiz');
    await expect(menu.locator('.choice', { hasText: 'Rename' })).toHaveCount(1);
    await expect(menu.locator('.choice', { hasText: 'Send to shoot' })).toHaveCount(0);
    await ctx.close();
  });

  test("The Eye: a new shoot made from a client's board has them as its talent", async ({ browser }, testInfo) => {
    const { ctx, page } = await freshPage(browser, testInfo, '/the-eye/', { returning: true });
    await page.setViewportSize({ width: 390, height: 844 });
    const id = await page.evaluate(() => window.DFData.saveLink({
      fromApp: 'ref', fromId: 'b1', toApp: 'the-eye', toId: null, type: 'moodboard', name: 'Dana Ortiz', pageCount: 3, photoCount: 0,
      drawnAt: new Date().toISOString(), frozenAt: null, importedAt: null, pending: true, client: { name: 'Dana Ortiz', handle: 'danaortiz.studio' },
    }).then((l) => l.id));
    await page.goto(`/the-eye/?newShootFromBoard=${id}`);
    await expect(page.locator('#shootTitle')).toHaveValue('Dana Ortiz');
    await expect(page.locator('#talentsList')).toContainText('Dana Ortiz');
    await expect.poll(() => page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('dailies_state_v1') || '{}');
      const shoot = (s.shoots || []).find((x) => x.title === 'Dana Ortiz');
      return shoot ? shoot.talents.map((t) => [t.name, t.socialHandles]) : null;
    })).toEqual([['Dana Ortiz', [{ platform: 'instagram', handle: 'danaortiz.studio' }]]]);
    expect((await link(page, id)).pending).toBe(false);
    await ctx.close();
  });
});
