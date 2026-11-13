// Drawing every tab again.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addRenderAll = function addRenderAll(ed) {
  Object.assign(ed, { renderAll });
  // ---------- render all ----------
  function renderAll() {
    ed.renderOverview();
    ed.renderShoots();
    ed.renderArchive();
    ed.renderJournal();
    ed.renderStats();
    // The project popup stacks under the shoot modal/kebab like the stat
    // box popup, so every change that repaints the lists repaints it too
    // (or closes it once its project is gone). All seven
    // refreshOpenStatBoxDetail() call sites come straight after a
    // renderAll(), so this one hook covers them as well.
    ed.refreshOpenProjectPopup();
  }
};
