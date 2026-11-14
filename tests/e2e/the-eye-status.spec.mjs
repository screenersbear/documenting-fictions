// The Eye, round 5 (13 Nov): the status card on a shoot's page (a bar for
// each stage, the whole card opens Change status; Postponed and Canceled say
// so instead), and Shoot progress in the new-shoot guide's Basics (a shoot
// already done can start as Captured, with no pop-up in the way).
import { test, expect } from '@playwright/test';
import { freshPage } from './_helpers.mjs';

// A shoot ready to shoot next week and one postponed.
// (Set once for the tab: the first load, before this, saved an empty notebook.)
function seed() {
  if (sessionStorage.getItem('eye-status-seeded')) return;
  sessionStorage.setItem('eye-status-seeded', '1');
  const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const shoot = (o) => ({ title: '', category: 'portfolio_building', startTime: '10:00', endTime: '18:00', location: { name: 'Studio', address: '' },
    references: [], frameworkTags: [], moodboardComplete: true, teamRequired: 'no', talents: [],
    shotList: [], lightingSetups: [], shootingNotes: '', lessonsLearned: '', archived: false, ...o });
  const shoots = [
    shoot({ id: 'r1', title: 'Rooftop portraits', status: 'waiting_to_shoot', date: day(7) }),
    shoot({ id: 'r2', title: 'Pier at dawn', status: 'rescheduled', date: day(9) }),
  ];
  localStorage.setItem('dailies_state_v1', JSON.stringify({ shoots, projects: [], journalEntries: [] }));
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

const bars = (page) => page.$$eval('#shootStatusBars i', (els) => els.map((i) => `${i.className} ${Math.round(i.getBoundingClientRect().height)}`));

test.describe('The Eye: the status card and Shoot progress', () => {
  test('the status card shows the stages, and opens Change status', async ({ browser }, testInfo) => {
    const { ctx, page } = await openEye(browser, testInfo);
    await openShoot(page, 'Rooftop portraits');
    const card = page.locator('#shootStatusTag');
    await expect(card).toHaveAttribute('aria-label', 'Status: Shoot ready, 3 of 7. Change it');
    await expect(page.locator('#shootStatusTagText')).toHaveText('Shoot ready');
    await expect(page.locator('#shootStatusCount')).toHaveText('3 of 7');
    expect(await bars(page)).toEqual(['done 10', 'done 13', 'now 16', 'later 19', 'later 22', 'later 25', 'later 28']);
    await expect(page.locator('#shootStatusEnds span')).toHaveText(['Prospect', 'Delivered']);
    await expect(page.locator('#shootStatusOff')).toBeHidden();
    // Under when and where, the full width of the page.
    const [when, box] = await Promise.all([page.locator('#shootFrontWhen').boundingBox(), card.boundingBox()]);
    expect(box.y).toBeGreaterThan(when.y + when.height);
    expect(Math.round(box.width)).toBe(358);
    // The whole card opens Change status; a pick redraws it.
    await card.click();
    await expect(page.locator('#shootStatusSheetOverlay')).toBeVisible();
    await page.click('#shootStatusSheetList [data-status="planning"]');
    await expect(page.locator('#shootStatusTagText')).toHaveText('Active planning');
    await expect(page.locator('#shootStatusCount')).toHaveText('2 of 7');
    expect((await bars(page)).map((b) => b.split(' ')[0])).toEqual(['done', 'now', 'later', 'later', 'later', 'later', 'later']);
    await ctx.close();
  });

  test('a postponed shoot\'s card says so in place of the bars', async ({ browser }, testInfo) => {
    const { ctx, page } = await openEye(browser, testInfo);
    await openShoot(page, 'Pier at dawn');
    await expect(page.locator('#shootStatusTag')).toHaveAttribute('aria-label', 'Status: Postponed. Change it');
    await expect(page.locator('#shootStatusOff')).toHaveText('This shoot is postponed.');
    await expect(page.locator('#shootStatusBars')).toBeHidden();
    await expect(page.locator('#shootStatusEnds')).toBeHidden();
    await expect(page.locator('#shootStatusCount')).toHaveText('');
    expect(await page.$eval('#shootStatusOff', (el) => getComputedStyle(el).color)).toBe('rgb(161, 6, 42)');
    await ctx.close();
  });

  test('the guide\'s Basics asks Shoot progress; Captured sets it with no pop-up', async ({ browser }, testInfo) => {
    const { ctx, page } = await openEye(browser, testInfo);
    // NEW SHOOT, beside the Shoots count (the band's + went on 14 Nov).
    await page.click('.tabbar .tab[data-view="shoots"]');
    await page.waitForFunction(() => !document.querySelector('.nb-turn, .nb-slide'), null, { timeout: 3000 });
    await page.click('#addShootBtn');
    const progress = page.locator('#shootWizardBody #guideProgress');
    await expect(progress).toBeVisible();
    await expect(progress.locator('[aria-checked="true"]')).toHaveText(['Prospect']);
    await expect(progress.locator('[data-progress]')).toHaveText(['Prospect', 'Active planning', 'Shoot ready', 'Captured']);
    await expect(progress).toContainText("Pick Captured for a shoot you've already done.");
    await progress.locator('[data-progress="captured"]').click();
    await expect(progress.locator('[aria-checked="true"]')).toHaveText(['Captured']);
    expect(await page.$eval('#shootStatus', (s) => s.value)).toBe('captured');
    await expect(page.locator('#postShootPromptOverlay')).toBeHidden();
    await expect(page.locator('#shootWizard')).toBeVisible();
    await ctx.close();
  });

  test('Shoot progress isn\'t on the shoot page itself', async ({ browser }, testInfo) => {
    const { ctx, page } = await openEye(browser, testInfo);
    await openShoot(page, 'Rooftop portraits');
    await expect(page.locator('#guideProgress')).toBeHidden();
    await ctx.close();
  });
});
