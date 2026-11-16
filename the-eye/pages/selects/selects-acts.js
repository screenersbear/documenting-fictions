// Waiting on selects, answered (round 2, selects/NOTES.md, 16 Nov). From the
// Today card: GOT THEM moves the shoot, and its project's other days
// waiting, to Editing, as a status change does (asking for a deadline if it
// has none); STILL WAITING asks again in 3 days. A reminder sent (the sheet,
// remind-sheet.js) is logged on the shoot ("Reminded June, 16 Nov.") and
// asks again in 3 days too. In the suite it's also a moment with that person
// in Rounds (rounds/data/moments.js): Messaged on Instagram, or Texted, with
// what was said, counting as keeping in touch. The Eye asks Rounds through
// df-links (shared/data/asks.js) and never writes Rounds' data; without
// Rounds, it's on the shoot only.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addSelectsActs = function addSelectsActs(ed) {
  const D = () => window.DFData;

  // Saved, the lists redrawn, and the shoot's page if it's open on one.
  function saved() {
    ed.saveState();
    ed.renderAll();
    if (ed.drawShootFront) ed.drawShootFront();
  }

  // The other days first, quietly; the one asked about last, with what a
  // status change asks next.
  function gotSelects(id) {
    const group = ed.selectsGroup(ed.state.shoots, id);
    group.filter(s => s.id !== id).forEach(s => ed.applyStatusChange(s.id, 'editing', { followUps: false }));
    if (group.length) ed.applyStatusChange(id, 'editing');
  }

  function putOffSelects(id) {
    const after = ed.selectsAskAgain(ed.todayStr());
    ed.selectsGroup(ed.state.shoots, id).forEach((s) => { s.selectsAskAfter = after; });
    saved();
  }

  // Their person in Rounds, if they're there: its id, or ''.
  async function selectsRoundsId(person) {
    if (!person || !D() || !D().personFor || !D().personView) return '';
    const r = await D().personFor({ name: person.name, instagram: person.instagram }).catch(() => null);
    const v = r ? await D().personView(r.id).catch(() => null) : null;
    return (v && v.rounds && v.rounds.id) || '';
  }

  // A reminder sent: { person, how ('text' or 'instagram'), said }.
  async function logSelectsReminder(id, { person, how, said }) {
    const day = ed.todayStr();
    const after = ed.selectsAskAgain(day);
    const words = String(said || '').trim();
    const group = ed.selectsGroup(ed.state.shoots, id);
    if (!group.length) return;
    group.forEach((s) => {
      s.selectsReminders = [...(s.selectsReminders || []), { day, to: person.first, how, ...(words ? { said: words } : {}) }];
      s.selectsAskAfter = after;
    });
    saved();
    const roundsId = await selectsRoundsId(person);
    if (roundsId) {
      const shoot = group.find(s => s.id === id);
      await D().askRounds('the-eye', { do: 'moment', personId: roundsId, day, what: how, keeps: true, note: words || `Reminded ${person.first} about the selects from ${ed.selectsShootName(shoot)}.` }).catch(() => {});
    }
  }

  Object.assign(ed, { gotSelects, putOffSelects, selectsRoundsId, logSelectsReminder });
};
