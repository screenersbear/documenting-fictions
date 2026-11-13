// For the PDFs: the logo, picture sizes and a shoot's times.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addPdfHelpers = function addPdfHelpers(ed) {
  Object.assign(ed, { loadLogoDataUrl, getImageDims, fitContain, shootTimeRange });
  // ---------- Share shoot as PDF ----------
  let cachedLogoDataUrl = null;
  function loadLogoDataUrl() {
    if (cachedLogoDataUrl) return Promise.resolve(cachedLogoDataUrl);
    return fetch('logo.png')
      .then(res => res.blob())
      .then(blob => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => { cachedLogoDataUrl = reader.result; resolve(cachedLogoDataUrl); };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }));
  }

  function getImageDims(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
      img.onerror = () => resolve({ w: 1, h: 1 });
      img.src = src;
    });
  }

  function fitContain(w, h, boxW, boxH) {
    const scale = Math.min(boxW / w, boxH / h);
    return { w: w * scale, h: h * scale };
  }

  function shootTimeRange(s) {
    const start = ed.prettyTime(s.startTime);
    const end = ed.prettyTime(s.endTime);
    if (start && end) return `${start} – ${end}`;
    return start || end || '';
  }
};
