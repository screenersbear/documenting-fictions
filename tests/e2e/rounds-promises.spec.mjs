// Promises (21 Nov, where Messages was on the section bar): + PROMISE picks
// who it's with, then who promised, what and by when; a tap on one says
// what to do with it (Kept it, Another week, Pick a day, Let it go), each
// with Undo; a person's page lists theirs, and its ... menu adds one. Your
// messages moved into Options. (The lists and the days are unit tested:
// tests/unit/rounds/promises, promise-store.)
import { test, expect } from '@playwright/test';
import { openRounds, goTo, opened, importCsv, weekdayNow, yourMessages } from './_rounds.mjs';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayN = (n) => { const d = weekdayNow(); d.setDate(d.getDate() + n); return d; };
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// June Park, in People.
async function withJune(browser, testInfo) {
  const r = await openRounds(browser, testInfo);
  await importCsv(r.page, 'name,group,instagram\nJune Park,regular,@junepark\n');
  const s = await opened(r.page, 'Import people');
  await s.locator('[data-add]').click();
  await expect(s).toHaveCount(0);
  return r;
}
const rows = (page) => page.locator('#view .prom-row');

test('+ PROMISE: who it is with, then what and by when; Kept it takes it off, Undo puts it back', async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await withJune(browser, testInfo);
  await goTo(page, 'promises');
  await expect(page.locator('#view .band-title')).toHaveText('Promises');
  await expect(page.locator('#view .prom-none')).toBeVisible();
  await page.click('#view [data-add-promise]');
  const who = await opened(page, 'A promise');
  await who.locator('[data-pick]', { hasText: 'June Park' }).click();
  const add = await opened(page, 'A promise with June');
  await expect(add.locator('[data-mine]')).toHaveText(['I promised', 'June promised']);
  await expect(add.locator('[data-save]')).toBeDisabled();
  await add.locator('#promiseWhat').fill('Send the selects');
  await add.locator('#promiseDue').fill(iso(dayN(0)));
  await add.locator('[data-save]').click();
  await expect(page.locator('#toast')).toContainText('Promise added.');
  await expect(page.locator('#view .prom-part h2')).toHaveText(['You promised 1']);
  await expect(rows(page).locator('.prom-what')).toHaveText(['Send the selects']);
  await expect(rows(page).locator('.prom-line')).toHaveText(['June Park · Due today']);
  await rows(page).first().click();
  const act = await opened(page, 'You promised June');
  await expect(act.locator('.choice-label')).toHaveText(['Kept it', 'Another week', 'Pick another day', 'Let it go', "June Park's page"]);
  await act.locator('[data-key="kept"]').click();
  // Kept it opens the one sheet to log it, the promise on top; or just mark it.
  const log = await opened(page, 'June Park');
  await expect(log.locator('.one-keeps-what')).toHaveText('Send the selects');
  await log.locator('[data-keep-only]').click();
  await expect(page.locator('#toast')).toContainText('Marked as kept.');
  await expect(rows(page)).toHaveCount(0);
  await page.click('#toast .toast-action');
  await expect(rows(page).locator('.prom-what')).toHaveText(['Send the selects']);
  // Kept: there after a reload too.
  await page.reload();
  await expect(rows(page)).toHaveCount(1);
  expect(problems).toEqual([]);
  await ctx.close();
});

test('from a person\'s page: their promise to you, listed there and on the tab; Another week moves it on', async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await withJune(browser, testInfo);
  await goTo(page, 'people');
  await page.locator('#view .person-card', { hasText: 'June Park' }).click();
  await expect(page.locator('#view .person-promises')).toHaveCount(0);
  await page.click('#view [data-band-more]');
  const menu = await opened(page, 'June Park');
  await menu.locator('[data-key="promise"]').click();
  const add = await opened(page, 'A promise with June');
  await expect(add.locator('[data-who]')).toHaveCount(0); // on their page already
  await add.locator('[data-mine="no"]').click();
  await add.locator('#promiseWhat').fill('Tag me in the post');
  await add.locator('[data-save]').click();
  await expect(page.locator('#toast')).toContainText("Added to what you're waiting on.");
  const own = page.locator('#view .person-promises .prom-row');
  await expect(own.locator('.prom-what')).toHaveText(['Tag me in the post']);
  await expect(own.locator('.prom-line')).toHaveText(['No day set']);
  await own.click();
  const act = await opened(page, 'June promised');
  await expect(act.locator('.choice-label')).toHaveText(['Got it', 'Another week', 'Pick a day', 'Let it go']);
  await act.locator('[data-key="week"]').click();
  const week = dayN(7);
  await expect(own.locator('.prom-line')).toHaveText([`Expected ${week.getDate()} ${MONTHS[week.getMonth()]}`]);
  await page.click('#view .band-short a[aria-label="Back"]');
  await goTo(page, 'promises');
  await expect(page.locator('#view .prom-part h2')).toHaveText(['They promised 1']);
  await expect(rows(page).locator('.prom-line')).toHaveText([`June Park · Expected ${week.getDate()} ${MONTHS[week.getMonth()]}`]);
  expect(problems).toEqual([]);
  await ctx.close();
});

