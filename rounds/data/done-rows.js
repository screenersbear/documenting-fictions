// DONE TODAY's rows on Today (rounds/12 and 13, 16 Nov): a move or moment
// done today, as its row says it. The words come in three parts, so the
// name can be bold: "Said thanks to " + "Maya R." + "", with how it was
// done after (" · text"), and under it the first line of what you said
// (for a moment, or a move with nothing said, its note's). The mark: the
// move's own, Rounds' for a moment.
import { moveLook } from './kinds.js';
import { MOMENT_KIND, MOMENT_WITH } from './moments.js';
import { withWhat } from './one-move.js';

// How, short ("· text", "· Instagram"), after a move.
const HOW_SHORT = { text: 'text', instagram: 'Instagram', email: 'email', person: 'in person' };
const firstLine = (s) => String(s ?? '').split('\n').map((l) => l.trim()).find(Boolean) || '';

// done: { line, person } (data/today.js doneOn).
export function doneRow({ line, person }) {
  const moment = line.kind === MOMENT_KIND;
  const words = moment ? MOMENT_WITH[line.what] || MOMENT_WITH.other : withWhat(line);
  const [before, after] = words.split('[who]');
  return {
    look: moment ? '' : moveLook(line),
    mark: moment ? 'rounds' : '',
    before, name: person.name, after,
    how: moment ? '' : HOW_SHORT[line.how] || '',
    said: moment ? '' : firstLine(line.said),
    note: firstLine(line.note),
  };
}
