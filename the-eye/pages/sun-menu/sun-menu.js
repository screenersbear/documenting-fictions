// The sun menu: how the notebook looks.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addSunMenu = function addSunMenu(ed) {
  // ---------- The sun menu: how the notebook looks ----------
  (function setupSunMenu() {
  const sun = {  }; // what the parts of setupSunMenu share
  Object.assign(sun, { showPane, closeMenu });
    const overlay = document.getElementById('sunMenuOverlay'); sun.overlay = overlay;
    const title = document.getElementById('sunMenuTitle');
    const body = document.getElementById('sunMenuBody');
    const closeBtn = document.getElementById('sunMenuCloseBtn');
    const fileInput = document.getElementById('stickerFileInput');
    const book = document.getElementById('book'); sun.book = book;
    const layer = document.getElementById('bookStickers'); sun.layer = layer;
    const stage = document.getElementById('stickerStage'); sun.stage = stage;
    const MIN_SIZE = 0.12; sun.MIN_SIZE = MIN_SIZE;
    const MAX_SIZE = 1.4; sun.MAX_SIZE = MAX_SIZE;
    const photos = new Map(); sun.photos = photos; // sticker id -> photo
    let pendingShape = null;
    sun.placing = null; // the sticker being put down: { sticker, group, src }

    const RING = 0.009; sun.RING = RING;     // the paper edge round the photo, of the book's width
    const BEND = 0.05; sun.BEND = BEND;      // how much of the cover the last of a sticker curves over
    const EDGES = ['left', 'right', 'top', 'bottom']; sun.EDGES = EDGES;
    const stickerRatio = s => (s.shape === 'rect' && Number.isFinite(s.ratio) && s.ratio > 0 ? s.ratio : 1); sun.stickerRatio = stickerRatio;
    const isSideways = edge => edge === 'left' || edge === 'right'; sun.isSideways = isSideways;
    sun.groups = [];
  window.EyeParts.addSunStickerCreases(ed, sun);
  window.EyeParts.addSunCoverStickers(ed, sun);

    // Laid out like Options: the book's colour, Stickers (its own part), and
    // where the app starts (the same choices as Options, look-choices.js).
    // On Stickers and Remove sticker the X goes one step back.
    const BACK_TO = { main: null, stickers: 'main', remove: 'stickers' };
    let paneNow = 'main';
    const PANES = {
      main: () => ['Options', `
        <span class="opt-label">Notebook color</span>
        ${ed.colorChoicesHtml()}
        ${window.DF_SUITE ? '' : `<span class="opt-label opt-gap">Stickers</span>
        <button type="button" class="opt-wide" data-pane="stickers">Stickers</button>`}
        <span class="opt-label opt-gap">Start in</span>
        ${ed.startChoicesHtml()}`],
      stickers: () => ['Stickers', `
        <div class="opt-sticker-kinds">
          <button type="button" class="opt-sticker-kind" data-shape="circle"><span class="opt-shape is-circle"></span><span>Circle</span></button>
          <button type="button" class="opt-sticker-kind" data-shape="square"><span class="opt-shape is-square"></span><span>Square</span></button>
          <button type="button" class="opt-sticker-kind" data-shape="rect"><span class="opt-shape is-rect"></span><span>Rectangle</span></button>
        </div>
        ${ed.state.presentation.stickers.length ? '<button type="button" class="opt-wide opt-sticker-remove" data-pane="remove">Remove sticker</button>' : ''}`],
      remove: () => ['Remove sticker', `
        <div class="sun-remove-grid">${[...ed.state.presentation.stickers].reverse().map(s => `
          <button type="button" class="sun-remove" data-remove="${ed.escapeHtml(s.id)}" aria-label="Remove this sticker">
            <span class="sun-remove-photo is-${s.shape}" style="background-image:url('${photos.get(s.id) || ''}')"></span>
          </button>`).join('')}</div>`],
    };

    function showPane(name) {
      const [heading, html] = PANES[name]();
      const changed = name !== paneNow;
      paneNow = name;
      title.textContent = heading;
      body.innerHTML = html;
      if (changed) body.scrollTop = 0; // drawn again after a removal: keep the place
      closeBtn.setAttribute('aria-label', BACK_TO[name] ? 'Back' : 'Close');
    }

    function closeMenu() {
      overlay.hidden = true;
    }
    // The X and a tap on the dim: one step back, or shut on Options.
    function stepBack() {
      if (BACK_TO[paneNow]) showPane(BACK_TO[paneNow]);
      else closeMenu();
    }

    document.getElementById('bookSunBtn').addEventListener('click', () => {
      showPane('main');
      body.scrollTop = 0;
      overlay.hidden = false;
    });
    closeBtn.addEventListener('click', stepBack);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) stepBack(); });

    body.addEventListener('click', (e) => {
      const hit = e.target.closest('button');
      if (!hit) return;
      if (ed.pickLookChoice(hit, () => showPane('main'))) return;
      if (hit.dataset.pane) showPane(hit.dataset.pane);
      else if (hit.dataset.shape) {
        pendingShape = hit.dataset.shape;
        fileInput.value = '';
        fileInput.click();
      } else if (hit.dataset.remove) {
        const id = hit.dataset.remove;
        ed.state.presentation.stickers = ed.state.presentation.stickers.filter(s => s.id !== id);
        ed.saveState();
        photos.delete(id);
        ed.idbDeleteImages(ed.stickerKey(id)).catch(() => {});
        sun.creases.delete(id);
        sun.drawStickers();
        showPane(ed.state.presentation.stickers.length ? 'remove' : 'stickers');
      }
    });

    fileInput.addEventListener('change', () => {
      const file = fileInput.files && fileInput.files[0];
      const shape = pendingShape;
      if (!file || !shape) return;
      ed.resizeImageFile(file, 1800, 0.9).then(src => sun.startCrop(shape, src))
        .catch(() => ed.showToast("Couldn't open that photo"));
    });
  window.EyeParts.addSunStickerCrop(ed, sun);
  window.EyeParts.addSunStickerPlace(ed, sun);

    ed.refreshStickers();
  })();
};
