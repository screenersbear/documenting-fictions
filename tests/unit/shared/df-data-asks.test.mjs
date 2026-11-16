// shared/data/asks.js: asks for Rounds, left in df-links by The Eye and the
// person page, and SO FAR as it will be once Rounds takes them.
import { describe, it, expect, beforeEach } from 'vitest';
import { loadDFData } from './_env.mjs';

let D;
beforeEach(async () => { D = await loadDFData(); });

const HOWS = { move: [['text', 'Text', 'by text'], ['email', 'Email', 'by email']], note: [['call', 'A call', 'a call']] };
const rows = [
  { id: 'a', day: '2026-11-15', look: 'thanks', what: 'Said thanks', how: 'text', howWords: 'by text', note: '', noteOnly: false },
  { id: 'n', day: '2026-11-02', look: 'note', what: 'Note', how: 'call', howWords: 'a call', note: 'Booked.', noteOnly: true },
  { id: '', day: '2026-10-01', look: 'pitch', what: 'Lindsey said yes', how: '', howWords: '', note: '', noteOnly: false },
];
const ask = (id, a) => ({ id, ask: a });

describe('askRounds and roundsAsks', () => {
  it('keeps an ask as a rounds-ask link to the person, until Rounds takes it', async () => {
    const l = await D.askRounds('shelf', { do: 'note', personId: 'p', note: 'Hi' });
    expect(l).toMatchObject({ fromApp: 'shelf', toApp: 'rounds', toId: 'p', type: 'rounds-ask', ask: { do: 'note', personId: 'p', note: 'Hi' } });
    expect((await D.roundsAsks('p')).map((x) => x.id)).toEqual([l.id]);
    expect(await D.roundsAsks('q')).toEqual([]);
    expect((await D.roundsAsks()).length).toBe(1);
    await D.saveLink({ ...l, takenAt: '2026-11-15T10:00:00Z' });
    expect(await D.roundsAsks('p')).toEqual([]);
  });
  it('other links aren\'t asks', async () => {
    await D.saveLink({ fromApp: 'contact-sheet', fromId: 'x', toApp: 'rounds', toId: '', type: 'post-people' });
    expect(await D.roundsAsks()).toEqual([]);
  });
});

describe('doneWithAsks', () => {
  it('a note waiting goes first, in its words', () => {
    const out = D.doneWithAsks(rows, [ask('k', { do: 'note', day: '2026-11-15', how: 'call', note: 'Rang her.' })], HOWS);
    expect(out[0]).toEqual({ id: 'ask:k', day: '2026-11-15', look: 'note', what: 'Note', how: 'call', howWords: 'a call', note: 'Rang her.', noteOnly: true, pending: true });
    expect(out.slice(1)).toEqual(rows);
  });
  it('a moment waiting goes first, as Rounds says it (The Eye\'s selects reminder)', () => {
    const chips = { ...HOWS, moment: [['instagram', 'Messaged on Instagram', 'Messaged on Instagram'], ['other', 'Other', 'A moment']] };
    const out = D.doneWithAsks(rows, [ask('k', { do: 'moment', day: '2026-11-16', what: 'instagram', note: 'Any picks yet?', keeps: true })], chips);
    expect(out[0]).toEqual({ id: 'ask:k', day: '2026-11-16', look: 'moment', mark: 'rounds', what: 'Messaged on Instagram', how: 'instagram', howWords: '', note: 'Any picks yet?', noteOnly: false, pending: true });
    expect(out.slice(1)).toEqual(rows);
    expect(D.doneWithAsks([], [ask('k', { do: 'moment', what: 'other' })], chips)[0]).toMatchObject({ day: '', what: 'A moment', how: 'other', note: '' });
    expect(D.doneWithAsks([], [ask('k', { do: 'moment' })], null)[0]).toMatchObject({ what: 'A moment', how: '' });
  });
  it('a row changed: the how in its own list\'s words, and the note', () => {
    const out = D.doneWithAsks(rows, [ask('k', { do: 'edit', lineId: 'a', how: 'email', note: 'Long one.' }), ask('j', { do: 'edit', lineId: 'n', how: 'email', note: '' })], HOWS);
    expect(out[0]).toMatchObject({ id: 'a', how: 'email', howWords: 'by email', note: 'Long one.' });
    expect(out[1]).toMatchObject({ id: 'n', how: 'email', howWords: '', note: '' });
    expect(D.doneWithAsks(rows, [ask('k', { do: 'edit', lineId: 'a' })], HOWS)[0]).toMatchObject({ id: 'a', how: '', howWords: '', note: '' });
  });
  it('a note deleted is gone; the answer row (no id) stays', () => {
    expect(D.doneWithAsks(rows, [ask('k', { do: 'drop', lineId: 'n' }), ask('j', { do: 'drop', lineId: '' })], HOWS).map((r) => r.id)).toEqual(['a', '']);
  });
  it('done asks and odd ones change nothing; no rows, asks or chips is fine', () => {
    expect(D.doneWithAsks(rows, [ask('k', { do: 'done' }), {}, null], HOWS)).toEqual(rows);
    expect(D.doneWithAsks(null, null, null)).toEqual([]);
    expect(D.doneWithAsks([], [ask('k', { do: 'note', how: 'call' })], null)[0]).toMatchObject({ day: '', howWords: '', note: '' });
    expect(D.doneWithAsks([], [ask('k', { do: 'note' })], HOWS)[0]).toMatchObject({ how: '', howWords: '' });
  });
});
