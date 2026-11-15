// Shared steps for the person page and search browser tests: the shelf at
// phone size, and people in all four notebooks, as each notebook would tell
// the one list of people (shared/data/people-things.js).
import { freshPage } from './_helpers.mjs';

export async function onShelf(browser, testInfo) {
  const r = await freshPage(browser, testInfo, '/', { returning: true });
  await r.page.setViewportSize({ width: 390, height: 844 });
  await r.page.reload();
  return r;
}
// June in all four notebooks; another June Park on Instagram; Leo with nothing but a shoot.
export function seed(p) {
  return p.evaluate(async () => {
    const D = window.DFData;
    const june = { name: 'June Park', instagram: 'junepark.jpg', role: 'Talent' };
    await D.publishThings('rounds', [{ id: 'r1', kind: 'person', title: 'June Park', line: 'Check in, due 2 Dec', people: [{ ...june, roundsId: 'r1', at: '2026-11-01' }], params: { person: 'r1' }, more: { next: { title: 'Plan the next one' }, group: 'Regular since August' } }]);
    await D.publishThings('the-eye', [
      { id: 's1', kind: 'shoot', title: 'Rooftop portraits', line: '7 Nov · Delivered', day: '2026-11-07', people: [{ name: 'June Park', role: 'Talent' }], params: { shoot: 's1' } },
      { id: 's2', kind: 'shoot', title: 'Garden test', line: '21 Oct · Delivered', day: '2026-10-21', people: [june, { name: 'Leo Grant' }], params: { shoot: 's2' } },
      { id: 's3', kind: 'shoot', title: 'Beach', line: '1 Oct · Delivered', day: '2026-10-01', people: [{ name: 'June Park', instagram: 'june.other' }], params: { shoot: 's3' } },
    ]);
    await D.publishThings('ref', [{ id: 'b1', kind: 'board', title: 'Rooftop, golden hour', line: '6 pages · for Rooftop portraits', people: [june], params: { board: 'b1' } }]);
    await D.publishThings('contact-sheet', [{ id: 'l1', kind: 'post', title: 'Rooftop post', people: [{ instagram: 'junepark.jpg' }] }]);
    const all = await D.peopleAll();
    return { june: all.find((x) => x.instagram === 'junepark.jpg').id, leo: all.find((x) => x.name === 'Leo Grant').id };
  });
}
