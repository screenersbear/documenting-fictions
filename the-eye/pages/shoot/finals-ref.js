// Send finals to Ref? (round 2, connect/18). Right after final images are
// added to a shoot, in the suite, a sheet shows the new ones in a grid of
// three, none picked; tapping picks one (Ref's blue ring and a tick). TAGS
// under them go with everything sent (components/finals-tags.js); + Tag
// adds your own. SEND N TO REF passes the picked finals on: a 'finals-ref'
// link in df-links with their pictures and the tags, which Ref brings in as
// its own photos the next time it opens (ref/data/finals-in.js). NOT NOW
// closes it; the shoot's More keeps Send finals to Ref (all its finals) for
// later. Nothing is sent without picking.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addFinalsToRef = function addFinalsToRef(ed) {
  Object.assign(ed, { offerFinalsToRef });
  const D = () => ed.refApi;
  const $ = id => document.getElementById(id);
  const overlay = $('finalsRefOverlay');
  const TICK = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="5 12.5 10 17 19 7"/></svg>';
  const PLUS = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
  let open = null; // { shootId, title, images, picked: Set of indexes, tags, typing }

  const here = () => !!(D() && D().inSuite() && window.DFConnect);
  const shootOf = id => ed.state.shoots.find(s => s.id === id);

  // The sheet, for these finals of the shoot ([{ src }]).
  function offerFinalsToRef(shootId, images) {
    if (!here() || !images || !images.length) return;
    if (ed.shootPageOpenOn(shootId)) ed.saveShootNow(); // the people and kind as they are now
    const s = shootOf(shootId);
    if (!s || ed.isVideoCategory(s.category)) return;
    open = { shootId, title: s.title || ed.shootDisplayName(s), images, picked: new Set(), tags: ed.finalsTags(s), typing: false };
    $('finalsRefPair').innerHTML = window.DFConnect.pairHtml('the-eye', 'ref');
    draw();
    overlay.hidden = false;
  }

  function draw() {
    const n = open.picked.size;
    $('finalsRefLine').textContent = ed.finalsLine(n, open.images.length);
    $('finalsRefGrid').innerHTML = open.images.map((img, i) => `<button type="button" class="finals-ref-pick" role="checkbox" aria-checked="${open.picked.has(i)}" aria-label="Final ${i + 1}" data-pick="${i}">
      <img src="${img.src}" alt="" /><span class="finals-ref-tick">${open.picked.has(i) ? TICK : ''}</span></button>`).join('');
    drawTags();
    $('finalsRefSend').textContent = ed.sendFinalsWords(n);
    $('finalsRefSend').disabled = !n;
  }
  function drawTags() {
    $('finalsRefTags').innerHTML = open.tags.map((t, i) => `<button type="button" class="finals-ref-tag" aria-pressed="${t.on}" data-tag="${i}">${ed.escapeHtml(t.name)}</button>`).join('')
      + (open.typing ? '<input type="text" class="finals-ref-new" id="finalsRefNew" maxlength="40" placeholder="New tag" aria-label="New tag" autocomplete="off" enterkeyhint="done" />'
        : `<button type="button" class="finals-ref-tag finals-ref-add" data-add-tag>${PLUS}Tag</button>`);
    if (open.typing) $('finalsRefNew').focus();
  }
  function addTyped(input) {
    open.tags = ed.withTag(open.tags, input.value);
    open.typing = false;
    drawTags();
  }

  function shut() {
    overlay.hidden = true;
    $('finalsRefGrid').innerHTML = '';
    open = null;
  }
  // The picked finals as pictures for the link: the bytes The Eye keeps.
  async function picturesOf(list, title) {
    return Promise.all(list.map(async (img, i) => {
      const blob = await (await fetch(img.src)).blob();
      return { type: blob.type || 'image/jpeg', bytes: await blob.arrayBuffer(), name: `${title || 'Final'} ${i + 1}` };
    }));
  }
  async function send() {
    const { shootId, title, images, picked, tags } = open;
    const list = [...picked].sort((a, b) => a - b).map(i => images[i]);
    shut();
    try {
      const photos = await picturesOf(list, title);
      await D().saveLink({ fromApp: 'the-eye', fromId: shootId, toApp: 'ref', toId: '', type: 'finals-ref', title, count: photos.length, tags: ed.tagsOn(tags), importedAt: null }, { photos });
      ed.showToast(`${photos.length} going to Ref. They come in when Ref opens.`);
    } catch (e) {
      console.error(e);
      ed.showToast("The finals couldn't be sent to Ref");
    }
  }

  $('finalsRefGrid').addEventListener('click', (e) => {
    const b = e.target.closest('[data-pick]');
    if (!b) return;
    const i = Number(b.dataset.pick);
    if (open.picked.has(i)) open.picked.delete(i); else open.picked.add(i);
    draw();
  });
  $('finalsRefTags').addEventListener('click', (e) => {
    const t = e.target.closest('[data-tag]');
    if (t) { const i = Number(t.dataset.tag); open.tags = open.tags.map((x, k) => (k === i ? { ...x, on: !x.on } : x)); drawTags(); return; }
    if (e.target.closest('[data-add-tag]')) { open.typing = true; drawTags(); }
  });
  $('finalsRefTags').addEventListener('keydown', (e) => {
    if (e.target.id === 'finalsRefNew' && e.key === 'Enter') { e.preventDefault(); addTyped(e.target); }
  });
  $('finalsRefTags').addEventListener('focusout', (e) => { if (e.target.id === 'finalsRefNew' && open) setTimeout(() => { if (open && open.typing) addTyped(e.target); }, 0); });
  $('finalsRefLater').addEventListener('click', shut);
  $('finalsRefClose').addEventListener('click', shut);
  $('finalsRefSend').addEventListener('click', () => { if (open && open.picked.size) send(); });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) shut(); });

  // The shoot's More: Send finals to Ref, for all its finals, when it has some.
  const item = $('shootMoreFinalsRefBtn');
  const divider = $('shootMoreFinalsRefDivider');
  $('shootBandMore').addEventListener('click', () => {
    item.hidden = divider.hidden = true;
    const id = ed.currentShootId;
    if (!here() || !id || ed.isVideoCategory($('shootCategory').value)) return;
    ed.idbGetImages(ed.finalImagesKey(id)).then((imgs) => { if (imgs.length && id === ed.currentShootId) item.hidden = divider.hidden = false; }).catch(() => {});
  });
  item.addEventListener('click', () => {
    $('shootMoreOverlay').hidden = true;
    const id = ed.currentShootId;
    ed.idbGetImages(ed.finalImagesKey(id)).then(imgs => offerFinalsToRef(id, imgs)).catch(() => {});
  });
};
