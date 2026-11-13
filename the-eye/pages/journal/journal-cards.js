// The Journal list: the header band, an entry's card, entries by year and month.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addJournalCards = function addJournalCards(ed) {
  Object.assign(ed, { applyJournalHeaderBand, renderJournalEntryCard, renderYearMonthGroups });
  // Sizes .journal-paper's --header-band (see the CSS) to this specific
  // entry's actual title/date height, so the blank band above the ruling
  // always fully covers it — a fixed guess would either crop a long wrapped
  // title or leave excess blank space under a short one — and sits the
  // heading on the first visible rule, at the bottom of that band. Reads as 0 (and is
  // skipped) whenever the card isn't laid out yet — not just inside a
  // collapsed month/year group, but even a fully-visible one: renderYear-
  // MonthGroups builds a whole year's months and cards in memory before
  // attaching that year to the live list in one shot, so every card is still
  // a detached, unlaid-out node at the moment renderItem builds it,
  // regardless of collapse state. Never call this from inside renderItem —
  // it always reads 0 there. renderJournal's own post-pass (after
  // renderYearMonthGroups returns, once the list is genuinely in the
  // document) is what actually measures correctly for a visible entry;
  // onReveal covers the collapsed-group case for everything left over.
  function applyJournalHeaderBand(card) {
    const heading = card.querySelector('.journal-entry-heading');
    const paper = card.querySelector('.journal-paper');
    if (!heading || !paper || !heading.offsetHeight) return;
    // .journal-paper's own 14px top padding sits above the heading, plus a
    // little extra room for open space above the title, snapped up to the
    // ruled-line pattern's own existing line positions (21, 49, 77, 105px,
    // ... — see .journal-paper's 22px background-position) so the band's
    // bottom edge lands exactly on a real rule instead of slicing one in half.
    const headingBottom = 14 + heading.offsetHeight;
    const minBand = headingBottom + 8;
    const band = Math.ceil((minBand - 21) / 28) * 28 + 21;
    paper.style.setProperty('--header-band', band + 'px');
    // The heading is whole 28px rows (see .journal-entry-heading), so this
    // margin drops it to the bottom of the band: its last row sits right on
    // the first visible rule, any extra title rows stack above it, and the
    // entry's own text — which follows directly — starts on the first row
    // below that rule. The leftover space lands above the title.
    heading.style.marginTop = (band - headingBottom) + 'px';
  }

  // One entry, rendered inline on lined notebook paper under a coloured title
  // banner — the same card shape the Log uses for a week, so the two kinds of
  // entry read as one continuous scrolling page rather than a list of things
  // to open.
  function renderJournalEntryCard(container, e) {
    const card = document.createElement('div');
    card.className = 'card log-card journal-entry-card';
    // Anchor the table of contents scrolls to (see scrollToJournalItem).
    card.dataset.entryId = e.id;
    // Alternates within the month it lands in, so collapsing a month never
    // leaves two same-coloured banners stacked against each other.
    const headingColorClass = container.children.length % 2 === 0 ? 'heading-yellow' : 'heading-navy';
    const linkedShoot = e.sourceShootId ? ed.state.shoots.find(s => s.id === e.sourceShootId) : null;
    // Same "--- shoot name" credit the Log puts after each takeaway; this entry
    // was compiled from that shoot's reflection, so it's the same attribution.
    const credit = linkedShoot
      ? `<span class="log-takeaway-source"> --- ${ed.escapeHtml(ed.shootDisplayName(linkedShoot))}</span>`
      : '';
    const tagsHtml = (e.tags || []).map(t => `<span class="beat-chip view-only">${ed.escapeHtml(t)}</span>`).join('');

    card.innerHTML = `
      <div class="log-week-heading ${headingColorClass} journal-entry-binding">
        <button type="button" class="journal-entry-options" aria-label="Options">&#8942;</button>
      </div>
      <div class="journal-paper log-paper">
        <div class="journal-entry-heading">
          <span class="journal-entry-title">${ed.escapeHtml(e.title || 'Untitled entry')}</span>
          <span class="journal-entry-date">${ed.prettyDate(e.createdAt)}</span>
        </div>
        <div class="journal-entry-body"><div class="jb-in">${ed.escapeHtml(e.body || '')}${credit}</div></div>
        <div class="journal-entry-images moodboard-grid" hidden></div>
        <div class="journal-entry-tags"${tagsHtml ? '' : ' hidden'}>${tagsHtml}</div>
      </div>
    `;

    const paper = card.querySelector('.journal-paper');
    if (linkedShoot) {
      // Auto-compiled entries are never edited here — they route back to the
      // shoot's own reflection fields so the two stay in sync. Reuses the Log's
      // "this refers to" popup rather than a confirm(), so tapping a reflection
      // behaves exactly like tapping a weekly log takeaway.
      paper.addEventListener('click', () => ed.showLogShootRef(e.sourceShootId));
    } else {
      // Hand-written entries open straight into the editor: the body is already
      // fully readable right here, so a read-only stop on the way would be a
      // popup that shows you what you're already looking at.
      paper.addEventListener('click', () => ed.openJournalModal(e.id, 'edit'));
    }

    card.querySelector('.journal-entry-options').addEventListener('click', (ev) => {
      ev.stopPropagation();
      ed.openJournalOptions(e.id);
    });

    container.appendChild(card);
    // Returned (not fire-and-forget) so scrollToJournalItem can wait for
    // every card's cover photos to finish loading before it scrolls — those
    // load from IndexedDB asynchronously and would otherwise grow cards
    // above the target after the scroll already landed, shoving it back out
    // of view.
    return ed.renderJournalListImages(card.querySelector('.journal-entry-images'), ed.journalEntryImagesKey(e));
  }

  // Collapsible year > month nesting for the Journal (and its table of
  // contents), so log weeks and written entries fold and scroll together.
  // Archive grows its own copy of this shape straight from shoot dates; this
  // one takes the date off each item via dateOf(), so it can group anything.
  //
  // Order within a month is whatever order `items` arrives in — callers sort
  // first. Headings alternate colour by *visible* index so a fold never leaves
  // two same-coloured bars stacked.
  function renderYearMonthGroups(list, items, opts) {
    const { dateOf, keyPrefix, renderItem, onReveal } = opts;
    // The Journal itself runs on in pages; only its contents list folds.
    const foldable = keyPrefix !== 'journal';
    // Collects whatever each renderItem call returns (e.g. a journal card's
    // image-loading promise) so a caller that needs to know when everything
    // has actually finished rendering — not just synchronously appended —
    // can Promise.all() this. Callers that don't care just ignore it.
    const results = [];

    const years = new Map();
    items.forEach(item => {
      const d = dateOf(item);
      const year = d ? d.slice(0, 4) : 'Undated';
      const month = d ? d.slice(5, 7) : '00';
      if (!years.has(year)) years.set(year, new Map());
      const months = years.get(year);
      if (!months.has(month)) months.set(month, []);
      months.get(month).push(item);
    });

    const sortedYears = [...years.keys()].sort((a, b) => {
      if (a === 'Undated') return 1;
      if (b === 'Undated') return -1;
      return b.localeCompare(a);
    });

    let visibleYearIndex = 0;
    sortedYears.forEach(year => {
      const months = years.get(year);
      const sortedMonths = [...months.keys()].sort((a, b) => b.localeCompare(a));

      const yearGroupEl = document.createElement('div');
      yearGroupEl.className = 'shoot-status-group';

      const yearCollapseKey = `${keyPrefix}:${year}`;
      const yearCollapsed = foldable && ed.isSectionCollapsed(yearCollapseKey);
      const yearHeading = document.createElement('h2');
      yearHeading.className = `status-group-heading ${visibleYearIndex % 2 === 0 ? 'heading-yellow' : 'heading-navy'}${yearCollapsed ? ' collapsed' : ''}`;
      yearHeading.innerHTML = `${ed.escapeHtml(year)}${foldable ? ed.COLLAPSE_ARROW_SVG : ''}`;

      const yearRowsWrap = document.createElement('div');
      yearRowsWrap.className = 'shoot-status-rows';
      yearRowsWrap.hidden = yearCollapsed;

      if (year === 'Undated') {
        // Undated only ever has the one '00' month bucket, so an "Undated"
        // sub-heading under the "Undated" year heading is the same word twice.
        sortedMonths.forEach(month => {
          months.get(month).forEach(item => results.push(renderItem(yearRowsWrap, item)));
        });
      } else {
        let visibleMonthIndex = 0;
        sortedMonths.forEach(month => {
          const monthGroupEl = document.createElement('div');
          monthGroupEl.className = 'archive-month-group';

          const monthCollapseKey = `${keyPrefix}:${year}:${month}`;
          const monthCollapsed = foldable && ed.isSectionCollapsed(monthCollapseKey);
          const monthHeading = document.createElement('h3');
          monthHeading.className = `status-group-heading archive-month-heading ${visibleMonthIndex % 2 === 0 ? 'heading-yellow' : 'heading-navy'}${monthCollapsed ? ' collapsed' : ''}`;
          monthHeading.innerHTML = `${ed.escapeHtml(ed.monthLabel(month))}${foldable ? ed.COLLAPSE_ARROW_SVG : ''}`;

          const monthRowsWrap = document.createElement('div');
          monthRowsWrap.className = 'shoot-status-rows';
          monthRowsWrap.hidden = monthCollapsed;
          months.get(month).forEach(item => results.push(renderItem(monthRowsWrap, item)));

          if (foldable) monthHeading.addEventListener('click', () => {
            const nowHidden = !monthRowsWrap.hidden;
            monthRowsWrap.hidden = nowHidden;
            monthHeading.classList.toggle('collapsed', nowHidden);
            ed.setSectionCollapsed(monthCollapseKey, nowHidden);
            if (!nowHidden && onReveal) onReveal(monthRowsWrap);
          });

          monthGroupEl.appendChild(monthHeading);
          monthGroupEl.appendChild(monthRowsWrap);
          yearRowsWrap.appendChild(monthGroupEl);
          visibleMonthIndex++;
        });
      }

      if (foldable) yearHeading.addEventListener('click', () => {
        const nowHidden = !yearRowsWrap.hidden;
        yearRowsWrap.hidden = nowHidden;
        yearHeading.classList.toggle('collapsed', nowHidden);
        ed.setSectionCollapsed(yearCollapseKey, nowHidden);
        if (!nowHidden && onReveal) onReveal(yearRowsWrap);
      });

      yearGroupEl.appendChild(yearHeading);
      yearGroupEl.appendChild(yearRowsWrap);
      list.appendChild(yearGroupEl);
      visibleYearIndex++;
    });

    return results;
  }
};
