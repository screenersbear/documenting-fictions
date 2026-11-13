// "Need to think it through?": drawing a question, going on and back.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addConceptHelperHelperSteps = function addConceptHelperHelperSteps(ed) {
  Object.assign(ed, { renderConceptHelper, conceptHelperBlankIds, jumpConceptHelperTo, askConceptHelperLeave, closeConceptHelper });
  function renderConceptHelper() {
    const h = ed.conceptHelper;
    const show = (id, on) => { document.getElementById(id).hidden = !on; };
    const input = document.getElementById('conceptHelperInput');
    show('conceptHelperLeaveRow', !!h.leaving);
    if (h.leaving) {
      // Leaving before every question's answered (see askConceptHelperLeave).
      const blanks = conceptHelperBlankIds().length;
      const plural = blanks === 1 ? '' : 's';
      document.getElementById('conceptHelperStep').textContent = '';
      document.getElementById('conceptHelperTitle').textContent = h.leaving === 'close' ? 'Not done yet'
        : (blanks === 1 ? 'One left blank' : 'A few left blank');
      document.getElementById('conceptHelperText').textContent = h.leaving === 'close'
        ? `${blanks ? `You've left ${blanks} question${plural} blank, and there are` : 'There are'} a few more to go. If you leave now, your answers won't be kept.`
        : `You left ${blanks} question${plural} blank. Answer ${blanks === 1 ? 'it' : 'them'} for a fuller result, or go ahead without.`;
      document.getElementById('conceptHelperLeaveFirstBtn').textContent = !blanks ? 'Keep going'
        : (blanks === 1 ? 'Take me to it' : 'Go to the first one');
      document.getElementById('conceptHelperLeaveAnywayBtn').textContent = h.leaving !== 'use' ? 'Leave anyway'
        : (ed.conceptHelperShownOutputs().length > 1 ? 'Use these anyway' : 'Use this anyway');
      ['conceptHelperHint', 'conceptHelperInput', 'conceptHelperOutputs', 'conceptHelperYesNo', 'conceptHelperNextRow',
        'conceptHelperEndRow', 'conceptHelperEndNavRow', 'conceptHelperBackBtn', 'conceptHelperCloseRow'].forEach(id => show(id, false));
      return;
    }
    if (h.ended) {
      const several = ed.conceptHelperShownOutputs().length > 1;
      document.getElementById('conceptHelperStep').textContent = '';
      document.getElementById('conceptHelperTitle').textContent = "Here's your concept";
      document.getElementById('conceptHelperText').textContent = several
        ? 'Change anything you like, then use these or write your own.'
        : 'Change anything you like, then use it as your concept or write your own.';
      document.getElementById('conceptHelperUseBtn').textContent = several ? 'Use these' : 'Use this';
      show('conceptHelperHint', false);
      show('conceptHelperInput', false);
      show('conceptHelperOutputs', true);
      show('conceptHelperYesNo', false);
      show('conceptHelperNextRow', false);
      show('conceptHelperEndRow', true);
      // Back/Start over as a pair of buttons, and no Close: "Use this" and
      // "I'll write it myself" both close it already.
      show('conceptHelperEndNavRow', true);
      show('conceptHelperBackBtn', false);
      show('conceptHelperCloseRow', false);
      // Each box as tall as its text (the card scrolls), so nothing's
      // hidden inside a box of its own.
      ed.conceptHelperShownOutputs().forEach(out => ed.autoSizeTextarea(document.getElementById(out.boxId)));
      ed.updateConceptHelperCount();
      return;
    }
    const node = ed.conceptHelperNode(h.nodeId);
    const cat = ed.conceptHelperCategory();
    const text = (node.categoryText && node.categoryText[cat]) || node.text;
    document.getElementById('conceptHelperStep').textContent = `Question ${h.history.length + 1}`;
    document.getElementById('conceptHelperTitle').textContent = "Let's think it through";
    document.getElementById('conceptHelperText').textContent = text.replace(/\{category\}/g, ed.conceptHelperCategoryLabel());
    const hint = document.getElementById('conceptHelperHint');
    hint.textContent = node.hint || '';
    show('conceptHelperHint', !!node.hint);
    const isShort = node.type === 'short';
    // "Posed" / "Documentary" rather than No / Yes when it's an either/or.
    document.getElementById('conceptHelperYesBtn').textContent = node.yesLabel || 'Yes';
    document.getElementById('conceptHelperNoBtn').textContent = node.noLabel || 'No';
    show('conceptHelperInput', isShort);
    show('conceptHelperOutputs', false);
    show('conceptHelperYesNo', !isShort);
    show('conceptHelperNextRow', isShort);
    show('conceptHelperEndRow', false);
    show('conceptHelperEndNavRow', false);
    show('conceptHelperBackBtn', h.history.length > 0);
    show('conceptHelperCloseRow', true);
    if (isShort) {
      input.placeholder = node.placeholder || '';
      const prev = h.answers[h.nodeId];
      input.value = typeof prev === 'string' ? prev : '';
    }
    // Two answers side by side while both fit their half. The labels never
    // wrap (styles/concept-helper.css), so one that doesn't fit ("Documentary", or most on a
    // narrow phone) widens its button and squeezes the other — then the pair
    // stacks full width instead. A few px of slack: the white button's
    // border alone makes it ~2px wider.
    const yesNo = document.getElementById('conceptHelperYesNo');
    yesNo.classList.remove('concept-helper-choice-stacked');
    const rowWidth = yesNo.getBoundingClientRect().width;
    if (!isShort && rowWidth) {
      const half = (rowWidth - (parseFloat(getComputedStyle(yesNo).columnGap) || 0)) / 2;
      const widest = Math.max(
        document.getElementById('conceptHelperYesBtn').getBoundingClientRect().width,
        document.getElementById('conceptHelperNoBtn').getBoundingClientRect().width);
      if (widest > half + 3) yesNo.classList.add('concept-helper-choice-stacked');
    }
  }

  // Where a question leads: the next one, or — when the flow runs out — the
  // opt-in Character/World questions, or null for the end.
  function conceptHelperResolve(nextId) {
    return (!nextId || nextId === 'END' || !ed.conceptHelperNode(nextId)) ? ed.conceptHelperDeeperStart() : nextId;
  }

  // The branch a question's saved answer leads down — null when it has none
  // (or a blank one), which is where a resumed run stops.
  function conceptHelperSavedNext(node) {
    const answer = ed.conceptHelper.answers[node.id];
    if (node.type === 'short') return typeof answer === 'string' && answer.trim() ? (node.next || 'END') : null;
    if (answer === undefined) return null;
    if (answer === (node.yesValue !== undefined ? node.yesValue : true)) return node.yes || 'END';
    if (answer === (node.noValue !== undefined ? node.noValue : false)) return node.no || 'END';
    return null;
  }

  function goConceptHelper(nextId) {
    const h = ed.conceptHelper;
    h.history.push(h.nodeId);
    let id = conceptHelperResolve(nextId);
    // After "Go to the first one": straight past everything that's
    // already answered, to the next gap (or the end).
    while (id && h.resume) {
      const saved = conceptHelperSavedNext(ed.conceptHelperNode(id));
      if (!saved) break;
      h.history.push(id);
      h.nodeId = id;
      id = conceptHelperResolve(saved);
    }
    if (!id) {
      h.ended = true;
      h.resume = false;
      ed.fillConceptHelperOutputs();
    } else {
      h.nodeId = id;
    }
    renderConceptHelper();
  }

  // Questions already passed that were left empty. "None" and the like
  // count as answered — that was an answer. The question on screen isn't
  // "left" yet.
  function conceptHelperBlankIds() {
    const h = ed.conceptHelper;
    return h.history.filter((id, i) => {
      const node = ed.conceptHelperNode(id);
      const answer = h.answers[id];
      return h.history.indexOf(id) === i && node && node.type === 'short' && !(typeof answer === 'string' && answer.trim());
    });
  }

  // Back to a question, picking up from there; answering it then skips on
  // past whatever's already answered (see goConceptHelper).
  function jumpConceptHelperTo(id) {
    const h = ed.conceptHelper;
    const at = h.history.indexOf(id);
    if (at >= 0) h.history = h.history.slice(0, at);
    h.nodeId = id;
    h.ended = false;
    h.leaving = null;
    h.resume = true;
    renderConceptHelper();
  }

  // Every question's meant to be answered: leaving before the end (Close),
  // or using what's there with some left blank, asks first — with a way
  // straight to the first one that's missing.
  function askConceptHelperLeave(action) {
    const h = ed.conceptHelper;
    if (!h) return false;
    if (action === 'close' ? h.ended : !conceptHelperBlankIds().length) return false;
    const node = !h.ended && ed.conceptHelperNode(h.nodeId);
    // The box's value only means something on a short question (it keeps
    // its old text while hidden on a yes/no one).
    const typed = node && node.type === 'short' ? document.getElementById('conceptHelperInput').value.trim() : '';
    // Nothing answered yet (opened by mistake, say): nothing to lose.
    const anyAnswer = Object.values(h.answers).some(a => (typeof a === 'string' ? a.trim() : a !== undefined));
    if (action === 'close' && !typed && !anyAnswer) return false;
    // What's in the box on screen — even emptied — is what "Keep going" shows.
    if (node && node.type === 'short') h.answers[node.id] = typed;
    h.leaving = action;
    renderConceptHelper();
    return true;
  }

  function openConceptHelper() {
    if (!ed.CONCEPT_FLOWS.length) return;
    const flow = ed.conceptFlowFor(ed.conceptHelperCategory());
    ed.conceptHelper = { flow, nodeId: flow.start, history: [], answers: {}, ended: false };
    // Shown first: renderConceptHelper measures the answer buttons.
    document.getElementById('conceptHelperOverlay').hidden = false;
    renderConceptHelper();
  }

  function closeConceptHelper() {
    document.getElementById('conceptHelperOverlay').hidden = true;
    ed.conceptHelper = null;
    ed.queueShootBreak(250); // it may have just filled in a field
  }

  document.getElementById('conceptHelperBtn').addEventListener('click', openConceptHelper);

  document.getElementById('conceptHelperYesBtn').addEventListener('click', () => {
    if (!ed.conceptHelper || ed.conceptHelper.ended) return;
    const node = ed.conceptHelperNode(ed.conceptHelper.nodeId);
    ed.conceptHelper.answers[node.id] = node.yesValue !== undefined ? node.yesValue : true;
    goConceptHelper(node.yes);
  });

  document.getElementById('conceptHelperNoBtn').addEventListener('click', () => {
    if (!ed.conceptHelper || ed.conceptHelper.ended) return;
    const node = ed.conceptHelperNode(ed.conceptHelper.nodeId);
    ed.conceptHelper.answers[node.id] = node.noValue !== undefined ? node.noValue : false;
    goConceptHelper(node.no);
  });

  function nextConceptHelperShort() {
    if (!ed.conceptHelper || ed.conceptHelper.ended) return;
    const node = ed.conceptHelperNode(ed.conceptHelper.nodeId);
    if (node.type !== 'short') return;
    // Left blank, it's flagged when they try to leave or use the result (see
    // askConceptHelperLeave); that part of the summary is just left out.
    ed.conceptHelper.answers[node.id] = document.getElementById('conceptHelperInput').value.trim();
    goConceptHelper(node.next);
  }

  document.getElementById('conceptHelperNextBtn').addEventListener('click', nextConceptHelperShort);

  // keyCode 229: Safari sends the Enter that confirms an IME composition
  // (Japanese, Chinese…) after compositionend, with isComposing already false.
  document.getElementById('conceptHelperInput').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    nextConceptHelperShort();
  });

  // The small Back link on a question, or the end screen's Back button.
  function backConceptHelper() {
    const h = ed.conceptHelper;
    if (!h || !h.history.length) return;
    h.nodeId = h.history.pop();
    h.ended = false;
    h.resume = false;
    renderConceptHelper();
  }

  document.getElementById('conceptHelperBackBtn').addEventListener('click', backConceptHelper);
  document.getElementById('conceptHelperEndBackBtn').addEventListener('click', backConceptHelper);

  document.getElementById('conceptHelperRestartBtn').addEventListener('click', () => {
    if (!ed.conceptHelper) return;
    const flow = ed.conceptHelper.flow;
    ed.conceptHelper = { flow, nodeId: flow.start, history: [], answers: {}, ended: false };
    renderConceptHelper();
  });
};