test('Your messages is in Options, with a way back; the section bar has Promises', async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await openRounds(browser, testInfo);
  await expect(page.locator('#navbar .sec span')).toHaveText(['Today', 'People', 'Promises']);
  await yourMessages(page);
  await expect(page.locator('#navbar')).toBeHidden();
  await expect(page.locator('#view .msg-row').first()).toBeVisible();
  await page.click('#view .band-short a[aria-label="Back"]');
  await expect(page.locator('#navbar .sec-today')).toHaveAttribute('aria-current', 'page');
  expect(problems).toEqual([]);
  await ctx.close();
});

// 21 Nov (Starky: "is there a way to add a promise to a connection you're
// logging? that's the real thing"), as Callback's log sheet: ANYTHING
// PROMISED? on the one sheet, then beside the move on their page with a
// tick, and on its EDIT; KEPT IT can log a connection.
test('a promise made while logging a connection: on the tab, ticked on their page, changed or taken off on its edit', async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await withJune(browser, testInfo);
  await page.click('#view [data-reach]');
  const reach = await opened(page, 'New connection');
  await reach.locator('[data-pick]', { hasText: 'June Park' }).click();
  const log = await opened(page, 'June Park');
  const more = log.locator('[data-prom-more]');
  await expect(more).toBeHidden();
  await log.locator('#onePromise').fill('Send the selects');
  await expect(more).toBeVisible();
  await expect(more.locator('[data-mine]')).toHaveText(['I promised', 'June promised']);
  await log.locator('#onePromiseDue').fill(iso(dayN(3)));
  await log.locator('[data-done]').click();
  await expect(page.locator('#toast')).toContainText('Done, with a promise.');
  await goTo(page, 'promises');
  await expect(rows(page).locator('.prom-what')).toHaveText(['Send the selects']);
  // Beside the move on her page, with its tick.
  await goTo(page, 'people');
  await page.locator('#view .person-card', { hasText: 'June Park' }).click();
  const prom = page.locator('#view .so-far-prom');
  await expect(prom.locator('.so-far-prom-what')).toHaveText('You promised: Send the selects');
  const tick = prom.locator('[data-prom-tick]');
  await expect(tick).toHaveAttribute('aria-checked', 'false');
  await tick.click();
  await expect(page.locator('#toast')).toContainText('Marked as kept.');
  await expect(page.locator('#view [data-prom-tick]')).toHaveAttribute('aria-checked', 'true');
  // Its edit: there, ticked; cleared, it comes off, and Undo puts it back.
  await page.locator('#view button.so-far-row').first().click();
  const said = page.locator('.sheet.said-sheet');
  await expect(said).toBeVisible();
  await page.waitForTimeout(500);
  await expect(said.locator('.said-promise')).toHaveText('You promised: Send the selects · Promise kept');
  await said.locator('[data-edit]').click();
  const edit = await opened(page, 'June Park');
  await expect(edit.locator('#onePromise')).toHaveValue('Send the selects');
  await expect(edit.locator('[data-prom-kept]')).toBeChecked();
  await edit.locator('#onePromise').fill('');
  await edit.locator('[data-done]').click();
  await expect(page.locator('#toast')).toContainText('Promise taken off.');
  await expect(page.locator('#view .so-far-prom')).toHaveCount(0);
  await page.click('#toast .toast-action');
  await expect(page.locator('#view .so-far-prom-what')).toHaveText('You promised: Send the selects');
  expect(problems).toEqual([]);
  await ctx.close();
});

test('KEPT IT, logged: the one sheet with the promise on top closes it', async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await withJune(browser, testInfo);
  await goTo(page, 'people');
  await page.locator('#view .person-card', { hasText: 'June Park' }).click();
  await page.click('#view [data-band-more]');
  await (await opened(page, 'June Park')).locator('[data-key="promise"]').click();
  const add = await opened(page, 'A promise with June');
  await add.locator('#promiseWhat').fill('Print the cover');
  await add.locator('[data-save]').click();
  await goTo(page, 'promises');
  await rows(page).first().click();
  await (await opened(page, 'You promised June')).locator('[data-key="kept"]').click();
  const log = await opened(page, 'June Park');
  await expect(log.locator('.one-keeps-what')).toHaveText('Print the cover');
  await log.locator('[data-done]').click();
  await expect(page.locator('#toast')).toContainText('Done. Marked as kept.');
  await expect(rows(page)).toHaveCount(0);
  await page.click('#toast .toast-action');
  await expect(rows(page).locator('.prom-what')).toHaveText(['Print the cover']);
  expect(problems).toEqual([]);
  await ctx.close();
});
