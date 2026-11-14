// A new sticker: a photo picked and read (placing it: components/sticker-place.js);
// taking one off, and putting it back. (Loaded before components/stickers.js.)
window.StickerParts = window.StickerParts || {};
window.StickerParts.addNewSticker = function addNewSticker(ed) {
  'use strict';
  Object.assign(ed, { pick, photo, remove, putBack });
  // ---------- A new one ----------
  // A photo from the library, straight from the tap (or iOS won't open it).
  function pick() {
    return new Promise((done) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      document.body.append(input);
      let settled = false;
      const end = (f) => { if (settled) return; settled = true; input.remove(); done(f || null); };
      input.addEventListener('change', () => end(input.files && input.files[0]));
      input.addEventListener('cancel', () => end(null));
      input.click();
    });
  }
  const loadImage = (url) => new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => no(new Error('Could not read that photo')); im.src = url; });
  const toBlob = (c, type, q) => new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error('Could not read that photo'))), type, q));

  // The whole photo, no bigger than it's ever shown (round 5: its shape is
  // picked while placing it, and the photo fills that shape from the middle).
  async function photo(file) {
    const url = URL.createObjectURL(file);
    let img;
    try { img = await loadImage(url); } finally { URL.revokeObjectURL(url); }
    const fit = Math.min(1, 1200 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * fit));
    c.height = Math.max(1, Math.round(img.naturalHeight * fit));
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(img, 0, 0, c.width, c.height);
    try { return await (await toBlob(c, 'image/jpeg', 0.88)).arrayBuffer(); } finally { c.width = c.height = 0; }
  }

  async function remove(s) {
    await ed.write((os) => os.delete(s.id));
    ed.all = ed.all.filter((x) => x.id !== s.id);
  }
  async function putBack(s) {
    await ed.write((os) => os.put(s));
    if (!ed.all.some((x) => x.id === s.id)) ed.all.push(s);
  }
};
