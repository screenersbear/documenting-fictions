// Multi-day: back on schedule, and the prompt for the other days.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootMultiDayPrompt = function addShootMultiDayPrompt(ed) {
  Object.assign(ed, { openMultiDayPrompt });
  // A new date on a Postponed or Canceled shoot most likely means it's back
  // on, so the page asks, with the answers named for what they do. Keeping
  // the status leaves the new date as the plan it's moved to (it isn't the
  // date it went off the schedule with, see isOriginalPlanDate); "Back on
  // the schedule" moves it to Active planning the way the status button
  // does, so that change's own follow-ups run too. Asked once the date field
  // is let go of — a date typed on a keyboard changes on every digit — and
  // only while the page is still open on that shoot, still off the schedule,
  // with a date that isn't the one it went off the schedule with.
  let backOnScheduleAskFor = null;

  async function askBackOnSchedule() {
    const shootId = backOnScheduleAskFor;
    backOnScheduleAskFor = null;
    const select = document.getElementById('shootStatus');
    const status = select.value;
    const date = document.getElementById('shootDate').value;
    if (!ed.shootPageOpenOn(shootId) || !ed.isOffScheduleShoot({ status }) || !date || date === ed.currentOffScheduleDate) return;
    const label = ed.STATUS_LABELS[status].toLowerCase();
    const backOn = await ed.askConfirm({
      title: 'New date. Is it back on?',
      text: `This shoot is ${label}. Put it back on the schedule for ${ed.prettyDate(date)}, or keep it ${label} for now?`,
      cancelLabel: `Keep ${label}`,
      confirmLabel: 'Back on the schedule',
    });
    // Nothing to do if the page closed or the status moved meanwhile.
    if (!backOn || !ed.shootPageOpenOn(shootId) || select.value !== status) return;
    select.value = 'planning';
    select.dispatchEvent(new Event('change', { bubbles: true }));
    ed.saveShootNow();
  }

  document.getElementById('shootDate').addEventListener('change', (e) => {
    if (!ed.isOffScheduleShoot({ status: document.getElementById('shootStatus').value })) return;
    backOnScheduleAskFor = ed.currentShootId;
    if (document.activeElement !== e.target) askBackOnSchedule();
  });
  document.getElementById('shootDate').addEventListener('blur', () => {
    if (backOnScheduleAskFor) askBackOnSchedule();
  });
  // A status change never touches the date any more (Postponed/Canceled keep
  // it), so a non-member's Last day pick is left alone; but a member's "Day
  // N of M" still moves with it, since a postponed or canceled day stops
  // counting as a day of the project (isProjectLiveShoot).
  document.getElementById('shootStatus').addEventListener('change', () => {
    if (!ed.multiDayMembership()) return;
    ed.saveShootNow();
    ed.updateMultiDayRow();
  });

  function openMultiDayPrompt(dates) {
    ed.multiDayPromptDates = dates;
    const term = ed.moodboardTerm(document.getElementById('shootCategory').value).toLowerCase();
    document.getElementById('multiDayPromptText').textContent =
      `This makes a separate shoot for each day: ${ed.multiDayDatesText(dates)}. Everything on Day 1 (talent, team, location, concept, notes, ${term} and lighting setups) is mirrored to the other days, including any changes you make to Day 1 later. Each day keeps its own date, times, status, shot list and reflection. Note: if you change anything on another day yourself, that day keeps its own version and won't pick up later changes to Day 1.`;
    // Read off the form rather than saved state — a brand-new draft has
    // nothing saved yet, and an existing shoot may have unsaved edits.
    const talent = ed.currentTalents.find(t => ed.hasText(t.name));
    document.getElementById('multiDayProjectNameInput').value =
      document.getElementById('shootTitle').value.trim() || (talent ? talent.name.trim() : '') || ed.UNTITLED_PROJECT_NAME;
    document.getElementById('multiDayPromptOverlay').hidden = false;
  }

  function closeMultiDayPrompt() {
    document.getElementById('multiDayPromptOverlay').hidden = true;
    ed.multiDayPromptDates = null;
  }

  document.getElementById('multiDayPromptCancelBtn').addEventListener('click', () => {
    if (ed.multiDayCreating) return;
    closeMultiDayPrompt();
    ed.resetMultiDayDraft();
  });

  document.getElementById('multiDayProjectNameInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('multiDayPromptCreateBtn').click();
  });

  document.getElementById('multiDayPromptCreateBtn').addEventListener('click', async () => {
    if (ed.multiDayCreating) return;
    const dates = ed.multiDayPromptDates;
    if (!dates || dates.length < 2 || ed.shootModalOverlay.hidden || ed.multiDayMembership()) {
      closeMultiDayPrompt();
      ed.updateMultiDayRow();
      return;
    }
    ed.multiDayCreating = true;
    const createBtn = document.getElementById('multiDayPromptCreateBtn');
    createBtn.textContent = 'Creating…';
    let project = null;
    let sourceId = null;
    try {
      const name = document.getElementById('multiDayProjectNameInput').value.trim() || ed.UNTITLED_PROJECT_NAME;
      // Day 1 must be a real saved shoot before a project can point at it or
      // anything can be copied from it. Forced: a draft whose only content so
      // far is its date reads as blank to isShootDataBlank (the date is
      // deliberately not counted), so a normal autosave would skip it — and
      // closeShootModal would then wipe it as an abandoned draft.
      clearTimeout(ed.shootSaveTimer);
      const day1 = ed.autosaveShoot(true);
      sourceId = day1.id;
      ed.markShootModalAsSaved();
      project = ed.createProject(name);
      ed.setShootProject(sourceId, project.id);
      // Saved straight away so the link survives even if the app is
      // backgrounded and discarded while the days below are still copying.
      ed.saveState();
      // setShootProject spread-writes a new object — copy from the live one.
      const source = ed.state.shoots.find(x => x.id === sourceId);
      try {
        // One at a time, in date order, so the new shoots land in
        // state.shoots (and their IndexedDB rows) in the same order as
        // their days.
        for (const date of dates.slice(1)) {
          const day = await ed.copyShootForProject(source, 'day', { date, projectId: project.id });
          // Each new day follows Day 1 (see syncProjectMirrors).
          if (day && day.projectId === project.id) {
            day.followsLead = true;
            day.mirrorSig = ed.mirrorSignature(day);
          }
        }
      } catch (err) {
        // An IndexedDB write failing part-way (e.g. storage full) keeps the
        // days that did get made; the toast below says how many that was.
      }
      // Day 1 becomes the lead the other days mirror; its current details
      // are what they were just copied from.
      const liveProject = ed.findProject(project.id);
      const lead = ed.state.shoots.find(x => x.id === sourceId);
      if (liveProject && lead) {
        liveProject.leadShootId = sourceId;
        liveProject.mirrorSig = ed.mirrorSignature(lead);
      }
      ed.saveState();
    } finally {
      ed.multiDayCreating = false;
      createBtn.textContent = 'Create days';
    }
    closeMultiDayPrompt();
    ed.renderAll();
    ed.refreshOpenStatBoxDetail();
    if (!ed.shootModalOverlay.hidden && ed.currentShootId === sourceId) ed.updateMultiDayRow();
    const total = ed.projectMembers(project.id).length;
    ed.showToast(total === dates.length
      ? `${total} days created in ${project.name}`
      : `Only ${total} of ${dates.length} days could be created in ${project.name}`);
  });
};
