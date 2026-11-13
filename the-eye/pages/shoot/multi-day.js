// A multi-day shoot, in Logistics: its days and dates.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootMultiDay = function addShootMultiDay(ed) {
  Object.assign(ed, { multiDayDatesText, multiDayMembership, resetMultiDayDraft, updateMultiDayRow, markShootModalAsSaved });
  // ---------- Multi-day shoot (Logistics) ----------
  // A checkbox under Shoot date that turns this shoot into Day 1 of a new
  // project, with one copied shoot per following day (see
  // copyShootForProject). Never part of the shoot's own data: nothing here is
  // read by gatherShootFormData, and both controls stop their input/change
  // events at the source so they never schedule an autosave of their own.
  // Membership only changes through the explicit actions below (Create days,
  // or unticking a member), and the row is always rebuilt from saved state by
  // updateMultiDayRow().
  const MULTI_DAY_MAX_DAYS = 14;
  ed.multiDayPromptDates = null;
  ed.multiDayCreating = false;

  // 'YYYY-MM-DD' shifted by n calendar days. Done on a local Date's day field
  // rather than by adding n * 86400000ms, so a DST change in between can
  // never land it a day off.
  function addDaysToDateStr(dateStr, n) {
    const d = ed.parseShootDate(dateStr);
    d.setDate(d.getDate() + n);
    return ed.formatDate(d);
  }

  // Every date from start to end, inclusive. Stops one past the limit —
  // enough for the caller to tell "too long" apart without walking a
  // mis-picked year-long range a day at a time.
  function multiDayDateRange(startStr, endStr) {
    const dates = [];
    let d = startStr;
    while (d <= endStr && dates.length <= MULTI_DAY_MAX_DAYS) {
      dates.push(d);
      d = addDaysToDateStr(d, 1);
    }
    return dates;
  }

  // "Oct 14, 15 and 16" — the month is only repeated when it changes
  // ("Oct 31 and Nov 1"). Past 4 days a full list stops being readable, so
  // it collapses to "Oct 14 – Oct 20 (7 days)".
  function multiDayDatesText(dates) {
    const monthDay = (ds) => ed.parseShootDate(ds).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    if (dates.length > 4) {
      return `${monthDay(dates[0])} – ${monthDay(dates[dates.length - 1])} (${dates.length} days)`;
    }
    return ed.joinWithAnd(dates.map((ds, i) => (
      i > 0 && ds.slice(0, 7) === dates[i - 1].slice(0, 7)
        ? String(ed.parseShootDate(ds).getDate())
        : monthDay(ds)
    )));
  }

  // The open shoot's saved project membership as { shoot, project }, or null.
  // Read by id from saved state, never the form, so a never-saved draft is
  // always "not a member". A projectId pointing at a missing project counts
  // as no project, same as collapseProjects.
  function multiDayMembership() {
    const shoot = ed.state.shoots.find(x => x.id === ed.currentShootId);
    const project = shoot && shoot.projectId ? ed.findProject(shoot.projectId) : null;
    return project ? { shoot, project } : null;
  }

  // Back to a plain unticked row with the Last day picker hidden and empty.
  function resetMultiDayDraft() {
    document.getElementById('shootMultiDay').checked = false;
    const lastDayInput = document.getElementById('shootLastDay');
    lastDayInput.value = '';
    lastDayInput.removeAttribute('min');
    lastDayInput.removeAttribute('max');
    document.getElementById('multiDayLastDayLabel').hidden = true;
  }

  // Rebuilds the row from saved membership: a member reads as a ticked
  // "Part of <project> · Day N of M" (the day suffix only when projectDayInfo
  // has one — dated, not postponed/canceled, 2+ live dates in the project);
  // anything else is a fresh unticked "Multi-day shoot". Called from
  // openShootModal and after every membership change made while the shoot
  // modal is open.
  function updateMultiDayRow() {
    resetMultiDayDraft();
    const label = document.getElementById('multiDayLabel');
    const membership = multiDayMembership();
    if (!membership) {
      label.textContent = 'Multi-day shoot';
      return;
    }
    const info = ed.projectDayInfo(membership.shoot);
    document.getElementById('shootMultiDay').checked = true;
    // Says how this day relates to its project's lead day, when it has one:
    // the lead, a day mirroring it, or a day that's been made its own.
    const lead = ed.projectLeadOf(membership.project);
    let mirrorText = '';
    if (lead && lead.id === membership.shoot.id) {
      mirrorText = ' · mirrored to the other days';
    } else if (lead) {
      const leadInfo = ed.projectDayInfo(lead);
      mirrorText = membership.shoot.followsLead
        ? ` · mirrors ${leadInfo ? `Day ${leadInfo.day}` : 'the first day'}`
        : ' · has its own changes';
    }
    label.textContent = `Part of ${membership.project.name}${info ? ` · Day ${info.day} of ${info.total}` : ''}${mirrorText}`;
  }

  // Keeps the Last day picker's allowed range anchored to the shoot date:
  // from the day after it up to 13 days after it (14 days in all).
  function setLastDayRange(startDate) {
    const lastDayInput = document.getElementById('shootLastDay');
    lastDayInput.min = addDaysToDateStr(startDate, 1);
    lastDayInput.max = addDaysToDateStr(startDate, MULTI_DAY_MAX_DAYS - 1);
  }

  // A brand-new draft that Create days just force-saved is a real saved shoot
  // now — so the modal switches to behaving like Edit Shoot for it, showing
  // the same edit-only controls openShootModal(id) would have (Share, Delete,
  // Shoot mode, Complete). No-op for a shoot that was already open for editing.
  function markShootModalAsSaved() {
    if (ed.editingShootId === ed.currentShootId) return;
    ed.editingShootId = ed.currentShootId;
    document.getElementById('deleteShootBtn').hidden = false;
    document.getElementById('shareShootBtn').hidden = false;
    const isArchived = !document.getElementById('unarchiveShootBtn').hidden;
    document.getElementById('completeShootBtn').hidden = isArchived || document.getElementById('shootStatus').value !== 'delivered';
    ed.updateEnterShootModeBtnVisibility();
  }

  // Neither control is shoot data, so neither may reach the form-level
  // input/change listeners (scheduleShootAutosave, syncFieldFilledState).
  ['shootMultiDay', 'shootLastDay'].forEach(id => {
    document.getElementById(id).addEventListener('input', (e) => e.stopPropagation());
  });

  document.getElementById('shootMultiDay').addEventListener('change', async (e) => {
    e.stopPropagation();
    const checkbox = e.target;
    const membership = multiDayMembership();
    if (membership) {
      // A member's box only ever goes from ticked to unticked by hand —
      // that's the "take it out of the project" gesture.
      if (checkbox.checked) return;
      // Ticked again while it asks: the box only reads unticked once the
      // shoot really is out (updateMultiDayRow below), so "Keep it in"
      // needs nothing undone.
      checkbox.checked = true;
      const shootId = membership.shoot.id;
      const ok = await ed.askConfirm({
        title: `Take this shoot out of ${membership.project.name}?`,
        text: 'It stays as its own shoot.',
        confirmLabel: 'Take it out',
        cancelLabel: 'Keep it in',
      });
      // Still this shoot's page, and still in that project (the popup sits
      // over the page, so both should be).
      const current = multiDayMembership();
      if (!ok || ed.shootModalOverlay.hidden || !current || current.shoot.id !== shootId) return;
      // Commit any edit still sitting in the debounce first, so the lists
      // re-rendered below already show it.
      ed.saveShootNow();
      ed.setShootProject(current.shoot.id, '');
      ed.saveState();
      ed.renderAll();
      ed.refreshOpenStatBoxDetail();
      updateMultiDayRow();
      return;
    }
    if (!checkbox.checked) {
      resetMultiDayDraft();
      return;
    }
    const startDate = document.getElementById('shootDate').value;
    if (!startDate) {
      checkbox.checked = false;
      ed.showToast('Set the shoot date first');
      return;
    }
    document.getElementById('shootLastDay').value = '';
    setLastDayRange(startDate);
    document.getElementById('multiDayLastDayLabel').hidden = false;
    maybeShowMultiDayNotice();
  });

  // A heads-up the moment Multi-day is ticked — on the shoot page or in the
  // new-shoot guide — that each day gets a shoot page of its own, before the
  // Last day picker and the confirm popup. "Don't show again" is remembered
  // on this device.
  const MULTI_DAY_NOTICE_HIDDEN_KEY = 'dailies_multi_day_notice_hidden_v1';

  function maybeShowMultiDayNotice() {
    let hidden;
    try { hidden = localStorage.getItem(MULTI_DAY_NOTICE_HIDDEN_KEY) === '1'; } catch (err) { hidden = false; }
    if (!hidden) document.getElementById('multiDayNoticeOverlay').hidden = false;
  }

  document.getElementById('multiDayNoticeOkBtn').addEventListener('click', () => {
    document.getElementById('multiDayNoticeOverlay').hidden = true;
  });

  document.getElementById('multiDayNoticeHideBtn').addEventListener('click', () => {
    try { localStorage.setItem(MULTI_DAY_NOTICE_HIDDEN_KEY, '1'); } catch (err) { /* storage unavailable — nothing to remember it in */ }
    document.getElementById('multiDayNoticeOverlay').hidden = true;
  });

  document.getElementById('shootLastDay').addEventListener('change', (e) => {
    e.stopPropagation();
    const lastDayInput = e.target;
    const lastDay = lastDayInput.value;
    if (!lastDay || multiDayMembership()) return;
    // Desktop keyboards fire change mid-typing ("0002-10-16" after the first
    // year digit) — wait for a real four-digit year before checking it.
    if (lastDay.slice(0, 4) < '1000') return;
    const startDate = document.getElementById('shootDate').value;
    if (!startDate) {
      resetMultiDayDraft();
      ed.showToast('Set the shoot date first');
      return;
    }
    if (lastDay <= startDate) {
      lastDayInput.value = '';
      ed.showToast('Pick a last day after the shoot date');
      return;
    }
    const dates = multiDayDateRange(startDate, lastDay);
    if (dates.length > MULTI_DAY_MAX_DAYS) {
      lastDayInput.value = '';
      ed.showToast(`Multi-day shoots can be up to ${MULTI_DAY_MAX_DAYS} days`);
      return;
    }
    // Dismisses the native date picker so it isn't left floating over the
    // prompt (the focusout this fires runs the usual saveShootNow — harmless).
    lastDayInput.blur();
    ed.openMultiDayPrompt(dates);
  });

  // The shoot date moving — or being cleared — changes what the row should
  // say. A member's "Day N of M" is worked out from saved dates, so the edit
  // is committed first; a non-member's in-progress pick has its Last day
  // range re-anchored, or is dropped entirely if there's no date left to
  // anchor it to.
  function syncMultiDayRowToShootDate() {
    if (multiDayMembership()) {
      ed.saveShootNow();
      updateMultiDayRow();
      return;
    }
    if (!document.getElementById('shootMultiDay').checked) return;
    const startDate = document.getElementById('shootDate').value;
    if (!startDate) {
      resetMultiDayDraft();
      return;
    }
    document.getElementById('shootLastDay').value = '';
    setLastDayRange(startDate);
  }

  document.getElementById('shootDate').addEventListener('change', syncMultiDayRowToShootDate);
};
