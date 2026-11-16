// the-eye/components/say-thanks.js: on a shoot's page once it's captured
// (round 2, thanks/01), a card FROM ROUNDS for each person from the shoot
// with a Say thanks waiting there; <NAME> WROTE FIRST asks Rounds to mark it done.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadDFData } from '../shared/_env.mjs';

let D;
beforeEach(async () => {
  D = await loadDFData();
  delete window.EyeParts;
  await import('../../../the-eye/components/say-thanks.js?' + Math.random());
});
afterEach(() => { vi.restoreAllMocks(); delete window.DF_SUITE; document.body.innerHTML = ''; });

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function app() {
  const ed = {
    escapeHtml: (v) => { const d = document.createElement('div'); d.textContent = v == null ? '' : String(v); return d.innerHTML; },
    hasText: (v) => typeof v === 'string' && v.trim() !== '',
    isPostCaptureStatus: (st) => ['captured', 'editing', 'delivered'].includes(st),
    dayWords: (d) => { const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(d || ''); return m ? `${Number(m[2])} ${MONTHS[Number(m[1]) - 1]}` : ''; },
  };
  window.EyeParts.addSayThanks(ed);
  return ed;
}
const T = '2026-11-15';
const shoot = (o) => ({ id: 's1', status: 'captured', date: '2026-11-14', talents: [{ name: 'Lindsey Tran', socialHandles: [{ platform: 'instagram', handle: 'lindsey.t' }] }], teamMembers: [{ name: 'Jules', socialPlatform: 'tiktok', socialHandle: 'jules' }, { name: 'Sam', socialHandle: 'sam.k' }, { name: ' ' }], ...o });
const roundsThing = (id, name, handle, thanks, covers = []) => ({ id, kind: 'person', title: name, people: [{ name, instagram: handle, roundsId: id, at: '' }], more: { thanks }, covers });
const view = (thanks, id = 'r1') => ({ person: { name: 'Lindsey Tran' }, rounds: { id, more: { thanks } } });

describe('thanksWaiting', () => {
  it("Rounds' Say thanks for this shoot", () => {
    expect(app().thanksWaiting(view({ due: T, shoots: ['s0', 's1'] }), 's1')).toEqual({ roundsId: 'r1', due: T });
    expect(app().thanksWaiting(view({ shoots: ['s1'] }), 's1')).toEqual({ roundsId: 'r1', due: '' });
  });
  it('none for another shoot, no thanks waiting, or no one in Rounds', () => {
    const ed = app();
    expect(ed.thanksWaiting(view({ due: T, shoots: ['s0'] }), 's1')).toBeNull();
    expect(ed.thanksWaiting(view({ due: T }), 's1')).toBeNull();
    expect(ed.thanksWaiting(view(null), 's1')).toBeNull();
    expect(ed.thanksWaiting({ rounds: null }, 's1')).toBeNull();
    expect(ed.thanksWaiting({ rounds: { id: 'r', more: undefined } }, 's1')).toBeNull();
    expect(ed.thanksWaiting(null, 's1')).toBeNull();
  });
});

describe('thanksWhen', () => {
  it('TODAY when due or overdue, TOMORROW the day before', () => {
    const ed = app();
    expect(ed.thanksWhen(T, T)).toBe('Today');
    expect(ed.thanksWhen('2026-11-01', T)).toBe('Today');
    expect(ed.thanksWhen('', T)).toBe('Today');
    expect(ed.thanksWhen('2026-11-16', T)).toBe('Tomorrow');
  });
  it('the day, further off; across a month and a year end', () => {
    const ed = app();
    expect(ed.thanksWhen('2026-11-20', T)).toBe('20 Nov');
    expect(ed.thanksWhen('2026-12-01', '2026-11-30')).toBe('Tomorrow');
    expect(ed.thanksWhen('2027-01-01', '2026-12-31')).toBe('Tomorrow');
  });
});

describe('sayThanksHtml', () => {
  it('FROM ROUNDS, when, the photo, Say thanks to <first name>, OPEN ROUNDS and <NAME> WROTE FIRST', () => {
    window.DF_SUITE = {};
    document.body.innerHTML = app().sayThanksHtml('Lindsey Tran', 'blob:x', 'Tomorrow', 'r1');
    expect(document.querySelector('.df-slip-tag').textContent).toBe('From Rounds');
    expect(document.querySelector('.df-slip-when').textContent).toBe('Tomorrow');
    expect(document.querySelector('.eye-thanks-photo img').getAttribute('src')).toBe('blob:x');
    expect(document.querySelector('.df-slip-title').textContent).toBe('Say thanks to Lindsey');
    expect(document.querySelector('.df-slip-line').textContent).toBe("A text the day after, while it's fresh.");
    expect(document.querySelector('.eye-thanks-open').getAttribute('href')).toBe('../rounds/?person=r1&move=1');
    expect(document.querySelector('[data-wrote-first]').textContent).toBe('Lindsey wrote first');
  });
  it('no photo; outside the suite OPEN ROUNDS goes nowhere', () => {
    document.body.innerHTML = app().sayThanksHtml('', '', 'Today', 'r1');
    expect(document.querySelector('.eye-thanks-photo img')).toBeNull();
    expect(document.querySelector('.df-slip-title').textContent).toBe('Say thanks to them');
    expect(document.querySelector('.eye-thanks-open').getAttribute('href')).toBe('#');
  });
});

