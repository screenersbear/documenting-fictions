// What a new notebook starts with: the frameworks, the app colour, how it looks, the photographer.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addDefaultState = function addDefaultState(ed) {
  Object.assign(ed, { seedFrameworks, normalizePresentation, defaultState, normalizeSocialHandle, normalizePhotographer, photographerHasInfo, applyAppColor });
  function seedFrameworks() {
    return [
      {
        id: ed.uid(),
        name: 'Visual Language',
        tags: [...ed.VISUAL_LANGUAGE_TAGS],
      },
    ];
  }

  const APP_COLORS = [['mango', 'Mango'], ['orange', 'Orange'], ['berry', 'Berry'], ['fern', 'Fern'], ['ocean', 'Ocean'], ['leaf', 'Leaf'], ['ink', 'Black']]; ed.APP_COLORS = APP_COLORS;
  const APP_COLOR_KEY = 'df-app-color'; // also read in index.html, before the first paint

  function firstAppColor() {
    let c = null;
    try { c = localStorage.getItem(APP_COLOR_KEY); } catch (e) { /* storage unavailable */ }
    return APP_COLORS.some(([key]) => key === c) ? c : 'mango';
  }
  // How the notebook looks: its color, where the app starts, and the stickers
  // on its cover (their photos are in IndexedDB, see stickerKey).
  function normalizePresentation(saved) {
    const p = saved && typeof saved === 'object' ? saved : {};
    return {
      // None yet (a first launch): the one picked on the shelf, if any.
      color: APP_COLORS.some(([key]) => key === p.color) ? p.color : firstAppColor(),
      // Where it opens: where you left off unless you picked otherwise since
      // that became the default (11-11), so an old 'notebook' carries over.
      start: p.startPicked && (p.start === 'first' || p.start === 'notebook') ? p.start : 'last',
      startPicked: !!p.startPicked,
      stickers: (Array.isArray(p.stickers) ? p.stickers : []).filter(s => s && typeof s.id === 'string'
        && (s.shape === 'circle' || s.shape === 'square' || s.shape === 'rect') && [s.x, s.y, s.size].every(Number.isFinite)),
    };
  }
  const stickerKey = id => `${id}__sticker`; ed.stickerKey = stickerKey;

  // Up here for the same reason as APP_COLORS: normalizeProjects (run by
  // loadState) uses it, and a const declared any further down would throw
  // there and start the app empty.
  const UNTITLED_PROJECT_NAME = 'Untitled project'; ed.UNTITLED_PROJECT_NAME = UNTITLED_PROJECT_NAME;

  function defaultState() {
    return {
      shoots: [],
      projects: [],
      frameworks: seedFrameworks(),
      journalEntries: [],
      titleDisplayMode: 'talent',
      presentation: normalizePresentation(),
      defaultCountry: '',
      dismissedLocationKeys: [],
      dismissedTeamMemberKeys: [],
      dismissedTalentKeys: [],
      dismissedLightingSetupKeys: [],
      photographer: emptyPhotographer(),
    };
  }

  // Who's behind the camera — surfaced on call sheets ahead of the rest of the
  // crew. Every field is optional; the first-run prompt and the app menu both
  // edit this same object.
  function emptyPhotographer() {
    return { name: '', businessName: '', socialPlatform: 'instagram', socialHandle: '', phone: '' };
  }

  // Handle fields prefill with "@" so there's less to type — but if that's
  // all that's left when the field is saved (tapped in, nothing typed,
  // tapped away), it should read as never having been set, not as a real
  // (garbage) handle. Used everywhere a handle gets committed: photographer,
  // talent, team member.
  function normalizeSocialHandle(value) {
    const trimmed = (value || '').trim();
    return trimmed === '@' ? '' : trimmed;
  }

  function normalizePhotographer(p) {
    const src = (p && typeof p === 'object') ? p : {};
    return {
      name: src.name || '',
      businessName: src.businessName || '',
      socialPlatform: src.socialPlatform || 'instagram',
      socialHandle: src.socialHandle || '',
      phone: src.phone || '',
    };
  }

  function photographerHasInfo(p) {
    return !!p && (ed.hasText(p.name) || ed.hasText(p.businessName) || ed.hasText(p.socialHandle) || ed.hasText(p.phone));
  }

  // ---------- App color (the sun menu's: sets :root[data-book] and df-app-color) ----------
  function applyAppColor(color) {
    document.documentElement.dataset.book = color;
    try { localStorage.setItem(APP_COLOR_KEY, color); } catch (err) { /* it just paints mango first next launch */ }
  }
};
