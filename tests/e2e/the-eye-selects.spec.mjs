// Waiting on selects never drops out of sight (round 2, selects/NOTES.md,
// 16 Nov): after 3 days the Today card asks (GOT THEM / REMIND JUNE / STILL
// WAITING), the shoot's status card says how long with the same buttons, and
// REMIND opens a sheet like a Rounds move. Done logs it on the shoot and, in
// the suite, as a moment with them in Rounds. A shoot already waiting when
// this came in counts from then. (The days, names and words are unit tested:
// tests/unit/the-eye/selects-wait.test.mjs, today-items.test.mjs.)
import { test, expect } from '@playwright/test';
import { freshPage } from './_helpers.mjs';
import { openRounds, weekdayNow } from './_rounds.mjs';

const STARTER = "Hi June! Just checking you got the proofs from Rooftop portraits. No rush, send your picks whenever you're ready.";

// Rooftop portraits waiting 4 days on June's selects (she booked it), the
// garden 1 day, and one waiting from before the date was kept.
// (Set once for the tab: the first load, before this, saved an empty notebook.)
function seed() {
  if (sessionStorage.getItem('eye-selects-seeded')) return;
  sessionStorage.setItem('eye-selects-seeded', '1');
  const ago = (n) => new Date(Date.now() - n * 86400000).toISOString();
  const day = (n) => ago(n).slice(0, 10);
  const shoot = (o) => ({ title: '', category: 'portfolio_building', startTime: '10:00', endTime: '12:00', location: { name: 'Studio', address: '' },
    references: [], frameworkTags: [], moodboardComplete: true, teamRequired: 'no', teamMembers: [], shotList: [], lightingSetups: [],
    shootingNotes: '', lessonsLearned: '', archived: false, status: 'waiting_for_selects', capturedAt: ago(9), ...o });
  const june = { id: 'tj', name: 'June Park', bookedMe: true, socialHandles: [{ platform: 'instagram', handle: 'junepark.jpg' }] };
  const shoots = [
    shoot({ id: 's1', title: 'Rooftop portraits', date: day(9), proofsSentAt: ago(4), talents: [{ id: 'ta', name: 'Ana Ruiz', socialHandles: [] }, june] }),
    shoot({ id: 's2', title: 'Garden', date: day(5), proofsSentAt: ago(1), talents: [{ id: 'tl', name: 'Leo Grant', socialHandles: [] }] }),
    shoot({ id: 's3', title: 'Old wait', date: day(30), talents: [{ id: 'ti', name: 'Ivy Chen', socialHandles: [] }] }),
  ];
  localStorage.setItem('dailies_state_v1', JSON.stringify({ shoots, projects: [], journalEntries: [] }));
}

// Copying and opening Instagram, kept for the test to read.
function standIns() {
  window.__copied = [];
  window.__opened = [];
  try { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (t) => { window.__copied.push(t); } } }); } catch { /* no clipboard */ }
  window.open = (url) => { window.__opened.push(url); return null; };
}

async function openEye(browser, testInfo, path = '/the-eye/') {
  const { ctx, page, problems } = await freshPage(browser, testInfo, '/the-eye/', { returning: true });
  await ctx.addInitScript(seed);
  await ctx.addInitScript(standIns);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(path);
  await page.waitForLoadState('networkidle').catch(() => {});
  return { ctx, page, problems };
}

const saved = (page, id) => page.evaluate((s) => JSON.parse(localStorage.getItem('dailies_state_v1')).shoots.find((x) => x.id === s), id);
const dayStr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = (n = 0) => { const d = new Date(); d.setDate(d.getDate() + n); return dayStr(d); };
// openRounds moves the page's date on to Monday on a Sunday (Rounds' day off): the day the page counts as today.
const roundsToday = () => dayStr(weekdayNow());
const selectsItem = (page) => page.locator('#todayCardItems .today-item', { hasText: 'Still waiting on' });

