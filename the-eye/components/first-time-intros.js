// First-time intros: the popup each tab shows the first time it's opened.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addFirstTimeIntros = function addFirstTimeIntros(ed) {
  Object.assign(ed, { showTabIntro });
  // ---------- First-time tab intro popups ----------
  const TAB_INTROS = {
    overview: {
      title: 'Overview',
      text: "this is your at-a-glance dashboard to see how many shoots are ready to go, still being planned, or waiting on a team or mood board, plus what's coming up next. tap '+ new shoot' anytime to start logging one.",
    },
    shoots: {
      title: 'Shoots',
      text: 'every active shoot lives here, grouped by status from early idea through delivered. Filter by category up top, and tap any card to reopen it.',
    },
    archive: {
      title: 'Archive',
      text: "shoots move here once you mark them complete, keeping your active list clean while still letting you look back. This is also where you'll find backup and restore for all your data.",
    },
    journal2: {
      title: 'Weekly',
      text: "one running page with two kinds of entries. The weekly log fills itself in for every week you shoot: which shoots happened, their categories, and the lessons learned pulled from each shoot's reflection. Tap any shoot or takeaway to see where it came from. Tap '+' to add your own reflection anytime, and tag entries with hashtags so you can find them again later. The table of contents jumps you to any entry or week.",
    },
    stats: {
      title: 'Stats',
      text: 'swipe between breakdowns of your visual languages, categories, team members, statuses, and locations. tap any slice to see exactly which shoots are behind it.',
    },
    // Shown once, right after the first automatic daily report is dismissed —
    // that's the moment the report exists in your head and "where did that go?"
    // is the natural next question. Routed through showTabIntro so it reuses
    // the same popup and seen-once bookkeeping as the tab intros.
    // Shown once, right after shoot mode is declined — the moment the question
    // "fine, but how do I get it back?" actually occurs to you.
    'shootmode:where': {
      title: 'Whenever you want it',
      text: "no problem. Shoot mode is always one tap away: open the shoot and hit 'Shoot mode' in the bar at the bottom of the page.",
    },
    'report:bell': {
      title: 'Find this again',
      text: "that was your daily report. It turns up once a day with anything that needs attention. You can pull it back up whenever you like: tap the bell at the top of the Overview screen.",
    },
  };

  const TAB_INTRO_KEY = 'dailies_seen_tab_intros_v1';

  function loadSeenTabIntros() {
    try {
      return JSON.parse(localStorage.getItem(TAB_INTRO_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  let seenTabIntros = loadSeenTabIntros();

  function showTabIntro(view) {
    const intro = TAB_INTROS[view];
    if (!intro || seenTabIntros[view]) return;
    document.getElementById('tabIntroTitle').textContent = intro.title;
    document.getElementById('tabIntroText').textContent = intro.text;
    document.getElementById('tabIntroOverlay').hidden = false;
    seenTabIntros[view] = true;
    localStorage.setItem(TAB_INTRO_KEY, JSON.stringify(seenTabIntros));
  }

  document.getElementById('tabIntroCloseBtn').addEventListener('click', () => {
    document.getElementById('tabIntroOverlay').hidden = true;
  });
};
