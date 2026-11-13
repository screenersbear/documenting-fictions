// The Journal's weekly log (a recap it writes itself).
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addJournalWeeklyLog = function addJournalWeeklyLog(ed) {
  Object.assign(ed, { weekRangeLabel, computeWeeklyLog, logTakeaways, showLogShootRef, logWeekPaperHtml, wireLogShootRefs, renderLogWeekCard });
  // ---------- Journal weekly log (auto-generated recap) ----------
  // Fully derived from state.shoots — nothing here is persisted, so editing
  // a shoot's category or lessons-learned later just updates the log the
  // next time it's opened. Weeks run Monday to Sunday, like everywhere else
  // in the app (daysIntoWeek).
  function shootWeekWindow(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const start = new Date(date);
    start.setDate(date.getDate() - ed.daysIntoWeek(date));
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  }

  function weekRangeLabel(start, end) {
    const startMonth = ed.MONTH_NAMES[start.getMonth()].slice(0, 3);
    const endMonth = ed.MONTH_NAMES[end.getMonth()].slice(0, 3);
    if (start.getMonth() === end.getMonth()) {
      return `${startMonth} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`;
    }
    return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;
  }

  function computeWeeklyLog() {
    const shotShoots = ed.state.shoots.filter(s => s.date && ed.POST_CAPTURE_STATUSES.includes(s.status));
    const weeks = new Map();
    shotShoots.forEach(s => {
      const { start, end } = shootWeekWindow(s.date);
      const key = ed.formatDate(start);
      if (!weeks.has(key)) weeks.set(key, { start, end, shoots: [] });
      weeks.get(key).shoots.push(s);
    });
    return Array.from(weeks.values())
      .sort((a, b) => b.start - a.start)
      .map(w => ({
        // Kept so the list can group weeks by year > month. A week straddling
        // a month boundary files under the month it *starts* in, matching the
        // month its label leads with.
        start: w.start,
        label: weekRangeLabel(w.start, w.end),
        shoots: w.shoots.slice().sort((a, b) => a.date.localeCompare(b.date)),
        takeaways: logTakeaways(w.shoots),
      }));
  }

  // Keeps each takeaway tied to the shoot it came from (rather than a
  // flat list of strings) so tapping one can open that same shoot.
  // One shoot's Lessons Learned is always exactly one takeaway here —
  // splitting on every newline used to turn a single entry into
  // several bullets the moment it had a paragraph break in it, which
  // read as several distinct lessons instead of the one the shoot
  // actually had. Internal line breaks are collapsed to spaces rather
  // than dropped outright, so the text stays readable as one bullet.
  function logTakeaways(shoots) {
    return shoots
      .map(s => ({ text: (s.lessonsLearned || '').replace(/\s*\n+\s*/g, ' ').trim(), shootId: s.id }))
      .filter(t => t.text);
  }

  // Tapping a shoot or takeaway in the Log opens a small "this refers to"
  // popup rather than jumping straight to the shoot modal — the Log is a
  // read-only recap, so a confirm step avoids an accidental jump away from it.
  let logShootRefId = null;

  function showLogShootRef(shootId) {
    const s = ed.state.shoots.find(x => x.id === shootId);
    if (!s) return;
    logShootRefId = shootId;
    document.getElementById('logShootRefName').textContent = ed.shootDisplayName(s);
    document.getElementById('logShootRefOverlay').hidden = false;
  }

  document.getElementById('logShootRefCancelBtn').addEventListener('click', () => {
    document.getElementById('logShootRefOverlay').hidden = true;
  });

  document.getElementById('logShootRefViewBtn').addEventListener('click', () => {
    document.getElementById('logShootRefOverlay').hidden = true;
    const shootId = logShootRefId;
    if (!shootId) return;
    const s = ed.state.shoots.find(x => x.id === shootId);
    if (!s) return;
    // Asked from the Monday brief's copy of the week, which would otherwise
    // sit on top of the shoot it's opening (the same layer, later in the
    // page).
    ed.leaveMondayBrief();
    document.querySelector(`.tab[data-view="${s.archived ? 'archive' : 'shoots'}"]`).click();
    ed.openShootModal(shootId);
    // Land on the Reflection page rather than the first one: that's where
    // the takeaway was written, so it's what you came to look at.
    ed.showPostShootContentExpanded();
    ed.showShootPage('postShootHeading');
    ed.updateShootModalTitleFromScroll();
  });

  document.getElementById('logShootRefOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.hidden = true;
  });

  // A week's page of the Log: its shoots and takeaways on the lined paper.
  // The Monday brief shows last week's too, under labels of its own (on a
  // Monday, "this week" is the new one).
  function logWeekPaperHtml(w, shootsLabel, noTakeawaysText) {
    const shootsHtml = w.shoots.map(s =>
      `<li data-shoot-id="${s.id}">${ed.escapeHtml(ed.shootDisplayName(s))} <span class="log-shoot-category">(${ed.escapeHtml(ed.CATEGORY_LABELS[s.category] || 'Uncategorized')})</span></li>`
    ).join('');
    const takeawaysHtml = w.takeaways.length
      // Each takeaway is credited to its shoot inline, so the list still reads
      // as attributed even before you tap through to confirm which one.
      ? `<ul class="log-takeaways">${w.takeaways.map(t => {
          const from = ed.shootDisplayName(ed.state.shoots.find(x => x.id === t.shootId) || {});
          const credit = from ? `<span class="log-takeaway-source"> --- ${ed.escapeHtml(from)}</span>` : '';
          return `<li data-shoot-id="${t.shootId}">${ed.escapeHtml(t.text)}${credit}</li>`;
        }).join('')}</ul>`
      : `<p class="log-no-takeaways">${noTakeawaysText}</p>`;
    return `
      <div class="journal-paper log-paper">
        <p class="log-section-label">${shootsLabel}</p>
        <ul class="log-shoots">${shootsHtml}</ul>
        <p class="log-section-label">Takeaways</p>
        ${takeawaysHtml}
      </div>
    `;
  }

  function wireLogShootRefs(card) {
    card.querySelectorAll('.log-shoots li[data-shoot-id], .log-takeaways li[data-shoot-id]').forEach(li => {
      li.addEventListener('click', () => showLogShootRef(li.dataset.shootId));
    });
  }

  // One week of the Log, on the same lined notebook paper the written entries
  // use — the Log is the other half of the same journal, so it reads as
  // written on the same pad rather than as a report about it.
  function renderLogWeekCard(container, w) {
    const card = document.createElement('div');
    card.className = 'card log-card';
    // Anchor the table of contents scrolls to (see scrollToJournalItem).
    card.dataset.weekKey = ed.formatDate(w.start);
    // Alternates within the month it lands in, so collapsing a month never
    // leaves two same-coloured banners stacked against each other.
    const headingColorClass = container.children.length % 2 === 0 ? 'heading-yellow' : 'heading-navy';
    card.innerHTML = `
      <p class="log-week-heading ${headingColorClass}">${ed.escapeHtml(w.label)}</p>
      ${logWeekPaperHtml(w, 'Shoots this week', 'No takeaways logged this week.')}
    `;
    wireLogShootRefs(card);
    container.appendChild(card);
  }
};
