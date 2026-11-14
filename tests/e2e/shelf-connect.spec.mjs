// How the notebooks connect, on the shelf (round 2, connect/01 and 07):
// HOW THEY CONNECT from Options, the loop and a switch per hand-off (all on
// unless turned off, and kept), and a slip tucked into the cover of a
// notebook with a hand-off waiting, gone once it's opened there.
import { test, expect } from '@playwright/test';
import { freshPage } from './_helpers.mjs';

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

test("a notebook with a hand-off waiting has a slip in its cover, gone once it's opened there", async ({ browser }, testInfo) => {
  const r = await onShelf(browser, testInfo);
  const p = r.page;
  const layouts = p.locator('.slot', { has: p.locator('.front[aria-label^="Layouts"]') });
  await expect(p.locator('.cover-slip')).toHaveCount(0);
  const id = await p.evaluate(async () => (await window.DFData.saveLink({ type: 'finals', fromApp: 'the-eye', fromId: 's1', toApp: 'contact-sheet', title: 'Rooftop portraits' })).id);
  await p.reload();
  await expect(layouts.locator('.cover-slip')).toHaveCount(1);
  await expect(p.locator('.cover-slip')).toHaveCount(1);
  await expect(layouts.locator('.front')).toHaveAttribute('aria-label', 'Layouts: finals from The Eye');
  await expect(layouts.locator('.cover-slip')).toHaveCSS('background-color', 'rgb(255, 209, 0)');
  // Opened in Layouts: gone from the cover.
  await p.evaluate(async (linkId) => window.DFConnect.openSlip(await window.DFData.getLink(linkId)), id);
  await p.reload();
  await expect(layouts.locator('.front')).toHaveAttribute('aria-label', 'Layouts');
  await expect(p.locator('.cover-slip')).toHaveCount(0);
  expect(r.problems).toEqual([]);
  await r.ctx.close();
});
