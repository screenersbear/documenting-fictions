// When the status changes: the reflection opens once it's shot, and what's asked next.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootAfterStatus = function addShootAfterStatus(ed) {
  Object.assign(ed, { isPostCaptureStatus, shootPageOpenOn, runStatusFollowUps, showPostShootContentExpanded, openShootPageAtReflection });
  // ---------- Post-shoot reflection (gated behind captured-or-later status) ----------
  ed.previousStatusValue = 'prospect';
  // The open shoot's offScheduleDate (see isOriginalPlanDate), kept with the
  // form like its other fields: loaded by openShootModal, noted by the
  // status button and saved by gatherShootFormData. undefined when it has
  // none.
  ed.currentOffScheduleDate = undefined;
  // The status swap the last category flip made ({ from, to }), so flipping
  // the category straight back restores the original status (a mis-tap on
  // the category dropdown stays lossless). Reset per modal open.
  ed.categoryRemap = null;

  function isPostCaptureStatus(status) {
    // Postponed (key: rescheduled)/canceled are an off-track branch, not a step further along
    // the capture pipeline, regardless of where they sit in STATUS_LABELS.
    // Must agree with POST_CAPTURE_STATUSES; the video edit keys sit between
    // captured and delivered in STATUS_LABELS for this reason.
    if (status === 'rescheduled' || status === 'canceled') return false;
    const order = Object.keys(ed.STATUS_LABELS);
    return order.indexOf(status) >= order.indexOf('captured');
  }

  // ---------- After a status change: the reflection and deadline prompts ----------
  // Whichever way a status changes — the shoot page's status button, a row's
  // ⋮ > Change status, or "Done shooting" — the same follow-ups come next,
  // from runStatusFollowUps: moving into Captured or later offers the
  // post-shoot reflection, and moving into the edit without a deadline asks
  // for one, chained after the reflection prompt when both apply so the two
  // never show stacked. Both prompts remember which shoot they're about, so
  // they work from a row too, with that shoot's page closed: there they read
  // and write the saved shoot, and "Reflect now" opens its page.

  // Whether the shoot page is open on this shoot right now — its form, not
  // the saved shoot, is then where its status, deadline and reflection are.
  function shootPageOpenOn(shootId) {
    return !!shootId && !ed.shootModalOverlay.hidden && ed.currentShootId === shootId;
  }

  function shootHasReflection(shootId) {
    if (shootPageOpenOn(shootId)) {
      return ['shootWentRight', 'shootCouldBeBetter', 'shootLessonsLearned'].some(ed.shootFieldHasText);
    }
    const s = ed.state.shoots.find(x => x.id === shootId);
    return !!s && (ed.hasText(s.whatWentRight) || ed.hasText(s.couldBeBetter) || ed.hasText(s.lessonsLearned));
  }

  function runStatusFollowUps(shootId, oldStatus, newStatus) {
    if (isPostCaptureStatus(newStatus) && !isPostCaptureStatus(oldStatus)) {
      // A reflection written before the shoot stepped back a status (it's
      // only ever hidden then, never cleared) just comes back into view —
      // no asking again for what's already there.
      if (!shootHasReflection(shootId)) {
        openPostShootPrompt(shootId);
        return;
      }
      if (shootPageOpenOn(shootId)) {
        document.getElementById('postShootContent').hidden = false;
        // Its answers were measured while hidden (zero height, so they kept
        // their rows size and a longer one reads cut off): measured again
        // now they're on screen.
        ed.onShootSectionRevealed('postShootBody');
        ed.updateShootModalJumpMenuVisibility();
      }
    }
    // Only on entering the edit bucket: a video stepping Rough cut ->
    // Client review -> Revisions shouldn't re-ask at every step.
    if (ed.isInTheEditStatus(newStatus) && !ed.isInTheEditStatus(oldStatus)) ed.maybeOpenDeadlinePrompt(shootId);
  }

  // The shoot the reflection prompt is about.
  let postShootPromptShootId = null;

  function openPostShootPrompt(shootId) {
    postShootPromptShootId = shootId;
    document.getElementById('postShootPromptText').textContent = 'Complete post shoot reflection?';
    document.getElementById('postShootPromptActions').hidden = false;
    document.getElementById('postShootPromptWalkBtn').hidden = false;
    document.getElementById('postShootPromptDismissBtn').hidden = true;
    document.getElementById('postShootPromptOverlay').hidden = false;
    // "Reflect now" doesn't fit half the row on a phone: stack, don't wrap.
    ed.fitButtonPair(document.getElementById('postShootPromptActions'));
  }

  // Reveals the Post-shoot Reflection section.
  function showPostShootContentExpanded() {
    const content = document.getElementById('postShootContent');
    content.hidden = false;
    // Sized now it's on screen: its boxes were measured while hidden and
    // would stay cut off at three lines.
    ed.onShootSectionRevealed('postShootBody');
    return content;
  }

  // Opens a shoot, from a row, already on its Reflection page.
  function openShootPageAtReflection(shootId) {
    if (!ed.state.shoots.some(x => x.id === shootId)) return false;
    ed.openShootModal(shootId);
    showPostShootContentExpanded();
    ed.showShootPage('postShootHeading');
    ed.updateShootModalJumpMenuVisibility();
    return true;
  }

  // "Reflect now": straight to the Reflection page of that shoot.
  function goToPostShootReflection(shootId) {
    if (!shootPageOpenOn(shootId)) return openShootPageAtReflection(shootId);
    // From the new-shoot wizard's first slide (a shoot being logged after
    // the fact) this means "take me to the reflection now" — close the
    // wizard first so the page turns behind nothing.
    if (ed.shootWizardActive) ed.endShootWizard();
    showPostShootContentExpanded();
    ed.showShootPage('postShootHeading', { turn: true });
    ed.updateShootModalJumpMenuVisibility();
    return true;
  }

  document.getElementById('postShootPromptYesBtn').addEventListener('click', () => {
    const shootId = postShootPromptShootId;
    document.getElementById('postShootPromptOverlay').hidden = true;
    goToPostShootReflection(shootId);
    ed.maybeOpenDeadlinePrompt(shootId);
  });

  // "Walk me through it": the same, then the reflection helper's questions
  // straight away. The deadline prompt, when it applies, waits until the
  // helper closes rather than stacking over it.
  document.getElementById('postShootPromptWalkBtn').addEventListener('click', () => {
    const shootId = postShootPromptShootId;
    document.getElementById('postShootPromptOverlay').hidden = true;
    if (!goToPostShootReflection(shootId)) return;
    ed.openReflectHelper();
    ed.reflectHelper.onClose = () => ed.maybeOpenDeadlinePrompt(shootId);
  });

  document.getElementById('postShootPromptLaterBtn').addEventListener('click', () => {
    if (shootPageOpenOn(postShootPromptShootId)) {
      showPostShootContentExpanded();
      ed.updateShootModalJumpMenuVisibility();
    }
    document.getElementById('postShootPromptText').textContent = "the post-shoot reflection questions will be on the Reflection page of this shoot whenever you're ready.";
    document.getElementById('postShootPromptActions').hidden = true;
    document.getElementById('postShootPromptWalkBtn').hidden = true;
    document.getElementById('postShootPromptDismissBtn').hidden = false;
  });

  document.getElementById('postShootPromptDismissBtn').addEventListener('click', () => {
    document.getElementById('postShootPromptOverlay').hidden = true;
    ed.maybeOpenDeadlinePrompt(postShootPromptShootId);
  });
};
