// The Eye round 7 (17 Nov): NEW SHOOT on the Overview (the-eye/15), a mood
// board that takes PDFs and boards from Ref (the-eye/16), and shoot mode as
// one page that scrolls under a pinned header.
import { test, expect } from '@playwright/test';
import { freshPage } from './_helpers.mjs';
import { testPdf } from './_pdf.mjs';

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
function seed(day) {
  if (sessionStorage.getItem('eye-r7-seeded')) return;
  sessionStorage.setItem('eye-r7-seeded', '1');
  localStorage.setItem('ref-notebook-tags', 'off'); // Ref's labels: not what's tested, and its model is big
  const shoots = [{ id: 's1', title: 'Spring lookbook', category: 'portfolio_building', status: 'waiting_to_shoot', date: day, startTime: '00:00', endTime: '23:59',
    location: { name: 'Studio', address: '' }, references: [], frameworkTags: [], moodboardComplete: false, teamRequired: 'no',
    talents: [{ id: 't1', name: 'June Park', socialHandles: [] }], teamMembers: [],
    shotList: [{ id: 'a', text: 'Wide by the window', done: false }, { id: 'b', text: 'Close, hands', done: false }],
    lightingSetups: [], shootingNotes: 'Bring the grey card.', lessonsLearned: '', archived: false }];
  localStorage.setItem('dailies_state_v1', JSON.stringify({ shoots, projects: [], journalEntries: [] }));
}
async function openShoot(browser, testInfo, path = '/the-eye/?shoot=s1') {
  const { ctx, page, problems } = await freshPage(browser, testInfo, '/the-eye/', { returning: true });
  await ctx.addInitScript(seed, today());
  await page.goto(path);
  await page.waitForLoadState('networkidle').catch(() => {});
  return { ctx, page, problems };
}
async function toMoodBoard(page) {
  await expect(page.locator('#shootFront')).toBeVisible();
  await page.locator('#shootFront [data-page="visualsHeading"]').first().click();
  await expect(page.locator('#addMoodboardPhotos')).toBeVisible();
}
const top = (loc) => loc.evaluate((e) => e.getBoundingClientRect().top);

