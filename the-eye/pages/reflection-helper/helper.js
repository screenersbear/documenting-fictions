// "Need help reflecting?": the flow for this shoot, its questions and answers.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addReflectionHelperHelper = function addReflectionHelperHelper(ed) {
  Object.assign(ed, { openReflectHelper });
  // ---------- Reflection helper ("Need help reflecting?") ----------
  // Under Reflection: a few short questions for each of its three fields,
  // picked by the shoot's category (REFLECTION_FLOWS). Back and Next move
  // freely, any question can be skipped, and Finish (or Close, partway) writes
  // whatever was answered straight into the matching fields — one sentence
  // per answer, each from its question's `say` ({a} = the answer; `lower`
  // lowercases a capital the answer starts a sentence with).
  const REFLECTION_FIELDS = {
    right: { fieldId: 'shootWentRight', label: 'What went right' },
    better: { fieldId: 'shootCouldBeBetter', label: "What could've gone better" },
    lessons: { fieldId: 'shootLessonsLearned', label: 'Lessons for next time' },
  };

  // One flow per kind of shoot, like CONCEPT_FLOWS ('' = no category yet):
  // what went right, what could've gone better, lessons — three each.
  const REFLECTION_FLOWS = window.EyeWords.reflectionFlows;

  // { flow, questions (the flow's, plus any wild card ones), index,
  //   answers: [text per question], voiceTip }
  ed.reflectHelper = null;

  // The first time the helper opens on this device, question 1 also says
  // talking works (the keyboard's mic). A page can't start dictation itself,
  // and the browser's own speech-to-text stops hearing after one go in a
  // Home Screen app on iOS 27, so this is a tip rather than a button.
  // Spoken answers run long, so each answer holds 1000 characters, and the
  // three reflection boxes hold 4000 so three of them still fit once they're
  // written as sentences.
  const REFLECT_VOICE_TIP_KEY = 'dailies_seen_reflect_voice_tip_v1';

  function reflectFlowFor(category) {
    return REFLECTION_FLOWS.find(f => f.categories.includes(category))
      || REFLECTION_FLOWS.find(f => f.categories.includes(''))
      || REFLECTION_FLOWS[0];
  }

  function storeReflectAnswer() {
    ed.reflectHelper.answers[ed.reflectHelper.index] = document.getElementById('reflectHelperInput').value.trim();
  }

  // A Wild card tapped "Tried it" on in Shoot mode gets a question of its
  // own, among the "What went right" ones — the three most recent, at most.
  // One whose words are already in that box (the helper run before) isn't
  // asked again. A bare "yes" still says something (sayYes); a "no" is
  // left out like any other.
  function wildCardReflectQuestions() {
    const shoot = ed.state.shoots.find(s => s.id === ed.currentShootId);
    const cards = shoot && Array.isArray(shoot.triedWildCards) ? shoot.triedWildCards : [];
    const wentRight = document.getElementById('shootWentRight').value;
    // Only a closing full stop comes off for the sentence: a card that ends
    // on a question keeps its question mark.
    return cards.map(card => ({ card, plain: card.trim().replace(/[.…]+$/, '') }))
      .filter(({ plain }) => plain && !wentRight.includes(plain))
      .slice(-3)
      .map(({ card, plain }) => ({
        field: 'right',
        text: `You tried “${card.trim()}” Did it give you anything?`,
        placeholder: 'e.g. the shot of her hands on the rail',
        say: `From the wild card “${plain}”: {a}.`,
        sayYes: `The wild card “${plain}” paid off.`,
        lower: true,
      }));
  }

  function renderReflectHelper() {
    const h = ed.reflectHelper;
    const questions = h.questions;
    const q = questions[h.index];
    const isLast = h.index === questions.length - 1;
    document.getElementById('reflectHelperStep').textContent = `Question ${h.index + 1} of ${questions.length}`;
    document.getElementById('reflectHelperTitle').textContent = REFLECTION_FIELDS[q.field].label;
    document.getElementById('reflectHelperText').textContent = q.text;
    // Said once, up front: nothing here has to be answered.
    const hint = document.getElementById('reflectHelperHint');
    hint.textContent = h.index === 0 ? "Answer what you can. Anything you skip is just left out." : '';
    if (h.index === 0 && h.voiceTip) {
      const tip = document.createElement('span');
      tip.className = 'field-hint-bold';
      tip.textContent = 'Tip:';
      hint.append(document.createElement('br'), tip, ' tap the mic on your keyboard and just talk.');
    }
    hint.hidden = !hint.textContent;
    const input = document.getElementById('reflectHelperInput');
    input.placeholder = q.placeholder || '';
    input.value = h.answers[h.index] || '';
    document.getElementById('reflectHelperBackBtn').hidden = h.index === 0;
    document.getElementById('reflectHelperNextBtn').textContent = isLast ? 'Finish' : 'Next';
  }

  function goReflectHelper(step) {
    const h = ed.reflectHelper;
    if (!h) return;
    storeReflectAnswer();
    const next = h.index + step;
    if (next >= h.questions.length) { finishReflectHelper(); return; }
    h.index = Math.max(0, next);
    renderReflectHelper();
  }

  // "Nothing really", "Nope, all good", "It didn't" — an answer that says
  // there's nothing to say.
  const REFLECTION_NOTHING = /^(no|nope|nah|none|nothing|nowhere|never|not really|not much|n\/?a|all good|it didn['’]?t|didn['’]?t)([\s,;:!.—–-]+(really|at all|all good|it didn['’]?t|nothing|it was fine|all fine|went fine))*$/i;

  // One answer as a sentence: trimmed of its closing punctuation, a leading
  // "yes" dropped, "no"-type answers left out, then put into its question's
  // `say`. For "Finish this: next time, I'll…", a retyped "next time" /
  // "I'll" isn't doubled, and an answer with its own "I…" ("I need to…")
  // uses `sayOwn` instead.
  function reflectSentence(q, answer) {
    if (q.sayYes && /^(yes|yeah|yep|yup|definitely|it did)[\s!.]*$/i.test((answer || '').trim())) return q.sayYes;
    let text = (answer || '').trim().replace(/[.!?…]+$/, '')
      .replace(/^(yes|yeah|yep|yup|definitely)\b[\s,;:!.—–-]*/i, '');
    if (!text || ed.CONCEPT_HELPER_NONE.test(text) || REFLECTION_NOTHING.test(text)) return '';
    let say = q.say;
    if (q.sayOwn) {
      text = text.replace(/^(\.{2,}|…)\s*/, '').replace(/^next time[,:]?\s*/i, '');
      const withoutLeadIn = text.replace(/^(i['’]ll|i will)\s+/i, '');
      if (withoutLeadIn !== text && withoutLeadIn) text = withoutLeadIn;
      else if (/^I(\s|['’])/.test(text)) say = q.sayOwn;
      if (!text) return '';
    }
    if (q.lower && say === q.say && /^[A-Z][a-z]/.test(text)) text = text.charAt(0).toLowerCase() + text.slice(1);
    // A function, so a "$" in the answer is never read as a pattern.
    const sentence = say.replace('{a}', () => text);
    return sentence.charAt(0).toUpperCase() + sentence.slice(1);
  }

  // Writes each field from its own answers — a field with none is left as
  // it is. Replacing text that's already there asks first (askHelperReplace).
  async function finishReflectHelper() {
    const h = ed.reflectHelper;
    // Once at a time: asking again would answer the first popup "Keep mine"
    // (see askConfirm) and fill twice.
    if (!h || h.asking) return;
    storeReflectAnswer();
    const fills = Object.keys(REFLECTION_FIELDS).map(key => {
      const field = document.getElementById(REFLECTION_FIELDS[key].fieldId);
      const text = h.questions
        .map((q, i) => (q.field === key ? reflectSentence(q, h.answers[i]) : ''))
        .filter(Boolean).join(' ')
        .slice(0, field.maxLength > 0 ? field.maxLength : 1000);
      return { key, field, text };
    }).filter(fill => fill.text);
    const replacing = fills.filter(fill => ed.hasText(fill.field.value) && fill.field.value.trim() !== fill.text);
    // Keep mine keeps what's there, but still fills the fields that were
    // empty — and closes either way, so Close is never a dead end.
    let keepExisting = false;
    if (replacing.length) {
      h.asking = true;
      keepExisting = !(await ed.askHelperReplace(replacing.map(fill => REFLECTION_FIELDS[fill.key].label), fills.length > replacing.length));
      h.asking = false;
      // Closed some other way while it asked: leave the page as it is.
      if (ed.reflectHelper !== h) return;
    }
    fills.filter(fill => !(keepExisting && replacing.includes(fill))).forEach(({ field, text }) => {
      field.value = text;
      field.dispatchEvent(new Event('input', { bubbles: true }));
      ed.syncFieldFilledState(field);
    });
    closeReflectHelper();
  }

  function openReflectHelper() {
    let voiceTip;
    try {
      voiceTip = localStorage.getItem(REFLECT_VOICE_TIP_KEY) !== '1';
      if (voiceTip) localStorage.setItem(REFLECT_VOICE_TIP_KEY, '1');
    } catch (err) { voiceTip = false; /* storage unavailable — nothing to remember it in, so not shown every time */ }
    const flow = reflectFlowFor(document.getElementById('shootCategory').value || '');
    // Wild card questions go after the flow's own "What went right" ones.
    const questions = [...flow.questions];
    const firstBetter = questions.findIndex(q => q.field !== 'right');
    questions.splice(firstBetter === -1 ? questions.length : firstBetter, 0, ...wildCardReflectQuestions());
    ed.reflectHelper = { flow, questions, index: 0, answers: [], voiceTip };
    renderReflectHelper();
    document.getElementById('reflectHelperOverlay').hidden = false;
  }

  function closeReflectHelper() {
    document.getElementById('reflectHelperOverlay').hidden = true;
    ed.queueShootBreak(250); // it may have just filled in a field
    // Whatever was waiting for the helper to close (the reflection prompt's
    // "Walk me through it" holds the deadline prompt back until now).
    const onClose = ed.reflectHelper && ed.reflectHelper.onClose;
    ed.reflectHelper = null;
    if (onClose) onClose();
  }

  document.getElementById('reflectHelperBtn').addEventListener('click', openReflectHelper);
  document.getElementById('reflectHelperBackBtn').addEventListener('click', () => goReflectHelper(-1));
  document.getElementById('reflectHelperNextBtn').addEventListener('click', () => goReflectHelper(1));
  // Close keeps what's been answered so far: same as Finish.
  document.getElementById('reflectHelperCloseBtn').addEventListener('click', finishReflectHelper);

  // Enter moves on (Shift+Enter still makes a new line; see the concept
  // helper's input for keyCode 229).
  document.getElementById('reflectHelperInput').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.shiftKey || e.isComposing || e.keyCode === 229) return;
    e.preventDefault();
    goReflectHelper(1);
  });

  document.getElementById('shootWizardDontShowBtn').addEventListener('click', () => {
    ed.setNewShootGuideOn(false);
    ed.endShootWizard();
    document.getElementById('shootWizardOffOverlay').hidden = false;
  });

  document.getElementById('shootWizardOffOkBtn').addEventListener('click', () => {
    document.getElementById('shootWizardOffOverlay').hidden = true;
  });

  // See queueShootWizard. animationend bubbles up from animated things inside
  // the modal too, so only the modal's own slide-in counts.
  ed.shootModalOverlay.querySelector('.modal').addEventListener('animationend', (e) => {
    if (e.target === e.currentTarget && ed.shootWizardPendingId) ed.startQueuedShootWizard();
  });
};
