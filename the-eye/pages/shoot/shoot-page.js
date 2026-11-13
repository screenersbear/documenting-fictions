// The shoot page.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootPage = function addShootPage(ed) {
  // ---------- Shoot modal ----------
  const shootModalOverlay = document.getElementById('shootModalOverlay'); ed.shootModalOverlay = shootModalOverlay;
  const shootForm = document.getElementById('shootForm'); ed.shootForm = shootForm;
  ed.editingShootId = null;
  ed.currentShootId = null;
  ed.pendingProjectPhoto = null;
  ed.shootHasImages = false;
  ed.shootSaveTimer = null;
  ed.shootModalBaseTitle = '';
  // New-shoot planning wizard (see SHOOT_WIZARD_STEPS). Tracked by its own
  // flag rather than by editingShootId === null: Multi-day's "Create days"
  // saves a brand-new draft mid-wizard, which flips that to the shoot's id.
  ed.shootWizardActive = false;
  ed.shootWizardStepKey = null;
  ed.shootWizardAgain = false;       // opened from the ⋯ menu's "Guide me through this shoot"
  ed.shootWizardMoved = [];          // { el, placeholder, unlocked, wasInert } per borrowed block
  ed.shootWizardPendingId = null;    // shoot a queued wizard is waiting to open over
  ed.shootWizardStartTimer = null;
  ed.shootWizardViewportMaxH = 0;    // tallest visible height seen this run — the keyboard yardstick

  // The one canonical list of top-level sections in the form, in on-page
  // order: the notebook's pages and the guided tour.
  const SHOOT_MODAL_SECTIONS = [
    { id: 'basicInfoHeading', label: 'Basic Info' },
    { id: 'logisticsHeading', label: 'Logistics' },
    { id: 'teamHeading', label: 'Team' },
    { id: 'directionHeading', label: 'Direction' },
    { id: 'visualsHeading', label: 'Visuals' },
    { id: 'shotListHeading', label: 'Shot list' },
    { id: 'postShootHeading', label: 'Reflection' },
  ]; ed.SHOOT_MODAL_SECTIONS = SHOOT_MODAL_SECTIONS;
};
