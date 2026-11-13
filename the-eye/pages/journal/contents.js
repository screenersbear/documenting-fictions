// The Journal's table of contents.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addJournalContents = function addJournalContents(ed) {
  // ---------- Journal table of contents ----------
  // Reuses renderYearMonthGroups with its own 'journalToc' keyPrefix, so
  // expanding/collapsing a year or month inside the TOC popup never disturbs
  // what's expanded in the real list underneath (and vice versa).
  function renderJournalTocItem(container, item) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'journal-toc-item' + (item.type === 'week' ? ' journal-toc-item-log' : '');
    row.textContent = item.type === 'week' ? item.week.label : (item.entry.title || 'Untitled entry');
    row.addEventListener('click', () => scrollToJournalItem(item));
    container.appendChild(row);
  }

  function openJournalToc() {
    const items = ed.journalFeedItems();
    const list = document.getElementById('journalTocList');
    list.innerHTML = '';
    document.getElementById('journalTocEmpty').hidden = items.length !== 0;
    ed.renderYearMonthGroups(list, items, {
      dateOf: item => item.date,
      keyPrefix: 'journalToc',
      renderItem: renderJournalTocItem,
    });
    document.getElementById('journalTocOverlay').hidden = false;
  }

  document.getElementById('journalTocBtn').addEventListener('click', openJournalToc);

  // Expands whichever year/month the item actually lives under in the real
  // list (that list's own 'journal' collapse keys, independent of the TOC's),
  // then scrolls it to the top of the same scrolling space.
  function scrollToJournalItem(item) {
    document.getElementById('journalTocOverlay').hidden = true;
    const selector = item.type === 'week'
      ? `.log-card[data-week-key="${item.date}"]`
      : `.journal-entry-card[data-entry-id="${item.entry.id}"]`;
    // The photos have to be in first: they decide where it ends up.
    ed.renderJournal().then(() => {
      const card = document.querySelector(selector);
      if (!card) return;
      const top = card.getBoundingClientRect().top + window.scrollY - parseFloat(getComputedStyle(document.getElementById('app')).paddingTop);
      window.scrollTo({ top: Math.max(0, top), behavior: ed.motionOk() ? 'smooth' : 'auto' });
    });
  }
};
