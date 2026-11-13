// Reflections: an entry's block (inside its week's card), and items by year
// and month (the table of contents).
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addJournalCards = function addJournalCards(ed) {
  Object.assign(ed, { renderJournalEntryCard, renderYearMonthGroups });
  // An entry written by hand, inside the card of the week it was written in:
  // "Journal entry, 28 Oct" (or the shoot it came from), its title and words,
  // its photos, its tags, then Share as PDF and Delete (the same as its old
  // options menu). Tap the words to open it. Resolves once its photos are in.
  function renderJournalEntryCard(container, e) {
    const block = document.createElement('div');
    block.className = 'journal-entry-card';
    block.dataset.entryId = e.id;
    const linkedShoot = e.sourceShootId ? ed.state.shoots.find(s => s.id === e.sourceShootId) : null;
    const when = e.createdAt ? ed.rowDate(e.createdAt, ed.todayStr(), false) : '';
    const label = ed.metaLine([linkedShoot ? `From ${ed.shootDisplayName(linkedShoot)}` : 'Journal entry', when]);
    const tags = (e.tags || []).map(t => `#${String(t).replace(/^#/, '')}`).join(' ');
    block.innerHTML = `
      <div class="journal-entry-words">
        <span class="log-label">${ed.escapeHtml(label)}</span>
        ${e.title ? `<p class="journal-entry-title">${ed.escapeHtml(e.title)}</p>` : ''}
        <p class="journal-entry-text">${ed.escapeHtml(e.body || '')}</p>
      </div>
      <div class="journal-entry-images moodboard-grid" hidden></div>
      <p class="journal-entry-tags"${tags ? '' : ' hidden'}>${ed.escapeHtml(tags)}</p>
      <div class="journal-entry-actions">
        <button type="button" class="journal-entry-act" data-act="pdf"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M12 3v12"/><polyline points="7 8 12 3 17 8"/><path d="M5 13v7h14v-7"/></svg>Share as PDF</button>
        <button type="button" class="journal-entry-act journal-entry-act-quiet" data-act="delete">Delete</button>
      </div>
    `;
    block.querySelector('.journal-entry-words').addEventListener('click', () => {
      if (linkedShoot) ed.showLogShootRef(e.sourceShootId);
      else ed.openJournalModal(e.id, 'edit');
    });
    // Through the options sheet's own buttons (pages/journal/entry-options.js,
    // entry-pdf.js), so they work the same: Delete still asks first.
    block.querySelector('.journal-entry-actions').addEventListener('click', (ev) => {
      const btn = ev.target.closest('[data-act]');
      if (!btn) return;
      ed.optionsJournalEntryId = e.id;
      document.getElementById(btn.dataset.act === 'pdf' ? 'shareJournalOptionBtn' : 'deleteJournalOptionBtn').click();
    });
    container.appendChild(block);
    return ed.renderJournalListImages(block.querySelector('.journal-entry-images'), ed.journalEntryImagesKey(e));
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
