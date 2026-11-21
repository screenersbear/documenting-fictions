// The new shoot guide's six chapters, from a shoot's parts
// (components/shoot-stage.js): which of the guide's steps (wizard-steps.js)
// each one asks, and the chapter marks along its top. The shot list is on
// the Visuals page, under the mood board (Starky, 20 Nov), and Directions
// for the day went to Direction, so the guide has no Shot list chapter of
// its own; opened for the shot list, it opens Visuals.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addNewShootGuideChapters = function addNewShootGuideChapters(ed) {
  Object.assign(ed, { guideChapter, guideChapterParts, drawGuideMarks, guideCountWords, addGuidePartHead, clearGuidePartHeads, guidePartIsChapter });

  // title comes from the shoot's parts; question is the line under it.
  const GUIDE_CHAPTERS = [
    { key: 'basics', parts: ['basics', 'talent'], question: "What's the shoot, when is it, and who's in it?" },
    { key: 'logistics', parts: ['when', 'location'], question: 'When it starts, and where it happens.' },
    { key: 'team', parts: ['team'], question: "Who's working with you on this one?" },
    { key: 'direction', parts: ['goals', 'idea', 'story', 'directions'], question: "What it's for, the idea behind it, and what you'll ask on the day." },
    { key: 'visuals', parts: ['moodboard', 'shotList', 'references', 'lighting'], question: 'How it should look, and every shot you want.' },
    { key: 'deadline', parts: ['deadline'], question: "When everything's due, if there's a date to hit." },
  ].map(ch => ({ ...ch, title: ed.SETUP_CHAPTERS.find(c => c.key === ch.key).label }));
  ed.GUIDE_CHAPTERS = GUIDE_CHAPTERS;

  // A chapter by its key, or the chapter that asks that part (the shoot
  // page's Shot list opens Visuals).
  function guideChapter(key) {
    return GUIDE_CHAPTERS.find(ch => ch.key === key) || GUIDE_CHAPTERS.find(ch => ch.parts.includes(key)) || null;
  }

  // The steps of a chapter that apply to this shoot (the story, say, only
  // to a narrative one).
  function guideChapterParts(chapter) {
    return chapter.parts.map(key => ed.SHOOT_WIZARD_STEPS.find(step => step.key === key))
      .filter(step => step && (!step.when || step.when()));
  }

  // Six marks on a hairline: done ones solid, this one larger with a mango
  // dot, the rest open rings. The line is ink up to this chapter. It never
  // starts empty (progress/NOTES.md, 15 Nov): making the shoot counts, so a
  // short inked line leads into the first mark.
  function drawGuideMarks(at, doneKeys) {
    document.getElementById('shootWizardMarks').innerHTML = '<span class="guide-line guide-lead inked"></span>' + GUIDE_CHAPTERS.map((ch, i) => {
      const cls = i === at ? 'now' : doneKeys.includes(ch.key) ? 'done' : '';
      const line = i ? `<span class="guide-line${i <= at ? ' inked' : ''}"></span>` : '';
      return `${line}<span class="guide-mark ${cls}"></span>`;
    }).join('');
  }

  // Over the chapter's title: "Chapter 1 of 6", then near the end what's
  // left, "2 to go" and "Last one" (progress/NOTES.md), counting only the
  // chapters that apply to this shoot. Opened for one chapter: just where
  // it is.
  function guideCountWords(key, only = false) {
    const applies = GUIDE_CHAPTERS.filter(ch => guideChapterParts(ch).length);
    const at = applies.findIndex(ch => ch.key === key);
    if (at < 0) return '';
    const left = applies.length - at;
    if (!only && applies.length > 1 && left === 1) return 'Last one';
    if (!only && left === 2) return '2 to go';
    return `Chapter ${at + 1} of ${applies.length}`;
  }

  // A step named the same as its chapter ("The basics" in Basics) doesn't
  // say it again.
  function guidePartIsChapter(step, chapter) {
    const title = typeof step.title === 'function' ? step.title() : step.title;
    return title.replace(/^the /i, '').toLowerCase() === chapter.title.toLowerCase();
  }

  // A chapter of several steps names each one above its fields.
  function addGuidePartHead(step, body) {
    const head = document.createElement('div');
    head.className = 'guide-part-head guide-chrome';
    const title = typeof step.title === 'function' ? step.title() : step.title;
    const hint = (typeof step.hint === 'function' ? step.hint() : step.hint) || '';
    head.innerHTML = `<h3 class="guide-part-title">${ed.escapeHtml(title)}</h3>${hint ? `<p class="guide-part-hint">${ed.escapeHtml(hint)}</p>` : ''}`;
    body.appendChild(head);
  }
  function clearGuidePartHeads(body) {
    body.querySelectorAll(':scope > .guide-part-head').forEach(el => el.remove());
  }
};