test('the Today card asks after 3 days; STILL WAITING asks again in 3; an older wait counts from now', async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await openEye(browser, testInfo);
  const item = selectsItem(page);
  await expect(item).toHaveCount(1);
  await expect(item.locator('p')).toHaveText("Still waiting on June's selects for Rooftop portraits. 4 days so far.");
  await expect(item.locator('button')).toHaveText(['Got them', 'Remind June', 'Still waiting']);
  await expect(item.locator('button').first()).toHaveCSS('text-transform', 'uppercase');
  // Waiting since before this came in: from today, saved.
  expect((await saved(page, 's3')).proofsSentAt.slice(0, 10)).toBe(new Date().toISOString().slice(0, 10));
  await item.locator('[data-act="still-waiting"]').click();
  await expect(selectsItem(page)).toHaveCount(0);
  expect((await saved(page, 's1')).selectsAskAfter).toBe(today(3));
  expect((await saved(page, 's1')).status).toBe('waiting_for_selects');
  expect(problems).toEqual([]);
  await ctx.close();
});

test('GOT THEM moves it to Editing and asks for a deadline, as the status change does', async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await openEye(browser, testInfo);
  await selectsItem(page).locator('[data-act="got-selects"]').click();
  await expect(page.locator('#deadlinePromptOverlay')).toBeVisible();
  await expect(selectsItem(page)).toHaveCount(0);
  const s1 = await saved(page, 's1');
  expect(s1.status).toBe('editing');
  expect(s1.editingAt).toBeTruthy();
  expect(problems).toEqual([]);
  await ctx.close();
});

test("the shoot's status card says how long, with GOT THEM and REMIND JUNE", async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await openEye(browser, testInfo, '/the-eye/?shoot=s1');
  await expect(page.locator('#shootFront')).toBeVisible();
  await expect(page.locator('#shootStatusTagText')).toHaveText('Waiting for selects');
  await expect(page.locator('#shootStatusCount')).toHaveText('2 to go');
  await expect(page.locator('#shootStatusEnds')).toBeHidden();
  await expect(page.locator('#shootStatusWait')).toHaveText('Proofs sent to June 4 days ago.');
  await expect(page.locator('#shootStatusMore button')).toHaveText(['Got them', 'Remind June']);
  await page.locator('#shootGotSelectsBtn').click();
  await expect(page.locator('#shootStatusTagText')).toHaveText('Editing');
  await expect(page.locator('#shootStatusMore')).toBeHidden();
  await expect(page.locator('#shootStatusEnds')).toBeVisible();
  await expect.poll(async () => (await saved(page, 's1')).status).toBe('editing');
  expect(problems).toEqual([]);
  await ctx.close();
});

