// Moments, and SO FAR back on the person's page in Rounds (round 2,
// thanks/05 and 06, 16 Nov): ADD A MOMENT under the next move (what
// happened, when, a note, and whether it counts as keeping in touch, which
// moves a Check in out), SO FAR listing everything, each moment and note
// changed or deleted with Undo, and today's in DONE TODAY on Today. (What
// moves and when is unit tested: tests/unit/rounds/moments, moment-store.)
import { test, expect } from '@playwright/test';
import { openRounds, goTo, opened, importCsv, weekdayNow, doneNoSheet, doneRows, doneWhat, doneSaid } from './_rounds.mjs';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayN = (n) => { const d = weekdayNow(); d.setDate(d.getDate() + n); return d; };
const short = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
// When a move's due, as Rounds shows it: a Sunday (a day off) is the Monday.
const due = (n) => { const d = dayN(n); if (d.getDay() === 0) d.setDate(d.getDate() + 1); return short(d); };
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// June, a Regular: a Check in due today.
async function june(browser, testInfo) {
  const r = await openRounds(browser, testInfo);
  await importCsv(r.page, 'name,group,instagram\nJune Park,regular,@junepark\n');
  const s = await opened(r.page, 'Import people');
  await s.locator('[data-add]').click();
  await expect(s).toHaveCount(0);
  await goTo(r.page, 'people');
  await r.page.locator('#view .person-card', { hasText: 'June Park' }).click();
  await expect(r.page.locator('#view .person-name')).toHaveText('June Park');
  return r;
}
const nextWhen = (page) => page.locator('#view .person-next-when');
const soFar = (page) => page.locator('#view .so-far-list');
const momentSheet = (page) => opened(page, 'A moment with');

test('ADD A MOMENT: it goes in SO FAR with Rounds\' mark and moves the Check in out; Undo takes it back', async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await june(browser, testInfo);
  await expect(nextWhen(page)).toHaveText('Today');
  await expect(page.locator('#view .so-far-head')).toHaveCount(0); // nothing yet
  await page.click('#view [data-moment]');
  const m = await momentSheet(page);
  await expect(m.locator('.sheet-header h2')).toHaveText('A moment with June');
  await expect(m.locator('[data-what]')).toHaveText(['Sent photos', 'Texted', 'Called', 'Emailed', 'Messaged on Instagram', 'Ran into June', 'Met up', 'Commented on a post', 'Other']);
  await expect(m.locator('.moment-when-words')).toHaveText(new RegExp(`^Today, \\w{3} ${short(dayN(0))}$`));
  await expect(m.locator('.moment-keeps-sub')).toHaveText("June's next check-in moves out from today.");
  await expect(m.locator('#momentKeeps')).toBeChecked();
  await expect(m.locator('[data-save]')).toHaveText('Add the moment');
  await expect(m.locator('[data-save]')).toBeDisabled();
  await m.locator('[data-what="photos"]').click();
  await expect(m.locator('[data-what="photos"]')).toHaveAttribute('aria-pressed', 'true');
  await m.locator('.moment-note').fill('Sent her 5 teasers from the session.');
  await m.locator('[data-save]').click();
  await expect(m).toHaveCount(0);
  await expect(page.locator('#view .so-far-head')).toHaveText('So far');
  await expect(soFar(page).locator('.so-far-what')).toHaveText(['Sent photos']);
  await expect(soFar(page).locator('.so-far-note')).toHaveText(['Sent her 5 teasers from the session.']);
  await expect(soFar(page).locator('.so-far-day')).toHaveText([short(dayN(0))]);
  await expect(soFar(page).locator('.mini.nb svg')).toHaveCount(1);
  await expect(nextWhen(page)).toHaveText(due(42));
  // Undo: gone, and the Check in back.
  await page.locator('#toast .toast-action').click();
  await expect(page.locator('#view .so-far-head')).toHaveCount(0);
  await expect(nextWhen(page)).toHaveText('Today');
  expect(problems).toEqual([]);
  await ctx.close();
});

