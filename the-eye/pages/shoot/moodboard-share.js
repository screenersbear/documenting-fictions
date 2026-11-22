// SHARE on a shoot's mood board (Starky, 21 Nov): the whole board, sent
// straight on, as a PDF or as images. It asks which, then puts it together:
// the boards from Ref first (each page a picture), then the mood board's own
// photos, in the order they're on the board. Each is a page of the PDF at
// its own shape (its long side 11 inches, as Ref's boards are), or a JPEG.
// Then a tap to hand it over, because iOS won't open the share sheet after
// a long wait.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addMoodboardShare = function addMoodboardShare(ed) {
  Object.assign(ed, { shareMoodboard });
  const overlay = document.getElementById('shareBoardOverlay');
  const text = document.getElementById('shareBoardText');
  const picks = [...overlay.querySelectorAll('[data-share-as]')];
  const send = document.getElementById('shareBoardSendBtn');
  const LONG = 2400; // pixels on a picture's long side
  const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  let close = null;

  document.getElementById('shareMoodboardBtn').addEventListener('click', shareMoodboard);
  document.getElementById('shareBoardCancelBtn').addEventListener('click', () => close && close());
  const showPicks = on => { picks.forEach(b => { b.hidden = !on; }); ed.fitButtonPair(document.getElementById('shareBoardActions')); };
  let picked = null; // what the PDF / Images buttons do, while they're up
  picks.forEach(b => b.addEventListener('click', () => { if (picked) picked(b.dataset.shareAs); }));

  // Every picture on the board, Ref's pages first: [src], and the URLs to let go of.
  async function pictures(shootId) {
    const urls = [];
    const boards = ed.refApi ? await ed.refBoardsFor(shootId, urls).catch(() => []) : [];
    const images = await ed.idbGetImages(shootId);
    return { srcs: [...boards.flatMap(b => b.pages), ...images.map(i => i && i.src).filter(Boolean)], urls };
  }

  // A picture as a JPEG, its long side at most LONG.
  function jpeg(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const k = Math.min(1, LONG / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.naturalWidth * k));
        c.height = Math.max(1, Math.round(img.naturalHeight * k));
        const g = c.getContext('2d');
        g.fillStyle = '#FFFFFF';
        g.fillRect(0, 0, c.width, c.height);
        g.drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(b => { const w = c.width, h = c.height; c.width = c.height = 0; b ? resolve({ blob: b, w, h }) : reject(new Error('no picture')); }, 'image/jpeg', 0.9);
      };
      img.onerror = () => reject(new Error('picture did not load'));
      img.src = src;
    });
  }
  const dataUrl = blob => new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = no; r.readAsDataURL(blob); });

  async function makePdf(pics) {
    const { jsPDF } = await ed.loadLib('lib/jspdf.umd.min.js', 'jspdf');
    const size = p => { const k = 792 / Math.max(p.w, p.h); return [p.w * k, p.h * k]; };
    const first = size(pics[0]);
    const doc = new jsPDF({ unit: 'pt', format: first, orientation: first[0] > first[1] ? 'l' : 'p' });
    for (let i = 0; i < pics.length; i++) {
      const [w, h] = size(pics[i]);
      if (i) doc.addPage([w, h], w > h ? 'l' : 'p');
      doc.addImage(await dataUrl(pics[i].blob), 'JPEG', 0, 0, w, h, undefined, 'FAST');
    }
    return doc.output('blob');
  }

  const fileName = shootId => {
    const s = ed.state.shoots.find(x => x.id === shootId);
    const name = `${s ? ed.shootDisplayName(s) : 'Shoot'} mood board`;
    return name.replace(/[—·]/g, '-').replace(/[^\w\- .]+/g, '').replace(/\s+/g, ' ').trim() || 'mood board';
  };
  const shareable = files => { try { return !!(navigator.canShare && navigator.share && navigator.canShare({ files })); } catch (e) { return false; } };

  async function shareMoodboard() {
    if (close) return;
    const shootId = ed.currentShootId;
    let open = true;
    let urls = [];
    ed.busyTasks++;
    close = () => {
      open = false;
      close = null;
      overlay.hidden = true;
      send.onclick = null;
      picked = null;
      urls.forEach(u => URL.revokeObjectURL(u));
      ed.busyTasks--;
    };
    send.hidden = true;
    text.textContent = 'Looking at the board';
    overlay.hidden = false;
    showPicks(false);
    let srcs;
    try { ({ srcs, urls } = await pictures(shootId)); } catch (e) { srcs = []; }
    if (!open) return;
    if (!srcs.length) { text.textContent = 'There is nothing on the mood board yet.'; return; }
    text.textContent = `${count(srcs.length, 'picture', 'pictures')}. As one PDF, or each one as an image?`;
    showPicks(true);
    picked = as => {
      picked = null;
      showPicks(false);
      makeAndHand(as, srcs, shootId, () => open);
    };
  }

  async function makeAndHand(as, srcs, shootId, stillOpen) {
    const base = fileName(shootId);
    let files;
    try {
      const pics = [];
      for (let i = 0; i < srcs.length; i++) {
        text.textContent = `Putting it together, ${i + 1} of ${srcs.length}`;
        pics.push(await jpeg(srcs[i]));
        if (!stillOpen()) return;
      }
      files = as === 'pdf'
        ? [new File([await makePdf(pics)], `${base}.pdf`, { type: 'application/pdf' })]
        : pics.map((p, i) => new File([p.blob], `${base} ${String(i + 1).padStart(2, '0')}.jpg`, { type: 'image/jpeg' }));
    } catch (e) {
      console.error('Could not make the mood board', e);
      if (stillOpen()) text.textContent = `Could not make the ${as === 'pdf' ? 'PDF' : 'images'}. Try once more.`;
      return;
    }
    if (!stillOpen()) return;
    const mb = (files.reduce((t, f) => t + f.size, 0) / 1048576).toFixed(1);
    const share = shareable(files);
    text.textContent = as === 'pdf' ? `Your PDF is ready: ${count(srcs.length, 'page', 'pages')}, ${mb} MB.` : `Your images are ready: ${count(files.length, 'image', 'images')}, ${mb} MB.`;
    send.textContent = share ? 'Save or share' : files.length > 1 ? `Download ${files.length} as ZIP` : 'Download';
    send.hidden = false;
    ed.fitButtonPair(document.getElementById('shareBoardActions'));
    send.onclick = async () => {
      if (share) {
        try { await navigator.share({ files, title: base }); } catch (e) { if (e && e.name === 'AbortError') return; }
      } else {
        const P = window.DFDataParts;
        const file = files.length === 1 ? files[0] : new File([await P.zipOf(await Promise.all(files.map(async f => ({ name: f.name, blob: f, crc: await P.crcOf(f) }))))], `${base}.zip`, { type: 'application/zip' });
        await P.saveFile(file, { share: false });
      }
      if (close) close();
    };
  }
};
