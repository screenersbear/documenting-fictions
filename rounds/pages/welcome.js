// The first time Rounds is opened. Inside Documenting Fictions: how to get
// back to the shelf, then an offer of the tour; turned down, where the tour
// is kept. Those words are the suite's (../suite.js), so all four notebooks
// say the same thing. On its own (rounds/STANDALONE.md), with no shelf to go
// back to: just the offer of the tour, and where it's kept, in Rounds' own
// words.
import { openSheet } from '../components/sheet.js';
import { sawIntro } from './intro.js';

// Rounds on its own: no shelf, so no first step.
const ALONE = {
  ask: ['Welcome to Rounds', 'A few people to write to each day, and the words to start with. A quick tour of how it works?', 'Take the tour', 'Not now'],
  later: ['Any time', 'The tour is in Options, the button at the top of the screen, under How it works.', 'Got it'],
};

// w: the words ({ back, ask, later }; no back: it starts at the offer).
// done(toured): once it's closed, whether the tour was wanted.
function welcomeSheet(w, done) {
  let step = w.back ? 'back' : 'ask', toured = false;
  const s = openSheet({
    title: (w.back || w.ask)[0],
    className: 'sheet-small intro',
    onClose: () => done(toured),
  });
  const say = (text) => `<p class="sheet-message">${text}</p>`;
  const one = (label, step) => `<div class="sheet-actions one"><button type="button" class="btn primary" data-step="${step}">${label}</button></div>`;
  const draw = () => {
    if (step === 'back') { s.setTitle(w.back[0]); s.body.innerHTML = say(w.back[1]) + one('Next', 'next'); }
    else if (step === 'ask') {
      s.setTitle(w.ask[0]);
      s.body.innerHTML = say(w.ask[1]) + `<div class="sheet-actions">
        <button type="button" class="btn secondary" data-step="no">${w.ask[3]}</button>
        <button type="button" class="btn primary" data-step="yes">${w.ask[2]}</button>
      </div>`;
    } else { s.setTitle(w.later[0]); s.body.innerHTML = say(w.later[1]) + one(w.later[2], 'done'); }
  };
  s.body.addEventListener('click', (e) => {
    const b = e.target.closest('[data-step]');
    if (!b) return;
    const k = b.dataset.step;
    if (k === 'next') { step = 'ask'; draw(); }
    else if (k === 'no') { step = 'later'; draw(); }
    else { toured = k === 'yes'; s.close(); }
  });
  draw();
  return s;
}

// Inside the suite, its first visit there.
export function welcome(name, openTour) {
  const suite = window.DF_SUITE;
  if (!suite || !suite.firstVisit) return false;
  welcomeSheet(suite.words(name), (toured) => { suite.welcomed(); if (toured) setTimeout(openTour, 60); });
  return true;
}

// On its own, the first launch: the offer of the tour. Turned down (or
// closed), it isn't offered again; the tour stays in Options.
export function offerTour(openTour) {
  return welcomeSheet(ALONE, (toured) => { if (toured) setTimeout(openTour, 60); else sawIntro(); });
}
