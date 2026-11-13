// Which kinds of shoot show as filters.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addAppMenuCategoryVisibility = function addAppMenuCategoryVisibility(ed) {
  Object.assign(ed, { openCategoryVisibilityModal, closeCategoryVisibilityModal });
  // ---------- Category filter chip visibility ----------
  const categoryVisibilityOverlay = document.getElementById('categoryVisibilityOverlay'); ed.categoryVisibilityOverlay = categoryVisibilityOverlay;

  function renderCategoryVisibilityList() {
    document.getElementById('categoryVisibilityList').innerHTML = ed.CATEGORY_FILTER_ORDER.map(cat => `
      <label class="tag-check"><input type="checkbox" data-cat="${cat}" ${ed.isCategoryVisible(cat) ? 'checked' : ''} /> ${ed.CATEGORY_LABELS[cat]}</label>
    `).join('');
  }

  function openCategoryVisibilityModal() {
    renderCategoryVisibilityList();
    categoryVisibilityOverlay.hidden = false;
  }

  function closeCategoryVisibilityModal() {
    categoryVisibilityOverlay.hidden = true;
  }

  document.getElementById('categoryVisibilityList').addEventListener('change', (e) => {
    if (e.target.type !== 'checkbox') return;
    ed.categoryVisibility[e.target.dataset.cat] = e.target.checked;
    ed.saveCategoryVisibility();
    if (ed.archiveFilter !== 'all' && !ed.isCategoryVisible(ed.archiveFilter)) ed.archiveFilter = 'all';
    ed.renderShoots();
    ed.renderArchive();
  });

  document.getElementById('newFrameworkForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('newFrameworkName');
    const name = input.value.trim();
    if (!name) return;
    ed.state.frameworks.push({ id: ed.uid(), name, tags: [] });
    ed.saveState();
    input.value = '';
    ed.renderFrameworksList();
    ed.syncShootFrameworkTags();
  });
};
