// For the brain: what The Eye writes down for shakusky's brain (Starky's own
// AI on his Mac) as he works, and the row in App options that opens the sheet
// with a switch a kind (components/shared/brain-sheet.js). Each choice is
// noted after it's made, never in its way: a note that can't be kept is left
// out, and with the notes gone The Eye works the same.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addAppMenuBrain = function addAppMenuBrain(ed) {
  Object.assign(ed, { brainNote });
  const notes = () => window.DFBrainNotes;

  // One choice for the brain (kinds and actions: shared/data/brain-notes.js).
  function brainNote(kind, action, item, context) {
    const N = notes();
    return N ? N.note('the-eye', kind, action, item, context) : null;
  }

  document.getElementById('brainNotesBtn').addEventListener('click', () => {
    ed.closeAppMenu();
    if (window.DFBrainSheet) window.DFBrainSheet.open({ here: 'the-eye' });
  });

  // A step picked on the shoot page. Caught on the way down, before the
  // page's own listener moves ed.previousStatusValue on to the new step.
  document.addEventListener('change', (e) => {
    if (e.target.id !== 'shootStatus') return;
    const from = ed.previousStatusValue;
    if (e.target.value !== from) brainNote('status', 'change', e.target.value, { from, where: 'shoot page' });
  }, true);

  // A framework tag ticked or unticked on a shoot.
  ed.FRAMEWORK_TAG_CONTAINER_IDS.forEach((id) => {
    document.getElementById(id).addEventListener('change', (e) => {
      const box = e.target;
      if (box.type !== 'checkbox' || !box.dataset.fw) return;
      const fw = ed.state.frameworks.find((f) => f.id === box.dataset.fw);
      brainNote('frameworks', box.checked ? 'pick' : 'remove', `${fw ? fw.name : 'A framework'}: ${box.value}`);
    });
  });
};
