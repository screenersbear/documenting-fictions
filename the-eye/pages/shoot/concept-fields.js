// The concept fields, which differ for story and for commercial shoots.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootConceptFields = function addShootConceptFields(ed) {
  Object.assign(ed, { categoryHasConcept, directionFieldApplies, updateCategoryTierUI, updateVideoCategoryUI, onShootSectionRevealed });
  // ---------- Tiered concept fields (narrative vs commercial categories) ----------
  const COMMERCIAL_TIER_CATEGORIES = ['commercial', 'video', 'lighting_test', 'headshot', 'event'];
  // Events don't plan a concept or an elevator pitch at all.
  const NO_CONCEPT_CATEGORIES = ['event'];

  function categoryHasStoryFields(category) {
    return !COMMERCIAL_TIER_CATEGORIES.includes(category || '');
  }

  function categoryHasConcept(category) {
    return !NO_CONCEPT_CATEGORIES.includes(category || '');
  }

  // Whether a Direction field belongs to this shoot's kind — the same rule
  // the page shows/hides them by (below), for the places that list them
  // from the saved shoot instead: Shoot mode's Direction review and the PDFs.
  function directionFieldApplies(shoot, key) {
    if (key === 'premise' || key === 'elevatorPitch') return categoryHasConcept(shoot.category);
    if (key === 'character' || key === 'worldNotes') return categoryHasStoryFields(shoot.category);
    // Hidden on a "Just me" shoot (see updateTeamRequiredUI); still shown
    // while the team question hasn't been answered.
    if (key === 'teamDirections') return shoot.teamRequired !== 'no';
    return true;
  }

  function updateCategoryTierUI() {
    const category = document.getElementById('shootCategory').value;
    const isCommercialTier = !categoryHasStoryFields(category);
    document.getElementById('narrativeFieldsBlock').hidden = isCommercialTier;
    document.getElementById('shootPremiseLabelText').textContent = isCommercialTier ? 'Concept (if applicable)' : 'Concept';
    // No Concept, Elevator pitch or concept helper (which only writes
    // those) for events. Hiding never clears them, same as the rest.
    const hasConcept = categoryHasConcept(category);
    document.getElementById('shootPremiseField').hidden = !hasConcept;
    document.getElementById('shootElevatorPitchField').hidden = !hasConcept;
    document.getElementById('conceptHelperBtn').hidden = !hasConcept;
    // Video-only fields: Deliverables (Direction) and Crew/Talent call times
    // (Logistics). Hiding never clears them, so flipping away from Video and
    // back keeps whatever was filled in.
    const isVideo = ed.isVideoCategory(category);
    const deliverablesBlock = document.getElementById('videoDeliverablesBlock');
    deliverablesBlock.hidden = !isVideo;
    document.getElementById('videoCallTimesRow').hidden = !isVideo;
    if (isVideo) deliverablesBlock.querySelectorAll('input, textarea').forEach(ed.syncFieldFilledState);
  }

  document.getElementById('shootCategory').addEventListener('change', updateCategoryTierUI);

  // Video swaps "Mood board" for "Storyboard" and has no Final images (the
  // section's hidden, never cleared — flipping back to a photo category
  // brings any images uploaded before the switch right back).
  function updateVideoCategoryUI() {
    const category = document.getElementById('shootCategory').value;
    document.getElementById('moodboardSectionLabel').textContent = ed.moodboardTerm(category);
    ed.updateMoodboardCompleteLabel();
    document.getElementById('finalImagesSection').hidden = ed.isVideoCategory(category);
  }

  document.getElementById('shootCategory').addEventListener('change', updateVideoCategoryUI);

  // Direction no longer waits behind "select a category to continue" on a new
  // shoot: Shoot goals and the rest are there from the start. With no
  // category yet it shows the full set (the same as an existing shoot with
  // none), and picking one later only hides what doesn't apply, never
  // clearing it (updateCategoryTierUI).

  // A section's auto-sized boxes measure zero while it's hidden and keep their
  // rows-default size, so whatever reveals one measures them again on screen.
  function onShootSectionRevealed(bodyId) {
    if (bodyId === 'shotListBody' || bodyId === 'lightingSetupsBody') ed.autoSizeAllListTextareas();
    const body = document.getElementById(bodyId);
    if (body) body.querySelectorAll('textarea').forEach(ed.syncFieldFilledState);
  }
};
