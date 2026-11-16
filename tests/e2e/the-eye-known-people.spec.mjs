// Someone you know (people/NOTES.md, 15 Nov): the talent popup's picker lists
// everyone, talent and team, from The Eye's shoots and the one list of
// people, newest first, with a short label. Typing a name suggests them (the
// team member popup too), and picking fills the popup. Booked me, in the
// suite: on for a headshot, off for portfolio building, saved per person.
// (Rounds' side, Client for whoever booked you, is unit tested:
// tests/unit/rounds/groups.test.mjs.)
import { test, expect } from '@playwright/test';
import { freshPage } from './_helpers.mjs';

function seed() {
  if (sessionStorage.getItem('eye-known-seeded')) return;
  sessionStorage.setItem('eye-known-seeded', '1');
  const june = () => ({ id: `t${Math.random()}`, name: 'June Park', socialHandles: [{ platform: 'instagram', handle: 'junepark.jpg' }] });
  const iryna = { role: 'makeup_artist', name: 'Iryna V.', socialPlatform: 'instagram', socialHandle: 'iryna.hmua' };
  const shoot = (o) => ({ title: '', category: 'portfolio_building', startTime: '14:00', endTime: '16:30', location: { name: 'Studio', address: '' },
    references: [], frameworkTags: [], moodboardComplete: false, teamRequired: 'yes', talents: [june()], teamMembers: [],
    shotList: [], lightingSetups: [], shootingNotes: '', lessonsLearned: '', archived: false, ...o });
  // Planned far ahead and delivered long ago, so the one list's person (last
  // seen today) always sits between them.
  const shoots = [
    shoot({ id: 'w1', title: 'Headshots', category: 'headshot', status: 'planning', date: '2030-02-01' }),
    shoot({ id: 'w2', title: 'Portfolio day', status: 'planning', date: '2030-01-09', teamMembers: [{ role: 'hair_stylist', name: 'Jo', socialPlatform: 'instagram', socialHandle: '' }] }),
    shoot({ id: 'p1', title: 'Rooftop', status: 'delivered', date: '2020-11-07', teamMembers: [{ ...iryna }] }),
    shoot({ id: 'p0', title: 'Garden', status: 'delivered', date: '2020-08-12', talents: [{ id: 'a1', name: 'Ana Ruiz', socialHandles: [] }], teamMembers: [{ ...iryna }] }),
  ];
  localStorage.setItem('dailies_state_v1', JSON.stringify({ shoots, projects: [], journalEntries: [] }));
}

// The Eye at phone size, with Lindsey in the one list (from Rounds) and no
// shoots with her here, then the shoot as the shelf opens it.
async function openShoot(browser, testInfo, id) {
  const { ctx, page, problems } = await freshPage(browser, testInfo, '/the-eye/', { returning: true });
  await ctx.addInitScript(seed);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.evaluate(() => window.DFData.publishThings('rounds', [{ id: 'r1', kind: 'person', title: 'Lindsey Tran',
    people: [{ name: 'Lindsey Tran', instagram: 'lindsey.t', roundsId: 'r1', at: '' }] }]));
  await expect.poll(() => page.evaluate(async () => (await window.DFData.peopleAll()).some((p) => p.name === 'Lindsey Tran')), { timeout: 8000 }).toBe(true);
  await page.goto(`/the-eye/?shoot=${id}`);
  await expect(page.locator('#shootFront')).toBeVisible();
  return { ctx, page, problems };
}

// A new talent, from Basic info.
async function addTalent(page) {
  await page.locator('#shootFrontCards [data-page="basicInfoHeading"]').first().click();
  await page.locator('#addTalentBtn').click();
  const popup = page.locator('#talentModalOverlay');
  await expect(popup).toBeVisible();
  return popup;
}

const savedTalents = (page, id) => page.evaluate((s) => JSON.parse(localStorage.getItem('dailies_state_v1')).shoots.find((x) => x.id === s).talents
  .map((t) => ({ name: t.name, bookedMe: t.bookedMe, handles: t.socialHandles.map((h) => h.handle) })), id);

