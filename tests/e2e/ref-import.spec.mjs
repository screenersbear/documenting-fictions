// Ref round 3 (17 Nov): NEW BOARD and IMPORT at the top of Mood boards
// (ref/08). IMPORT makes a board from a PDF (each page a page of the board,
// "(from PDF)" after its name until it's renamed) or from photos, each
// page as it came in, at its full size, never fitted into a layout
// (Starky, 21 Nov). WHO IT'S FOR starts with ADD A NEW PERSON, then search,
// RECENT people with a short line, and "No one" last (ref/09). And The
// Eye's FROM REF (the-eye/16) picks one of these boards in Ref.
import { test, expect } from '@playwright/test';
import { freshPage } from './_helpers.mjs';
import { testPdf } from './_pdf.mjs';

const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
function seed(day) {
  if (sessionStorage.getItem('ref-import-seeded')) return;
  sessionStorage.setItem('ref-import-seeded', '1');
  localStorage.setItem('ref-notebook-tags', 'off'); // Ref's labels: not what's tested, and its model is big
  const shoots = [{ id: 's1', title: 'Spring lookbook', category: 'portfolio_building', status: 'waiting_to_shoot', date: day, startTime: '00:00', endTime: '23:59',
    location: { name: 'Studio', address: '' }, references: [], frameworkTags: [], moodboardComplete: false, teamRequired: 'no',
    talents: [{ id: 't1', name: 'June Park', socialHandles: [{ platform: 'instagram', handle: 'junepark.jpg' }] }], teamMembers: [],
    shotList: [], lightingSetups: [], shootingNotes: '', lessonsLearned: '', archived: false }];
  localStorage.setItem('dailies_state_v1', JSON.stringify({ shoots, projects: [], journalEntries: [] }));
}
async function openRef(browser, testInfo) {
  const { ctx, page, problems } = await freshPage(browser, testInfo, '/ref/#/boards', { returning: true });
  await ctx.addInitScript(seed, today());
  await page.reload();
  await expect(page.locator('.boards-adds [data-import]')).toBeVisible();
  return { ctx, page, problems };
}
async function importFiles(page, files) {
  const chooser = page.waitForEvent('filechooser');
  await page.locator('.boards-adds [data-import]').click();
  const c = await chooser;
  expect(c.isMultiple()).toBe(true);
  expect(await c.element().getAttribute('accept')).toBe('image/*,application/pdf,.pdf');
  await c.setFiles(files);
  await expect(page).toHaveURL(/#\/new$/, { timeout: 30000 });
}
const boards = (page) => page.evaluate(() => new Promise((ok) => {
  const req = indexedDB.open('ref-notebook');
  req.onsuccess = () => { const g = req.result.transaction('boards').objectStore('boards').getAll(); g.onsuccess = () => { ok(g.result); req.result.close(); }; };
}));
const photo = async (page, name, w, h) => {
  const url = await page.evaluate(([w, h]) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = '#7FA79A'; x.fillRect(0, 0, w, h); return c.toDataURL('image/jpeg', 0.8); }, [w, h]);
  return { name, mimeType: 'image/jpeg', buffer: Buffer.from(url.split(',')[1], 'base64') };
};
// The sheets ignore taps for their first 450ms (components/sheet.js).
const settle = (page) => page.waitForTimeout(500);

