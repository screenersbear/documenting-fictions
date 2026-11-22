// Back from Ref (Starky, 21 Nov: Open in Ref, then back, should come back to
// The Eye). A shoot's Open in Ref keeps the page the shoot was on, for this
// visit only (sessionStorage); Ref's Back to The Eye (?shoot=<id>) opens the
// shoot on that page again. Only the store and the check, so it's unit
// tested (tests/unit/the-eye/ref-return.test.mjs).
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addRefReturn = function addRefReturn(ed) {
  Object.assign(ed, { noteRefReturn, refReturnPage });
  const KEY = 'eye-back-from-ref';
  const store = () => { try { return window.sessionStorage; } catch (e) { return null; } };
  const isPage = p => !!p && (p.id === 'front' || (ed.SHOOT_MODAL_SECTIONS || []).some(sec => sec.id === p.id)) && Number.isInteger(p.sub) && p.sub >= 0;

  // The shoot and its page ({ id, sub }). False when they aren't real or it can't be kept.
  function noteRefReturn(shootId, page) {
    if (typeof shootId !== 'string' || !shootId || !isPage(page)) return false;
    try { store().setItem(KEY, JSON.stringify({ shoot: shootId, page: { id: page.id, sub: page.sub } })); return true; } catch (e) { return false; }
  }

  // The page to open this shoot on, coming back from Ref, or null. Used once.
  function refReturnPage(shootId) {
    try {
      const s = store();
      const v = JSON.parse(s.getItem(KEY) || 'null');
      s.removeItem(KEY);
      return v && v.shoot === shootId && isPage(v.page) ? { id: v.page.id, sub: v.page.sub } : null;
    } catch (e) { return null; }
  }
};
