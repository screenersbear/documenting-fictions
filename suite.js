// Documenting Fictions: loaded first by each notebook (as ../suite.js) when it
// lives inside the suite. A notebook copied out on its own has no ../suite.js,
// so this never runs there and the notebook is a standalone app: its own shut
// book, its own Options. Inside the suite the shelf is the shut book, and each
// notebook's Options are in its own menu, at the top of its first page.
(function () {
  var parts = location.pathname.split('/');
  var id = parts[parts.length - 2];
  var here = parts.slice(0, -1).join('/') + '/';
  var q = new URLSearchParams(location.search);
  var at = q.get('at'); // a tab on the shelf's book: open at that section
  var read = function (k) { try { return localStorage.getItem(k); } catch (e) { return '1'; } };
  var store = function (k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* private mode */ } };
  store('df-suite-in', id); // launched again later, the app comes back in here
  // The notebook's own shut book never shows in here, not even for the moment
  // before its script runs (it used to flash up as the notebook opened).
  document.documentElement.classList.add('df-suite');
  var hide = document.createElement('style');
  hide.textContent = 'html.df-suite body > #book { display: none !important; }';
  document.head.appendChild(hide);
  var WELCOMED = 'df-suite-welcomed-' + id;
  window.DF_SUITE = {
    id: id,
    options: false, // (the shelf no longer opens a notebook's Options over its shut book)
    at: at,
    // Anything else on the link, for one notebook opening another at a
    // particular thing: ?entry=<id> in Overthoughts, ?shoot=<id> in The Eye.
    get: function (k) { return q.get(k); },
    // Shut: back to the shelf, which shrinks the page back into this book.
    home: function (quiet) {
      store('df-suite-in', null);
      location.replace('../?from=' + encodeURIComponent(id) + (quiet ? '&still' : ''));
    },
    // The first time each notebook is opened in here (user, 11-12): how to get
    // back to the shelf, then an offer of the notebook's own tour; turned
    // down, where the tour is kept. Each notebook draws these cards in its own
    // sheets, with these words, then calls welcomed().
    firstVisit: read(WELCOMED) !== '1',
    welcomed: function () { store(WELCOMED, '1'); this.firstVisit = false; },
    words: function (name) {
      return {
        back: ['Back to your notebooks', 'Swipe right along the bar at the bottom of the screen until this notebook shuts. That takes you back to all four.'],
        ask: ['Take the tour?', 'A few quick cards on how ' + name + ' works.', 'Show me', 'Not now'],
        later: ['Any time', 'Each notebook has its own menu at the top of its first page. The tour is in there too, under How it works.', 'Got it'],
      };
    },
  };
  // A reload shouldn't do it all again.
  if (location.search) history.replaceState(history.state, '', here + location.hash);
})();
