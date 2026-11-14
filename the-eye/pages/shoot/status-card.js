// The status card on a shoot's front page (round 5, 12-shoot-status-card),
// under when and where: STATUS and CHANGE, the status in large with "3 OF 7",
// then a bar for each stage (components/status-steps.js) with the first and
// last named under the ends. Postponed and Canceled say so in a crimson line
// in place of the bars. The whole card opens Change status (status-sheet.js).
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootStatusCard = function addShootStatusCard(ed) {
  Object.assign(ed, { drawStatusCard });
  const card = document.getElementById('shootStatusTag');
  const name = document.getElementById('shootStatusTagText');
  const count = document.getElementById('shootStatusCount');
  const bars = document.getElementById('shootStatusBars');
  const ends = document.getElementById('shootStatusEnds');
  const offLine = document.getElementById('shootStatusOff');
  const label = key => ed.STATUS_LABELS[key] || 'Prospect';

  function drawStatusCard(s) {
    const steps = ed.statusSteps(ed.statusOptionKeys(s.category, s.status), s.status);
    const now = label(s.status);
    name.textContent = now;
    count.textContent = steps.count;
    bars.innerHTML = steps.bars.map(b => `<i class="${b.state}" style="height:${b.height}px"></i>`).join('');
    const first = steps.bars[0], last = steps.bars[steps.bars.length - 1];
    ends.innerHTML = first ? `<span>${ed.escapeHtml(label(first.key))}</span><span>${ed.escapeHtml(label(last.key))}</span>` : '';
    bars.hidden = steps.off;
    ends.hidden = steps.off;
    offLine.hidden = !steps.off;
    offLine.textContent = steps.off ? `This shoot is ${now.toLowerCase()}.` : '';
    card.setAttribute('aria-label', `Status: ${now}${steps.count ? `, ${steps.count}` : ''}. Change it`);
  }
};
