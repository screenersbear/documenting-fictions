// Rounds, People (rounds/03-people, 04-person): ADD SOMEONE with a name, an
// Instagram and where you met, who starts as New with a hello due today.
// Their page: the handle, the group and where you met, the next move. Its
// ... menu: Edit (the group, the newsletter lists) and Let go, which keeps
// everything and can bring them back.
import { test, expect } from '@playwright/test';
import { openRounds, eyeShoot, goTo, sheet, opened } from './_rounds.mjs';

async function addDana(page) {
  await page.click('#view .today-calm [data-add]');
  const add = await opened(page, 'Add someone');
  await add.locator('input[name="name"]').fill('Dana Ortiz');
  await add.locator('input[name="instagram"]').fill('@dana.ortiz');
  await add.locator('input[name="where"]').fill('Gallery opening');
  await add.locator('button[type="submit"]').click();
  await expect(add).toHaveCount(0);
  await expect(page.locator('#toast')).toContainText('Dana Ortiz is in Rounds.');
}

// From the person's ... menu.
async function menu(page, name, label) {
  await page.click('#view [data-band-more]');
  const m = await opened(page, name);
  await m.locator('.choice', { hasText: label }).click();
}

test.describe('Rounds: People', () => {
  test('someone added starts as New, with a hello due today', async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openRounds(browser, testInfo);
    await addDana(page);
    await expect(page.locator('#view .card.top')).toContainText('Dana Ortiz');
    await expect(page.locator('#view .card.top')).toContainText('Say hello');
    await expect(page.locator('#view [data-write]')).toHaveText('Write to Dana');
    await goTo(page, 'people');
    await expect(page.locator('#view .list-head h2')).toHaveText('People 1');
    await page.locator('#view .person-card', { hasText: 'Dana Ortiz' }).click();
    await expect(page).toHaveURL(/#\/person\//);
    await expect(page.locator('#view .person-name')).toHaveText('Dana Ortiz');
    await expect(page.locator('#view .person-handle')).toHaveText('@dana.ortiz');
    await expect(page.locator('#view .person-line')).toHaveText('New. Gallery opening.');
    await expect(page.locator('#view .person-next')).toContainText('Say hello');
    expect(problems).toEqual([]);
    await ctx.close();
  });

  test('ADD SOMEONE on People opens their page', async ({ browser }, testInfo) => {
    const { ctx, page } = await openRounds(browser, testInfo, '/rounds/#/people');
    await page.click('#view .list-head [data-add]');
    const add = await opened(page, 'Add someone');
    await add.locator('input[name="name"]').fill('Bo Chen');
    await add.locator('button[type="submit"]').click();
    await expect(page.locator('#view .person-name')).toHaveText('Bo Chen');
    await ctx.close();
  });

  test('Edit turns groups on together (a Client and a Regular) and puts them on the email list', async ({ browser }, testInfo) => {
    const { ctx, page } = await openRounds(browser, testInfo);
    await addDana(page);
    await goTo(page, 'people');
    await page.locator('#view .person-card', { hasText: 'Dana Ortiz' }).click();
    await menu(page, 'Dana Ortiz', 'Edit');
    const edit = await opened(page, 'Edit');
    // Groups (people/NOTES.md): chips that turn on together; Client and Prospect never both.
    await expect(edit.locator('.edit-groups [data-group]')).toHaveText(['Regular', 'New', 'Client', 'Prospect', 'Event guest']);
    const on = edit.locator('.edit-groups .on');
    await expect(on).toHaveText(['New']);
    await edit.locator('[data-group="new"]').click(); // the last one on stays on
    await expect(on).toHaveText(['New']);
    await edit.locator('[data-group="client"]').click();
    await expect(on).toHaveText(['New', 'Client']);
    await edit.locator('[data-group="new"]').click();
    await edit.locator('[data-group="regular"]').click();
    await expect(on).toHaveText(['Regular', 'Client']);
    await edit.locator('[data-group="prospect"]').click();
    await expect(on).toHaveText(['Regular', 'Prospect']);
    await edit.locator('[data-group="client"]').click();
    await expect(on).toHaveText(['Regular', 'Client']);
    await expect(edit.locator('[data-group-words]')).toContainText('Repeat collaborators.');
    await expect(edit.locator('[data-group="client"]')).toHaveAttribute('aria-pressed', 'true');
    await expect(edit.locator('[data-email]')).toBeHidden();
    await edit.locator('.switch-row', { hasText: 'email newsletter' }).click();
    await expect(edit.locator('[data-email]')).toBeVisible();
    await edit.locator('input[name="email"]').fill('dana@example.com');
    await edit.locator('textarea[name="note"]').fill('Hired me for the spring lookbook');
    await edit.locator('button[type="submit"]').click();
    await expect(edit).toHaveCount(0);
    await expect(page.locator('#view .person-line')).toHaveText('Regular. Client. Hired me for the spring lookbook.');
    // The email list has them now: Options exports it as a CSV.
    await page.evaluate(() => Object.defineProperty(navigator, 'canShare', { configurable: true, value: undefined }));
    await goTo(page, 'today');
    await page.click('#view [data-app-menu]');
    const options = await opened(page, 'Options');
    await expect(options.locator('[data-list="email"]')).toContainText('1 person');
    const [file] = await Promise.all([page.waitForEvent('download'), options.locator('[data-list="email"]').click()]);
    expect(file.suggestedFilename()).toMatch(/^rounds-email-list-\d{4}-\d\d-\d\d\.csv$/);
    const fs = await import('node:fs/promises');
    expect(await fs.readFile(await file.path(), 'utf8')).toContain('Dana Ortiz');
    await ctx.close();
  });

  test('Let go keeps them, under Let go, and the menu brings them back', async ({ browser }, testInfo) => {
    const { ctx, page } = await openRounds(browser, testInfo);
    await addDana(page);
    await goTo(page, 'people');
    await page.locator('#view .person-card', { hasText: 'Dana Ortiz' }).click();
    await menu(page, 'Dana Ortiz', 'Let go');
    const ask = await opened(page, 'Let Dana Ortiz go?');
    await ask.locator('[data-yes]').click();
    await expect(page.locator('#view .person-rest')).toContainText('Let go. Everything about them is kept');
    await expect(page.locator('#view .person-next')).toHaveCount(0);
    // Back to the list (on their page, People in the bar only scrolls up, as in Ref).
    await page.click('#view .band-short a[aria-label="Back"]');
    await expect(page).toHaveURL(/#\/people$/);
    await expect(page.locator('#view .list-head h2').first()).toHaveText('People 0');
    await expect(page.locator('#view .people-gone')).toContainText('Dana Ortiz');
    await goTo(page, 'today');
    await expect(page.locator('#view .today-calm h2')).toHaveText('No one here yet.');
    // Back again.
    await goTo(page, 'people');
    await page.locator('#view .people-gone .person-card').click();
    await menu(page, 'Dana Ortiz', 'Bring back');
    await expect(page.locator('#view .person-next')).toBeVisible();
    await ctx.close();
  });

  test('a photo chosen shows in place of the initials, on their page, in People and on Today', async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openRounds(browser, testInfo);
    await addDana(page);
    await goTo(page, 'people');
    const card = page.locator('#view .person-card', { hasText: 'Dana Ortiz' });
    await expect(card.locator('.ph-initials')).toBeVisible();
    await expect(card.locator('.ph-initials')).toHaveText('DO');
    await card.click();
    await page.click('#view [data-band-more]');
    const m = await opened(page, 'Dana Ortiz');
    // A small red square, as if picked from Photos.
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), m.locator('.choice', { hasText: 'Choose a photo' }).click()]);
    await chooser.setFiles({ name: 'dana.png', mimeType: 'image/png', buffer: png });
    const photo = page.locator('#view .ph').first();
    await expect(photo.locator('img')).toBeVisible();
    await expect(photo.locator('.ph-initials')).toBeHidden();
    await page.click('#view .band-short a[aria-label="Back"]');
    await expect(card.locator('img')).toBeVisible();
    await expect(card.locator('.ph-initials')).toBeHidden();
    await goTo(page, 'today');
    await expect(page.locator('#view .card.top .ph img')).toBeVisible();
    await expect(page.locator('#view .card.top .ph-initials')).toBeHidden();
    expect(problems).toEqual([]);
    await ctx.close();
  });

  test('people from a shoot in The Eye say where you met', async ({ browser }, testInfo) => {
    const { ctx, page } = await openRounds(browser, testInfo, '/rounds/#/people', eyeShoot);
    await page.locator('#view .person-card', { hasText: 'Jules M.' }).click();
    await expect(page.locator('#view .person-line')).toHaveText('New. Makeup on Rooftop portraits.');
    await expect(page.locator('#view .person-handle')).toHaveText('@jules.mua');
    // Their next move opens from their page too.
    await page.click('#view .person-next');
    await expect(sheet(page, 'Say thanks')).toBeVisible();
    await ctx.close();
  });
});
