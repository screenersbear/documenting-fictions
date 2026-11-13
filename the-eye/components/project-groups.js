// Projects in lists: a project's shoots shown together under it.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addProjectGroups = function addProjectGroups(ed) {
  Object.assign(ed, { listItemRep, listItemDate, listItemStatusKey, projectDateRangeText, renderListItem, renderCompactListItem });
  // ---------- Projects in lists ----------
  // Every list of shoot rows (Overview, the counter popups, Shoots, Archive)
  // runs its shoots through collapseProjects() first, so a project's members
  // show as ONE box per list instead of a row per day. The helpers below read
  // either kind of item the same way. Today, Stats and the Journal stay
  // per-shoot and never see project boxes.

  // The shoot an item is sorted and filed by: a plain shoot is its own; a
  // project box uses its rep (collapseProjects: its next day ahead, else its
  // first day).
  function listItemRep(item) {
    return item.kind === 'project' ? item.rep : item.shoot;
  }

  // The date a list item is filed under for a given shoot field ('date' or
  // 'deadline') — a shoot's own value, or a project box's rep's, except for
  // 'deadline', where a project files under the earliest still-owed deadline
  // among its listed members: the same one its Due line shows.
  function listItemDate(item, field) {
    if (item.kind !== 'project') return item.shoot[field] || '';
    if (field === 'deadline') return projectNextDeadline(item.members);
    return item.rep[field] || '';
  }

  // Shoots-tab Status-sort group: a shoot's own status, or for a project box
  // the least-advanced status among its listed members, so the box sits with
  // whatever's still left to do.
  function listItemStatusKey(item) {
    return item.kind === 'project' ? ed.projectGroupStatusKey(item.members) : (item.shoot.status || 'prospect');
  }

  // Short dot-date range in prettyDateShort's locale-ordered numeral style —
  // "10.14–10.16.26" on an M/D/Y device. Two ends in the same year write the
  // year once, on whichever end the locale puts it (the end for M/D/Y and
  // D/M/Y, the start for Y/M/D), so the range still reads in the device's own
  // field order; different years spell out both ends in full; a single date
  // (or two equal ones) is just that date.
  function prettyDateRangeShort(startStr, endStr) {
    if (!startStr || !endStr || startStr === endStr) return ed.prettyDateShort(startStr || endStr);
    if (startStr.slice(0, 4) !== endStr.slice(0, 4)) return `${ed.prettyDateShort(startStr)}–${ed.prettyDateShort(endStr)}`;
    const numeralParts = (dateStr) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Intl.DateTimeFormat(undefined, { year: '2-digit', month: 'numeric', day: 'numeric' })
        .formatToParts(new Date(y, m - 1, d))
        .filter(p => p.type !== 'literal');
    };
    const startParts = numeralParts(startStr);
    const endParts = numeralParts(endStr);
    const join = (parts, withYear) => parts.filter(p => withYear || p.type !== 'year').map(p => p.value).join('.');
    const yearFirst = startParts.length > 0 && startParts[0].type === 'year';
    return yearFirst
      ? `${join(startParts, true)}–${join(endParts, false)}`
      : `${join(startParts, false)}–${join(endParts, true)}`;
  }

  // First-to-last date span of the given members ('' when none has a date).
  // Undated members are simply left out of the span.
  function projectDateRangeText(members) {
    const dates = members.map(s => s.date).filter(Boolean).sort();
    return dates.length ? prettyDateRangeShort(dates[0], dates[dates.length - 1]) : '';
  }

  // A project box's version of shootDateLabel: the same "Shoots:"/"Shot:"
  // prefix ("Shoots" while its last listed day is still ahead or today,
  // "Shot" once every listed day has passed) over the span of its listed
  // members' dates. "Date TBD" when none of them has a date yet. Postponed
  // and canceled days are left out (their dates are only the original plan,
  // see isOffScheduleShoot), unless every dated day is one: then it's the
  // span they were planned for, as "Originally: …", like a shoot row — or,
  // when any of them has been given a new date since (scheduledShootDate,
  // see isOriginalPlanDate), the span of those new dates, read as the plan.
  function projectDateRangeLabel(members) {
    let live = members.filter(ed.isProjectLiveShoot);
    if (!projectDateRangeText(live)) live = members.filter(s => ed.scheduledShootDate(s));
    const range = projectDateRangeText(live);
    if (!range) {
      const original = projectDateRangeText(members);
      return original ? `Originally: ${original}` : 'Date TBD';
    }
    const last = live.map(s => s.date).filter(Boolean).sort().pop();
    return `${last >= ed.todayStr() ? 'Shoots' : 'Shot'}: ${range}`;
  }

  // Earliest still-owed deadline among the given members, by the same rule
  // as Upcoming deadlines (isUpcomingDeadline): overdue still counts (and
  // shows in red), delivered or archived doesn't. '' when there's none.
  function projectNextDeadline(members) {
    return members.filter(ed.isUpcomingDeadline).map(s => s.deadline).sort()[0] || '';
  }

  // One box standing in for a project's members in a list. It uses the same
  // .shoot-row markup and classes as renderShootRow (same 96px thumb, accent
  // strip and 120px body floor) but is filled from the project:
  // - its name, and its rep's cover (else the first member's that has one);
  // - the date span of the members in THIS list;
  // - a "N shoots" line in the date line's style. N counts every member,
  //   archived ones included, so it reads the same in every list, plus
  //   "· 2 of 3 shot" while the project is part-way through capture;
  // - the earliest still-owed deadline, and the union of its listed members'
  //   Pending labels.
  // The same opts as renderShootRow switch the status pill and Pending line
  // on or off. Title + date + count + due + one pill/badge line still fits
  // inside the 120px min-height, so the box lines up with the shoot rows
  // around it. Like a shoot row, it only grows when a long Pending line wraps
  // on a narrow screen. Tapping the box, or its ⋮, opens the project popup,
  // never one shoot; each day is reachable from there.
  function renderProjectRow(container, item, opts) {
    const { project, members, rep } = item;
    const allMembers = ed.projectMembers(project.id);
    const showBadge = !opts || opts.showBadge !== false;
    const statusKey = (showBadge && opts && opts.showStatus) ? ed.projectGroupStatusKey(members) : '';
    const statusLabel = statusKey ? (ed.STATUS_LABELS[statusKey] || '') : '';
    const pendingLabels = (showBadge && opts && opts.showPending)
      ? [...new Set([].concat(...members.map(s => ed.shootPendingLabels(s))))]
      : [];
    const pendingText = pendingLabels.length ? `Pending: ${ed.escapeHtml(pendingLabels.join(', '))}` : '';
    // The same per-day reminders a shoot row adds whenever its badge shows
    // (proofs owed on a captured photo day, a reflection never written),
    // said once for the box when any listed day has them.
    const proofsPendingText = (showBadge && members.some(s => s.status === 'captured' && !ed.isVideoShoot(s))) ? 'Pending: Proofs' : '';
    const reflectionPendingText = (showBadge && members.some(s => ed.POST_CAPTURE_STATUSES.includes(s.status)
      && !ed.hasText(s.whatWentRight) && !ed.hasText(s.couldBeBetter) && !ed.hasText(s.lessonsLearned))) ? 'Pending: Reflection' : '';
    const badgeHtml = [pendingText, proofsPendingText, reflectionPendingText].filter(Boolean).join('<br>');
    // "· 2 of 3 shot" only while the project is part-way through capture
    // (projectShotProgressLabel is the same test projectStatusLabel uses); a
    // project entirely ahead or entirely shot already says so through its
    // dates and the list it sits in.
    const progress = ed.projectShotProgressLabel(allMembers);
    const progressText = progress ? ` · ${progress}` : '';
    const countText = `${allMembers.length} ${allMembers.length === 1 ? 'shoot' : 'shoots'}${progressText}`;
    const deadline = projectNextDeadline(members);
    const isOverdue = !!deadline && deadline < ed.todayStr();
    const dueHtml = deadline
      ? `<span class="shoot-row-date-line shoot-row-due${isOverdue ? ' overdue' : ''}">Due: ${ed.prettyDateShort(deadline)}</span>`
      : '';
    const statusHtml = statusLabel
      ? `<span class="shoot-row-status-pill">${ed.escapeHtml(statusLabel)}</span>`
      : '';
    const coverShoot = (rep && rep.projectPhoto) ? rep : allMembers.find(s => s.projectPhoto);
    const div = document.createElement('div');
    div.className = 'shoot-row';
    div.innerHTML = `
      ${ed.shootThumbHtml(coverShoot || {})}
      <div class="shoot-row-body">
        <span class="shoot-row-title"><strong>${ed.escapeHtml(project.name || ed.UNTITLED_PROJECT_NAME)}</strong></span>
        <span class="shoot-row-date-line">${ed.escapeHtml(projectDateRangeLabel(members))}</span>
        <span class="shoot-row-date-line">${ed.escapeHtml(countText)}</span>
        ${dueHtml}
        ${statusHtml}
        <span class="badge"${badgeHtml ? '' : ' hidden'}>${badgeHtml}</span>
      </div>
      <div class="shoot-row-accent-strip">
        <button type="button" class="row-options-btn" aria-label="Project options">&#8942;</button>
      </div>
    `;
    div.addEventListener('click', () => ed.openProjectPopup(project.id));
    div.querySelector('.row-options-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      ed.openProjectPopup(project.id);
    });
    container.appendChild(div);
  }

  // renderCompactShootRow's counterpart for the Overview counter popups: the
  // project's name, its derived status in the status slot, and the date span
  // of its listed members. The status comes from the listed members only:
  // in "In the edit" that's the days actually in the edit, not a later day
  // still being planned. Tap or ⋮ opens the project popup, which stacks
  // above this one.
  function renderCompactProjectRow(container, item) {
    const { project, members } = item;
    const statusLabel = ed.projectStatusLabel(members);
    const div = document.createElement('div');
    div.className = 'shoot-row-compact';
    div.innerHTML = `
      <div class="shoot-row-compact-body">
        <span class="shoot-row-compact-title">${ed.escapeHtml(project.name || ed.UNTITLED_PROJECT_NAME)}</span>
        ${statusLabel ? `<span class="badge">${ed.escapeHtml(statusLabel)}</span>` : ''}
        <span class="mi-sub">${ed.escapeHtml(projectDateRangeLabel(members))}</span>
      </div>
      <button type="button" class="row-options-btn" aria-label="Project options">&#8942;</button>
    `;
    div.addEventListener('click', () => ed.openProjectPopup(project.id));
    div.querySelector('.row-options-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      ed.openProjectPopup(project.id);
    });
    container.appendChild(div);
  }

  // Draws one collapseProjects() item: a normal shoot row, or a project box.
  function renderListItem(container, item, opts) {
    if (item.kind === 'project') renderProjectRow(container, item, opts);
    else ed.renderShootRow(container, item.shoot, opts);
  }

  // Compact (counter popup) version of renderListItem.
  function renderCompactListItem(container, item) {
    if (item.kind === 'project') renderCompactProjectRow(container, item);
    else ed.renderCompactShootRow(container, item.shoot);
  }
};
