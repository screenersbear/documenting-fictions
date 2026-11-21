// One person through the notebooks (refining round, 21 Nov): June is met in
// Rounds, says yes, gets a mood board in Ref, the board goes to a new shoot
// in The Eye with her as talent; renamed in Rounds, her board and her talent
// follow. Merged or deleted in Rounds, her yes to Ref goes with her.
import { test, expect } from '@playwright/test';
import { openRounds, goTo, opened, importCsv } from './_rounds.mjs';

async function addPeople(page, csv) {
  await importCsv(page, csv);
  const s = await opened(page, 'Import people');
  await s.locator('[data-add]').click();
  await expect(s).toHaveCount(0);
}
async function personPage(page, name) {
  if (/#\/person\//.test(page.url())) await page.evaluate(() => { location.hash = '#/people'; });
  else await goTo(page, 'people');
  await page.locator('#view .person-card', { hasText: name }).first().click();
  await expect(page.locator('#view .person-name')).toHaveText(name);
}
async function menu(page, name, key) {
  await page.click('#view [data-band-more]');
  const m = await opened(page, name);
  await m.locator(`.choice[data-key="${key}"]`).click();
}
async function rename(page, name, to, handle) {
  await menu(page, name, 'edit');
  const s = await opened(page, 'Edit');
  await s.locator('input[name="name"]').fill(to);
  await s.locator('input[name="instagram"]').fill(handle);
  await s.locator('button[type="submit"]').click();
  await expect(s).toHaveCount(0);
  await expect(page.locator('#view .person-name')).toHaveText(to);
}
const yesLinks = (page) => page.evaluate(() => window.DFData.linksWhere({ fromApp: 'rounds', type: 'new-client' }));
const listed = (page, instagram) => page.evaluate(async (h) => {
  const r = (await window.DFData.peopleAll()).find((x) => x.instagram === h);
  return r ? r.name : null;
}, instagram);
const talents = (page) => page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('dailies_state_v1') || '{}');
  return (s.shoots || []).flatMap((x) => (x.talents || []).map((t) => [t.name, (t.socialHandles || []).map((h) => h.handle).join(',')]));
});
const toast = (page) => page.locator('#toast');

test.describe('One person through the notebooks', () => {
  test('June: met in Rounds, a board in Ref, a shoot in The Eye; renamed, all three follow', async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openRounds(browser, testInfo);
    await addPeople(page, 'name,group,instagram\nJune Park,prospect,@junepark.jpg\n');
    await personPage(page, 'June Park');
    await menu(page, 'June Park', 'yes');
    await expect(page.locator('#view .passed-ref-title')).toHaveText('Passed to Ref');
    // The one list of people has her before she's renamed.
    await expect.poll(() => listed(page, 'junepark.jpg'), { timeout: 8000 }).toBe('June Park');

    // Renamed in Rounds before Ref has a board: the offer says the new name.
    await rename(page, 'June Park', 'June Ortiz', 'june.ortiz');
    await expect.poll(async () => (await yesLinks(page)).map((l) => [l.name, l.handle])).toEqual([['June Ortiz', 'june.ortiz']]);
    await expect.poll(() => listed(page, 'june.ortiz')).toBe('June Ortiz');
    const [yes] = await yesLinks(page);

    // Ref: OPEN starts her board, named for her; no welcome over it.
    await page.goto(`/ref/?client=${yes.id}`);
    await expect(page).toHaveURL(/#\/board\/.+$/);
    await expect(page.locator('.sheet')).toHaveCount(0);
    // Send to shoot, from inside the board: a new shoot in The Eye.
    await page.locator('.tools [data-t="more"]').click();
    await (await opened(page, 'Page 1')).locator('.choice', { hasText: 'Send to shoot' }).click();
    await (await opened(page, 'Send to shoot')).locator('[data-new]').click();
    await expect(page).toHaveURL(/\/the-eye\//);
    await expect(page.locator('#shootTitle')).toHaveValue('June Ortiz');
    await expect(page.locator('#talentsList')).toContainText('June Ortiz');
    await expect.poll(() => talents(page)).toEqual([['June Ortiz', 'june.ortiz']]);

    // Renamed again in Rounds, now that Ref and The Eye have her.
    await page.goto('/rounds/#/people');
    await personPage(page, 'June Ortiz');
    await rename(page, 'June Ortiz', 'June Park-Ortiz', 'junepo');
    await expect.poll(() => listed(page, 'junepo')).toBe('June Park-Ortiz');
    // Ref's board takes her new name and handle.
    await page.goto('/ref/#/boards');
    const card = page.locator('.board-card').first();
    await expect(card.locator('.card-name')).toHaveText('June Park-Ortiz', { timeout: 8000 });
    await expect(card.locator('.flag')).toHaveText('@junepo');
    // The Eye's talent too.
    await page.goto('/the-eye/');
    await expect.poll(() => talents(page), { timeout: 8000 }).toEqual([['June Park-Ortiz', 'junepo']]);
    expect(problems).toEqual([]);
    await ctx.close();
  });

  test("merged in Rounds, her yes to Ref goes to the one kept (Undo gives it back); deleted, it's taken back", async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openRounds(browser, testInfo);
    await addPeople(page, 'name,group,instagram\nJune Park,prospect,junepark.jpg\nJ. Park,new,\nSam Lee,prospect,samlee\n');
    await personPage(page, 'June Park');
    await menu(page, 'June Park', 'yes');
    const [yes] = await yesLinks(page);
    // J. Park, the same person, merged in, keeping J. Park.
    await personPage(page, 'J. Park');
    await menu(page, 'J. Park', 'merge');
    const w = await opened(page, 'Merge with');
    await w.locator('[data-find]').fill('june');
    await w.locator('[data-pick]').first().click();
    const m = await opened(page, 'Merge into one person');
    await expect(m.locator('[data-keep][aria-pressed="true"] .merge-name')).toHaveText('J. Park');
    await m.locator('[data-merge]').click();
    await expect(toast(page)).toContainText('Merged into J. Park.');
    await expect.poll(async () => (await yesLinks(page)).map((l) => [l.id, l.name, l.handle])).toEqual([[yes.id, 'J. Park', 'junepark.jpg']]);
    await expect(page.locator('#view .passed-ref-open')).toHaveAttribute('href', `../ref/?client=${yes.id}`);
    // Undo: June has her yes again.
    await toast(page).locator('.toast-action').click();
    await expect.poll(async () => (await yesLinks(page)).map((l) => [l.id, l.name])).toEqual([[yes.id, 'June Park']]);
    // Sam says yes, then is deleted before Ref starts a board: the offer goes.
    await personPage(page, 'Sam Lee');
    await menu(page, 'Sam Lee', 'yes');
    await expect.poll(async () => (await yesLinks(page)).length).toBe(2);
    await menu(page, 'Sam Lee', 'delete');
    await (await opened(page, 'Delete Sam Lee?')).locator('[data-yes]').click();
    await expect(toast(page)).toContainText('Deleted');
    await expect.poll(async () => (await yesLinks(page)).map((l) => l.name)).toEqual(['June Park']);
    // Ref offers June's board only.
    await page.goto('/ref/#/boards');
    await expect(page.locator('.df-slip .df-slip-title')).toHaveText('June Park said yes');
    expect(problems).toEqual([]);
    await ctx.close();
  });
});