test.describe('The Eye round 7', () => {
  test('NEW SHOOT sits under the Today card and opens the new-shoot guide', async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openShoot(browser, testInfo, '/the-eye/');
    const btn = page.locator('#overviewNewShootBtn');
    await expect(btn).toBeVisible();
    await expect(btn.locator('.big-btn-words b')).toHaveText('New shoot');
    await expect(btn.locator('.big-btn-words span')).toHaveText('Plan it step by step');
    // Right under the Today card, above the rest of the Overview.
    expect(await btn.evaluate((b) => b.previousElementSibling.id)).toBe('todayCard');
    // Ink, like the mockup (DESIGN.md's --text).
    const ink = await page.evaluate(() => { const d = document.createElement('div'); d.style.color = 'var(--text)'; document.body.append(d); const c = getComputedStyle(d).color; d.remove(); return c; });
    await expect(btn).toHaveCSS('background-color', ink);
    await btn.click();
    await expect(page.locator('#shootWizard')).toBeVisible();
    // The Shoots list keeps its own NEW SHOOT.
    expect(await page.locator('#addShootBtn').count()).toBe(1);
    expect(problems).toEqual([]);
    await ctx.close();
  });

  test('ADD takes a PDF: each page one photo, under the file name', async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openShoot(browser, testInfo);
    await toMoodBoard(page);
    await expect(page.locator('#addMoodboardPhotos .big-btn-words')).toContainText('Add');
    await expect(page.locator('#addMoodboardPhotos .big-btn-words span')).toHaveText('photos or a PDF');
    await expect(page.locator('#importRefBoardBtn .big-btn-words b')).toHaveText('From Ref');
    expect(await page.locator('#moodboardFileInput').getAttribute('accept')).toBe('image/*,application/pdf,.pdf');
    await page.locator('#moodboardFileInput').setInputFiles({ name: 'Lookbook.pdf', mimeType: 'application/pdf', buffer: testPdf(3) });
    await expect(page.locator('#moodboardGrid .moodboard-thumb')).toHaveCount(3, { timeout: 20000 });
    await expect(page.locator('#moodboardGrid .moodboard-from')).toHaveText(['From Lookbook.pdf · 3 pages']);
    await expect(page.locator('#toast')).toContainText('All 3 pages of Lookbook.pdf are on the mood board, one photo each.');
    // Rendered on the phone at about 2400px on the long side.
    await expect.poll(() => page.locator('#moodboardGrid .moodboard-thumb img').first().evaluate((i) => Math.max(i.naturalWidth, i.naturalHeight))).toBe(2400);
    // A photo added after the PDF sits outside its group.
    const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = 40; c.height = 50; c.getContext('2d').fillRect(0, 0, 40, 50); return c.toDataURL('image/png'); });
    await page.locator('#moodboardFileInput').setInputFiles({ name: 'one.png', mimeType: 'image/png', buffer: Buffer.from(png.split(',')[1], 'base64') });
    await expect(page.locator('#moodboardGrid .moodboard-thumb')).toHaveCount(4);
    await expect(page.locator('#moodboardGrid .moodboard-from')).toHaveCount(1);
    expect(problems).toEqual([]);
    await ctx.close();
  });

  test('a PDF that will not open says so and adds nothing', async ({ browser }, testInfo) => {
    const { ctx, page } = await openShoot(browser, testInfo);
    await toMoodBoard(page);
    await page.locator('#moodboardFileInput').setInputFiles({ name: 'Broken.pdf', mimeType: 'application/pdf', buffer: Buffer.from('not a pdf') });
    await expect(page.locator('#toast')).toContainText("Broken.pdf couldn't be opened. Is it a PDF without a password?", { timeout: 20000 });
    await expect(page.locator('#moodboardGrid .moodboard-thumb')).toHaveCount(0);
    await ctx.close();
  });

  test('shoot mode is one page under a pinned header, no page dots', async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openShoot(browser, testInfo);
    // The shoot's next step, on its front page.
    await expect(page.locator('#shootNextBtn')).toHaveText('Shoot mode');
    await page.locator('#shootNextBtn').click();
    const overlay = page.locator('#shootModeOverlay');
    await expect(overlay).toBeVisible();
    await expect(overlay.locator('#shootModeDots, .nb-page-foot, .nb-turn-layer, [data-part]')).toHaveCount(0);
    // In order: Quick review, the shot list, the mood board, shooting notes.
    const heads = [overlay.locator('.shoot-mode-section-heading', { hasText: 'Quick review' }), overlay.locator('#shootModeShotListHeading'), overlay.locator('#shootModeMoodboardHeading'), overlay.locator('#shootModeShootingNotes')];
    const tops = [];
    for (const h of heads) { await expect(h).toBeVisible(); tops.push(await top(h)); }
    expect([...tops].sort((a, b) => a - b)).toEqual(tops);
    await expect(overlay.locator('#shootModeShotList .shot-text')).toHaveCount(2);
    // Scrolled to the end, the header stays at the top.
    const modal = overlay.locator('.shoot-mode-modal');
    const headTop = await top(overlay.locator('.shoot-mode-header'));
    await modal.evaluate((m) => { m.scrollTop = m.scrollHeight; });
    await expect(overlay.locator('#shootModeShootingNotes')).toBeInViewport();
    await expect.poll(() => top(overlay.locator('.shoot-mode-header'))).toBeCloseTo(headTop, 0);
    await expect(overlay.locator('#shootModeTitle')).toBeInViewport();
    // Nothing to swipe sideways to.
    expect(await modal.evaluate((m) => m.scrollWidth <= m.clientWidth + 1)).toBe(true);
    await page.locator('#shootModeExitBtn').click();
    await expect(overlay).toBeHidden();
    expect(problems).toEqual([]);
    await ctx.close();
  });
});
