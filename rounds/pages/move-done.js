// A move done, and what the toast offers after it (Tightening Rounds, 16
// Nov). Swiping a Today card away does the move without the sheet: "Done."
// with ADD WHAT YOU SAID, which opens the one sheet for it, filled in as it
// was logged (pages/one-sheet.js). WRITE TO opens the one sheet, which saves
// everything at once: "Done." with UNDO.
import { toast } from '../components/toast.js';
import { doMove } from '../data/moves.js';
import { undoOneMove } from '../data/one-move-store.js';
import { openOneMove } from './one-sheet.js';

// away: the card going (a swipe), waited for before the screen's drawn again.
export async function swipeDone(person, redraw, away = null) {
  const [done] = await Promise.all([doMove(person), away]);
  await redraw();
  toast('Done.', { action: { label: 'Add what you said', run: () => openOneMove(done.after, { line: done.line, after: redraw }) } });
  return done;
}

// The one sheet for someone; once it's saved, gone(done) (the card going,
// for their due move) and the screen drawn again. chip: WHAT KIND to start on.
export function writeTo(person, redraw, { chip, gone = () => null } = {}) {
  return openOneMove(person, {
    chip,
    after: async (done) => {
      await gone(done);
      await redraw();
      toast('Done.', { action: { label: 'Undo', run: () => undoOneMove(done).then(redraw) } });
    },
  });
}
