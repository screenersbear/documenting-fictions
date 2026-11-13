// A project's popup: its shoots, renaming it, and its buttons.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addProjectsProjectPopup = function addProjectsProjectPopup(ed) {
  Object.assign(ed, { openProjectPopup, refreshOpenProjectPopup, closeProjectPopup });
  // ---------- Project popup ----------
  // A project's own page: every member shoot (archived included) as the
  // same compact rows the stat box popup uses, plus the project-level
  // actions. Built on the stat box popup's overlay/modal classes, so it
  // shares that z-index — under the shoot modal (10) and the kebab sheet
  // (20), so a row's shoot or ⋮ opened from here stacks on top — and
  // renderAll() repaints it (refreshOpenProjectPopup) once they close,
  // the same job refreshOpenStatBoxDetail does for the stat boxes.
  let activeProjectId = null;
  let projectPopupHideTimer = null;
  // Guards "+ Add a day" against a double tap starting a second copy while
  // the first is still awaiting its IndexedDB writes (and Archive/Ungroup
  // against changing the project mid-copy).
  let projectPopupBusy = false;

  // Title, summary and member list only — the rename row is left exactly
  // as it is, so a repaint while you're typing a new name never wipes it.
  function renderProjectPopupBody(project) {
    const members = ed.projectMembers(project.id);
    document.getElementById('projectDetailTitle').textContent = project.name;
    const n = members.length;
    document.getElementById('projectDetailSummary').textContent = [
      `${n} shoot${n === 1 ? '' : 's'}`,
      // Only the days still on the schedule (see isOffScheduleShoot).
      ed.projectDateRangeText(members.filter(ed.isProjectLiveShoot)),
      ed.projectStatusLabel(members),
    ].filter(Boolean).join(' · ');
    // Flips once every shoot in the project is archived, the same way the
    // ⋮ menu's Archive/Unarchive shoot item does for one shoot.
    document.getElementById('projectArchiveBtn').textContent =
      members.length && members.every(s => s.archived) ? 'Unarchive project' : 'Archive project';
    const list = document.getElementById('projectDetailList');
    list.innerHTML = '';
    members.forEach(s => {
      // The stock compact row, so its tap (opens the shoot modal, which
      // stacks above this popup) and its ⋮ (normal shoot options) work
      // here unchanged; only the title gets its "Day N" prefix.
      ed.renderCompactShootRow(list, s);
      const info = ed.projectDayInfo(s);
      if (!info) return;
      const titleEl = list.lastElementChild && list.lastElementChild.querySelector('.shoot-row-compact-title');
      if (titleEl) titleEl.textContent = `Day ${info.day} · ${titleEl.textContent}`;
    });
  }

  function hideProjectRename() {
    document.getElementById('projectRenameRow').hidden = true;
  }

  function openProjectPopup(projectId) {
    const project = ed.findProject(projectId);
    if (!project || !ed.projectMembers(project.id).length) return;
    // Already open (e.g. "Open <name>" from a member's ⋮ while this is
    // showing) just repaints — no second scroll lock, no replayed fade.
    const wasOpen = activeProjectId !== null;
    if (activeProjectId !== projectId) hideProjectRename();
    activeProjectId = projectId;
    // A reopen inside a previous close's 200ms fade must not be hidden
    // out from under itself when that timer lands.
    clearTimeout(projectPopupHideTimer);
    renderProjectPopupBody(project);
    const overlay = document.getElementById('projectDetailOverlay');
    overlay.hidden = false;
    if (wasOpen) return;
    overlay.querySelector('.stat-box-detail-modal').scrollTop = 0;
    ed.lockBodyScroll();
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('open')));
  }

  // Called at the end of every renderAll(): anything that changes a shoot
  // re-renders the lists, and this keeps the popup underneath in step —
  // or closes it once the project is gone (ungrouped, last shoot deleted
  // or moved out).
  function refreshOpenProjectPopup() {
    if (activeProjectId === null) return;
    const project = ed.findProject(activeProjectId);
    if (!project || !ed.projectMembers(project.id).length) {
      closeProjectPopup();
      return;
    }
    renderProjectPopupBody(project);
  }

  function closeProjectPopup() {
    if (activeProjectId === null) return;
    activeProjectId = null;
    hideProjectRename();
    const overlay = document.getElementById('projectDetailOverlay');
    overlay.classList.remove('open');
    ed.unlockBodyScroll();
    clearTimeout(projectPopupHideTimer);
    projectPopupHideTimer = setTimeout(() => { overlay.hidden = true; }, 200);
  }

  document.getElementById('projectDetailCloseBtn').addEventListener('click', closeProjectPopup);
  document.getElementById('projectDetailOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeProjectPopup();
  });

  // A new day carries the latest day forward: same talent, team, location,
  // times, concept, mood board and lighting, dated the day after it.
  document.getElementById('projectAddDayBtn').addEventListener('click', async () => {
    const project = ed.findProject(activeProjectId);
    if (!project || projectPopupBusy) return;
    const members = ed.projectMembers(project.id);
    if (!members.length) return;
    // projectMembers is date-sorted with undated shoots last, so the last
    // dated member is the latest day — the new one is dated the day after.
    // A postponed or canceled day's kept date isn't a day of the project.
    const dated = members.filter(s => ed.scheduledShootDate(s));
    const latest = dated.length ? dated[dated.length - 1] : members[members.length - 1];
    let nextDate = '';
    if (ed.scheduledShootDate(latest)) {
      const [y, m, d] = latest.date.split('-').map(Number);
      nextDate = ed.formatDate(new Date(y, m - 1, d + 1));
    }
    projectPopupBusy = true;
    try {
      // Carries the latest day forward (its times, status, any shots it
      // didn't get to)...
      const shoot = await ed.copyShootForProject(latest, 'day', { date: nextDate });
      // ...and in a multi-day project, then takes on the lead's mirrored
      // details, mood board and cover as they are now (read after the copy,
      // so an edit made to Day 1 meanwhile isn't missed) and follows it.
      const liveProject = ed.findProject(project.id);
      const lead = ed.projectLeadOf(liveProject);
      if (lead && shoot.projectId === project.id) {
        ed.applyLeadDetails(lead, shoot);
        await ed.mirrorLeadImages(liveProject, lead, { board: true, cover: true }, [shoot]);
        shoot.followsLead = true;
        shoot.mirrorSig = ed.mirrorSignature(shoot);
      }
      ed.saveState();
      ed.renderAll();
      ed.refreshOpenStatBoxDetail();
      if (shoot.projectId) {
        const info = ed.projectDayInfo(shoot);
        const dayNumber = info ? info.day : ed.projectMembers(project.id).length;
        ed.showToast(`Day ${dayNumber} added to ${project.name}`);
      } else {
        ed.showToast(`${project.name} was ungrouped, so this was added as its own shoot`);
      }
      // A row tapped while the copy was still being written may already
      // have the shoot modal open — re-filling it would drop unsaved typing.
      if (ed.shootModalOverlay.hidden) ed.openShootModal(shoot.id);
    } catch (err) {
      ed.showToast("Couldn't add a day. Please try again.");
    } finally {
      projectPopupBusy = false;
    }
  });

  document.getElementById('projectRenameBtn').addEventListener('click', () => {
    const project = ed.findProject(activeProjectId);
    if (!project) return;
    const row = document.getElementById('projectRenameRow');
    if (!row.hidden) { row.hidden = true; return; }
    const input = document.getElementById('projectRenameInput');
    input.value = project.name;
    row.hidden = false;
    input.focus();
  });

  function saveProjectRename() {
    const project = ed.findProject(activeProjectId);
    const name = document.getElementById('projectRenameInput').value.trim();
    hideProjectRename();
    // An emptied box reads as "never mind" rather than wiping the name.
    if (!project || !name || name === project.name) return;
    ed.state.projects = ed.projectsList().map(p => (p.id === project.id ? { ...p, name } : p));
    ed.saveState();
    ed.renderAll();
    ed.refreshOpenStatBoxDetail();
  }

  document.getElementById('saveProjectRenameBtn').addEventListener('click', saveProjectRename);

  document.getElementById('projectRenameInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveProjectRename();
  });

  // Archives every shoot in the project in one go (whatever their status,
  // same as the ⋮ menu's Archive shoot), or brings them all back once the
  // whole project is archived. Days already archived on their own just stay
  // archived. The popup stays open on the result, now reading Unarchive.
  document.getElementById('projectArchiveBtn').addEventListener('click', async () => {
    const project = ed.findProject(activeProjectId);
    // Not mid-copy: a day still being added would miss the change.
    if (!project || projectPopupBusy) return;
    const members = ed.projectMembers(project.id);
    if (!members.length) return;
    const unarchiving = members.every(s => s.archived);
    const n = members.length;
    const who = n === 1 ? 'Its 1 shoot moves' : `All ${n} shoots move`;
    // Not red: archiving is undone from this same button.
    const ok = await ed.askConfirm(unarchiving
      ? { title: `Unarchive ${project.name}?`, text: `${who} back to Shoots.`, confirmLabel: 'Unarchive', cancelLabel: 'Keep archived' }
      : { title: `Archive ${project.name}?`, text: `${who} to Archive.`, confirmLabel: 'Archive', cancelLabel: 'Keep in Shoots' });
    // The popup only asks; the project is re-checked in case it's gone (or
    // a copy started) while it was up.
    if (!ok || activeProjectId !== project.id || !ed.findProject(project.id) || projectPopupBusy) return;
    ed.state.shoots = ed.state.shoots.map(s => (s.projectId === project.id ? { ...s, archived: !unarchiving } : s));
    ed.saveState();
    ed.renderAll();
    ed.refreshOpenStatBoxDetail();
    ed.showToast(unarchiving ? `${project.name} is back in Shoots` : `${project.name} moved to Archive`);
  });

  document.getElementById('projectUngroupBtn').addEventListener('click', async () => {
    const project = ed.findProject(activeProjectId);
    // Not mid-copy: the day being added would otherwise land after its
    // project is already gone.
    if (!project || projectPopupBusy) return;
    const n = ed.projectMembers(project.id).length;
    const rest = n === 1 ? 'Its 1 shoot stays as a separate shoot.' : `Its ${n} shoots stay as separate shoots.`;
    // Not red: every shoot stays, only the grouping goes.
    const ok = await ed.askConfirm({ title: `Ungroup ${project.name}?`, text: rest, confirmLabel: 'Ungroup', cancelLabel: 'Keep together' });
    if (!ok || activeProjectId !== project.id || !ed.findProject(project.id) || projectPopupBusy) return;
    // Read again after the answer, so it's exactly the days in it now.
    const members = ed.projectMembers(project.id);
    members.forEach(s => ed.setShootProject(s.id, ''));
    // Removed explicitly as well, rather than leaning only on the prune
    // inside setShootProject, so ungrouping never depends on how that
    // prune decides "empty".
    ed.state.projects = ed.projectsList().filter(p => p.id !== project.id);
    ed.saveState();
    closeProjectPopup();
    ed.renderAll();
    ed.refreshOpenStatBoxDetail();
  });
};
