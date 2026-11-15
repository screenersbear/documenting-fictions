// the-eye/components/talent-since.js: under a talent on a shoot's front page
// (round 2, connect/09), LAST TIME, Rounds' line since that shoot, and
// EVERYTHING WITH <NAME>.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadDFData } from '../shared/_env.mjs';

let D;
beforeEach(async () => {
  D = await loadDFData();
  delete window.EyeParts;
  await import('../../../the-eye/components/talent-since.js?' + Math.random());
});
afterEach(() => { vi.restoreAllMocks(); delete window.DF_SUITE; document.body.innerHTML = ''; });

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function app(shoots = []) {
  const ed = {
    state: { shoots },
    // As The Eye's own (components/helpers.js): quotes are left as they are.
    escapeHtml: (v) => { const d = document.createElement('div'); d.textContent = v == null ? '' : String(v); return d.innerHTML; },
    hasText: (v) => typeof v === 'string' && v.trim() !== '',
    isPostCaptureStatus: (st) => ['captured', 'delivered'].includes(st),
    dayWords: (d) => { const m = /^\d{4}-(\d{2})-(\d{2})$/.exec(d || ''); return m ? `${Number(m[2])} ${MONTHS[Number(m[1]) - 1]}` : ''; },
  };
  window.EyeParts.addTalentSince(ed);
  return ed;
}
const june = { name: 'June Park', socialHandles: [{ platform: 'instagram', handle: 'junepark.jpg' }, { platform: 'tiktok', handle: 'june.tt' }] };
const shoot = (id, o) => ({ id, title: id, status: 'delivered', date: '2026-08-12', talents: [{ name: ' june  park ' }], ...o });
const now = { id: 'now', status: 'waiting_to_shoot', date: '2026-12-05', talents: [june] };

describe('addTalentSince', () => {
  it('adds what it does, and keeps the parts already there', async () => {
    const ed = {};
    window.EyeParts.addTalentSince(ed);
    expect(Object.keys(ed)).toEqual(['talentPast', 'sinceLine', 'talentSinceHtml', 'fillTalentSince']);
    window.EyeParts.other = 1;
    await import('../../../the-eye/components/talent-since.js?again');
    expect(window.EyeParts.other).toBe(1);
  });
});

describe('talentPast', () => {
  it('counts their shoots, and finds the newest shot and the newest with lessons', () => {
    const shoots = [now, shoot('a', { date: '2026-11-07' }), shoot('b', { lessonsLearned: 'Start easy.' }), shoot('c', { status: 'waiting_to_shoot', date: '2026-11-20', lessonsLearned: 'x' }), shoot('d', { date: '', lessonsLearned: 'y' }), shoot('e', { talents: [{ name: 'Leo' }, {}] })];
    const p = app(shoots).talentPast(june, now);
    expect([p.count, p.last.id, p.lessons.id]).toEqual([5, 'a', 'b']);
  });
  it('a first shoot: none before', () => {
    expect(app([now, shoot('x', { talents: [{ name: '' }] })]).talentPast(june, now)).toEqual({ count: 1, last: null, lessons: null });
    expect(app([now]).talentPast({ name: 'Ana', socialHandles: [] }, { id: 'new' })).toEqual({ count: 1, last: null, lessons: null });
    expect(app([now, { id: 'bare', status: 'delivered', date: '2026-01-01' }]).talentPast(june, now).count).toBe(1); // a shoot with no talent list
  });
});

describe('sinceLine', () => {
  const h = [{ day: '2026-11-14', words: 'June said yes' }, { day: '2026-11-12', words: 'you checked in' }, { day: '2026-11-10', words: 'you said hello' }, { day: '2026-08-01', words: 'you pitched June' }];
  it('says the two newest things since that day, each with its day', () => {
    expect(app().sinceLine(h, '2026-08-12')).toBe('Since then: June said yes (14 Nov). You checked in (12 Nov).');
    expect(app().sinceLine(h.slice(2), '2026-08-12')).toBe('Since then: you said hello (10 Nov).');
  });
  it('nothing since, no day to count from, or nothing from Rounds: no line', () => {
    expect(app().sinceLine(h, '2026-11-14')).toBe('');
    expect(app().sinceLine(h, '')).toBe('');
    expect(app().sinceLine(undefined, '2026-08-12')).toBe('');
    expect(app().sinceLine([null, { day: '2026-11-14', words: ' ' }], '2026-08-12')).toBe('');
  });
});

