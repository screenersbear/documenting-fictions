// Rounds, Today (rounds/01-today; tightened 16 Nov, rounds/06 and 08):
// people from a shoot in The Eye come in with a thank you due today. One
// card at a time: LATER moves it to tomorrow; WRITE TO opens the one sheet,
// whose COPY AND OPEN copies the message, opens their Instagram and picks
// HOW, and whose DONE saves it all with no second sheet. A swipe only
// flips through the cards (18 Nov: "2 of 2", nothing done); DONE on the
// card opens the one sheet too. DONE TODAY lists the day's done moves to
// undo any later. Going between sections is a plain slide, as in Ref.
import { test, expect } from '@playwright/test';
import { openRounds, eyeShoot, sheet, opened, doneNoSheet, doneRows, doneWhat, doneSaid } from './_rounds.mjs';

const count = (page) => page.locator('#view .today-count');
// The arc's stops, as drawn: 'half' (this one, started), 'ink' (done) or 'open'.
const arcStops = (page) => page.locator('#view .today-arc').evaluate((svg) => [...svg.querySelectorAll(':scope > circle[r="5"], :scope > path[fill="#14BFA0"]')]
  .map((el) => (el.tagName === 'path' ? 'half' : el.getAttribute('fill') === '#313D45' ? 'ink' : 'open')));
// The ink along the arc: where it ends, or '' for none.
const arcInk = (page) => page.locator('#view .today-arc').evaluate((svg) => (svg.querySelector('.arc-ink')?.getAttribute('d') || '').split(' ').slice(-2).join(' '));
// Instagram and the clipboard, stood in for: what was opened and copied.
const standIns = (page) => page.evaluate(() => {
  window.__opened = [];
  window.open = (url) => { window.__opened.push(url); return null; };
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t) => { window.__copied = t; } } });
});
const top = (page) => page.locator('#view .card.top');
const pressed = (s, attr) => s.locator(`[${attr}][aria-pressed="true"]`);
// The top card swiped to the left (dir -1, the next card) or right (1, the one before).
async function swipe(page, dir = -1) {
  const box = await top(page).boundingBox();
  const y = box.y + box.height / 2;
  const x = box.x + box.width / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dir * 20, y + 2, { steps: 2 });
  await page.mouse.move(x + dir * 200, y + 4, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(400); // the card goes, the next comes up
}
// DONE on the card, then DONE on the one sheet it opens.
async function doneOnCard(page, name) {
  await page.click('#view [data-card-done]');
  const move = await opened(page, name);
  await move.locator('[data-done]').click();
  await doneNoSheet(page);
}

