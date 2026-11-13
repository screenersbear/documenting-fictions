// Loads someone else's library from lib/ the first time The Eye needs it,
// instead of with the page, so The Eye opens sooner: the PDF maker
// (jspdf.umd.min.js, 356 KB) when a PDF is made, the PDF viewer (pdf.min.js)
// when a preview opens. sw.js keeps a copy of each, so they load offline too.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addLoadLib = function addLoadLib(ed) {
  const loading = new Map(); // each library's one load, by its file

  // What the library puts on window (window[name]) once its file has run:
  // the same promise every time. If it can't load, it says so, and the next
  // try starts again.
  function loadLib(src, name) {
    if (!loading.has(src)) loading.set(src, window[name] ? Promise.resolve(window[name]) : addTag(src, name));
    return loading.get(src);
  }

  function addTag(src, name) {
    return new Promise((resolve, reject) => {
      const tag = document.createElement('script');
      tag.src = src;
      tag.onload = () => resolve(window[name]);
      tag.onerror = () => {
        loading.delete(src);
        tag.remove();
        reject(new Error(`${src} did not load`));
      };
      document.head.appendChild(tag);
    });
  }

  Object.assign(ed, { loadLib });
};
