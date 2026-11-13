// App options: how shoots show, the new-shoot guide, the daily report, the look tags.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addAppMenuOptions = function addAppMenuOptions(ed) {
  Object.assign(ed, { updateDisplayChoiceHighlight, updateNewShootGuideChoice, updateDailyReportChoice, updateLookTagsChoice });
  // ---------- Shoot display options (app-wide talent/title preference) ----------
  const markChoice = (id, on) => {
    const btn = document.getElementById(id);
    btn.classList.toggle('active', on);
    btn.setAttribute('aria-pressed', String(on));
  };

  function updateDisplayChoiceHighlight() {
    const isTitleMode = ed.state.titleDisplayMode === 'title';
    markChoice('displayModeTalentBtn', !isTitleMode);
    markChoice('displayModeTitleBtn', isTitleMode);
  }

  document.getElementById('displayModeTalentBtn').addEventListener('click', () => {
    ed.state.titleDisplayMode = 'talent';
    ed.saveState();
    ed.renderAll();
    updateDisplayChoiceHighlight();
  });

  document.getElementById('displayModeTitleBtn').addEventListener('click', () => {
    ed.state.titleDisplayMode = 'title';
    ed.saveState();
    ed.renderAll();
    updateDisplayChoiceHighlight();
  });

  // ---------- New shoot guide (on/off for the new-shoot wizard) ----------
  function updateNewShootGuideChoice() {
    const on = ed.isNewShootGuideOn();
    markChoice('newShootGuideOnBtn', on);
    markChoice('newShootGuideOffBtn', !on);
  }

  document.getElementById('newShootGuideOnBtn').addEventListener('click', () => {
    ed.setNewShootGuideOn(true);
    updateNewShootGuideChoice();
  });

  document.getElementById('newShootGuideOffBtn').addEventListener('click', () => {
    ed.setNewShootGuideOn(false);
    updateNewShootGuideChoice();
  });

  // ---------- Daily report: before a shoot, or everything ----------
  function updateDailyReportChoice() {
    const all = ed.dailyReportEverything();
    markChoice('dailyReportSoonBtn', !all);
    markChoice('dailyReportAllBtn', all);
  }
  document.getElementById('dailyReportSoonBtn').addEventListener('click', () => { ed.setDailyReportEverything(false); updateDailyReportChoice(); });
  document.getElementById('dailyReportAllBtn').addEventListener('click', () => { ed.setDailyReportEverything(true); updateDailyReportChoice(); });

  // ---------- Visual language and framework tags: hidden, or on the shoot page ----------
  function updateLookTagsChoice() {
    const on = ed.lookTagsOn();
    markChoice('lookTagsOffBtn', !on);
    markChoice('lookTagsOnBtn', on);
  }
  function setLookTagsOn(on) {
    try { if (on) localStorage.setItem(ed.LOOK_TAGS_ON_KEY, '1'); else localStorage.removeItem(ed.LOOK_TAGS_ON_KEY); } catch (e) { /* storage unavailable */ }
    ed.applyLookTags();
    ed.STATS_PAGES = ed.statsPagesNow();
    ed.statsPageIdx = 0;
    updateLookTagsChoice();
    ed.renderAll();
  }
  document.getElementById('lookTagsOffBtn').addEventListener('click', () => setLookTagsOn(false));
  document.getElementById('lookTagsOnBtn').addEventListener('click', () => setLookTagsOn(true));
};
