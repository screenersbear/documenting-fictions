// Remind <name> about the selects (round 2, selects/03-remind), from the
// Today card or the shoot's status card: the same sheet as a Rounds move.
// WHAT DID YOU SAY? starts empty, with the selects reminder offered under it
// (Options, Selects reminder; [name] and [shoot] filled in), which goes into
// the box to edit. COPY AND OPEN INSTAGRAM copies what's in the box (the
// reminder, if it's empty) and opens their Instagram; back from there it
// asks Done? With no handle it's COPY THE MESSAGE, to send as a text. Done
// logs it (selects-acts.js): on the shoot, and in the suite as a moment with
// them in Rounds; then the Today card asks again in 3 days if still waiting.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addRemindSheet = function addRemindSheet(ed) {
  const overlay = document.getElementById('remindSelectsOverlay');
  const title = document.getElementById('remindSelectsTitle');
  const box = document.getElementById('remindSelectsText');
  const offer = document.getElementById('remindSelectsOffer');
  const note = document.getElementById('remindSelectsNote');
  const actions = document.getElementById('remindSelectsActions');
  const AGAIN = 'Asks again in 3 days if nothing comes.';
  let now = null; // the reminder open: { id, person, message, went, away }

  function openRemindSelects(id) {
    const s = ed.state.shoots.find(x => x.id === id);
    const person = s ? ed.selectsPerson(s) : null;
    if (!person) return;
    const project = s.projectId ? ed.findProject(s.projectId) : null;
    const message = ed.selectsMessage(ed.state.selectsReminder, person, ed.selectsShootName(s, project ? project.name : ''));
    now = { id, person, message, went: false, away: false };
    title.textContent = `Remind ${person.first}`;
    box.value = '';
    offer.hidden = false;
    document.getElementById('remindSelectsOfferText').textContent = message;
    note.textContent = AGAIN;
    buttons();
    overlay.hidden = false;
    // In Rounds too? Then it says so.
    const asked = now;
    ed.selectsRoundsId(person).then((roundsId) => {
      if (roundsId && now === asked) note.textContent = `Counts as a moment with ${person.first} in Rounds. ${AGAIN}`;
    });
  }

  function close() {
    overlay.hidden = true;
    now = null;
  }

  // The reminder into the box, to edit (the offer goes once it's used).
  function useMessage() {
    if (offer.hidden) return;
    box.value = now.message;
    offer.hidden = true;
  }

  function buttons() {
    const where = now.person.instagram ? 'Copy and open Instagram' : 'Copy the message';
    // COPY AND OPEN goes out to Instagram: the button clicker leaves it alone.
    actions.innerHTML = `<button type="button" class="remind-go" data-go${now.person.instagram ? ' data-test-skip' : ''}>${where}</button>
      <button type="button" class="remind-done" data-done>Done</button>`;
  }

  // Back from Instagram: was it sent?
  function back() {
    if (document.hidden || !now || !now.away) return;
    now.away = false;
    actions.innerHTML = `<p class="remind-ask">Done?</p>
      <div class="remind-ask-btns"><button type="button" class="remind-not-yet" data-not-yet>Not yet</button><button type="button" class="remind-yes" data-done>Done</button></div>`;
  }
  document.addEventListener('visibilitychange', back);

  async function copy(text) {
    try { await navigator.clipboard.writeText(text); return true; } catch (e) { return false; }
  }

  actions.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b || !now) return;
    if (b.matches('[data-not-yet]')) buttons();
    else if (b.matches('[data-done]')) {
      const { id, person, went } = now;
      const said = box.value;
      close();
      await ed.logSelectsReminder(id, { person, how: ed.selectsHow(went), said });
    } else if (b.matches('[data-go]')) {
      if (!box.value.trim()) useMessage(); // nothing typed: the reminder goes
      const copied = await copy(box.value);
      if (!now.person.instagram) { ed.showToast(copied ? 'Copied.' : 'Select the message and copy it.'); return; }
      now.away = true;
      now.went = true;
      window.open(`https://www.instagram.com/${encodeURIComponent(now.person.instagram)}/`, '_blank', 'noopener');
      if (!copied) ed.showToast('Select the message and copy it.');
    }
  });
  offer.addEventListener('click', () => { useMessage(); box.focus(); });
  document.getElementById('remindSelectsCloseBtn').addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

  Object.assign(ed, { openRemindSelects });
};
