// A shoot's options (its menu on a row or card).
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootOptions = function addShootOptions(ed) {
  Object.assign(ed, { openShootOptions, closeShootOptions, focusPaneInput });
  // ---------- Shoot options (row/card kebab menu) ----------
  const shootOptionsOverlay = document.getElementById('shootOptionsOverlay'); ed.shootOptionsOverlay = shootOptionsOverlay;
  const shootOptionsPaneTrack = document.getElementById('shootOptionsPaneTrack'); ed.shootOptionsPaneTrack = shootOptionsPaneTrack;
  ed.optionsShootId = null;

  function openShootOptions(id) {
    ed.optionsShootId = id;
    const s = ed.state.shoots.find(x => x.id === id);
    document.getElementById('archiveShootOptionBtn').textContent = (s && s.archived) ? 'Unarchive shoot' : 'Archive shoot';
    // Same idea as Archive/Unarchive just above: the item keeps its slot and
    // says which project a member is already in, so the sheet it opens
    // reads as "manage" for a member rather than "add".
    const optionsProject = (s && s.projectId) ? ed.findProject(s.projectId) : null;
    document.getElementById('projectShootOptionBtn').textContent = optionsProject ? `Project: ${optionsProject.name}` : 'Add to project';
    // The pane track slides via CSS transform, not native scrolling — reset
    // any stray scroll position (e.g. from a focused input the browser tried
    // to "reveal") so it can't stack with the transform and misalign panes.
    shootOptionsOverlay.querySelector('.modal').scrollLeft = 0;
    shootOptionsOverlay.hidden = false;
    ed.syncPaneTrackHeight(shootOptionsPaneTrack);
  }

  function closeShootOptions() {
    shootOptionsOverlay.hidden = true;
    ed.optionsShootId = null;
    shootOptionsPaneTrack.classList.remove('show-second');
    shootOptionsPaneTrack.classList.remove('show-third');
    shootOptionsPaneTrack.classList.remove('show-fourth');
    shootOptionsPaneTrack.classList.remove('show-fifth');
  }

  // Focusing an input inside a pane that's off its untransformed (layout)
  // position — every pane past the first is, since the track slides via
  // CSS transform rather than scrolling — can make the browser auto-scroll
  // the modal to "reveal" it, even with preventScroll set (unreliable on
  // some engines). That scroll then stacks with the transform and shoves
  // every pane out of view, so force it back to 0 right after focusing.
  function focusPaneInput(input) {
    input.focus({ preventScroll: true });
    shootOptionsOverlay.querySelector('.modal').scrollLeft = 0;
  }
};
