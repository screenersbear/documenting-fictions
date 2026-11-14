// How the notebooks connect (round 2, connect/03 and 04): finals passed on
// by The Eye arrive in Layouts as two posts made from them (a carousel and a
// single, 3:4, captions from the shoot), with one slip at the top of the
// list. LOOK THEM OVER opens them; NOT NOW tucks the slip away; SAVE AND
// SHARE copies the caption, opens Export and tells Rounds who's tagged.
import { test, expect, chromium } from '@playwright/test';
import { freshPage } from './_helpers.mjs';

const CAPTION = 'Rooftop portraits with June Park @junepark.jpg. Hair and makeup @iryna.hmua.';

// A shoot's finals as The Eye keeps them, each its own colour, and the hand-off.
async function passFinals(page, n) {
  return page.evaluate(async ({ n, caption }) => {
    const src = (i) => {
      const c = document.createElement('canvas');
      c.width = 60; c.height = 80;
      const x = c.getContext('2d');
      x.fillStyle = `hsl(${i * 47} 60% 55%)`;
      x.fillRect(0, 0, 60, 80);
      return c.toDataURL('image/jpeg', 0.8);
    };
    await new Promise((resolve, reject) => {
      const req = indexedDB.open('starky-moodboards', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('images');
      req.onsuccess = () => {
        const tx = req.result.transaction('images', 'readwrite');
        tx.objectStore('images').put(Array.from({ length: n }, (_, i) => ({ src: src(i), caption: '' })), 'r1__final');
        tx.oncomplete = () => { req.result.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
      };
      req.onerror = () => reject(req.error);
    });
    return (await window.DFData.saveLink({ type: 'finals', fromApp: 'the-eye', fromId: 'r1', toApp: 'contact-sheet', toId: '', title: 'Rooftop portraits', count: n, caption })).id;
  }, { n, caption: CAPTION });
}

// Layouts keeps photos as Blobs in the phone's database, as Safari does on
// an iPhone; Playwright's WebKit can't keep a Blob there at all (its test
// windows are private ones). So on the iPhone project these run in Chromium
// made to look like that iPhone (the project's size, touch and user agent).
async function openLayouts(browser, testInfo, finals = 6) {
  const own = browser.browserType().name() === 'webkit' ? await chromium.launch() : null;
  const { ctx, page } = await freshPage(own || browser, testInfo, '/contact-sheet/#/contents', { returning: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator('.list-head')).toBeVisible();
  const id = await passFinals(page, finals);
  await page.reload();
  const close = async () => { await ctx.close(); if (own) await own.close(); };
  return { ctx: { close }, page, id };
}

// The posts' page, once it's taking taps (a sheet ignores them for its
// first 450ms: components/sheet.js).
async function postsOpen(page) {
  const sheet = page.locator('.sheet-posts');
  await expect(sheet).toBeVisible();
  await page.waitForTimeout(500);
  return sheet;
}

const link = (page, id) => page.evaluate((x) => window.DFData.getLink(x), id);
const names = (page) => page.locator('.toc-row .toc-name').allTextContents();

test.describe('Layouts: posts made from The Eye\'s finals', () => {
  test('they arrive as two posts with a slip; LOOK THEM OVER opens them', async ({ browser }, testInfo) => {
    const { ctx, page, id } = await openLayouts(browser, testInfo);
    const slip = page.locator('.df-slip');
    await expect(slip).toBeVisible({ timeout: 15000 });
    await expect(slip.locator('.df-slip-tag')).toHaveText('From The Eye');
    await expect(slip.locator('.df-slip-when')).toHaveText('Today');
    await expect(slip.locator('.df-slip-title')).toHaveText('Rooftop portraits');
    await expect(slip.locator('.df-slip-line')).toHaveText('6 finals. Two posts made from them, ready to look over.');
    await expect(slip.locator('.cs-slip-what')).toHaveText(['Carousel · 5', 'Single']);
    await expect(slip.locator('.cs-slip-face img')).toHaveCount(2);
    expect(await names(page)).toEqual(['Rooftop portraits, carousel', 'Rooftop portraits, single']);
    await expect(page.locator('.toc-row .toc-meta').first()).toContainText('5 slides');
    const made = await link(page, id);
    expect(made.madeAt).toBeTruthy();
    expect(made.postIds).toHaveLength(2);
    // Looked over: the page of the two posts, and the slip gone for good.
    await slip.locator('[data-slip-open]').click();
    const sheet = await postsOpen(page);
    await expect(sheet.locator('.posts-title')).toHaveText('Two posts from Rooftop portraits');
    await expect(sheet.locator('.posts-tag .df-slip-tag')).toHaveText('From The Eye');
    await expect(sheet.locator('.posts-post .posts-label:not(.posts-cap-label)')).toHaveText(['Post 1 · Carousel, 5 shots', 'Post 2 · Single']);
    await expect(sheet.locator('.posts-post').first().locator('canvas.posts-slide')).toHaveCount(5);
    await expect(sheet.locator('.posts-post').nth(1).locator('canvas.posts-slide')).toHaveCount(1);
    await expect(sheet.locator('.posts-post').first().locator('.posts-dots span')).toHaveCount(5);
    await expect(sheet.locator('.posts-caption').first()).toHaveValue(CAPTION);
    expect((await link(page, id)).openedAt).toBeTruthy();
    await expect(page.locator('.toc-page .df-slip')).toHaveCount(0);
    // EDIT opens the carousel in the editor.
    await sheet.locator('[data-edit]').first().click();
    await expect(page).toHaveURL(new RegExp(`#/edit/${made.postIds[0]}$`));
    await ctx.close();
  });

  test('SAVE AND SHARE keeps the caption, opens Export and tells Rounds who is tagged', async ({ browser }, testInfo) => {
    const { ctx, page, id } = await openLayouts(browser, testInfo);
    await page.locator('.df-slip [data-slip-open]').click({ timeout: 15000 });
    const post = (await postsOpen(page)).locator('.posts-post').first();
    await post.locator('.posts-caption').fill(`${CAPTION} Thanks @dana.o`);
    await post.locator('[data-share]').click();
    await expect(page.locator('.sheet-export')).toBeVisible();
    const { postIds } = await link(page, id);
    await expect.poll(() => page.evaluate((x) => window.DFData.linksWhere({ type: 'post-people', fromId: x }), postIds[0])).toHaveLength(1);
    const [told] = await page.evaluate((x) => window.DFData.linksWhere({ type: 'post-people', fromId: x }), postIds[0]);
    expect(told).toMatchObject({ fromApp: 'contact-sheet', toApp: 'rounds', title: 'Rooftop portraits', handles: ['junepark.jpg', 'iryna.hmua', 'dana.o'] });
    // The caption stays with the post.
    const caption = await page.evaluate(async (x) => {
      const req = indexedDB.open('contact-sheet');
      const db = await new Promise((r) => { req.onsuccess = () => r(req.result); });
      const p = await new Promise((r) => { const g = db.transaction('projects').objectStore('projects').get(x); g.onsuccess = () => r(g.result); });
      db.close();
      return p.caption;
    }, postIds[0]);
    expect(caption).toBe(`${CAPTION} Thanks @dana.o`);
    await ctx.close();
  });

  test('NOT NOW tucks the slip away; the posts stay in the list', async ({ browser }, testInfo) => {
    const { ctx, page, id } = await openLayouts(browser, testInfo);
    await page.locator('.df-slip [data-slip-later]').click({ timeout: 15000 });
    await expect(page.locator('.df-slip')).toHaveCount(0);
    expect((await link(page, id)).tuckedAt).toBeTruthy();
    expect(await names(page)).toEqual(['Rooftop portraits, carousel', 'Rooftop portraits, single']);
    await page.reload();
    await expect(page.locator('.toc-row')).toHaveCount(2);
    await expect(page.locator('.df-slip')).toHaveCount(0);
    await ctx.close();
  });

  test('with posts switched off, sharing tells Rounds nothing; few finals make one post', async ({ browser }, testInfo) => {
    const { ctx, page, id } = await openLayouts(browser, testInfo, 3);
    await page.evaluate(() => localStorage.setItem('df-connect', JSON.stringify({ posts: false })));
    const slip = page.locator('.df-slip');
    await expect(slip.locator('.df-slip-line')).toHaveText('3 finals. A post made from them, ready to look over.', { timeout: 15000 });
    await expect(slip.locator('.cs-slip-what')).toHaveText(['Carousel · 3']);
    await slip.locator('[data-slip-open]').click();
    await expect((await postsOpen(page)).locator('.posts-title')).toHaveText('A post from Rooftop portraits');
    await page.locator('.sheet-posts [data-share]').click();
    await expect(page.locator('.sheet-export')).toBeVisible();
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => window.DFData.linksWhere({ type: 'post-people' }))).toHaveLength(0);
    expect((await link(page, id)).postIds).toHaveLength(1);
    await ctx.close();
  });

  test("opened from The Eye's record (?posts=), the posts show straight away", async ({ browser }, testInfo) => {
    const { ctx, page, id } = await openLayouts(browser, testInfo);
    await expect(page.locator('.df-slip')).toBeVisible({ timeout: 15000 });
    await page.goto(`/contact-sheet/?posts=${id}#/contents`);
    await expect(page.locator('.sheet-posts .posts-title')).toHaveText('Two posts from Rooftop portraits');
    expect((await link(page, id)).openedAt).toBeTruthy();
    await ctx.close();
  });
});
