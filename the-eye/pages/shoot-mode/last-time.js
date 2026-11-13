// Last time, in Shoot mode.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootModeLastTime = function addShootModeLastTime(ed) {
  Object.assign(ed, { showShootModeLastTime });
  // ---------- Last time, in Shoot mode ----------
  // The first sentence of the lessons from the newest shoot of the same
  // category shot on or before this one (lastShootWithLessons), in the same
  // "Last time (name, date)" line the shoot page's guide uses, at the top of
  // the first page. Read-only here: the Shooting notes page is the place to
  // copy it to if it's worth keeping.
  // When that leaves some of the lessons out, a small "…" pill closes the
  // quote: a tap on it (or on the quote) opens all of it in place, the pill
  // turning to an up arrow to fold it back — no "Read more" words added.
  function showShootModeLastTime(shoot) {
    const el = document.getElementById('shootModeLastTime');
    const past = shoot.category
      ? ed.lastShootWithLessons(s => s.category === shoot.category && (!s.date || !shoot.date || s.date <= shoot.date), shoot.id)
      : null;
    el.hidden = !past;
    if (!past) return;
    const lessons = past.lessonsLearned.trim().replace(/\s*\n+\s*/g, ' ');
    // A sentence ends where the next one starts with a capital (or the text
    // ends), so "9 a.m." or "e.g." doesn't cut it short.
    const first = (lessons.match(/^.*?[.!?…](?=\s+[A-Z“"‘'(]|$)/) || [lessons])[0];
    const line = first.length > 160 ? first.slice(0, 160).replace(/\s+\S*$/, '') : first;
    const when = ed.prettyDate(past.date);
    const source = when ? `${ed.shootDisplayName(past)}, ${when}` : ed.shootDisplayName(past);
    const lead = `<span class="field-hint-bold">Last time</span> (${ed.escapeHtml(source)}): `;
    if (line === lessons) {
      el.innerHTML = `${lead}“${ed.escapeHtml(line)}”`;
      return;
    }
    // The quote stays plain text, so it runs on from "Last time (…):" like
    // before (a <button> always lays out as a block); only the pill is one.
    el.innerHTML = `${lead}<span class="shoot-mode-last-time-quote"></span><button type="button" class="shoot-mode-last-time-more" aria-expanded="false"></button>”`;
    const quote = el.querySelector('.shoot-mode-last-time-quote');
    const more = el.querySelector('.shoot-mode-last-time-more');
    const show = (open) => {
      quote.textContent = `“${open ? lessons : line}`;
      more.setAttribute('aria-expanded', open ? 'true' : 'false');
      more.setAttribute('aria-label', open ? 'Show less' : 'Show the rest');
      more.innerHTML = open
        ? '<svg class="shoot-mode-last-time-less" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        : '<span aria-hidden="true">…</span>';
    };
    show(false);
    // Open or shut, it's a different height: Shoot mode's pages are cut again.
    const flip = () => { show(more.getAttribute('aria-expanded') !== 'true'); ed.breakShootModePages(); };
    more.addEventListener('click', flip);
    quote.addEventListener('click', flip);
  }

  document.getElementById('shootModeExitBtn').addEventListener('click', ed.exitShootMode);
  // The bottom bar's "Exit", beside "Done shooting": the same as the X up
  // top — out of Shoot mode with nothing changed — for someone who only
  // opened it to look, or by accident, and is looking down there for a way
  // out rather than up at the X.
  document.getElementById('shootModeLeaveBtn').addEventListener('click', ed.exitShootMode);

  // Same field as the main edit form's Shot list section (#shootShootingNotes)
  // — writes straight to the shoot, same as every other Shoot Mode field.
  document.getElementById('shootModeShootingNotes').addEventListener('input', (e) => {
    const shoot = ed.state.shoots.find(s => s.id === ed.getShootModeShootId());
    if (!shoot) return;
    shoot.shootingNotes = e.target.value;
    ed.autoSizeTextarea(e.target);
    ed.saveState();
  });

  // Writes straight to state and re-renders just the shot list, same as
  // ticking a checkbox or editing a shot above — no working copy, so a shot
  // added mid-shoot survives whatever happens to the phone next.
  document.getElementById('shootModeAddShotBtn').addEventListener('click', () => {
    const shoot = ed.state.shoots.find(s => s.id === ed.getShootModeShootId());
    if (!shoot) return;
    if (!Array.isArray(shoot.shotList)) shoot.shotList = [];
    shoot.shotList.push({ text: '', checked: false });
    ed.saveState();
    ed.renderShootModeShots(shoot, shoot.shotList.length - 1);
    ed.renderAll();
  });

  // "+ Add photos" under the mood board: the shoot page's own upload (see
  // moodboardFileInput), but the page is closed while Shoot mode is up, so
  // this writes straight to the saved shoot — the photos onto its mood
  // board, and the first one as its cover if it has neither yet — then
  // shows the newest, the way "+ Add shot" puts you on the new line.
  document.getElementById('shootModeAddMoodboardBtn').addEventListener('click', () => {
    document.getElementById('shootModeMoodboardFileInput').click();
  });

  document.getElementById('shootModeMoodboardFileInput').addEventListener('change', (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    const uploadShootId = ed.getShootModeShootId();
    if (!files.length || !uploadShootId) return;
    let coverSet = false;
    Promise.all(files.map(f => ed.resizeImageFile(f, 1280, 0.72)))
      .then(newImages => ed.idbGetImages(uploadShootId).then(existing => {
        const shoot = ed.state.shoots.find(x => x.id === uploadShootId);
        if (!shoot || !newImages.length) return false;
        const shouldAutoSetProjectPhoto = existing.length === 0 && !shoot.projectPhoto;
        const combined = existing.concat(newImages.map(src => ({ src, caption: '' })));
        return ed.idbSetImages(uploadShootId, combined).then(() => {
          if (!shouldAutoSetProjectPhoto) return;
          return ed.resizeDataUrlThumb(newImages[0], 200, 0.6).then(thumb => {
            coverSet = true;
            const live = ed.state.shoots.find(x => x.id === uploadShootId);
            if (live) live.projectPhoto = thumb;
            return ed.savePhotoToIdb(ed.projectPhotoKey(uploadShootId), thumb);
          });
        }).then(() => true);
      }))
      .then(uploaded => {
        if (!uploaded) return;
        ed.renderAll();
        ed.onShootImagesChanged(uploadShootId, { board: true, cover: coverSet });
        const shoot = ed.state.shoots.find(x => x.id === uploadShootId);
        if (!shoot || ed.getShootModeShootId() !== uploadShootId) return;
        ed.renderShootModeMoodboard(shoot).then(() => {
          const thumbs = document.querySelectorAll('#shootModeMoodboard .moodboard-thumb');
          if (thumbs.length) ed.breakShootModePages({ show: thumbs[thumbs.length - 1] });
        });
      })
      .catch(ed.noteStorageFull);
  });

  // "Done shooting" is a wrap-up action, not just an escape hatch — the next
  // thing you want after finishing a shoot is almost always that shoot's own
  // page (to jot a reflection, check something off), not whatever screen
  // happened to be underneath. Same tab-then-modal sequence the post-shoot
  // journal prompt uses, for the same reason: openShootModal needs the right
  // tab active first, or it opens behind it.
  // It also means the shoot happened: one still before Captured (Shoot
  // ready, usually) moves to Captured through the usual status path, so
  // capturedAt and the reflection reminders follow from it. That change's
  // follow-ups wait until the page is open — opening it would hide them —
  // and are then asked over it: the reflection prompt, mainly. A shoot
  // that's already Captured or further along is left as it is.
  document.getElementById('shootModeDoneBtn').addEventListener('click', () => {
    const shootId = ed.getShootModeShootId();
    ed.exitShootMode();
    if (!shootId) return;
    const s = ed.state.shoots.find(x => x.id === shootId);
    if (!s) return;
    const oldStatus = s.status || 'prospect';
    const capturing = ['prospect', 'planning', 'waiting_to_shoot'].includes(oldStatus);
    if (capturing) ed.applyStatusChange(shootId, 'captured', { followUps: false });
    document.querySelector(`.tab[data-view="${s.archived ? 'archive' : 'shoots'}"]`).click();
    ed.openShootModal(shootId);
    if (capturing) ed.runStatusFollowUps(shootId, oldStatus, 'captured');
  });

  document.getElementById('enterShootModeBtn').addEventListener('click', () => {
    if (ed.currentShootId) ed.openShootMode(ed.currentShootId);
  });
};
