// The image viewer: swiping between pictures and writing a caption.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addImageViewerTouch = function addImageViewerTouch(ed) {
  // Tapping the photo itself fades the caption band in/out so it doesn't
  // permanently block the image; the "add/edit caption" control stays put.
  ed.imageViewerStage.addEventListener('click', () => {
    if (ed.imageViewerCaptionOverlay.hidden) return;
    ed.imageViewerCaptionOverlay.classList.toggle('caption-faded');
  });

  // Swipe left/right to move between images without leaving the viewer.
  let viewerTouchStartX = null;
  let viewerTouchStartY = null;

  ed.imageViewerStage.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) { viewerTouchStartX = null; return; }
    viewerTouchStartX = e.touches[0].clientX;
    viewerTouchStartY = e.touches[0].clientY;
  }, { passive: true });

  ed.imageViewerStage.addEventListener('touchend', (e) => {
    if (viewerTouchStartX === null) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - viewerTouchStartX;
    const dy = endY - viewerTouchStartY;
    viewerTouchStartX = null;
    viewerTouchStartY = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    ed.showViewerImage(ed.viewerIndex + (dx < 0 ? 1 : -1));
  }, { passive: true });

  ed.imageViewerAddCaptionBtn.addEventListener('click', () => {
    const img = ed.viewerImages[ed.viewerIndex];
    ed.imageViewerCaptionInput.value = (img && img.caption) || '';
    ed.imageViewerAddCaptionBtn.hidden = true;
    ed.imageViewerCaptionInput.hidden = false;
    ed.imageViewerCaptionInput.focus();
  });

  ed.imageViewerCaptionInput.addEventListener('change', () => {
    ed.saveViewerCaption(ed.imageViewerCaptionInput.value.trim());
  });
};
