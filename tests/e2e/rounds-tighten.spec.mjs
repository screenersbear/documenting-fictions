// Rounds, tightened (16 Nov, rounds/06-11 and NOTES.md "Tightening Rounds"):
// + CONNECTION on Today finds anyone (or adds someone new) straight into the
// one sheet; a done move tapped shows WHAT YOU SAID, with EDIT, COPY AGAIN
// and DELETE (with Undo), on Done today and from their page on the shelf;
// People has a search, filter chips and a sort kept on this device (A to Z
// first); two people who look alike get one quiet MERGE line, and the menu
// has MERGE WITH... and DELETE. (The data under it is unit tested:
// tests/unit/rounds/one-move, one-move-store, people-find, look-alike,
// merge-people, people-store.)
import { test, expect } from '@playwright/test';
import { openRounds, eyeShoot, goTo, opened, doneNoSheet, toldShelf, doneRows, doneWhat, doneSaid } from './_rounds.mjs';

// People (and what was done with them) put straight into Rounds' database,
// then Rounds opened again. due: days from today for their next move.
async function seed(page, people, lines = []) {
  await page.evaluate(async ({ people, lines }) => {
    const iso = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
    const db = await import('/rounds/data/db.js');
    await db.savePeople(people.map(({ due, kind = 'checkin', ...p }) => ({
      group: 'new', groups: [p.group || 'new'], added: iso(-60), letGo: false, shoots: [], lastMove: '', photoKey: '', instagram: '',
      next: due === undefined ? null : { kind, due: iso(due), step: 0 }, ...p,
    })));
    await db.logMoves(lines.map(({ ago, ...l }, i) => ({ id: `seed${i}`, at: Date.now() - (ago + 1) * 86400000, day: iso(-ago), ...l })));
  }, { people, lines });
  await page.reload();
  await expect(page.locator('#view .band')).toBeVisible();
}
const names = (page) => page.locator('#view .people-grid').first().locator('.person-card-name');
const toast = (page) => page.locator('#toast');
const undo = (page) => page.locator('#toast .toast-action');
async function people(page) {
  if (/#\/person\//.test(page.url())) await page.evaluate(() => { location.hash = '#/people'; });
  else await goTo(page, 'people');
}
async function personPage(page, name) {
  await people(page);
  await page.locator('#view .person-card', { hasText: name }).click();
  await expect(page.locator('#view .person-name')).toHaveText(name);
}
async function menu(page, name, label) {
  await page.click('#view [data-band-more]');
  const m = await opened(page, name);
  await m.locator('.choice', { hasText: label }).click();
}
const clipboard = (page) => page.evaluate(() => {
  window.open = () => null;
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t) => { window.__copied = t; } } });
});

