// Rounds, Today (rounds/01-today, 02-move): people from a shoot in The Eye
// come in with a thank you due today. One card at a time: LATER moves it to
// tomorrow, WRITE TO opens the move, whose button copies the message and
// opens their Instagram, and coming back asks "Done?". A swipe is done too,
// with UNDO. Going between sections is a plain slide, as in Ref.
import { test, expect } from '@playwright/test';
import { openRounds, eyeShoot, sheet, opened } from './_rounds.mjs';

const count = (page) => page.locator('#view .today-count');
// Instagram and the clipboard, stood in for: what was opened and copied.
const standIns = (page) => page.evaluate(() => {
  window.__opened = [];
  window.open = (url) => { window.__opened.push(url); return null; };
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t) => { window.__copied = t; } } });
});
const top = (page) => page.locator('#view .card.top');

test.describe('Rounds: Today', () => {
  test('people from The Eye come in, one card at a time; LATER, then WRITE TO and Done', async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openRounds(browser, testInfo, '/rounds/', eyeShoot);
    await expect(count(page)).toHaveText('1 of 2 today');
    await expect(top(page)).toContainText('Jules M.');
    await expect(top(page)).toContainText('Say thanks');
    await expect(page.locator('#view [data-write]')).toHaveText('Write to Jules');
    // LATER: tomorrow, and the next card comes up.
    await page.click('#view [data-later]');
    await expect(count(page)).toHaveText('2 of 2 today');
    await expect(top(page)).toContainText('Maya R.');
    // WRITE TO: the move, filled in for Maya.
    await standIns(page);
    await page.click('#view [data-write]');
    const move = await opened(page, 'Say thanks');
    await expect(move.locator('.move-name')).toHaveText('Maya R.');
    await expect(move.locator('.move-handle')).toHaveText('@maya.rr');
    expect(await move.locator('#moveText').inputValue()).toContain('Maya');
    await expect(move.locator('.move-go')).toContainText('Copy and open Instagram');
    await move.locator('.move-go').click();
    await expect.poll(() => page.evaluate(() => window.__opened)).toEqual([expect.stringContaining('instagram.com/maya.rr')]);
    expect(await page.evaluate(() => window.__copied)).toBe(await move.locator('#moveText').inputValue());
    // Back from Instagram: was it sent?
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await expect(move.locator('.move-ask')).toHaveText('Done?');
    await move.locator('.move-ask-btns [data-done]').click();
    await expect(move).toHaveCount(0);
    await expect(page.locator('#view .today-calm h2')).toHaveText("That's today.");
    await expect(count(page)).toHaveText('2 of 2 today');
    // UNDO brings the card back.
    await expect(page.locator('#toast')).toContainText('Done.');
    await page.click('#toast .toast-action');
    await expect(top(page)).toContainText('Maya R.');
    expect(problems).toEqual([]);
    await ctx.close();
  });

  test('"Not yet" keeps the move open, and the sheet has Done and Later under the button', async ({ browser }, testInfo) => {
    const { ctx, page } = await openRounds(browser, testInfo, '/rounds/', eyeShoot);
    await standIns(page);
    await top(page).click();
    const move = await opened(page, 'Say thanks');
    await move.locator('.move-go').click();
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await move.locator('[data-not-yet]').click();
    await expect(move.locator('.move-go')).toBeVisible();
    // LATER from the sheet: Jules goes to tomorrow.
    await move.locator('.move-more [data-later]').click();
    await expect(move).toHaveCount(0);
    await expect(top(page)).toContainText('Maya R.');
    await ctx.close();
  });

  test('a card swiped away is done, and UNDO puts it back', async ({ browser }, testInfo) => {
    const { ctx, page } = await openRounds(browser, testInfo, '/rounds/', eyeShoot);
    const box = await top(page).boundingBox();
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + 120, y);
    await page.mouse.down();
    await page.mouse.move(box.x + 140, y + 2, { steps: 2 });
    await page.mouse.move(box.x + 330, y + 4, { steps: 6 });
    await page.mouse.up();
    await expect(page.locator('#toast')).toContainText('Done.');
    await expect(top(page)).toContainText('Maya R.');
    await page.click('#toast .toast-action');
    await expect(top(page)).toContainText('Jules M.');
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
    await expect(count(page)).toHaveText('1 of 2 today');
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
