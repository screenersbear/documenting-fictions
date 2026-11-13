// Saving a shoot as you go: what the form holds, and when it's saved.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootSave = function addShootSave(ed) {
  Object.assign(ed, { gatherShootFormData, applyStatusTimestamps, autosaveShoot, scheduleShootAutosave, saveShootNow });
  function gatherShootFormData() {
    const frameworkTags = [...document.querySelectorAll(ed.FRAMEWORK_TAG_CHECKED_SELECTOR)]
      .map(cb => ({ frameworkId: cb.dataset.fw, tag: cb.value }));

    const teamRequired = ed.getTeamRequiredChoice();

    const data = {
      title: document.getElementById('shootTitle').value.trim(),
      status: document.getElementById('shootStatus').value,
      date: document.getElementById('shootDate').value,
      // Always present, so a status moved back onto the schedule clears the
      // saved one in the {...oldShoot, ...data} spread (an undefined key is
      // left out of the JSON that's stored).
      offScheduleDate: ed.currentOffScheduleDate,
      deadline: document.getElementById('shootDeadline').value,
      startTime: document.getElementById('shootStartTime').value,
      endTime: document.getElementById('shootEndTime').value,
      crewCallTime: document.getElementById('shootCrewCallTime').value,
      talentCallTime: document.getElementById('shootTalentCallTime').value,
      location: { ...ed.currentShootLocation },
      talents: ed.currentTalents.map(t => ({ id: t.id, name: t.name.trim(), socialHandles: [...t.socialHandles], photo: t.photo || '' })),
      category: document.getElementById('shootCategory').value,
      premise: document.getElementById('shootPremise').value.trim(),
      character: document.getElementById('shootCharacter').value.trim(),
      shootGoals: document.getElementById('shootGoals').value.trim(),
      elevatorPitch: document.getElementById('shootElevatorPitch').value.trim(),
      // Video-only, but kept (not cleared) while hidden for other categories
      // so a flip away from Video and back doesn't lose them.
      deliverables: document.getElementById('shootDeliverables').value.trim(),
      aspectRatios: ed.normalizeAspectRatios([...document.querySelectorAll('#shootAspectRatios input[type="checkbox"]:checked')].map(cb => cb.value)),
      deliverableDestinations: document.getElementById('shootDeliverableDestinations').value.trim(),
      worldNotes: document.getElementById('shootWorldNotes').value.trim(),
      moodboardComplete: document.getElementById('shootMoodboardComplete').checked,
      teamRequired,
      teamFinalized: document.getElementById('shootTeamFinalized').checked,
      // Kept whatever the team answer: "Just me" only hides the list, so
      // switching back to "With a team" brings everyone straight back.
      teamMembers: [...ed.currentTeamMembers],
      references: ed.currentReferences.map(r => r.trim()).filter(r => r),
      frameworkTags,
      whatWentRight: document.getElementById('shootWentRight').value.trim(),
      couldBeBetter: document.getElementById('shootCouldBeBetter').value.trim(),
      lessonsLearned: document.getElementById('shootLessonsLearned').value.trim(),
      talentDirections: document.getElementById('shootTalentDirections').value.trim(),
      teamDirections: document.getElementById('shootTeamDirections').value.trim(),
      shootingNotes: document.getElementById('shootShootingNotes').value.trim(),
      locationDirections: document.getElementById('shootLocationDirections').value.trim(),
      shotList: [...ed.currentShotList],
      lightingSetups: [...ed.currentLightingSetups],
      // Omitted rather than set to null when there's nothing pending: there's
      // no "remove cover photo" action anywhere, so pendingProjectPhoto only
      // legitimately goes from empty to a real photo, never back down. If it
      // reads empty here it's because this shoot's photo hadn't finished
      // loading from IndexedDB yet when the modal opened (that's async, and
      // runs once at boot) — spreading an explicit null over the shoot's
      // existing photo on every autosave/blur was silently wiping the
      // thumbnail. Leaving the key out lets the {...oldShoot, ...data} spread
      // in autosaveShoot() keep whatever the shoot already had.
      ...(ed.pendingProjectPhoto ? { projectPhoto: ed.pendingProjectPhoto } : {}),
    };
    // The honest answers that still stand (not-sure.js).
    data.notSure = ed.notSureNow(data);
    return data;
  }

  // A brand-new, never-touched shoot draft shouldn't get written to state
  // just because the modal was opened — only once it actually has content.
  function isShootDataBlank(data) {
    // The country field pre-fills itself from state.defaultCountry on every
    // brand-new shoot draft, so it can't count as "the user entered
    // something" here or every untouched New Shoot would silently save.
    const loc = data.location;
    const locationEffectivelyBlank = !ed.hasText(loc.name) && !ed.hasText(loc.street) && !ed.hasText(loc.city) && !ed.hasText(loc.zip) && !ed.hasText(loc.state);
    return !ed.hasText(data.title) && locationEffectivelyBlank && !ed.hasText(data.startTime) && !ed.hasText(data.endTime)
      && !ed.hasText(data.crewCallTime) && !ed.hasText(data.talentCallTime)
      && !ed.hasText(data.deliverables) && data.aspectRatios.length === 0 && !ed.hasText(data.deliverableDestinations)
      && data.talents.every(t => !ed.hasText(t.name) && t.socialHandles.length === 0 && !ed.hasText(t.photo)) && !ed.hasText(data.premise) && !ed.hasText(data.character) && !ed.hasText(data.shootGoals) && !ed.hasText(data.elevatorPitch)
      && !ed.hasText(data.worldNotes) && !ed.hasText(data.deadline)
      && !ed.hasText(data.whatWentRight) && !ed.hasText(data.couldBeBetter) && !ed.hasText(data.lessonsLearned)
      && !ed.hasText(data.talentDirections) && !ed.hasText(data.teamDirections) && !ed.hasText(data.locationDirections)
      && !ed.hasText(data.shootingNotes) && data.shotList.length === 0
      && data.lightingSetups.length === 0
      && data.frameworkTags.length === 0 && data.references.length === 0
      && data.teamMembers.length === 0 && !data.moodboardComplete && !data.teamRequired && !data.teamFinalized
      && !data.projectPhoto;
  }

  // Records the first time a shoot reaches "captured" and the edit (Editing
  // for photo shoots; Rough cut/Client review/Revisions for video) so the
  // daily report can compute "N days since capture" / "N days since editing".
  // Never overwrites an already-set timestamp, even if status bounces back
  // and forth, so it always reflects the first time each milestone was hit.
  // Delivered is the exception: deliveredAt is when it was last marked
  // Delivered, for the Monday brief's count of last week's deliveries — one
  // sent back for revisions and delivered again went out that second time.
  function applyStatusTimestamps(shoot, oldStatus, newStatus) {
    if (oldStatus === newStatus) return;
    if (ed.isPostCaptureStatus(newStatus) && !shoot.capturedAt) {
      shoot.capturedAt = new Date().toISOString();
    }
    if (ed.isInTheEditStatus(newStatus) && !shoot.editingAt) {
      shoot.editingAt = new Date().toISOString();
    }
    if (newStatus === 'delivered') {
      shoot.deliveredAt = new Date().toISOString();
    }
  }

  // `force` is only ever passed (as exactly true) by the Multi-day "Create
  // days" flow: Day 1 has to exist as a real saved shoot before a project can
  // link to it or days can be copied from it, even when the date is the only
  // thing filled in so far — and isShootDataBlank deliberately ignores the
  // date. Checked with === true so the timer/listener paths that call this
  // with no argument can never trip it by accident. Returns the saved shoot,
  // or undefined when a blank draft was skipped.
  function autosaveShoot(force) {
    const data = gatherShootFormData();
    const idx = ed.state.shoots.findIndex(x => x.id === ed.currentShootId);
    let shoot;
    if (idx === -1) {
      if (force !== true && isShootDataBlank(data) && !ed.shootHasImages) return;
      shoot = { id: ed.currentShootId, ...data };
      applyStatusTimestamps(shoot, null, shoot.status);
      ed.state.shoots.push(shoot);
      document.getElementById('deleteShootBtn').hidden = false;
    } else {
      const oldStatus = ed.state.shoots[idx].status;
      shoot = { ...ed.state.shoots[idx], ...data };
      applyStatusTimestamps(shoot, oldStatus, shoot.status);
      ed.state.shoots[idx] = shoot;
    }
    ed.saveState();
    return shoot;
  }

  function scheduleShootAutosave() {
    clearTimeout(ed.shootSaveTimer);
    // Only a backstop for text still being typed — leaving the field and
    // backgrounding the app both save immediately (see below), so this doesn't
    // need to be eager. It used to be 500ms, which meant a save on every
    // natural pause mid-sentence.
    ed.shootSaveTimer = setTimeout(autosaveShoot, 2000);
    // Every change made on a wizard slide passes through here — typed and
    // picked fields via the form listeners below, and the popup saves and
    // list edits (talent, location, team, deadline, shots, setups, links,
    // photos) that fire no form event — so it's the one hook the wizard's
    // step count and filled-in field looks need.
    if (ed.shootWizardActive) ed.refreshShootWizard();
  }

  function saveShootNow() {
    if (ed.shootModalOverlay.hidden || !ed.currentShootId) return;
    clearTimeout(ed.shootSaveTimer);
    autosaveShoot();
  }

  ed.shootForm.addEventListener('input', scheduleShootAutosave);
  // Delegated at the form level rather than per-field, so it covers inputs
  // rendered later by the talent/team/references list renderers without
  // needing its own listener wired up at every render site.
  ed.shootForm.addEventListener('input', (e) => ed.syncFieldFilledState(e.target));
  ed.shootForm.addEventListener('change', scheduleShootAutosave);
  ed.shootForm.addEventListener('submit', (e) => e.preventDefault());
  // Commit as soon as focus leaves a field, so the pending-debounce window is
  // only ever open while you're actually still in a field typing.
  ed.shootForm.addEventListener('focusout', saveShootNow);
};
