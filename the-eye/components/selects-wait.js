// Waiting on selects (round 2, selects/NOTES.md, 16 Nov): a photo shoot at
// Waiting for selects never drops out of sight. The days count from when it
// was marked Proofs sent (proofsSentAt, kept by applyStatusTimestamps; a
// shoot already waiting when this came in counts from that day: stampWaiting).
// After 3 days the Today card asks about it; STILL WAITING or a reminder sent
// puts the question off 3 more days (selectsAskAfter). Who's asked: the
// talent who booked you, or else the first talent. Shoots in, plain words and
// dates out (no page, no saved data), so it's unit tested
// (tests/unit/the-eye/selects-wait.test.mjs).
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addSelectsWait = function addSelectsWait(ed) {
  const WAIT = 3;
  // The reminder as it starts (Options, Selects reminder, changes it).
  const SELECTS_STARTER = "Hi [name]! Just checking you got the proofs from [shoot]. No rush, send your picks whenever you're ready.";
  const pad = n => String(n).padStart(2, '0');
  const firstName = n => String(n || '').trim().split(/\s+/)[0] || '';
  const handleOn = (list, platform) => ((list || []).find(h => h && h.platform === platform && String(h.handle || '').trim()) || {}).handle || '';
  // The day, here, that a saved moment fell on.
  const localDay = (iso) => {
    const d = new Date(iso || '');
    return Number.isNaN(d.getTime()) ? '' : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  };
  const daysBetween = (from, to) => Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86400000);
  const addDays = (day, n) => new Date(Date.parse(`${day}T12:00:00Z`) + n * 86400000).toISOString().slice(0, 10);

  const isWaitingOnSelects = s => !!s && !s.archived && s.status === 'waiting_for_selects';

  // Shoots waiting with no date yet (from before this came in) count from
  // now. Says whether any changed, so the app saves them.
  function stampWaiting(shoots, nowIso) {
    let changed = false;
    (shoots || []).forEach((s) => {
      if (s && s.status === 'waiting_for_selects' && !s.proofsSentAt) { s.proofsSentAt = nowIso; changed = true; }
    });
    return changed;
  }

  // Who the selects are coming from: { name, first, instagram } or null.
  function selectsPerson(s) {
    const talent = ((s && s.talents) || []).filter(t => t && String(t.name || '').trim());
    const t = talent.find(x => x.bookedMe === true) || talent[0];
    return t ? { name: t.name.trim(), first: firstName(t.name), instagram: handleOn(t.socialHandles, 'instagram').replace(/^@+/, '') } : null;
  }

  // Whole days since the proofs went out (0 the same day).
  function selectsDays(s, today) {
    const from = localDay(s && s.proofsSentAt);
    return from ? Math.max(0, daysBetween(from, today)) : 0;
  }

  // For the Today card: waiting 3 days or more, and not put off past today.
  function selectsDue(s, today) {
    return isWaitingOnSelects(s) && !!s.proofsSentAt && selectsDays(s, today) >= WAIT && !(s.selectsAskAfter > today);
  }
  const selectsAskAgain = today => addDays(today, WAIT);

  // "Proofs sent to June 4 days ago." (today; 1 day; no name: "Proofs sent 2 days ago.")
  function proofsSentWords(person, days) {
    const when = days < 1 ? 'today' : `${days} ${days === 1 ? 'day' : 'days'} ago`;
    return `Proofs sent${person ? ` to ${person.first}` : ''} ${when}.`;
  }

  // The latest reminder, on the shoot: "Reminded June, 16 Nov." ('' for none).
  function remindedWords(s) {
    const list = (s && s.selectsReminders) || [];
    const last = list[list.length - 1];
    return last && last.day ? `Reminded ${last.to || 'them'}, ${ed.dayWords(last.day)}.` : '';
  }

  // The starter, filled in: [name] their first name, [shoot] the shoot.
  function selectsMessage(template, person, shootName) {
    const t = String(template || '').trim() || SELECTS_STARTER;
    return t.replace(/\[name\]/g, person ? person.first : 'there').replace(/\[shoot\]/g, shootName || 'the shoot');
  }

  // The shoot as the reminder and the Today card name it: its title (or its
  // project's name), else its day ("the 12 Nov shoot"). Not the talent's
  // name, which the line says already.
  function selectsShootName(s, projectName) {
    const title = String((s && s.title) || '').trim() || String(projectName || '').trim();
    if (title) return title;
    return s && s.date ? `the ${ed.dayWords(s.date)} shoot` : 'the shoot';
  }

  // The shoot and, in a project, its other days waiting too: they're asked
  // about once, and answered together.
  function selectsGroup(shoots, id) {
    const list = (shoots || []).filter(Boolean);
    const s = list.find(x => x.id === id);
    if (!s) return [];
    return list.filter(x => x === s || (!!s.projectId && x.projectId === s.projectId && isWaitingOnSelects(x)));
  }

  // How it went out: Instagram when the sheet opened it, else a text.
  // Rounds keeps it as a moment that way.
  const selectsHow = wentToInstagram => (wentToInstagram ? 'instagram' : 'text');

  // Last, once everything above exists.
  Object.assign(ed, {
    SELECTS_STARTER, isWaitingOnSelects, stampWaiting, selectsPerson, selectsDays, selectsDue, selectsAskAgain,
    proofsSentWords, remindedWords, selectsMessage, selectsShootName, selectsGroup, selectsHow,
  });
};
