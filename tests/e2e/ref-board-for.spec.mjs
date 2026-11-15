// Ref's New board, WHO IT'S FOR (round 2, connect/11): pick someone from
// the one list of people (or add someone new), and their next-time notes
// from The Eye show and go first on the board. The board goes on their next
// shoot in The Eye by itself; with none yet it waits, and goes on once a
// shoot with them is made (the next time Ref opens).
import { test, expect } from '@playwright/test';
import { freshPage } from './_helpers.mjs';

const june = () => ({ id: 't1', name: 'June Park', socialHandles: [{ platform: 'instagram', handle: 'junepark.jpg' }] });
const shoot = (o) => ({ title: '', category: 'portfolio_building', startTime: '14:00', endTime: '16:30', location: { name: 'Studio', address: '' },
  references: [], frameworkTags: [], moodboardComplete: false, teamRequired: 'no', talents: [june()], teamMembers: [],
  shotList: [], lightingSetups: [], shootingNotes: '', lessonsLearned: '', archived: false, ...o });
const PAST = [
  shoot({ id: 'p1', title: 'Rooftop portraits', status: 'delivered', date: '2026-11-07', lessonsLearned: 'Bring a reflector for the last half hour.' }),
  shoot({ id: 'p2', title: 'Kept one', status: 'delivered', date: '2026-11-10', lessonsLearned: 'Not for Ref.', lessonsToRef: false }),
];
const COMING = shoot({ id: 'w1', title: 'Winter portraits', status: 'planning', date: '2027-01-09' });
const setEye = (page, shoots) => page.evaluate((list) => localStorage.setItem('dailies_state_v1', JSON.stringify({ shoots: list, projects: [], journalEntries: [] })), shoots);

async function openNew(browser, testInfo, shoots) {
  const { ctx, page, problems } = await freshPage(browser, testInfo, '/ref/#/boards', { returning: true });
  await setEye(page, shoots); // at the project's own size: a phone resized after it opens keeps its old page height
  await page.evaluate(() => window.DFData.gatherPeople([{ name: 'June Park', instagram: 'junepark.jpg' }, { name: 'Maya Chen', instagram: 'mayachen' }]));
  await page.goto('/ref/#/new');
  await expect(page.locator('.new-board .guide-title')).toHaveText('Name and page size');
  return { ctx, page, problems };
}
// The sheets ignore taps for their first 450ms (components/sheet.js).
async function whoSheet(page) {
  await page.locator('[data-who]').click();
  const s = page.locator('.who-sheet');
  await expect(s).toBeVisible();
  await page.waitForTimeout(500);
  return s;
}
const boards = (page) => page.evaluate(() => new Promise((ok) => {
  const req = indexedDB.open('ref-notebook');
  req.onsuccess = () => { const g = req.result.transaction('boards').objectStore('boards').getAll(); g.onsuccess = () => { ok(g.result); req.result.close(); }; };
}));
const linksTo = (page, toId) => page.evaluate((id) => window.DFData.linksWhere({ fromApp: 'ref', toApp: 'the-eye', type: 'moodboard', toId: id }), toId);
async function makeIt(page) {
  for (let i = 0; i < 3; i++) await page.locator('[data-next]').click();
  await expect(page).toHaveURL(/#\/board\/.+$/);
}

test.describe("Ref: a board for someone", () => {
  test("picking someone shows their next-time notes; the board starts with them and goes on their next shoot", async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openNew(browser, testInfo, [...PAST, COMING]);
    await expect(page.locator('.who-row .who-name')).toHaveText('Pick someone');
    await expect(page.locator('.who-hint')).toHaveText('Pick someone, or add a new person. The board shows on their next shoot in The Eye.');
    const s = await whoSheet(page);
    await expect(s.locator('.who-pick .send-name')).toHaveText(['June Park', 'Maya Chen']);
    await expect(s.locator('.who-pick .send-line').first()).toHaveText('@junepark.jpg');
    await s.locator('.who-pick', { hasText: 'June Park' }).click();
    await expect(page.locator('.who-row .who-name')).toHaveText('June Park');
    await expect(page.locator('.who-row .who-change')).toHaveText('Change');
    const notes = page.locator('.who-notes');
    await expect(notes.locator('.who-note-head')).toHaveText(['Rooftop portraits, 7 Nov']);
    await expect(notes.locator('.who-note-text')).toHaveText(['Bring a reflector for the last half hour.']);
    await expect(notes.locator('.who-note-foot')).toHaveText('Added to the board as its first page. You can take it off.');
    await page.locator('[data-name]').fill('June, winter set');
    await makeIt(page);
    await expect(page.locator('.toast')).toHaveText('On Winter portraits in The Eye', { timeout: 10000 });
    const [b] = await boards(page);
    expect(b.name).toBe('June, winter set');
    expect(b.pages[0]).toMatchObject({ title: 'Next time', text: 'Bring a reflector for the last half hour. (Rooftop portraits, 7 Nov)', nextTime: true });
    expect(b.pages).toHaveLength(4);
    expect(b.client).toMatchObject({ name: 'June Park', handle: 'junepark.jpg', waiting: false });
    const [l] = await linksTo(page, 'w1');
    expect(l).toMatchObject({ fromId: b.id, name: 'June, winter set', pageCount: 4, pending: false, client: { name: 'June Park', handle: 'junepark.jpg' } });
    expect(problems).toEqual([]);
    await ctx.close();
  });

  test("with no shoot coming, the board waits on them and goes on once a shoot with them is made", async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openNew(browser, testInfo, PAST);
    await (await whoSheet(page)).locator('.who-pick', { hasText: 'June Park' }).click();
    await makeIt(page);
    await expect(page.locator('.toast')).toHaveText("It goes on June's next shoot in The Eye");
    let [b] = await boards(page);
    expect(b.name).toBe('June Park');
    expect(b.client.waiting).toBe(true);
    await page.goto('/ref/#/boards');
    await expect(page.locator('.board-card .flag')).toHaveText(['@junepark.jpg']);
    // A shoot with June is made in The Eye; the next time Ref opens, the board goes on it.
    await setEye(page, [...PAST, COMING]);
    await page.reload();
    await expect.poll(async () => (await linksTo(page, 'w1')).length, { timeout: 10000 }).toBe(1);
    await expect.poll(async () => (await boards(page))[0].client.waiting, { timeout: 5000 }).toBe(false);
    [b] = await boards(page);
    expect(b.updatedAt <= (await linksTo(page, 'w1'))[0].drawnAt).toBe(true);
    expect(problems).toEqual([]);
    await ctx.close();
  });

  test("someone new is added to the list; Not for anyone takes them off again", async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openNew(browser, testInfo, []);
    let s = await whoSheet(page);
    await s.locator('[data-add]').click();
    await s.locator('input[name="name"]').fill('Rosa Diaz');
    await s.locator('input[name="instagram"]').fill('@rosa.d');
    await s.locator('.who-add button[type="submit"]').click();
    await expect(page.locator('.who-row .who-name')).toHaveText('Rosa Diaz');
    await expect(page.locator('.who-notes')).toHaveCount(0);
    expect((await page.evaluate(() => window.DFData.peopleAll())).find((r) => r.name === 'Rosa Diaz')).toMatchObject({ instagram: 'rosa.d' });
    s = await whoSheet(page);
    await s.locator('[data-nobody]').click();
    await expect(page.locator('.who-row .who-name')).toHaveText('Pick someone');
    await makeIt(page);
    const [b] = await boards(page);
    expect(b.name).toBe('Untitled board');
    expect(b.client).toBeUndefined();
    expect(problems).toEqual([]);
    await ctx.close();
  });
});
