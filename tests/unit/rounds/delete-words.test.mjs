// rounds/data/delete-words.js: what Delete says before someone goes
// (pitfalls, 21 Nov): their open promises named, and a mood board Ref
// started for them staying.
import { describe, it, expect } from 'vitest';
import { deleteWords } from '../../../rounds/data/delete-words.js';

const pr = (id, o) => ({ id, mine: true, what: 'Send the selects', due: '', made: '2026-11-10', open: true, ...o });
const june = (o) => ({ id: 'j', name: 'June Park', ...o });
const PLAIN = "This removes them and everything logged with them. It can't be undone.";

describe('deleteWords', () => {
  it('says what goes, for someone with nothing open and no board', () => {
    expect(deleteWords(june())).toBe(PLAIN);
    expect(deleteWords(june({ promises: [] }), false)).toBe(PLAIN);
  });
  it('names one open promise, and several, so none goes unseen', () => {
    expect(deleteWords(june({ promises: [pr('a')] }))).toBe("This removes them, everything logged with them and their open promise. It can't be undone.");
    expect(deleteWords(june({ promises: [pr('a'), pr('b', { mine: false }), pr('c')] }))).toBe("This removes them, everything logged with them and their 3 open promises. It can't be undone.");
  });
  it('leaves out promises kept or let go, and ones that are not promises', () => {
    expect(deleteWords(june({ promises: [pr('a', { open: false, outcome: 'kept' }), { id: 'x' }, null] }))).toBe(PLAIN);
    expect(deleteWords(june({ promises: 'nope' }))).toBe(PLAIN);
  });
  it('says their mood board in Ref stays, when Ref started one', () => {
    expect(deleteWords(june(), true)).toBe(`${PLAIN} Their mood board in Ref stays.`);
    expect(deleteWords(june({ promises: [pr('a'), pr('b')] }), true)).toBe("This removes them, everything logged with them and their 2 open promises. It can't be undone. Their mood board in Ref stays.");
  });
  it('reads anything not a person as no one with nothing open', () => {
    expect(deleteWords(null)).toBe(PLAIN);
    expect(deleteWords(undefined, 1)).toBe(PLAIN);
  });
});
