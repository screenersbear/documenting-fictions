// The Eye and Ref, 21 Nov (Starky): a shoot's Open in Ref, then Back, comes
// back to The Eye on that shoot's page; and SHARE sends a mood board on as
// a PDF or as images, asking which.
import { test, expect } from '@playwright/test';
import { freshPage } from './_helpers.mjs';

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
function seed(day) {
  if (sessionStorage.getItem('eye-ref-seeded')) return;
  sessionStorage.setItem('eye-ref-seeded', '1');
  localStorage.setItem('ref-notebook-tags', 'off');
  const shoots = [{ id: 's1', title: 'Spring lookbook', category: 'portfolio_building', status: 'waiting_to_shoot', date: day, startTime: '00:00', endTime: '23:59',
    location: { name: 'Studio', address: '' }, references: [], frameworkTags: [], moodboardComplete: false, teamRequired: 'no',
    talents: [{ id: 't1', name: 'June Park', socialHandles: [] }], teamMembers: [],
    shotList: [], lightingSetups: [], shootingNotes: '', lessonsLearned: '', archived: false }];
  localStorage.setItem('dailies_state_v1', JSON.stringify({ shoots, projects: [], journalEntries: [] }));
}
const T = '2026-11-21T10:00:00.000Z';
// A board in Ref, sent to the shoot, and a photo on the shoot's own mood board.
async function boardOnShoot(page) {
  await page.evaluate(([t]) => new Promise((ok) => {
    const req = indexedDB.open('ref-notebook');
    req.onsuccess = () => {
      const tx = req.result.transaction('boards', 'readwrite');
      tx.objectStore('boards').put({ id: 'b1', name: 'Spring looks', shape: 'letter-portrait', style: 'grid', pages: [{ template: 'lp-single', images: [] }], createdAt: t, updatedAt: t });
      tx.oncomplete = () => { req.result.close(); ok(); };
    };
  }), [T]);
  await page.evaluate(() => window.DFData.saveLink({ type: 'moodboard', fromApp: 'ref', fromId: 'b1', toApp: 'the-eye', toId: 's1', name: 'Spring looks', pageCount: 1 }));
  await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 300; c.height = 400;
    const g = c.getContext('2d'); g.fillStyle = '#7FA79A'; g.fillRect(0, 0, 300, 400);
    const src = c.toDataURL('image/jpeg', 0.8);
    return new Promise((ok) => {
      const req = indexedDB.open('starky-moodboards', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('images');
      req.onsuccess = () => { const tx = req.result.transaction('images', 'readwrite'); tx.objectStore('images').put([{ src, caption: '' }], 's1'); tx.oncomplete = () => { req.result.close(); ok(); }; };
    });
  });
}

test("Open in Ref, then Back: The Eye again, on the shoot's mood board page", async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await freshPage(browser, testInfo, '/ref/#/boards', { returning: true });
  await ctx.addInitScript(seed, today());
  await page.reload();
  await expect(page.locator('.boards-adds')).toBeVisible();
  await boardOnShoot(page);
  await page.goto('/the-eye/?shoot=s1');
  await expect(page.locator('#shootFront')).toBeVisible();
  await page.locator('#shootFront [data-page="visualsHeading"]').first().click();
  await expect(page.locator('#refBoards')).toContainText('Spring looks');
  await page.locator('#refBoards [data-ref-open]').click();
  await expect(page).toHaveURL(/\/ref\/#\/board\/b1$/);
  const back = page.locator('.band-short a.ring-btn').first();
  await expect(back).toHaveAttribute('aria-label', 'Back to The Eye');
  await expect(page.locator('.band-short .band-line b')).toHaveText('The Eye');
  // A reload on the board still goes back there.
  await page.reload();
  await expect(page.locator('.band-short a.ring-btn').first()).toHaveAttribute('aria-label', 'Back to The Eye');
  await page.locator('.band-short a.ring-btn').first().click();
  await expect(page).toHaveURL(/\/the-eye\//);
  await expect(page.locator('#shareMoodboardBtn')).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#shootFront')).toBeHidden();
  // Anywhere else in Ref, Back is Mood boards again.
  await page.goto('/ref/#/boards');
  await page.goto('/ref/#/board/b1');
  await expect(page.locator('.band-short a.ring-btn').first()).toHaveAttribute('aria-label', 'Back to mood boards');
  expect(problems).toEqual([]);
  await ctx.close();
});

test('SHARE on the mood board asks PDF or images, then hands it over', async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await freshPage(browser, testInfo, '/ref/#/boards', { returning: true });
  await ctx.addInitScript(seed, today());
  await page.reload();
  await expect(page.locator('.boards-adds')).toBeVisible();
  await boardOnShoot(page);
  await page.goto('/the-eye/?shoot=s1');
  await expect(page.locator('#shootFront')).toBeVisible();
  await page.locator('#shootFront [data-page="visualsHeading"]').first().click();
  const share = page.locator('#shareMoodboardBtn');
  await expect(share).toContainText('Share');
  await share.click();
  const card = page.locator('#shareBoardOverlay');
  await expect(card).toBeVisible();
  // The photo on the board (Ref's board has no pictures drawn yet here).
  await expect(card.locator('#shareBoardText')).toHaveText('1 picture. As one PDF, or each one as an image?');
  await expect(card.locator('button:visible')).toHaveText(['Cancel', 'Images', 'PDF']);
  await card.locator('[data-share-as="pdf"]').click();
  await expect(card.locator('#shareBoardText')).toHaveText(/^Your PDF is ready: 1 page, \d+\.\d MB\.$/, { timeout: 20000 });
  await expect(card.locator('#shareBoardSendBtn')).toHaveText(/^(Save or share|Download)$/);
  await card.locator('#shareBoardCancelBtn').click();
  await expect(card).toBeHidden();
  // Images, the second time.
  await share.click();
  await card.locator('[data-share-as="images"]').click();
  await expect(card.locator('#shareBoardText')).toHaveText(/^Your images are ready: 1 image, \d+\.\d MB\.$/, { timeout: 20000 });
  await card.locator('#shareBoardCancelBtn').click();
  expect(problems).toEqual([]);
  await ctx.close();
});
