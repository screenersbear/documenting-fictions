// The Eye's bands (Starky, 14 Nov): every band carries only two ring
// buttons, Notebooks and Options. No + and no bell in any band. Adding a
// shoot sits beside the list it adds to: NEW SHOOT beside the Shoots count.
import { test, expect } from '@playwright/test';
import { freshPage } from './_helpers.mjs';

// Three shoots, so the count has something to say.
// (Set once for the tab: the first load, before this, saved an empty notebook.)
function seed() {
  if (sessionStorage.getItem('eye-bands-seeded')) return;
  sessionStorage.setItem('eye-bands-seeded', '1');
  const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const shoot = (o) => ({ title: '', category: 'portfolio_building', startTime: '10:00', endTime: '18:00', location: { name: 'Studio', address: '' },
    references: [], frameworkTags: [], moodboardComplete: true, teamRequired: 'no', talents: [],
    shotList: [], lightingSetups: [], shootingNotes: '', lessonsLearned: '', archived: false, ...o });
  const shoots = [
    shoot({ id: 'b1', title: 'Rooftop portraits', status: 'planning', date: day(6) }),
    shoot({ id: 'b2', title: 'Garden portraits', status: 'prospect', date: day(12) }),
    shoot({ id: 'b3', title: 'Night walk', status: 'waiting_to_shoot', date: day(3) }),
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

test.describe('The Eye: two buttons in every band, adding beside the list', () => {
  test('every band has only Notebooks and Options', async ({ browser }, testInfo) => {
    const { ctx, page } = await openEye(browser, testInfo);
    const bands = await page.$$eval('#app .view .band', (els) => els.map((band) => ({
      section: band.closest('.view').id,
      buttons: [...band.querySelectorAll('button')].map((b) => b.getAttribute('aria-label')),
    })));
    expect(bands.length).toBe(5);
    for (const band of bands) expect(band, band.section).toEqual({ section: band.section, buttons: ['Back to your notebooks', 'Options'] });
    // No bell and no + left anywhere on the page.
    await expect(page.locator('#notificationBellBtn')).toHaveCount(0);
    await expect(page.locator('#newShootBtn')).toHaveCount(0);
    await ctx.close();
  });

  test('NEW SHOOT sits beside the Shoots count and opens the new-shoot guide', async ({ browser }, testInfo) => {
    const { ctx, page } = await openEye(browser, testInfo);
    await page.click('.tabbar .tab[data-view="shoots"]');
    await page.waitForFunction(() => !document.querySelector('.nb-turn, .nb-slide'), null, { timeout: 3000 });
    const add = page.locator('#view-shoots .list-head #addShootBtn');
    await expect(add).toBeVisible();
    await expect(add).toHaveText('New shoot');
    await expect(page.locator('#shootCount')).toHaveText('3');
    // Right of the count, on the same line, with a 44px target.
    const count = await page.locator('#shootCount').boundingBox();
    const btn = await add.boundingBox();
    expect(btn.x).toBeGreaterThan(count.x + count.width - 1);
    expect(Math.abs((btn.y + btn.height / 2) - (count.y + count.height / 2))).toBeLessThan(3);
    expect(Math.round(btn.height)).toBe(44);
    await add.click();
    await expect(page.locator('#shootWizard')).toBeVisible();
    await ctx.close();
  });
});
