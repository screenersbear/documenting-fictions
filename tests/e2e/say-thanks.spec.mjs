// Thank-yous (round 2, thanks/01-04, 15 Nov; one sheet since 16 Nov,
// rounds/08): a move opened offers your message instead of typing it in;
// HOW and an optional note go with it on the same sheet, in Done today and on their page on the shelf (the latest two,
// since 16 Nov: thanks/06), whose ADD A MOMENT opens Rounds' sheet for it.
// The Eye shows Say thanks FROM ROUNDS on a captured shoot, and <NAME> WROTE
// FIRST marks it done there. (Timing, how, notes and moments are unit
// tested: tests/unit/rounds/plan, done-notes, moments, so-far.)
import { test, expect } from '@playwright/test';
import { openRounds, eyeShoot, opened, useMessage, doneNoSheet } from './_rounds.mjs';

const THANKS = (name) => `Thank you for today, ${name}! It was so good working with you.`;
const doneToday = async (page) => {
  await page.click('#view [data-done-today]');
  return opened(page, 'Done today');
};

test('done with how and a note: in Done today, and the latest on their page on the shelf, whose ADD A MOMENT opens Rounds', async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await openRounds(browser, testInfo, '/rounds/', eyeShoot);
  await expect(page.locator('#view .card.top')).toContainText('Jules M.');
  await page.click('#view [data-write]');
  const move = await opened(page, 'Jules M.');
  await useMessage(move, 'thank-you', THANKS('Jules'));
  // HOW and A NOTE FOR YOU (OPTIONAL) on the same sheet, nothing picked yet (it wasn't sent from here).
  await expect(move.locator('[data-how]')).toHaveText(['Text', 'Instagram', 'Email', 'In person']);
  await expect(move.locator('[data-how].on')).toHaveCount(0);
  await move.locator('[data-how="text"]').click();
  await expect(move.locator('[data-how="text"]')).toHaveAttribute('aria-pressed', 'true');
  await move.locator('.one-note').fill('Loved the light. Wants to shoot again.');
  await move.locator('[data-done]').click();
  await doneNoSheet(page);

  const list = await doneToday(page);
  await expect(list.locator('.choice-label')).toHaveText(['Jules M.']);
  await expect(list.locator('.choice-detail')).toContainText('Say thanks · by text');
  await expect(list.locator('.done-row-note')).toHaveText('Loved the light. Wants to shoot again.');

  // Their page on the shelf (Rounds' EVERYTHING WITH JULES), once the one list
  // of people has them (Rounds tells it a moment after it opens): the latest
  // two, the thanks and the shoot (The Eye's).
  const jules = () => page.evaluate(async () => ((await window.DFData.peopleAll()).find((x) => x.name === 'Jules M.') || {}).id || '');
  await expect.poll(jules, { timeout: 8000 }).not.toBe('');
  await page.goto(`/?person=${await jules()}`);
  const done = page.locator('.person-page .done-list');
  await expect(done.locator('.done-what')).toHaveText(['Said thanks · by text', 'Rooftop portraits']);
  await expect(done.locator('.done-note')).toHaveText(['Loved the light. Wants to shoot again.', 'Shot in The Eye.']);
  // ADD A MOMENT: Rounds opens at Jules with its sheet.
  await page.locator('.person-page [data-add-moment]').click();
  const moment = page.locator('.sheet.moment-sheet');
  await expect(moment.locator('.sheet-header h2')).toHaveText('A moment with Jules');
  await expect(moment.locator('.moment-when-words')).toHaveText(/^Today, /);
  await expect(moment.locator('.moment-keeps-sub')).toHaveText("Jules's next check-in moves out from today.");
  await expect(moment.locator('[data-save]')).toBeDisabled(); // nothing picked yet
  await page.waitForTimeout(500); // taps count once it's been up 450ms (components/sheet.js)
  await moment.locator('[data-what="call"]').click();
  await moment.locator('.moment-note').fill('Booked a portrait session.');
  await moment.locator('[data-save]').click();
  await expect(moment).toHaveCount(0);
  const soFar = page.locator('#view .so-far-list');
  await expect(soFar.locator('.so-far-what')).toHaveText(['Called', 'Said thanks · by text', 'Rooftop portraits']);
  await expect(soFar.locator('.so-far-note').first()).toHaveText('Booked a portrait session.');
  expect(problems).toEqual([]);
  await ctx.close();
});

test('The Eye: Say thanks FROM ROUNDS on the captured shoot, and WROTE FIRST marks it done in Rounds', async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await openRounds(browser, testInfo, '/rounds/', eyeShoot);
  await expect(page.locator('#view .card.top')).toContainText('Jules M.');
  // Each notebook tells the one list of people what it has a moment after it
  // opens: Rounds its people (with the thanks waiting), The Eye its shoots
  // (as when the shoot was captured). Then the shoot, as the shelf opens it.
  const told = (app) => page.evaluate(async (a) => (await window.DFData.thingsAll()).filter((t) => t.app === a).length, app);
  await expect.poll(() => told('rounds'), { timeout: 8000 }).toBe(2);
  await page.goto('/the-eye/');
  await expect.poll(() => told('the-eye'), { timeout: 8000 }).toBe(1);
  await page.goto('/the-eye/?shoot=s1');
  await expect(page.locator('#shootFront')).toBeVisible();
  const cards = page.locator('#shootFrontCards .eye-thanks');
  await expect(cards.locator('.df-slip-title')).toHaveText(['Say thanks to Maya', 'Say thanks to Jules']);
  await expect(cards.locator('.df-slip-when')).toHaveText(['Today', 'Today']); // due the day after the shoot: overdue now
  await expect(cards.locator('.df-slip-line').first()).toHaveText("A text the day after, while it's fresh.");
  await expect(cards.locator('.eye-thanks-open').first()).toHaveText('Open Rounds');
  await cards.first().locator('[data-wrote-first]').click();
  await expect(cards.locator('.df-slip-title')).toHaveText(['Say thanks to Jules']);

  // In Rounds, Maya's thanks is done, with the note.
  await page.goto('/rounds/');
  await expect(page.locator('#view .band')).toBeVisible();
  const list = await doneToday(page);
  await expect(list.locator('.choice-label')).toHaveText(['Maya R.']);
  await expect(list.locator('.done-row-note')).toHaveText('Maya reached out first.');
  expect(problems).toEqual([]);
  await ctx.close();
});
