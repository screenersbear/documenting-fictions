// What a delivered shoot passed on, and what came in (round 2, connect/02).
// Once a shoot is delivered with its finals in, the finals pass to Layouts:
// a 'finals' link in df-links, made once, which Layouts turns into two posts.
// On the shoot's report, PASSED ON says where things went (the finals to Layouts, the
// people to Rounds) and CAME IN what came from Ref (its mood board); each row
// opens the thing in the other notebook. Nothing to do here: it's a record.
// The words and rows: shared/data/connect.js. (Loaded before app.js.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootPassedOn = function addShootPassedOn(ed) {
  Object.assign(ed, { passFinalsOn, passedOnSlot, renderPassedOn });
  const C = () => window.DFConnect;
  // window.DFData, when the notebooks share this phone's storage (held-upright.js).
  const D = () => ed.refApi;
  const ready = () => !!(D() && C());

  // Hands the shoot's finals to Layouts (when that hand-off is on), once.
  // Called when a shoot becomes Delivered and when finals are added to a
  // delivered one: until Layouts has made its posts, the link follows the
  // finals (how many) and the shoot (its title and credits). Gives the link,
  // or null when nothing passes.
  async function passFinalsOn(shootId) {
    if (!ready() || !D().inSuite() || !C().connectOn('finals')) return null;
    if (ed.shootPageOpenOn(shootId)) ed.saveShootNow();
    const shoot = ed.state.shoots.find(s => s.id === shootId);
    if (!shoot || shoot.status !== 'delivered' || ed.isVideoCategory(shoot.category)) return null;
    const finals = await ed.idbGetImages(ed.finalImagesKey(shootId));
    if (!finals.length) return null;
    const [had] = await D().linksWhere({ fromApp: 'the-eye', fromId: shootId, type: 'finals' });
    if (had && had.madeAt) return had;
    const title = shoot.title || '';
    const credits = C().shootCredits(shoot);
    return D().saveLink({
      ...(had || {}), fromApp: 'the-eye', fromId: shootId, toApp: 'contact-sheet', toId: '', type: 'finals',
      title, count: finals.length, credits, caption: C().captionFor(title, credits), deliveredAt: shoot.deliveredAt || '',
    });
  }

  // PASSED ON and CAME IN, on a delivered shoot's report (report-cards.js),
  // after its final images. The report is drawn again on every save, so the
  // last record drawn for the shoot goes straight back in while it's checked.
  let last = { shootId: null, html: '' };
  function passedOnSlot() {
    const html = last.shootId === ed.currentShootId ? last.html : '';
    return `<div class="passed-on" id="shootPassedOn"${html ? ' data-drawn' : ' hidden'}>${html}</div>`;
  }
  async function renderPassedOn() {
    const shootId = ed.currentShootId;
    const delivered = document.getElementById('shootStatus').value === 'delivered';
    let html = '';
    if (ready() && shootId && delivered) {
      const links = (await Promise.all([
        D().linksWhere({ fromApp: 'the-eye', fromId: shootId }),
        D().linksWhere({ toApp: 'the-eye', toId: shootId, type: 'moodboard' }),
      ]).catch(() => [[], []])).flat();
      if (shootId !== ed.currentShootId) return; // another shoot opened meanwhile
      const { passed, came } = C().passedOnRows(links, shootId);
      const withHref = rows => rows.map(r => ({ ...r, href: r.params ? D().notebookUrl(r.app, r.params) || '' : '' }));
      const part = (title, rows) => (rows.length ? ed.frontTitle(title) + C().recordHtml(withHref(rows)) : '');
      html = part('Passed on', passed) + part('Came in', came);
    }
    const same = last.shootId === shootId && last.html === html;
    last = { shootId, html };
    const box = document.getElementById('shootPassedOn');
    if (!box) return;
    // Drawn already (from the last record): left as it is.
    if (!same || !box.hasAttribute('data-drawn')) { box.innerHTML = html; box.setAttribute('data-drawn', ''); }
    box.hidden = !html;
  }
};
