// Tabs and pages: going to a tab, turning a page, and each section as one page.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addPageTurn = function addPageTurn(ed) {
  Object.assign(ed, { pageCopy, clearTurn, playTurn, turnToView });
  // ---------- tab navigation ----------
  const views = {
    overview: document.getElementById('view-overview'),
    shoots: document.getElementById('view-shoots'),
    archive: document.getElementById('view-archive'),
    journal: document.getElementById('view-journal'),
    stats: document.getElementById('view-stats'),
  }; ed.views = views;

  // ---------- Turning a page ----------
  // A sheet swings over on its hinge, carrying a copy of a page. The copy
  // only looks like the page: it can't be touched and goes on a timer, not on
  // the animation's end, so it can never be left covering anything.
  const turnTimers = new WeakMap();
  const motionOk = () => !matchMedia('(prefers-reduced-motion: reduce)').matches; ed.motionOk = motionOk;

  function pageCopy(source, tidy) {
    const rect = source.getBoundingClientRect();
    const copy = source.cloneNode(true);
    // A select's choice isn't part of what cloning carries over.
    const selects = copy.querySelectorAll('select');
    source.querySelectorAll('select').forEach((el, i) => { if (selects[i]) selects[i].selectedIndex = el.selectedIndex; });
    if (tidy) tidy(copy);
    copy.hidden = false;
    copy.inert = true;
    copy.style.margin = '0'; // the holder already sits where the page's box does
    const holder = document.createElement('div');
    holder.className = 'nb-turn-copy';
    holder.style.width = `${rect.width}px`;
    holder.appendChild(copy);
    return { holder, left: rect.left, top: rect.top };
  }

  function clearTurn(layer) {
    clearTimeout(turnTimers.get(layer));
    layer.querySelectorAll('.nb-turn, .nb-turn-under').forEach(el => el.remove());
  }

  function playTurn(layer, kind, leafCopy, underCopy) {
    clearTurn(layer);
    const base = layer.getBoundingClientRect();
    const add = (className, copy) => {
      const sheet = document.createElement('div');
      sheet.className = className;
      layer.appendChild(sheet);
      if (copy) {
        // offsetLeft/Top ignore the sheet's own swing.
        copy.holder.style.left = `${copy.left - base.left - sheet.offsetLeft}px`;
        copy.holder.style.top = `${copy.top - base.top - sheet.offsetTop}px`;
        sheet.appendChild(copy.holder);
      }
    };
    if (underCopy) add('nb-turn-under', underCopy);
    add(`nb-turn${kind ? ` ${kind}` : ''}`, leafCopy);
    turnTimers.set(layer, setTimeout(() => clearTurn(layer), 640));
  }

  // Set just before a tab's click that should turn the page: the navigator,
  // the side tabs and a swipe. The app's own jumps between screens don't.
  ed.turnNextTab = false;

  function turnToView(view) {
    const tab = document.querySelector(`.tabbar .tab[data-view="${view}"]`);
    if (!tab || tab.classList.contains('active')) return;
    ed.turnNextTab = motionOk();
    tab.click();
  }


  // ---------- Pages ----------
  // Open, the notebook is plain pages the size of the screen (user, 11-12):
  // each section is one page that scrolls, and only going from one section
  // to the next turns a page. The page machinery stays, with one page to a
  // flow: `atoms` are still what's drawn, in order, each with its headings,
  // for whatever asks which page something is on.
  const LINE = 28; ed.LINE = LINE; // the Journal's ruled line
  const screenFlows = {}; ed.screenFlows = screenFlows;
  const screenAt = { overview: 0, shoots: 0, archive: 0, journal: 0, stats: 0 }; ed.screenAt = screenAt;
  ed.statsFlows = [];
  const currentScreen = () => document.documentElement.dataset.view; ed.currentScreen = currentScreen;
};
