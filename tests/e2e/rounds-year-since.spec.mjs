// A year since (round 2, connect/12): a year after a shoot in The Eye was
// delivered, its Regulars and Clients get one Rounds card, A YEAR SINCE,
// "A year since <shoot>. Send June one of the finals." Its move shows one of
// the shoot's finals with SHARE THE PHOTO; once it's done, the move they had
// comes back. Once per shoot: opened again, it doesn't come back.
import { test, expect } from '@playwright/test';
import { openRounds, goTo, opened, useMessage, skipNote } from './_rounds.mjs';

// June on three delivered shoots in The Eye (so a Regular), the last of them
// a year ago today; Leo on that one only (New: his card is a plain Check in).
function shootsAYearAgo() {
  if (sessionStorage.getItem('rounds-year-seeded')) return;
  sessionStorage.setItem('rounds-year-seeded', '1');
  const pad = (n) => String(n).padStart(2, '0');
  const ago = (months) => { const d = new Date(); d.setMonth(d.getMonth() - months); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const june = { id: 't1', name: 'June Park', socialHandles: [{ platform: 'instagram', handle: 'junepark.jpg' }] };
  const shoot = (id, title, months, talents) => ({ id, title, status: 'delivered', date: ago(months), talents, teamMembers: [] });
  const shoots = [shoot('s3', 'Studio tests', 14, [june]), shoot('s2', 'Beach day', 13, [june]),
    shoot('s1', 'Rooftop portraits', 12, [june, { id: 't2', name: 'Leo Grant', socialHandles: [{ platform: 'instagram', handle: 'leo.grant' }] }])];
  localStorage.setItem('dailies_state_v1', JSON.stringify({ shoots, projects: [], journalEntries: [] }));
}
// The shoot's finals, as The Eye keeps them.
const finals = (page) => page.evaluate(() => new Promise((ok) => {
  const cv = document.createElement('canvas');
  cv.width = 400; cv.height = 500;
  const x = cv.getContext('2d');
  x.fillStyle = '#C98A57'; x.fillRect(0, 0, 400, 500);
  const req = indexedDB.open('starky-moodboards', 1);
  req.onupgradeneeded = () => req.result.createObjectStore('images');
  req.onsuccess = () => {
    const t = req.result.transaction('images', 'readwrite');
    t.objectStore('images').put([{ src: cv.toDataURL('image/jpeg', 0.8), caption: '' }], 's1__final');
    t.oncomplete = () => { req.result.close(); ok(); };
  };
}));

test("a year after a delivered shoot: A YEAR SINCE for its Regular, with one of the finals to share", async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await openRounds(browser, testInfo, '/rounds/', shootsAYearAgo);
  const card = page.locator('#view .card.top');
  await expect(card.locator('.tag')).toHaveText('A year since');
  await expect(card.locator('.card-name')).toHaveText('June Park');
  await expect(card.locator('.card-why')).toHaveText('A year since Rooftop portraits. Send June one of the finals.');
  await expect(card).toHaveAttribute('aria-label', 'A year since, June Park. Open the move');

  await finals(page);
  await card.click();
  const move = await opened(page, 'A year since');
  await expect(move.locator('.move-final img')).toBeVisible();
  expect(await move.locator('.move-final img').getAttribute('src')).toMatch(/^data:image\/jpeg/);
  await useMessage(move, 'check-in', "Hey June, it's been a minute. Want to plan the next one?");
  // SHARE THE PHOTO: the share sheet on a phone; here, where there's none, a download.
  await page.evaluate(() => Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true }));
  const [download] = await Promise.all([page.waitForEvent('download'), move.locator('[data-share]').click()]);
  // WebKit on Linux (the iPhone tests on GitHub) puts _ for each space in the name.
  expect(download.suggestedFilename().replace(/_/g, ' ')).toBe('Rooftop portraits.jpg');
  await expect(page.locator('#toast')).toContainText('The photo is in your downloads.');
  await move.locator('.move-more [data-done]').click();
  await expect(page.locator('#toast')).toContainText('Done.');
  await skipNote(page, 'June Park');
  // Leo, New, has his Check in from the shoot, not A year since.
  await expect(card.locator('.card-name')).toHaveText('Leo Grant');
  await expect(card.locator('.tag')).toHaveText('Check in');

  // Done: the Check in June had comes back. Opened again, no second card.
  await goTo(page, 'people');
  await page.locator('#view .person-card', { hasText: 'June Park' }).click();
  await expect(page.locator('#view .person-next-what')).toHaveText('Check in');
  await page.evaluate(() => { location.hash = '#/today'; });
  await page.reload();
  await expect(page.locator('#view .band')).toBeVisible();
  await page.waitForTimeout(800);
  await expect(page.locator('#view .tag', { hasText: 'A year since' })).toHaveCount(0);
  expect(problems).toEqual([]);
  await ctx.close();
});

test("a year since with no finals kept: the card and its message, no photo", async ({ browser }, testInfo) => {
  const { ctx, page } = await openRounds(browser, testInfo, '/rounds/', shootsAYearAgo);
  await goTo(page, 'people');
  await page.locator('#view .person-card', { hasText: 'June Park' }).click();
  await expect(page.locator('#view .person-next-what')).toHaveText('A year since');
  await page.locator('#view [data-move]').click();
  const move = await opened(page, 'A year since');
  await useMessage(move, 'check-in', "Hey June, it's been a minute. Want to plan the next one?");
  await page.waitForTimeout(400);
  await expect(move.locator('.move-final')).toBeHidden();
  await ctx.close();
});
