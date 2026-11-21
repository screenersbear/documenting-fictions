// Pitfalls with one person in four notebooks (Starky, 21 Nov: "if you delete
// a person, I don't think it should delete their mood board, even if it was
// attached to them"). June's board in Ref outlives the shoot it went to in
// The Eye, and June herself in Rounds; Delete says so before she goes.
import { test, expect } from '@playwright/test';
import { openRounds, goTo, opened, importCsv } from './_rounds.mjs';

async function personPage(page, name) {
  await goTo(page, 'people');
  await page.locator('#view .person-card', { hasText: name }).first().click();
  await expect(page.locator('#view .person-name')).toHaveText(name);
}
async function menu(page, name, key) {
  await page.click('#view [data-band-more]');
  await (await opened(page, name)).locator(`.choice[data-key="${key}"]`).click();
}
const boards = (page) => page.locator('.board-card .card-name');

test('a mood board stays when its shoot is deleted in The Eye, and when its person is deleted in Rounds', async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await openRounds(browser, testInfo);
  await importCsv(page, 'name,group,instagram\nJune Park,prospect,junepark\n');
  const s = await opened(page, 'Import people');
  await s.locator('[data-add]').click();
  await expect(s).toHaveCount(0);
  await personPage(page, 'June Park');
  await menu(page, 'June Park', 'yes');
  await expect(page.locator('#view .passed-ref-title')).toHaveText('Passed to Ref');
  const [yes] = await page.evaluate(() => window.DFData.linksWhere({ fromApp: 'rounds', type: 'new-client' }));

  // Ref starts her board; it goes to a new shoot in The Eye.
  await page.goto(`/ref/?client=${yes.id}`);
  await expect(page).toHaveURL(/#\/board\/.+$/);
  await page.locator('.tools [data-t="more"]').click();
  await (await opened(page, 'Page 1')).locator('.choice', { hasText: 'Send to shoot' }).click();
  await (await opened(page, 'Send to shoot')).locator('[data-new]').click();
  await expect(page).toHaveURL(/\/the-eye\//);
  await expect(page.locator('#shootTitle')).toHaveValue('June Park');

  // The shoot is deleted in The Eye.
  await page.click('#shootWizardExitBtn');
  await expect(page.locator('#shootWizard')).toBeHidden();
  const shoots = () => page.evaluate(() => (JSON.parse(localStorage.getItem('dailies_state_v1') || '{}').shoots || []).length);
  await expect.poll(shoots).toBe(1);
  // Delete shoot is in the page's More menu (the page's own button stays hidden).
  await page.locator('#shootBandMore').click();
  await expect(page.locator('#shootMoreDeleteBtn')).toBeVisible();
  await page.locator('#shootMoreDeleteBtn').click();
  await expect(page.locator('#appConfirmOverlay')).toBeVisible();
  await page.waitForTimeout(500); // the card ignores a tap in its first moments
  await page.click('#appConfirmOkBtn');
  await expect.poll(shoots).toBe(0);
  // Her board is still in Ref.
  await page.goto('/ref/#/boards');
  await expect(boards(page)).toHaveText(['June Park']);

  // June is deleted in Rounds: Delete says her board stays, and it does.
  await page.goto('/rounds/#/people');
  await personPage(page, 'June Park');
  await menu(page, 'June Park', 'delete');
  const ask = await opened(page, 'Delete June Park?');
  await expect(ask).toContainText('Their mood board in Ref stays.');
  await ask.locator('[data-yes]').click();
  await expect(page.locator('#toast')).toContainText('Deleted');
  await page.goto('/ref/#/boards');
  await expect(boards(page)).toHaveText(['June Park']);
  await boards(page).first().click();
  await expect(page).toHaveURL(/#\/board\/.+$/);
  expect(problems).toEqual([]);
  await ctx.close();
});
