// Rounds, Options: Work days, and Sync and the Claude inbox (rounds/NOTES.md).
// Pitches and follow ups wait for the work days. Sync turns on with a
// repository and a key (a fake GitHub here, tests/e2e/_rounds-github.mjs):
// Rounds writes rounds.json, Claude's leads come in to review on Today, a
// draft Claude left shows on its move as "Draft waiting in Gmail", and a
// thing changed on two devices at once asks which to keep.
import { test, expect } from '@playwright/test';
import { openRounds, goTo, opened, options, importCsv } from './_rounds.mjs';
import { fakeGitHub, REPO } from './_rounds-github.mjs';

// No service worker: in WebKit its requests would get past the fake GitHub.
const NO_SW = { serviceWorkers: 'block' };
const top = (page) => page.locator('#view .card.top');
const today = (page) => page.evaluate(() => new Date().toLocaleDateString('en-CA'));

// Ana Lima, a prospect, with a pitch due today.
async function addAna(page) {
  await importCsv(page, 'name,group,instagram\nAna Lima,prospect,@analima\n');
  const s = await opened(page, 'Import people');
  await s.locator('[data-add]').click();
  await expect(page.locator('#toast')).toContainText('1 person added.');
}

const workChips = (s) => s.locator('[data-chips="work"] .day-chip');
const offChips = (s) => s.locator('[data-chips="off"] .day-chip');

// Every day a work day and none off, so a pitch is due today whatever day the test runs.
async function everyDay(page) {
  const s = await options(page);
  const notWork = s.locator('[data-chips="work"] .day-chip[aria-pressed="false"]');
  for (let i = 0; i < 7 && (await notWork.count()); i++) await notWork.first().click();
  await expect(notWork).toHaveCount(0);
  await s.locator('[data-chips="off"] [data-off="0"]').click();
  await expect(s.locator('[data-chips="off"] .day-chip[aria-pressed="true"]')).toHaveCount(0);
  await s.locator('[data-close]').click();
}

async function turnOnSync(page) {
  const s = await options(page);
  await expect(s.locator('[data-sync]')).toContainText('Off.');
  await s.locator('[data-sync]').click();
  const setup = await opened(page, 'Turn on sync');
  await expect(setup.locator('.sync-how')).toHaveAttribute('open', '');
  await setup.locator('input[name="repo"]').fill('not a repository');
  await setup.locator('[data-save]').click();
  await expect(setup.locator('[data-error="repo"]')).toBeVisible();
  await setup.locator('input[name="repo"]').fill(`https://github.com/${REPO}`);
  await setup.locator('[data-save]').click();
  await expect(setup.locator('[data-error="token"]')).toBeVisible();
  await setup.locator('input[name="token"]').fill('test-key');
  await setup.locator('[data-save]').click();
  await expect(setup).toHaveCount(0);
  await expect(page.locator('#toast')).toContainText('Sync is on.');
}

