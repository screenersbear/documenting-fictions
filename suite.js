// Documenting Fictions: loaded first by each notebook (as ../suite.js) when it
// lives inside the suite. A notebook copied out on its own has no ../suite.js,
// so this never runs there and the notebook is a standalone app: its own shut
// book, its own Options. Inside the suite the shelf is the shut book.
(function () {
  var parts = location.pathname.split('/');
  var id = parts[parts.length - 2];
  var here = parts.slice(0, -1).join('/') + '/';
  var q = new URLSearchParams(location.search);
  var options = q.has('options'); // the shelf's logo button: this notebook's Options, over its shut book
  var at = q.get('at');            // a tab on the shelf's book: open at that section
  var store = function (k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* private mode */ } };
  if (!options) store('df-suite-in', id); // launched again later, the app comes back in here
  window.DF_SUITE = {
    id: id,
    options: options,
    at: at,
    // Shut: back to the shelf, which shrinks the page back into this book.
    home: function (quiet) {
      store('df-suite-in', null);
      location.replace('../?from=' + encodeURIComponent(id) + (quiet ? '&still' : ''));
    },
    // Options opened from the shelf: once every sheet has closed, and nothing
    // else is under way (a sticker going on the cover, say), back to the shelf.
    whenOptionsDone: function (stillBusy) {
      var seen = false, timer = 0;
      var mo = new MutationObserver(function () {
        if (document.body.classList.contains('sheet-open')) { seen = true; return; }
        if (!seen) return;
        clearTimeout(timer);
        timer = setTimeout(function () {
          if (document.body.classList.contains('sheet-open') || stillBusy()) return;
          mo.disconnect();
          window.DF_SUITE.home(true);
        }, 350);
      });
      mo.observe(document.body, { attributes: true, attributeFilter: ['class'], childList: true, subtree: true });
    },
  };
  // A reload shouldn't open Options again.
  if (location.search) history.replaceState(history.state, '', here + location.hash);
})();