test.describe('Rounds: tightened', () => {
  test('+ CONNECTION finds anyone by name or handle, or adds someone new, straight into the one sheet', async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openRounds(browser, testInfo);
    await seed(page, [
      { id: 'l', name: 'Lindsey T.', group: 'regular', instagram: 'lindsey.t', due: 20 },
      { id: 'a', name: 'Ana Lee', due: 12, kind: 'hello' },
    ], [{ personId: 'a', kind: 'moment', what: 'photos', ago: 3 }]);
    await expect(page.locator('#view [data-reach]')).toHaveText('Connection');
    await page.click('#view [data-reach]');
    const s = await opened(page, 'New connection');
    // Everyone, the last one in touch first, with their group and the last thing.
    await expect(s.locator('.pick-row-name')).toHaveText(['Ana Lee', 'Lindsey T.']);
    await expect(s.locator('.pick-row-line').first()).toHaveText(/^New · last: sent photos, /);
    await expect(s.locator('[data-new-line]')).toHaveText('Add them, then write');
    const find = s.locator('[data-find]');
    await find.fill('lin');
    await expect(s.locator('.pick-row-name')).toHaveText(['Lindsey T.']);
    await expect(s.locator('[data-new-line]')).toHaveText('Add "lin"');
    await find.fill('@lindsey.t');
    await expect(s.locator('.pick-row-name')).toHaveText(['Lindsey T.']);
    await s.locator('[data-pick]').click();
    // The one sheet for her, on her next move.
    const move = await opened(page, 'Lindsey T.');
    await expect(move.locator('[data-kind][aria-pressed="true"]')).toHaveText('Check in');
    await move.locator('[data-done]').click();
    await doneNoSheet(page);
    await expect(doneWhat(page)).toHaveText(['Checked in with Lindsey T.']);
    // Someone new: their name carried over, then the one sheet for them.
    await page.click('#view [data-reach]');
    const again = await opened(page, 'New connection');
    await again.locator('[data-find]').fill('Rita Gomez');
    await expect(again.locator('.pick-row')).toHaveCount(0);
    await again.locator('[data-new]').click();
    const add = await opened(page, 'Add someone');
    await expect(add.locator('input[name="name"]')).toHaveValue('Rita Gomez');
    await add.locator('button[type="submit"]').click();
    const rita = await opened(page, 'Rita Gomez');
    await expect(rita.locator('[data-kind][aria-pressed="true"]')).toHaveText('Say hello');
    expect(problems).toEqual([]);
    await ctx.close();
  });

  test('WHAT YOU SAID: a done move tapped, in full; COPY AGAIN, EDIT, and DELETE with Undo', async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openRounds(browser, testInfo, '/rounds/', eyeShoot);
    await clipboard(page);
    await page.click('#view [data-write]');
    const move = await opened(page, 'Jules M.');
    await move.locator('[data-offer]').click();
    const said = await move.locator('.one-said').inputValue();
    await move.locator('[data-how="text"]').click();
    await move.locator('.one-note').fill('Loved the light.');
    await move.locator('[data-done]').click();
    await doneNoSheet(page);
    await expect(page.locator('#view .card.top')).toContainText('Maya R.');
    await expect(doneSaid(page)).toHaveText([`"${said}"`]);
    await doneRows(page).first().click();
    let s = await opened(page, 'Say thanks');
    await expect(s.locator('.said-title')).toHaveText('Said thanks to Jules');
    await expect(s.locator('.said-when')).toHaveText(/^(Mon|Tue|Wed|Thu|Fri|Sat) \d{1,2} [A-Z][a-z]{2} · by text$/);
    await expect(s.locator('.said-label')).toHaveText(['What you said', 'Your note']);
    await expect(s.locator('.said-words')).toHaveText(said);
    await expect(s.locator('.said-note')).toHaveText('Loved the light.');
    // COPY AGAIN.
    await s.locator('[data-copy]').click();
    await expect(toast(page)).toContainText('Copied.');
    expect(await page.evaluate(() => window.__copied)).toBe(said);
    // EDIT: the one sheet, its kind as it was, filled in.
    await s.locator('[data-edit]').click();
    const edit = await opened(page, 'Jules M.');
    await expect(edit.locator('[data-kind]')).toHaveText(['Say thanks']);
    await expect(edit.locator('.one-said')).toHaveValue(said);
    await expect(edit.locator('[data-how][aria-pressed="true"]')).toHaveText('Text');
    await edit.locator('.one-note').fill('Loved the light. Wants to shoot again.');
    await edit.locator('[data-done]').click();
    await expect(edit).toHaveCount(0);
    // Back on Today; opened again, it has the change.
    await expect(page.locator('.sheet')).toHaveCount(0);
    await doneRows(page).first().click();
    s = await opened(page, 'Say thanks');
    await expect(s.locator('.said-note')).toHaveText('Loved the light. Wants to shoot again.');
    // DELETE: the thank you is due again, Jules' card back on Today, and DONE TODAY gone; Undo takes it out again.
    await s.locator('[data-delete]').click();
    await expect(toast(page)).toContainText('Deleted.');
    await expect(page.locator('.sheet')).toHaveCount(0);
    await expect(page.locator('#view .card.top')).toContainText('Jules M.');
    await expect(page.locator('#view .done-today')).toHaveCount(0);
    await undo(page).click();
    await expect(page.locator('#view .card.top')).toContainText('Maya R.');
    await expect(doneWhat(page)).toHaveText(['Said thanks to Jules M. · text']);
    // Their name or picture on top goes to their page (20 Nov).
    await doneRows(page).first().click();
    s = await opened(page, 'Say thanks');
    await expect(s.locator('.who-name')).toHaveText('Jules M.');
    await s.locator('[data-who]').click();
    await expect(page.locator('.sheet')).toHaveCount(0);
    await expect(page).toHaveURL(/#\/person\//);
    await expect(page.locator('#view .person-name')).toHaveText('Jules M.');
    expect(problems).toEqual([]);
    await ctx.close();
  });

  test('People: a search, one filter at a time, and a sort kept on this device (A to Z first)', async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openRounds(browser, testInfo);
    await seed(page, [
      { id: 'c', name: 'Cy Moss', group: 'client', due: 2 },
      { id: 'a', name: 'ana Lee', due: 0, kind: 'hello' },
      { id: 'b', name: 'Bo Park', group: 'regular', instagram: 'bo.shoots', note: 'Met at the gallery', due: 30 },
    ], [{ personId: 'c', kind: 'checkin', ago: 2 }]);
    await goTo(page, 'people');
    await expect(names(page)).toHaveText(['ana Lee', 'Bo Park', 'Cy Moss']);
    await expect(page.locator('#view .person-card', { hasText: 'ana Lee' }).locator('.person-card-line')).toHaveText('Due today');
    await expect(page.locator('#view .person-card', { hasText: 'Cy Moss' }).locator('.person-card-line')).toHaveText(/^Last: checked in, /);
    // Filters.
    await expect(page.locator('#view [data-filter]')).toHaveText(['All', 'Due', 'Regulars', 'Clients', 'New', 'Prospects']);
    await page.click('#view [data-filter="due"]');
    await expect(names(page)).toHaveText(['ana Lee']);
    await page.click('#view [data-filter="client"]');
    await expect(page.locator('#view [data-filter][aria-pressed="true"]')).toHaveText('Clients');
    await expect(names(page)).toHaveText(['Cy Moss']);
    await page.click('#view [data-filter="prospect"]');
    await expect(page.locator('#view [data-people] .note')).toHaveText('No one here.');
    await page.click('#view [data-filter="all"]');
    // The search: a name, a handle, their note.
    const find = page.locator('#view [data-find]');
    await find.fill('gallery');
    await expect(names(page)).toHaveText(['Bo Park']);
    await find.fill('@bo.sh');
    await expect(names(page)).toHaveText(['Bo Park']);
    await find.fill('zz');
    await expect(page.locator('#view [data-people] .note')).toHaveText('No one matches "zz".');
    await find.fill('');
    await expect(names(page)).toHaveText(['ana Lee', 'Bo Park', 'Cy Moss']);
    // The sort: Next move, then Recently in touch from the button; kept after a reload.
    await expect(page.locator('#view .people-sort-now')).toHaveText('Sort: A to Z');
    await page.click('#view [data-sort="next"]');
    await expect(names(page)).toHaveText(['ana Lee', 'Cy Moss', 'Bo Park']);
    await page.click('#view [data-sort-next]');
    await expect(page.locator('#view .people-sort-now')).toHaveText('Sort: Recently in touch');
    await expect(names(page).first()).toHaveText('Cy Moss');
    await page.reload();
    await expect(page.locator('#view .people-sort-now')).toHaveText('Sort: Recently in touch');
    expect(problems).toEqual([]);
    await ctx.close();
  });

  test('two people who look alike: MERGE, with Undo, makes them one; or waved away for good', async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openRounds(browser, testInfo);
    await seed(page, [
      { id: 'l', name: 'Lindsey Tran', group: 'regular', instagram: 'lindsey.t', due: 20 },
      { id: 'n', name: 'Lindsay Tran', tiktok: 'lt', due: 9, kind: 'hello' },
    ], [{ personId: 'n', kind: 'hello', ago: 5 }, { personId: 'l', kind: 'checkin', ago: 30 }]);
    await goTo(page, 'people');
    const alike = page.locator('#view .look-alike');
    await expect(alike).toContainText('might be the same person.');
    await expect(alike.locator('b')).toHaveText(['Lindsay Tran', 'Lindsey Tran']);
    await alike.locator('[data-merge]').click();
    const s = await opened(page, 'Merge into one person');
    await expect(s.locator('.merge-name')).toHaveText(['Lindsay Tran', 'Lindsey Tran']);
    await expect(s.locator('.merge-count')).toHaveText(['New · 1 thing logged', 'Regular · 1 thing logged']);
    await expect(s.locator('[data-keep][aria-pressed="true"] .merge-name')).toHaveText('Lindsay Tran');
    await s.locator('[data-keep="l"]').click();
    await expect(s.locator('[data-keep][aria-pressed="true"] .merge-name')).toHaveText('Lindsey Tran');
    await s.locator('[data-merge]').click();
    await expect(toast(page)).toContainText('Merged into Lindsey Tran.');
    await expect(names(page)).toHaveText(['Lindsey Tran']);
    await expect(alike).toHaveCount(0);
    const owners = () => page.evaluate(async () => (await (await import('/rounds/data/db.js')).listMoves()).map((l) => l.personId).sort());
    expect(await owners()).toEqual(['l', 'l']);
    // Undo: both back, as they were.
    await undo(page).click();
    await expect(names(page)).toHaveText(['Lindsay Tran', 'Lindsey Tran']);
    expect(await owners()).toEqual(['l', 'n']);
    // Not the same person: the line goes, and stays gone.
    await page.locator('#view .look-alike [data-wave]').click();
    await expect(alike).toHaveCount(0);
    await page.reload();
    await expect(names(page)).toHaveText(['Lindsay Tran', 'Lindsey Tran']);
    await expect(alike).toHaveCount(0);
    expect(problems).toEqual([]);
    await ctx.close();
  });

  test('MERGE WITH... from their menu, and DELETE, which asks first', async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openRounds(browser, testInfo);
    await seed(page, [
      { id: 'd', name: 'Dana Ortiz', instagram: 'danaortiz.studio', due: 6 },
      { id: 's', name: 'Studio O', email: 'hi@studio-o.test', due: 15 },
      { id: 'x', name: 'Max Bell', due: 4 },
    ]);
    await personPage(page, 'Dana Ortiz');
    await menu(page, 'Dana Ortiz', 'Merge with...');
    const w = await opened(page, 'Merge with');
    await expect(w.locator('.pick-row-name')).toHaveText(['Max Bell', 'Studio O']);
    await w.locator('[data-find]').fill('studio-o');
    await expect(w.locator('.pick-row-name')).toHaveText(['Studio O']);
    await w.locator('[data-pick]').click();
    const m = await opened(page, 'Merge into one person');
    await expect(m.locator('[data-keep][aria-pressed="true"] .merge-name')).toHaveText('Dana Ortiz');
    await m.locator('[data-merge]').click();
    await expect(toast(page)).toContainText('Merged into Dana Ortiz.');
    await expect(page.locator('#view .person-name')).toHaveText('Dana Ortiz');
    await people(page);
    await expect(names(page)).toHaveText(['Dana Ortiz', 'Max Bell']);
    // DELETE asks first; then they're gone, and so is the one list of people's record of them.
    const shared = () => page.evaluate(async () => (await window.DFData.peopleAll()).map((p) => p.name).sort());
    await expect.poll(shared, { timeout: 8000 }).toContain('Max Bell');
    await personPage(page, 'Max Bell');
    await menu(page, 'Max Bell', 'Delete');
    const ask = await opened(page, 'Delete Max Bell?');
    await expect(ask.locator('.sheet-message')).toHaveText("This removes them and everything logged with them. It can't be undone.");
    await ask.locator('[data-no]').click();
    await expect(page.locator('#view .person-name')).toHaveText('Max Bell');
    await menu(page, 'Max Bell', 'Delete');
    await (await opened(page, 'Delete Max Bell?')).locator('[data-yes]').click();
    await expect(toast(page)).toContainText('Deleted, with everything logged with them.');
    await expect(names(page)).toHaveText(['Dana Ortiz']);
    await expect.poll(shared).not.toContain('Max Bell');
    expect(problems).toEqual([]);
    await ctx.close();
  });

  test('a move on their page on the shelf opens Rounds at What you said', async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openRounds(browser, testInfo, '/rounds/', eyeShoot);
    await page.click('#view [data-write]');
    const move = await opened(page, 'Jules M.');
    await move.locator('.one-said').fill('Thank you for today!');
    await move.locator('[data-how="text"]').click();
    await move.locator('[data-done]').click();
    await doneNoSheet(page);
    const jules = () => page.evaluate(async () => ((await window.DFData.peopleAll()).find((x) => x.name === 'Jules M.') || {}).id || '');
    await expect.poll(jules, { timeout: 8000 }).not.toBe('');
    await toldShelf(page, 'Jules M.');
    await page.goto(`/?person=${await jules()}`);
    const row = page.locator('.person-page .done-list [data-said]');
    await expect(row.locator('.done-what')).toHaveText('Said thanks · by text');
    await row.click();
    const said = page.locator('.sheet.said-sheet');
    await expect(said.locator('.said-title')).toHaveText('Said thanks to Jules');
    await expect(said.locator('.said-words')).toHaveText('Thank you for today!');
    expect(problems).toEqual([]);
    await ctx.close();
  });
});
