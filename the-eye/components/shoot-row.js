// A shoot as a row in a list, and the compact row.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootRow = function addShootRow(ed) {
  Object.assign(ed, { shootThumbHtml, renderShootRow, renderCompactShootRow });
  const SHOOT_THUMB_EMPTY_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3.5"/></svg>`;

  function shootThumbHtml(s) {
    return s.projectPhoto
      ? `<div class="shoot-thumb"><img src="${s.projectPhoto}" alt="" /></div>`
      : `<div class="shoot-thumb shoot-thumb-empty">${SHOOT_THUMB_EMPTY_SVG}</div>`;
  }

  function renderShootRow(container, s, opts) {
    // Lets a section suppress the whole badge outright — e.g. Overview's
    // Proofs pending and Upcoming deadlines sections are each already one
    // homogeneous category, so re-stating "Pending: Proofs" or the status
    // on every row there is redundant. Today/Upcoming shoots mix several
    // statuses together, so the badge still earns its place there.
    const showBadge = !opts || opts.showBadge !== false;
    // Archive opts this in: a delivered shoot doesn't need its own status
    // re-stated there (it's implied by being in Archive), but if it's
    // missing final images that's worth flagging — resolved async below
    // since it requires an IndexedDB lookup, unlike every other badge part.
    const checkFinalImages = !!(showBadge && opts && opts.checkFinalImages && s.status === 'delivered' && !ed.isVideoShoot(s));
    const statusLabel = (showBadge && opts && opts.showStatus && !checkFinalImages) ? (ed.STATUS_LABELS[s.status] || '') : '';
    const pendingLabels = (showBadge && opts && opts.showPending) ? ed.shootPendingLabels(s) : [];
    const pendingText = pendingLabels.length ? `Pending: ${ed.escapeHtml(pendingLabels.join(', '))}` : '';
    // Proofs are only "pending" for the captured step itself — once a shoot
    // moves to waiting_for_selects, proofs have already gone out. Video has
    // no proofs step at all (after Captured it goes to Rough cut).
    const proofsPendingText = (showBadge && s.status === 'captured' && !ed.isVideoShoot(s)) ? 'Pending: Proofs' : '';
    // Once a shoot's captured there's a reflection worth writing eventually —
    // flag it if that's never happened yet, same idea as missing final images.
    // Applies on the Shoots page too, not just Archive, now that reflections
    // are expected any time from captured onward rather than only once archived.
    const hasReflection = ed.hasText(s.whatWentRight) || ed.hasText(s.couldBeBetter) || ed.hasText(s.lessonsLearned);
    const reflectionPendingText = (showBadge && ed.POST_CAPTURE_STATUSES.includes(s.status) && !hasReflection) ? 'Pending: Reflection' : '';
    // Status now gets its own stacked line with a background pill (see
    // .shoot-row-status-pill below) — everything else stays in the old
    // <br>-joined badge, which keeps its existing hidden/shown logic and its
    // async final-images top-up untouched, just moved to its own line under
    // the stack instead of sharing a slot with status.
    const badgeParts = [pendingText, proofsPendingText, reflectionPendingText].filter(Boolean);
    const badgeHtml = badgeParts.join('<br>');
    // Once delivered (or archived) there's nothing left to deliver, so the
    // deadline no longer means anything — don't show it. Otherwise, an
    // overdue deadline still shows, just in red.
    const isOverdue = !!s.deadline && s.deadline < ed.todayStr();
    const dueHtml = (s.deadline && !s.archived && s.status !== 'delivered')
      ? `<span class="shoot-row-date-line shoot-row-due${isOverdue ? ' overdue' : ''}">Due: ${ed.prettyDateShort(s.deadline)}</span>`
      : '';
    const statusHtml = statusLabel
      ? `<span class="shoot-row-status-pill">${ed.escapeHtml(statusLabel)}</span>`
      : '';
    // Opt-in (Today only): "Desert Western · Day 2 of 3" under the date for
    // a shoot that's part of a project, in the date line's own style.
    const rowProject = (opts && opts.showProjectLine && s.projectId) ? ed.findProject(s.projectId) : null;
    const rowDayInfo = rowProject ? ed.projectDayInfo(s) : null;
    const projectLineHtml = rowProject
      ? `<span class="shoot-row-date-line">${ed.escapeHtml(rowProject.name)}${rowDayInfo ? ` · Day ${rowDayInfo.day} of ${rowDayInfo.total}` : ''}</span>`
      : '';
    const div = document.createElement('div');
    div.className = 'shoot-row';
    div.innerHTML = `
      ${shootThumbHtml(s)}
      <div class="shoot-row-body">
        <span class="shoot-row-title"><strong>${ed.escapeHtml(ed.shootDisplayName(s))}</strong></span>
        <span class="shoot-row-date-line">${ed.shootDateLabel(s, ed.prettyDateShort)}</span>
        ${projectLineHtml}
        ${dueHtml}
        ${statusHtml}
        <span class="badge"${badgeHtml ? '' : ' hidden'}>${badgeHtml}</span>
      </div>
      <div class="shoot-row-accent-strip">
        <button type="button" class="row-options-btn" aria-label="Options">&#8942;</button>
      </div>
    `;
    div.addEventListener('click', () => {
      if (opts && opts.switchToShootsTab) document.querySelector('.tab[data-view="shoots"]').click();
      if (opts && opts.openArchiveMode) { ed.openArchiveMode(s.id); return; }
      ed.openShootModal(s.id);
    });
    // The whole yellow strip opens the options, not just the ⋮ circle in it:
    // the strip is what reads as the button, and a tap on it just beside the
    // ⋮ used to open the shoot instead. The ⋮ stays the focusable control
    // (keyboard, VoiceOver); its click bubbles up to here.
    div.querySelector('.shoot-row-accent-strip').addEventListener('click', (e) => {
      e.stopPropagation();
      ed.openShootOptions(s.id);
    });
    if (checkFinalImages) {
      ed.idbGetImages(ed.finalImagesKey(s.id)).then(images => {
        if (images.length) return;
        const badgeEl = div.querySelector('.badge');
        badgeEl.innerHTML = [...badgeParts, 'Pending: Final images'].join('<br>');
        badgeEl.hidden = false;
      }).catch(() => {});
    }
    container.appendChild(div);
  }

  // A smaller, photo-free row for tight spaces (the Overview counter
  // popups) — title, status, and shoot date, each on its own line, so
  // nothing is ever squeezed side-by-side against anything else.
  // opts.openArchiveMode (the project popup, for archived days) opens the
  // read-only Archive mode recap instead, same as a row on the Archive tab.
  function renderCompactShootRow(container, s, opts) {
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
      if (opts && opts.openArchiveMode) { ed.openArchiveMode(s.id); return; }
      ed.openShootModal(s.id);
    });
    div.querySelector('.row-options-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      ed.openShootOptions(s.id);
    });
    container.appendChild(div);
  }
};
