// Rounds, Messages (rounds/05-messages) and Options: each kind of move's
// message, written once in your words with [name] and the other fill-ins,
// and back to the example; your offer and city; how many moves a day; and
// Import people from a CSV file, every row ticked, to untick anyone.
import { test, expect } from '@playwright/test';
import { openRounds, goTo, opened } from './_rounds.mjs';

const row = (page, kind) => page.locator(`#view .msg-row[data-kind="${kind}"]`);

async function options(page) {
  await page.click('#view [data-app-menu]');
  return opened(page, 'Options');
}

// Import people, with a CSV file picked from Files.
async function importCsv(page, text) {
  const s = await options(page);
  const [chooser] = await Promise.all([page.waitForEvent('filechooser'), s.locator('[data-import]').click()]);
  await chooser.setFiles({ name: 'people.csv', mimeType: 'text/csv', buffer: Buffer.from(text) });
}

test.describe('Rounds: Messages and Options', () => {
  test('a message written in your words, with a fill-in, and back to the example', async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openRounds(browser, testInfo, '/rounds/#/messages');
    await expect(page.locator('#view .msg-list').first().locator('.msg-kind')).toHaveText(['Say thanks', 'Say hello', 'Check in', 'Refresh offer', 'Ask for intros', 'Pitch', 'Follow up']);
    await expect(row(page, 'thanks').locator('.msg-text')).toHaveText('Thank you for today, [name]! It was so good working with you.');
    await row(page, 'thanks').click();
    const edit = await opened(page, 'Say thanks');
    await expect(edit.locator('[data-reset]')).toHaveCount(0);
    const text = edit.locator('textarea[name="text"]');
    await text.fill('So good shooting with you, ');
    await edit.locator('[data-fill="name"]').click();
    await expect(text).toHaveValue('So good shooting with you, [name]');
    await edit.locator('button[type="submit"]').click();
    await expect(row(page, 'thanks').locator('.msg-text')).toHaveText('So good shooting with you, [name]');
    // Kept: there after a reload too.
    await page.reload();
    await expect(row(page, 'thanks').locator('.msg-text')).toHaveText('So good shooting with you, [name]');
    await row(page, 'thanks').click();
    const again = await opened(page, 'Say thanks');
    await again.locator('[data-reset]').click();
    await expect(row(page, 'thanks').locator('.msg-text')).toHaveText('Thank you for today, [name]! It was so good working with you.');
    expect(problems).toEqual([]);
    await ctx.close();
  });

  test('your city, set once, fills in [city]', async ({ browser }, testInfo) => {
    const { ctx, page } = await openRounds(browser, testInfo, '/rounds/#/messages');
    const city = page.locator('#view .msg-row[data-mine="city"]');
    await expect(city.locator('.msg-text')).toHaveText('Not set yet');
    await city.click();
    const ask = await opened(page, 'Your city');
    await ask.locator('input[name="v"]').fill('Hoboken');
    await ask.locator('button[type="submit"]').click();
    await expect(city.locator('.msg-text')).toHaveText('Hoboken');
    await ctx.close();
  });

  test('moves a day: three to start, one to five', async ({ browser }, testInfo) => {
    const { ctx, page } = await openRounds(browser, testInfo);
    let s = await options(page);
    const n = s.locator('[data-n]');
    await expect(n).toHaveText('3');
    await s.locator('[data-step="1"]').click();
    await s.locator('[data-step="1"]').click();
    await s.locator('[data-step="1"]').click();
    await expect(n).toHaveText('5');
    await page.keyboard.press('Escape');
    await expect(s).toHaveCount(0);
    s = await options(page);
    await expect(s.locator('[data-n]')).toHaveText('5');
    for (let i = 0; i < 5; i++) await s.locator('[data-step="-1"]').click();
    await expect(s.locator('[data-n]')).toHaveText('1');
    await ctx.close();
  });

  test('Import people: every row ticked, untick anyone, and the ones added join People', async ({ browser }, testInfo) => {
    const { ctx, page } = await openRounds(browser, testInfo);
    await importCsv(page, 'name,group,instagram,where_met\nAna Lima,prospect,@analima,Brand list\nBo Chen,client,,Old client\n,new,,No name here\n');
    const s = await opened(page, 'Import people');
    await expect(s.locator('.import-sum')).toHaveText('1 row has no name and is left out.');
    await expect(s.locator('.import-name')).toHaveText(['Ana Lima', 'Bo Chen']);
    await expect(s.locator('.import-row', { hasText: 'Ana Lima' }).locator('.import-meta')).toHaveText('Prospect · @analima · Brand list');
    await expect(s.locator('[data-add]')).toHaveText('Add 2 people');
    await s.locator('.import-row', { hasText: 'Bo Chen' }).locator('input').uncheck();
    await expect(s.locator('[data-add]')).toHaveText('Add 1 person');
    await s.locator('[data-add]').click();
    await expect(s).toHaveCount(0);
    await expect(page.locator('#toast')).toContainText('1 person added.');
    await goTo(page, 'people');
    await expect(page.locator('#view .person-card-name')).toHaveText(['Ana Lima']);
    // The same file again: Ana's already here.
    await importCsv(page, 'name,instagram\nAna Lima,analima\n');
    await expect(page.locator('#toast')).toHaveText('No one new to add. 1 person is in Rounds already and won\'t be added again.');
    await ctx.close();
  });

  test('a file with no name column says how it should look', async ({ browser }, testInfo) => {
    const { ctx, page } = await openRounds(browser, testInfo);
    await importCsv(page, 'instagram,where\n@someone,Somewhere\n');
    await expect(page.locator('#toast')).toHaveText('This file has no name column. Its first row should name the columns: name, group, instagram and the rest.');
    await expect(page.locator('.sheet')).toHaveCount(0);
    await ctx.close();
  });

  test('the mail list, with no one on it yet, says how to add them', async ({ browser }, testInfo) => {
    const { ctx, page } = await openRounds(browser, testInfo);
    const s = await options(page);
    await expect(s.locator('[data-list="mail"]')).toContainText('0 people');
    await s.locator('[data-list="mail"]').click();
    await expect(page.locator('#toast')).toHaveText('No one is on the mail list yet. Edit a person to add them.');
    await ctx.close();
  });
});
