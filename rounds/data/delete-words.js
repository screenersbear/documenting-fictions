// What Delete says before someone goes (pitfalls, 21 Nov). Everything logged
// with them goes, and so do their open promises, named here so none goes
// unseen; a mood board Ref started for them stays (data/to-ref.js takes back
// only an offer Ref hasn't started). Only words (unit tested:
// tests/unit/rounds/delete-words.test.mjs).
import { openOf } from './promises.js';

// board: Ref has started a mood board for them.
export function deleteWords(person, board = false) {
  const open = openOf(person).length;
  const what = open === 0 ? '' : open === 1 ? 'their open promise' : `their ${open} open promises`;
  const goes = what ? `This removes them, everything logged with them and ${what}.` : 'This removes them and everything logged with them.';
  return [goes, "It can't be undone.", ...(board === true ? ['Their mood board in Ref stays.'] : [])].join(' ');
}