test.describe('Rounds: Today', () => {
  test('people from The Eye come in, one card at a time; LATER, then WRITE TO and DONE on one sheet', async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openRounds(browser, testInfo, '/rounds/', eyeShoot);
    // Never an empty arc (progress/NOTES.md): the first stop is started, the line inked to it.
    await expect(count(page)).toHaveText('2 today');
    expect(await arcStops(page)).toEqual(['half', 'open']);
    expect(await arcInk(page)).toBe('16 16');
    await expect(top(page)).toContainText('Jules M.');
    await expect(top(page)).toContainText('Say thanks');
    await expect(page.locator('#view [data-write]')).toHaveText('Write to Jules');
    // LATER: tomorrow, and the next card comes up.
    await page.click('#view [data-later]');
    await expect(count(page)).toHaveText('Last one');
    expect(await arcStops(page)).toEqual(['open', 'half']);
    expect(await arcInk(page)).toBe('64 16');
    await expect(top(page)).toContainText('Maya R.');
    // WRITE TO: the one sheet for Maya, on her thank you.
    await standIns(page);
    await page.click('#view [data-write]');
    const move = await opened(page, 'Maya R.');
    await expect(move.locator('.move-handle')).toHaveText(/^Today, (Mon|Tue|Wed|Thu|Fri|Sat) \d{1,2} [A-Z][a-z]{2}$/);
    await expect(move.locator('.one-label')).toHaveText(['What kind', 'What did you say?', 'How', 'A note for you (optional)']);
    await expect(move.locator('[data-kind]')).toHaveText(['Check in', 'Say thanks', 'Say hello', 'Ask', 'Pitch', 'Other']);
    await expect(pressed(move, 'data-kind')).toHaveText('Say thanks');
    await expect(move.locator('[data-how]')).toHaveText(['Text', 'Instagram', 'Email', 'In person']);
    await expect(pressed(move, 'data-how')).toHaveCount(0);
    await expect(move.locator('.one-note')).toHaveAttribute('placeholder', 'Only you see this');
    // WHAT DID YOU SAY? starts empty, her thank-you offered; with nothing typed, COPY AND OPEN takes that, and HOW is Instagram.
    await expect(move.locator('.one-said')).toHaveValue('');
    await expect(move.locator('[data-offer]')).toHaveText('Use your thank-you message');
    await expect(move.locator('[data-go]')).toHaveText('Copy and open');
    await move.locator('[data-go]').click();
    expect(await move.locator('.one-said').inputValue()).toContain('Maya');
    await expect.poll(() => page.evaluate(() => window.__opened)).toEqual([expect.stringContaining('instagram.com/maya.rr')]);
    const said = await move.locator('.one-said').inputValue();
    expect(await page.evaluate(() => window.__copied)).toBe(said);
    await expect(pressed(move, 'data-how')).toHaveText('Instagram');
    await move.locator('.one-note').fill('Loved the light.');
    await move.locator('[data-done]').click();
    await doneNoSheet(page);
    // The day's done (rounds/13): ALL 2 DONE, the whole arc and every stop in ink (Jules' LATER too), until tomorrow,
    // "That's today." and who's next (Jules, LATER: tomorrow).
    await expect(count(page)).toHaveText('All 2 done');
    expect(await arcStops(page)).toEqual(['ink', 'ink']);
    expect(await arcInk(page)).toBe('74 40');
    await expect(page.locator('#view .today-calm h2')).toHaveText("That's today.");
    await expect(page.locator('#view .today-calm p')).toHaveText('Next up tomorrow: a thank-you to Jules M.');
    // DONE TODAY right there, as the page: the move, how, and what was said.
    await expect(page.locator('#view .done-today-head')).toHaveText('Done today 1');
    await expect(doneWhat(page)).toHaveText(['Said thanks to Maya R. · Instagram']);
    await expect(doneSaid(page)).toHaveText([`"${said}"`]);
    expect(problems).toEqual([]);
    await ctx.close();
  });

  test('UNDO after DONE brings the card back', async ({ browser }, testInfo) => {
    const { ctx, page } = await openRounds(browser, testInfo, '/rounds/', eyeShoot);
    await page.click('#view [data-write]');
    const move = await opened(page, 'Jules M.');
    await move.locator('[data-done]').click();
    await doneNoSheet(page);
    await expect(top(page)).toContainText('Maya R.');
    await expect(page.locator('#toast .toast-action')).toHaveText('Undo');
    await page.click('#toast .toast-action');
    await expect(top(page)).toContainText('Jules M.');
    await ctx.close();
  });

  test('another kind than the card\'s is a move of its own: the card stays, and it counts as keeping in touch', async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openRounds(browser, testInfo, '/rounds/', eyeShoot);
    await top(page).click();
    const move = await opened(page, 'Jules M.');
    await move.locator('[data-kind="other"]').click();
    await expect(pressed(move, 'data-kind')).toHaveText('Other');
    await expect(move.locator('[data-offer]')).toBeHidden(); // Other has no message of its own
    await move.locator('.one-said').fill('Sent the behind the scenes clips.');
    await move.locator('[data-how="text"]').click();
    await move.locator('[data-done]').click();
    await doneNoSheet(page);
    await expect(top(page)).toContainText('Jules M.');
    await expect(count(page)).toHaveText('2 today');
    await expect(doneWhat(page)).toHaveText(['Reached out to Jules M. · text']);
    await expect(doneSaid(page)).toHaveText(['"Sent the behind the scenes clips."']);
    // Tapped: what was said, in full.
    await doneRows(page).first().click();
    const said = await opened(page, 'Other');
    await expect(said.locator('.said-title')).toHaveText('Reached out to Jules');
    await expect(said.locator('.said-words')).toHaveText('Sent the behind the scenes clips.');
    expect(problems).toEqual([]);
    await ctx.close();
  });

  test('swiping only flips through the cards, "2 of 2", and nothing is done; DONE on the card opens the one sheet', async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openRounds(browser, testInfo, '/rounds/', eyeShoot);
    await expect(count(page)).toHaveText('2 today');
    await expect(top(page)).toContainText('Jules M.');
    // Left: the next card, its stop on the arc ringed; the count says where it is.
    await swipe(page, -1);
    await expect(top(page)).toContainText('Maya R.');
    await expect(count(page)).toHaveText('2 of 2');
    expect(await arcStops(page)).toEqual(['open', 'half']);
    await expect(page.locator('#view [data-write]')).toHaveText('Write to Maya');
    // Left again: round to the first, and the usual words come back.
    await swipe(page, -1);
    await expect(top(page)).toContainText('Jules M.');
    await expect(count(page)).toHaveText('2 today');
    // Right: the one before (round to the last).
    await swipe(page, 1);
    await expect(top(page)).toContainText('Maya R.');
    await expect(count(page)).toHaveText('2 of 2');
    // Nothing was marked done.
    await expect(page.locator('#view .done-today')).toHaveCount(0);
    await expect(page.locator('#toast')).not.toContainText('Done.');
    // DONE on Maya's card: the one sheet for her; its DONE does it, and the next card comes up.
    await expect(page.locator('#view [data-card-done]')).toHaveText('Done');
    await doneOnCard(page, 'Maya R.');
    await expect(top(page)).toContainText('Jules M.');
    await expect(count(page)).toHaveText('Last one');
    await expect(doneWhat(page)).toHaveText(['Said thanks to Maya R.']);
    // One card left: a swipe has nothing to flip to, and it stays.
    await swipe(page, -1);
    await expect(top(page)).toContainText('Jules M.');
    await expect(count(page)).toHaveText('Last one');
    expect(problems).toEqual([]);
    await ctx.close();
  });

  test('DONE TODAY on Today lists the moves done, newest first; a row\'s DELETE brings its card back, with Undo', async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openRounds(browser, testInfo, '/rounds/', eyeShoot);
    const head = page.locator('#view .done-today-head');
    await expect(page.locator('#view .done-today')).toHaveCount(0); // nothing done yet: no section
    await expect(page.locator('#view [data-done-today]')).toHaveCount(0); // the old button is gone
    await doneOnCard(page, 'Jules M.');
    await expect(head).toHaveText('Done today 1');
    await expect(top(page)).toContainText('Maya R.');
    await doneOnCard(page, 'Maya R.');
    await expect(page.locator('#view .today-calm h2')).toHaveText("That's today.");
    await expect(head).toHaveText('Done today 2');
    // Long after the toast's Undo has gone.
    await page.reload();
    await expect(doneWhat(page)).toHaveText(['Said thanks to Maya R.', 'Said thanks to Jules M.']);
    await expect(doneSaid(page)).toHaveCount(0); // nothing said
    await expect(doneRows(page).locator('.mini')).toHaveCount(2);
    await doneRows(page).filter({ hasText: 'Jules M.' }).click();
    const s = await opened(page, 'Say thanks');
    await expect(s.locator('.said-title')).toHaveText('Said thanks to Jules');
    await s.locator('[data-delete]').click();
    await expect(page.locator('#toast')).toContainText('Deleted.');
    // Jules is back on Today.
    await expect(count(page)).toHaveText('Last one');
    await expect(top(page)).toContainText('Jules M.');
    await expect(head).toHaveText('Done today 1');
    await expect(doneWhat(page)).toHaveText(['Said thanks to Maya R.']);
    // Undo: done again.
    await page.click('#toast .toast-action');
    await expect(head).toHaveText('Done today 2');
    await expect(count(page)).toHaveText('All 2 done');
    // The last one too: the day is as it was, and stays so.
    for (const name of ['Jules M.', 'Maya R.']) {
      await doneRows(page).filter({ hasText: name }).click();
      await (await opened(page, 'Say thanks')).locator('[data-delete]').click();
      await expect(page.locator('.sheet')).toHaveCount(0);
    }
    await expect(page.locator('#view .done-today')).toHaveCount(0);
    await expect(count(page)).toHaveText('2 today');
    await page.reload();
    await expect(count(page)).toHaveText('2 today');
    await expect(top(page)).toContainText('Jules M.');
    await expect(top(page)).toContainText('Say thanks');
    expect(problems).toEqual([]);
    await ctx.close();
  });

  test('a short drag slides the card back and nothing changes', async ({ browser }, testInfo) => {
    const { ctx, page } = await openRounds(browser, testInfo, '/rounds/', eyeShoot);
    const box = await top(page).boundingBox();
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + 150, y);
    await page.mouse.down();
    await page.mouse.move(box.x + 165, y, { steps: 2 });
    await page.mouse.move(box.x + 190, y, { steps: 2 });
    await page.waitForTimeout(150);
    await page.mouse.up();
    await expect(top(page)).toContainText('Jules M.');
    await expect(count(page)).toHaveText('2 today');
    await ctx.close();
  });

  test('with no one yet it says so, with ADD SOMEONE', async ({ browser }, testInfo) => {
    const { ctx, page } = await openRounds(browser, testInfo);
    await expect(page.locator('#view .today-calm h2')).toHaveText('No one here yet.');
    await page.click('#view .today-calm [data-add]');
    await expect(sheet(page, 'Add someone')).toBeVisible();
    await ctx.close();
  });

  test('a tap on People slides the page over in 240ms, with no page turn', async ({ browser }, testInfo) => {
    const { ctx, page } = await openRounds(browser, testInfo, '/rounds/', eyeShoot);
    await page.click('#navbar .sec-people');
    await page.waitForFunction(() => document.getElementById('frame').getAnimations().length > 0, null, { timeout: 2000 });
    const anim = await page.$eval('#frame', (el) => {
      const a = el.getAnimations()[0];
      return { ms: a.effect.getTiming().duration, ease: a.effect.getTiming().easing, frames: a.effect.getKeyframes().map((k) => k.transform) };
    });
    expect(anim).toEqual({ ms: 240, ease: 'cubic-bezier(0.4, 0, 0.2, 1)', frames: ['translate3d(0px, 0px, 0px)', 'translate3d(-390px, 0px, 0px)'] });
    await expect(page).toHaveURL(/#\/people$/);
    await expect(page.locator('.slide-leaf')).toHaveCount(0, { timeout: 2000 });
    await expect(page.locator('#view .person-card')).toHaveCount(2);
    await ctx.close();
  });
});
