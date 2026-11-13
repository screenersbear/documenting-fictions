// The Journal list: its order, filters and feed, and drawing it.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addJournalList = function addJournalList(ed) {
  Object.assign(ed, { journalFeedItems, renderJournal });
  // createdAt only holds a date (see todayStr), so two entries written the
  // same day compare equal — journalEntries is append-only (always pushed,
  // never unshifted), so the array's own order already IS creation order.
  // Array.sort is stable, and stability alone would keep same-day ties in
  // that oldest-first order, which is the wrong direction for "most recent
  // first" — breaking ties by original index (reversed) fixes that without
  // needing a real timestamp field.
  function sortJournalEntriesRecent(entries) {
    return entries
      .map((e, i) => [e, i])
      .sort(([ea, ia], [eb, ib]) => {
        const cmp = (eb.createdAt || '').localeCompare(ea.createdAt || '');
        return cmp !== 0 ? cmp : ib - ia;
      })
      .map(([e]) => e);
  }

  // Filter chips, same pattern as the Archive's: a toggle showing the current
  // choice, and a row of chips that opens under it and closes again on a pick.
  // Not remembered between launches — it opens on everything each time.
  ed.journalFilter = 'all';
  const JOURNAL_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'log', label: 'Weekly log' },
    { key: 'entries', label: 'My entries' },
  ]; ed.JOURNAL_FILTERS = JOURNAL_FILTERS;

  function renderJournalFilterChips() {
    document.getElementById('journalFilters').innerHTML = JOURNAL_FILTERS
      .map(f => `<button type="button" class="chip ${f.key === ed.journalFilter ? 'active' : ''}" data-filter="${f.key}">${f.label}</button>`)
      .join('');
    // "Filter: " is dropped where the band is too narrow for all three (styles/journal-legal-pad.css).
    document.getElementById('journalFilterToggle').innerHTML =
      `<span class="jt-word">Filter: </span>${ed.escapeHtml(JOURNAL_FILTERS.find(f => f.key === ed.journalFilter).label)}`;
    // The Weekly tab is the weekly log. Entries written here back when it was
    // the Journal still show in it (new ones are written in Overthoughts), so
    // the filter is only there when there are some.
    document.getElementById('journalFilterToggle').style.display = ed.state.journalEntries.length ? '' : 'none';
  }

  document.getElementById('journalFilterToggle').addEventListener('click', () => {
    const filters = document.getElementById('journalFilters');
    filters.hidden = !filters.hidden;
  });

  document.getElementById('journalFilters').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip || !chip.dataset.filter) return;
    ed.journalFilter = chip.dataset.filter;
    document.getElementById('journalFilters').hidden = true;
    renderJournal();
  });

  // Every card on the Journal page, newest first: the auto-generated weekly
  // log weeks and the entries written by hand, merged by date. A tie goes to
  // the entry — a week is dated by its Monday start, so anything written that
  // day is the more recent of the two.
  function journalFeedItems() {
    const entries = ed.journalFilter === 'log' ? [] : sortJournalEntriesRecent(ed.state.journalEntries)
      .map(e => ({ type: 'entry', date: e.createdAt || '', entry: e }));
    const weeks = ed.journalFilter === 'entries' ? [] : ed.computeWeeklyLog()
      .map(w => ({ type: 'week', date: ed.formatDate(w.start), week: w }));
    const merged = [];
    let i = 0;
    let j = 0;
    while (i < entries.length || j < weeks.length) {
      if (j >= weeks.length || (i < entries.length && entries[i].date >= weeks[j].date)) merged.push(entries[i++]);
      else merged.push(weeks[j++]);
    }
    return merged;
  }

  function renderJournalFeedItem(container, item) {
    if (item.type === 'week') return ed.renderLogWeekCard(container, item.week);
    return ed.renderJournalEntryCard(container, item.entry);
  }

  // Nested by year > month of each item's own date (an entry's createdAt, a
  // log week's start) — same grouping structure Archive uses for shoots.
  // Returns a promise that resolves once every card's cover photos have
  // finished loading (see renderJournalEntryCard) — most callers can ignore
  // it, but scrollToJournalItem needs it so the layout has stopped shifting
  // before it scrolls.
  function renderJournal() {
    const photos = drawJournal();
    ed.repaginate('journal');
    return photos.then((done) => { ed.repaginate('journal'); return done; });
  }
  function drawJournal() {
    // Sorted before grouping, because renderYearMonthGroups keeps whatever
    // order it's handed.
    const items = journalFeedItems();

    const list = document.getElementById('journalList');
    list.innerHTML = '';
    renderJournalFilterChips();
    const empty = document.getElementById('journalEmpty');
    empty.hidden = items.length !== 0;
    if (!empty.hidden) {
      empty.textContent = ed.journalFilter === 'log'
        ? "No weekly log yet. It fills in on its own once a shoot is marked captured."
        : ed.journalFilter === 'entries'
          ? "No entries of your own yet. Tap + to write one. Anything on your mind?"
          : "No weekly log yet. It fills in on its own once a shoot is marked captured.";
    }

    const imagePromises = ed.renderYearMonthGroups(list, items, {
      dateOf: item => item.date,
      keyPrefix: 'journal',
      renderItem: renderJournalFeedItem,
      // Covers a card in a month/year that's still collapsed at this point —
      // it stays genuinely unmeasurable (real height 0) until the group
      // holding it is actually opened, which is what this re-runs for.
      onReveal: wrap => wrap.querySelectorAll('.journal-entry-card').forEach(ed.applyJournalHeaderBand),
    });
    // Every card just built is a real, attached, laid-out node now — each
    // year's whole subtree (months, cards, all of it) only gets appended to
    // `list` at the very end of building that year (see renderYearMonth-
    // Groups), so nothing in it could be measured correctly any earlier than
    // this, not even a card in a section that's expanded by default.
    list.querySelectorAll('.journal-entry-card').forEach(ed.applyJournalHeaderBand);
    return Promise.all(imagePromises);
  }
};
