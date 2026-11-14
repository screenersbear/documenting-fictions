// Shared steps for the Rounds browser tests: opening Rounds at phone size,
// and a shoot in The Eye for people to come in from.
import { expect } from '@playwright/test';
import { freshPage } from './_helpers.mjs';

// A shoot captured four days ago in The Eye, with a model and a makeup
// artist on Instagram. Rounds brings them in as it opens.
// (Set once for the tab: the first load, before this, saved an empty notebook.)
export function eyeShoot() {
  if (sessionStorage.getItem('rounds-eye-seeded')) return;
  sessionStorage.setItem('rounds-eye-seeded', '1');
  const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const shoots = [{
    id: 's1', title: 'Rooftop portraits', status: 'captured', date: day(-4),
    talents: [{ id: 't1', name: 'Maya R.', socialHandles: [{ platform: 'instagram', handle: 'maya.rr' }] }],
    teamMembers: [{ role: 'Makeup', name: 'Jules M.', socialPlatform: 'instagram', socialHandle: 'jules.mua' }],
  }];
  localStorage.setItem('dailies_state_v1', JSON.stringify({ shoots, projects: [], journalEntries: [] }));
}

// Rounds at phone size, as someone who's been before. seed: run on every load.
export async function openRounds(browser, testInfo, path = '/rounds/', seed = null) {
  const { ctx, page, problems } = await freshPage(browser, testInfo, path, { returning: true });
  if (seed) await ctx.addInitScript(seed);
  await page.setViewportSize({ width: 390, height: 844 });
  // Drawn again at the new size (the page measures the screen as it loads).
  await page.reload();
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.locator('#view .band')).toBeVisible();
  return { ctx, page, problems };
}

// A section, from the bar at the foot, once the slide has settled.
export async function goTo(page, key) {
  await page.click(`#navbar .sec-${key}`);
  await expect(page.locator('.slide-leaf')).toHaveCount(0, { timeout: 3000 });
}

// The sheet on top, by its title.
export const sheet = (page, title) => page.locator('.sheet', { has: page.locator('.sheet-header h2', { hasText: title }) });

// A sheet, once it's open and taking taps: for its first 450ms it ignores
// them (on a phone, the tap that opened it can land again on what's now
// under the finger: components/sheet.js).
export async function opened(page, title) {
  const s = sheet(page, title);
  await expect(s).toBeVisible();
  await page.waitForTimeout(500);
  return s;
}
