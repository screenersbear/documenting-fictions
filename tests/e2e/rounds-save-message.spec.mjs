// Rounds, SAVE THIS AS YOUR <KIND> MESSAGE (rounds/14, 18 Nov): on the one
// sheet, once your message was put in the box and then changed, a line
// under the box with a tick box, off to start. DONE with it ticked saves the
// new words in Messages, the person's name turned back into [name], so the
// next person's starts like this. Not there when the message wasn't used,
// or is back as it was; not ticked, nothing changes in Messages.
import { test, expect } from '@playwright/test';
import { openRounds, eyeShoot, opened, doneNoSheet, goTo } from './_rounds.mjs';

const STARTER = 'Thank you for today, [name]! It was so good working with you.';
const thanks = (page) => page.locator('#view [data-kind="thanks"] .msg-text');

test("a changed thank-you, ticked, is the next one's start, with [name] back in it", async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await openRounds(browser, testInfo, '/rounds/', eyeShoot);
  await page.click('#view [data-write]');
  const move = await opened(page, 'Jules M.');
  const box = move.locator('.one-said');
  const save = move.locator('.save-msg');
  // Typed by hand: no line.
  await box.fill('Hey Jules, thanks!');
  await expect(save).toBeHidden();
  await box.fill('');
  // Your message used: no line until it's changed.
  await move.locator('[data-offer]').click();
  await expect(box).toHaveValue('Thank you for today, Jules! It was so good working with you.');
  await expect(save).toBeHidden();
  await box.fill('Thank you so much for today, Jules! It was so good working with you.');
  await expect(save).toBeVisible();
  await expect(save.locator('.save-msg-title')).toHaveText('Save this as your thank-you message');
  await expect(save.locator('.save-msg-sub')).toHaveText('You changed it. Next time it starts like this.');
  await expect(save.locator('[data-save-msg]')).not.toBeChecked();
  await expect(move.locator('[data-offer]')).toBeHidden();
  // Back as it was: the line goes (and comes back unticked).
  await box.fill('Thank you for today, Jules! It was so good working with you.');
  await expect(save).toBeHidden();
  await box.fill('Thank you so much for today, Jules! It was so good working with you.');
  await expect(save.locator('[data-save-msg]')).not.toBeChecked();
  await save.click();
  await expect(save.locator('[data-save-msg]')).toBeChecked();
  await move.locator('[data-done]').click();
  await doneNoSheet(page);
  // Messages has it, Jules turned back into [name].
  await goTo(page, 'messages');
  await expect(thanks(page)).toHaveText('Thank you so much for today, [name]! It was so good working with you.');
  // And Maya's starts like this.
  await goTo(page, 'today');
  await page.click('#view [data-write]');
  const next = await opened(page, 'Maya R.');
  await next.locator('[data-offer]').click();
  await expect(next.locator('.one-said')).toHaveValue('Thank you so much for today, Maya! It was so good working with you.');
  expect(problems).toEqual([]);
  await ctx.close();
});

test('changed but not ticked, Messages stays as it was', async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await openRounds(browser, testInfo, '/rounds/', eyeShoot);
  await page.click('#view [data-write]');
  const move = await opened(page, 'Jules M.');
  await move.locator('[data-offer]').click();
  await move.locator('.one-said').fill('Thanks Jules!');
  await expect(move.locator('.save-msg')).toBeVisible();
  await move.locator('[data-done]').click();
  await doneNoSheet(page);
  await goTo(page, 'messages');
  await expect(thanks(page)).toHaveText(STARTER);
  expect(problems).toEqual([]);
  await ctx.close();
});
