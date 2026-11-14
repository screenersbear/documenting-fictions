// The Eye on an iPhone-sized screen (390 x 844) with the clock and battery
// 47px tall at the top (faked: a desktop browser has no safe area, so the
// app's --sa-top is set to what an iPhone gives). Starky's bugs of 11-13:
// a strip of white above the band on every section but Overview; going back
// to Overview, the page that turns in drawn under the clock and then jumping
// down (and the Next shoot card showing twice while it turned); and the
// shoot pictures in the lists, now 56 by 72.
import { test, expect } from '@playwright/test';
import { freshPage } from './_helpers.mjs';

const SAFE_TOP = 47;

// A shoot tomorrow (the Next shoot card), one next week, two waiting on proofs.
// (Set once for the tab: the first load, before this, saved an empty notebook.)
function seed(safeTop) {
  document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `:root, :root.nb-turned { --sa-top: ${safeTop}px !important; }`;
    document.head.append(style);
  });
  if (sessionStorage.getItem('eye-band-seeded')) return;
  sessionStorage.setItem('eye-band-seeded', '1');
  const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const shoot = (o) => ({ title: '', category: 'portfolio_building', startTime: '10:00', endTime: '18:00', location: { name: 'Studio', address: '' },
    references: [], frameworkTags: [], moodboardComplete: false, teamRequired: '', talents: [{ name: 'Ana Rivera', socialHandles: [] }],
    shotList: [], lightingSetups: [], shootingNotes: '', lessonsLearned: '', archived: false, ...o });
  const shoots = [
    shoot({ id: 'e1', title: 'Rooftop', status: 'prospect', date: day(1) }),
    shoot({ id: 'e2', title: 'Studio', status: 'waiting_to_shoot', date: day(7), deadline: day(9) }),
    shoot({ id: 'e3', title: 'Beach', status: 'captured', date: day(-5), deadline: day(3) }),
    shoot({ id: 'e4', title: 'Band', status: 'captured', date: day(-8), deadline: day(4) }),
  ];
  localStorage.setItem('dailies_state_v1', JSON.stringify({ shoots, projects: [], journalEntries: [] }));
}

async function openEye(browser, testInfo) {
  const { ctx, page } = await freshPage(browser, testInfo, '/the-eye/', { returning: true });
  await ctx.addInitScript(seed, SAFE_TOP);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.waitForLoadState('networkidle').catch(() => {});
  return { ctx, page };
}

// Where the open section's band and title are, and the screen's scroll.
const bandNow = (page) => page.evaluate(() => {
  const view = document.querySelector('#app > .view:not([hidden])');
  const band = view.querySelector('.band');
  return { view: view.id, band: band.getBoundingClientRect().top, title: band.querySelector('.band-title').getBoundingClientRect().top };
});

// Goes to a section the way a finger does (the page turns), and waits for the turn to end.
async function turnTo(page, view) {
  await page.click(`.tabbar .tab[data-view="${view}"]`);
  await page.waitForFunction(() => !document.querySelector('.nb-turn, .nb-slide'), null, { timeout: 3000 });
  await page.waitForTimeout(100);
}

test.describe('The Eye on an iPhone: the band and the lists', () => {
  test('every section\'s band starts at the very top, its title below the clock', async ({ browser }, testInfo) => {
    const { ctx, page } = await openEye(browser, testInfo);
    for (const view of ['overview', 'shoots', 'journal', 'archive', 'stats', 'overview']) {
      if (view !== 'overview' || (await bandNow(page)).view !== 'view-overview') await turnTo(page, view);
      const at = await bandNow(page);
      expect(at.view).toBe(`view-${view}`);
      expect(at.band, `${view}: no strip above the band`).toBe(0);
      expect(at.title, `${view}: the title is below the clock`).toBeGreaterThanOrEqual(SAFE_TOP);
    }
    await ctx.close();
  });

  test('going back to Overview, the page that slides in sits exactly where Overview does', async ({ browser }, testInfo) => {
    const { ctx, page } = await openEye(browser, testInfo);
    await turnTo(page, 'shoots');
    await page.click('.tabbar .tab[data-view="overview"]');
    // Where the sliding picture's band, title and Next shoot card lie, top to
    // bottom, against the real ones (the slide only moves it sideways; since
    // 14 Nov sections slide rather than turn).
    const got = await page.evaluate(() => {
      const holder = document.querySelector('.nb-slide-pane:last-child .nb-turn-copy');
      if (!holder) return null;
      const inCopy = (sel) => holder.querySelector(sel).getBoundingClientRect().top;
      const real = (sel) => document.querySelector(`#view-overview ${sel}`).getBoundingClientRect().top;
      return ['.band', '.band-title', '.next-shoot'].map((sel) => ({ sel, copy: Math.round(inCopy(sel)), real: Math.round(real(sel)) }));
    });
    expect(got, 'the page slid').not.toBeNull();
    for (const { sel, copy, real } of got) expect(copy, `${sel} in the sliding page`).toBe(real);
    await ctx.close();
  });

  test('the shoot pictures in the lists are 56 by 72, corners 6', async ({ browser }, testInfo) => {
    const { ctx, page } = await openEye(browser, testInfo);
    const sizes = (view) => page.evaluate((view) => [...document.querySelectorAll(`#${view} .shoot-row .shoot-thumb`)].map((el) => {
      const r = el.getBoundingClientRect();
      return `${Math.round(r.width)}x${Math.round(r.height)} r${getComputedStyle(el).borderTopLeftRadius}`;
    }), view);
    const overview = await sizes('view-overview');
    expect(overview.length, 'Overview lists its shoots').toBeGreaterThanOrEqual(3);
    for (const s of overview) expect(s).toBe('56x72 r6px');
    await turnTo(page, 'shoots');
    const shoots = await sizes('view-shoots');
    expect(shoots.length).toBe(4);
    for (const s of shoots) expect(s).toBe('56x72 r6px');
    await ctx.close();
  });
});
