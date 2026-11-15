// The person page (round 2, connect/08): one person and everything the four
// notebooks have with them, in the suite's own look (paper, no band), like
// HOW THEY CONNECT. Their photo, name, handle (opens their profile) and
// group, then a part per notebook under its mark, in loop order: NEXT
// (Rounds' next move), SHOOTS (The Eye), BOARDS (Ref) and the posts they're
// in (Layouts, a row of covers). Each row opens it in its notebook. When it
// isn't clear whether two people are one, SAME PERSON? asks (the answer is
// kept). ... changes their name and handles everywhere
// (pages/shelf-person-edit.js). Opened by a name in a notebook (?person=<id>,
// app.js) or a person found by search. The list itself: shared/data/people.js.
// (Loaded before app.js.)
window.ShelfParts = window.ShelfParts || {};
window.ShelfParts.addPerson = function addPerson(ed) {
  'use strict';
  Object.assign(ed, { openPerson });
  // The shared files load after the shelf's own (files.txt), so they're looked up when used.
  const D = () => window.DFData;
  const MORE = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>';
  // The rows it shares with search (components/thing-rows.js).
  const { BACK, CHEV, SOMEONE, esc, firstName, picture, profile, partHtml, rowHtml, shootThumb, boardThumb, nextHtml, postHtml, openThing } = window.ShelfParts.thingRows;

  // ---------- Its parts ----------
  // "Talent. Regular since August."
  const aboutLine = (v) => [v.role, v.rounds && v.rounds.more.group].filter(Boolean).map((s) => `${s}.`).join(' ');
  function headHtml(page, v) {
    const p = v.person;
    const photo = picture(page, v.rounds && v.rounds.covers[0]);
    const link = profile(p);
    // A profile is on Instagram or TikTok: click-everything leaves the outside service alone.
    return `<div class="person-top"><span class="person-photo">${photo ? `<img src="${photo}" alt="">` : SOMEONE}</span>
      <div class="person-who"><h1>${esc(p.name || `@${link ? link.handle : ''}`)}</h1>
      ${link ? `<a class="person-handle" href="${esc(link.url)}" target="_blank" rel="noopener" data-test-skip>@${esc(link.handle)} ${CHEV}</a>` : ''}
      ${aboutLine(v) ? `<p class="person-about">${esc(aboutLine(v))}</p>` : ''}</div></div>`;
  }
  // SAME PERSON? for each person it might be: "June Park (@june.other) might be the same person."
  const sameHtml = (o) => `<div class="person-same"><h2>Same person?</h2><p>${esc(o.name)}${o.instagram || o.tiktok ? ` (@${esc(o.instagram || o.tiktok)})` : ''} might be the same person.</p>
    <div class="person-same-btns"><button type="button" class="sheet-btn primary" data-same="${esc(o.id)}">Same person</button><button type="button" class="sheet-btn" data-apart="${esc(o.id)}">Not the same</button></div></div>`;
  function bodyHtml(page, v) {
    const first = firstName(v.person.name);
    const none = `<p class="person-none">Nothing with ${esc(first)} yet.</p>`;
    const list = (things, row) => (things.length ? things.map(row).join('') : none);
    const posts = v.byApp['contact-sheet'];
    return v.maybe.map(sameHtml).join('')
      + partHtml('rounds', 'Next', 0, v.rounds ? nextHtml(v.rounds) : none)
      + partHtml('the-eye', 'Shoots', v.byApp['the-eye'].length, list(v.byApp['the-eye'], (t) => rowHtml(t, shootThumb(page, t))))
      + partHtml('ref', 'Boards', v.byApp.ref.length, list(v.byApp.ref, (t) => rowHtml(t, boardThumb(page, t))))
      + partHtml('contact-sheet', `Posts ${first}'s in`, posts.length, posts.length ? `<div class="person-posts">${posts.map((t) => postHtml(page, t)).join('')}</div>` : none);
  }

  // ---------- The page ----------
  // Draws (or draws again) the page for one person; null when there's no such person.
  async function paint(page, id) {
    const v = await D().personView(id);
    if (!v) return null;
    page.urls.splice(0).forEach((u) => URL.revokeObjectURL(u));
    page.view = v;
    page.setAttribute('aria-label', v.person.name || 'Person');
    page.querySelector('.person-scroll').innerHTML = headHtml(page, v) + bodyHtml(page, v);
    return v;
  }
  // back: what the back button does instead of shutting the page (going
  // back to the notebook that opened it).
  async function openPerson(id, back = null) {
    const page = document.createElement('div');
    page.className = 'connect-page person-page';
    page.setAttribute('role', 'dialog');
    page.setAttribute('aria-modal', 'true');
    page.urls = [];
    page.innerHTML = `<div class="connect-head person-head"><button type="button" class="ring-btn" data-back aria-label="Back"><span>${BACK}</span></button><h2>Person</h2>
      <button type="button" class="ring-btn" data-more aria-label="Edit"><span>${MORE}</span></button></div><div class="connect-scroll person-scroll"></div>`;
    if (!(await paint(page, id))) { ed.toast("That person isn't here any more"); return null; }
    document.body.appendChild(page);
    requestAnimationFrame(() => page.classList.add('in'));
    const shut = () => {
      page.urls.forEach((u) => URL.revokeObjectURL(u));
      page.classList.remove('in');
      setTimeout(() => page.remove(), 220);
    };
    page.addEventListener('click', async (e) => {
      const thing = e.target.closest('[data-thing]');
      const v = page.view;
      if (thing) openThing(ed, [v.rounds, ...Object.values(v.byApp).flat()].find((t) => t && t.key === thing.dataset.thing));
      else if (e.target.closest('[data-back]')) { if (back) back(); else shut(); }
      else if (e.target.closest('[data-more]')) ed.editPerson(v.person, () => paint(page, v.person.id));
      else if (e.target.closest('[data-same], [data-apart]')) {
        const b = e.target.closest('[data-same], [data-apart]');
        await D().answerSame(v.person.id, b.dataset.same || b.dataset.apart, 'same' in b.dataset);
        await paint(page, v.person.id);
      }
    });
    return page;
  }
};
