// ONE-TIME (rounds/NOTES.md, Bring in from Callback, 16 Nov): take this out
// with the feature when Starky says the move is done.
// Options, Bring in from Callback: a Callback backup's people and their
// touchpoints, on the same tick list as an import; touchpoints become
// moments (and notes) in SO FAR; anyone Rounds has already gets the
// history, never a second copy, and nothing comes in twice. (How each
// field and type is read is unit tested: tests/unit/rounds/callback-*.)
import { test, expect } from '@playwright/test';
import { openRounds, goTo, opened, options, importCsv, weekdayNow } from './_rounds.mjs';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const dayN = (n) => { const d = weekdayNow(); d.setDate(d.getDate() + n); return d; };
const short = (d) => `${d.getDate()} ${MONTHS[d.getMonth()]}`;
const due = (n) => { const d = dayN(n); if (d.getDay() === 0) d.setDate(d.getDate() + 1); return short(d); };
const iso = (n) => { const d = dayN(n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

const tp = (id, personId, n, type, note, o = {}) => ({ id, personId, date: iso(n), type, note, responded: 'pending', createdAt: `${iso(n)}T15:00:00.000Z`, ...o });
const BACKUP = {
  app: 'callback', version: 1, exportedAt: `${iso(0)}T10:00:00.000Z`,
  data: {
    organizations: [{ id: 'o1', name: 'Acme' }],
    people: [
      { id: 'c1', name: 'June Park', instagram: 'junepark', relationshipTypes: ['collaborator'], warmth: 'warm' },
      { id: 'c2', name: 'Dana Ortiz', instagram: '@dana.o', role: 'Brand marketer', organizationId: 'o1', howWeMet: 'Rialto screening', relationshipTypes: ['pastClient', 'collaborator'], warmth: 'client', nextTouchpointDate: iso(20), notes: 'Prefers email.', createdAt: `${iso(-60)}T09:00:00.000Z` },
      { id: 'c3', name: 'Maya Reyes', relationshipTypes: ['prospect'], warmth: 'parked' },
      { id: 'c4', name: '', relationshipTypes: ['prospect'] },
    ],
    touchpoints: [
      tp('t1', 'c1', -30, 'text', 'Asked about the zine.', { responded: 'yes' }),
      tp('t2', 'c1', -12, 'email', 'Sent rates'),
      tp('t3', 'c2', -20, 'meeting', 'Coffee at Devoción'),
      tp('t4', 'c2', -10, 'project_wrapped', 'Spring lookbook'),
      tp('t5', 'c2', -5, 'gift', 'Sent a print'),
    ],
    news: [], openLoops: [], weeks: [], circles: [], ideas: [], settings: [], tombstones: [],
  },
};

async function bringIn(page, name, text) {
  const s = await options(page);
  await expect(s.locator('[data-callback]')).toContainText('Bring in from Callback');
  await expect(s.locator('[data-callback]')).toContainText('From a Callback backup');
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), s.locator('[data-callback]').click()]);
  await chooser.setFiles({ name, mimeType: 'application/json', buffer: Buffer.from(text) });
}
async function personPage(page, name) {
  if (/#\/person\//.test(page.url())) await page.evaluate(() => { location.hash = '#/people'; });
  else await goTo(page, 'people');
  await page.locator('#view .person-card', { hasText: name }).click();
  await expect(page.locator('#view .person-name')).toHaveText(name);
}
const soFar = (page) => page.locator('#view .so-far-list');

test('a Callback backup: the tick list, new people with their history, June keeps one copy, and nothing comes in twice', async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await openRounds(browser, testInfo);
  await importCsv(page, 'name,group,instagram\nJune Park,regular,@junepark\n');
  const imp = await opened(page, 'Import people');
  await imp.locator('[data-add]').click();
  await expect(imp).toHaveCount(0);

  await bringIn(page, 'callback-backup.json', JSON.stringify(BACKUP));
  const s = await opened(page, 'Bring in from Callback');
  await expect(s.locator('.import-sum')).toHaveText('1 person has no name and is left out.');
  await expect(s.locator('.import-name')).toHaveText(['June Park', 'Dana Ortiz', 'Maya Reyes']);
  await expect(s.locator('.import-from')).toHaveText(['In Rounds already: 2 touchpoints go on their page', '3 touchpoints', 'No touchpoints · Let go']);
  await expect(s.locator('.import-meta').nth(1)).toHaveText('Regular, Client · @dana.o · Brand marketer at Acme');
  await expect(s.locator('[data-add]')).toHaveText('Add 3 people');
  await s.locator('[data-add]').click();
  await expect(s).toHaveCount(0);
  await expect(page.locator('#toast')).toContainText('2 people added. 1 person in Rounds already got their history.');

  // People: one June, Dana, and Maya under Let go (Callback's Parked).
  await goTo(page, 'people');
  await expect(page.locator('#view .person-card', { hasText: 'June Park' })).toHaveCount(1);
  await expect(page.locator('#view .people-gone .person-card-name')).toHaveText(['Maya Reyes']);

  // Dana: the next touchpoint is a Check in, due that day; SO FAR has it all.
  await personPage(page, 'Dana Ortiz');
  await expect(page.locator('#view .person-line')).toHaveText('Regular. Client. Brand marketer at Acme.');
  await expect(page.locator('#view .person-next-what')).toHaveText('Check in');
  await expect(page.locator('#view .person-next-when')).toHaveText(due(20));
  await expect(soFar(page).locator('.so-far-what')).toHaveText(['A moment', 'Note', 'Met up', 'Note']);
  await expect(soFar(page).locator('.so-far-note')).toHaveText(['Gift or card. Sent a print', 'Project wrapped. Spring lookbook', 'Coffee at Devoción', 'Prefers email.']);
  await expect(soFar(page).locator('.so-far-day')).toHaveText([short(dayN(-5)), short(dayN(-10)), short(dayN(-20)), short(dayN(-60))]);

  // June: the history on her, her Check in as it was.
  await personPage(page, 'June Park');
  await expect(page.locator('#view .person-next-when')).toHaveText('Today');
  await expect(soFar(page).locator('.so-far-what')).toHaveText(['Emailed', 'Texted']);
  await expect(soFar(page).locator('.so-far-note')).toHaveText(['Sent rates', 'Asked about the zine. They replied.']);

  // The same file again (from People, where Options is): everyone's in, nothing twice.
  await page.evaluate(() => { location.hash = '#/people'; });
  await expect(page.locator('#view .person-card')).toHaveCount(3);
  await bringIn(page, 'callback-backup.json', JSON.stringify(BACKUP));
  await expect(page.locator('#toast')).toContainText("No one new to bring in. 3 people are in Rounds already and won't be added again. 1 person has no name and is left out.");
  await expect(page.locator('.sheet')).toHaveCount(0);
  await personPage(page, 'June Park');
  await expect(soFar(page).locator('.so-far-what')).toHaveText(['Emailed', 'Texted']);
  expect(problems).toEqual([]);
  await ctx.close();
});

test('a file that isn\'t a Callback backup says so, and nothing changes', async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await openRounds(browser, testInfo);
  const words = "This file isn't a Callback backup. In Callback's Settings, Export backup makes one.";
  await bringIn(page, 'notes.json', '{ not json');
  await expect(page.locator('#toast')).toContainText(words);
  await expect(page.locator('.sheet')).toHaveCount(0);
  await bringIn(page, 'rounds.json', JSON.stringify({ app: 'rounds', data: {} }));
  await expect(page.locator('#toast')).toContainText(words);
  await goTo(page, 'people');
  await expect(page.locator('#view .person-card')).toHaveCount(0);
  expect(problems).toEqual([]);
  await ctx.close();
});
