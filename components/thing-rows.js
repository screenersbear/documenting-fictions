// The rows the person page and search share (round 2, connect/08 and 14):
// a notebook's part under its small mark, a row for each thing (a shoot's
// photo, a board's three, Rounds' next move with its kind), a post's cover,
// and opening a thing in its notebook. Pictures kept as bytes become
// addresses for the page while it's open (page.urls, let go when it shuts).
// (Loaded before app.js.)
window.ShelfParts = window.ShelfParts || {};
window.ShelfParts.thingRows = (function () {
  'use strict';
  // The shared files load after the shelf's own (files.txt), so they're looked up when used.
  const D = () => window.DFData;
  const C = () => window.DFConnect;
  const BACK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  const CHEV = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg>';
  const CAMERA = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h3l2-2.5h6L17 8h3v11H4z"/><circle cx="12" cy="13.5" r="3.5"/></svg>';
  const SOMEONE = '<svg viewBox="0 0 24 24" width="40" height="40" fill="currentColor" aria-hidden="true"><circle cx="12" cy="8.5" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0z"/></svg>';
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const firstName = (name) => String(name || '').trim().split(/\s+/)[0] || 'them';

  // A picture kept as bytes, as an address for the page while it's open.
  function picture(page, c) {
    const url = c ? D().pictureUrl(c) : '';
    if (url) page.urls.push(url);
    return url;
  }
  // Their profile: Instagram, else TikTok, else none.
  const profile = (p) => (p.instagram ? { url: `https://www.instagram.com/${encodeURIComponent(p.instagram)}/`, handle: p.instagram }
    : p.tiktok ? { url: `https://www.tiktok.com/@${encodeURIComponent(p.tiktok)}`, handle: p.tiktok } : null);
  // A notebook's part: its small mark, the title and a count, then its rows.
  function partHtml(app, title, count, body) {
    const nb = C().NOTEBOOKS[app];
    return `<section class="person-part" data-app="${app}"><div class="person-part-head"><span class="person-mark" style="background:${nb.bg}">${C().markSvg(app, 20)}</span>
      <h2>${esc(title)}${count ? ` <span>${count}</span>` : ''}</h2></div>${body}</section>`;
  }
  const rowHtml = (t, thumb) => `<button type="button" class="person-row" data-thing="${esc(t.key)}">${thumb}<span class="person-words"><span class="person-title">${esc(t.title)}</span>${t.line ? `<span class="person-line">${esc(t.line)}</span>` : ''}</span><span class="person-chev">${CHEV}</span></button>`;
  const shootThumb = (page, t) => { const u = picture(page, t.covers[0]); return `<span class="person-shoot">${u ? `<img src="${u}" alt="">` : CAMERA}</span>`; };
  const boardThumb = (page, t) => `<span class="person-board">${[0, 1, 2].map((k) => { const u = picture(page, t.covers[k]); return `<span>${u ? `<img src="${u}" alt="">` : ''}</span>`; }).join('')}</span>`;
  // Rounds' next move for someone, with its kind's mark ("Check in", "Due 2
  // Dec"). named: their name with when, where it could be anyone's.
  function nextHtml(t, named = false) {
    const next = t.more.next || {};
    const when = next.line || t.line;
    const icon = `<span class="person-kind" style="background:${esc(next.bg || '#0A4FD6')}">${next.icon || ''}</span>`;
    return rowHtml({ ...t, title: next.title || t.title, line: named ? [t.title, when].filter(Boolean).join(' · ') : when }, icon);
  }
  const postHtml = (page, t) => { const u = picture(page, t.covers[0]); return `<button type="button" class="person-post" data-thing="${esc(t.key)}" aria-label="${esc(t.title)}">${u ? `<img src="${u}" alt="">` : `<span>${esc(t.title)}</span>`}</button>`; };

  // A thing, opened in its notebook: the shelf's pages over it go first.
  function openThing(ed, t) {
    document.querySelectorAll('.connect-page').forEach((p) => {
      (p.urls || []).forEach((u) => URL.revokeObjectURL(u));
      p.remove();
    });
    ed.openBook(ed.BOOKS.findIndex((b) => b.id === t.app), t.params);
  }

  return { BACK, CHEV, CAMERA, SOMEONE, esc, firstName, picture, profile, partHtml, rowHtml, shootThumb, boardThumb, nextHtml, postHtml, openThing };
})();
