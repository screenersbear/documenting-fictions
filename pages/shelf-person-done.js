// What's been done with someone, on the person page (round 2, thanks/06,
// 16 Nov), in Rounds' part under NEXT: only the latest two (the whole list,
// SO FAR, is on their page in Rounds), each with its date and mark (a
// move's own; Rounds' for moments and notes, The Eye's for shoots), what
// and how ("Said thanks · by text") and the note under it. Then ALL IN
// ROUNDS, which opens their page there, and ADD A MOMENT, which opens
// Rounds' own sheet for it. A move tapped opens Rounds at What you said for
// it (Tightening Rounds, rounds/09). The shelf never writes Rounds' data; asks
// Rounds hasn't taken yet (shared/data/asks.js) show as they will be.
// (Loaded before app.js.)
window.ShelfParts = window.ShelfParts || {};
window.ShelfParts.addPersonDone = function addPersonDone(ed) {
  'use strict';
  Object.assign(ed, { doneHtml, wireDone });
  const D = () => window.DFData;
  const C = () => window.DFConnect;
  const { esc, CHEV, openThing } = window.ShelfParts.thingRows;
  const LATEST = 2;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayShort = (iso) => (/^\d{4}-\d{2}-\d{2}/.test(iso || '') ? `${Number(iso.slice(8, 10))} ${MONTHS[Number(iso.slice(5, 7)) - 1]}` : '');

  // The rows as they'll be: Rounds' list with the asks it hasn't taken yet.
  async function rowsOf(rounds) {
    const asks = await D().roundsAsks(rounds.id).catch(() => []);
    return D().doneWithAsks(rounds.more.done || [], asks, rounds.more.hows);
  }
  // A notebook's mark (mark: 'rounds', 'the-eye'; a note from before 16 Nov
  // has noteOnly), or the move's own.
  const markHtml = (r) => {
    const nb = r.mark || (r.noteOnly ? 'rounds' : '');
    return nb
      ? `<span class="person-kind nb" style="background:${C().NOTEBOOKS[nb].bg}">${C().markSvg(nb, 16)}</span>`
      : `<span class="person-kind" style="background:${esc(r.bg || '#FFD100')}">${r.icon || ''}</span>`;
  };
  const opens = (r) => r.kind === 'move' && !!r.id;
  const rowHtml = (r) => {
    const tag = opens(r) ? `button type="button" data-said="${esc(r.id)}"` : 'div';
    return `<${tag} class="done-row">
    <span class="done-day">${esc(dayShort(r.day))}</span>${markHtml(r)}
    <span class="done-words"><span class="done-what">${esc(r.what)}${r.howWords ? ` <span>· ${esc(r.howWords)}</span>` : ''}</span>${r.note ? `<span class="done-note">${esc(r.note)}</span>` : ''}</span></${tag.split(' ')[0]}>`;
  };

  // Rounds' part under NEXT: the latest, ALL IN ROUNDS and ADD A MOMENT.
  async function doneHtml(page, rounds) {
    if (!rounds) return '';
    const rows = (await rowsOf(rounds)).slice(0, LATEST);
    return `${rows.length ? `<div class="done-list">${rows.map(rowHtml).join('')}</div>` : ''}
      <div class="done-links"><button type="button" class="done-all" data-all-rounds>All in Rounds ${CHEV}</button>
      <button type="button" class="done-add" data-add-moment>Add a moment</button></div>`;
  }

  // ALL IN ROUNDS and ADD A MOMENT, on a drawn page: Rounds opens at them.
  function wireDone(page, rounds) {
    page.querySelector('[data-all-rounds]')?.addEventListener('click', () => openThing(ed, rounds));
    page.querySelector('[data-add-moment]')?.addEventListener('click', () => openThing(ed, { ...rounds, params: { ...rounds.params, moment: 1 } }));
    page.querySelectorAll('[data-said]').forEach((b) => b.addEventListener('click', () => openThing(ed, { ...rounds, params: { ...rounds.params, said: b.dataset.said } })));
  }
};
