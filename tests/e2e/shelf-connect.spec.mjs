// How the notebooks connect, on the shelf (round 2, connect/01, 16 and 17):
// HOW THEY CONNECT from Options, the loop and a switch per hand-off (all on
// unless turned off, and kept). The floating ! over a notebook with
// something waiting is gone (Starky, 21 Nov): what's waiting is still kept
// (Rounds and The Eye tell it as they open), the shelf just shows none.
import { test, expect } from '@playwright/test';
import { freshPage } from './_helpers.mjs';
import { openRounds } from './_rounds.mjs';

async function onShelf(browser, testInfo) {
  const r = await freshPage(browser, testInfo, '/', { returning: true });
  await page(r).setViewportSize({ width: 390, height: 844 });
  await page(r).reload();
  await expect.poll(() => page(r).evaluate(() => Number(getComputedStyle(document.getElementById('shelfBar')).opacity)), { timeout: 5000 }).toBe(1);
  return r;
}
const page = (r) => r.page;

async function openConnect(p) {
  await p.click('#optionsBtn');
  const row = p.locator('.sheet.opts [data-connect]');
  await expect(row).toBeVisible();
  await p.waitForTimeout(300);
  await row.click();
  const c = p.locator('.connect-page');
  await expect(c).toBeVisible();
  return c;
}

test('How they connect: the loop, and a switch per hand-off, all on until turned off', async ({ browser }, testInfo) => {
  const r = await onShelf(browser, testInfo);
  const p = r.page;
  let c = await openConnect(p);
  await expect(c.locator('h2')).toHaveText('How they connect');
  await expect(c.locator('svg.connect-loop')).toHaveAttribute('aria-label', /^Ref sends mood boards to The Eye/);
  await expect(c.locator('.connect-name')).toHaveText(['Mood boards', 'Final images', "The shoot's people", 'New posts', 'New clients']);
  await expect(c.locator('.df-switch[aria-checked="true"]')).toHaveCount(5);
  await c.locator('[data-switch="finals"]').click();
  await expect(c.locator('[data-switch="finals"]')).toHaveAttribute('aria-checked', 'false');
  expect(await p.evaluate(() => JSON.parse(localStorage.getItem('df-connect')))).toEqual({ finals: false });
  await c.locator('[data-back]').click();
  await expect(c).toHaveCount(0);
  // Kept: off after a reload too, and back on.
  await p.reload();
  await expect.poll(() => p.evaluate(() => Number(getComputedStyle(document.getElementById('shelfBar')).opacity)), { timeout: 5000 }).toBe(1);
  c = await openConnect(p);
  await expect(c.locator('[data-switch="finals"]')).toHaveAttribute('aria-checked', 'false');
  await c.locator('[data-switch="finals"]').click();
  await expect(c.locator('.df-switch[aria-checked="true"]')).toHaveCount(5);
  expect(r.problems).toEqual([]);
  await r.ctx.close();
});

// What's waiting in Layouts and Rounds: a hand-off from The Eye, and two of
// Rounds' own items for today (one for another day doesn't count).
async function seedWaiting(p) {
  return p.evaluate(async () => {
    const day = window.DFData.todayStr();
    window.DFWaiting.publishWaiting('rounds', [
      { title: 'June Park', line: 'Say thanks', from: day, until: day, params: { at: 'today' } },
      { title: 'Ana Lima', line: 'Check in', from: day, until: day },
      { title: 'Sam Lee', line: 'Say hello', from: '2099-01-01' },
    ]);
    return (await window.DFData.saveLink({ type: 'finals', fromApp: 'the-eye', fromId: 's1', toApp: 'contact-sheet', title: 'Rooftop portraits', postIds: ['a', 'b'] })).id;
  });
}
const counts = (p, ids) => p.evaluate(async (list) => Object.fromEntries(Object.entries(await window.DFWaiting.waitingAll(list)).map(([k, v]) => [k, v.length])), ids);

test('no floating ! over the notebooks, even with something waiting in them', async ({ browser }, testInfo) => {
  const r = await onShelf(browser, testInfo);
  const p = r.page;
  await seedWaiting(p);
  await p.reload();
  await expect.poll(() => counts(p, ['contact-sheet', 'rounds'])).toEqual({ 'contact-sheet': 1, rounds: 2 });
  await expect(p.locator('.waiting-mark, .waiting-marks, .bang')).toHaveCount(0);
  await expect(p.locator('.cover-slip')).toHaveCount(0);
  expect(r.problems).toEqual([]);
  await r.ctx.close();
});

// The Eye: a shoot ready for its day (which starts at 5am). Rounds: the two
// people from last week's shoot (as tests/e2e/rounds-today.spec.mjs). Set
// once for the tab. On a Monday The Eye would also offer last week's brief
// (that shoot was last week): it's marked read, so only the shoot waits.
function eyeAndRounds() {
  if (sessionStorage.getItem('shelf-waiting-seeded')) return;
  sessionStorage.setItem('shelf-waiting-seeded', '1');
  const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const shoots = [
    { id: 's1', title: 'Rooftop portraits', status: 'captured', date: day(-4),
      talents: [{ id: 't1', name: 'Maya R.', socialHandles: [{ platform: 'instagram', handle: 'maya.rr' }] }],
      teamMembers: [{ role: 'Makeup', name: 'Jules M.', socialPlatform: 'instagram', socialHandle: 'jules.mua' }] },
    { id: 's2', title: 'Garden light', status: 'waiting_to_shoot', date: day(new Date().getHours() < 5 ? -1 : 0), startTime: '10:00', endTime: '12:00', archived: false,
      location: { name: 'Studio', address: '' }, references: [], frameworkTags: [], talents: [], shotList: [], lightingSetups: [] },
  ];
  localStorage.setItem('dailies_state_v1', JSON.stringify({ shoots, projects: [], journalEntries: [] }));
  localStorage.setItem('dailies_monday_brief_shown_v1', day(new Date().getHours() < 5 ? -1 : 0));
}

test('Rounds and The Eye keep what is waiting in them as they open', async ({ browser }, testInfo) => {
  // On a working day (Rounds rests on Sundays): the whole tab keeps that date.
  const { ctx, page: p, problems } = await openRounds(browser, testInfo, '/rounds/', eyeAndRounds);
  await expect(p.locator('#view .band')).toBeVisible();
  await p.goto('/the-eye/');
  await expect(p.locator('#todayCard')).toBeVisible();
  await expect(p.locator('#todayCardItems')).toContainText('Garden light');
  await p.goto('/?from=the-eye'); // back to the shelf, as the notebooks button does
  await expect.poll(() => counts(p, ['rounds', 'the-eye'])).toEqual({ rounds: 2, 'the-eye': 1 });
  const eye = await p.evaluate(async () => (await window.DFWaiting.waitingAll(['the-eye']))['the-eye'].map((w) => [w.title, w.line]));
  expect(eye).toEqual([['Garden light', 'Shooting today']]);
  await expect(p.locator('.waiting-mark')).toHaveCount(0);
  expect(problems).toEqual([]);
  await ctx.close();
});
