// Rounds, Today (rounds/01-today; tightened 16 Nov, rounds/06 and 08):
// people from a shoot in The Eye come in with a thank you due today. One
// card at a time: LATER moves it to tomorrow; WRITE TO opens the one sheet,
// whose COPY AND OPEN copies the message, opens their Instagram and picks
// HOW, and whose DONE saves it all with no second sheet. A swipe is done
// too, with ADD WHAT YOU SAID; DONE TODAY lists the day's done moves to
// undo any later. Going between sections is a plain slide, as in Ref.
import { test, expect } from '@playwright/test';
import { openRounds, eyeShoot, sheet, opened, doneNoSheet } from './_rounds.mjs';

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
// The top card swiped away to the right.
async function swipe(page) {
  const box = await top(page).boundingBox();
  const y = box.y + box.height / 2;
  await page.mouse.move(box.x + 120, y);
  await page.mouse.down();
  await page.mouse.move(box.x + 140, y + 2, { steps: 2 });
  await page.mouse.move(box.x + 330, y + 4, { steps: 6 });
  await page.mouse.up();
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
    expect(await page.evaluate(() => window.__copied)).toBe(await move.locator('.one-said').inputValue());
    await expect(pressed(move, 'data-how')).toHaveText('Instagram');
    await move.locator('.one-note').fill('Loved the light.');
    await move.locator('[data-done]').click();
    await doneNoSheet(page);
    await expect(page.locator('#view .today-calm h2')).toHaveText("That's today.");
    await expect(count(page)).toHaveText('2 of 2 today');
    // The day's done: the whole arc and every stop in ink (Jules' LATER too), until tomorrow.
    expect(await arcStops(page)).toEqual(['ink', 'ink']);
    expect(await arcInk(page)).toBe('74 40');
    // Done today has it all, as one line.
    await page.click('#view [data-done-today]');
    const s = await opened(page, 'Done today');
    await expect(s.locator('.choice-detail')).toHaveText(['Say thanks · on Instagram']);
    await expect(s.locator('.done-row-note')).toHaveText(['Loved the light.']);
    await s.locator('[data-close]').click();
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
    await page.click('#view [data-done-today]');
    const s = await opened(page, 'Done today');
    await expect(s.locator('.choice-label')).toHaveText(['Jules M.']);
    await expect(s.locator('.choice-detail')).toHaveText(['Other · by text']);
    // Tapped: what was said, in full.
    await s.locator('[data-said]').click();
    const said = await opened(page, 'Other');
    await expect(said.locator('.said-title')).toHaveText('Reached out to Jules');
    await expect(said.locator('.said-words')).toHaveText('Sent the behind the scenes clips.');
    expect(problems).toEqual([]);
    await ctx.close();
  });

  test('a card swiped away is done, and ADD WHAT YOU SAID opens the one sheet for it', async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openRounds(browser, testInfo, '/rounds/', eyeShoot);
    await swipe(page);
    await expect(page.locator('#toast')).toContainText('Done.');
    await expect(page.locator('.sheet')).toHaveCount(0);
    await expect(top(page)).toContainText('Maya R.');
    await expect(page.locator('#toast .toast-action')).toHaveText('Add what you said');
    await page.click('#toast .toast-action');
    const move = await opened(page, 'Jules M.');
    await expect(move.locator('[data-kind]')).toHaveText(['Say thanks']); // as it was logged
    await move.locator('.one-said').fill('Thank you for today!');
    await move.locator('[data-how="text"]').click();
    await move.locator('[data-done]').click();
    await expect(move).toHaveCount(0);
    await page.click('#view [data-done-today]');
    const s = await opened(page, 'Done today');
    await expect(s.locator('.choice-detail')).toHaveText(['Say thanks · by text']);
    expect(problems).toEqual([]);
    await ctx.close();
  });

  test('DONE TODAY lists the cards swiped away, newest first, and Undo brings each back', async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openRounds(browser, testInfo, '/rounds/', eyeShoot);
    const doneToday = page.locator('#view [data-done-today]');
    await expect(doneToday).toHaveCount(0);
    await swipe(page);
    await expect(doneToday).toHaveText('Done today 1');
    await expect(top(page)).toContainText('Maya R.');
    await swipe(page);
    await expect(page.locator('#view .today-calm h2')).toHaveText("That's today.");
    await expect(doneToday).toHaveText('Done today 2');
    // Long after the toast's Undo has gone.
    await page.reload();
    await page.click('#view [data-done-today]');
    const s = await opened(page, 'Done today');
    await expect(s.locator('.choice-label')).toHaveText(['Maya R.', 'Jules M.']);
    await expect(s.locator('.choice-detail')).toHaveText(['Say thanks', 'Say thanks']);
    await s.locator('.done-row', { hasText: 'Jules M.' }).locator('[data-undo]').click();
    await expect(page.locator('#toast')).toHaveText('Undone.');
    await expect(s.locator('.choice-label')).toHaveText(['Maya R.']);
    // Behind the sheet, Jules is back on Today.
    await expect(count(page)).toHaveText('Last one');
    await expect(top(page)).toContainText('Jules M.');
    await expect(doneToday).toHaveText('Done today 1');
    // The last one: the sheet closes, and the day is as it was.
    await s.locator('[data-undo]').click();
    await expect(s).toHaveCount(0);
    await expect(count(page)).toHaveText('2 today');
    await expect(doneToday).toHaveCount(0);
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
