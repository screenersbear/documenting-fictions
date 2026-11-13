// What a shoot still needs at its stage: the seven parts the guide asks
// about (the Getting ready card), the words for them, the next step button
// at the foot of its page, and when it's complete. A shoot and a few counts
// in, plain words out (no page, no saved data), so it's unit tested
// (tests/unit/the-eye/shoot-stage.test.mjs).
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootStage = function addShootStage(ed) {
  // The seven parts, in the guide's order. `page` is the part of the shoot
  // page that holds it; `inWords` and `leftWords` go in the card's sentence.
  const SETUP_CHAPTERS = [
    { key: 'basics', label: 'Basics', inWords: 'basics', leftWords: 'the basics', add: 'Add the basics', page: 'basicInfoHeading' },
    { key: 'logistics', label: 'Logistics', inWords: 'logistics', leftWords: 'logistics', add: 'Add the logistics', page: 'logisticsHeading' },
    { key: 'team', label: 'Team', inWords: 'team', leftWords: 'the team', add: 'Add the team', page: 'teamHeading' },
    { key: 'direction', label: 'Direction', inWords: 'direction', leftWords: 'direction', add: 'Add the direction', page: 'directionHeading' },
    { key: 'visuals', label: 'Visuals', inWords: 'visuals', leftWords: 'visuals', add: 'Add the visuals', page: 'visualsHeading' },
    { key: 'shotList', label: 'Shot list', inWords: 'shot list', leftWords: 'shot list', add: 'Add the shot list', page: 'shotListHeading' },
    { key: 'deadline', label: 'Deadline', inWords: 'deadline', leftWords: 'a deadline', add: 'Add a deadline', page: 'logisticsHeading' },
  ];
  // The honest answers the guide takes ("Date not set", "Location to be
  // decided", "Not sure yet" about the team), saved on the shoot in
  // `notSure`. Each counts as answered until the real thing is filled in.
  const NOT_SURE = ['date', 'location', 'team'];
  Object.assign(ed, { SETUP_CHAPTERS, NOT_SURE, setupChapters, setupWords, notSureWords, stillNotSure, listWords, hasReflection, nextStep, readyToComplete });

  const has = v => typeof v === 'string' && v.trim() !== '';
  const hasPlace = loc => !!loc && ['name', 'street', 'city'].some(k => has(loc[k]));
  const DIRECTION_FIELDS = ['shootGoals', 'premise', 'character', 'worldNotes', 'elevatorPitch', 'deliverables'];
  const notSure = (s, key) => Array.isArray(s.notSure) && s.notSure.includes(key);
  const hasTeam = s => s.teamRequired === 'no' || (s.teamMembers || []).length > 0;
  // Filled in for real, so "not sure" no longer applies.
  const ANSWERED = {
    date: s => has(s.date),
    location: s => hasPlace(s.location),
    team: s => hasTeam(s) || s.teamRequired === 'yes',
  };

  // Whether each part is in. `counts` holds what lives outside the shoot:
  // { moodboard: photos, boards: boards from Ref }.
  const DONE = {
    basics: s => has(s.title) || (Array.isArray(s.talents) && s.talents.some(t => has(t.name))),
    logistics: s => (has(s.date) || notSure(s, 'date')) && (hasPlace(s.location) || notSure(s, 'location')),
    team: s => hasTeam(s) || notSure(s, 'team'),
    direction: s => DIRECTION_FIELDS.some(k => has(s[k])),
    visuals: (s, counts) => counts.moodboard > 0 || counts.boards > 0
      || (s.references || []).length > 0 || (s.lightingSetups || []).length > 0,
    shotList: s => Array.isArray(s.shotList) && s.shotList.some(item => has(item.text)),
    deadline: s => has(s.deadline),
  };

  function setupChapters(shoot, counts) {
    return SETUP_CHAPTERS.map(c => ({ ...c, done: DONE[c.key](shoot, counts || {}) }));
  }

  // "a, b and c".
  function listWords(words) {
    if (words.length < 2) return words[0] || '';
    return `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}`;
  }
  const capital = s => s.charAt(0).toUpperCase() + s.slice(1);

  // "Basics, logistics and team are in. Still to add: direction, visuals,
  // shot list and a deadline."
  function setupWords(chapters) {
    const done = chapters.filter(c => c.done).map(c => c.inWords);
    const left = chapters.filter(c => !c.done).map(c => c.leftWords);
    const parts = [];
    if (done.length) parts.push(`${capital(listWords(done))} ${done.length === 1 && done[0] !== 'basics' && done[0] !== 'logistics' ? 'is' : 'are'} in.`);
    if (left.length) parts.push(`Still to add: ${listWords(left)}.`);
    return parts.join(' ');
  }

  // The honest answers that still stand: once the real thing is in, it goes.
  function stillNotSure(shoot) {
    return NOT_SURE.filter(key => notSure(shoot, key) && !ANSWERED[key](shoot));
  }

  // "Not sure yet: the date and the team." (what's still unsure, for the
  // Getting ready card, where it stays until it's filled in).
  function notSureWords(shoot) {
    const left = stillNotSure(shoot);
    return left.length ? `Not sure yet: ${listWords(left.map(key => `the ${key}`))}.` : '';
  }

  function hasReflection(shoot) {
    return ['whatWentRight', 'couldBeBetter', 'lessonsLearned'].some(k => has(shoot[k]));
  }

  // The one thing a shoot needs next, for the button at the foot of its
  // page: { key, label, hint, to, chapter }, or null when there's nothing.
  // `counts` adds { finalImages, video } to setupChapters' counts.
  //   chapter      the first part still to add (its key in `chapter`)
  //   status       move it on to `to`
  //   shootMode, reflect, finalImages, complete, unarchive, date
  function nextStep(shoot, counts) {
    const c = counts || {};
    if (shoot.archived) return { key: 'unarchive', label: 'Unarchive', hint: '' };
    const reflected = hasReflection(shoot);
    const needsImages = !c.video && !(c.finalImages > 0);
    switch (shoot.status) {
      case 'prospect':
      case 'planning': {
        const left = setupChapters(shoot, c).filter(ch => !ch.done);
        if (!left.length) return { key: 'status', to: 'waiting_to_shoot', label: 'Mark shoot ready', hint: '' };
        return { key: 'chapter', chapter: left[0].key, label: left[0].add, hint: left.length === 1 ? 'Next step, then the shoot is ready' : '' };
      }
      case 'waiting_to_shoot':
        return { key: 'shootMode', label: 'Shoot mode', hint: '' };
      case 'captured':
        if (!reflected) return { key: 'reflect', label: 'Reflect now', hint: '' };
        return c.video
          ? { key: 'status', to: 'rough_cut', label: 'Start the rough cut', hint: '' }
          : { key: 'status', to: 'waiting_for_selects', label: 'Mark proofs sent', hint: '' };
      case 'delivered':
        if (!reflected) return { key: 'reflect', label: 'Reflect now', hint: needsImages ? '' : 'Then the shoot is complete' };
        if (needsImages) return { key: 'finalImages', label: 'Add final images', hint: 'Then the shoot is complete' };
        return { key: 'complete', label: 'Complete', hint: '' };
      case 'rescheduled':
        return { key: 'date', label: 'Set a new date', hint: '' };
      case 'canceled':
        return null;
      default: // in the edit: waiting for selects, editing, and video's steps
        if (needsImages) return { key: 'finalImages', label: 'Add final images', hint: '' };
        return { key: 'status', to: 'delivered', label: 'Mark delivered', hint: '' };
    }
  }

  // Complete on its own: delivered, with its final images (video has none)
  // and its reflection, and not in the archive already.
  function readyToComplete(shoot, counts) {
    const c = counts || {};
    return shoot.status === 'delivered' && !shoot.archived && hasReflection(shoot) && (!!c.video || c.finalImages > 0);
  }
};