test('REMIND: the reminder offered, copied, Instagram opened; back, Done logs it on the shoot', async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await openEye(browser, testInfo);
  // Your own words for it, from Options.
  await page.click('#appMenuBtn');
  await page.click('#selectsReminderBtn');
  const words = page.locator('#selectsReminderText');
  await expect(words).toHaveValue("Hi [name]! Just checking you got the proofs from [shoot]. No rush, send your picks whenever you're ready.");
  await words.fill('Hey [name], any picks from [shoot] yet?');
  await page.click('#selectsReminderSaveBtn');
  await expect(page.locator('#appMenuOverlay')).toBeVisible();
  await page.click('#appMenuCancelBtn');

  await selectsItem(page).locator('[data-act="remind-selects"]').click();
  const sheet = page.locator('#remindSelectsOverlay');
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('h2')).toHaveText('Remind June');
  await expect(sheet.locator('#remindSelectsText')).toHaveValue('');
  await expect(sheet.locator('#remindSelectsOfferText')).toHaveText('Hey June, any picks from Rooftop portraits yet?');
  await expect(sheet.locator('#remindSelectsNote')).toHaveText('Asks again in 3 days if nothing comes.'); // June isn't in Rounds
  await sheet.locator('#remindSelectsOffer').click();
  await expect(sheet.locator('#remindSelectsOffer')).toBeHidden();
  await sheet.locator('#remindSelectsText').fill('Hey June, any picks from Rooftop portraits yet? No rush!');
  await sheet.locator('[data-go]').click();
  await expect.poll(() => page.evaluate(() => window.__opened)).toEqual(['https://www.instagram.com/junepark.jpg/']);
  expect(await page.evaluate(() => window.__copied)).toEqual(['Hey June, any picks from Rooftop portraits yet? No rush!']);
  // Back from Instagram: Done?
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(sheet.locator('.remind-ask')).toHaveText('Done?');
  await sheet.locator('.remind-ask-btns [data-done]').click();
  await expect(sheet).toBeHidden();
  await expect(selectsItem(page)).toHaveCount(0);
  const s1 = await saved(page, 's1');
  expect(s1.selectsReminders).toEqual([{ day: today(), to: 'June', how: 'instagram', said: 'Hey June, any picks from Rooftop portraits yet? No rush!' }]);
  expect(s1.selectsAskAfter).toBe(today(3));
  // On the shoot's status card too.
  await page.goto('/the-eye/?shoot=s1');
  await expect(page.locator('#shootStatusWait')).toContainText('Proofs sent to June 4 days ago. Reminded June, ');
  expect(problems).toEqual([]);
  await ctx.close();
});

test('in the suite, the reminder is a moment with June in Rounds, Messaged on Instagram, with what was said', async ({ browser }, testInfo) => {
  // Rounds first, so June comes in from The Eye's shoot.
  const { ctx, page, problems } = await openRounds(browser, testInfo, '/rounds/', seed);
  await ctx.addInitScript(standIns);
  const told = (app) => page.evaluate(async (a) => (await window.DFData.thingsAll()).filter((t) => t.app === a).length, app);
  await expect.poll(() => told('rounds'), { timeout: 8000 }).toBeGreaterThan(0);
  await page.goto('/the-eye/');
  await selectsItem(page).locator('[data-act="remind-selects"]').click();
  const sheet = page.locator('#remindSelectsOverlay');
  await expect(sheet.locator('#remindSelectsNote')).toHaveText('Counts as a moment with June in Rounds. Asks again in 3 days if nothing comes.');
  await sheet.locator('[data-go]').click(); // nothing typed: the reminder goes
  await expect(sheet.locator('#remindSelectsText')).toHaveValue(STARTER);
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await sheet.locator('.remind-ask-btns [data-done]').click();
  await expect(sheet).toBeHidden();
  const asked = () => page.evaluate(async () => (await window.DFData.roundsAsks()).map((l) => l.ask));
  await expect.poll(asked).toEqual([expect.objectContaining({ do: 'moment', what: 'instagram', keeps: true, note: STARTER, day: roundsToday() })]);

  // Rounds takes it as it opens; June's page on the shelf has it, the latest.
  await page.goto('/rounds/');
  await expect(page.locator('#view .band')).toBeVisible();
  await expect.poll(async () => (await page.evaluate(async () => window.DFData.roundsAsks())).length).toBe(0);
  const juneId = await page.evaluate(async () => ((await window.DFData.peopleAll()).find((x) => x.name === 'June Park') || {}).id || '');
  // Rounds tells the one list a moment after it opens.
  const hows = () => page.evaluate(async (id) => (((await window.DFData.personView(id)) || {}).rounds?.more?.done || []).map((r) => r.how), juneId);
  await expect.poll(hows, { timeout: 8000 }).toContain('instagram');
  await page.goto(`/?person=${juneId}`);
  const done = page.locator('.person-page .done-list');
  await expect(done.locator('.done-what').first()).toHaveText('Messaged on Instagram');
  await expect(done.locator('.done-note').first()).toHaveText(STARTER);
  expect(problems).toEqual([]);
  await ctx.close();
});
