// Search from the shelf (round 2, connect/14): the magnifier at the top right,
// one box over all four notebooks, people first, then each notebook's part
// under its mark in loop order, each row opening it there.
import { test, expect } from '@playwright/test';
import { onShelf, seed } from './_people.mjs';

const page = (p) => p.locator('.search-page');
const heads = (p) => page(p).locator('.person-part-head h2');
async function search(p, q) {
  await page(p).locator('.search-input').fill(q);
  await expect(page(p).locator('.search-results')).not.toBeEmpty();
}

test('search finds people first, then each notebook in loop order, each opening it there', async ({ browser }, testInfo) => {
  const r = await onShelf(browser, testInfo);
  const p = r.page;
  await seed(p);
  await p.click('#searchBtn');
  await expect(page(p)).toBeVisible();
  await expect(page(p).locator('.search-input')).toBeFocused();
  await expect(page(p).locator('.search-results')).toBeEmpty();
  await search(p, 'june');
  // Both June Parks: the one Rounds knows, and the other on Instagram.
  await expect(page(p).locator('[data-person] .person-title')).toHaveText(['June Park', 'June Park']);
  expect((await page(p).locator('[data-person] .person-line').allInnerTexts()).sort()).toEqual(['@june.other', 'Regular since August · @junepark.jpg']);
  await expect(heads(p)).toHaveText(['Rounds 1', 'Ref 1', 'The Eye 3', 'Layouts 1']);
  await expect(page(p).locator('[data-app="rounds"] .person-title')).toHaveText(['Plan the next one']);
  await expect(page(p).locator('[data-app="the-eye"] .person-title')).toHaveText(['Rooftop portraits', 'Garden test', 'Beach']);
  // Someone with little: the parts without them say so.
  await search(p, '@LEO');
  await expect(page(p).locator('[data-person] .person-title')).toHaveText(['Leo Grant']);
  await expect(page(p).locator('[data-person] .person-line')).toHaveCount(0);
  await expect(heads(p)).toHaveText(['Rounds', 'Ref', 'The Eye 1', 'Layouts']);
  await expect(page(p).locator('.person-none')).toHaveText(['Nothing with Leo yet.', 'Nothing with Leo yet.', 'Nothing with Leo yet.']);
  // Not a person: what has those words.
  await search(p, 'garden');
  await expect(page(p).locator('[data-person]')).toHaveCount(0);
  await expect(page(p).locator('.person-none').first()).toHaveText('Nothing for “garden”.');
  await search(p, 'zzz');
  await expect(page(p).locator('.search-none')).toHaveText('Nothing in the four notebooks for “zzz”.');
  await expect(heads(p)).toHaveCount(0);
  // Cleared, nothing shows.
  await page(p).locator('[data-clear]').click();
  await expect(page(p).locator('.search-input')).toHaveValue('');
  await expect(page(p).locator('.search-results')).toBeEmpty();
  await expect(page(p).locator('[data-clear]')).toBeHidden();
  // A person opens their page; its back comes back to the search.
  await search(p, 'leo');
  await page(p).locator('[data-person]').click();
  await expect(p.locator('.person-page h1')).toHaveText('Leo Grant');
  await p.locator('.person-page [data-back]').click();
  await expect(p.locator('.person-page')).toHaveCount(0);
  await expect(page(p).locator('[data-person] .person-title')).toHaveText(['Leo Grant']);
  // A shoot opens in The Eye, at that shoot (The Eye takes ?shoot out of its address as it opens).
  const opening = p.waitForRequest(/\/the-eye\/\?shoot=s2$/);
  await page(p).locator('[data-app="the-eye"] .person-row').click();
  await opening;
  await expect(p).toHaveURL(/\/the-eye\//);
  expect(r.problems).toEqual([]);
  await r.ctx.close();
});

test('back shuts the search; the magnifier steps aside while a notebook is up close', async ({ browser }, testInfo) => {
  const r = await onShelf(browser, testInfo);
  const p = r.page;
  await p.click('#searchBtn');
  await expect(page(p)).toBeVisible();
  await page(p).locator('[data-back]').click();
  await expect(page(p)).toHaveCount(0);
  await expect(p.locator('#searchBtn')).toBeVisible();
  await p.click('#optionsBtn');
  await expect(p.locator('#searchBtn')).toHaveCSS('pointer-events', 'none');
  expect(r.problems).toEqual([]);
  await r.ctx.close();
});
