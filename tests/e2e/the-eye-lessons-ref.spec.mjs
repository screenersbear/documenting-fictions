// LESSONS FOR NEXT TIME going to Ref (round 2, connect/10): under a shot
// shoot's lessons, a card says who and which kind they go to Ref for, and its
// switch keeps them to the shoot instead (saved with the shoot).
import { test, expect } from '@playwright/test';
import { freshPage } from './_helpers.mjs';

function seed() {
  if (sessionStorage.getItem('eye-lessons-seeded')) return;
  sessionStorage.setItem('eye-lessons-seeded', '1');
  const shoots = [{ id: 'p1', title: 'Rooftop portraits', category: 'headshot', status: 'delivered', date: '2026-11-07', startTime: '14:00', endTime: '16:30',
    location: { name: 'Studio', address: '' }, references: [], frameworkTags: [], moodboardComplete: false, teamRequired: 'no',
    talents: [{ id: 't1', name: 'June Park', socialHandles: [{ platform: 'instagram', handle: 'junepark.jpg' }] }], teamMembers: [],
    shotList: [], lightingSetups: [], shootingNotes: '', lessonsLearned: 'She warms up after the first look.', archived: false }];
  localStorage.setItem('dailies_state_v1', JSON.stringify({ shoots, projects: [], journalEntries: [] }));
}
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('dailies_state_v1')).shoots[0].lessonsToRef);

test("a shot shoot's lessons: the card says where they go, and its switch keeps them to the shoot", async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await freshPage(browser, testInfo, '/the-eye/', { returning: true });
  await ctx.addInitScript(seed);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/the-eye/?shoot=p1');
  await expect(page.locator('#shootFront')).toBeVisible();
  await page.locator('#shootFront [data-page="postShootHeading"]').first().click();
  const card = page.locator('#lessonsRef');
  await expect(card).toBeVisible();
  await expect(card.locator('.lessons-ref-words')).toHaveText('Goes to Ref as next-time notes, for June and for Headshot boards.');
  const flip = card.locator('[data-lessons-ref]');
  await expect(flip).toHaveAttribute('aria-checked', 'true');
  await flip.click();
  await expect(card.locator('.lessons-ref-words')).toHaveText("Kept to this shoot. Ref doesn't get these lessons.");
  await expect(card.locator('[data-lessons-ref]')).toHaveAttribute('aria-checked', 'false');
  await expect.poll(() => saved(page), { timeout: 5000 }).toBe(false);
  // Opened again, it's still kept.
  await page.goto('/the-eye/?shoot=p1');
  await page.locator('#shootFront [data-page="postShootHeading"]').first().click();
  await expect(page.locator('#lessonsRef [data-lessons-ref]')).toHaveAttribute('aria-checked', 'false');
  await page.locator('#lessonsRef [data-lessons-ref]').click();
  await expect.poll(() => saved(page), { timeout: 5000 }).toBe(true);
  expect(problems).toEqual([]);
  await ctx.close();
});
