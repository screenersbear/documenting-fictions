// The year (round 2, connect/15): from December, the shelf's Options has
// YOUR YEAR: the year's numbers in the loop's order beside each notebook's
// mark, then WHAT LED TO WORK from Rounds; SHARE saves it as a picture.
// Before the first December there's no row for it. (Each notebook leaves its
// numbers as it opens: tested with each one's people-out, in the unit tests.)
import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { freshPage } from './_helpers.mjs';

// The page's day moved to 3 December 2026 (only the date: every timer runs as it is).
function inDecember() {
  const Real = Date;
  const shift = new Real(2026, 11, 3, 10, 0, 0).getTime() - Real.now();
  window.Date = class extends Real {
    constructor(...args) { super(...(args.length ? args : [Real.now() + shift])); }
    static now() { return Real.now() + shift; }
  };
}
// What the notebooks left for the year page, as they would.
function numbers() {
  const at = '2026-12-01T10:00:00.000Z';
  const put = (app, years) => localStorage.setItem(`df-year-${app}`, JSON.stringify({ at, years }));
  put('rounds', { 2026: { pitched: 28, yes: 6, led: [
    { title: 'Asking past clients for intros', line: '9 sent, 3 of the 6 yeses', bg: '#CC2E8A', icon: '<svg viewBox="0 0 24 24" width="10" height="10" fill="#E2E600" aria-hidden="true"><circle cx="6" cy="6" r="6"/></svg>' },
    { title: 'Your photos are up', line: '4 sent, 1 booked again', bg: '#FFD100', icon: '<svg viewBox="0 0 24 24" width="10" height="10" fill="#313D45" aria-hidden="true"><circle cx="12" cy="12" r="12"/></svg>' },
  ] }, 2025: { pitched: 3 } });
  put('ref', { 2026: { boards: 9 } });
  put('the-eye', { 2026: { shoots: 14 } });
  put('contact-sheet', { 2026: { posts: 1 } });
}

async function onShelf(browser, testInfo, scripts) {
  const r = await freshPage(browser, testInfo, '/', { returning: true });
  for (const s of scripts) await r.ctx.addInitScript(s);
  await r.page.setViewportSize({ width: 390, height: 844 });
  await r.page.reload();
  await expect.poll(() => r.page.evaluate(() => Number(getComputedStyle(document.getElementById('shelfBar')).opacity)), { timeout: 5000 }).toBe(1);
  return r;
}
async function options(page) {
  await page.click('#optionsBtn');
  await expect(page.locator('.sheet.opts [data-connect]')).toBeVisible();
  await page.waitForTimeout(300);
}

test("in December, Options has YOUR YEAR: the year's numbers, what led to work, and a picture of it to share", async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await onShelf(browser, testInfo, [inDecember, numbers]);
  await options(page);
  await page.locator('.sheet.opts [data-year]').click();
  const year = page.locator('.year-page');
  await expect(year).toBeVisible();
  await expect(year.locator('.connect-head h2')).toHaveText('Your year');
  await expect(year.locator('.year-title')).toHaveText('2026');
  await expect(year.locator('.year-intro')).toHaveText('How the circle went, from the first pitch to the posts.');
  await expect(year.locator('.year-n')).toHaveText(['28', '6', '9', '14', '1']);
  await expect(year.locator('.year-words')).toHaveText(['people pitched', 'said yes', 'boards made', 'shoots', 'post']);
  expect(await year.locator('.year-mark').evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor))).toEqual([
    'rgb(49, 61, 69)', 'rgb(49, 61, 69)', 'rgb(10, 79, 214)', 'rgb(255, 209, 0)', 'rgb(204, 46, 138)']);
  await expect(year.locator('.year-label')).toHaveText('What led to work');
  await expect(year.locator('.year-led-title')).toHaveText(['Asking past clients for intros', 'Your photos are up']);
  await expect(year.locator('.year-led-line')).toHaveText(['9 sent, 3 of the 6 yeses', '4 sent, 1 booked again']);

  // SHARE: the share sheet on a phone; here, where there's none, a download.
  await page.evaluate(() => Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true }));
  const [download] = await Promise.all([page.waitForEvent('download'), year.locator('[data-share]').click()]);
  expect(download.suggestedFilename()).toBe('Your year 2026.png');
  await expect(page.locator('.toast')).toContainText('Your year is in your downloads');
  // The picture: three times the page's width, on paper.
  const size = await page.evaluate(async (url) => {
    const img = new Image();
    img.src = url;
    await img.decode();
    return [img.naturalWidth, img.naturalHeight > img.naturalWidth];
  }, `data:image/png;base64,${(await readFile(await download.path())).toString('base64')}`);
  expect(size).toEqual([1170, true]);

  await year.locator('[data-back]').click();
  await expect(year).toHaveCount(0);
  expect(problems).toEqual([]);
  await ctx.close();
});

test('a year with nothing left yet reads as nothing; before the first December, no row', async ({ browser }, testInfo) => {
  const dec = await onShelf(browser, testInfo, [inDecember]);
  await options(dec.page);
  await dec.page.locator('.sheet.opts [data-year]').click();
  const year = dec.page.locator('.year-page');
  await expect(year.locator('.year-n')).toHaveText(['0', '0', '0', '0', '0']);
  await expect(year.locator('.year-none')).toHaveText('Nothing yet. The moves that lead to a yes, or to a shoot booked again, show here.');
  await dec.ctx.close();

  const nov = await onShelf(browser, testInfo, [numbers]);
  await options(nov.page);
  // (Today is before 1 Dec 2026 while these tests are new; after that, the row shows last year's.)
  const shown = await nov.page.evaluate(() => window.DFYear.yearShown(window.DFDataParts.todayStr()));
  await expect(nov.page.locator('.sheet.opts [data-year]')).toHaveCount(shown ? 1 : 0);
  await nov.ctx.close();
});
