// The Next shoot card on Overview: the next shoot coming up (today's first),
// with its cover, how many days off it is, who's in it, its status, and its
// day and time. Tap it to open the shoot. Hidden when nothing's coming up.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addOverviewNextShoot = function addOverviewNextShoot(ed) {
  Object.assign(ed, { renderNextShoot });
  const section = document.getElementById('nextShootSection');
  const holder = document.getElementById('nextShootCard');
  let shownId = null;

  function renderNextShoot(s) {
    section.hidden = !s;
    holder.innerHTML = '';
    shownId = s ? s.id : null;
    if (!s) return;
    const today = ed.todayStr();
    const names = (s.talents || []).map(t => t.name).filter(ed.hasText);
    const info = ed.projectDayInfo(s);
    const when = ed.metaLine([ed.rowDate(s.date, today, true), s.time ? ed.prettyTime(s.time) : '']);
    holder.innerHTML = `
      <button type="button" class="next-shoot">
        <span class="next-shoot-cover">${ed.shootThumbHtml(s)}</span>
        <span class="next-shoot-body">
          <span class="next-shoot-tag">${ed.escapeHtml(ed.daysAwayTag(s.date, today))}</span>
          <span class="next-shoot-name">${ed.escapeHtml(ed.shootDisplayName(s))}</span>
          ${names.length ? `<span class="next-shoot-with">With ${ed.escapeHtml(ed.joinWithAnd(names))}</span>` : ''}
          <span class="next-shoot-meta next-shoot-status">${ed.escapeHtml(ed.metaLine([ed.STATUS_LABELS[s.status] || '', info ? `Day ${info.day} of ${info.total}` : '']))}</span>
          <span class="next-shoot-meta">${ed.escapeHtml(when)}</span>
        </span>
      </button>`;
  }

  holder.addEventListener('click', (e) => {
    if (shownId && e.target.closest('.next-shoot')) ed.openShootModal(shownId);
  });
};
