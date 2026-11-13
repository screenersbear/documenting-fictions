// Shoot mode: Quick review (Direction and Lighting setups, editable).
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootModeQuickReview = function addShootModeQuickReview(ed) {
  // ---------- Shoot mode: Quick review (editable Direction / Lighting setups) ----------
  const SHOOT_MODE_DIRECTION_FIELDS = [
    // Concept's limit comes from the field itself (raised to 300 so the
    // concept helper's summaries fit), so the two can't drift apart.
    ['premise', 'Concept', () => document.getElementById('shootPremise').maxLength || 300],
    ['character', 'Character/Personality', 1000],
    ['worldNotes', 'World-building notes', 1000],
    ['shootGoals', 'Shoot goals', 1000],
    ['elevatorPitch', 'Elevator pitch', 150],
    ['talentDirections', 'Directions for talent', 1000],
    ['teamDirections', 'Directions for team', 1000],
  ];

  // Every field is its own tap target — opens the shared expand-field editor
  // (see openExpandField's config-object form) to change what's there, or
  // fill in a field that's still blank, which is why this shows ALL fields
  // rather than filtering to ones already written (the old read-only
  // version's whole-field-blank empty state doesn't apply here for the
  // same reason). onSave is the caller's own write-back — this function
  // doesn't know or care whether it's writing a Direction field or a
  // lighting setup's.
  function renderShootModeReviewField(label, value, maxLength, onSave) {
    const filled = ed.hasText(value);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'shoot-mode-review-field';
    btn.innerHTML = `
      <p class="shoot-mode-review-label">${ed.escapeHtml(label)}</p>
      <p class="shoot-mode-review-value${filled ? '' : ' shoot-mode-review-empty'}">${filled ? ed.escapeHtml(value) : 'Tap to add'}</p>
    `;
    btn.addEventListener('click', () => {
      ed.openExpandField({ title: label, value: value || '', maxLength, onSave });
    });
    return btn;
  }

  // Setups added from the Lighting setups review itself ("+ Add lighting
  // setup" below). They stay listed while still blank, so a new one has
  // somewhere to show up while you name it, even though the review
  // otherwise skips blank setups. Emptied whenever the popup is opened
  // fresh (not on its own re-renders), so one added and left blank drops
  // out of the review like any other blank setup — it's still on the
  // shoot, same as a blank card added on the page.
  let shootModeReviewAddedSetups = new Set();

  function openShootModeReview(kind, isRefresh) {
    const shootId = ed.getShootModeShootId();
    const shoot = shootId ? ed.state.shoots.find(s => s.id === shootId) : null;
    if (!shoot) return;
    const body = document.getElementById('shootModeReviewBody');
    body.innerHTML = '';
    if (!isRefresh) {
      shootModeReviewAddedSetups = new Set();
      // Same as the Wild card: a field left focused behind this would keep
      // the keyboard up over it (see askConfirm).
      const focused = document.activeElement;
      if (focused && focused !== document.body && typeof focused.blur === 'function') focused.blur();
    }

    // Re-opens on the same kind, so editing one field doesn't lose your
    // place among the rest of the list.
    const refresh = () => openShootModeReview(kind, true);
    const commit = () => {
      ed.saveState();
      refresh();
      ed.renderAll();
    };

    if (kind === 'direction') {
      document.getElementById('shootModeReviewTitle').textContent = 'Direction';
      // Only the fields this kind of shoot has on its page.
      SHOOT_MODE_DIRECTION_FIELDS.filter(([key]) => ed.directionFieldApplies(shoot, key)).forEach(([key, label, maxLength]) => {
        const limit = typeof maxLength === 'function' ? maxLength() : maxLength;
        body.appendChild(renderShootModeReviewField(label, shoot[key] || '', limit, (newValue) => {
          shoot[key] = newValue;
          commit();
        }));
      });
    } else {
      document.getElementById('shootModeReviewTitle').textContent = 'Lighting setups';
      const setups = (shoot.lightingSetups || [])
        .filter(item => shootModeReviewAddedSetups.has(item) || ed.hasText(item.name) || ed.hasText(item.characteristics) || ed.hasText(item.description));
      if (!setups.length) {
        body.innerHTML = '<p class="shoot-mode-empty">No lighting setups logged for this shoot.</p>';
      } else {
        setups.forEach((item, idx) => {
          const group = document.createElement('div');
          group.className = 'shoot-mode-review-setup';
          const name = document.createElement('p');
          name.className = 'shoot-mode-review-setup-name';
          name.textContent = ed.hasText(item.name) ? item.name : `Setup ${idx + 1}`;
          name.addEventListener('click', () => {
            ed.openExpandField({
              title: 'Setup name', value: item.name || '', maxLength: 200,
              onSave: (newValue) => { item.name = newValue; commit(); },
            });
          });
          group.appendChild(name);
          group.appendChild(renderShootModeReviewField('Characteristics', item.characteristics || '', 1000, (newValue) => {
            item.characteristics = newValue;
            commit();
          }));
          group.appendChild(renderShootModeReviewField('Description', item.description || '', 1000, (newValue) => {
            item.description = newValue;
            commit();
          }));
          body.appendChild(group);
        });
      }
      // The one thing this review adds to Shoot mode: a light you set up
      // on the spot can be logged without leaving for the shoot page. Same
      // look and spot as "+ Add shot" under the shot list, and the same
      // shape as the page's own "+ Add" (addLightingSetupBtn), written
      // straight to the shoot like everything else here. It opens the new
      // setup's name for typing in the same editor tapping a name uses;
      // the list scrolls down first so the setup's there once that closes.
      const addSetupBtn = document.createElement('button');
      addSetupBtn.type = 'button';
      addSetupBtn.className = 'primary small-btn shoot-mode-add-shot-btn';
      addSetupBtn.textContent = '+ Add lighting setup';
      addSetupBtn.addEventListener('click', () => {
        if (!Array.isArray(shoot.lightingSetups)) shoot.lightingSetups = [];
        const item = { id: ed.uid(), name: '', characteristics: '', description: '' };
        shoot.lightingSetups.push(item);
        shootModeReviewAddedSetups.add(item);
        commit();
        body.scrollTop = body.scrollHeight;
        ed.openExpandField({
          title: 'Setup name', value: '', maxLength: 200,
          onSave: (newValue) => { item.name = newValue; commit(); },
        });
      });
      body.appendChild(addSetupBtn);
    }
    document.getElementById('shootModeReviewOverlay').hidden = false;
  }

  document.getElementById('shootModeReviewDirectionBtn').addEventListener('click', () => openShootModeReview('direction'));
  document.getElementById('shootModeReviewLightingBtn').addEventListener('click', () => openShootModeReview('lighting'));
  document.getElementById('shootModeReviewCloseBtn').addEventListener('click', () => {
    document.getElementById('shootModeReviewOverlay').hidden = true;
  });
  document.getElementById('shootModeReviewOkBtn').addEventListener('click', () => {
    document.getElementById('shootModeReviewOverlay').hidden = true;
  });
};
