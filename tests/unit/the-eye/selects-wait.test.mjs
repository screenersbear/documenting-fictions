// the-eye/components/selects-wait.js: waiting on selects (selects/NOTES.md, 16 Nov).
import { describe, it, expect, vi } from 'vitest';

delete window.EyeParts;
await import('../../../the-eye/components/selects-wait.js');

const NAMES = ['SELECTS_STARTER', 'isWaitingOnSelects', 'stampWaiting', 'selectsPerson', 'selectsDays', 'selectsDue', 'selectsAskAgain',
  'proofsSentWords', 'remindedWords', 'selectsMessage', 'selectsShootName', 'selectsGroup', 'selectsHow'];
const ed = { dayWords: (d) => `day ${d}` };
window.EyeParts.addSelectsWait(ed);

// Noon on a day, here, as the app saves it (an ISO time).
const at = (y, m, d, h = 12) => new Date(y, m - 1, d, h).toISOString();
const june = { name: 'June Park', socialHandles: [{ platform: 'tiktok', handle: 'jp' }, { platform: 'instagram', handle: '@junepark.jpg' }] };
const waiting = (o = {}) => ({ id: 's1', status: 'waiting_for_selects', archived: false, proofsSentAt: at(2026, 11, 12), talents: [june], ...o });

describe('addSelectsWait', () => {
  it('adds the selects helpers and nothing else', () => {
    expect(Object.keys(ed).filter(k => k !== 'dayWords')).toEqual(NAMES);
  });
  it('keeps the parts already on window.EyeParts', async () => {
    window.EyeParts.other = 1;
    vi.resetModules();
    await import('../../../the-eye/components/selects-wait.js');
    expect(window.EyeParts.other).toBe(1);
    expect(typeof window.EyeParts.addSelectsWait).toBe('function');
  });
});

describe('waiting', () => {
  it('is a shoot at Waiting for selects, not archived', () => {
    expect(ed.isWaitingOnSelects(waiting())).toBe(true);
    expect(ed.isWaitingOnSelects(waiting({ archived: true }))).toBe(false);
    expect(ed.isWaitingOnSelects(waiting({ status: 'editing' }))).toBe(false);
    expect(ed.isWaitingOnSelects(null)).toBe(false);
  });
  it('a shoot already waiting with no date counts from now, and says so', () => {
    const shoots = [waiting({ proofsSentAt: undefined }), waiting({ id: 's2' }), { id: 's3', status: 'editing' }, null];
    expect(ed.stampWaiting(shoots, 'NOW')).toBe(true);
    expect(shoots.map(s => s && s.proofsSentAt)).toEqual(['NOW', at(2026, 11, 12), undefined, null]);
    expect(ed.stampWaiting(shoots, 'LATER')).toBe(false);
    expect(ed.stampWaiting(undefined, 'NOW')).toBe(false);
  });
});

describe('who', () => {
  it('is the talent who booked you, or the first talent with a name', () => {
    expect(ed.selectsPerson(waiting())).toEqual({ name: 'June Park', first: 'June', instagram: 'junepark.jpg' });
    const booked = waiting({ talents: [{ name: ' ' }, june, { name: 'Iryna V.', bookedMe: true, socialHandles: [] }] });
    expect(ed.selectsPerson(booked)).toEqual({ name: 'Iryna V.', first: 'Iryna', instagram: '' });
    expect(ed.selectsPerson(waiting({ talents: [] }))).toBe(null);
    expect(ed.selectsPerson(waiting({ talents: undefined }))).toBe(null);
    expect(ed.selectsPerson(null)).toBe(null);
  });
  it('went on Instagram when the sheet opened it, else as a text', () => {
    expect(ed.selectsHow(true)).toBe('instagram');
    expect(ed.selectsHow(false)).toBe('text');
  });
});

