// The talent popup: name, handles and photo.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootTalentPopup = function addShootTalentPopup(ed) {
  Object.assign(ed, { renderTalentModalPhoto, fillTalentModalForm, openTalentModal });
  function renderTalentModalHandles() {
    const container = document.getElementById('talentModalHandlesList');
    container.innerHTML = ed.talentModalDraft.socialHandles.map((sh, shIdx) => `
      <div class="social-handle-row">
        <select class="social-handle-platform" data-handle-idx="${shIdx}">
          ${ed.SOCIAL_PLATFORM_OPTIONS.map(([val, label]) => `<option value="${val}" ${sh.platform === val ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
        <input type="text" class="social-handle-input" data-handle-idx="${shIdx}" placeholder="@handle" value="${ed.escapeHtml(sh.handle || '@')}" />
        <button type="button" class="delete-social-handle" data-handle-idx="${shIdx}"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
      </div>
    `).join('');
    container.querySelectorAll('.social-handle-platform').forEach(sel => {
      sel.addEventListener('change', () => {
        ed.talentModalDraft.socialHandles[Number(sel.dataset.handleIdx)].platform = sel.value;
      });
    });
    container.querySelectorAll('.social-handle-input').forEach(input => {
      input.addEventListener('input', () => {
        ed.talentModalDraft.socialHandles[Number(input.dataset.handleIdx)].handle = input.value;
      });
    });
    container.querySelectorAll('.delete-social-handle').forEach(btn => {
      btn.addEventListener('click', () => {
        ed.talentModalDraft.socialHandles.splice(Number(btn.dataset.handleIdx), 1);
        renderTalentModalHandles();
      });
    });
  }

  document.getElementById('talentModalAddHandleBtn').addEventListener('click', () => {
    ed.talentModalDraft.socialHandles.push({ platform: 'instagram', handle: '' });
    renderTalentModalHandles();
  });

  function renderTalentModalPhoto() {
    document.getElementById('talentModalPhotoBtn').textContent = ed.talentModalDraft.photo ? 'Change talent photo' : '+ Add talent photo';
    const wrap = document.getElementById('talentModalPhotoWrap');
    wrap.innerHTML = ed.talentModalDraft.photo ? `
      <div class="talent-photo-wrap">
        <div class="moodboard-thumb talent-photo-thumb">
          <img src="${ed.talentModalDraft.photo}" alt="" id="talentModalPhotoImg" />
        </div>
        <button type="button" class="manage-link" id="talentModalPhotoRemoveBtn">Remove photo</button>
      </div>
    ` : '';
    const img = document.getElementById('talentModalPhotoImg');
    if (img) img.addEventListener('click', () => ed.openImageViewer([{ src: ed.talentModalDraft.photo, caption: '' }], 0, null, null, false));
    const removeBtn = document.getElementById('talentModalPhotoRemoveBtn');
    if (removeBtn) removeBtn.addEventListener('click', () => {
      ed.talentModalDraft.photo = '';
      // The one thing that means "this person has no photo now" — a draft that
      // merely doesn't have one (never added, or not loaded yet) must not be
      // taken for it (see saveTalentModalBtn).
      ed.talentModalDraft.photoRemoved = true;
      renderTalentModalPhoto();
    });
  }

  document.getElementById('talentModalPhotoBtn').addEventListener('click', () => {
    document.getElementById('talentPhotoFileInput').click();
  });

  document.getElementById('talentPhotoFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file || !ed.talentModalDraft) return;
    ed.resizeImageFile(file, 1280, 0.72).then(dataUrl => {
      ed.openProjectPhotoCrop(dataUrl, 'talent');
    }).catch(() => {});
  });

  function fillTalentModalForm() {
    document.getElementById('talentModalNameInput').value = ed.talentModalDraft.name || '';
    renderTalentModalHandles();
    renderTalentModalPhoto();
  }

  function openTalentModal(idx) {
    ed.talentModalTargetIdx = (idx === null || idx === undefined) ? null : idx;
    const existing = ed.talentModalTargetIdx !== null ? ed.currentTalents[ed.talentModalTargetIdx] : null;
    ed.talentModalDraft = existing
      ? { id: existing.id, name: existing.name || '', socialHandles: (existing.socialHandles || []).map(sh => ({ ...sh })), photo: existing.photo || '' }
      : { id: ed.uid(), name: '', socialHandles: [], photo: '' };
    // Editing someone already named (whether typed fresh earlier or picked
    // from "returning talent" on a past visit) still counts as their
    // identity — an edit here should propagate to their other shoots too,
    // not just to picks made in this exact session. See saveTalentModalBtn.
    ed.talentModalDraft._matchName = ed.talentModalDraft.name || '';
    ed.refreshPastTalentsSelect();
    fillTalentModalForm();
    document.getElementById('talentModalOverlay').hidden = false;
  }

  document.getElementById('talentModalNameInput').addEventListener('input', (e) => {
    ed.talentModalDraft.name = e.target.value;
  });

  document.getElementById('saveTalentModalBtn').addEventListener('click', () => {
    const draft = ed.talentModalDraft;
    draft.name = document.getElementById('talentModalNameInput').value.trim();
    draft.socialHandles = draft.socialHandles.map(sh => ({ ...sh, handle: ed.normalizeSocialHandle(sh.handle) }));
    const oldPhoto = ed.talentModalTargetIdx !== null ? (ed.currentTalents[ed.talentModalTargetIdx].photo || '') : '';
    const photoRemoved = !!draft.photoRemoved;
    const photoSwapped = !!draft.photoSwapped;
    delete draft.photoRemoved;
    delete draft.photoSwapped;
    // A draft with no photo only means "no photo" if the user said so (Remove,
    // or picking a different person). Otherwise it's empty because the photo
    // simply hadn't reached memory when the popup opened, and saving it must
    // not turn that into a deletion.
    if (!draft.photo && oldPhoto && !photoRemoved && !photoSwapped) draft.photo = oldPhoto;

    if (ed.talentModalTargetIdx !== null) ed.currentTalents[ed.talentModalTargetIdx] = draft;
    else ed.currentTalents.push(draft);

    if (ed.currentShootId) {
      if (draft.photo) ed.savePhotoToIdb(ed.talentPhotoKey(ed.currentShootId, draft.id), draft.photo).catch(() => {});
      else if (oldPhoto) ed.idbDeleteImages(ed.talentPhotoKey(ed.currentShootId, draft.id)).catch(() => {});
    }
    // With no mood board or final images yet, nothing has claimed the cover
    // (those paths auto-set it from their first photo) — so a talent photo
    // becomes the shoot's cover rather than leaving the bubble blank. Both
    // boxes are 4:5, so it drops in without any odd object-fit cropping.
    if (draft.photo && !ed.pendingProjectPhoto) {
      ed.pendingProjectPhoto = draft.photo;
      const coverShootId = ed.currentShootId;
      if (coverShootId) {
        ed.savePhotoToIdb(ed.projectPhotoKey(coverShootId), draft.photo).catch(() => {})
          .then(() => ed.onShootImagesChanged(coverShootId, { cover: true }));
      }
    }

    // A talent picked from "returning talent" (or reopened from a card that
    // was itself picked that way once) is the same person everywhere they
    // appear — a handle added, a photo added, or a name fixed here should
    // update every other shoot's copy too, rather than leaving those behind
    // as stale duplicates of who they used to be. Matched by name, same as
    // getAllPastTalents groups them; matches on THIS shoot are left alone
    // since the block above already wrote the one being edited.
    const matchName = (draft._matchName || '').trim().toLowerCase();
    delete draft._matchName;
    if (matchName) {
      ed.state.shoots.forEach(s => {
        if (s.id === ed.currentShootId) return;
        (s.talents || []).forEach(t => {
          if ((t.name || '').trim().toLowerCase() !== matchName) return;
          const oldTalentPhoto = t.photo || '';
          t.name = draft.name;
          t.socialHandles = draft.socialHandles.map(sh => ({ ...sh }));
          if (draft.photo) {
            t.photo = draft.photo;
            ed.savePhotoToIdb(ed.talentPhotoKey(s.id, t.id), draft.photo).catch(() => {});
          } else if (photoRemoved) {
            t.photo = '';
            if (oldTalentPhoto) ed.idbDeleteImages(ed.talentPhotoKey(s.id, t.id)).catch(() => {});
          }
          // Otherwise this copy simply has no photo to share, which says
          // nothing about the other shoots' — their photo and stored image
          // are left alone. (Saving a photo-less copy used to permanently
          // delete every other copy's photo.)
        });
      });
      // The open shoot's own copy is committed in the same save, so a
      // multi-day lead and the days following it change together — saved
      // apart, the following days would look edited by hand and stop
      // mirroring (see syncProjectMirrors).
      clearTimeout(ed.shootSaveTimer);
      if (!ed.autosaveShoot()) ed.saveState();
      ed.renderAll();
    }

    document.getElementById('talentModalOverlay').hidden = true;
    ed.talentModalDraft = null;
    ed.renderTalents();
    ed.scheduleShootAutosave();
  });
};
