// A move done, and what the toast offers after it (Tightening Rounds, 16
// Nov). WRITE TO, or DONE on a Today card, opens the one sheet
// (pages/one-sheet.js), which saves everything at once: "Done." with UNDO
// ("Done, with a promise." with one made; "Done. Marked as kept." from KEPT
// IT on one of yours: keeps).
// (Since 18 Nov a swipe only flips through the cards: pages/today.js.)
import { toast } from '../components/toast.js';
import { undoOneMove } from '../data/one-move-store.js';
import { doneWords } from '../data/move-promise.js';
import { openOneMove } from './one-sheet.js';

// The one sheet for someone; once it's saved, gone(done) (the card going,
// for their due move) and the screen drawn again. chip: WHAT KIND to start
// on; keeps and keptOnly: as the one sheet takes them.
export function writeTo(person, redraw, { chip, gone = () => null, keeps = null, keptOnly } = {}) {
  return openOneMove(person, {
    chip,
    keeps,
    keptOnly,
    after: async (done) => {
      await gone(done);
      await redraw();
      toast(doneWords(done), { action: { label: 'Undo', run: () => undoOneMove(done).then(redraw) } });
    },
  });
}
