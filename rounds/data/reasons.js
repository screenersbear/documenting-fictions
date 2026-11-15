// The words for a move: the one line on a Today card saying why now, and
// the move as a person's page names it ("Ask who Dana knows").
import { KINDS, YEAR_NAME } from './kinds.js';
import { whenWords, sinceWords, later } from './dates.js';
import { firstName } from './fill.js';

const on = (w) => (w === 'today' || w === 'yesterday' ? w : `on ${w}`);

export function reasonFor(person, today) {
  const n = person.next;
  if (!n) return '';
  const since = sinceWords(later(person.lastShot || '', person.lastMove || '') || today, today);
  switch (n.kind) {
    case 'thanks':
      return person.lastShot ? `You shot together ${on(whenWords(person.lastShot, today))}. A quick thank you while it's fresh.` : "A quick thank you while it's fresh.";
    case 'yes':
      return "They said yes to a shoot. A quick thank you while it's fresh.";
    case 'photos':
      return n.shoot ? `The ${n.shoot} set is up, and they're tagged in it.` : "Their photos are up, and they're tagged in them.";
    case 'hello':
      if (person.group === 'guest') return 'One friendly note: send them their photos.';
      return person.note || "You just met. A quick hello while it's fresh.";
    case 'checkin':
      if (n.year) return `A year since ${n.year.shoot || 'your shoot together'}. Send ${firstName(person.name)} one of the finals.`;
      return since ? `It's been ${since}. Time to plan the next one?` : 'Time to plan the next one?';
    case 'refresh':
      return since ? `It's been ${since}. Time for a refresh offer?` : 'Time for a refresh offer?';
    case 'intros':
      return `Happy clients know people like them. Ask who ${firstName(person.name)} knows.`;
    case 'pitch':
      return person.note || 'Someone new to pitch.';
    default:
      return n.step > 1 ? 'One last follow up, then Rounds lets it rest.' : 'No answer yet. One friendly follow up.';
  }
}

// (year: A year since's shoot, data/year-since.js.)
export function phrase(kind, name, year) {
  if (year) return YEAR_NAME;
  if (kind === 'intros') return `Ask who ${firstName(name)} knows`;
  if (kind === 'refresh') return 'Offer a refresh';
  return KINDS[kind].name;
}
