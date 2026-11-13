// Photo and video shoots: their statuses, aspect ratios and deliverables; the team roles and social platforms.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootKinds = function addShootKinds(ed) {
  Object.assign(ed, { isVideoCategory, isVideoShoot, isInTheEditStatus, moodboardTerm, statusOptionKeys, remapStatusForCategory, normalizeShootStatuses, renderShootStatusSelectOptions, normalizeAspectRatios, videoDeliverableFields });
  // ---------- Video shoots ----------
  // Video swaps the photo-only post-capture steps (Waiting for selects,
  // Editing) for its own (Rough cut, Client review, Revisions); everything
  // else, Delivered included, is shared, so archive/complete-shoot work off
  // 'delivered' for both. It also calls its mood board a "Storyboard" (same
  // images, same complete/pending logic), has no final images, and gets a few
  // fields of its own (Crew/Talent call, Deliverables).
  // These are declared here, above `let state = loadState()`, because loading
  // saved data already uses them (a later const would throw there, and
  // loadState's catch would then start the app empty).
  const PHOTO_ONLY_STATUSES = ['waiting_for_selects', 'editing'];
  const VIDEO_ONLY_STATUSES = ['rough_cut', 'client_review', 'revisions'];
  // Overview's "In the edit" bucket (also the deadline prompt, the weekly
  // editing check-in and editingAt): photo Editing, and every video step after
  // Captured and before Delivered.
  const IN_THE_EDIT_STATUSES = ['editing', 'rough_cut', 'client_review', 'revisions'];
  const VIDEO_ASPECT_RATIOS = ['16:9', '9:16', '1:1', '4:5'];

  function isVideoCategory(category) {
    return category === 'video';
  }

  function isVideoShoot(s) {
    return !!s && isVideoCategory(s.category);
  }

  function isInTheEditStatus(status) {
    return IN_THE_EDIT_STATUSES.includes(status);
  }

  // "Mood board" vs "Storyboard" for wording that belongs to one shoot.
  // Capitalised; lower-case it mid-sentence.
  function moodboardTerm(category) {
    return isVideoCategory(category) ? 'Storyboard' : 'Mood board';
  }

  // Status keys offered for a category, in STATUS_LABELS order.
  function statusKeysForCategory(category) {
    const excluded = isVideoCategory(category) ? PHOTO_ONLY_STATUSES : VIDEO_ONLY_STATUSES;
    return Object.keys(ed.STATUS_LABELS).filter(k => !excluded.includes(k));
  }

  // Same, but always keeps the shoot's current status in the list (in its
  // usual place) even when it doesn't belong to the category: a <select>
  // whose value has no matching <option> reads back as '', which the next
  // autosave would then store.
  function statusOptionKeys(category, currentStatus) {
    const keys = statusKeysForCategory(category);
    if (!currentStatus || keys.includes(currentStatus)) return keys;
    return ed.STATUS_LABELS[currentStatus]
      ? Object.keys(ed.STATUS_LABELS).filter(k => k === currentStatus || keys.includes(k))
      : keys.concat(currentStatus);
  }

  // Nearest equivalent when a status doesn't exist for a category. Both sides
  // of every swap are post-capture, so a remap never triggers the reflection
  // prompt or clears a reflection.
  function remapStatusForCategory(status, category) {
    if (isVideoCategory(category)) return PHOTO_ONLY_STATUSES.includes(status) ? 'rough_cut' : status;
    return VIDEO_ONLY_STATUSES.includes(status) ? 'editing' : status;
  }

  // Load/import pass: a video shoot in Waiting for selects/Editing moves to
  // Rough cut, and a non-video shoot holding a video-only step moves to
  // Editing. Idempotent. Runs outside migrateShoot, which returns early for
  // shoots that are already current. A shoot moved INTO the edit this way
  // (Waiting for selects -> Rough cut) never went through a status change,
  // so it gets its edit-start date here — otherwise the weekly "How's
  // editing going" check-in would skip it until its status next changed.
  function normalizeShootStatuses(shoots) {
    shoots.forEach(s => {
      if (!s || !s.status) return;
      const next = remapStatusForCategory(s.status, s.category);
      if (next === s.status) return;
      s.status = next;
      if (isInTheEditStatus(next) && !s.editingAt) s.editingAt = new Date().toISOString();
    });
  }

  // Rebuilds the Edit Shoot status <select> for a category and selects
  // currentStatus. new Option() so a stored value never needs escaping.
  function renderShootStatusSelectOptions(category, currentStatus) {
    const select = document.getElementById('shootStatus');
    const status = currentStatus || 'prospect';
    select.innerHTML = '';
    statusOptionKeys(category, status).forEach(key => {
      select.add(new Option(ed.STATUS_LABELS[key] || key, key));
    });
    select.value = status;
  }

  // Canonical order, unknown values dropped, tolerant of a missing or garbled
  // field (already-migrated saves and imported backups never get a default).
  function normalizeAspectRatios(list) {
    return Array.isArray(list) ? VIDEO_ASPECT_RATIOS.filter(r => list.includes(r)) : [];
  }

  // [label, value] pairs for the Deliverables block, shared by the call sheet,
  // the archive PDF and Archive mode. Empty for non-video shoots, so a shoot
  // switched away from video never prints its leftover values — except with
  // evenIfHidden, for the archive PDF, which may end up the only copy.
  function videoDeliverableFields(s, evenIfHidden) {
    if (!evenIfHidden && !isVideoShoot(s)) return [];
    return [
      ['Videos', s.deliverables || ''],
      ['Aspect ratios', normalizeAspectRatios(s.aspectRatios).join(', ')],
      ["Where it's going", s.deliverableDestinations || ''],
    ].filter(([, value]) => ed.hasText(value)).map(([label, value]) => [label, value.trim()]);
  }

  const COLLAPSE_ARROW_SVG = '<svg class="collapse-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>'; ed.COLLAPSE_ARROW_SVG = COLLAPSE_ARROW_SVG;

  const TEAM_ROLE_OPTIONS = [
    ['makeup_artist', 'Makeup artist'],
    ['hairstylist', 'Hairstylist'],
    ['fashion_stylist', 'Fashion stylist'],
    ['set_designer', 'Set designer'],
    ['videographer', 'Videographer'],
    ['assistant', 'Assistant'],
    ['other', 'Other'],
  ]; ed.TEAM_ROLE_OPTIONS = TEAM_ROLE_OPTIONS;

  const SOCIAL_PLATFORM_OPTIONS = [
    ['instagram', 'Instagram'],
    ['tiktok', 'TikTok'],
    ['youtube', 'YouTube'],
    ['other', 'Other'],
  ]; ed.SOCIAL_PLATFORM_OPTIONS = SOCIAL_PLATFORM_OPTIONS;
};