test('a moment on another day, not counting; then changed, deleted and put back', async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await june(browser, testInfo);
  await page.click('#view [data-moment]');
  let m = await momentSheet(page);
  await m.locator('.moment-keeps').click(); // the switch off
  await expect(m.locator('#momentKeeps')).not.toBeChecked();
  await expect(m.locator('.moment-keeps-sub')).toHaveText('Nothing in Rounds moves.');
  await m.locator('#momentDay').fill(iso(dayN(-1)));
  await expect(m.locator('.moment-when-words')).toHaveText(new RegExp(`^Yesterday, \\w{3} ${short(dayN(-1))}$`));
  await m.locator('[data-what="call"]').click();
  await m.locator('[data-save]').click();
  await expect(soFar(page).locator('.so-far-what')).toHaveText(['Called']);
  await expect(soFar(page).locator('.so-far-day')).toHaveText([short(dayN(-1))]);
  await expect(nextWhen(page)).toHaveText('Today'); // it didn't count

  // Tapped: the same sheet, filled in. Met up, counting now.
  await soFar(page).locator('.so-far-row').first().click();
  m = await momentSheet(page);
  await expect(m.locator('[data-what="call"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(m.locator('#momentKeeps')).not.toBeChecked();
  await expect(m.locator('[data-save]')).toHaveText('Save');
  await m.locator('[data-what="met"]').click();
  await m.locator('.moment-keeps').click();
  await expect(m.locator('.moment-keeps-sub')).toHaveText("June's next check-in moves out from that day.");
  await m.locator('[data-save]').click();
  await expect(m).toHaveCount(0);
  await expect(soFar(page).locator('.so-far-what')).toHaveText(['Met up']);
  await expect(nextWhen(page)).toHaveText(due(41));

  // Deleted: the Check in back; Undo puts both back.
  await soFar(page).locator('.so-far-row').first().click();
  m = await momentSheet(page);
  await m.locator('[data-delete]').click();
  await expect(m).toHaveCount(0);
  await expect(page.locator('#view .so-far-head')).toHaveCount(0);
  await expect(nextWhen(page)).toHaveText('Today');
  await page.locator('#toast .toast-action').click();
  await expect(soFar(page).locator('.so-far-what')).toHaveText(['Met up']);
  await expect(nextWhen(page)).toHaveText(due(41));
  expect(problems).toEqual([]);
  await ctx.close();
});

test('a note in SO FAR: its words changed, deleted, and put back', async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await june(browser, testInfo);
  // A note from before 16 Nov (the shelf's ADD A NOTE), as Rounds keeps it.
  const id = decodeURIComponent(new URL(page.url()).hash.replace('#/person/', ''));
  await page.evaluate((personId) => window.DFData.askRounds('shelf', { do: 'note', personId, how: 'call', note: 'Booked.' }), id);
  await page.reload();
  await expect(soFar(page).locator('.so-far-what')).toHaveText(['Note · a call']);
  await soFar(page).locator('.so-far-row').first().click();
  const s = await opened(page, 'Note');
  await expect(s.locator('[data-how="call"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(s.locator('textarea')).toHaveValue('Booked.');
  await s.locator('textarea').fill('Booked for the 14th.');
  await s.locator('[data-save]').click();
  await expect(soFar(page).locator('.so-far-note')).toHaveText(['Booked for the 14th.']);
  await soFar(page).locator('.so-far-row').first().click();
  await (await opened(page, 'Note')).locator('[data-delete]').click();
  await expect(page.locator('#view .so-far-head')).toHaveCount(0);
  await page.locator('#toast .toast-action').click();
  await expect(soFar(page).locator('.so-far-note')).toHaveText(['Booked for the 14th.']);
  expect(problems).toEqual([]);
  await ctx.close();
});

test('DONE TODAY on Today: a moment done today is a row with Rounds\' mark; tapped, it opens to change or delete (with Undo)', async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await june(browser, testInfo);
  // The Check in done, from her page, then a moment.
  await page.click('#view [data-move]');
  const move = await opened(page, 'June Park');
  await move.locator('[data-done]').click();
  await doneNoSheet(page);
  await page.click('#view [data-moment]');
  const m = await momentSheet(page);
  await m.locator('[data-what="email"]').click();
  await m.locator('.moment-note').fill('Sent the call sheet.\nAnd the map.');
  await m.locator('[data-save]').click();
  await expect(m).toHaveCount(0);
  await goTo(page, 'today');
  await expect(page.locator('#view .done-today-head')).toHaveText('Done today 2');
  await expect(doneWhat(page)).toHaveText(['Emailed June Park', 'Checked in with June Park']);
  await expect(doneSaid(page)).toHaveText(['Sent the call sheet. And the map.']);
  await expect(doneRows(page).first().locator('.mini.nb svg')).toHaveCount(1);
  // Tapped: the moment's own sheet; DELETE THE MOMENT, then Undo.
  await doneRows(page).first().click();
  const open = await momentSheet(page);
  await expect(open.locator('[data-what="email"]')).toHaveAttribute('aria-pressed', 'true');
  await open.locator('[data-delete]').click();
  await expect(open).toHaveCount(0);
  await expect(doneWhat(page)).toHaveText(['Checked in with June Park']);
  await page.locator('#toast .toast-action').click();
  await expect(doneWhat(page)).toHaveText(['Emailed June Park', 'Checked in with June Park']);
  expect(problems).toEqual([]);
  await ctx.close();
});
