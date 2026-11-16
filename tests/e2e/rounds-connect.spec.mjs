// How the notebooks connect, in Rounds (round 2, connect/05 and NOTES.md):
// after a pitch, HOW DID THE PITCH GO? A yes makes a Client and passes them
// to Ref ("Passed to Ref", OPEN), with Say thanks for the yes next; the
// same Yes from the menu for someone who asks to shoot. A post shared from
// Layouts gives the people tagged in it Your photos are up, with a slip on
// Today. The Eye's shoot people are noted for the shoot's record.
import { test, expect } from '@playwright/test';
import { openRounds, eyeShoot, goTo, opened, importCsv, weekdayNow, useMessage, skipNote } from './_rounds.mjs';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const now = weekdayNow();
const TODAY = `${now.getDate()} ${MONTHS[now.getMonth()]}`;

async function addPeople(page, csv) {
  await importCsv(page, csv);
  const s = await opened(page, 'Import people');
  await s.locator('[data-add]').click();
  await expect(s).toHaveCount(0);
}

async function personPage(page, name) {
  if (/#\/person\//.test(page.url())) await page.evaluate(() => { location.hash = '#/people'; });
  else await goTo(page, 'people');
  await page.locator('#view .person-card', { hasText: name }).click();
  await expect(page.locator('#view .person-name')).toHaveText(name);
}

async function menu(page, name, label) {
  await page.click('#view [data-band-more]');
  const m = await opened(page, name);
  await m.locator('.choice', { hasText: label }).click();
}

const links = (page, match) => page.evaluate((m) => window.DFData.linksWhere(m), match);
const chip = (page, label) => page.locator('#view .pitch-chip', { hasText: label });

test.describe('Rounds: how the notebooks connect', () => {
  test('after a pitch, a yes makes a Client and passes them to Ref; the answer can change', async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openRounds(browser, testInfo);
    await addPeople(page, 'name,group,instagram\nDana Ortiz,prospect,@danaortiz.studio\n');
    await personPage(page, 'Dana Ortiz');
    await expect(page.locator('#view .pitch-label')).toHaveCount(0);
    // The pitch, done.
    await page.click('#view [data-move]');
    const pitch = await opened(page, 'Pitch');
    await pitch.locator('.move-more [data-done]').click();
    await skipNote(page, 'Dana Ortiz');
    await expect(page.locator('#view .pitch-label')).toHaveText('How did the pitch go?');
    await expect(page.locator('#view .pitch-chip')).toHaveText(['No reply yet', 'Not now', "Yes, let's shoot"]);
    await expect(page.locator('#view .pitch-chip[aria-checked="true"]')).toHaveCount(0);
    await expect(page.locator('#view .person-next-what')).toHaveText('Follow up');
    // Yes, let's shoot.
    await chip(page, "Yes, let's shoot").click();
    await expect(page.locator('#view .person-line')).toHaveText(`Client now. Pitched ${TODAY}.`);
    await expect(chip(page, "Yes, let's shoot")).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('#view .passed-ref-title')).toHaveText('Passed to Ref');
    await expect(page.locator('#view .passed-ref-line')).toHaveText("Dana's mood board is waiting there.");
    const [made] = await links(page, { type: 'new-client' });
    expect(made).toMatchObject({ fromApp: 'rounds', toApp: 'ref', toId: '', name: 'Dana Ortiz', handle: 'danaortiz.studio' });
    expect(made.pitched).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    await expect(page.locator('#view .passed-ref-open')).toHaveAttribute('href', `../ref/?client=${made.id}`);
    await expect(page.locator('#view .person-next-what')).toHaveText('Say thanks for the yes');
    await expect(page.locator('#view .person-next-when')).toHaveText('Today');
    // Changed to No reply yet: a prospect again, the follow up back, and Ref's offer taken back.
    await chip(page, 'No reply yet').click();
    await expect(page.locator('#view .person-line')).toHaveText('Prospect.');
    await expect(page.locator('#view .person-next-what')).toHaveText('Follow up');
    await expect(page.locator('#view .passed-ref')).toHaveCount(0);
    expect(await links(page, { type: 'new-client' })).toHaveLength(0);
    // Not now: Rounds lets them rest.
    await chip(page, 'Not now').click();
    await expect(page.locator('#view .person-rest')).toHaveText('Nothing planned. Rounds let this one rest.');
    await expect(chip(page, 'Not now')).toHaveAttribute('aria-checked', 'true');
    expect(problems).toEqual([]);
    await ctx.close();
  });

  test('someone who asks to shoot gets the same Yes from the menu', async ({ browser }, testInfo) => {
    const { ctx, page } = await openRounds(browser, testInfo);
    await addPeople(page, 'name,group\nAna Lima,new\n');
    await personPage(page, 'Ana Lima');
    await menu(page, 'Ana Lima', "Yes, let's shoot");
    await expect(page.locator('#view .pitch-label')).toHaveText('Shooting together?');
    await expect(chip(page, "Yes, let's shoot")).toHaveAttribute('aria-checked', 'true');
    await expect(page.locator('#view .person-line')).toHaveText('Client now.');
    await expect(page.locator('#view .passed-ref-line')).toHaveText("Ana's mood board is waiting there.");
    await expect(page.locator('#view .person-next-what')).toHaveText('Say thanks for the yes');
    expect(await links(page, { type: 'new-client' })).toHaveLength(1);
    // The menu doesn't offer it again while the chips are there.
    await page.click('#view [data-band-more]');
    const m = await opened(page, 'Ana Lima');
    await expect(m.locator('.choice', { hasText: "Yes, let's shoot" })).toHaveCount(0);
    await ctx.close();
  });

  test('with New clients switched off, a yes passes nothing to Ref', async ({ browser }, testInfo) => {
    const { ctx, page } = await openRounds(browser, testInfo);
    await page.evaluate(() => localStorage.setItem('df-connect', JSON.stringify({ clients: false })));
    await addPeople(page, 'name,group\nAna Lima,new\n');
    await personPage(page, 'Ana Lima');
    await menu(page, 'Ana Lima', "Yes, let's shoot");
    await expect(page.locator('#view .person-line')).toHaveText('Client now.');
    await expect(page.locator('#view .passed-ref')).toHaveCount(0);
    expect(await links(page, { type: 'new-client' })).toHaveLength(0);
    await ctx.close();
  });

  test('a post from Layouts gives the people tagged Your photos are up, with a slip on Today', async ({ browser }, testInfo) => {
    const { ctx, page, problems } = await openRounds(browser, testInfo);
    await addPeople(page, 'name,group,instagram\nJune Park,new,junepark.jpg\nSam Lee,regular,samlee\n');
    const id = await page.evaluate(() => window.DFData.saveLink({
      fromApp: 'contact-sheet', fromId: 'post1', toApp: 'rounds', toId: '', type: 'post-people',
      title: 'Rooftop portraits', handles: ['junepark.jpg', 'iryna.hmua'], sharedAt: new Date().toISOString(),
    }).then((l) => l.id));
    await page.reload();
    const slip = page.locator('#view .df-slip');
    await expect(slip).toBeVisible();
    await expect(slip.locator('.df-slip-tag')).toHaveText('From Layouts');
    await expect(slip.locator('.df-slip-when')).toHaveText('Today');
    await expect(slip.locator('.df-slip-title')).toHaveText('Rooftop portraits');
    await expect(slip.locator('.df-slip-line')).toHaveText('June Park is tagged in the post. A note is ready.');
    await expect(slip.locator('.rd-slip-name')).toHaveText(['June']);
    await expect(slip.locator('[data-slip-open]')).toHaveText('Write to June');
    const taken = await page.evaluate((x) => window.DFData.getLink(x), id);
    expect(taken.takenAt).toBeTruthy();
    expect(taken.people).toHaveLength(1);
    // The shelf has Rounds' slip until this one's opened.
    expect((await page.evaluate(() => window.DFConnect.waitingByApp())).rounds).toEqual([{ from: 'contact-sheet', what: 'a new post from Layouts' }]);
    // WRITE TO JUNE: her move, with its own starter message.
    await slip.locator('[data-slip-open]').click();
    const move = await opened(page, 'Your photos are up');
    await useMessage(move, 'photos are up', 'The Rooftop portraits set is up. Thank you again, feel free to share it.');
    await move.locator('.move-more [data-done]').click();
    await expect(page.locator('#toast')).toContainText('Done.');
    await skipNote(page, 'June Park');
    await expect(page.locator('#view .df-slip')).toHaveCount(0);
    expect((await page.evaluate((x) => window.DFData.getLink(x), id)).openedAt).toBeTruthy();
    // Her hello, which it stood in for, is back; Sam wasn't tagged.
    await personPage(page, 'June Park');
    await expect(page.locator('#view .person-next-what')).toHaveText('Say hello');
    await personPage(page, 'Sam Lee');
    await expect(page.locator('#view .person-next-what')).toHaveText('Check in');
    await goTo(page, 'today');
    await expect(page.locator('#view .df-slip')).toHaveCount(0);
    expect(problems).toEqual([]);
    await ctx.close();
  });

  test('NOT NOW tucks the slip away (the move stays); a post that tags no one here leaves no slip', async ({ browser }, testInfo) => {
    const { ctx, page } = await openRounds(browser, testInfo);
    await addPeople(page, 'name,group,instagram\nJune Park,new,junepark.jpg\n');
    const [mine, nobody] = await page.evaluate(async () => {
      const post = (fromId, handles) => window.DFData.saveLink({ fromApp: 'contact-sheet', fromId, toApp: 'rounds', toId: '', type: 'post-people', title: 'Rooftop portraits', handles });
      return [(await post('p1', ['junepark.jpg'])).id, (await post('p2', ['nobody.here'])).id];
    });
    await page.reload();
    await expect(page.locator('#view .df-slip')).toHaveCount(1);
    await page.locator('#view .df-slip [data-slip-later]').click();
    await expect(page.locator('#view .df-slip')).toHaveCount(0);
    const [a, b] = await page.evaluate((ids) => Promise.all(ids.map((x) => window.DFData.getLink(x))), [mine, nobody]);
    expect(a.tuckedAt).toBeTruthy();
    expect(b).toMatchObject({ people: [] });
    expect(b.tuckedAt).toBeTruthy();
    await page.reload();
    await expect(page.locator('#view .band')).toBeVisible();
    await expect(page.locator('#view .df-slip')).toHaveCount(0);
    await personPage(page, 'June Park');
    await expect(page.locator('#view .person-next-what')).toHaveText('Your photos are up');
    await ctx.close();
  });

  test("The Eye's shoot people are noted for its record; switched off, they don't come in", async ({ browser }, testInfo) => {
    const on = await openRounds(browser, testInfo, '/rounds/', eyeShoot);
    await goTo(on.page, 'people');
    await expect(on.page.locator('#view .person-card-name')).toHaveText(['Jules M.', 'Maya R.']);
    const [noted] = await links(on.page, { type: 'people' });
    expect(noted).toMatchObject({ fromApp: 'the-eye', fromId: 's1', toApp: 'rounds', title: 'Rooftop portraits', names: ['Maya R.', 'Jules M.'] });
    await on.ctx.close();
    // The shoot's people switched off: the same shoot is passed by.
    const off = await openRounds(browser, testInfo);
    await off.page.evaluate(() => localStorage.setItem('df-connect', JSON.stringify({ people: false })));
    await off.page.evaluate(eyeShoot);
    await off.page.reload();
    await expect(off.page.locator('#view .band')).toBeVisible();
    await expect(off.page.locator('#view .today-calm h2')).toHaveText('No one here yet.');
    expect(await links(off.page, { type: 'people' })).toHaveLength(0);
    // Switched back on, that shoot stays passed by.
    await off.page.evaluate(() => localStorage.removeItem('df-connect'));
    await off.page.reload();
    await expect(off.page.locator('#view .band')).toBeVisible();
    await expect(off.page.locator('#view .today-calm h2')).toHaveText('No one here yet.');
    await off.ctx.close();
  });
});
