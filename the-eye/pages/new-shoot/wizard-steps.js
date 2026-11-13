// The new-shoot guide ("Guide me through this shoot"): its steps.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addNewShootWizardSteps = function addNewShootWizardSteps(ed) {
  Object.assign(ed, { shootFieldHasText });
  // ---------- "Guide me through this shoot" ----------
  // In the shoot's ⋯ menu (setupShootMoreMenu): opens the new-shoot guide
  // again on the shoot that's open (user, 11-12), for when it was closed
  // early. The same steps from the first one, over what's already filled in.
  document.getElementById('shootTourBtn').addEventListener('click', () => {
    if (ed.shootWizardActive || ed.shootModalOverlay.hidden) return;
    ed.closeShootModalJumpMenu();
    ed.startShootWizard({ again: true });
  });

  // ---------- New-shoot planning wizard ----------
  // A brand-new shoot opens with a step-by-step popup over the dimmed page —
  // a few fields per slide, like an installer, instead of the whole form at
  // once. Each slide BORROWS the real field blocks from the page: they're
  // moved into the card (a comment node keeps their spot — it has no box, so
  // it adds no stray flex gap) and moved straight back when the slide changes
  // or the wizard closes. Whatever's typed therefore lands in the real form:
  // autosave, the talent/location/team popups, the mood board, Multi-day and
  // every category-driven show/hide work untouched, and the page is already
  // filled in when the wizard's done. Only openShootModal(null) starts it on
  // its own — existing shoots, "+ Add a day" copies and the rest never do —
  // and the ⋯ menu's "Guide me through this shoot" opens it again on any.
  //
  // The markup sits inside #shootForm on purpose (the form-level input/
  // change/focusout listeners and the #shootForm field styles keep applying
  // to borrowed blocks), and every popup a slide can open is a later
  // body-level overlay, so it stacks above the wizard with no z-index work.
  //
  // Slides run in this order, so reordering them is reordering this list.
  //   key        stable id; the current slide is tracked by key because a
  //              category change on slide 1 adds/removes slides around it
  //   title      string, or a function read on every render
  //   hint       optional — a line under the title (string or function)
  //   blocks()   the page elements to borrow, resolved from field ids while
  //              they're back in place on the page
  //   when()     optional — the slide is skipped (and not counted) if false
  //   enter()/leave() optional — after the blocks move in / after they're back

  // Shorthand for the step list: a field by id, or the block around it.
  function shootWizardBlock(fieldId, selector) {
    const el = document.getElementById(fieldId);
    if (!el) return null;
    return selector ? el.closest(selector) : el;
  }

  function shootFieldHasText(fieldId) {
    return ed.hasText(document.getElementById(fieldId).value);
  }

  const SHOOT_WIZARD_STEPS = [
    {
      key: 'basics',
      title: 'The basics',
      blocks: () => [
        shootWizardBlock('shootStatus', '.status-swatch-wrap'),
        shootWizardBlock('shootTitle', 'label'),
        shootWizardBlock('shootCategory', 'label'),
      ],
    },
    {
      key: 'talent',
      title: 'Talent',
      hint: "Who's in front of the camera? Add each person, with their handles and a photo if you have one.",
      blocks: () => [shootWizardBlock('addTalentBtn', '.talents-section')],
    },
    {
      key: 'when',
      title: 'Date & time',
      // Last day and the video call times keep showing/hiding themselves.
      blocks: () => [
        shootWizardBlock('shootDate', 'label'),
        shootWizardBlock('multiDayRow'),
        shootWizardBlock('multiDayLastDayLabel'),
        shootWizardBlock('shootStartTime', '.time-range-row'),
        shootWizardBlock('videoCallTimesRow'),
      ],
    },
    {
      key: 'location',
      title: 'Location',
      hint: "Where it's happening, and anything people need to know to find it.",
      blocks: () => [
        shootWizardBlock('shootLocationBtn', 'label'),
        shootWizardBlock('shootLocationDirections', 'label'),
      ],
    },
    {
      key: 'team',
      title: 'Team',
      hint: "Is anyone helping out? Add each person once you know who's on board.",
      blocks: () => [shootWizardBlock('teamBody')],
    },
    {
      key: 'goals',
      title: 'Goals',
      hint: () => (ed.isVideoCategory(document.getElementById('shootCategory').value)
        ? "Be concrete and specific with what you and everyone involved should hope to expect from the shoot, and what you're delivering at the end."
        : 'Be concrete and specific with what you and everyone involved should hope to expect from the shoot.'),
      blocks: () => [
        shootWizardBlock('shootGoals', 'label'),
        shootWizardBlock('videoDeliverablesBlock'),
      ],
      // "Last time" under the goals: the lessons from the newest finished
      // shoot of this same kind, if there's one (see showLastTimeNote).
      enter: () => ed.showGoalsLastTimeNote(),
      leave: () => ed.clearLastTimeNotes(document.getElementById('shootWizardBody')),
    },
    {
      key: 'idea',
      title: 'The idea',
      hint: 'The concept and a one-line pitch. The button below can ask you a few questions and fill this in from your answers.',
      blocks: () => [
        // "Need to think it through?" — walks through a few questions and
        // writes the concept and pitch (and, on narrative shoots, The
        // story's two boxes). Sits just above Concept on the page too.
        shootWizardBlock('conceptHelperBtn'),
        shootWizardBlock('shootPremise', 'label'),
        shootWizardBlock('shootElevatorPitch', 'label'),
      ],
      // Not for events, which have no concept or pitch (see
      // updateCategoryTierUI).
      when: () => ed.categoryHasConcept(document.getElementById('shootCategory').value),
    },
    {
      key: 'story',
      title: 'The story',
      hint: "Who the talent is being, and the world they're in.",
      blocks: () => [shootWizardBlock('narrativeFieldsBlock')],
      // Narrative categories only — the same switch that shows these fields
      // on the page (updateCategoryTierUI), where a blank category counts as
      // narrative too.
      when: () => !document.getElementById('narrativeFieldsBlock').hidden,
    },
    // Visual language isn't asked here (user, 11-12): its tags stay on the
    // shoot page. The mood board comes before References (user, 11-12).
    {
      key: 'moodboard',
      // Mood board or Storyboard, by category — same wording as the section.
      title: () => ed.moodboardTerm(document.getElementById('shootCategory').value),
      hint: () => {
        const term = ed.moodboardTerm(document.getElementById('shootCategory').value).toLowerCase();
        return document.getElementById('moodboardCompleteRow').hidden
          ? `Images that set the look. Add a few now, or come back to the ${term} later.`
          : `Images that set the look. Tick the box once the ${term} is done, or if this shoot doesn't need one.`;
      },
      // Anchored on the grid: Final images shares the .moodboard-section class.
      blocks: () => [shootWizardBlock('moodboardGrid', '.moodboard-section')],
    },
    {
      key: 'references',
      title: 'References',
      hint: "Anything you're drawing inspiration from. Add as many links as you like.",
      blocks: () => [shootWizardBlock('referencesList', '.references-block')],
    },
    {
      key: 'lighting',
      title: 'Lighting setups',
      hint: 'Plan the light you want, one setup at a time.',
      // The section's body only — its heading stays on the page with the
      // jump menu/scrollspy/tour anchors. Shown here even if folded there.
      blocks: () => [shootWizardBlock('lightingSetupsBody')],
      // Every setup card open while it's here (see renderLightingSetups).
      enter: () => ed.renderLightingSetups(),
      leave: () => ed.renderLightingSetups(),
    },
    {
      key: 'shotList',
      title: 'Shot list',
      hint: 'Every shot you want to come away with. Tap a line to write, and Enter starts the next one.',
      // Its own pieces rather than the whole section body: Directions for
      // talent/team live in the same section on the page but get their own
      // slide, right after this one.
      blocks: () => [
        shootWizardBlock('shotListItems'),
        shootWizardBlock('addShotBtn'),
        shootWizardBlock('shootShootingNotes', 'label'),
      ],
    },
    {
      key: 'directions',
      title: 'Directions',
      // On a "Just me" shoot (the Team slide's answer) Directions for team
      // stays hidden here like on the page (updateTeamRequiredUI), so the
      // hint only mentions the talent.
      hint: () => (ed.getTeamRequiredChoice() === 'no'
        ? "Notes for the day: what you'll ask of the talent."
        : "Notes for the day: what you'll ask of the talent, and what the team needs to know."),
      blocks: () => [
        shootWizardBlock('shootTalentDirections', 'label'),
        shootWizardBlock('shootTeamDirections', 'label'),
      ],
    },
    {
      key: 'deadline',
      title: 'Deadline',
      hint: "When everything's due, if there's a date to hit.",
      blocks: () => [shootWizardBlock('shootDeadline', 'label')],
    },
    {
      key: 'finish',
      title: 'All set',
      hint: 'Everything you filled in is already on the shoot page. Add to it or change it there anytime.',
      blocks: () => [],
    },
  ]; ed.SHOOT_WIZARD_STEPS = SHOOT_WIZARD_STEPS;
};
