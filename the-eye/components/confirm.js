// The app's own confirm (askConfirm).
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addConfirm = function addConfirm(ed) {
  Object.assign(ed, { askConfirm });
  // ---------- The app's own confirm (askConfirm) ----------
  // In place of the browser's confirm(): the same card as the app's other
  // prompts, with buttons named for what they do ("Delete shoot" / "Keep
  // it") rather than OK / Cancel. Resolves true for the action, false for
  // the other button. `danger` makes the action the red button, for
  // anything that can't be taken back. One at a time: asking again while
  // one is up answers the first with false.
  let appConfirmResolve = null;
  // When the card last opened (performance.now()): see the action button's
  // listener below.
  let appConfirmOpenedAt = 0;

  function askConfirm({ title = '', text = '', confirmLabel = 'OK', cancelLabel = 'Cancel', danger = false } = {}) {
    if (appConfirmResolve) settleAppConfirm(false);
    // Takes the focus, as the browser's confirm() did: a field left focused
    // underneath (tapping a button on iOS never blurs one) would keep the
    // keyboard up over this popup and go on taking typing and Return. The
    // blur commits it the usual way (its change/blur listeners) before the
    // answer can re-render the list it's in.
    const focused = document.activeElement;
    if (focused && focused !== document.body && typeof focused.blur === 'function') focused.blur();
    document.getElementById('appConfirmTitle').textContent = title;
    const textEl = document.getElementById('appConfirmText');
    textEl.textContent = text;
    textEl.hidden = !text;
    const ok = document.getElementById('appConfirmOkBtn');
    ok.textContent = confirmLabel;
    ok.className = danger ? 'danger' : 'primary';
    document.getElementById('appConfirmCancelBtn').textContent = cancelLabel;
    appConfirmOpenedAt = performance.now();
    document.getElementById('appConfirmOverlay').hidden = false;
    ed.fitButtonPair(document.getElementById('appConfirmActions'));
    return new Promise(resolve => { appConfirmResolve = resolve; });
  }

  function settleAppConfirm(answer) {
    document.getElementById('appConfirmOverlay').hidden = true;
    const resolve = appConfirmResolve;
    appConfirmResolve = null;
    if (resolve) resolve(answer);
  }

  // The browser's confirm() swallowed the second tap of a quick double-tap;
  // this card is up at once, so that tap (on a photo's ×, say) could land on
  // the action — "Delete photo" — before the question's been read. The
  // action ignores taps for its first moment; going by the clock, not the
  // card's entrance animation, whose end event can't be relied on. The
  // other button ("Keep it") answers straight away: a stray tap there is
  // harmless, and backing out quickly should always work.
  document.getElementById('appConfirmOkBtn').addEventListener('click', () => {
    if (performance.now() - appConfirmOpenedAt < 400) return;
    settleAppConfirm(true);
  });
  document.getElementById('appConfirmCancelBtn').addEventListener('click', () => settleAppConfirm(false));
};
