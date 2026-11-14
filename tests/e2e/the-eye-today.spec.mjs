// The Eye's Today card and the full report (round 5, 13 Nov). Starky's bug:
// the Today card had things on it while the full report said "Nothing to
// report today" (they read different lists). The report now lists the Today
// card's things first. And the card shows only the two most urgent, with
// "N MORE IN TODAY'S REPORT" under them. With two things or fewer, FULL
// REPORT sits where the count was: the band's bell went on 14 Nov, so the
// card is the way into the report.
import { test, expect } from '@playwright/test';
import { freshPage } from './_helpers.mjs';

// Two shoots whose day went by without an answer, two deadlines gone by.
// (Set once for the tab: the first load, before this, saved an empty notebook.)
function seed() {
  if (sessionStorage.getItem('eye-today-seeded')) return;
  sessionStorage.setItem('eye-today-seeded', '1');
  const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  const shoot = (o) => ({ title: '', category: 'portfolio_building', startTime: '10:00', endTime: '18:00', location: { name: 'Studio', address: '' },
    references: [], frameworkTags: [], moodboardComplete: true, teamRequired: 'no', talents: [],
    shotList: [], lightingSetups: [], shootingNotes: '', lessonsLearned: '', archived: false, ...o });
  const shoots = [
    shoot({ id: 't1', title: 'Spring lookbook', talents: [{ name: 'Maya Ruiz', socialHandles: [] }], status: 'planning', date: day(-2) }),
    shoot({ id: 't2', title: 'Forest walk', talents: [{ name: 'June Park', socialHandles: [] }], status: 'prospect', date: day(-4) }),
    shoot({ id: 't3', title: 'Holiday portraits', talents: [{ name: 'Leo Grant', socialHandles: [] }], status: 'captured', date: day(-12), deadline: day(-3) }),
    shoot({ id: 't4', title: 'Winter coats', talents: [{ name: 'Ivy Chen', socialHandles: [] }], status: 'editing', date: day(-14), deadline: day(-2) }),
  ];
  localStorage.setItem('dailies_state_v1', JSON.stringify({ shoots, projects: [], journalEntries: [] }));
}

async function openEye(browser, testInfo) {
  const { ctx, page } = await freshPage(browser, testInfo, '/the-eye/', { returning: true });
  await ctx.addInitScript(seed);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.locator('#todayCard')).toBeVisible();
  return { ctx, page };
}

// Each thing in the report's Today part, as plain words.
const reportToday = (page) => page.$$eval('#dailyReportList .report-today .today-item', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
const cardItems = (page) => page.$$eval('#todayCardItems .today-item', (els) => els.map((e) => e.textContent.replace(/\s+/g, ' ').trim()));

test.describe('The Eye: the Today card and the full report', () => {
  test('the full report lists everything on the Today card first', async ({ browser }, testInfo) => {
    const { ctx, page } = await openEye(browser, testInfo);
    // From the card (the band's bell, which Starky used, went on 14 Nov).
    await page.click('#todayMoreBtn');
    await expect(page.locator('#dailyReportOverlay')).toBeVisible();
    // The bug: the card had four things and the report none of them.
    await expect(page.locator('#dailyReportList')).not.toContainText('Nothing to report today');
    await expect(page.locator('#dailyReportList')).toContainText('Did June Park happen?');
    const list = await reportToday(page);
    expect(list).toHaveLength(4);
    expect(list[0]).toContain('Did June Park happen?');
    expect(list[1]).toContain('Did Maya Ruiz happen?');
    expect(list.slice(2).join(' ')).toContain('Leo Grant is');
    expect(list.slice(2).join(' ')).toContain('Ivy Chen is');
    await expect(page.locator('#dailyReportList')).not.toContainText('Nothing to report today');
    // The Today part comes before the rest of the report.
    expect(await page.$eval('#dailyReportList', (l) => l.firstElementChild.className)).toBe('report-today');
    await ctx.close();
  });

  test('the Today card shows the two most urgent, then N MORE, which opens the report', async ({ browser }, testInfo) => {
    const { ctx, page } = await openEye(browser, testInfo);
    const items = await cardItems(page);
    expect(items).toHaveLength(2);
    expect(items[0]).toContain('Did June Park happen?');
    expect(items[1]).toContain('Did Maya Ruiz happen?');
    await expect(page.locator('#todayCount')).toHaveText('4 things');
    await expect(page.locator('#todayMoreWords')).toHaveText("2 more in today's report");
    await expect(page.locator('#todayMoreDots i')).toHaveCount(2);
    await page.click('#todayMoreBtn');
    await expect(page.locator('#dailyReportOverlay')).toBeVisible();
    expect(await reportToday(page)).toHaveLength(4);
    await ctx.close();
  });

  test('answering in the report takes it off the report and the card', async ({ browser }, testInfo) => {
    const { ctx, page } = await openEye(browser, testInfo);
    await page.click('#todayMoreBtn');
    await page.click('#dailyReportList .report-today [data-act="happened"][data-id="t2"]');
    await expect(page.locator('#dailyReportList .report-today .today-item')).toHaveCount(3);
    await expect(page.locator('#dailyReportOverlay')).toBeVisible();
    await expect(page.locator('#todayCount')).toHaveText('3 things');
    await expect(page.locator('#todayMoreWords')).toHaveText("1 more in today's report");
    // A link closes the report and opens what it's about.
    await page.click('#dailyReportList .report-today [data-act="shoot"][data-id="t3"]');
    await expect(page.locator('#dailyReportOverlay')).toBeHidden();
    await ctx.close();
  });

  test('with two things or fewer there is no MORE row: FULL REPORT, in place of the count, opens the report', async ({ browser }, testInfo) => {
    const { ctx, page } = await openEye(browser, testInfo);
    await expect(page.locator('#todayReportBtn')).toBeHidden();
    await page.click('#todayCardItems [data-act="happened"][data-id="t2"]');
    await page.click('#todayCardItems [data-act="happened"][data-id="t1"]');
    await expect(page.locator('#todayMoreBtn')).toBeHidden();
    await expect(page.locator('#todayCardItems .today-item')).toHaveCount(2);
    await expect(page.locator('#todayCount')).toBeHidden();
    const report = page.locator('#todayReportBtn');
    await expect(report).toBeVisible();
    await expect(report).toHaveText('Full report');
    // On the TODAY line, at its right, a 28px target at least.
    const head = await page.locator('.today-card-head').boundingBox();
    const btn = await report.boundingBox();
    expect(Math.round(btn.x + btn.width)).toBe(Math.round(head.x + head.width));
    expect(btn.height).toBeGreaterThanOrEqual(28);
    await report.click();
    await expect(page.locator('#dailyReportOverlay')).toBeVisible();
    expect(await reportToday(page)).toHaveLength(2);
    await ctx.close();
  });
});
