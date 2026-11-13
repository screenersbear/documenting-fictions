// Mood boards and final images, kept in the phone's database (IndexedDB).
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addImageStore = function addImageStore(ed) {
  Object.assign(ed, { idbTransaction, normalizeMoodboardImages, idbGetImages, idbGetManyImages, idbSetImages, idbDeleteImages, noteImagesWritten, finalImagesKey, journalImagesKey, journalEntryImagesKey });
  // ---------- mood board / final image storage (IndexedDB) ----------
  // One connection for the whole session: opening a fresh one for every read
  // was most of what a launch spent waiting on photos (a cover and each
  // talent photo per shoot), on iPhone especially.
  let idbConnection = null;

  function idbOpen() {
    if (!idbConnection) {
      const opening = new Promise((resolve, reject) => {
        const req = indexedDB.open(ed.IDB_NAME, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(ed.IDB_STORE);
        req.onsuccess = () => {
          const db = req.result;
          // Closed out from under us (another tab upgrading, or the browser
          // dropping it): the next call opens a new one — unless a newer
          // connection has already taken this one's place.
          const forget = () => { if (idbConnection === opening) idbConnection = null; };
          db.onversionchange = () => { db.close(); forget(); };
          db.onclose = forget;
          resolve(db);
        };
        req.onerror = () => reject(req.error);
      });
      opening.catch(() => { if (idbConnection === opening) idbConnection = null; });
      idbConnection = opening;
    }
    return idbConnection;
  }

  // Runs one transaction. `run(store)` queues its requests and may return a
  // function that reads their results; the promise settles with that once
  // the whole transaction has. iOS can lose the shared connection while the
  // app sits in the background — a transaction that can't start on it, or
  // dies with the "connection lost" kind of error, gets one retry on a
  // fresh connection.
  function idbTransaction(mode, run, retried) {
    const connection = idbOpen();
    const retry = (err) => {
      if (retried) throw err;
      // Only if it's still the one that failed: a read that failed alongside
      // may already have opened its replacement.
      if (idbConnection === connection) idbConnection = null;
      return idbTransaction(mode, run, true);
    };
    return connection.then(db => {
      let tx;
      try {
        tx = db.transaction(ed.IDB_STORE, mode);
      } catch (err) {
        try { db.close(); } catch (e) { /* already gone */ }
        return retry(err);
      }
      return new Promise((resolve, reject) => {
        let settled = false;
        const fail = (e) => {
          if (settled) return;
          settled = true;
          // A request that fails (a full store comes as one on iPhone, a
          // QuotaExceededError on the put) reaches tx.onerror as its error
          // bubbles up, before the transaction has aborted — tx.error is
          // still null then, so it's read off the request instead. Without
          // that the storage-full notice was handed null and stayed quiet.
          let err = tx.error;
          if (!err && e && e.target && e.target !== tx) {
            try { err = e.target.error; } catch (x) { /* not finished */ }
          }
          if (err && (err.name === 'UnknownError' || err.name === 'InvalidStateError')) {
            try { db.close(); } catch (e) { /* already gone */ }
            Promise.resolve().then(() => retry(err)).then(resolve, reject);
          } else {
            reject(err);
          }
        };
        let read;
        try {
          read = run(tx.objectStore(ed.IDB_STORE));
        } catch (err) {
          settled = true;
          try { tx.abort(); } catch (e) { /* already finished */ }
          reject(err);
          return;
        }
        tx.oncomplete = () => {
          if (settled) return;
          settled = true;
          resolve(typeof read === 'function' ? read() : undefined);
        };
        tx.onerror = fail;
        tx.onabort = fail;
      });
    });
  }

  // Old shoots stored images as plain data-URL strings; normalize to
  // { src, caption } objects so callers never have to branch on shape.
  function normalizeMoodboardImages(images) {
    return (images || []).map(img => (typeof img === 'string' ? { src: img, caption: '' } : img));
  }

  function idbGetImages(key) {
    return idbTransaction('readonly', store => {
      const req = store.get(key);
      return () => normalizeMoodboardImages(req.result);
    });
  }

  // Several keys in one transaction: a Map of key -> images ([] if none).
  function idbGetManyImages(keys) {
    return idbTransaction('readonly', store => {
      const reqs = keys.map(key => [key, store.get(key)]);
      return () => new Map(reqs.map(([key, req]) => [key, normalizeMoodboardImages(req.result)]));
    });
  }

  function idbSetImages(key, images) {
    forgetCachedImages(key);
    return idbTransaction('readwrite', store => { store.put(images, key); }).then(() => noteImagesWritten(key));
  }

  function idbDeleteImages(key) {
    forgetCachedImages(key);
    return idbTransaction('readwrite', store => { store.delete(key); }).then(() => noteImagesWritten(key));
  }

  // Images already read for the Journal list, by key, so redrawing it (every
  // renderAll — each tab switch) draws them straight away instead of
  // emptying every photo strip and filling it again a moment later.
  const journalListImageCache = new Map(); ed.journalListImageCache = journalListImageCache;

  function forgetCachedImages(key) {
    if (key === null) journalListImageCache.clear();
    else journalListImageCache.delete(key);
  }

  // Once a write has landed: anything that keeps its own copy reads again.
  // The Archive slideshow keeps what it last read (see
  // renderArchiveSlideshow) — a write to any final images, or clearing the
  // lot (key null), sends it back to read. Kept off the write's own promise
  // chain, so nothing here can make a write that succeeded look like it
  // failed.
  function noteImagesWritten(key) {
    forgetCachedImages(key);
    setTimeout(() => {
      // A list drawn mid-write could have cached the old copy.
      if (key !== null && !ed.views.journal.hidden && journalListImageCache.has(key)) {
        journalListImageCache.delete(key);
        ed.renderJournal();
      }
      if (key !== null && !String(key).endsWith('__final')) return;
      ed.archiveSlideshowStale = true;
      if (ed.archiveSlideshowLoaded) ed.renderArchiveSlideshow();
    }, 0);
  }

  function finalImagesKey(shootId) {
    return shootId + '__final';
  }

  function journalImagesKey(entryId) {
    return entryId + '__journal';
  }

  // Linked entries share their source shoot's final-images store (see
  // currentJournalImagesKey() for the same rule applied to the open modal);
  // this is the list-view equivalent for looking up any entry's images.
  function journalEntryImagesKey(e) {
    return e.sourceShootId ? finalImagesKey(e.sourceShootId) : journalImagesKey(e.id);
  }
};