describe('fillSayThanks', () => {
  const pic = { type: 'image/png', bytes: new Uint8Array([1, 2]).buffer };
  async function seed() {
    vi.spyOn(D, 'pictureUrl').mockReturnValue('blob:lindsey'); // jsdom can't make addresses for bytes
    await D.publishThings('rounds', [
      roundsThing('r1', 'Lindsey Tran', 'lindsey.t', { due: '2026-11-16', shoots: ['s1'] }, [pic]),
      roundsThing('r2', 'Sam K', 'sam.k', { due: T, shoots: ['s1'] }),
      roundsThing('r3', 'Jules', '', { due: T, shoots: ['s0'] }),
    ]);
  }
  it('a card for each person with a thanks waiting for this shoot, talent first', async () => {
    await seed();
    const box = document.createElement('div');
    document.body.append(box);
    await app().fillSayThanks(box, shoot(), T);
    expect([...box.querySelectorAll('[data-thanks]')].map((c) => [c.dataset.thanks, c.querySelector('.df-slip-when').textContent])).toEqual([['r1', 'Tomorrow'], ['r2', 'Today']]);
    expect(box.querySelector('img').getAttribute('src')).toBe('blob:lindsey');
  });
  it('WROTE FIRST asks Rounds to do it, with the note, and the card goes', async () => {
    await seed();
    const box = document.createElement('div');
    document.body.append(box);
    const ed = app();
    await ed.fillSayThanks(box, shoot(), T);
    box.querySelector('[data-thanks="r1"] [data-wrote-first]').click();
    await vi.waitFor(async () => expect((await D.roundsAsks('r1')).length).toBe(1));
    expect((await D.roundsAsks('r1'))[0]).toMatchObject({ fromApp: 'the-eye', ask: { do: 'done', personId: 'r1', kind: 'thanks', note: 'Lindsey reached out first.' } });
    expect(box.querySelector('[data-thanks="r1"]')).toBeNull();
    await ed.fillSayThanks(box, shoot(), T); // drawn again before Rounds takes it: still gone
    expect([...box.querySelectorAll('[data-thanks]')].map((c) => c.dataset.thanks)).toEqual(['r2']);
  });
  it('the same person twice on a shoot gets one card', async () => {
    await seed();
    const box = document.createElement('div');
    document.body.append(box);
    await app().fillSayThanks(box, shoot({ teamMembers: [{ name: 'Lindsey Tran', socialHandle: 'lindsey.t' }] }), T);
    expect(box.querySelectorAll('[data-thanks]')).toHaveLength(1);
  });
  it('nothing before the shoot, outside the shared files, with no box, or a box gone meanwhile', async () => {
    await seed();
    const box = document.createElement('div');
    document.body.append(box);
    const ed = app();
    await ed.fillSayThanks(box, shoot({ status: 'waiting_to_shoot' }), T);
    expect(box.innerHTML).toBe('');
    await ed.fillSayThanks(null, shoot(), T);
    const loose = document.createElement('div');
    await ed.fillSayThanks(loose, shoot(), T);
    expect(loose.innerHTML).toBe('');
    const keep = window.DFData;
    delete window.DFData;
    await ed.fillSayThanks(box, shoot());
    window.DFData = keep;
    expect(box.innerHTML).toBe('');
  });
  it('no one on the shoot, or no one the list knows: no cards; today by default', async () => {
    const box = document.createElement('div');
    document.body.append(box);
    await app().fillSayThanks(box, shoot({ talents: undefined, teamMembers: undefined }));
    expect(box.innerHTML).toBe('');
    vi.spyOn(D, 'personFor').mockRejectedValue(new Error('x'));
    await app().fillSayThanks(box, shoot(), T);
    expect(box.innerHTML).toBe('');
  });
  it('handles missing or odd, a view that fails, and a person with no name on the list', async () => {
    await seed();
    const box = document.createElement('div');
    document.body.append(box);
    const views = D.personView;
    let calls = 0;
    vi.spyOn(D, 'personView').mockImplementation(async (id) => {
      calls++;
      if (calls === 1) throw new Error('gone');
      const v = await views(id);
      return v ? { ...v, person: { ...v.person, name: '' } } : v;
    });
    const odd = shoot({
      talents: [{ name: 'Lindsey Tran', socialHandles: [null, { platform: 'instagram' }] }, { name: 'Cy' }, { name: 'Sam K', socialHandles: [{ platform: 'instagram', handle: 'sam.k' }] }],
      teamMembers: [{ name: 'Rae', socialPlatform: 'instagram' }, { name: 'Bo', socialPlatform: 'tiktok' }, null],
    });
    await app().fillSayThanks(box, odd, T);
    expect([...box.querySelectorAll('.df-slip-title')].map((t) => t.textContent)).toEqual(['Say thanks to Sam']);
  });
});
