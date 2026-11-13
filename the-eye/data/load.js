// Loading what's saved (and keeping photos out of it).
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addLoad = function addLoad(ed) {
  Object.assign(ed, { loadState, stripPhotos });
  function loadState() {
    try {
      const raw = localStorage.getItem(ed.STORAGE_KEY);
      if (!raw) return ed.defaultState();
      const parsed = JSON.parse(raw);
      const rawFrameworks = (Array.isArray(parsed.frameworks) && parsed.frameworks.length) ? parsed.frameworks : ed.seedFrameworks();
      const retiredLightingFwId = (rawFrameworks.find(f => f.name === 'Lighting') || {}).id;
      const frameworks = ed.migrateFrameworks(rawFrameworks);
      const shoots = (parsed.shoots || []).map(s => ed.migrateShoot(s, frameworks));
      ed.migrateIdeaPhaseStatus(shoots);
      ed.normalizeShootStatuses(shoots);
      ed.removeFramework(shoots, retiredLightingFwId);
      ed.renameFrameworkTag(shoots, frameworks, 'Visual Language', 'Surreal', 'Surrealism');
      ed.removeFrameworkTags(shoots, frameworks, 'Visual Language', ed.RETIRED_VISUAL_LANGUAGE_TAGS, ed.VISUAL_LANGUAGE_TAGS);
      // Needs the shoots in their final shape: it rebuilds any project record
      // a shoot still points at and drops projects left with no shoots.
      const projects = ed.normalizeProjects(parsed.projects, shoots);
      // sourceShootId entries were auto-mirrored from a shoot's own reflection
      // fields — that mirroring is gone (Reflections now only ever shows
      // entries written there directly), so any left over from before are
      // dropped here rather than lingering as orphaned duplicates. The
      // reflection text itself isn't lost: it still lives on the shoot.
      const journalEntries = (Array.isArray(parsed.journalEntries) ? parsed.journalEntries : [])
        .filter(e => !e.sourceShootId)
        .map(ed.migrateJournalEntry);
      return {
        shoots,
        projects,
        frameworks,
        journalEntries,
        titleDisplayMode: parsed.titleDisplayMode === 'title' ? 'title' : 'talent',
        presentation: ed.normalizePresentation(parsed.presentation),
        defaultCountry: typeof parsed.defaultCountry === 'string' ? parsed.defaultCountry : '',
        dismissedLocationKeys: Array.isArray(parsed.dismissedLocationKeys) ? parsed.dismissedLocationKeys : [],
        dismissedTeamMemberKeys: Array.isArray(parsed.dismissedTeamMemberKeys) ? parsed.dismissedTeamMemberKeys : [],
        dismissedTalentKeys: Array.isArray(parsed.dismissedTalentKeys) ? parsed.dismissedTalentKeys : [],
        dismissedLightingSetupKeys: Array.isArray(parsed.dismissedLightingSetupKeys) ? parsed.dismissedLightingSetupKeys : [],
        photographer: ed.normalizePhotographer(parsed.photographer),
      };
    } catch (e) {
      console.error('Failed to load state, starting fresh', e);
      return ed.defaultState();
    }
  }

  // Photos stay on the in-memory objects so rendering can read them
  // synchronously, but they're stripped back out on the way to localStorage —
  // they live in IndexedDB instead (see projectPhotoKey/talentPhotoKey). This
  // is what keeps a routine autosave a small text-only write instead of
  // re-serializing every base64 photo in the library.
  // NOTE: a JSON replacer matches by key name at any depth, so these two names
  // are reserved for photos — don't reuse them for anything that must persist.
  function stripPhotos(key, value) {
    if (key === 'projectPhoto' || key === 'photo') return undefined;
    return value;
  }
};
