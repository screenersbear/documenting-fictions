// "Need to think it through?": the flow for this shoot, and its answers.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addConceptHelperHelper = function addConceptHelperHelper(ed) {
  Object.assign(ed, { conceptHelperCategory, conceptHelperCategoryLabel, conceptFlowFor, conceptHelperNode, conceptHelperDeeperStart, conceptHelperShownOutputs, fillConceptHelperOutputs, updateConceptHelperCount });
  // Lands on the shoot page with everything so far, then says where the
  // switch lives so the guide isn't gone for good by accident.
  // ---------- Concept helper ("Need to think it through?") ----------
  // From The idea slide and the Direction section: a short decision tree of
  // yes/no and short-answer questions, picked by the shoot's category
  // (CONCEPT_FLOWS), whose answers are dropped mad-lib style into a concept
  // and an elevator pitch at the end — plus Character/Personality and
  // World-building notes on shoots that have those boxes, if the user opts
  // into a few more questions. Each is editable, then either used to fill
  // the page's fields or left for the user to write their own.
  //
  // Flow format: { id, label, categories (keys; '' = no category yet),
  // start, nodes: [{ id, type: 'yesno'|'short', text, hint?, placeholder?,
  // key, yes/no (yesno: next id or 'END'), yesValue/noValue? (stored instead
  // of true/false), yesLabel/noLabel? (the buttons' text when the question
  // is a choice between two things rather than a yes or no), next (short),
  // categoryText? ({category: text}), section? ('deeper') }],
  // deeper?: [{ when, start }],
  // summaries: [{ when: {key: value}, template, pitch?, character?, world? }] }
  // — the first summary whose `when` all match is used. Templates: {key}
  // inserts an answer, {category} the shoot type, and [[ ... ]] is dropped
  // whole if any {key} in it is blank. pitch/character/world are lists of
  // templates (see conceptHelperPick). `deeper` is where the main questions
  // hand over, when they run out, to the opt-in Character/World ones
  // (section 'deeper': a yes/no gate keyed `deeper`, then its questions) —
  // only on shoots whose page shows those two boxes.
  ed.conceptHelper = null; // { flow, nodeId, history: [nodeId], answers: {nodeId: value}, ended }

  // The end screen's boxes, each filling the page field of the same name.
  // Each box is checked against its field's own limit, so a compiled text
  // that won't fit is caught there (see updateConceptHelperCount) rather
  // than cut off by the field.
  const CONCEPT_HELPER_OUTPUTS = [
    { key: 'concept', boxId: 'conceptHelperSummary', countId: 'conceptHelperCount', fieldId: 'shootPremise', label: 'Concept', fallbackMax: 300 },
    { key: 'character', boxId: 'conceptHelperCharacter', countId: 'conceptHelperCharacterCount', fieldId: 'shootCharacter', label: 'Character/Personality', fallbackMax: 1000 },
    { key: 'world', boxId: 'conceptHelperWorld', countId: 'conceptHelperWorldCount', fieldId: 'shootWorldNotes', label: 'World-building notes', fallbackMax: 1000 },
    { key: 'pitch', boxId: 'conceptHelperPitch', countId: 'conceptHelperPitchCount', fieldId: 'shootElevatorPitch', label: 'Elevator pitch', fallbackMax: 150 },
  ]; ed.CONCEPT_HELPER_OUTPUTS = CONCEPT_HELPER_OUTPUTS;
  const conceptHelperMax = (out) => document.getElementById(out.fieldId).maxLength || out.fallbackMax; ed.conceptHelperMax = conceptHelperMax;

  // The questions behind "Need to think it through?" — one flow per kind of
  // shoot (see the format notes above openConceptHelper), each leaning on
  // what that kind of shoot actually is: story vs vibe for narrative work,
  // the people and their relationship for engagements/family/maternity, a
  // theme rather than a plot for events (you don't control what happens),
  // message/audience/personality for brand work, and so on. '' in a flow's
  // categories = the one used before a category's been picked.
  const CONCEPT_FLOWS = window.EyeWords.conceptFlows; ed.CONCEPT_FLOWS = CONCEPT_FLOWS;


  function conceptHelperCategory() {
    return document.getElementById('shootCategory').value || '';
  }

  function conceptHelperCategoryLabel() {
    const cat = conceptHelperCategory();
    if (!cat || !ed.CATEGORY_LABELS[cat]) return 'shoot';
    // "editorial shoot", but "test shoot" rather than "test shoot shoot".
    const label = ed.CATEGORY_LABELS[cat].toLowerCase();
    return /\bshoot$/.test(label) ? label : `${label} shoot`;
  }

  function conceptFlowFor(category) {
    return CONCEPT_FLOWS.find(f => f.categories.includes(category))
      || CONCEPT_FLOWS.find(f => f.categories.includes(''))
      || CONCEPT_FLOWS[0];
  }

  function conceptHelperNode(id) {
    return ed.conceptHelper.flow.nodes.find(n => n.id === id) || null;
  }

  // Answers along the path actually taken (history + current), by key — so
  // an answer from a branch the user backed out of never leaks into the
  // summary.
  function conceptHelperAnswers() {
    const out = {};
    [...ed.conceptHelper.history, ed.conceptHelper.nodeId].forEach(id => {
      const node = id && conceptHelperNode(id);
      if (node && Object.prototype.hasOwnProperty.call(ed.conceptHelper.answers, id)) out[node.key] = ed.conceptHelper.answers[id];
    });
    return out;
  }

  // A short answer that means "nothing" ("no" to "Any era, movie or
  // reference…?") — treated as left blank rather than written in.
  const CONCEPT_HELPER_NONE = /^(no|nope|nah|none|nothing|not really|not sure|idk|n\/?a|-+)$/i; ed.CONCEPT_HELPER_NONE = CONCEPT_HELPER_NONE;

  // What {key} stands for: the answer, trimmed of its closing punctuation —
  // '' when it's blank, a "nothing" answer or a plain yes/no.
  function conceptHelperValue(key, answers) {
    if (key === 'category') return conceptHelperCategoryLabel();
    const v = answers[key];
    if (typeof v !== 'string') return '';
    const text = v.trim().replace(/[.!?…]+$/, '');
    return CONCEPT_HELPER_NONE.test(text) ? '' : text;
  }

  // Where-answers that bring their own preposition ("on a rooftop", "at the
  // beach") take the place of the template's "in"/"at"/"on", rather than
  // reading "at at the beach".
  const CONCEPT_HELPER_PLACE_KEYS = /\b(in|at|on)\s+\{(world|place|setting)\}/gi;
  const CONCEPT_HELPER_HAS_PREPOSITION = /^(in|at|on|inside|outside|by|near|under|underneath|beneath|over|across|around|aboard|along|off|behind|beside|within|atop|up|down|through|from)\b/i;

  function conceptHelperFill(template, answers) {
    const value = (key) => conceptHelperValue(key, answers);
    let text = template.replace(CONCEPT_HELPER_PLACE_KEYS, (match, prep, key) => (
      CONCEPT_HELPER_HAS_PREPOSITION.test(value(key)) ? `{${key}}` : match));
    text = text.replace(/\[\[([\s\S]*?)\]\]/g, (_, inner) => {
      const keys = [...inner.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
      return keys.every(k => value(k)) ? inner : '';
    });
    text = text.replace(/\{(\w+)\}/g, (_, k) => value(k));
    text = text.replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').replace(/([,;:])\1+/g, '$1')
      .replace(/,\s*\./g, '.').replace(/…\./g, '.').replace(/\.{2,}/g, '.').trim();
    // A template whose opening segment was dropped (", caught …", ". When:
    // …") would otherwise start on that segment's leftover punctuation.
    text = text.replace(/^[\s,;:.]+/, '');
    if (!text) return '';
    text = text.charAt(0).toUpperCase() + text.slice(1);
    if (!/[.!?]$/.test(text)) text += '.';
    return text;
  }

  // The answers a template actually gets to use: the keys in the [[ ... ]]
  // segments that survive, plus any bare {key} that's filled.
  function conceptHelperFilledKeys(template, answers) {
    const keys = new Set();
    for (const [, inner] of template.matchAll(/\[\[([\s\S]*?)\]\]/g)) {
      const segKeys = [...inner.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
      if (segKeys.every(k => conceptHelperValue(k, answers))) segKeys.forEach(k => keys.add(k));
    }
    const bare = template.replace(/\[\[[\s\S]*?\]\]/g, '');
    for (const [, k] of bare.matchAll(/\{(\w+)\}/g)) {
      if (conceptHelperValue(k, answers)) keys.add(k);
    }
    keys.delete('category');
    return keys;
  }

  // A summary's pitch/character/world: a few templates, fullest first, the
  // shorter ones there for long answers. Picks the one that uses the most
  // answers and still fits `max` (the earliest on a tie) — or, if none fits,
  // the shortest, which its box's count then flags. One that uses no answer
  // at all ("Their wedding day.") says nothing, so it's never picked; nor,
  // given `requireKeys`, one that uses none of those.
  function conceptHelperPick(templates, answers, max, requireKeys) {
    const results = [].concat(templates || [])
      .map(t => {
        const keys = conceptHelperFilledKeys(t, answers);
        return { text: conceptHelperFill(t, answers), used: keys.size, keys };
      })
      .filter(r => r.text && r.used > 0 && (!requireKeys || [...r.keys].some(k => requireKeys.has(k))));
    const fits = results.filter(r => r.text.length <= max);
    if (fits.length) return fits.reduce((best, r) => (r.used > best.used ? r : best)).text;
    return results.length ? results.reduce((a, b) => (b.text.length < a.text.length ? b : a)).text : '';
  }

  // Character/Personality and World-building notes are only on the page for
  // narrative categories (see updateCategoryTierUI).
  function conceptHelperHasStoryFields() {
    return !document.getElementById('narrativeFieldsBlock').hidden;
  }

  // Where the opt-in Character/World questions start once the main ones run
  // out — null if they've already been reached, the page has no boxes for
  // them, or the flow has none for the path taken.
  function conceptHelperDeeperStart() {
    const h = ed.conceptHelper;
    if (!h.flow.deeper || !conceptHelperHasStoryFields()) return null;
    const inDeeper = [...h.history, h.nodeId].some(id => {
      const node = id && conceptHelperNode(id);
      return node && node.section === 'deeper';
    });
    if (inDeeper) return null;
    const answers = conceptHelperAnswers();
    const match = h.flow.deeper.find(d => Object.entries(d.when || {}).every(([key, val]) => answers[key] === val));
    return match && conceptHelperNode(match.start) ? match.start : null;
  }

  function conceptHelperOutputEl(out) {
    return document.getElementById(out.boxId).closest('.concept-helper-output');
  }

  function conceptHelperShownOutputs() {
    return CONCEPT_HELPER_OUTPUTS.filter(out => !conceptHelperOutputEl(out).hidden);
  }

  // Compiles every box for the path taken. Character/World only once the
  // user's said yes to their questions and actually answered one of them —
  // otherwise all they'd hold is the Concept again. Any box but Concept
  // stays off the end screen when there's nothing to put in it.
  function fillConceptHelperOutputs() {
    const h = ed.conceptHelper;
    const answers = conceptHelperAnswers();
    const summary = h.flow.summaries.find(sum => Object.entries(sum.when || {})
      .every(([key, val]) => answers[key] === val));
    const deeperKeys = new Set([...h.history, h.nodeId]
      .map(id => id && conceptHelperNode(id))
      .filter(node => node && node.section === 'deeper' && node.type === 'short' && conceptHelperValue(node.key, answers))
      .map(node => node.key));
    const withStory = answers.deeper === true && deeperKeys.size > 0 && conceptHelperHasStoryFields();
    CONCEPT_HELPER_OUTPUTS.forEach(out => {
      let text = '';
      if (summary && out.key === 'concept') text = conceptHelperFill(summary.template, answers);
      else if (summary && out.key === 'pitch') text = conceptHelperPick(summary.pitch, answers, conceptHelperMax(out));
      else if (summary && withStory) text = conceptHelperPick(summary[out.key], answers, conceptHelperMax(out), deeperKeys);
      document.getElementById(out.boxId).value = text;
      conceptHelperOutputEl(out).hidden = out.key !== 'concept' && !text;
      // On a shoot that already has its own text there, say so — and that
      // Use this asks before replacing it (Replace / Keep mine).
      const field = document.getElementById(out.fieldId);
      conceptHelperOutputEl(out).querySelector('.concept-helper-keep').hidden = !(text && ed.hasText(field.value) && field.value.trim() !== text);
    });
  }

  function updateConceptHelperCount() {
    let over = false;
    let any = false;
    conceptHelperShownOutputs().forEach(out => {
      const len = document.getElementById(out.boxId).value.trim().length;
      const max = conceptHelperMax(out);
      const count = document.getElementById(out.countId);
      const outOver = len > max;
      count.textContent = outOver ? `${len}/${max}: trim a little to fit the ${out.label} box` : `${len}/${max}`;
      count.classList.toggle('over', outOver);
      over = over || outOver;
      any = any || len > 0;
    });
    document.getElementById('conceptHelperUseBtn').disabled = over || !any;
  }
};