test('the talent picker lists everyone you know; typing suggests them; Booked me is on for a headshot', async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await openShoot(browser, testInfo, 'w1');
  const popup = await addTalent(page);
  await expect(popup.locator('label', { hasText: 'Someone you know' })).toBeVisible();
  await expect(popup.locator('#pastTalentsSelect option')).toHaveText([
    'Pick someone you know…',
    'June Park · talent, 3 shoots',
    'Jo · team, 1 shoot',
    'Lindsey Tran',
    'Iryna V. · team, 2 shoots',
    'Ana Ruiz · talent, 1 shoot',
    'Edit saved talent…',
  ]);
  await expect(popup.locator('#talentBookedRow')).toBeVisible();
  await expect(popup.locator('#talentBookedRow')).toContainText("They're the paying client.");
  await expect(popup.locator('#talentBookedSwitch')).toHaveAttribute('aria-checked', 'true');

  // As you type: first name, last name or handle.
  const name = popup.locator('#talentModalNameInput');
  const rows = popup.locator('.name-suggest-row');
  await name.pressSequentially('par');
  await expect(rows.locator('.name-suggest-name')).toHaveText(['June Park']);
  await name.fill('');
  await name.pressSequentially('iry');
  await expect(rows.locator('.name-suggest-name')).toHaveText(['Iryna V.']);
  await expect(rows.locator('.name-suggest-label')).toHaveText(['team, 2 shoots']);
  await rows.first().click();
  await expect(rows).toHaveCount(0);
  await expect(name).toHaveValue('Iryna V.');
  await expect(popup.locator('.social-handle-input')).toHaveCount(1);
  await expect(popup.locator('.social-handle-input')).toHaveValue('iryna.hmua');
  await popup.locator('#saveTalentModalBtn').click();
  await expect(popup).toBeHidden();
  await expect.poll(() => savedTalents(page, 'w1')).toEqual([
    { name: 'June Park', bookedMe: undefined, handles: ['junepark.jpg'] },
    { name: 'Iryna V.', bookedMe: true, handles: ['iryna.hmua'] },
  ]);
  expect(problems).toEqual([]);
  await ctx.close();
});

test("Booked me is off for portfolio building and can be turned on; someone only in the one list is suggested", async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await openShoot(browser, testInfo, 'w2');
  const popup = await addTalent(page);
  await expect(popup.locator('#talentBookedSwitch')).toHaveAttribute('aria-checked', 'false');
  await popup.locator('#talentModalNameInput').pressSequentially('@lind');
  const rows = popup.locator('.name-suggest-row');
  await expect(rows.locator('.name-suggest-name')).toHaveText(['Lindsey Tran']);
  await expect(rows.locator('.name-suggest-label')).toHaveCount(0); // no shoots here yet
  await rows.first().click();
  await expect(popup.locator('#talentModalNameInput')).toHaveValue('Lindsey Tran');
  await expect(popup.locator('.social-handle-input')).toHaveCount(1);
  await expect(popup.locator('.social-handle-input')).toHaveValue('lindsey.t');
  await popup.locator('#talentBookedSwitch').click();
  await expect(popup.locator('#talentBookedSwitch')).toHaveAttribute('aria-checked', 'true');
  await popup.locator('#saveTalentModalBtn').click();
  await expect.poll(() => savedTalents(page, 'w2')).toEqual([
    { name: 'June Park', bookedMe: undefined, handles: ['junepark.jpg'] },
    { name: 'Lindsey Tran', bookedMe: true, handles: ['lindsey.t'] },
  ]);
  expect(problems).toEqual([]);
  await ctx.close();
});

test('the team member popup suggests the same people, and picking fills the name and handle', async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await openShoot(browser, testInfo, 'w2');
  await page.locator('#shootDetailRows [data-page="teamHeading"]').click();
  await page.locator('#addTeamMemberBtn').click();
  const popup = page.locator('#teamMemberModalOverlay');
  await expect(popup).toBeVisible();
  await popup.locator('#teamMemberModalNameInput').pressSequentially('jun');
  const rows = popup.locator('.name-suggest-row');
  await expect(rows.locator('.name-suggest-name')).toHaveText(['June Park']);
  await expect(rows.locator('.name-suggest-label')).toHaveText(['talent, 3 shoots']);
  await rows.first().click();
  await expect(rows).toHaveCount(0);
  await expect(popup.locator('#teamMemberModalNameInput')).toHaveValue('June Park');
  await expect(popup.locator('#teamMemberModalSocialPlatform')).toHaveValue('instagram');
  await expect(popup.locator('#teamMemberModalSocialInput')).toHaveValue('junepark.jpg');
  // The team never has Booked me.
  await expect(popup.locator('.df-switch')).toHaveCount(0);
  expect(problems).toEqual([]);
  await ctx.close();
});
