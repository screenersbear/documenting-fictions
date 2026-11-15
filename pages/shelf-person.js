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
  const C = () => window.DFConnect;
  const BACK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  const MORE = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>';
  const CHEV = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg>';
  const CAMERA = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13.5" r="3.5"/></svg>';
  const SOMEONE = '<svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor" aria-hidden="true"><circle cx="12" cy="8.5" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0z"/></svg>';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || 'them';

  // ---------- Its parts ----------
  // A picture kept as bytes, as an address for the page while it's open.
  function picture(page, c) {
    const url = c ? D().pictureUrl(c) : '';
    if (url) page.urls.push(url);
    return url;
  }
  const profile = (p) => (p.instagram ? { url: `https://www.instagram.com/${encodeURIComponent(p.instagram)}/`, handle: p.instagram }
    : p.tiktok ? { url: `https://www.tiktok.com/@${encodeURIComponent(p.tiktok)}`, handle: p.tiktok } : null);
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
  function partHtml(app, title, count, body) {
    const nb = C().NOTEBOOKS[app];
    return `<section class="person-part" data-app="${app}"><div class="person-part-head"><span class="person-mark" style="background:${nb.bg}">${C().markSvg(app, 20)}</span>
      <h2>${esc(title)}${count ? ` <span>${count}</span>` : ''}</h2></div>${body}</section>`;
  }
  const rowHtml = (t, thumb) => `<button type="button" class="person-row" data-thing="${esc(t.key)}">${thumb}<span class="person-words"><span class="person-title">${esc(t.title)}</span>${t.line ? `<span class="person-line">${esc(t.line)}</span>` : ''}</span><span class="person-chev">${CHEV}</span></button>`;
  const shootThumb = (page, t) => { const u = picture(page, t.covers[0]); return `<span class="person-shoot">${u ? `<img src="${u}" alt="">` : CAMERA}</span>`; };
  const boardThumb = (page, t) => `<span class="person-board">${[0, 1, 2].map((k) => { const u = picture(page, t.covers[k]); return `<span>${u ? `<img src="${u}" alt="">` : ''}</span>`; }).join('')}</span>`;
  function nextHtml(v) {
    const t = v.rounds;
    const next = t.more.next || {};
    const icon = `<span class="person-kind" style="background:${esc(next.bg || '#0A4FD6')}">${next.icon || ''}</span>`;
    return rowHtml({ ...t, title: next.title || t.title, line: next.line || t.line }, icon);
  }
  const postHtml = (page, t) => { const u = picture(page, t.covers[0]); return `<button type="button" class="person-post" data-thing="${esc(t.key)}" aria-label="${esc(t.title)}">${u ? `<img src="${u}" alt="">` : `<span>${esc(t.title)}</span>`}</button>`; };
  function bodyHtml(page, v) {
    const first = firstName(v.person.name);
    const none = `<p class="person-none">Nothing with ${esc(first)} yet.</p>`;
    const list = (things, row) => (things.length ? things.map(row).join('') : none);
    const posts = v.byApp['contact-sheet'];
    return v.maybe.map(sameHtml).join('')
      + partHtml('rounds', 'Next', 0, v.rounds ? nextHtml(v) : none)
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
    const go = (t) => {
      const i = ed.BOOKS.findIndex((b) => b.id === t.app);
      page.remove();
      ed.openBook(i, t.params);
    };
    page.addEventListener('click', async (e) => {
      const thing = e.target.closest('[data-thing]');
      const v = page.view;
      if (thing) go([v.rounds, ...Object.values(v.byApp).flat()].find((t) => t && t.key === thing.dataset.thing));
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
