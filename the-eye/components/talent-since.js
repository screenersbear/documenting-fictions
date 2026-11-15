// Under a talent on a shoot's front page (round 2, connect/09): LAST TIME
// WITH JUNE, 7 NOV (that shoot's Lessons for next time, The Eye's own), then
// under a hairline one line from Rounds with its mark, what happened with
// them since that shoot ("Since then: June said yes (14 Nov). You checked in
// (12 Nov)."), and EVERYTHING WITH JUNE, their page on the shelf. Rounds'
// line comes from the one list of people (shared/data/people-things.js),
// which Rounds tells: The Eye never reads Rounds.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addTalentSince = function addTalentSince(ed) {
  Object.assign(ed, { talentPast, sinceLine, talentSinceHtml, fillTalentSince });
  const D = () => window.DFData;
  const CHEVRON = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg>';
  const MOST = 2; // lines from Rounds
  const esc = v => ed.escapeHtml(v);
  const norm = n => String(n || '').trim().replace(/\s+/g, ' ').toLowerCase();
  const firstName = n => String(n).trim().split(/\s+/)[0]; // always a talent's name
  const handleOn = (t, platform) => ((t.socialHandles || []).find(h => h && h.platform === platform) || {}).handle || '';
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

  // Their other shoots: { count (this one's place among them: 4 for their
  // 4th shoot), last (the newest one shot), lessons (the newest one shot
  // with Lessons for next time) }.
  function talentPast(t, s) {
    const theirs = ed.state.shoots.filter(x => x.id !== s.id && (x.talents || []).some(o => norm(o.name) && norm(o.name) === norm(t.name)));
    const shot = theirs.filter(x => ed.isPostCaptureStatus(x.status) && x.date).sort((a, b) => b.date.localeCompare(a.date));
    return { count: theirs.length + 1, last: shot[0] || null, lessons: shot.find(x => ed.hasText(x.lessonsLearned)) || null };
  }

  // What Rounds says happened after that day, newest first, at most two: ''
  // for nothing (or no day to count from).
  function sinceLine(happened, after) {
    const shown = (Array.isArray(happened) ? happened : []).filter(h => after && h && h.day > after && ed.hasText(h.words)).slice(0, MOST);
    if (!shown.length) return '';
    return `Since then: ${shown.map((h, i) => `${i ? cap(h.words) : h.words} (${ed.dayWords(h.day)}).`).join(' ')}`;
  }

  // The part under a talent: LAST TIME, and a place Rounds' line and the
  // link go once the list is read (fillTalentSince). past: talentPast's.
  function talentSinceHtml(t, s, past = talentPast(t, s)) {
    const l = past.lessons;
    const last = l ? `<p class="front-last-head">Last time with ${esc(firstName(t.name))}, ${esc(ed.dayWords(l.date))}</p><p class="front-last-text">${esc(l.lessonsLearned.trim())}</p>` : '';
    const who = { name: t.name, instagram: handleOn(t, 'instagram'), tiktok: handleOn(t, 'tiktok'), after: past.last ? past.last.date : '' };
    // Encoded for the attribute: The Eye's escapeHtml leaves quotes as they are.
    return `<div class="front-last">${last}<div class="front-since" data-since="${encodeURIComponent(JSON.stringify(who))}"></div></div>`;
  }

  // Each talent's place filled in: Rounds' line, when the list knows them
  // and Rounds has something since; EVERYTHING WITH, in the suite.
  async function fillTalentSince(box) {
    if (!D() || !D().personFor) return;
    for (const slot of box.querySelectorAll('[data-since]')) {
      const who = JSON.parse(decodeURIComponent(slot.dataset.since));
      const r = await D().personFor(who).catch(() => null);
      if (!r || !slot.isConnected) continue;
      const v = await D().personView(r.id).catch(() => null);
      const line = v && v.rounds ? sinceLine(v.rounds.more.happened, who.after) : '';
      const url = D().personUrl(r.id);
      slot.innerHTML = (line ? `<p class="front-rounds">${window.DFConnect.miniHtml('rounds')}<span>${esc(line)}</span></p>` : '')
        + (url ? `<a class="front-everything" href="${esc(url)}">Everything with ${esc(firstName(r.name || who.name))} ${CHEVRON}</a>` : '');
    }
  }
};
