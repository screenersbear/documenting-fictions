// Search from the shelf (round 2, connect/14): the magnifier at the top
// right opens one box over all four notebooks. People first (their photo,
// group or role, and handle; each opens their page, pages/shelf-person.js),
// then what each notebook has under its small mark, in loop order (Rounds,
// Ref, The Eye, Layouts), each row opening it there. In the suite's own look,
// like the person page, with the same rows (components/thing-rows.js). What's
// searched: shared/data/people-things.js. (Loaded before app.js.)
window.ShelfParts = window.ShelfParts || {};
window.ShelfParts.addSearch = function addSearch(ed) {
  'use strict';
  Object.assign(ed, { openSearch });
  // The shared files load after the shelf's own (files.txt), so they're looked up when used.
  const D = () => window.DFData;
  const { BACK, CHEV, SOMEONE, esc, firstName, picture, partHtml, rowHtml, shootThumb, boardThumb, nextHtml, openThing } = window.ShelfParts.thingRows;
  const GLASS = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>';
  const CLEAR = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>';
  const WAIT = 120; // after the last key, so each letter doesn't search

  // ---------- Its rows ----------
  // "Dana Ortiz", "Client · @danaortiz.studio"
  function personHtml(page, f) {
    const p = f.person;
    const handle = p.instagram || p.tiktok;
    const photo = picture(page, f.rounds && f.rounds.covers[0]);
    const about = [(f.rounds && f.rounds.more.group) || f.role, handle && `@${handle}`].filter(Boolean).join(' · ');
    return `<button type="button" class="person-row" data-person="${esc(p.id)}"><span class="search-face">${photo ? `<img src="${photo}" alt="">` : SOMEONE}</span>
      <span class="person-words"><span class="person-title">${esc(p.name || `@${handle}`)}</span>${about ? `<span class="person-line">${esc(about)}</span>` : ''}</span><span class="person-chev">${CHEV}</span></button>`;
  }
  // Each notebook's rows: Rounds' next moves (with whose, when there's more
  // than one), Ref's boards, The Eye's shoots and Layouts' posts.
  function rowsOf(page, app, list) {
    if (app === 'rounds') return list.map((t) => nextHtml(t, list.length > 1)).join('');
    const thumb = app === 'ref' ? boardThumb : shootThumb;
    return list.map((t) => rowHtml(t, thumb(page, t))).join('');
  }
  function resultsHtml(page, found, q) {
    const parts = Object.entries(found.byApp);
    if (!found.people.length && parts.every(([, list]) => !list.length)) return `<p class="person-none search-none">Nothing in the four notebooks for “${esc(q.trim())}”.</p>`;
    const none = found.people.length ? `Nothing with ${firstName(found.people[0].person.name)} yet.` : `Nothing for “${q.trim()}”.`;
    const short = (app) => ed.BOOKS.find((b) => b.id === app).short;
    return (found.people.length ? `<div class="search-people">${found.people.map((f) => personHtml(page, f)).join('')}</div>` : '')
      + parts.map(([app, list]) => partHtml(app, short(app), list.length, list.length ? rowsOf(page, app, list) : `<p class="person-none">${esc(none)}</p>`)).join('');
  }

  // ---------- The page ----------
  function openSearch() {
    const page = document.createElement('div');
    page.className = 'connect-page search-page';
    page.setAttribute('role', 'dialog');
    page.setAttribute('aria-modal', 'true');
    page.setAttribute('aria-label', 'Search');
    page.urls = [];
    page.innerHTML = `<div class="connect-head person-head"><button type="button" class="ring-btn" data-back aria-label="Back"><span>${BACK}</span></button><h2>Search</h2></div>
      <div class="connect-scroll person-scroll"><label class="search-box"><span class="search-glass">${GLASS}</span>
        <input type="search" class="search-input" aria-label="Search all four notebooks" placeholder="Search all four" enterkeyhint="search" autocomplete="off" autocapitalize="off" spellcheck="false">
        <button type="button" class="search-clear" data-clear aria-label="Clear" hidden>${CLEAR}</button></label>
      <div class="search-results" aria-live="polite"></div></div>`;
    document.body.appendChild(page);
    requestAnimationFrame(() => page.classList.add('in'));
    const input = page.querySelector('.search-input');
    const results = page.querySelector('.search-results');
    input.focus();
    let found = null;
    let asked = 0; // only the newest search is drawn
    let soon = null;
    async function paint() {
      const q = input.value;
      const n = ++asked;
      page.querySelector('[data-clear]').hidden = !q;
      const next = q.trim() ? await D().searchAll(q) : null;
      if (n !== asked) return;
      page.urls.splice(0).forEach((u) => URL.revokeObjectURL(u));
      found = next;
      results.innerHTML = found ? resultsHtml(page, found, q) : '';
    }
    const shut = () => {
      asked++;
      page.urls.forEach((u) => URL.revokeObjectURL(u));
      page.classList.remove('in');
      setTimeout(() => page.remove(), 220);
    };
    input.addEventListener('input', () => { clearTimeout(soon); soon = setTimeout(paint, WAIT); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { clearTimeout(soon); paint(); input.blur(); } });
    page.addEventListener('click', (e) => {
      const person = e.target.closest('[data-person]');
      const thing = e.target.closest('[data-thing]');
      if (person) ed.openPerson(person.dataset.person); // its back comes back here
      else if (thing) openThing(ed, Object.values(found.byApp).flat().find((t) => t.key === thing.dataset.thing));
      else if (e.target.closest('[data-back]')) shut();
      else if (e.target.closest('[data-clear]')) { input.value = ''; paint(); input.focus(); }
    });
    return page;
  }
  document.getElementById('searchBtn').addEventListener('click', () => { if (!ed.busy) openSearch(); });
};
