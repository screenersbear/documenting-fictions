// SAVE AS IMAGE (round 7, 08-save-as-image, 16 Nov), from the shelf's
// Options: a preview of the picture (components/shelf-image.js), WHAT (the
// notebook in front, by its name, or The whole shelf), SIZE (Post 4:5, Story
// 9:16, Square) and SAVE AND SHARE, which makes it 1080 wide and opens the
// share sheet, where Save Image is (a download on a computer). The full-size
// picture is made as soon as the choice is, so the share sheet opens straight
// from the tap. (Loaded before app.js.)
window.ShelfParts = window.ShelfParts || {};
window.ShelfParts.addSaveImage = function addSaveImage(ed) {
  'use strict';
  Object.assign(ed, { openSaveImage });
  const glyph = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const CLOSE = glyph('<path d="M6 6l12 12M18 6L6 18"/>');
  const SIZE_NAMES = { post: 'Post 4:5', story: 'Story 9:16', square: 'Square' };
  const PREVIEW_W = 236; // as wide as the mockup's preview; drawn at twice that
  const chip = (group, k, label, on) => `<button type="button" class="save-chip" data-${group}="${k}" aria-pressed="${on}">${label}</button>`;
  const fileName = (what, b) => `${what === 'shelf' ? 'Documenting Fictions' : b.short}.png`;

  function openSaveImage() {
    const b = ed.BOOKS[ed.mod(Math.round(ed.pos))];
    let what = 'front', size = 'post', full = null, turn = 0;
    const dim = document.createElement('div');
    dim.className = 'sheet-dim';
    dim.innerHTML = `<div class="sheet save-image" role="dialog" aria-modal="true" aria-label="Save as image">
      <div class="sheet-head"><h2>Save as image</h2><button type="button" class="ring-btn" data-close aria-label="Close"><span>${CLOSE}</span></button></div>
      <div class="save-preview"><img alt="" /></div>
      <span class="opt-label">What</span>
      <div class="save-chips">${chip('what', 'front', b.short, true)}${chip('what', 'shelf', 'The whole shelf', false)}</div>
      <span class="opt-label">Size</span>
      <div class="save-chips">${Object.entries(SIZE_NAMES).map(([k, n]) => chip('size', k, n, k === size)).join('')}</div>
      <button type="button" class="sheet-btn primary save-go" data-save data-test-skip>Save and share</button></div>`;
    const sheet = dim.firstElementChild, img = sheet.querySelector('.save-preview img');
    document.body.appendChild(dim);
    requestAnimationFrame(() => dim.classList.add('in'));

    // The preview, then the full-size picture for the share sheet.
    async function draw() {
      const mine = ++turn;
      while (ed.busy) await ed.wait(60); // Options putting its book back first: the shelf as it stands
      sheet.querySelectorAll('[data-what]').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.what === what)));
      sheet.querySelectorAll('[data-size]').forEach((c) => c.setAttribute('aria-pressed', String(c.dataset.size === size)));
      const [w, h] = ed.IMAGE_SIZES[size];
      img.style.aspectRatio = `${w} / ${h}`;
      img.alt = what === 'shelf' ? 'The whole shelf' : `${b.short}'s cover with its stickers`;
      const small = await ed.shelfImage({ what, size, width: PREVIEW_W * 2 });
      if (mine !== turn) return;
      img.src = small.toDataURL('image/png');
      full = ed.shelfImage({ what, size, width: w }).then((cv) => new Promise((ok) => cv.toBlob(ok, 'image/png')))
        .then((blob) => (blob ? new File([blob], fileName(what, b), { type: 'image/png' }) : null));
    }
    const close = () => { dim.classList.remove('in'); setTimeout(() => dim.remove(), 220); };
    dim.addEventListener('click', async (e) => {
      if (e.target === dim || e.target.closest('[data-close]')) { close(); return; }
      const pick = e.target.closest('[data-what], [data-size]');
      if (pick) {
        if (pick.dataset.what) what = pick.dataset.what; else size = pick.dataset.size;
        draw();
        return;
      }
      if (e.target.closest('[data-save]')) {
        try {
          const file = full && await full;
          if (!file) throw new Error('No picture');
          if (await window.DFData.saveFile(file) === 'downloaded') ed.toast('The picture is in your downloads');
        } catch (err) {
          console.error(err);
          ed.toast("That couldn't be saved as a picture");
        }
      }
    });
    draw();
    return dim;
  }
};
