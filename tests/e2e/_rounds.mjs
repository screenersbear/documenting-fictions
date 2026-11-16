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

// Rounds rests on Sundays (nothing comes up on a day off: Options, Work days),
// and these tests take today as a day it works. So on a Sunday the page's date
// is moved on to Monday: only the date, every timer runs as it is.
// weekdayNow() is that same day, for what a test works out on its own.
export function weekdayDate() {
  const Real = Date;
  if (new Real().getDay() !== 0) return;
  const now = () => Real.now() + 86400000;
  window.Date = class extends Real {
    constructor(...args) { super(...(args.length ? args : [now()])); }
    static now() { return now(); }
  };
}
export function weekdayNow() {
  const d = new Date();
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return d;
}

// Rounds at phone size, as someone who's been before, on a day it works.
// seed: run on every load.
// opts: freshPage's (serviceWorkers).
export async function openRounds(browser, testInfo, path = '/rounds/', seed = null, opts = {}) {
  const { ctx, page, problems } = await freshPage(browser, testInfo, path, { returning: true, ...opts });
  await ctx.addInitScript(weekdayDate);
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

// The one sheet (Tightening Rounds, rounds/08): WHAT DID YOU SAY? starts
// empty, with "+ Use your <kind> message" under it. A tap puts the starter
// in the box to edit.
export async function useMessage(move, word, text) {
  const box = move.locator('.one-said');
  const offer = move.locator('[data-offer]');
  await expect(move.locator('label[for="oneSaid"]')).toHaveText('What did you say?');
  await expect(box).toHaveValue('');
  await expect(offer).toHaveText(`Use your ${word} message`);
  await offer.click();
  await expect(box).toHaveValue(text);
}

// DONE on the one sheet saves it all: no second sheet comes up, only the
// toast (rounds/08).
export async function doneNoSheet(page) {
  await expect(page.locator('#toast')).toContainText('Done.');
  await expect(page.locator('.sheet')).toHaveCount(0);
}

// Rounds tells the shelf a moment after the last change (1.5s,
// data/people-out.js tellPeople), and a reload before then loses it: wait
// until the shelf has their moves (n of them) before leaving Rounds for it.
export async function toldShelf(page, name, n = 1) {
  const moves = () => page.evaluate(async (who) => {
    const t = (await window.DFData.thingsAll()).find((x) => x.kind === 'person' && x.title === who && x.more?.done);
    return t ? t.more.done.filter((r) => r.kind === 'move').length : 0;
  }, name);
  await expect.poll(moves, { timeout: 8000 }).toBe(n);
}

// Options, from the band's menu.
export async function options(page) {
  await page.click('#view [data-app-menu]');
  return opened(page, 'Options');
}

// Import people, with a CSV file picked from Files.
export async function importCsv(page, text) {
  const s = await options(page);
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), s.locator('[data-import]').click()]);
  await chooser.setFiles({ name: 'people.csv', mimeType: 'text/csv', buffer: Buffer.from(text) });
}