describe('days', () => {
  it('count whole days here since the proofs went out', () => {
    expect(ed.selectsDays(waiting(), '2026-11-12')).toBe(0);
    expect(ed.selectsDays(waiting({ proofsSentAt: at(2026, 11, 12, 23) }), '2026-11-13')).toBe(1);
    expect(ed.selectsDays(waiting(), '2026-11-16')).toBe(4);
    expect(ed.selectsDays(waiting({ proofsSentAt: 'nonsense' }), '2026-11-16')).toBe(0);
    expect(ed.selectsDays(waiting({ proofsSentAt: at(2026, 11, 20) }), '2026-11-16')).toBe(0);
  });
  it('come up on Today from the 3rd, unless put off past today', () => {
    expect(ed.selectsDue(waiting(), '2026-11-14')).toBe(false);
    expect(ed.selectsDue(waiting(), '2026-11-15')).toBe(true);
    expect(ed.selectsDue(waiting({ selectsAskAfter: '2026-11-18' }), '2026-11-16')).toBe(false);
    expect(ed.selectsDue(waiting({ selectsAskAfter: '2026-11-18' }), '2026-11-18')).toBe(true);
    expect(ed.selectsDue(waiting({ proofsSentAt: '' }), '2026-11-30')).toBe(false);
    expect(ed.selectsDue(waiting({ status: 'editing' }), '2026-11-30')).toBe(false);
  });
  it('put off three days at a time', () => {
    expect(ed.selectsAskAgain('2026-11-16')).toBe('2026-11-19');
    expect(ed.selectsAskAgain('2026-11-30')).toBe('2026-12-03');
  });
});

describe('words', () => {
  it('say how long since the proofs went out, and to whom', () => {
    const p = ed.selectsPerson(waiting());
    expect(ed.proofsSentWords(p, 4)).toBe('Proofs sent to June 4 days ago.');
    expect(ed.proofsSentWords(p, 1)).toBe('Proofs sent to June 1 day ago.');
    expect(ed.proofsSentWords(p, 0)).toBe('Proofs sent to June today.');
    expect(ed.proofsSentWords(null, 2)).toBe('Proofs sent 2 days ago.');
  });
  it('say the latest reminder', () => {
    expect(ed.remindedWords(waiting({ selectsReminders: [{ day: '2026-11-13', to: 'June' }, { day: '2026-11-16', to: 'June' }] }))).toBe('Reminded June, day 2026-11-16.');
    expect(ed.remindedWords(waiting({ selectsReminders: [{ day: '2026-11-16' }] }))).toBe('Reminded them, day 2026-11-16.');
    expect(ed.remindedWords(waiting())).toBe('');
    expect(ed.remindedWords(null)).toBe('');
  });
  it('fill in the reminder, from the starter or your own', () => {
    const p = ed.selectsPerson(waiting());
    expect(ed.selectsMessage('', p, 'Rooftop portraits')).toBe("Hi June! Just checking you got the proofs from Rooftop portraits. No rush, send your picks whenever you're ready.");
    expect(ed.selectsMessage('[name], picks from [shoot]? [name]!', p, 'Rooftop')).toBe('June, picks from Rooftop? June!');
    expect(ed.selectsMessage('Hi [name], [shoot]', null, '')).toBe('Hi there, the shoot');
  });
});

describe('which shoot', () => {
  it('is named by its title, its project, else its day', () => {
    expect(ed.selectsShootName(waiting({ title: ' Rooftop portraits ' }), 'Holiday')).toBe('Rooftop portraits');
    expect(ed.selectsShootName(waiting({ title: '' }), 'Holiday')).toBe('Holiday');
    expect(ed.selectsShootName(waiting({ date: '2026-11-12' }))).toBe('the day 2026-11-12 shoot');
    expect(ed.selectsShootName(waiting())).toBe('the shoot');
    expect(ed.selectsShootName(null)).toBe('the shoot');
  });
  it("is asked about with its project's other days still waiting", () => {
    const shoots = [
      waiting({ id: 'a', projectId: 'p' }), waiting({ id: 'b', projectId: 'p' }), waiting({ id: 'c', projectId: 'p', status: 'editing' }),
      waiting({ id: 'd', projectId: 'q' }), waiting({ id: 'e' }), null,
    ];
    expect(ed.selectsGroup(shoots, 'b').map(s => s.id)).toEqual(['a', 'b']);
    expect(ed.selectsGroup(shoots, 'c').map(s => s.id)).toEqual(['a', 'b', 'c']);
    expect(ed.selectsGroup(shoots, 'e').map(s => s.id)).toEqual(['e']);
    expect(ed.selectsGroup(shoots, 'zz')).toEqual([]);
    expect(ed.selectsGroup(undefined, 'a')).toEqual([]);
  });
});
