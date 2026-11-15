// The talent on a shoot's front page (round 2, connect/09): their 3rd shoot,
// LAST TIME WITH JUNE (The Eye's own lessons from their last shoot), then
// one line from Rounds since that shoot, and EVERYTHING WITH JUNE opening
// their page on the shelf.
import { test, expect } from '@playwright/test';
import { freshPage } from './_helpers.mjs';

function seed() {
  if (sessionStorage.getItem('eye-talent-seeded')) return;
  sessionStorage.setItem('eye-talent-seeded', '1');
  const june = () => ({ id: 't1', name: 'June Park', socialHandles: [{ platform: 'instagram', handle: 'junepark.jpg' }] });
  const shoot = (o) => ({ title: '', category: 'portfolio_building', startTime: '14:00', endTime: '16:30', location: { name: 'Studio', address: '' },
    references: [], frameworkTags: [], moodboardComplete: false, teamRequired: 'no', talents: [june()], teamMembers: [],
    shotList: [], lightingSetups: [], shootingNotes: '', lessonsLearned: '', archived: false, ...o });
  const shoots = [
    shoot({ id: 'w1', title: 'Winter portraits', status: 'planning', date: '2027-01-09' }),
    shoot({ id: 'p1', title: 'Rooftop portraits', status: 'delivered', date: '2026-11-07', lessonsLearned: 'She warms up after the first look. Start with something easy.' }),
    shoot({ id: 'p0', title: 'Garden test', status: 'delivered', date: '2026-08-12', lessonsLearned: 'Too much wind.' }),
  ];
  localStorage.setItem('dailies_state_v1', JSON.stringify({ shoots, projects: [], journalEntries: [] }));
}

test("a returning talent's card: LAST TIME, Rounds since that shoot, and EVERYTHING WITH opening their page", async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await freshPage(browser, testInfo, '/the-eye/', { returning: true });
  await ctx.addInitScript(seed);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.waitForLoadState('networkidle').catch(() => {});
  // What Rounds told the list about June.
  await page.evaluate(() => window.DFData.publishThings('rounds', [{ id: 'r1', kind: 'person', title: 'June Park', people: [{ name: 'June Park', instagram: 'junepark.jpg', roundsId: 'r1', at: '' }],
    more: { happened: [{ day: '2026-11-14', words: 'June said yes' }, { day: '2026-11-12', words: 'you checked in' }, { day: '2026-10-01', words: 'you said hello' }] } }]));
  await page.goto('/the-eye/?shoot=w1'); // opened at the shoot, as the shelf does
  await expect(page.locator('#shootFront')).toBeVisible();
  const card = page.locator('#shootFrontCards .front-talent-card');
  await expect(card.locator('.front-talent-name')).toHaveText('June Park');
  await expect(card.locator('.front-talent-meta')).toHaveText('@junepark.jpg');
  await expect(card.locator('.front-talent-returning')).toHaveText('Returning talent · 3rd shoot');
  await expect(card.locator('.front-last-head')).toHaveText('Last time with June, 7 Nov');
  await expect(card.locator('.front-last-text')).toHaveText('She warms up after the first look. Start with something easy.');
  await expect(card.locator('.front-rounds')).toHaveText('Since then: June said yes (14 Nov). You checked in (12 Nov).');
  await expect(card.locator('.front-everything')).toHaveText('Everything with June');
  // The talent still opens Basic info.
  await expect(card.locator('.front-talent')).toHaveAttribute('data-page', 'basicInfoHeading');
  // The Eye tells the list its shoots a moment after it opens.
  await expect.poll(() => page.evaluate(async () => (await window.DFData.thingsAll()).filter((t) => t.app === 'the-eye').length), { timeout: 8000 }).toBe(3);
  await card.locator('.front-everything').click();
  await expect(page.locator('.person-page h1')).toHaveText('June Park');
  await expect(page.locator('.person-page .person-part-head h2').nth(1)).toHaveText('Shoots 3');
  await page.locator('.person-page [data-back]').click();
  await expect(page).toHaveURL(/\/the-eye\//);
  expect(problems).toEqual([]);
  await ctx.close();
});
