// Rounds on its own (rounds/STANDALONE.md, 21 Nov): the copy that
// tools/sync.py export makes, opened by itself, with no ../suite.js beside
// it. No Notebooks button; nothing from or to the other notebooks (The
// Eye's people, Layouts' post slips); no Bring in from Callback; Sync's
// words without Claude; Back up only Just Rounds, and a backup of all four
// says only Rounds' part goes back; the first visit offers the tour; and
// everything it keeps is under df-rounds, apart from the suite's Rounds.
import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { freshPage } from './_helpers.mjs';
import { eyeShoot, opened, sheet, weekdayDate } from './_rounds.mjs';

const ROOT = fileURLToPath(new URL('../..', import.meta.url));
let path = '';

// The real export, into a folder of its own for each worker (they run side by side).
test.beforeAll(({ browserName }, testInfo) => {
  const dir = `reports/standalone/${testInfo.project.name}-${browserName}-${testInfo.workerIndex}/rounds`;
  execFileSync('python3', ['tools/sync.py', 'export', 'rounds', dir, '--force'], { cwd: ROOT, stdio: 'pipe' });
  path = `/${dir}/`;
});

// Opened as someone who's been before (no tour offer), at 390 wide, on a day
// Rounds works (on a Sunday, its day off, the page's date is Monday: _rounds.mjs).
async function openAlone(browser, testInfo, seed = null) {
  const { ctx, page, problems } = await freshPage(browser, testInfo, path);
  await page.evaluate(() => localStorage.setItem('rounds-intro-seen', '1'));
  await ctx.addInitScript(weekdayDate);
  if (seed) await ctx.addInitScript(seed);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.waitForLoadState('networkidle').catch(() => {});
  await expect(page.locator('#view .band')).toBeVisible();
  return { ctx, page, problems };
}

// ADD SOMEONE on People, which opens their page: their id, from its address.
async function addSomeone(page, name) {
  await page.goto(`${path}#/people`);
  await page.click('#view .list-head [data-add]');
  const add = await opened(page, 'Add someone');
  await add.locator('input[name="name"]').fill(name);
  await add.locator('button[type="submit"]').click();
  await expect(page.locator('#view .person-name')).toHaveText(name);
  return decodeURIComponent(page.url().split('#/person/')[1]);
}

test.describe('Rounds on its own', () => {
  test('the export leaves out ../suite.js and puts in its own storage', async ({ page }) => {
    const html = await (await page.request.get(`${path}index.html`)).text();
    expect(html).not.toContain('../suite.js');
    expect(html).toContain("var P = 'df-rounds:';");
    expect(html).not.toContain('df-theeye');
  });

  test('the first visit offers the tour; Not now says where it is, and it is not offered again', async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await freshPage(browser, testInfo, path);
    const offer = await opened(page, 'Welcome to Rounds');
    await expect(offer.locator('.sheet-message')).toHaveText('A few people to write to each day, and the words to start with. A quick tour of how it works?');
    await expect(offer.locator('[data-step]')).toHaveText(['Not now', 'Take the tour']);
    await offer.locator('[data-step="no"]').click();
    const later = sheet(page, 'Any time');
    await expect(later.locator('.sheet-message')).toHaveText('The tour is in Options, the button at the top of the screen, under How it works.');
    await later.locator('[data-step="done"]').click();
    await expect(page.locator('.sheet')).toHaveCount(0);
    await page.reload();
    await page.waitForTimeout(1800);
    await expect(page.locator('.sheet')).toHaveCount(0);
    // TAKE THE TOUR: the cards, in a new visit.
    await page.evaluate(() => localStorage.removeItem('rounds-intro-seen'));
    await page.reload();
    const again = await opened(page, 'Welcome to Rounds');
    await again.locator('[data-step="yes"]').click();
    await expect(sheet(page, 'A few people a day')).toBeVisible();
    expect(problems).toEqual([]);
    await ctx.close();
  });

  test('no Notebooks button, nothing from The Eye or Layouts, and everything kept under df-rounds', async ({ browser }, testInfo) => {
    // The Eye inside the suite, on the same website: its shoots are there, unprefixed.
    const { ctx, page, problems } = await openAlone(browser, testInfo, eyeShoot);
    await expect(page.locator('#view [data-books]')).toBeHidden();
    await expect(page.locator('#view [data-app-menu]')).toBeVisible();
    await expect(page.locator('#view .card')).toHaveCount(0); // Maya from The Eye's shoot never came in
    const id = await addSomeone(page, 'Dana Ortiz');
    // A post from Layouts tagging Dana, as the suite would hand it over: never shown on its own.
    await page.evaluate((who) => window.DFData.saveLink({ fromApp: 'contact-sheet', fromId: 'post-1', toApp: 'rounds', toId: '', type: 'post-people', title: 'Rooftop', people: [who], takenAt: Date.now() }), id);
    await page.goto(`${path}#/today`);
    await page.reload();
    await expect(page.locator('#view .band')).toBeVisible();
    await page.waitForTimeout(600);
    await expect(page.locator('#view .df-slip')).toHaveCount(0);
    await expect(page.locator('#view .card.top')).toContainText('Dana Ortiz');
    const kept = await page.evaluate(async () => ({
      dbs: indexedDB.databases ? (await indexedDB.databases()).map((d) => d.name) : null,
      keys: Object.keys(localStorage),
    }));
    // Everything Rounds keeps is under its own names; The Eye's state (seeded above) is The Eye's.
    expect(kept.keys.filter((k) => k !== 'dailies_state_v1' && !k.startsWith('df-rounds:'))).toEqual([]);
    expect(kept.keys).toContain('df-rounds:rounds-intro-seen');
    if (kept.dbs) {
      expect(kept.dbs.length).toBeGreaterThan(0);
      expect(kept.dbs.filter((n) => !n.startsWith('df-rounds-'))).toEqual([]);
    }
    expect(problems).toEqual([]);
    await ctx.close();
  });

  test('Options: no Bring in from Callback, Sync without Claude, Back up only Just Rounds', async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openAlone(browser, testInfo);
    await page.click('#view [data-app-menu]');
    const opts = await opened(page, 'Options');
    await expect(opts.locator('[data-callback]')).toHaveCount(0);
    await expect(opts.locator('[data-sync] .choice-detail')).toHaveText('Off. Keeps Rounds the same on all your devices.');
    await expect(opts).not.toContainText('Claude');
    await opts.locator('[data-backup]').click();
    const rows = page.locator('.dfb-rows .dfb-row');
    await expect(rows).toHaveCount(1);
    await expect(rows.locator('.dfb-title')).toHaveText('Just this notebook');
    expect(problems).toEqual([]);
    await ctx.close();
  });

  test('a backup of all four says only Rounds\' part goes back', async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openAlone(browser, testInfo);
    await page.click('#view [data-app-menu]');
    const opts = await opened(page, 'Options');
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), opts.locator('[data-restore]').click()]);
    await chooser.setFiles({ name: 'documenting-fictions.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ kind: 'suite-backup', notebooks: {} })) });
    const text = page.locator('.dfb-text', { hasText: 'This backup has all four notebooks.' });
    await expect(text).toHaveText('This backup has all four notebooks. On its own, Rounds puts back only its part.');
    await expect(page.locator('[data-just]')).toHaveText('Just Rounds');
    await expect(page.locator('[data-all]')).toHaveCount(0);
    await page.locator('button.dfb-btn[data-close]', { hasText: 'Cancel' }).click();
    await expect(text).toHaveCount(0);
    expect(problems).toEqual([]);
    await ctx.close();
  });
});
