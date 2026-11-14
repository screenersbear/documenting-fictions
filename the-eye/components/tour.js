// The tour, and the first visit inside Documenting Fictions.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addTour = function addTour(ed) {
  Object.assign(ed, { eyeWelcome });
  // ---------- The tour, and the first visit inside Documenting Fictions ----------
  // A few cards in the same small popup as the app's other questions. App
  // options > How it works shows the tour; inside the suite, the first time
  // The Eye is opened, cards say how to get back to the shelf and offer it
  // (the words are the suite's, ../suite.js, so all four notebooks match).
  const eyeCards = document.createElement('div');
  eyeCards.className = 'modal-overlay intro-overlay eye-cards';
  eyeCards.hidden = true;
  eyeCards.innerHTML = '<div class="modal intro-modal" role="dialog" aria-modal="true" aria-labelledby="eyeCardsTitle"><h2 id="eyeCardsTitle"></h2><p></p><span class="eye-cards-dots" aria-hidden="true"></span><div class="modal-actions"></div></div>';
  document.body.appendChild(eyeCards);
  let eyeCardsDim = null; // what a tap on the dim does, if anything
  function showEyeCard(title, text, buttons, dots) {
    eyeCards.querySelector('h2').textContent = title;
    eyeCards.querySelector('p').textContent = text;
    const dotsEl = eyeCards.querySelector('.eye-cards-dots');
    dotsEl.hidden = !dots;
    if (dots) dotsEl.innerHTML = Array.from({ length: dots[0] }, (_, i) => `<i class="${i === dots[1] ? 'on' : ''}"></i>`).join('');
    const actions = eyeCards.querySelector('.modal-actions');
    actions.classList.toggle('is-one', buttons.length === 1);
    actions.innerHTML = buttons.map((b, i) => `<button type="button" class="${b.kind}" data-card="${i}">${ed.escapeHtml(b.label)}</button>`).join('');
    actions.onclick = (e) => { const hit = e.target.closest('[data-card]'); if (hit) buttons[Number(hit.dataset.card)].go(); };
    eyeCards.hidden = false;
  }
  const hideEyeCards = () => { eyeCards.hidden = true; eyeCardsDim = null; };
  eyeCards.addEventListener('click', (e) => { if (e.target === eyeCards && eyeCardsDim) eyeCardsDim(); });

  const eyeTourCards = () => [
    ['Plan a shoot', 'Tap NEW SHOOT on Shoots. Each shoot gets its own pages: basic info, logistics, team, direction, visuals and a shot list.'],
    ['On the day, and after', 'Tick off the shot list as you go. Afterwards, write a reflection: what went right, what could be better, and lessons for next time.'],
    ['Your week', 'Overview shows what needs you today and what’s coming up. Reflections keeps the week’s log, and Archive holds the shoots you’ve done.'],
    ...(window.DF_SUITE ? [['Mood boards from Ref', 'Send a board from Ref to a shoot and it shows on that shoot’s page, kept up to date until the shoot is captured.']] : []),
    ['Keep a copy', 'Everything is saved inside the app, on this phone. Now and then, back up all data in App options.'],
  ];
  function openEyeTour(then) {
    const cards = eyeTourCards();
    let at = 0;
    const done = () => { hideEyeCards(); if (then) then(); };
    const draw = () => {
      const last = at === cards.length - 1;
      showEyeCard(cards[at][0], cards[at][1], [
        ...(at ? [{ label: 'Back', kind: 'secondary', go: () => { at--; draw(); } }] : []),
        { label: last ? 'Got it' : 'Next', kind: 'primary', go: () => { if (last) done(); else { at++; draw(); } } },
      ], [cards.length, at]);
      eyeCardsDim = done;
    };
    draw();
  }
  document.getElementById('appTourBtn').addEventListener('click', () => {
    ed.closeAppMenu();
    openEyeTour();
  });
  function eyeWelcome(then) {
    const suite = window.DF_SUITE;
    const w = suite.words('The Eye');
    const finish = (tour) => { suite.welcomed(); hideEyeCards(); if (tour) openEyeTour(then); else if (then) then(); };
    showEyeCard(w.back[0], w.back[1], [{ label: 'Next', kind: 'primary', go: () => {
      showEyeCard(w.ask[0], w.ask[1], [
        { label: w.ask[3], kind: 'secondary', go: () => showEyeCard(w.later[0], w.later[1], [{ label: w.later[2], kind: 'primary', go: () => finish(false) }]) },
        { label: w.ask[2], kind: 'primary', go: () => finish(true) },
      ]);
    } }]);
  }
};
