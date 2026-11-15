// LESSONS FOR NEXT TIME going to Ref (round 2, connect/10). Under the
// reflection's lessons box, a card with The Eye and Ref's marks: "Goes to
// Ref as next-time notes, for June and for Portrait boards.", and a switch,
// on unless turned off, to keep a shoot's lessons to itself (the shoot's
// lessonsToRef, false when kept). Ref reads them from The Eye's shoots when
// a new board is for one of the shoot's people (ref/data/next-time.js), and
// for a board headed to a shoot of the same kind. Only in the suite: on its
// own, The Eye has no Ref.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addLessonsToRef = function addLessonsToRef(ed) {
  Object.assign(ed, { lessonsRefWords, drawLessonsRef });
  ed.lessonsToRef = true; // the open shoot's; shoot-save.js keeps it
  const firstName = n => String(n).trim().split(/\s+/)[0];

  // What the card says: who and which kind the lessons are filed under.
  function lessonsRefWords(talents, category, on) {
    if (!on) return 'Kept to this shoot. Ref doesn\'t get these lessons.';
    const names = [...new Set((talents || []).filter(t => t && ed.hasText(t.name)).map(t => firstName(t.name)))];
    const kind = ed.CATEGORY_LABELS[category];
    const parts = [names.length ? `for ${ed.joinWithAnd(names)}` : '', kind ? `for ${kind} boards` : ''].filter(Boolean);
    return `Goes to Ref as next-time notes${parts.length ? `, ${parts.join(' and ')}` : ''}.`;
  }

  // Draws the card for the shoot that's open (on: its switch).
  function drawLessonsRef(on = ed.lessonsToRef) {
    ed.lessonsToRef = on;
    const box = document.getElementById('lessonsRef');
    const D = window.DFData;
    box.hidden = !(D && D.inSuite());
    if (box.hidden) { box.innerHTML = ''; return; }
    const category = document.getElementById('shootCategory').value;
    box.innerHTML = `${window.DFConnect.pairHtml('the-eye', 'ref')}<span class="lessons-ref-words">${ed.escapeHtml(lessonsRefWords(ed.currentTalents, category, on))}</span>
      <button type="button" class="df-switch" role="switch" aria-checked="${on}" aria-label="Lessons go to Ref" data-lessons-ref><span></span></button>`;
  }

  document.getElementById('lessonsRef').addEventListener('click', (e) => {
    if (!e.target.closest('[data-lessons-ref]')) return;
    drawLessonsRef(!ed.lessonsToRef);
    ed.scheduleShootAutosave();
  });
};
