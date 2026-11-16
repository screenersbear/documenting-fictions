// DONE SO FAR on the person page (round 2, thanks/03), in Rounds' part
// under NEXT: each move done with them, newest first, as what and how
// ("Said thanks · by text") with its date and mark, the note under it, and
// ADD A NOTE on the right (a call, a text, in person, an email, or nothing,
// and the words). Tap a row to change its how and note, or delete a note
// on its own (with Undo). The shelf never writes Rounds' data: each change
// is an ask Rounds does when it next opens (shared/data/asks.js), and the
// page shows it as it will be meanwhile.
// (Loaded before app.js.)
window.ShelfParts = window.ShelfParts || {};
window.ShelfParts.addPersonDone = function addPersonDone(ed) {
  'use strict';
  Object.assign(ed, { doneHtml, wireDone });
  const D = () => window.DFData;
  const C = () => window.DFConnect;
  const { esc } = window.ShelfParts.thingRows;
  const PLUS = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  const CLOSE = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>';
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayShort = (iso) => (/^\d{4}-\d{2}-\d{2}/.test(iso || '') ? `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}` : '');

  // The rows as they'll be: Rounds' list with the asks it hasn't taken yet.
  async function rowsOf(rounds) {
    const asks = await D().roundsAsks(rounds.id).catch(() => []);
    return D().doneWithAsks(rounds.more.done || [], asks, rounds.more.hows);
  }
  const markHtml = (r) => (r.noteOnly
    ? `<span class="person-kind nb" style="background:${C().NOTEBOOKS.rounds.bg}">${C().markSvg('rounds', 16)}</span>`
    : `<span class="person-kind" style="background:${esc(r.bg || '#FFD100')}">${r.icon || ''}</span>`);
  const rowHtml = (r, i) => `<${r.id ? `button type="button" data-done-row="${i}"` : 'div'} class="done-row">
    <span class="done-day">${esc(dayShort(r.day))}</span>${markHtml(r)}
    <span class="done-words"><span class="done-what">${esc(r.what)}${r.howWords ? ` <span>· ${esc(r.howWords)}</span>` : ''}</span>${r.note ? `<span class="done-note">${esc(r.note)}</span>` : ''}</span></${r.id ? 'button' : 'div'}>`;

  // Rounds' part under NEXT: the heading, ADD A NOTE and the rows.
  async function doneHtml(page, rounds) {
    if (!rounds || !rounds.more.hows) return '';
    page.doneRows = await rowsOf(rounds);
    return `<div class="done-head"><span class="done-label">Done so far</span><button type="button" class="done-add" data-add-note>${PLUS}Add a note</button></div>
      <div class="done-list">${page.doneRows.map(rowHtml).join('')}</div>`;
  }

  // The sheet: what it was (or how), and the words. row: null for a new note.
  function openNoteSheet(rounds, row, after) {
    const noteOnly = !row || row.noteOnly;
    const choices = rounds.more.hows[noteOnly ? 'note' : 'move'] || [];
    let how = row ? row.how : '';
    const dim = document.createElement('div');
    dim.className = 'sheet-dim';
    dim.innerHTML = `<form class="sheet done-sheet" role="dialog" aria-modal="true" aria-label="${row ? esc(row.what) : 'Add a note'}">
      <div class="sheet-head"><h2>${row ? esc(row.what) : 'Add a note'}</h2><button type="button" class="ring-btn" data-close aria-label="Close"><span>${CLOSE}</span></button></div>
      <p class="opt-label">${noteOnly ? 'What it was' : 'How'}</p>
      <div class="done-chips">${choices.map(([k, label]) => `<button type="button" class="done-chip${k === how ? ' on' : ''}" data-how="${esc(k)}" aria-pressed="${k === how}">${esc(label)}</button>`).join('')}</div>
      <label class="opt-label" for="doneNoteText">${noteOnly ? 'The note' : 'A note (optional)'}</label>
      <textarea class="person-input done-text" id="doneNoteText" rows="3" maxlength="500">${esc(row ? row.note : '')}</textarea>
      <button type="submit" class="sheet-btn primary">Save</button>
      ${row && row.noteOnly ? '<button type="button" class="sheet-btn" data-delete>Delete the note</button>' : ''}
    </form>`;
    document.body.appendChild(dim);
    requestAnimationFrame(() => dim.classList.add('in'));
    const close = () => { dim.classList.remove('in'); setTimeout(() => dim.remove(), 220); };
    const form = dim.firstElementChild;
    const pendingId = row && row.pending ? row.id.slice(4) : '';
    dim.addEventListener('click', async (e) => {
      if (e.target === dim || e.target.closest('[data-close]')) { close(); return; }
      const chip = e.target.closest('[data-how]');
      if (chip) {
        how = how === chip.dataset.how ? '' : chip.dataset.how;
        form.querySelectorAll('[data-how]').forEach((c) => { c.classList.toggle('on', c.dataset.how === how); c.setAttribute('aria-pressed', c.dataset.how === how); });
      } else if (e.target.closest('[data-delete]')) {
        close();
        // Undo takes back the ask (or, for a note Rounds hasn't taken, puts it back).
        const had = pendingId ? await D().getLink(pendingId) : null;
        const ask = pendingId ? null : await D().askRounds('shelf', { do: 'drop', personId: rounds.id, lineId: row.id });
        if (pendingId) await D().dropLinks([pendingId]);
        await after();
        ed.toast('Note deleted', 'Undo', async () => { if (had) await D().saveLink(had); else await D().dropLinks([ask.id]); await after(); });
      }
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const note = form.querySelector('textarea').value.trim();
      if (!row && !note && !how) { form.querySelector('textarea').focus(); return; }
      if (pendingId) {
        const link = await D().getLink(pendingId);
        if (link) await D().saveLink({ ...link, ask: { ...link.ask, how, note } });
      } else if (row) await D().askRounds('shelf', { do: 'edit', personId: rounds.id, lineId: row.id, how, note });
      else await D().askRounds('shelf', { do: 'note', personId: rounds.id, day: D().todayStr(), how, note });
      close();
      await after();
    });
    return dim;
  }

  // ADD A NOTE and the rows, on a drawn page. after: draws it again.
  function wireDone(page, rounds, after) {
    page.querySelector('[data-add-note]')?.addEventListener('click', () => openNoteSheet(rounds, null, after));
    page.querySelectorAll('[data-done-row]').forEach((b) => b.addEventListener('click', () => openNoteSheet(rounds, page.doneRows[Number(b.dataset.doneRow)], after)));
  }
};
