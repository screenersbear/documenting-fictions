// Cropping a project's photo: drag to move it, the slider to zoom.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addProjectsPhotoCrop = function addProjectsPhotoCrop(ed) {
  Object.assign(ed, { openProjectPhotoCrop });
  // ---------- Project photo crop (drag to reposition, slider to zoom) ----------
  const cropOverlay = document.getElementById('projectPhotoCropOverlay');
  const cropStage = document.getElementById('cropStage');
  const cropImg = document.getElementById('cropImg');
  const cropZoomSlider = document.getElementById('cropZoomSlider');
  let cropBaseScale = 1;
  let cropZoom = 1;
  let cropOffsetX = 0;
  let cropOffsetY = 0;
  let cropStageWidth = 0;
  let cropStageHeight = 0;
  let cropDragging = false;
  let cropDragStartX = 0;
  let cropDragStartY = 0;
  let cropDragOffsetStartX = 0;
  let cropDragOffsetStartY = 0;
  const cropActivePointers = new Map();
  let cropPinchPrevDist = 0;
  // Set when the crop is opened from the shoot options kebab menu's project
  // photo picker (no shoot form open to autosave through) — confirming the
  // crop then writes straight to state.shoots by id instead of going through
  // pendingProjectPhoto/scheduleShootAutosave.
  ed.cropTargetShootId = null;

  // Keeps the image covering the full crop rectangle at all times — the
  // user can zoom in and reposition, but never past an edge into empty space.
  function clampCropOffsets() {
    const dispW = cropImg.naturalWidth * cropBaseScale * cropZoom;
    const dispH = cropImg.naturalHeight * cropBaseScale * cropZoom;
    const minX = Math.min(0, cropStageWidth - dispW);
    const minY = Math.min(0, cropStageHeight - dispH);
    cropOffsetX = Math.min(0, Math.max(minX, cropOffsetX));
    cropOffsetY = Math.min(0, Math.max(minY, cropOffsetY));
  }

  function applyCropTransform() {
    clampCropOffsets();
    cropImg.style.transform = `translate(${cropOffsetX}px, ${cropOffsetY}px) scale(${cropBaseScale * cropZoom})`;
  }

  // 'project' crops to the shoot bubble's thumbnail (96x120, a 4:5 ratio);
  // 'talent' crops to the 4:5 talent card photo box — same ratio, different
  // absolute size. The stage's own ratio comes from CSS, and the base-scale
  // math below measures the live box, so switching modes is just a class
  // swap plus the matching output canvas size.
  let cropMode = 'project';
  const CROP_OUTPUT = {
    project: { width: 192, height: 240 },
    talent: { width: 240, height: 300 },
  };

  function openProjectPhotoCrop(src, mode) {
    cropMode = mode === 'talent' ? 'talent' : 'project';
    cropStage.classList.toggle('crop-stage-talent', cropMode === 'talent');
    document.getElementById('cropModalTitle').textContent =
      cropMode === 'talent' ? 'Crop talent photo' : 'Set cover photo';
    cropZoom = 1;
    cropZoomSlider.value = '1';
    cropActivePointers.clear();
    cropDragging = false;
    cropImg.onload = () => {
      const stageRect = cropStage.getBoundingClientRect();
      cropStageWidth = stageRect.width;
      cropStageHeight = stageRect.height;
      // Base scale matches object-fit:cover — the shorter side fills the rectangle.
      cropBaseScale = Math.max(cropStageWidth / cropImg.naturalWidth, cropStageHeight / cropImg.naturalHeight);
      const dispW = cropImg.naturalWidth * cropBaseScale;
      const dispH = cropImg.naturalHeight * cropBaseScale;
      cropOffsetX = (cropStageWidth - dispW) / 2;
      cropOffsetY = (cropStageHeight - dispH) / 2;
      applyCropTransform();
    };
    cropImg.src = src;
    cropOverlay.hidden = false;
  }

  function closeProjectPhotoCrop() {
    cropOverlay.hidden = true;
    ed.cropTargetShootId = null;
  }

  cropZoomSlider.addEventListener('input', () => {
    cropZoom = Number(cropZoomSlider.value);
    applyCropTransform();
  });

  // Single finger pans; a second finger switches to pinch-to-zoom, anchored
  // on the midpoint between the two touches each frame so the point under
  // your fingers stays put as you zoom (rather than fighting the single-
  // pointer drag math, which is what caused the jitter on a second touch).
  cropStage.addEventListener('pointerdown', (e) => {
    cropActivePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { cropStage.setPointerCapture(e.pointerId); } catch (err) { /* capture is a nice-to-have, not required */ }

    if (cropActivePointers.size === 1) {
      cropDragging = true;
      cropDragStartX = e.clientX;
      cropDragStartY = e.clientY;
      cropDragOffsetStartX = cropOffsetX;
      cropDragOffsetStartY = cropOffsetY;
    } else if (cropActivePointers.size === 2) {
      cropDragging = false;
      const [p1, p2] = [...cropActivePointers.values()];
      cropPinchPrevDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    }
  });

  cropStage.addEventListener('pointermove', (e) => {
    if (!cropActivePointers.has(e.pointerId)) return;
    cropActivePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (cropActivePointers.size >= 2) {
      const [p1, p2] = [...cropActivePointers.values()];
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (cropPinchPrevDist > 0) {
        const rect = cropStage.getBoundingClientRect();
        const midX = (p1.x + p2.x) / 2 - rect.left;
        const midY = (p1.y + p2.y) / 2 - rect.top;
        const scale = cropBaseScale * cropZoom;
        const px = (midX - cropOffsetX) / scale;
        const py = (midY - cropOffsetY) / scale;
        const newZoom = Math.min(3, Math.max(1, cropZoom * (dist / cropPinchPrevDist)));
        cropOffsetX = midX - px * (cropBaseScale * newZoom);
        cropOffsetY = midY - py * (cropBaseScale * newZoom);
        cropZoom = newZoom;
        cropZoomSlider.value = String(cropZoom);
        applyCropTransform();
      }
      cropPinchPrevDist = dist;
    } else if (cropDragging) {
      cropOffsetX = cropDragOffsetStartX + (e.clientX - cropDragStartX);
      cropOffsetY = cropDragOffsetStartY + (e.clientY - cropDragStartY);
      applyCropTransform();
    }
  });

  function endCropPointer(e) {
    cropActivePointers.delete(e.pointerId);
    if (cropActivePointers.size === 1) {
      const [remaining] = [...cropActivePointers.values()];
      cropDragging = true;
      cropDragStartX = remaining.x;
      cropDragStartY = remaining.y;
      cropDragOffsetStartX = cropOffsetX;
      cropDragOffsetStartY = cropOffsetY;
    } else {
      cropDragging = false;
    }
  }
  cropStage.addEventListener('pointerup', endCropPointer);
  cropStage.addEventListener('pointercancel', endCropPointer);

  document.getElementById('cropCloseBtn').addEventListener('click', closeProjectPhotoCrop);

  cropOverlay.addEventListener('click', (e) => {
    if (e.target === cropOverlay) closeProjectPhotoCrop();
  });

  document.getElementById('cropConfirmBtn').addEventListener('click', () => {
    const scale = cropBaseScale * cropZoom;
    const sWidth = cropStageWidth / scale;
    const sHeight = cropStageHeight / scale;
    const sx = -cropOffsetX / scale;
    const sy = -cropOffsetY / scale;
    // Output at the same ratio as the crop stage for the current mode, just at
    // a higher resolution than the on-screen box.
    const { width: outputWidth, height: outputHeight } = CROP_OUTPUT[cropMode];
    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    canvas.getContext('2d').drawImage(cropImg, sx, sy, sWidth, sHeight, 0, 0, outputWidth, outputHeight);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    const targetId = ed.cropTargetShootId;
    if (cropMode === 'talent') {
      // Held on the draft only — nothing persists (IndexedDB write, cover-
      // photo claim) until the talent popup's own Save commits it, same as
      // every other field in that popup.
      if (ed.talentModalDraft) {
        ed.talentModalDraft.photo = dataUrl;
        ed.renderTalentModalPhoto();
      }
      closeProjectPhotoCrop();
    } else if (targetId) {
      const idx = ed.state.shoots.findIndex(x => x.id === targetId);
      if (idx !== -1) {
        ed.state.shoots[idx] = { ...ed.state.shoots[idx], projectPhoto: dataUrl };
        ed.saveState();
        ed.savePhotoToIdb(ed.projectPhotoKey(targetId), dataUrl).catch(ed.noteStorageFull)
          .then(() => ed.onShootImagesChanged(targetId, { cover: true }));
        ed.renderAll();
      }
      closeProjectPhotoCrop();
      ed.closeShootOptions();
    } else {
      ed.pendingProjectPhoto = dataUrl;
      ed.scheduleShootAutosave();
      const coverShootId = ed.currentShootId;
      if (coverShootId) {
        ed.savePhotoToIdb(ed.projectPhotoKey(coverShootId), dataUrl).catch(ed.noteStorageFull)
          .then(() => ed.onShootImagesChanged(coverShootId, { cover: true }));
      }
      closeProjectPhotoCrop();
      ed.closeImageViewer();
    }
  });
};
