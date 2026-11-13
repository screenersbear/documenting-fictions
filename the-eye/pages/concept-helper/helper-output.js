// "Need to think it through?": what comes out of it, and using it.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addConceptHelperHelperOutput = function addConceptHelperHelperOutput(ed) {
  Object.assign(ed, { askHelperReplace });
  ed.CONCEPT_HELPER_OUTPUTS.forEach(out => {
    document.getElementById(out.boxId).addEventListener('input', (e) => {
      ed.autoSizeTextarea(e.target);
      ed.updateConceptHelperCount();
    });
  });

  // "Concept", "Concept and Elevator pitch", "Concept, World-building notes
  // and Elevator pitch".
  function conceptHelperJoin(labels) {
    return labels.length > 1 ? `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}` : labels[0];
  }

  // Both helpers ask this when what they wrote would go over text that's
  // already on the page. Replace is red: what's there is gone for good.
  // "Keep mine" leaves those fields as they are, and the helper still fills
  // any that were empty and closes. `fillsOthers`: some of them were, so
  // the popup says so.
  function askHelperReplace(labels, fillsOthers) {
    return ed.askConfirm({
      title: `Replace what's already in ${conceptHelperJoin(labels)}?`,
      text: fillsOthers
        ? 'Keep mine leaves what you wrote there and still fills in the rest.'
        : 'Keep mine leaves what you wrote there.',
      confirmLabel: 'Replace',
      cancelLabel: 'Keep mine',
      danger: true,
    });
  }

  // Fills each page field that has something in its box (the real fields —
  // on a wizard slide they're typed into directly) and lets the form's own
  // input listener save them. A box emptied on purpose leaves its field be,
  // and so does "Keep mine" for a field that already has its own text.
  async function useConceptHelperOutputs() {
    const h = ed.conceptHelper;
    // Once at a time: asking again would answer the first popup "Keep mine"
    // (see askConfirm) and fill twice.
    if (!h || h.asking) return;
    const picks = ed.conceptHelperShownOutputs()
      .map(out => ({ out, text: document.getElementById(out.boxId).value.trim(), field: document.getElementById(out.fieldId) }))
      .filter(pick => pick.text);
    if (!picks.length || picks.some(pick => pick.text.length > ed.conceptHelperMax(pick.out))) return;
    const replacing = picks.filter(pick => ed.hasText(pick.field.value) && pick.field.value.trim() !== pick.text);
    let keepExisting = false;
    if (replacing.length) {
      h.asking = true;
      keepExisting = !(await askHelperReplace(replacing.map(pick => pick.out.label), picks.length > replacing.length));
      h.asking = false;
      // Closed some other way while it asked: nothing to fill from.
      if (ed.conceptHelper !== h) return;
    }
    picks.filter(pick => !(keepExisting && replacing.includes(pick))).forEach(({ field, text }) => {
      field.value = text;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      ed.syncFieldFilledState(field);
    });
    ed.closeConceptHelper();
  }

  document.getElementById('conceptHelperUseBtn').addEventListener('click', () => {
    if (!ed.askConceptHelperLeave('use')) useConceptHelperOutputs();
  });

  // "Now that you've got it": straight into writing the Concept — typed in
  // place on the wizard slide, or through its expand popup on the page,
  // where the field itself is read-only.
  function writeConceptHelperOwn() {
    ed.closeConceptHelper();
    const premise = document.getElementById('shootPremise');
    if (premise.readOnly) ed.openExpandField('shootPremise');
    else premise.focus();
  }

  document.getElementById('conceptHelperWriteBtn').addEventListener('click', () => {
    if (!ed.askConceptHelperLeave('write')) writeConceptHelperOwn();
  });

  document.getElementById('conceptHelperCloseBtn').addEventListener('click', () => {
    if (!ed.askConceptHelperLeave('close')) ed.closeConceptHelper();
  });

  document.getElementById('conceptHelperLeaveFirstBtn').addEventListener('click', () => {
    const h = ed.conceptHelper;
    if (!h) return;
    // A real blank: go there. Otherwise ("Keep going") just carry on where
    // they were, stepping through as before.
    const target = ed.conceptHelperBlankIds()[0];
    if (target) ed.jumpConceptHelperTo(target);
    else { h.leaving = null; ed.renderConceptHelper(); }
  });

  document.getElementById('conceptHelperLeaveAnywayBtn').addEventListener('click', () => {
    const h = ed.conceptHelper;
    if (!h) return;
    const action = h.leaving;
    h.leaving = null;
    if (action === 'write') writeConceptHelperOwn();
    else if (action === 'use') {
      // Back to the end screen first: it's what shows behind the replace
      // question, and what stays if there turns out to be nothing to fill.
      ed.renderConceptHelper();
      useConceptHelperOutputs();
    } else ed.closeConceptHelper();
  });
};
