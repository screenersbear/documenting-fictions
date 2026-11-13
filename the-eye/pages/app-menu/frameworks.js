// Manage frameworks.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addAppMenuFrameworks = function addAppMenuFrameworks(ed) {
  Object.assign(ed, { renderFrameworksList, closeFrameworksModal, openFrameworksModal });
  // ---------- Manage Frameworks modal ----------
  const frameworksModalOverlay = document.getElementById('frameworksModalOverlay'); ed.frameworksModalOverlay = frameworksModalOverlay;
  const frameworksBody = document.getElementById('frameworksBody');

  function renderFrameworksList() {
    frameworksBody.innerHTML = ed.state.frameworks.map(fw => `
      <div class="framework-block" data-id="${fw.id}">
        <div class="relationship-row">
          <input type="text" class="relationship-name-input framework-name-input" data-id="${fw.id}" value="${ed.escapeHtml(fw.name)}" />
          <button type="button" class="delete-relationship delete-framework" data-id="${fw.id}"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
        </div>
        <div class="framework-tags-list">
          ${fw.tags.map((tag, idx) => `
            <div class="relationship-row">
              <input type="text" class="relationship-name-input framework-tag-input" data-fw="${fw.id}" data-idx="${idx}" value="${ed.escapeHtml(tag)}" />
              <button type="button" class="delete-relationship delete-framework-tag" data-fw="${fw.id}" data-idx="${idx}"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
            </div>
          `).join('')}
        </div>
        <form class="quick-add-relationship quick-add-framework-tag" data-fw="${fw.id}">
          <input type="text" placeholder="New tag" />
          <button type="submit" class="secondary small-btn">Add tag</button>
        </form>
      </div>
    `).join('');

    frameworksBody.querySelectorAll('.framework-name-input').forEach(input => {
      input.addEventListener('change', () => {
        const fw = ed.state.frameworks.find(f => f.id === input.dataset.id);
        if (fw) {
          fw.name = input.value.trim() || fw.name;
          input.value = fw.name;
          ed.saveState();
          ed.syncShootFrameworkTags();
        }
      });
    });

    frameworksBody.querySelectorAll('.delete-framework').forEach(btn => {
      btn.addEventListener('click', async () => {
        const fw = ed.state.frameworks.find(f => f.id === btn.dataset.id);
        const name = fw && ed.hasText(fw.name) ? fw.name : 'this framework';
        const ok = await ed.askConfirm({
          title: `Delete ${name}?`,
          text: "This removes every one of its tags from every shoot that used them, and can't be undone.",
          confirmLabel: 'Delete framework',
          cancelLabel: 'Keep it',
          danger: true,
        });
        if (!ok) return;
        ed.state.frameworks = ed.state.frameworks.filter(f => f.id !== btn.dataset.id);
        ed.saveState();
        renderFrameworksList();
        ed.syncShootFrameworkTags();
      });
    });

    frameworksBody.querySelectorAll('.framework-tag-input').forEach(input => {
      input.addEventListener('change', () => {
        const fw = ed.state.frameworks.find(f => f.id === input.dataset.fw);
        if (fw) {
          fw.tags[Number(input.dataset.idx)] = input.value.trim();
          ed.saveState();
          ed.syncShootFrameworkTags();
        }
      });
    });

    frameworksBody.querySelectorAll('.delete-framework-tag').forEach(btn => {
      btn.addEventListener('click', async () => {
        const fw = ed.state.frameworks.find(f => f.id === btn.dataset.fw);
        if (fw) {
          const idx = Number(btn.dataset.idx);
          const tag = fw.tags[idx];
          const label = ed.hasText(tag) ? `"${tag}"` : 'this tag';
          const ok = await ed.askConfirm({
            title: `Delete ${label}?`,
            text: "This removes it from every shoot that used it, and can't be undone.",
            confirmLabel: 'Delete tag',
            cancelLabel: 'Keep it',
            danger: true,
          });
          // By place, not by name: the popup's blur may have just saved an
          // edit to this very tag (askConfirm), and nothing else can add or
          // remove tags while it's up.
          if (!ok || !ed.state.frameworks.includes(fw) || idx >= fw.tags.length) return;
          fw.tags.splice(idx, 1);
          ed.saveState();
          renderFrameworksList();
          ed.syncShootFrameworkTags();
        }
      });
    });

    frameworksBody.querySelectorAll('.quick-add-framework-tag').forEach(form => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = form.querySelector('input');
        const val = input.value.trim();
        if (!val) return;
        const fw = ed.state.frameworks.find(f => f.id === form.dataset.fw);
        if (fw) {
          fw.tags.push(val);
          ed.saveState();
          renderFrameworksList();
          ed.syncShootFrameworkTags();
        }
      });
    });
  }

  function openFrameworksModal() {
    renderFrameworksList();
    frameworksModalOverlay.hidden = false;
  }

  function closeFrameworksModal() {
    frameworksModalOverlay.hidden = true;
  }

  document.getElementById('manageFrameworksBtn').addEventListener('click', openFrameworksModal);
};
