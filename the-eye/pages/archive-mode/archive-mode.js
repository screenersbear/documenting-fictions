// Archive mode.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addArchiveMode = function addArchiveMode(ed) {
  Object.assign(ed, { archiveModeSectionHeading, drawArchivePage, breakArchivePages, openArchiveMode, exitArchiveMode });
  // ---------- Archive mode ----------
  // A read-only counterpart to Shoot mode for a shoot that's already done —
  // a condensed report (Basic info, a trimmed Logistics/Team, the idea,
  // shooting notes, the reflection in full, final images) instead of a
  // working view, since there's nothing left to plan or shoot. No persisted
  // "survives a restart" id like Shoot mode's — this is a quick look, not a
  // mode you'd want to still be in after relaunching the app.
  const archiveModeOverlay = document.getElementById('archiveModeOverlay'); ed.archiveModeOverlay = archiveModeOverlay;
  ed.archiveModeShootId = null;

  // One label-over-value block, styled like Shoot Mode's Quick review fields
  // but a plain div rather than a button — nothing here is tappable. An
  // empty label leaves just the value, under a heading that already names it.
  function archiveModeField(label, value) {
    const div = document.createElement('div');
    div.className = 'archive-mode-field';
    div.innerHTML = `
      ${label ? `<p class="shoot-mode-review-label">${ed.escapeHtml(label)}</p>` : ''}
      <div class="archive-mode-value"><p class="shoot-mode-review-value jb-in">${ed.escapeHtml(value)}</p></div>
    `;
    return div;
  }

  function archiveModeSectionHeading(text, colorClass) {
    const h3 = document.createElement('h3');
    h3.className = `shoot-mode-section-heading ${colorClass}`;
    h3.textContent = text;
    return h3;
  }

  function renderArchiveModeBody(shoot) {
    const body = document.getElementById('archiveModeBody');
    body.innerHTML = '';
    const sectionHeading = (text) => archiveModeSectionHeading(text, '');

    // Whichever of Title/Talent the header's shootDisplayName actually drew
    // from is skipped below so it isn't said twice — titleDisplayMode picks
    // talent-first by default, so that's normally Talent, but flips to Title
    // when the app's set to show titles first. The other one, if present,
    // still adds information the header alone doesn't carry (e.g. a title
    // distinct from whoever's in it, or extra talents beyond the first).
    const displayName = ed.shootDisplayName(shoot);
    const talentNames = (shoot.talents || []).map(t => t.name).filter(ed.hasText);
    const basicInfoFields = [];
    basicInfoFields.push(['Category', ed.CATEGORY_LABELS[shoot.category] || 'Uncategorized']);
    if (ed.hasText(shoot.title) && shoot.title !== displayName) basicInfoFields.push(['Title', shoot.title]);
    if (talentNames.length && !(talentNames.length === 1 && talentNames[0] === displayName)) {
      basicInfoFields.push(['Talent', talentNames.join(', ')]);
    }
    if (basicInfoFields.length) {
      body.appendChild(sectionHeading('Basic info'));
      basicInfoFields.forEach(([label, value]) => body.appendChild(archiveModeField(label, value)));
    }

    const logisticsFields = [];
    // A postponed or canceled shoot keeps its date as the original plan
    // (see isOriginalPlanDate), so it's labelled that way here too.
    if (ed.hasText(shoot.date)) logisticsFields.push([ed.isOriginalPlanDate(shoot) ? 'Originally' : 'Shoot date', ed.prettyDate(shoot.date)]);
    const locationText = ed.formatLocationDisplay(shoot.location);
    if (ed.hasText(locationText)) logisticsFields.push(['Location', locationText]);
    if (logisticsFields.length) {
      body.appendChild(sectionHeading('Logistics'));
      logisticsFields.forEach(([label, value]) => body.appendChild(archiveModeField(label, value)));
    }

    // Only a shoot that had a team says who was on it — the same "team
    // required: yes" switch the page and the PDFs go by. Members kept on a
    // shoot that was switched to solo stay saved, just not listed here.
    const teamMembers = (shoot.teamRequired === 'yes' ? (shoot.teamMembers || []) : []).filter(tm => ed.hasText(tm.name));
    if (teamMembers.length) {
      body.appendChild(sectionHeading('Team'));
      teamMembers.forEach(tm => {
        const roleLabel = (ed.TEAM_ROLE_OPTIONS.find(([val]) => val === tm.role) || [null, 'Other'])[1];
        body.appendChild(archiveModeField(roleLabel, tm.name));
      });
    }

    // What the shoot was about, in the page's own Direction wording, so the
    // report says more than who/when/where: only the boxes this kind of
    // shoot has on its page (directionFieldApplies — no story boxes on a
    // headshot, no concept on an event) and only ones with something in
    // them. Comes after Team, where Direction sits on the page.
    const ideaFields = [
      ['premise', 'Concept'],
      ['elevatorPitch', 'Elevator pitch'],
      ['character', 'Character/Personality'],
      ['worldNotes', 'World-building notes'],
    ].filter(([key]) => ed.directionFieldApplies(shoot, key) && ed.hasText(shoot[key]));
    if (ideaFields.length) {
      body.appendChild(sectionHeading('The idea'));
      ideaFields.forEach(([key, label]) => body.appendChild(archiveModeField(label, shoot[key])));
    }

    // Shooting notes, worth looking back on — after the idea, where they
    // sit on the page (under the shot list, which isn't repeated here). The
    // heading already says what they are, so no label over the text.
    if (ed.hasText(shoot.shootingNotes)) {
      body.appendChild(sectionHeading('Shooting notes'));
      body.appendChild(archiveModeField('', shoot.shootingNotes.trim()));
    }

    // Reflection answers are kept when a shoot steps back from Captured, but
    // only shown once it's Captured or later — same as the shoot page.
    const reflectionFields = [];
    if (ed.isPostCaptureStatus(shoot.status)) {
      if (ed.hasText(shoot.whatWentRight)) reflectionFields.push(['What went right', shoot.whatWentRight]);
      if (ed.hasText(shoot.couldBeBetter)) reflectionFields.push(["What could've gone better", shoot.couldBeBetter]);
      if (ed.hasText(shoot.lessonsLearned)) reflectionFields.push(['Lessons for next time', shoot.lessonsLearned]);
    }
    if (reflectionFields.length) {
      body.appendChild(sectionHeading('Reflection'));
      reflectionFields.forEach(([label, value]) => body.appendChild(archiveModeField(label, value)));
    }

    // Video's counterpart to final images in this report: what was made and
    // where it went, in the same label-over-value fields as above. Video has
    // no final images — any stored from before the shoot was switched to
    // video stay in IndexedDB, just aren't shown.
    const deliverableFields = ed.videoDeliverableFields(shoot);
    if (deliverableFields.length) {
      body.appendChild(sectionHeading('Deliverables'));
      deliverableFields.forEach(([label, value]) => body.appendChild(archiveModeField(label, value)));
    }
    if (ed.isVideoShoot(shoot)) return;

    ed.idbGetImages(ed.finalImagesKey(shoot.id)).then(images => {
      if (!images.length || ed.archiveModeShootId !== shoot.id) { archiveWanted = null; return; }
      if (!reflectionFields.length) body.appendChild(sectionHeading('Reflection'));
      // A grid per row of three, so a page can break between rows.
      let row = null;
      images.forEach((img, idx) => {
        if (idx % 3 === 0) {
          row = document.createElement('div');
          row.className = 'moodboard-grid archive-mode-final-images';
          body.appendChild(row);
        }
        const thumb = document.createElement('div');
        thumb.className = 'moodboard-thumb';
        thumb.innerHTML = `<img src="${img.src}" alt="" />`;
        thumb.querySelector('img').addEventListener('click', () => {
          ed.openImageViewer(images, idx, ed.finalImagesKey(shoot.id), null, false);
        });
        row.appendChild(thumb);
      });
      breakArchivePages();
      archiveWanted = null;
    }).catch(() => { archiveWanted = null; });
  }

  // The summary is a page of the notebook: it breaks at the bottom and carries
  // on over the leaf, the same as a shoot.
  const archiveModePage = archiveModeOverlay.querySelector('.modal'); ed.archiveModePage = archiveModePage;
  const archiveModeBody = document.getElementById('archiveModeBody');
  ed.archiveFlow = null;
  ed.archiveAt = 0;
  let archiveWanted = null; // a page asked for at launch, held until the photos are in

  // Line by line, like a Journal entry: a long answer carries over the leaf,
  // under its heading and label again.
  function archiveAtoms(body) {
    const atoms = [];
    let heading = null;
    [...body.children].forEach((el) => {
      if (el.matches('.shoot-mode-section-heading')) { heading = el; return; }
      if (!el.matches('.archive-mode-field')) { atoms.push({ el, heads: heading ? [heading] : [] }); return; }
      const label = el.querySelector('.shoot-mode-review-label');
      const value = el.querySelector('.archive-mode-value');
      const heads = [heading, label].filter(Boolean);
      const rows = Math.max(1, Math.round(value.offsetHeight / ed.LINE));
      for (let row = 0; row < rows; row++) atoms.push({ el: value, heads, row, rows });
    });
    return atoms;
  }

  function drawArchivePage() {
    ed.queueLastPlace();
    const count = (ed.archiveFlow && ed.archiveFlow.pages.length) || 1;
    ed.archiveAt = Math.max(0, Math.min(ed.archiveAt, count - 1));
    if (ed.archiveFlow) ed.drawFlowPage(ed.archiveFlow, ed.archiveAt);
    document.getElementById('archiveModeFoot').textContent = `${ed.archiveAt + 1} / ${count}`;
    document.getElementById('archiveModePrev').disabled = ed.archiveAt <= 0;
    document.getElementById('archiveModeNext').disabled = ed.archiveAt >= count - 1;
  }

  function breakArchivePages() {
    if (archiveModeOverlay.hidden) return;
    const scrolled = archiveModePage.scrollTop;
    ed.archiveFlow = ed.buildFlow(archiveModeBody, archiveAtoms);
    if (archiveWanted !== null) ed.archiveAt = archiveWanted;
    drawArchivePage();
    archiveModePage.scrollTop = scrolled;
  }

  // Its look comes from a class, so the copy can lose the id: a copy in the
  // shoot's turning sheet comes earlier in the document than the real page.
  const archivePageCopy = () => ed.pageCopy(archiveModeBody, copy => copy.removeAttribute('id'));

  function stepArchivePage(by) {
    const to = ed.archiveAt + by;
    if (!ed.archiveFlow || to < 0 || to >= ed.archiveFlow.pages.length) return;
    const turning = ed.motionOk();
    const oldCopy = turning ? archivePageCopy() : null;
    ed.archiveAt = to;
    archiveModePage.scrollTop = 0;
    drawArchivePage();
    if (!turning) return;
    const layer = archiveModeOverlay.querySelector('.nb-turn-layer');
    if (by > 0) ed.playTurn(layer, '', oldCopy);
    else ed.playTurn(layer, 'back', archivePageCopy(), oldCopy);
  }
  document.getElementById('archiveModePrev').addEventListener('click', () => stepArchivePage(-1));
  document.getElementById('archiveModeNext').addEventListener('click', () => stepArchivePage(1));

  (function setupArchivePageSwipe() {
    let start = null;
    archiveModeOverlay.addEventListener('touchstart', (e) => {
      start = null;
      if (e.touches.length !== 1 || e.target.closest('.nb-shoot-bar, .nb-page-num')) return;
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) return;
      start = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }, { passive: true });
    archiveModeOverlay.addEventListener('touchcancel', () => { start = null; }, { passive: true });
    archiveModeOverlay.addEventListener('touchend', (e) => {
      if (!start) return;
      const dx = e.changedTouches[0].clientX - start.x;
      const dy = e.changedTouches[0].clientY - start.y;
      start = null;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      stepArchivePage(dx < 0 ? 1 : -1);
    }, { passive: true });
  })();

  function openArchiveMode(shootId, at = 0) {
    if (!ed.shootModalOverlay.hidden) ed.closeShootModal();
    const shoot = ed.state.shoots.find(s => s.id === shootId);
    if (!shoot) return;
    ed.archiveModeShootId = shootId;
    archiveWanted = at > 0 && !ed.isVideoShoot(shoot) ? at : null;
    document.getElementById('archiveModeTitle').textContent = ed.shootDisplayName(shoot);
    renderArchiveModeBody(shoot);
    archiveModeOverlay.hidden = false;
    ed.archiveAt = at > 0 ? at : 0;
    archiveModePage.scrollTop = 0;
    breakArchivePages();
  }

  function exitArchiveMode() {
    ed.archiveModeShootId = null;
    archiveWanted = null;
    ed.queueLastPlace();
    ed.archiveFlow = null;
    ed.clearTurn(archiveModeOverlay.querySelector('.nb-turn-layer'));
    archiveModeOverlay.hidden = true;
  }

  document.getElementById('archiveModeExitBtn').addEventListener('click', exitArchiveMode);

  // "Shoot details" swaps to the full edit view for the same shoot — the
  // mirror image of Archive mode's own button on that page (see
  // updateEnterShootModeBtnVisibility), so the two stay switchable back and
  // forth without ever landing on the main tab underneath.
  document.getElementById('archiveModeShootDetailsBtn').addEventListener('click', () => {
    const shootId = ed.archiveModeShootId;
    const oldCopy = ed.motionOk() ? archivePageCopy() : null;
    exitArchiveMode();
    if (!shootId) return;
    if (ed.currentScreen() !== 'archive') document.querySelector('.tab[data-view="archive"]').click();
    ed.openShootModal(shootId);
    if (oldCopy) ed.playTurn(ed.shootModalOverlay.querySelector('.nb-turn-layer'), '', oldCopy);
  });

  document.getElementById('enterArchiveModeBtn').addEventListener('click', () => {
    if (!ed.currentShootId) return;
    const oldCopy = ed.motionOk() ? ed.shootPageCopy() : null;
    openArchiveMode(ed.currentShootId);
    if (oldCopy && !archiveModeOverlay.hidden) ed.playTurn(archiveModeOverlay.querySelector('.nb-turn-layer'), '', oldCopy);
  });
};
