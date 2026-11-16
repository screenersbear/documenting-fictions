// The person page on the shelf (round 2, connect/08): one person, what each
// notebook has with them, SAME PERSON? when it isn't clear, and ... to change
// their name and handles everywhere. Opened by a name in a notebook
// (?person=<id>), which the shelf doesn't skip past into the last notebook.
import { test, expect } from '@playwright/test';
import { onShelf, seed } from './_people.mjs';
import { openRounds, eyeShoot, goTo } from './_rounds.mjs';

const page = (p) => p.locator('.person-page');
const heads = (p) => page(p).locator('.person-part-head h2');

test('a person page: what each notebook has with them, in loop order, each opening it there', async ({ browser }, testInfo) => {
  const r = await onShelf(browser, testInfo);
  const p = r.page;
  const ids = await seed(p);
  // Last in The Eye: a link to a person still shows the shelf.
  await p.evaluate(() => localStorage.setItem('df-suite-in', 'the-eye'));
  await p.goto(`/?person=${ids.june}`);
  await expect(page(p)).toBeVisible();
  expect(p.url()).not.toContain('person=');
  await expect(page(p).locator('h1')).toHaveText('June Park');
  await expect(page(p).locator('.person-handle')).toHaveText('@junepark.jpg');
  await expect(page(p).locator('.person-handle')).toHaveAttribute('href', 'https://www.instagram.com/junepark.jpg/');
  await expect(page(p).locator('.person-about')).toHaveText('Talent. Regular since August.');
  await expect(heads(p)).toHaveText(['Next', 'Shoots 2', 'Boards 1', "Posts June's in 1"]);
  await expect(page(p).locator('[data-app="rounds"] .person-title')).toHaveText(['Plan the next one']);
  await expect(page(p).locator('[data-app="rounds"] .person-line')).toHaveText(['Check in, due 2 Dec']);
  await expect(page(p).locator('[data-app="the-eye"] .person-title')).toHaveText(['Rooftop portraits', 'Garden test']);
  await expect(page(p).locator('[data-app="ref"] .person-line')).toHaveText(['6 pages · for Rooftop portraits']);
  await expect(page(p).locator('.person-post')).toHaveAttribute('aria-label', 'Rooftop post');
  // A shoot opens in The Eye, at that shoot.
  await page(p).locator('[data-app="the-eye"] .person-row').first().click();
  await expect(p).toHaveURL(/\/the-eye\//);
  expect(r.problems).toEqual([]);
  await r.ctx.close();
});

test('SAME PERSON? asks about the other June Park; the answer is kept', async ({ browser }, testInfo) => {
  const r = await onShelf(browser, testInfo);
  const p = r.page;
  const ids = await seed(p);
  await p.goto(`/?person=${ids.june}`);
  const same = page(p).locator('.person-same');
  await expect(same).toHaveCount(1);
  await expect(same.locator('p')).toHaveText('June Park (@june.other) might be the same person.');
  await same.locator('[data-apart]').click();
  await expect(same).toHaveCount(0);
  await p.goto(`/?person=${ids.june}`);
  await expect(page(p).locator('h1')).toHaveText('June Park');
  await expect(same).toHaveCount(0);
  // Said to be the same: one person, her shoots together.
  await p.evaluate(async () => {
    const D = window.DFData;
    await D.publishThings('the-eye', [{ id: 's4', kind: 'shoot', title: 'Snow', day: '2026-01-01', people: [{ name: 'Ana', instagram: 'a1' }, { name: 'Ana', instagram: 'a2' }] }]);
  });
  const ana = await p.evaluate(async () => (await window.DFData.peopleAll()).filter((x) => x.name === 'Ana').map((x) => x.id));
  await p.goto(`/?person=${ana[0]}`);
  await same.locator('[data-same]').click();
  await expect(same).toHaveCount(0);
  expect(await p.evaluate(async () => (await window.DFData.peopleAll()).filter((x) => x.name === 'Ana').length)).toBe(1);
  await r.ctx.close();
});

test('... changes their name and handles; someone with little shows where things would be', async ({ browser }, testInfo) => {
  const r = await onShelf(browser, testInfo);
  const p = r.page;
  const ids = await seed(p);
  await p.goto(`/?person=${ids.leo}`);
  await expect(page(p).locator('h1')).toHaveText('Leo Grant');
  await expect(page(p).locator('.person-handle')).toHaveCount(0);
  await expect(page(p).locator('.person-none')).toHaveText(['Nothing with Leo yet.', 'Nothing with Leo yet.', 'Nothing with Leo yet.']);
  await page(p).locator('[data-more]').click();
  const sheet = p.locator('.person-edit');
  await expect(sheet).toBeVisible();
  await sheet.locator('[name="name"]').fill('Leo Grant Jr');
  await sheet.locator('[name="instagram"]').fill('@leo.g');
  await sheet.locator('[type="submit"]').click();
  await expect(sheet).toHaveCount(0);
  await expect(page(p).locator('h1')).toHaveText('Leo Grant Jr');
  await expect(page(p).locator('.person-handle')).toHaveText('@leo.g');
  // Nothing typed: not saved.
  await page(p).locator('[data-more]').click();
  for (const k of ['name', 'instagram', 'tiktok']) await sheet.locator(`[name="${k}"]`).fill('');
  await sheet.locator('[type="submit"]').click();
  await expect(sheet).toBeVisible();
  await sheet.locator('[data-close]').click();
  await expect(sheet).toHaveCount(0);
  // Back shuts the page, to the shelf.
  await page(p).locator('[data-back]').click();
  await expect(page(p)).toHaveCount(0);
  // Someone no longer on the list: a word, no page.
  await p.goto('/?person=nobody');
  await expect(p.locator('.toast')).toContainText("That person isn't here any more");
  await expect(page(p)).toHaveCount(0);
  expect(r.problems).toEqual([]);
  await r.ctx.close();
});

test("Rounds' EVERYTHING WITH <NAME> opens their page on the shelf, and back comes back", async ({ browser }, testInfo) => {
  const { ctx, page: p, problems } = await openRounds(browser, testInfo, '/rounds/', eyeShoot);
  // Rounds tells the list who's in it a moment after it opens.
  await expect.poll(() => p.evaluate(async () => (await window.DFData.thingsAll()).filter((t) => t.app === 'rounds').length), { timeout: 8000 }).toBe(2);
  await goTo(p, 'people');
  await p.locator('#view .person-card', { hasText: 'Maya R.' }).click();
  const link = p.locator('#view .person-everything');
  await expect(link).toHaveText('Everything with Maya, in all four');
  await expect(link).toHaveCount(1);
  // At the bottom of her page, under SO FAR (thanks/06).
  await expect(p.locator('#view .scroll > :last-child')).toHaveClass(/person-everything/);
  const next = await p.locator('#view .person-next-what').textContent();
  await link.click();
  await expect(page(p)).toBeVisible();
  await expect(page(p).locator('h1')).toHaveText('Maya R.');
  await expect(page(p).locator('.person-handle')).toHaveText('@maya.rr');
  await expect(page(p).locator('[data-app="rounds"] .person-title')).toHaveText([next]);
  await expect(page(p).locator('[data-app="the-eye"] .person-none')).toHaveText('Nothing with Maya yet.'); // The Eye hasn't been opened since
  await page(p).locator('[data-back]').click();
  await expect(p).toHaveURL(/\/rounds\/#\/person\//);
  await expect(p.locator('#view .person-name')).toHaveText('Maya R.');
  expect(problems).toEqual([]);
  await ctx.close();
});

test('on its own, outside the suite, Rounds has no EVERYTHING WITH', async ({ browser }, testInfo) => {
  const { ctx, page: p } = await openRounds(browser, testInfo, '/rounds/', eyeShoot);
  await expect.poll(() => p.evaluate(async () => (await window.DFData.thingsAll()).length), { timeout: 8000 }).toBe(2);
  await p.evaluate(() => { delete window.DF_SUITE; });
  await goTo(p, 'people');
  await p.locator('#view .person-card', { hasText: 'Maya R.' }).click();
  await expect(p.locator('#view .person-name')).toHaveText('Maya R.');
  await p.waitForTimeout(300);
  await expect(p.locator('#view .person-everything')).toHaveCount(0);
  await ctx.close();
});