test.describe('Ref: IMPORT', () => {
  test('a PDF becomes a board, a page for each page, "(from PDF)" until renamed', async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openRef(browser, testInfo);
    await importFiles(page, { name: 'Lookbook.pdf', mimeType: 'application/pdf', buffer: testPdf(2, { wide: true }) });
    // Only a name and who it's for: each page as it is, at its full size.
    await expect(page.locator('.new-board .guide-title')).toHaveText('Name');
    await expect(page.locator('.new-board')).toContainText('Each page of the PDF is a page of the board, at its full size.');
    await expect(page.locator('[data-name]')).toHaveValue('Lookbook');
    await expect(page.locator('[data-shape]')).toHaveCount(0);
    await expect(page.locator('[data-who]')).toBeVisible();
    await expect(page.locator('[data-next]')).toHaveText('Make the board');
    await page.locator('[data-next]').click();
    await expect(page).toHaveURL(/#\/board\/.+$/);
    const [b] = await boards(page);
    expect(b.name).toBe('Lookbook');
    expect(b.fromPdf).toBe(true);
    expect(b.shape).toBe('own');
    expect(b.pages.map((p) => [p.template, p.images.length])).toEqual([['own', 1], ['own', 1]]);
    for (const p of b.pages) { expect(p.size.W).toBe(11); expect(p.size.H).toBeLessThan(11); }
    expect(b.pages.some((p) => p.nextTime)).toBe(false);
    // The tray opens on PAGES (user, 11-20): the pages in order; a tap goes to one.
    await expect(page.locator('[data-source="pages"]')).toHaveClass(/\bon\b/);
    await expect(page.locator('.tray-page .tray-num')).toHaveText(['1', '2']);
    await expect(page.locator('.tray-page.on .tray-num')).toHaveText('1');
    await page.locator('.tray-page[data-goto="1"]').click();
    await expect(page.locator('[data-at]')).toHaveText('Page 2 of 2');
    await expect(page.locator('.tray-page.on .tray-num')).toHaveText('2');
    // The page's photo, picked, swiped sideways: the page turns back (it can't be cropped sideways).
    // boundingBox() doesn't wait: right after the turn the page can still be
    // drawing, and a page not yet shown has no box (PR #12's run, 21 Nov).
    await expect(page.locator('[data-stage] .page')).toBeVisible();
    const stage = await page.locator('[data-stage] .page').boundingBox();
    const cx = stage.x + stage.width / 2, cy = stage.y + stage.height / 2;
    await page.mouse.click(cx, cy);
    await page.mouse.move(cx - 100, cy); await page.mouse.down(); await page.mouse.move(cx, cy, { steps: 6 }); await page.mouse.move(cx + 100, cy, { steps: 6 }); await page.mouse.up();
    await expect(page.locator('[data-at]')).toHaveText('Page 1 of 2');
    await page.goto('/ref/#/boards');
    await expect(page.locator('.card-name')).toHaveText(['Lookbook (from PDF)']);
    // Renamed, it's the name alone.
    await page.locator(`[data-more="${b.id}"]`).click();
    await settle(page);
    await page.locator('.choice', { hasText: 'Rename' }).click();
    await settle(page);
    await page.locator('.sheet input[name="v"]').fill('Spring looks');
    await page.locator('.sheet button[type="submit"]').click();
    await expect(page.locator('.card-name')).toHaveText(['Spring looks']);
    expect((await boards(page))[0].fromPdf).toBe(false);
    expect(problems).toEqual([]);
    await ctx.close();
  });

  test('photos come in as they are, each its own page; the editor adds, deletes and exports pages', async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openRef(browser, testInfo);
    await importFiles(page, [await photo(page, 'one.jpg', 400, 500), await photo(page, 'two.jpg', 500, 400)]);
    await expect(page.locator('.new-board .guide-title')).toHaveText('Name');
    await expect(page.locator('.new-board')).toContainText('Each photo is a page of the board, at its full size.');
    await expect(page.locator('[data-shape]')).toHaveCount(0);
    await page.locator('[data-name]').fill('Window light');
    await expect(page.locator('[data-next]')).toHaveText('Make the board');
    await page.locator('[data-next]').click();
    await expect(page).toHaveURL(/#\/board\/.+$/);
    let [b] = await boards(page);
    expect(b.fromPdf).toBeFalsy();
    expect(b.shape).toBe('own');
    expect(b.fonts).toEqual({ title: 'courier', text: 'courier' });
    expect(b.pages.map((p) => [p.template, p.size])).toEqual([['own', { W: 8.8, H: 11 }], ['own', { W: 11, H: 8.8 }]]);
    // Uncropped: the page is the photo's shape.
    await expect(page.locator('[data-stage] .page')).toBeVisible();
    const box = await page.locator('[data-stage] .page').boundingBox();
    expect(box.width / box.height).toBeCloseTo(0.8, 1);
    // The tray opens on its pages, so + PHOTOS waits for All.
    await expect(page.locator('[data-tray-add]')).toBeHidden();
    // ADD A PAGE: the layouts first, this page's own first of all.
    await page.locator('[data-add]').click();
    const sh = page.locator('.sheet', { has: page.locator('h2', { hasText: 'New page' }) });
    await expect(sh).toBeVisible();
    await expect(sh.locator('.opt-name').first()).toHaveText('Like this page');
    await expect(sh.locator('.opt-name').nth(1)).toHaveText('As imported');
    await expect(sh.locator('.opt-name', { hasText: 'thin lines' }).first()).toBeVisible();
    await settle(page);
    await sh.locator('.opt-card', { hasText: 'Grid of four, no lines' }).click();
    await expect(page.locator('[data-at]')).toHaveText('Page 2 of 3');
    await expect.poll(async () => (await boards(page))[0].pages.length).toBe(3); // saved a moment after
    [b] = await boards(page);
    expect(b.pages[1]).toMatchObject({ template: 'lp-grid-4-none', size: { W: 8.8, H: 11 } });
    // Its x asks first.
    await page.locator('.page-x').click();
    const ask = page.locator('.sheet', { has: page.locator('h2', { hasText: 'Delete page 2?' }) });
    await expect(ask).toBeVisible();
    await settle(page);
    await ask.locator('[data-yes]').click();
    await expect(page.locator('[data-at]')).toHaveText('Page 2 of 2');
    // EXPORT asks: images or a PDF.
    await page.locator('[data-t=export]').click();
    await expect(page.locator('.sheet .choice-label')).toHaveText(['Images', 'PDF']);
    await expect(page.locator('.sheet .choice-detail').first()).toHaveText('2 pictures, one for each page. For Photos or to send');
    await settle(page);
    await page.locator('.sheet .choice', { hasText: 'Images' }).click();
    const ready = page.locator('.sheet', { has: page.locator('h2', { hasText: 'Your images are ready' }) });
    await expect(ready).toBeVisible({ timeout: 20000 });
    await expect(ready.locator('[data-send]')).toHaveText(/^(Save all 2 or share|Download 2 as ZIP)$/);
    await page.goto('/ref/#/boards');
    await expect(page.locator('.card-name')).toHaveText(['Window light']);
    expect(problems).toEqual([]);
    await ctx.close();
  });

  test("WHO IT'S FOR: add a new person first, then search, recent people, no one last", async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openRef(browser, testInfo);
    await page.evaluate(() => window.DFData.gatherPeople([{ name: 'June Park', instagram: 'junepark.jpg' }, { name: 'Lindsey T.', instagram: 'lindsey.t' }]));
    // The Eye, opened once, says who's on its shoots.
    await page.goto('/the-eye/');
    await expect.poll(() => page.evaluate(async () => (await window.DFData.thingsAll()).filter((t) => t.app === 'the-eye').length), { timeout: 10000 }).toBe(1);
    await page.goto('/ref/#/new');
    await page.locator('[data-who]').click();
    const s = page.locator('.who-sheet');
    await expect(s).toBeVisible();
    await settle(page);
    const order = await s.evaluate((sheet) => ['.who-add-btn', '.who-search', '.who-recent', '.send-list', '.who-nobody'].map((sel) => {
      const all = [...sheet.querySelectorAll('*')];
      return all.indexOf(sheet.querySelector(sel));
    }));
    expect(order.every((n) => n >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
    await expect(s.locator('.who-add-btn .big-btn-words b')).toHaveText('Add a new person');
    await expect(s.locator('.who-add-btn .big-btn-words span')).toHaveText('Name and handle');
    await expect(s.locator('.who-recent')).toHaveText('Recent');
    await expect(s.locator('.who-nobody')).toHaveText("No one, it's just for me");
    // June is on a shoot in The Eye, so she's the most recent.
    await expect(s.locator('.who-pick .send-name')).toHaveText(['June Park', 'Lindsey T.']);
    await expect(s.locator('.who-pick .send-line')).toHaveText(['Talent · 1 shoot', '@lindsey.t']);
    // Search finds by name; Recent goes while searching.
    await s.locator('input[data-find]').fill('lind');
    await expect(s.locator('.who-pick .send-name')).toHaveText(['Lindsey T.']);
    await s.locator('.who-nobody').click();
    await expect(s).toBeHidden();
    expect(problems).toEqual([]);
    await ctx.close();
  });
});

test("The Eye's FROM REF: pick a board in Ref, and it's live on the shoot and in shoot mode", async ({ browser }, testInfo) => {
  const { ctx, page, problems } = await openRef(browser, testInfo);
  await importFiles(page, { name: 'Lookbook.pdf', mimeType: 'application/pdf', buffer: testPdf(2) });
  await page.locator('[data-next]').click();
  await expect(page).toHaveURL(/#\/board\/.+$/);
  // Ref kept for offline first (its service worker), as it would be by the
  // time a person goes on: leaving sooner cuts off what it's still saving.
  await page.evaluate(() => navigator.serviceWorker.ready.then(() => null));
  await page.goto('/the-eye/?shoot=s1');
  await expect(page.locator('#shootFront')).toBeVisible();
  await page.locator('#shootFront [data-page="visualsHeading"]').first().click();
  await page.locator('#importRefBoardBtn').click();
  await expect(page).toHaveURL(/\/ref\//);
  const sheet = page.locator('.send-sheet');
  await expect(sheet).toBeVisible();
  await expect(sheet.locator('.send-lead').first()).toHaveText('A board for "June Park" in The Eye. It stays live until the shoot happens.'); // a shoot goes by its talent, as in The Eye
  await expect(sheet.locator('.send-name')).toHaveText(['Lookbook']);
  await expect(sheet.locator('.send-line')).toContainText(['2 pages']);
  await expect(sheet.locator('[data-send]')).toHaveText('Send to June Park');
  await settle(page);
  await sheet.locator('[data-send]').click();
  await expect(page).toHaveURL(/\/the-eye\//, { timeout: 15000 });
  await expect(page.locator('#shootFront')).toBeVisible();
  await page.locator('#shootFront [data-page="visualsHeading"]').first().click();
  await expect(page.locator('#refBoards')).toContainText('Live from Ref');
  await expect(page.locator('#refBoards')).toContainText('Lookbook');
  // Its pages in shoot mode's mood board too.
  await page.locator('#shootNextBtn').click();
  await expect(page.locator('#shootModeOverlay')).toBeVisible();
  await expect(page.locator('#shootModeMoodboard .moodboard-thumb')).toHaveCount(2, { timeout: 15000 });
  expect(problems).toEqual([]);
  await ctx.close();
});
