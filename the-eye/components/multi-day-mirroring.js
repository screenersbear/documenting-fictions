// Multi-day shoots: the other days mirror the first day's details and pictures.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addMultiDayMirroring = function addMultiDayMirroring(ed) {
  Object.assign(ed, { projectLeadOf, projectFollowers, mirrorSignature, applyLeadDetails, syncProjectMirrors, onShootImagesChanged, mirrorLeadImages });
  // ---------- Multi-day mirroring ----------
  // A project made with "Multi-day shoot" has a lead day — the shoot it was
  // made from (project.leadShootId) — and its other days follow it
  // (shoot.followsLead). Everything planned on the lead is mirrored onto
  // the following days, now and on every later change: title, category,
  // talent, team, location and directions, the concept fields, shooting
  // notes, deliverables, deadline, references, frameworks, lighting setups,
  // the mood board and its cover. Each day keeps its own date, times,
  // status, shot list, reflection and final images. Changing any mirrored
  // detail on a following day by hand makes that day its own from then on
  // (followsLead off), and the lead's later changes skip it.
  //
  // The text/list details are compared by signature on every save (run from
  // saveState), so every way of editing a shoot — the form, the ⋮ menu,
  // Shoot mode, the talent popup — is covered without hooks of its own.
  // Photos live in IndexedDB, so mood board and cover changes are reported
  // separately through onShootImagesChanged().

  // The lead day, if the project has one that's still in it.
  function projectLeadOf(project) {
    if (!project || !project.leadShootId) return null;
    const lead = ed.state.shoots.find(s => s.id === project.leadShootId);
    return lead && lead.projectId === project.id ? lead : null;
  }

  // The shoots currently following a project's lead.
  function projectFollowers(project, lead) {
    return ed.state.shoots.filter(s => s.projectId === project.id && s.followsLead && s.id !== lead.id);
  }

  // The mirrored text/list details as one comparable number, normalized the
  // way the Edit Shoot form round-trips them (trimmed references, tags in a
  // fixed order, no list ids, the team platform defaulted), so opening a
  // following day and closing it untouched never reads as an edit. Photos
  // are left out on purpose: at launch they arrive from IndexedDB a moment
  // after everything else, which would look like a change.
  function mirrorSignature(s) {
    const loc = ed.normalizeLocation(s.location);
    // Only tags the form can actually show (their framework and tag still
    // exist — Manage Frameworks can delete or rename them without touching
    // shoots), once each, since a re-save through the form drops the rest.
    const frameworkTags = [...new Set((s.frameworkTags || [])
      .filter(t => (ed.state.frameworks || []).some(fw => fw.id === t.frameworkId && (fw.tags || []).includes(t.tag)))
      .map(t => `${t.frameworkId}|${t.tag}`))].sort();
    return ed.hashString(JSON.stringify([
      // Trimmed like the form saves them (Shoot mode stores text as typed).
      ['title', 'teamRequired', 'talentDirections', 'teamDirections', 'locationDirections',
        'premise', 'character', 'worldNotes', 'shootGoals', 'elevatorPitch', 'shootingNotes',
        'deliverables', 'deliverableDestinations', 'deadline'].map(k => (typeof s[k] === 'string' ? s[k].trim() : '')),
      // A category the form has no option for (e.g. an old shoot's 'client')
      // reads back from the form as none at all.
      ed.CATEGORY_LABELS[s.category] ? s.category : '',
      !!s.teamFinalized,
      !!s.moodboardComplete,
      (s.talents || []).map(t => [(t.name || '').trim(), (t.socialHandles || []).map(h => [h.platform || '', h.handle || ''])]),
      (s.teamMembers || []).map(tm => [tm.name || '', tm.role || '', tm.socialPlatform || 'instagram', tm.socialHandle || '']),
      [loc.name, loc.street, loc.city, loc.state, loc.zip, loc.country],
      ed.normalizeAspectRatios(s.aspectRatios),
      (s.references || []).map(r => (typeof r === 'string' ? r.trim() : '')).filter(Boolean),
      frameworkTags,
      (s.lightingSetups || []).map(l => [l.name || '', l.characteristics || '', l.description !== undefined ? l.description : (l.text || '')]),
    ]));
  }

  // Copies the lead's mirrored details onto one following day — in place,
  // since Shoot mode and the form hold live references to shoot objects. A
  // category change brings the day's status along to its nearest
  // equivalent, the same as flipping the category in the form does.
  function applyLeadDetails(lead, day) {
    ['title', 'category', 'teamRequired', 'talentDirections', 'teamDirections', 'locationDirections',
      'premise', 'character', 'worldNotes', 'shootGoals', 'elevatorPitch', 'shootingNotes',
      'deliverables', 'deliverableDestinations', 'deadline'].forEach(k => { day[k] = lead[k] || ''; });
    day.teamFinalized = !!lead.teamFinalized;
    day.moodboardComplete = !!lead.moodboardComplete;
    day.teamMembers = (lead.teamMembers || []).map(tm => ({ ...tm }));
    day.location = ed.normalizeLocation(lead.location);
    day.aspectRatios = ed.normalizeAspectRatios(lead.aspectRatios);
    day.references = [...(lead.references || [])];
    day.frameworkTags = (lead.frameworkTags || []).map(t => ({ ...t }));
    day.lightingSetups = (lead.lightingSetups || []).map(item => ({
      id: ed.uid(),
      name: item.name || '',
      characteristics: item.characteristics || '',
      description: item.description !== undefined ? item.description : (item.text || ''),
    }));
    // Same people (same talent ids) as the lead. A photo the lead hasn't got
    // in memory keeps the day's own copy rather than blanking it; a new or
    // changed one is written to this day's own IndexedDB row too, so it
    // survives a reload.
    const previous = new Map((day.talents || []).map(t => [t.id, t]));
    day.talents = (lead.talents || []).map(t => {
      const id = t.id || ed.uid();
      const prev = previous.get(id);
      const photo = t.photo || (prev && prev.photo) || '';
      if (t.photo && (!prev || prev.photo !== t.photo)) ed.savePhotoToIdb(ed.talentPhotoKey(day.id, id), t.photo).catch(() => {});
      return { id, name: t.name || '', socialHandles: (t.socialHandles || []).map(h => ({ ...h })), photo };
    });
    day.status = ed.remapStatusForCategory(day.status || 'prospect', day.category);
  }

  // Lets the user know a day just stopped following, and refreshes its
  // Multi-day row if that day's the one open.
  function announceDayDetached(day, lead) {
    const info = ed.projectDayInfo(day);
    const leadInfo = ed.projectDayInfo(lead);
    const dayName = info ? `Day ${info.day}` : 'This day';
    const leadName = leadInfo ? `Day ${leadInfo.day}` : 'the first day';
    // A notice: the removal that set this off usually has its Undo toast
    // up, which this waits for — and if that Undo puts the day back to
    // following (reattachDayIfMatchingLead), it's dropped.
    const dayId = day.id;
    ed.showNoticeToast(`${dayName} now has its own changes, so later edits to ${leadName} won't copy to it`, 3200, () => {
      const live = ed.state.shoots.find(s => s.id === dayId);
      return !!live && !live.followsLead;
    });
    if (!ed.shootModalOverlay.hidden && ed.currentShootId === day.id) ed.updateMultiDayRow();
  }

  // Run by saveState before every save. For each project with a lead: a
  // following day whose details no longer match what was last mirrored onto
  // it was edited by hand, so it stops following — unless it now matches
  // the lead anyway (the talent popup updates a person on every shoot at
  // once). Then, if the lead itself changed since the last mirror, its
  // details are copied onto every day still following it.
  function syncProjectMirrors() {
    if (!ed.state || !Array.isArray(ed.state.shoots) || !Array.isArray(ed.state.projects)) return;
    ed.state.projects.forEach(project => {
      const lead = projectLeadOf(project);
      if (!lead) return;
      const leadSig = mirrorSignature(lead);
      projectFollowers(project, lead).forEach(day => {
        const sig = mirrorSignature(day);
        if (sig === day.mirrorSig) return;
        if (sig === leadSig) { day.mirrorSig = sig; return; }
        day.followsLead = false;
        delete day.mirrorSig;
        announceDayDetached(day, lead);
      });
      if (leadSig === project.mirrorSig) return;
      projectFollowers(project, lead).forEach(day => {
        applyLeadDetails(lead, day);
        day.mirrorSig = mirrorSignature(day);
      });
      project.mirrorSig = leadSig;
    });
  }

  // Called once a shoot's mood board ({ board: true }) and/or cover
  // ({ cover: true }) has been changed by hand — both live in IndexedDB,
  // outside the signature above. On a lead day it copies what changed onto
  // every following day; on a following day it counts as making that day
  // its own. A cover set from a day's own final images is never reported:
  // it belongs to that day.
  //
  // shootImagesChangedAt: when each project day last had its photos changed
  // this way (this session only). An Undo that would put a day back to
  // following its lead (reattachDayIfMatchingLead) leaves it be when its own
  // or the lead's photos were changed since — the signature can't see them.
  const shootImagesChangedAt = new Map(); ed.shootImagesChangedAt = shootImagesChangedAt;
  function onShootImagesChanged(shootId, what) {
    const shoot = ed.state.shoots.find(s => s.id === shootId);
    if (!shoot || !shoot.projectId) return;
    shootImagesChangedAt.set(shootId, Date.now());
    const project = ed.findProject(shoot.projectId);
    const lead = projectLeadOf(project);
    if (!lead) return;
    if (shoot.id === lead.id) {
      mirrorLeadImages(project, lead, what || { board: true });
      return;
    }
    if (!shoot.followsLead) return;
    shoot.followsLead = false;
    delete shoot.mirrorSig;
    announceDayDetached(shoot, lead);
    ed.saveState();
  }

  // The lead's mood board and/or cover (per `what`), copied onto each
  // following day's own IndexedDB rows — or just onto `targets` — and the
  // cover onto the in-memory shoot for the lists too. A day that already
  // has final images of its own keeps its cover: once it's been shot, its
  // cover is its own photo, not the plan's.
  function mirrorLeadImages(project, lead, what, targets) {
    const days = targets || projectFollowers(project, lead);
    const wantBoard = !!(what && what.board);
    const wantCover = !!(what && what.cover);
    if (!days.length || (!wantBoard && !wantCover)) return Promise.resolve();
    return Promise.all([
      wantBoard ? ed.idbGetImages(lead.id).catch(() => null) : Promise.resolve(null),
      wantCover ? ed.idbGetImages(ed.projectPhotoKey(lead.id)).catch(() => null) : Promise.resolve(null),
    ]).then(([board, coverRows]) => {
      const cover = wantCover ? (ed.photoFromEntries(coverRows) || lead.projectPhoto || '') : '';
      return Promise.all(days.map(day => {
        const writes = [];
        if (board) writes.push(ed.idbSetImages(day.id, board.map(img => ({ ...img }))));
        if (cover) {
          writes.push(ed.idbGetImages(ed.finalImagesKey(day.id)).catch(() => []).then(finals => {
            if (finals.length) return;
            const live = ed.state.shoots.find(x => x.id === day.id);
            if (live) live.projectPhoto = cover;
            return ed.savePhotoToIdb(ed.projectPhotoKey(day.id), cover);
          }));
        }
        return Promise.all(writes.map(w => w.catch(() => {})));
      }));
    }).then(() => ed.renderAll()).catch(() => {});
  }
};
