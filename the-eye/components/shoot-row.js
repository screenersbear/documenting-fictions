// A shoot as a row in a list (its cover, name, one line of status and dates,
// and the flags for what it still needs), and the compact row.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootRow = function addShootRow(ed) {
  Object.assign(ed, { shootThumbHtml, shootDateWords, shootFlagWords, flagsHtml, moreBtnHtml, renderShootRow, renderCompactShootRow });
  const SHOOT_THUMB_EMPTY_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3.5"/></svg>`;
  const MORE_SVG = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="5" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="12" cy="19" r="1.6"/></svg>';

  function shootThumbHtml(s) {
    return s.projectPhoto
      ? `<div class="shoot-thumb"><img src="${s.projectPhoto}" alt="" /></div>`
      : `<div class="shoot-thumb shoot-thumb-empty">${SHOOT_THUMB_EMPTY_SVG}</div>`;
  }

  // The shoot's day, on its row: "Sat 28 Nov" ahead, "Today", "Shot 10 Nov"
  // once it's shot, just "12 Nov" for a day gone by that isn't shot yet,
  // "Was 12 Nov" for the date a postponed or canceled shoot was planned for.
  function shootDateWords(s, today) {
    if (!s.date) return 'Date not set';
    if (ed.isOriginalPlanDate(s)) return `Was ${ed.rowDate(s.date, today, false)}`;
    if (s.date === today) return 'Today';
    if (s.date > today) return ed.rowDate(s.date, today, true);
    return ed.POST_CAPTURE_STATUSES.includes(s.status) ? `Shot ${ed.rowDate(s.date, today, false)}` : ed.rowDate(s.date, today, false);
  }

  // What a shoot still needs, as small outlined flags (they took the place of
  // the Overview's counter tiles): its team and mood board while it's being
  // planned (shootPendingLabels), proofs once a photo shoot is captured, a
  // reflection from then on. Final images are added later (see below).
  function shootFlagWords(s) {
    const flags = ed.shootPendingLabels(s).map(label => (label === 'Moodboard' ? 'Mood board' : label));
    if (s.status === 'captured' && !ed.isVideoShoot(s)) flags.push('Proofs');
    const hasReflection = ed.hasText(s.whatWentRight) || ed.hasText(s.couldBeBetter) || ed.hasText(s.lessonsLearned);
    if (ed.POST_CAPTURE_STATUSES.includes(s.status) && !hasReflection) flags.push('Reflection');
    return flags;
  }

  function flagsHtml(flags) {
    return flags.map(f => `<span class="flag">${ed.escapeHtml(f)}</span>`).join('');
  }

  function moreBtnHtml(name) {
    return `<button type="button" class="row-more-btn" aria-label="More for ${ed.escapeHtml(name)}">${MORE_SVG}</button>`;
  }

  // opts: showStatus puts the status first on its line (lists that mix
  // statuses); dueOnly leaves the shoot's day out (Upcoming deadlines);
  // more adds the More button (Shoots); showBadge false leaves the flags off
  // (Archive); switchToShootsTab opens the shoot on the Shoots tab.
  // A deadline gone by takes over the line in crimson, written out
  // ("Overdue by 3 days"), never colour alone. Once delivered or archived
  // there's nothing left to deliver, so the deadline isn't shown.
  function renderShootRow(container, s, opts) {
    const o = opts || {};
    const today = ed.todayStr();
    const name = ed.shootDisplayName(s);
    const status = o.showStatus ? (ed.STATUS_LABELS[s.status] || '') : '';
    const owes = ed.isUpcomingDeadline(s);
    const overdue = owes && s.deadline < today;
    const info = ed.projectDayInfo(s);
    const meta = overdue
      ? ed.metaLine([ed.overdueWords(s.deadline, today), status])
      : ed.metaLine([status, o.dueOnly ? '' : shootDateWords(s, today), info ? `Day ${info.day} of ${info.total}` : '', owes ? ed.dueWords(s.deadline, today) : '']);
    const showFlags = o.showBadge !== false;
    const flags = showFlags ? shootFlagWords(s) : [];
    const div = document.createElement('div');
    div.className = 'shoot-row';
    div.innerHTML = `
      ${shootThumbHtml(s)}
      <div class="shoot-row-body">
        <span class="shoot-row-title">${ed.escapeHtml(name)}</span>
        <span class="shoot-row-meta${overdue ? ' overdue' : ''}">${ed.escapeHtml(meta)}</span>
        <span class="shoot-flags"${flags.length ? '' : ' hidden'}>${flagsHtml(flags)}</span>
      </div>
      ${o.more ? moreBtnHtml(name) : ''}
    `;
    div.addEventListener('click', () => {
      if (o.switchToShootsTab) document.querySelector('.tab[data-view="shoots"]').click();
      ed.openShootModal(s.id);
    });
    const more = div.querySelector('.row-more-btn');
    if (more) {
      more.addEventListener('click', (e) => {
        e.stopPropagation();
        ed.openShootOptions(s.id);
      });
    }
    // A delivered photo shoot with no final images in yet: that needs a look
    // in the photo store, so its flag comes in a moment after the row.
    if (showFlags && s.status === 'delivered' && !ed.isVideoShoot(s)) {
      ed.idbGetImages(ed.finalImagesKey(s.id)).then(images => {
        if (images.length) return;
        const flagsEl = div.querySelector('.shoot-flags');
        flagsEl.insertAdjacentHTML('beforeend', flagsHtml(['Final images']));
        flagsEl.hidden = false;
      }).catch(() => {});
    }
    container.appendChild(div);
  }

  // A smaller, photo-free row for tight spaces (the lists that open from the
  // Monday brief) — title, status, and shoot date, each on its own line, so
  // nothing is ever squeezed side-by-side against anything else.
  function renderCompactShootRow(container, s) {
    const statusLabel = ed.STATUS_LABELS[s.status] || '';
    const div = document.createElement('div');
    div.className = 'shoot-row-compact';
    div.innerHTML = `
      <div class="shoot-row-compact-body">
        <span class="shoot-row-compact-title">${ed.escapeHtml(ed.shootDisplayName(s))}</span>
        ${statusLabel ? `<span class="badge">${ed.escapeHtml(statusLabel)}</span>` : ''}
        <span class="mi-sub">${ed.shootDateLabel(s, ed.prettyDateShort)}</span>
      </div>
      <button type="button" class="row-options-btn" aria-label="Options">&#8942;</button>
    `;
    div.addEventListener('click', () => {
      ed.openShootModal(s.id);
    });
    div.querySelector('.row-options-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      ed.openShootOptions(s.id);
    });
    container.appendChild(div);
  }
};
