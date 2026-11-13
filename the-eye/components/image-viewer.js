// The image viewer: a picture full size (mood boards, final images, the Journal).
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addImageViewer = function addImageViewer(ed) {
  Object.assign(ed, { openImageViewer, showViewerImage, saveViewerCaption, closeImageViewer });
  // ---------- Image viewer (full-size view, shared by mood board + final images + journal photos) ----------
  const imageViewerOverlay = document.getElementById('imageViewerOverlay');
  const imageViewerImg = document.getElementById('imageViewerImg');
  const imageViewerMenu = document.getElementById('imageViewerMenu');
  const imageViewerMenuBtn = document.getElementById('imageViewerMenuBtn');
  const imageViewerStage = document.getElementById('imageViewerStage'); ed.imageViewerStage = imageViewerStage;
  const imageViewerCaptionOverlay = document.getElementById('imageViewerCaptionOverlay'); ed.imageViewerCaptionOverlay = imageViewerCaptionOverlay;
  const imageViewerCaptionText = document.getElementById('imageViewerCaptionText');
  const imageViewerAddCaptionBtn = document.getElementById('imageViewerAddCaptionBtn'); ed.imageViewerAddCaptionBtn = imageViewerAddCaptionBtn;
  const imageViewerCaptionInput = document.getElementById('imageViewerCaptionInput'); ed.imageViewerCaptionInput = imageViewerCaptionInput;
  ed.viewerImages = [];
  ed.viewerIndex = null;
  let viewerStorageKey = null;
  let viewerOnUpdate = null;

  function renderViewerCaption() {
    const img = ed.viewerImages[ed.viewerIndex];
    const caption = (img && img.caption) || '';
    imageViewerCaptionOverlay.hidden = !caption;
    imageViewerCaptionOverlay.classList.remove('caption-faded');
    imageViewerCaptionText.textContent = caption;
    imageViewerAddCaptionBtn.textContent = caption ? 'Edit caption' : '+ Add caption';
    // Captions live in the IndexedDB collection the viewer was opened from, so
    // an image with no collection behind it (a talent photo, stored on the
    // talent object) can't offer them.
    imageViewerAddCaptionBtn.hidden = !viewerStorageKey;
    imageViewerCaptionInput.hidden = true;
  }

  // onUpdate re-renders whichever grid opened the viewer after a caption
  // edit; allowProjectPhoto hides the shoot-only "set as project photo"
  // menu when the viewer is opened from a context with no project photo
  // (e.g. journal entry photos).
  function openImageViewer(images, idx, storageKey, onUpdate, allowProjectPhoto) {
    ed.viewerImages = images;
    ed.viewerIndex = idx;
    viewerStorageKey = storageKey;
    viewerOnUpdate = onUpdate || null;
    imageViewerImg.src = images[idx].src;
    imageViewerMenu.hidden = true;
    imageViewerMenuBtn.hidden = allowProjectPhoto === false;
    renderViewerCaption();
    imageViewerOverlay.hidden = false;
    allowViewportZoom(true);
  }

  // The page's own viewport meta pins maximum-scale=1 (no pinch-zoom
  // anywhere) so an accidental double-tap doesn't zoom the whole app while
  // filling out a form — but that blocks pinch-zoom on a full-screen photo
  // too, e.g. a mood board image in Shoot Mode, where it's exactly what
  // you'd want. Relaxed only while the image viewer is open, restored the
  // moment it closes, so the rest of the app keeps its normal no-zoom feel.
  function allowViewportZoom(allow) {
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;
    meta.setAttribute(
      'content',
      allow
        ? 'width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=5, interactive-widget=resizes-content'
        : 'width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, interactive-widget=resizes-content'
    );
  }

  function showViewerImage(idx) {
    if (idx < 0 || idx >= ed.viewerImages.length || idx === ed.viewerIndex) return;
    if (!imageViewerCaptionInput.hidden) saveViewerCaption(imageViewerCaptionInput.value.trim());
    ed.viewerIndex = idx;
    imageViewerImg.src = ed.viewerImages[idx].src;
    renderViewerCaption();
  }

  function saveViewerCaption(newCaption) {
    // No collection key means nothing to write back to (see renderViewerCaption).
    if (!viewerStorageKey) return;
    const key = viewerStorageKey;
    const index = ed.viewerIndex;
    ed.idbGetImages(key).then(imgs => {
      // Opening the caption box and leaving it as it was isn't an edit —
      // nothing to write, and (for a multi-day project) nothing to mirror.
      if (!imgs[index] || (imgs[index].caption || '') === newCaption) {
        renderViewerCaption();
        return;
      }
      imgs[index].caption = newCaption;
      ed.viewerImages = imgs;
      return ed.idbSetImages(key, imgs).then(() => {
        renderViewerCaption();
        if (viewerOnUpdate) viewerOnUpdate();
        // A mood board's key is its shoot id (final images and journal
        // photos use other keys, which onShootImagesChanged ignores).
        ed.onShootImagesChanged(key, { board: true });
      });
    });
  }

  function closeImageViewer() {
    if (!imageViewerCaptionInput.hidden) saveViewerCaption(imageViewerCaptionInput.value.trim());
    imageViewerOverlay.hidden = true;
    imageViewerMenu.hidden = true;
    allowViewportZoom(false);
  }

  document.getElementById('closeImageViewer').addEventListener('click', closeImageViewer);

  document.getElementById('imageViewerMenuBtn').addEventListener('click', () => {
    imageViewerMenu.hidden = !imageViewerMenu.hidden;
  });

  document.getElementById('setProjectPhotoFromViewer').addEventListener('click', () => {
    const img = ed.viewerImages[ed.viewerIndex];
    if (!img) return;
    imageViewerMenu.hidden = true;
    ed.openProjectPhotoCrop(img.src);
  });

  document.getElementById('deleteImageFromViewer').addEventListener('click', async () => {
    imageViewerMenu.hidden = true;
    if (!ed.viewerImages[ed.viewerIndex]) return;
    // Which photo is taken before asking, so it's the one that was showing.
    const deletedIndex = ed.viewerIndex;
    const key = viewerStorageKey;
    if (!(await ed.askDeletePhoto())) return;
    // Only while the viewer's still up on the same photos — it should be,
    // with the popup sitting over it.
    if (imageViewerOverlay.hidden || viewerStorageKey !== key) return;
    ed.idbGetImages(key).then(imgs => {
      imgs.splice(deletedIndex, 1);
      return ed.idbSetImages(key, imgs).then(() => imgs);
    }).then(imgs => {
      ed.viewerImages = imgs;
      if (viewerOnUpdate) viewerOnUpdate();
      ed.onShootImagesChanged(key, { board: true });
      if (!imgs.length) {
        closeImageViewer();
        return;
      }
      ed.viewerIndex = Math.min(deletedIndex, imgs.length - 1);
      imageViewerImg.src = imgs[ed.viewerIndex].src;
      renderViewerCaption();
    });
  });
};