test.describe('Rounds: Work days and Sync', () => {
  test("Work days and days off: a pitch waits for a work day, and nothing comes up on a day off", async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openRounds(browser, testInfo);
    await addAna(page);
    const day = await page.evaluate(() => new Date().getDay());
    const work = day >= 1 && day <= 5;
    // Monday to Friday to work, Sunday off, to start.
    let s = await options(page);
    await expect(workChips(s)).toHaveText(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    await expect(s.locator('[data-chips="work"] .day-chip[aria-pressed="true"]')).toHaveText(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
    await expect(offChips(s)).toHaveText(['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
    await expect(s.locator('[data-chips="off"] .day-chip[aria-pressed="true"]')).toHaveText(['Sun']);
    await expect(s.locator('.work-days-note')).toHaveText(['Pitches and follow ups wait for these days.', 'Nothing comes up on these days.']);
    await s.locator('[data-close]').click();
    await expect(top(page)).toHaveCount(work ? 1 : 0);
    // Today's work day chip brings the pitch up, or puts it off.
    s = await options(page);
    if (day === 0) await s.locator('[data-chips="off"] [data-off="0"]').click();
    await s.locator(`[data-chips="work"] [data-day="${day}"]`).click();
    await expect(s.locator(`[data-chips="work"] [data-day="${day}"]`)).toHaveAttribute('aria-pressed', String(!work));
    await s.locator('[data-close]').click();
    await expect(top(page)).toHaveCount(work ? 0 : 1);
    if (!work) await expect(top(page)).toContainText('Ana Lima');
    // Kept: the same after a reload.
    await page.reload();
    await expect(top(page)).toHaveCount(work ? 0 : 1);
    s = await options(page);
    await expect(s.locator(`[data-chips="work"] [data-day="${day}"]`)).toHaveAttribute('aria-pressed', String(!work));
    // Today a work day again, then a day off: nothing comes up.
    if (work) await s.locator(`[data-chips="work"] [data-day="${day}"]`).click();
    await s.locator('[data-close]').click();
    await expect(top(page)).toHaveCount(1);
    s = await options(page);
    await s.locator(`[data-chips="off"] [data-off="${day}"]`).click();
    await expect(s.locator(`[data-chips="off"] [data-off="${day}"]`)).toHaveAttribute('aria-pressed', 'true');
    await s.locator('[data-close]').click();
    await expect(top(page)).toHaveCount(0);
    // The last work day left that isn't off (today is) stays on.
    s = await options(page);
    const others = s.locator(`[data-chips="work"] .day-chip[aria-pressed="true"]:not([data-day="${day}"])`);
    for (let i = 0; i < 7 && (await others.count()) > 1; i++) await others.first().click();
    await expect(others).toHaveCount(1);
    await others.click();
    await expect(others).toHaveCount(1);
    expect(problems).toEqual([]);
    await ctx.close();
  });

  test("Sync: on with a repository and key; Claude's leads to review, a draft waiting in Gmail; then off", async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openRounds(browser, testInfo, '/rounds/', null, NO_SW);
    const lead = (id, name, f = {}) => ({ id, type: 'lead', added: '2026-11-14', found_by: 'Agency list', name, group: 'prospect', ...f });
    const gh = await fakeGitHub(ctx, {
      'inbox.json': JSON.stringify([
        lead('1', 'Rita Gomez', { instagram: 'rita.g' }),
        lead('2', 'Sol Park'),
        { id: '3', type: 'drafted', added: '2026-11-14', match: '@analima', kind: 'Pitch', where: 'Gmail' },
      ]),
    });
    await page.evaluate(() => { window.__opened = []; window.open = (url) => { window.__opened.push(url); return null; }; });
    await addAna(page);
    await everyDay(page);
    await turnOnSync(page);
    // rounds.json: Ana, with her next move in plain words for Claude.
    const file = gh.json('rounds.json');
    expect(file.app).toBe('rounds');
    expect(file.data.people.map((p) => p.name)).toEqual(['Ana Lima']);
    expect(file.data.people[0].nextMove).toEqual({ kind: 'Pitch', due: await today(page) });
    // The draft is marked on Ana's pitch and taken off the inbox; the leads wait.
    expect(gh.json('inbox.json').map((e) => e.id)).toEqual(['1', '2']);
    await expect(top(page).locator('.card-draft')).toHaveText('Draft waiting in Gmail');
    await page.click('#view [data-write]');
    const move = page.locator('.sheet', { has: page.locator('.move-draft') });
    await expect(move.locator('.move-draft')).toHaveText('Draft waiting in Gmail, written by Claude.');
    await expect(move.locator('textarea')).toHaveCount(0);
    await page.waitForTimeout(500);
    await move.locator('[data-gmail]').click();
    expect(await page.evaluate(() => window.__opened)).toEqual(['https://mail.google.com/mail/u/0/#drafts']);
    await move.locator('[data-close]').click();
    // Claude's leads: one line on Today, then the tick list, where each came from under its name.
    await expect(page.locator('#view .today-leads')).toContainText('2 new leads from Claude');
    await page.click('#view [data-leads]');
    const review = await opened(page, 'Leads from Claude');
    await expect(review.locator('.import-name')).toHaveText(['Rita Gomez', 'Sol Park']);
    await expect(review.locator('.import-from').first()).toHaveText('Agency list');
    await review.locator('.import-row', { hasText: 'Sol Park' }).click();
    await expect(review.locator('[data-add]')).toHaveText('Add 1 person');
    await review.locator('[data-add]').click();
    await expect(page.locator('#toast')).toContainText('1 person added.');
    await expect(page.locator('#view .today-leads')).toHaveCount(0);
    // At the next sync: both off the inbox, Rita in rounds.json, Sol on the passed list.
    await expect.poll(() => gh.json('inbox.json').length, { timeout: 10000 }).toBe(0);
    await expect.poll(() => gh.json('rounds.json').data.people.map((p) => p.name).sort(), { timeout: 10000 }).toEqual(['Ana Lima', 'Rita Gomez']);
    expect(gh.json('rounds.json').data.passed.map((p) => p.name)).toEqual(['Sol Park']);
    await goTo(page, 'people');
    await expect(page.locator('#view .person-card', { hasText: 'Rita Gomez' })).toHaveCount(1);
    // Options, Sync: where it syncs and when; then off, with everything kept here.
    let s = await options(page);
    await expect(s.locator('[data-sync]')).toContainText(`On, through ${REPO}`);
    await s.locator('[data-sync]').click();
    const status = await opened(page, 'Sync');
    await expect(status.locator('.sync-status')).toContainText('Last synced: just now');
    await status.locator('[data-off]').click();
    await expect(page.locator('#toast')).toContainText('Sync is off.');
    s = await options(page);
    await expect(s.locator('[data-sync]')).toContainText('Off.');
    await s.locator('[data-close]').click();
    await expect(page.locator('#view .person-card')).toHaveCount(2);
    expect(problems).toEqual([]);
    await ctx.close();
  });

  test('Changed on two devices: asked which to keep, and the one kept goes out', async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openRounds(browser, testInfo, '/rounds/', null, NO_SW);
    const gh = await fakeGitHub(ctx);
    await addAna(page);
    await turnOnSync(page);
    // Turning on syncs twice (once to try the key, then the first of the
    // automatic ones): once both are done, the Mac changes Ana's note, then this phone does before they sync.
    await expect.poll(() => gh.reads['inbox.json'], { timeout: 10000 }).toBe(2);
    gh.change('rounds.json', (f) => {
      const ana = f.data.people[0];
      Object.assign(ana, { note: 'Met at the Mac', updatedAt: new Date(Date.now() - 1000).toISOString() });
      return { ...f, syncedFrom: 'Mac' };
    });
    await goTo(page, 'people');
    await page.locator('#view .person-card', { hasText: 'Ana Lima' }).click();
    await page.click('#view [data-band-more]');
    const m = await opened(page, 'Ana Lima');
    await m.locator('.choice', { hasText: 'Edit' }).click();
    const edit = await opened(page, 'Edit');
    await edit.locator('textarea[name="note"]').fill('Met here');
    await edit.locator('button[type="submit"]').click();
    await expect(edit).toHaveCount(0);
    // A few seconds after the change, it syncs, and asks.
    const clash = page.locator('.sheet', { has: page.locator('.sheet-header h2', { hasText: 'Changed on two devices' }) });
    await expect(clash).toBeVisible({ timeout: 10000 });
    await expect(clash.locator('.clash-what')).toHaveText('Ana Lima');
    await expect(clash.locator('.clash-row .field-label')).toHaveText(['Note']);
    await expect(clash.locator('.clash-side').first()).toContainText('the Mac');
    await expect(clash.locator('.clash-side').first()).toContainText('Met at the Mac');
    await expect(clash.locator('.clash-side').nth(1)).toContainText('(newer)');
    await expect(clash.locator('[data-side="mine"]')).toHaveClass(/primary/);
    // Nothing overwritten while it waits.
    expect(gh.json('rounds.json').data.people[0].note).toBe('Met at the Mac');
    await page.waitForTimeout(500);
    await clash.locator('[data-side="mine"]').click();
    await expect(clash).toHaveCount(0);
    await expect.poll(() => gh.json('rounds.json').data.people[0].note, { timeout: 10000 }).toBe('Met here');
    await expect(page.locator('#view .person-line')).toContainText('Met here');
    expect(problems).toEqual([]);
    await ctx.close();
  });
});
