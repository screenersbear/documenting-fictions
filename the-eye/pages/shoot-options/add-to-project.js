// Adding a shoot to a project.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootOptionsAddToProject = function addShootOptionsAddToProject(ed) {
  // ---------- Add to project (kebab item → its own small sheet) ----------
  // A standalone sheet (built like the journal entry options) rather than a
  // sixth pane on the shoot options slider, whose track is sized for
  // exactly five panes. The kebab closes before this opens, so the two
  // never coexist.
  const projectPickerOverlay = document.getElementById('projectPickerOverlay');
  let projectPickerShootId = null;

  function openProjectPicker(shootId) {
    const s = ed.state.shoots.find(x => x.id === shootId);
    if (!s) return;
    projectPickerShootId = shootId;
    const current = s.projectId ? ed.findProject(s.projectId) : null;
    const openBtn = document.getElementById('projectPickerOpenBtn');
    openBtn.textContent = current ? `Open ${current.name}` : '';
    openBtn.hidden = !current;
    document.getElementById('projectPickerRemoveBtn').hidden = !current;
    // A shoot that isn't in a project yet is usually about to become the
    // first of one, so its own name is the likeliest project name; a
    // member opening this is more likely moving somewhere new, so it
    // starts blank.
    document.getElementById('projectPickerNameInput').value = current ? '' : (s.title || ed.primaryTalentName(s) || '');
    // Alphabetical, like every other options list here.
    const projects = ed.projectsList().slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
    const list = document.getElementById('projectPickerList');
    list.innerHTML = projects.map(p => `
      <button type="button" class="options-item choice-item${current && p.id === current.id ? ' active' : ''}" data-project-id="${ed.escapeHtml(p.id)}">${ed.escapeHtml(p.name)}</button>
    `).join('');
    list.hidden = !projects.length;
    document.getElementById('projectPickerDivider').hidden = !projects.length;
    projectPickerOverlay.hidden = false;
  }

  function closeProjectPicker() {
    projectPickerOverlay.hidden = true;
    projectPickerShootId = null;
  }

  // Every membership change lands the same way: persist, repaint the lists
  // (which also repaints an open project popup, see renderAll), refresh a
  // stat box popup left open underneath, and say what happened — the
  // shoot's own row can vanish into a project box, so the toast is the
  // only confirmation it went where you meant.
  function finishProjectMembershipChange(message) {
    ed.saveState();
    ed.renderAll();
    ed.refreshOpenStatBoxDetail();
    ed.showToast(message);
  }

  document.getElementById('projectShootOptionBtn').addEventListener('click', () => {
    const id = ed.optionsShootId;
    ed.closeShootOptions();
    if (id) openProjectPicker(id);
  });

  document.getElementById('projectPickerOpenBtn').addEventListener('click', () => {
    const s = ed.state.shoots.find(x => x.id === projectPickerShootId);
    closeProjectPicker();
    if (s && s.projectId) ed.openProjectPopup(s.projectId);
  });

  function createProjectFromPicker() {
    const shootId = projectPickerShootId;
    const name = document.getElementById('projectPickerNameInput').value.trim() || ed.UNTITLED_PROJECT_NAME;
    closeProjectPicker();
    if (!shootId || !ed.state.shoots.some(x => x.id === shootId)) return;
    const project = ed.createProject(name);
    // Moves a member out of its old project too; setShootProject prunes
    // the old one if this was its last shoot.
    ed.setShootProject(shootId, project.id);
    finishProjectMembershipChange(`Added to ${project.name}`);
  }

  document.getElementById('projectPickerCreateBtn').addEventListener('click', createProjectFromPicker);

  document.getElementById('projectPickerNameInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') createProjectFromPicker();
  });

  document.getElementById('projectPickerList').addEventListener('click', (e) => {
    const btn = e.target.closest('.options-item');
    if (!btn) return;
    const shootId = projectPickerShootId;
    const project = ed.findProject(btn.dataset.projectId);
    closeProjectPicker();
    const s = ed.state.shoots.find(x => x.id === shootId);
    // Tapping the project it's already in is just a way out.
    if (!s || !project || s.projectId === project.id) return;
    const wasInOne = !!(s.projectId && ed.findProject(s.projectId));
    ed.setShootProject(shootId, project.id);
    finishProjectMembershipChange(`${wasInOne ? 'Moved' : 'Added'} to ${project.name}`);
  });

  document.getElementById('projectPickerRemoveBtn').addEventListener('click', () => {
    const s = ed.state.shoots.find(x => x.id === projectPickerShootId);
    closeProjectPicker();
    if (!s || !s.projectId) return;
    const project = ed.findProject(s.projectId);
    ed.setShootProject(s.id, '');
    finishProjectMembershipChange(project ? `Removed from ${project.name}` : 'Removed from project');
  });

  document.getElementById('projectPickerCancelBtn').addEventListener('click', closeProjectPicker);

  projectPickerOverlay.addEventListener('click', (e) => {
    if (e.target === projectPickerOverlay) closeProjectPicker();
  });

  document.getElementById('shootOptionsCancelBtn').addEventListener('click', ed.closeShootOptions);

  ed.shootOptionsOverlay.addEventListener('click', (e) => {
    if (e.target === ed.shootOptionsOverlay) ed.closeShootOptions();
  });
};
