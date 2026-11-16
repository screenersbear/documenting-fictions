// What the other notebooks ask Rounds to do (round 2, thanks): they never
// write Rounds' data, so they leave an ask in df-links (a 'rounds-ask' link,
// shared/data/asks.js) and Rounds does it here, with its own functions, the
// next time it opens. The Eye's SHE WROTE FIRST: the Say thanks done, with
// its note; its selects reminder sent: a moment (Texted, or Messaged on
// Instagram, with what was said: data/moments.js). From before 16 Nov, the
// shelf's ADD A NOTE, a row's how and note changed, and a note on its own
// deleted (a reminder was a note then too). Each ask is taken once.
import { listPeople, savePerson, listMoves, logMove, dropMove } from './db.js';
import { markDone } from './person.js';
import { withHowNote, noteLine, NOTE_HOWS_KEPT, HOWS, NOTE_KIND } from './done-notes.js';
import { momentLine, afterMoment } from './moments.js';
import { dayOf } from './dates.js';
import { uuid } from '../components/util.js';

// One ask, worked out: { person (changed, or null), put (a line to save, or
// null), drop (a line id to take out, or '') }. Nothing to do: all empty.
export function askResult(ask, people, lines, today, makeId, now) {
  const none = { person: null, put: null, drop: '' };
  const a = ask && typeof ask === 'object' ? ask : {};
  const person = people.find((p) => p.id === a.personId && !p.letGo);
  const line = lines.find((l) => l.id === a.lineId);
  if (a.do === 'done') {
    if (!person || !person.next || person.next.kind !== a.kind) return none; // done already, or changed since
    const { person: after, log } = markDone(person, today);
    return { person: after, put: withHowNote({ id: makeId(), at: now, ...log }, { how: a.how, note: a.note }), drop: '' };
  }
  if (a.do === 'note') {
    if (!person || (!a.note && !a.how)) return none;
    return { ...none, put: noteLine(person.id, a.day || today, a, makeId(), now) };
  }
  if (a.do === 'moment') {
    if (!person) return none;
    const r = afterMoment(person, momentLine(person.id, { ...a, day: a.day || today }, makeId(), now));
    return { person: r.person === person ? null : r.person, put: r.line, drop: '' };
  }
  if (a.do === 'edit' && line) return { ...none, put: withHowNote(line, { how: a.how, note: a.note, said: line.said }, line.kind === NOTE_KIND ? NOTE_HOWS_KEPT : HOWS) };
  if (a.do === 'drop' && line && line.kind === NOTE_KIND) return { ...none, drop: line.id };
  return none;
}

// Takes every ask waiting, oldest first. Gives how many changed something.
export async function takeAsks() {
  const D = window.DFData;
  if (!D || !D.linksWhere) return 0;
  const waiting = (await D.linksWhere({ toApp: 'rounds', type: 'rounds-ask' })).filter((l) => !l.takenAt);
  if (!waiting.length) return 0;
  let [people, lines] = await Promise.all([listPeople(), listMoves()]);
  let did = 0;
  for (const link of waiting) {
    const r = askResult(link.ask, people, lines, dayOf(), uuid, Date.now());
    if (r.person) { await savePerson(r.person); people = people.map((p) => (p.id === r.person.id ? r.person : p)); }
    if (r.put) { await logMove(r.put); lines = [...lines.filter((l) => l.id !== r.put.id), r.put]; }
    if (r.drop) { await dropMove(r.drop); lines = lines.filter((l) => l.id !== r.drop); }
    if (r.person || r.put || r.drop) did++;
    await D.saveLink({ ...link, takenAt: new Date().toISOString() });
  }
  return did;
}