describe('talentSinceHtml', () => {
  it("gives LAST TIME from that shoot's lessons, and a place for Rounds' line", () => {
    const ed = app([now, shoot('a', { date: '2026-11-07', lessonsLearned: ' She warms up after the first look. ' })]);
    document.body.innerHTML = ed.talentSinceHtml(june, now);
    expect(document.querySelector('.front-last-head').textContent).toBe('Last time with June, 7 Nov');
    expect(document.querySelector('.front-last-text').textContent).toBe('She warms up after the first look.');
    expect(JSON.parse(decodeURIComponent(document.querySelector('[data-since]').dataset.since))).toEqual({ name: 'June Park', instagram: 'junepark.jpg', tiktok: 'june.tt', after: '2026-11-07' });
  });
  it('no lessons, or a first shoot: only the place', () => {
    const ed = app([now, shoot('a', { date: '2026-11-07' })]);
    document.body.innerHTML = ed.talentSinceHtml({ name: 'June Park', socialHandles: [null] }, now);
    expect(document.querySelector('.front-last-head')).toBeNull();
    expect(JSON.parse(decodeURIComponent(document.querySelector('[data-since]').dataset.since))).toEqual({ name: 'June Park', instagram: '', tiktok: '', after: '2026-11-07' });
    document.body.innerHTML = app([now]).talentSinceHtml(june, now);
    expect(JSON.parse(decodeURIComponent(document.querySelector('[data-since]').dataset.since)).after).toBe('');
  });
});

describe('fillTalentSince', () => {
  async function seed(happened) {
    await D.publishThings('rounds', [{ id: 'r1', kind: 'person', title: 'June Park', people: [{ name: 'June Park', instagram: 'junepark.jpg', roundsId: 'r1', at: '' }], more: { happened } }]);
  }
  const box = (ed, t = june) => { document.body.innerHTML = `<div id="b">${ed.talentSinceHtml(t, now)}</div>`; return document.getElementById('b'); };
  it("fills in Rounds' line since their last shoot, and EVERYTHING WITH in the suite", async () => {
    window.DF_SUITE = {};
    await seed([{ day: '2026-11-14', words: 'June said yes' }, { day: '2026-11-12', words: 'you checked in' }]);
    const ed = app([now, shoot('a', { date: '2026-11-07' })]);
    const b = box(ed);
    await ed.fillTalentSince(b);
    expect(b.querySelector('.front-rounds').textContent).toBe('Since then: June said yes (14 Nov). You checked in (12 Nov).');
    expect(b.querySelector('.front-rounds .df-mini')).not.toBeNull();
    const [r] = await D.peopleAll();
    expect(b.querySelector('.front-everything').getAttribute('href')).toBe(`../?person=${r.id}`);
    expect(b.querySelector('.front-everything').textContent.trim()).toBe('Everything with June');
  });
  it('outside the suite, no link; nothing from Rounds, no line', async () => {
    await seed([{ day: '2026-08-01', words: 'you pitched June' }]);
    const ed = app([now, shoot('a', { date: '2026-11-07' })]);
    const b = box(ed);
    await ed.fillTalentSince(b);
    expect(b.querySelector('.front-since').innerHTML).toBe('');
  });
  it('someone only The Eye knows: the link alone, by their name', async () => {
    window.DF_SUITE = {};
    await D.publishThings('the-eye', [{ id: 's1', title: 'Shoot', people: [{ instagram: 'ana.j' }] }]);
    const ed = app([now]);
    const b = box(ed, { name: 'Ana Lima', socialHandles: [{ platform: 'instagram', handle: 'ana.j' }] });
    await ed.fillTalentSince(b);
    expect(b.querySelector('.front-rounds')).toBeNull();
    expect(b.querySelector('.front-everything').textContent.trim()).toBe('Everything with Ana');
  });
  it("leaves it empty for someone the list doesn't know, a page drawn again meanwhile, or a list that can't be read", async () => {
    window.DF_SUITE = {};
    const ed = app([now]);
    let b = box(ed, { name: 'Nobody' });
    await ed.fillTalentSince(b);
    expect(b.querySelector('.front-since').innerHTML).toBe('');
    await seed([]);
    b = box(ed);
    const gone = b.querySelector('[data-since]');
    const found = D.personFor;
    vi.spyOn(D, 'personFor').mockImplementation(async (f) => { const r = await found(f); gone.remove(); return r; });
    await ed.fillTalentSince(b);
    expect(gone.innerHTML).toBe('');
    vi.restoreAllMocks();
    vi.spyOn(D, 'personFor').mockRejectedValue(new Error('blocked'));
    b = box(ed);
    await ed.fillTalentSince(b);
    expect(b.querySelector('.front-since').innerHTML).toBe('');
    vi.restoreAllMocks();
    vi.spyOn(D, 'personView').mockRejectedValue(new Error('blocked'));
    b = box(ed);
    await ed.fillTalentSince(b);
    expect(b.querySelector('.front-rounds')).toBeNull();
    expect(b.querySelector('.front-everything')).not.toBeNull();
  });
  it('does nothing without the shared files', async () => {
    const ed = app([now]);
    const b = box(ed);
    delete window.DFData;
    await ed.fillTalentSince(b);
    expect(b.querySelector('.front-since').innerHTML).toBe('');
  });
});
