// Say thanks, on a shoot's page once it's captured (round 2, thanks/01):
// one card FROM ROUNDS for each person from the shoot who has a Say thanks
// waiting there, with when (TOMORROW, TODAY or the date), their photo, "Say
// thanks to <name>" and one dim line. OPEN ROUNDS opens the move in Rounds;
// <NAME> WROTE FIRST asks Rounds to mark it done, with the note "<Name>
// reached out first." The card goes once the thanks is done, from either
// side. The Eye reads Rounds only through the one list of people
// (shared/data/people-things.js) and asks it through df-links
// (shared/data/asks.js): it never writes Rounds' data.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addSayThanks = function addSayThanks(ed) {
  Object.assign(ed, { thanksWaiting, thanksWhen, sayThanksHtml, fillSayThanks });
  const D = () => window.DFData;
  const esc = v => ed.escapeHtml(v);
  const firstName = n => String(n || '').trim().split(/\s+/)[0] || 'them';
  const handleOn = (list, platform) => ((list || []).find(h => h && h.platform === platform) || {}).handle || '';
  const nextDay = (iso) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + 1); return d.toISOString().slice(0, 10); };

  // Rounds' Say thanks for this shoot in a person's view, or null.
  function thanksWaiting(view, shootId) {
    const t = view && view.rounds && view.rounds.more && view.rounds.more.thanks;
    return t && Array.isArray(t.shoots) && t.shoots.includes(shootId) ? { roundsId: view.rounds.id, due: t.due || '' } : null;
  }
  // TODAY (due or overdue), TOMORROW, or the day.
  function thanksWhen(due, today) {
    if (!due || due <= today) return 'Today';
    return due === nextDay(today) ? 'Tomorrow' : ed.dayWords(due);
  }
  function sayThanksHtml(name, photo, when, roundsId) {
    const first = firstName(name);
    return `<section class="df-slip eye-thanks" data-thanks="${esc(roundsId)}">
      <div class="df-slip-head">${window.DFConnect.tagHtml('rounds')}<span class="df-slip-when">${esc(when)}</span></div>
      <div class="eye-thanks-who"><span class="eye-thanks-photo">${photo ? `<img src="${esc(photo)}" alt="">` : ''}</span>
        <span><span class="df-slip-title">Say thanks to ${esc(first)}</span><span class="df-slip-line">A text the day after, while it's fresh.</span></span></div>
      <div class="df-slip-actions"><a class="df-slip-main eye-thanks-open" href="${esc(D().notebookUrl('rounds', { person: roundsId, move: 1 }) || '#')}">Open Rounds</a><button type="button" class="df-slip-later" data-wrote-first>${esc(first)} wrote first</button></div>
    </section>`;
  }

  // Everyone on the shoot as the list finds them: talent, then the team.
  function shootWho(s) {
    const talent = (s.talents || []).filter(t => t && ed.hasText(t.name)).map(t => ({ name: t.name.trim(), instagram: handleOn(t.socialHandles, 'instagram'), tiktok: handleOn(t.socialHandles, 'tiktok') }));
    const team = (s.teamMembers || []).filter(m => m && ed.hasText(m.name)).map(m => ({ name: m.name.trim(), instagram: (m.socialPlatform || 'instagram') === 'instagram' ? m.socialHandle || '' : '', tiktok: m.socialPlatform === 'tiktok' ? m.socialHandle || '' : '' }));
    return [...talent, ...team];
  }

  // The cards, into box, for a shoot after it's shot (nothing outside the suite).
  async function fillSayThanks(box, s, today = D() ? D().todayStr() : '') {
    if (!box || !D() || !D().personFor || !ed.isPostCaptureStatus(s.status)) return;
    let html = '';
    const seen = new Set();
    for (const who of shootWho(s)) {
      const r = await D().personFor(who).catch(() => null);
      const v = r && !seen.has(r.id) ? await D().personView(r.id).catch(() => null) : null;
      const t = thanksWaiting(v, s.id);
      if (!t) continue;
      seen.add(r.id);
      const asked = (await D().roundsAsks(t.roundsId)).some(l => l.ask && l.ask.do === 'done' && l.ask.kind === 'thanks');
      // Their photo as Rounds has it (its own, or their talent photo from here).
      const photo = !asked && v.rounds.covers && v.rounds.covers[0] ? D().pictureUrl(v.rounds.covers[0]) : '';
      if (!asked) html += sayThanksHtml(v.person.name || who.name, photo, thanksWhen(t.due, today), t.roundsId);
    }
    if (!box.isConnected) return;
    box.innerHTML = html;
    box.querySelectorAll('[data-wrote-first]').forEach(b => b.addEventListener('click', async () => {
      const card = b.closest('[data-thanks]');
      const name = card.querySelector('.df-slip-title').textContent.replace(/^Say thanks to /, '');
      await D().askRounds('the-eye', { do: 'done', personId: card.dataset.thanks, kind: 'thanks', note: `${name} reached out first.` });
      card.remove();
    }));
  }
};
