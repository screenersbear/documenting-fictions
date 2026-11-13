// Framework tags on the shoot page.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootFrameworkTags = function addShootFrameworkTags(ed) {
  Object.assign(ed, { renderShootFrameworkTags, syncShootFrameworkTags });
  // ---------- Framework tags (rendered inside the shoot modal) ----------
  // Every framework-tag checkbox container in the Visuals section, in DOM
  // order — Visual Language renders early (before References/Mood board);
  // any custom frameworks a user adds via Manage render later. Anything that
  // needs to touch "all framework checkboxes" regardless of which container
  // they landed in (autosave gathering, the auto-advance-focus listener)
  // reads this list rather than hardcoding a single id.
  const FRAMEWORK_TAG_CONTAINER_IDS = ['frameworkTagsContainerEarly', 'frameworkTagsContainer']; ed.FRAMEWORK_TAG_CONTAINER_IDS = FRAMEWORK_TAG_CONTAINER_IDS;
  const FRAMEWORK_TAG_CHECKBOX_SELECTOR = FRAMEWORK_TAG_CONTAINER_IDS.map(id => `#${id} input[type="checkbox"]`).join(', ');
  // NOT `FRAMEWORK_TAG_CHECKBOX_SELECTOR + ':checked'` — appending to a
  // comma-joined selector only scopes to the LAST item in the list ("all of A,
  // checked B" rather than "checked in either"), which silently pulled in
  // every Visual Language checkbox regardless of state. Each part needs its
  // own suffix.
  const FRAMEWORK_TAG_CHECKED_SELECTOR = FRAMEWORK_TAG_CONTAINER_IDS.map(id => `#${id} input[type="checkbox"]:checked`).join(', '); ed.FRAMEWORK_TAG_CHECKED_SELECTOR = FRAMEWORK_TAG_CHECKED_SELECTOR;

  function renderFrameworkTagGroup(container, frameworks, selectedTags) {
    container.innerHTML = frameworks.map(fw => {
      return `
        <div class="framework-subsection">
          <h4 class="subsection-heading framework-heading" data-fw-id="${fw.id}">${ed.escapeHtml(fw.name)}</h4>
          <div class="framework-subsection-body" data-fw-body="${fw.id}">
            <div class="tag-group">
              ${fw.tags.map(tag => {
                const entry = selectedTags.find(t => t.frameworkId === fw.id && t.tag === tag);
                return `<label class="tag-check"><input type="checkbox" data-fw="${fw.id}" value="${ed.escapeHtml(tag)}" ${entry ? 'checked' : ''} /> ${ed.escapeHtml(tag)}</label>`;
              }).join('')}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // Visual Language renders as its own smaller subsection nested
  // under Visuals (same visual language as Shot list), in its own early
  // container so References/Mood board can sit between it and everything
  // else. Any custom frameworks a user adds via Manage render into the later
  // container. Lighting setups is its own standalone section further down —
  // no longer nested under a framework at all (see the Lighting removal in
  // migrateFrameworks/loadState).
  function renderShootFrameworkTags(shoot) {
    const earlyContainer = document.getElementById('frameworkTagsContainerEarly');
    const container = document.getElementById('frameworkTagsContainer');

    const selectedTags = shoot ? (shoot.frameworkTags || []) : [];
    const visualLanguageFws = ed.state.frameworks.filter(fw => fw.name === 'Visual Language');
    const restFws = ed.state.frameworks.filter(fw => fw.name !== 'Visual Language');
    renderFrameworkTagGroup(earlyContainer, visualLanguageFws, selectedTags);
    renderFrameworkTagGroup(container, restFws, selectedTags);
    // Empty once Lighting's gone, unless a custom framework was added via
    // Manage — hidden rather than left as a stray gap (see the margin-top
    // this container gets further down in Visuals).
    container.hidden = restFws.length === 0;
  }

  function syncShootFrameworkTags() {
    if (!ed.shootModalOverlay.hidden) {
      const s = ed.editingShootId ? ed.state.shoots.find(x => x.id === ed.editingShootId) : null;
      renderShootFrameworkTags(s);
    }
  }

  // Checking a tag auto-advances focus to the next checkbox so a run of
  // taps can march down the list without re-aiming each time. Attached to
  // each framework container separately (rather than delegated from a shared
  // ancestor) so it can't also catch unrelated checkboxes — the mood board
  // "complete?" box sits between the two in the DOM now.
  FRAMEWORK_TAG_CONTAINER_IDS.forEach(id => {
    document.getElementById(id).addEventListener('change', (e) => {
      if (e.target.type !== 'checkbox' || !e.target.checked) return;
      const all = [...document.querySelectorAll(FRAMEWORK_TAG_CHECKBOX_SELECTOR)];
      const next = all[all.indexOf(e.target) + 1];
      if (next) next.focus();
    });
  });
};
