// Expanding a notes field to the whole screen.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootExpandField = function addShootExpandField(ed) {
  Object.assign(ed, { openExpandField });
  // ---------- Expand field (every notes-style textarea in the shoot form) ----------
  // These fields are readonly on the small form; tapping one opens a bigger
  // writing surface in a modal instead of typing directly in the compressed box.
  const EXPAND_FIELD_LABELS = {
    shootCharacter: 'Character/Personality',
    shootWorldNotes: 'World-building notes',
    shootGoals: 'Shoot goals',
    shootElevatorPitch: 'Elevator pitch',
    shootWentRight: 'What went right',
    shootCouldBeBetter: "What could've gone better",
    shootLessonsLearned: 'Lessons for next time',
    shootTalentDirections: 'Directions for talent',
    shootTeamDirections: 'Directions for team',
    shootShootingNotes: 'Shooting notes',
    shootLocationDirections: 'Location directions',
    shootDeliverables: 'Deliverables',
  };
  let expandFieldOnSave = null;

  function expandFieldLabel(fieldId) {
    if (fieldId === 'shootPremise') return document.getElementById('shootPremiseLabelText').textContent;
    return EXPAND_FIELD_LABELS[fieldId] || '';
  }

  // Accepts either a field id (the main form's own readonly fields — reads
  // label/value/placeholder/maxLength off that field, and writes back +
  // re-dispatches 'input' so the field's own listener persists it) or a
  // {title, value, placeholder, maxLength, onSave} config for callers with
  // no backing DOM field to read from, like Shoot Mode's Quick review —
  // those write straight to the shoot object themselves, same as
  // everything else in Shoot Mode does.
  function openExpandField(fieldIdOrConfig) {
    let config;
    if (typeof fieldIdOrConfig === 'string') {
      const field = document.getElementById(fieldIdOrConfig);
      config = {
        title: expandFieldLabel(fieldIdOrConfig),
        value: field.value,
        placeholder: field.placeholder,
        maxLength: field.maxLength,
        onSave: (newValue) => {
          field.value = newValue;
          // The readonly field is what's visible on the main form once this
          // popup closes — it should always read from the start of what was
          // written, not wherever the popup's own cursor/scroll happened to
          // be sitting.
          field.scrollTop = 0;
          field.dispatchEvent(new Event('input', { bubbles: true }));
        },
      };
    } else {
      config = fieldIdOrConfig;
    }
    // A shoot page's own field: written out at the page's (bigger) size.
    document.getElementById('expandFieldOverlay').classList.toggle('from-page', typeof fieldIdOrConfig === 'string');
    expandFieldOnSave = config.onSave;
    document.getElementById('expandFieldTitle').textContent = config.title;
    const textarea = document.getElementById('expandFieldTextarea');
    textarea.value = config.value || '';
    textarea.maxLength = config.maxLength || 2000;
    textarea.placeholder = config.placeholder || '';
    document.getElementById('expandFieldOverlay').hidden = false;
    // Deferred a frame: focusing (which opens the keyboard) in the same tick
    // as un-hiding gives the browser no chance to lay out the now-visible
    // modal first, which is one way the keyboard-open/scroll-into-view
    // behavior it triggers can end up positioning this popup off-screen.
    requestAnimationFrame(() => textarea.focus());
  }

  function closeExpandField() {
    document.getElementById('expandFieldOverlay').hidden = true;
    expandFieldOnSave = null;
    ed.queueShootBreak(250);
  }

  document.getElementById('expandFieldTextarea').addEventListener('input', () => {
    if (expandFieldOnSave) expandFieldOnSave(document.getElementById('expandFieldTextarea').value);
  });

  document.getElementById('expandFieldCloseBtn').addEventListener('click', closeExpandField);
  document.getElementById('expandFieldOkBtn').addEventListener('click', closeExpandField);
  document.getElementById('expandFieldOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('expandFieldOverlay')) closeExpandField();
  });

  [
    'shootPremise', 'shootCharacter', 'shootWorldNotes', 'shootGoals',
    'shootElevatorPitch',
    'shootWentRight', 'shootCouldBeBetter', 'shootLessonsLearned',
    'shootTalentDirections', 'shootTeamDirections', 'shootLocationDirections',
    'shootShootingNotes', 'shootDeliverables',
  ].forEach(fieldId => {
    document.getElementById(fieldId).addEventListener('click', (e) => {
      // Not readonly right now = borrowed onto a new-shoot wizard slide,
      // which has the room to type in place (see moveBlockIntoShootWizard).
      if (!e.currentTarget.readOnly) return;
      openExpandField(fieldId);
    });
  });
};
