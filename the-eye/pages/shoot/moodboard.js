// The mood board, and boards from Ref (its Send to shoot, or + Import board).
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootMoodboard = function addShootMoodboard(ed) {
  Object.assign(ed, { renderMoodboard, loadRefBoardShoots, refBoardsFor, renderRefBoards, freezeShotBoardsSoon, dropRefBoardsFor, restoreRefBoards, openShootFromBoard });
  function renderMoodboard() {
    const grid = document.getElementById('moodboardGrid');
    grid.innerHTML = '';
    return ed.idbGetImages(ed.currentShootId).then(images => {
      grid.innerHTML = images.length ? '' : '<p class="empty-hint">No photos yet.</p>';
      images.forEach((img, idx) => {
        const item = document.createElement('div');
        item.className = 'moodboard-item';
        item.innerHTML = `
          <div class="moodboard-thumb">
            <img src="${img.src}" alt="" data-idx="${idx}" />
            <button type="button" class="moodboard-thumb-delete" data-idx="${idx}"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
          </div>
        `;
        grid.appendChild(item);
      });
      grid.querySelectorAll('.moodboard-thumb-delete').forEach(btn => {
        btn.addEventListener('click', async () => {
          // Taken before asking: the photo belongs to the shoot it was tapped on.
          const shootId = ed.currentShootId;
          if (!(await ed.askDeletePhoto())) return;
          ed.idbGetImages(shootId).then(imgs => {
            imgs.splice(Number(btn.dataset.idx), 1);
            return ed.idbSetImages(shootId, imgs);
          }).then(() => {
            renderMoodboard();
            ed.onShootImagesChanged(shootId, { board: true });
          });
        });
      });
      grid.querySelectorAll('.moodboard-thumb img').forEach(imgEl => {
        imgEl.addEventListener('click', () => {
          ed.openImageViewer(images, Number(imgEl.dataset.idx), ed.currentShootId, renderMoodboard);
        });
      });
    }).catch(() => { grid.innerHTML = ''; });
  }

  // ---------- Boards from Ref (its Send to shoot, or + Import board) ----------
  // Kept apart from this notebook's own data, in df-links (df-data.js): each
  // a link to a shoot plus the board's pages as pictures. One sent from Ref
  // inside Documenting Fictions stays live (Ref draws its pages again when it
  // changes) until the shoot is shot: then it's frozen, "Board as of" that
  // day. One imported from a file is fixed from the start.
  let refBoardUrls = [];
  const refBoardDay = iso => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  function refBoardLinks(match) {
    if (!ed.refApi) return Promise.resolve([]);
    return ed.refApi.linksWhere({ toApp: 'the-eye', type: 'moodboard', ...match }).catch(() => []);
  }
  function loadRefBoardShoots() {
    return refBoardLinks({}).then(links => {
      ed.refBoardShootIds = new Set(links.filter(l => l.toId && !l.pending).map(l => l.toId));
      return links;
    });
  }
  // A board with its pictures, ready to show: { link, cover, pages } as object URLs.
  // Its URLs go in `urls`, for whoever shows them to let go of later.
  function refBoardsFor(shootId, urls) {
    return refBoardLinks({ toId: shootId }).then(links => Promise.all(links.map(l =>
      ed.refApi.linkPictures(l.id).catch(() => null).then(p => {
        const url = pic => { const u = ed.refApi.pictureUrl(pic); if (u) urls.push(u); return u; };
        const pages = p && Array.isArray(p.pages) ? p.pages.map(url).filter(Boolean) : [];
        return { link: l, cover: p && p.cover ? url(p.cover) : (pages[0] || ''), pages };
      }))));
  }
  const refBoardState = l => l.importedAt ? `Imported ${refBoardDay(l.importedAt)}`
    : l.frozenAt ? `Board as of ${refBoardDay(l.frozenAt)}`
    : 'Live from Ref';
  const canOpenInRef = l => !!(ed.refApi && ed.refApi.inSuite() && l.fromId && !l.importedAt);
  const showRefBoardPages = b => { if (b.pages.length) ed.openImageViewer(b.pages.map(src => ({ src, caption: '' })), 0, null, null, false); };

  function renderRefBoards() {
    const box = document.getElementById('refBoards');
    document.getElementById('importRefBoardBtn').hidden = !ed.refApi;
    if (!ed.refApi) { box.hidden = true; return Promise.resolve(); }
    const shootId = ed.currentShootId;
    const urls = [];
    return refBoardsFor(shootId, urls).then(boards => {
      if (shootId !== ed.currentShootId) { urls.forEach(u => URL.revokeObjectURL(u)); return; }
      refBoardUrls.forEach(u => URL.revokeObjectURL(u));
      refBoardUrls = urls;
      box.innerHTML = '';
      box.hidden = !boards.length;
      box.closest('.moodboard-section').classList.toggle('has-ref-boards', boards.length > 0); // no "No photos yet." under a board
      boards.forEach(b => {
        const l = b.link;
        const n = l.photoCount || 0;
        const row = document.createElement('div');
        row.className = 'ref-board';
        row.innerHTML = `
          <button type="button" class="ref-board-cover" aria-label="See ${ed.escapeHtml(l.name || 'the board')}">${b.cover ? `<img src="${b.cover}" alt="" />` : ''}</button>
          <div class="ref-board-text">
            <button type="button" class="ref-board-name">${ed.escapeHtml(l.name || 'Mood board')}</button>
            <span class="ref-board-meta">${n} ${n === 1 ? 'image' : 'images'} · ${ed.escapeHtml(refBoardState(l))}</span>
            <div class="ref-board-actions">
              ${canOpenInRef(l) ? '<button type="button" class="manage-link inline-manage-link" data-ref-open>Open in Ref</button>' : ''}
              <button type="button" class="manage-link inline-manage-link" data-ref-detach>Detach</button>
            </div>
          </div>`;
        row.querySelector('.ref-board-cover').addEventListener('click', () => showRefBoardPages(b));
        row.querySelector('.ref-board-name').addEventListener('click', () => showRefBoardPages(b));
        const openBtn = row.querySelector('[data-ref-open]');
        if (openBtn) openBtn.addEventListener('click', () => {
          ed.saveShootNow();
          location.href = ed.refApi.notebookUrl('ref', { board: l.fromId });
        });
        row.querySelector('[data-ref-detach]').addEventListener('click', async () => {
          const yes = await ed.askConfirm({
            title: 'Detach this board?',
            text: l.importedAt ? 'It comes off this shoot.' : 'It comes off this shoot. The board stays in Ref.',
            confirmLabel: 'Detach', cancelLabel: 'Keep it', danger: true,
          });
          if (!yes) return;
          await ed.refApi.dropLinks([l.id]).catch(() => {});
          await loadRefBoardShoots();
          renderRefBoards();
        });
        box.appendChild(row);
      });
    });
  }

  // + Import board: a board file from a Ref installed on its own.
  document.getElementById('importRefBoardBtn').addEventListener('click', () => {
    if (!ed.refApi) return;
    const shootId = ed.currentShootId;
    ed.refApi.pickFile('application/json,.json') // straight from the tap, or iOS won't open the picker
      .then(file => file && ed.refApi.readBoardFile(file))
      .then(got => {
        if (!got || shootId !== ed.currentShootId || ed.shootModalOverlay.hidden) return null;
        // A shoot not saved yet is saved now, so the board has a shoot to be on.
        if (!ed.state.shoots.some(x => x.id === shootId)) ed.autosaveShoot(true);
        const now = new Date().toISOString();
        return ed.refApi.saveLink({
          fromApp: 'ref', fromId: got.board.id, toApp: 'the-eye', toId: shootId, type: 'moodboard',
          name: got.board.name, pageCount: got.board.pageCount, photoCount: got.board.photoCount,
          drawnAt: now, frozenAt: null, importedAt: now, pending: false,
        }, got.pictures);
      })
      .then(saved => {
        if (!saved) return null;
        ed.showToast(`${saved.name} is on this shoot`);
        return loadRefBoardShoots().then(renderRefBoards);
      })
      .catch(err => ed.showToast((err && err.message) || "That board couldn't be imported."));
  });

  // Once a shoot is shot (Captured onward) or put away, its boards stop changing.
  function freezeShotBoardsSoon() {
    if (!ed.refApi || !ed.refBoardShootIds.size) return;
    clearTimeout(ed.refFreezeTimer);
    ed.refFreezeTimer = setTimeout(freezeShotBoards, 400);
  }
  function freezeShotBoards() {
    return refBoardLinks({}).then(links => {
      const shot = links.filter(l => {
        if (l.frozenAt || l.importedAt || l.pending || !l.toId) return false;
        const s = ed.state.shoots.find(x => x.id === l.toId);
        return !!s && (!!s.archived || ed.POST_CAPTURE_STATUSES.includes(s.status));
      });
      const now = new Date().toISOString();
      return Promise.all(shot.map(l => ed.refApi.saveLink({ ...l, frozenAt: now })));
    }).then(done => {
      if (done.length && !ed.shootModalOverlay.hidden) renderRefBoards();
    }).catch(() => {});
  }
  // A shoot deleted, or a new one left blank: its boards go with it (not from Ref).
  function dropRefBoardsFor(shootId) {
    if (!ed.refApi) return;
    refBoardLinks({ toId: shootId }).then(links => links.length && ed.refApi.dropLinks(links.map(l => l.id)))
      .then(() => loadRefBoardShoots()).catch(() => {});
  }
  // An old .json backup carries its boards, pictures as data URLs (the zip
  // backups carry df-links whole). One from before boards (no refBoards)
  // leaves the boards as they are.
  function restoreRefBoards(list) {
    if (!ed.refApi || !Array.isArray(list)) return Promise.resolve();
    const picture = u => fetch(u).then(r => r.blob()).then(b => b.arrayBuffer().then(bytes => ({ type: b.type || 'image/jpeg', bytes })));
    return refBoardLinks({})
      .then(old => old.length && ed.refApi.dropLinks(old.map(l => l.id)))
      .then(() => Promise.all(list.filter(b => b && b.link && b.link.id).map(b =>
        Promise.all([b.cover ? picture(b.cover) : null, Promise.all((b.pages || []).map(picture))])
          .then(([cover, pages]) => ed.refApi.saveLink(b.link, { cover, pages })))))
      .then(loadRefBoardShoots);
  }

  // Ref's + New shoot from this board: a new shoot, named for the board, with it on.
  function openShootFromBoard(linkId) {
    if (!ed.refApi) return;
    ed.refApi.getLink(linkId).then(l => {
      if (!l || !l.pending) return null;
      ed.openShootModal(null);
      const title = document.getElementById('shootTitle');
      title.value = l.name || '';
      ed.syncFieldFilledState(title);
      ed.updateShootRunningHead();
      ed.autosaveShoot(true);
      return ed.refApi.saveLink({ ...l, toId: ed.currentShootId, pending: false })
        .then(loadRefBoardShoots)
        .then(renderRefBoards);
    }).catch(() => {});
  }
  // On the way in: which shoots have boards, any shot since frozen, and a
  // new shoot from a board that never got made (left over a day) dropped.
  if (ed.refApi) {
    ed.refBoardsReady = loadRefBoardShoots().then(links => {
      const stale = links.filter(l => l.pending && Date.now() - Date.parse(l.createdAt) > 86400000).map(l => l.id);
      if (stale.length) ed.refApi.dropLinks(stale).catch(() => {});
      if (ed.refBoardShootIds.size) { ed.renderAll(); freezeShotBoards(); }
    });
  }

  document.getElementById('addMoodboardPhotos').addEventListener('click', () => {
    document.getElementById('moodboardFileInput').click();
  });

  document.getElementById('moodboardFileInput').addEventListener('change', (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    if (!files.length) return;
    // The photos belong to the shoot they were picked on, even if resizing
    // takes long enough for that shoot to be closed and another opened.
    const uploadShootId = ed.currentShootId;
    const stillOpen = () => ed.currentShootId === uploadShootId && !ed.shootModalOverlay.hidden;
    let coverSet = false;
    Promise.all(files.map(f => ed.resizeImageFile(f, 1280, 0.72)))
      .then(newImages => {
        // A never-saved draft that was closed in the meantime is gone (its
        // rows were cleared on close) — don't leave orphaned photos behind.
        if (!stillOpen() && !ed.state.shoots.some(x => x.id === uploadShootId)) return null;
        return ed.idbGetImages(uploadShootId).then(existing => {
          const savedShoot = ed.state.shoots.find(x => x.id === uploadShootId);
          const hasCover = stillOpen() ? !!ed.pendingProjectPhoto : !!(savedShoot && savedShoot.projectPhoto);
          const shouldAutoSetProjectPhoto = existing.length === 0 && !hasCover && newImages.length > 0;
          const combined = existing.concat(newImages.map(src => ({ src, caption: '' })));
          return ed.idbSetImages(uploadShootId, combined).then(() => {
            if (shouldAutoSetProjectPhoto) {
              return ed.resizeDataUrlThumb(newImages[0], 200, 0.6).then(thumb => {
                coverSet = true;
                if (stillOpen()) ed.pendingProjectPhoto = thumb;
                else {
                  const live = ed.state.shoots.find(x => x.id === uploadShootId);
                  if (live) live.projectPhoto = thumb;
                }
                return ed.savePhotoToIdb(ed.projectPhotoKey(uploadShootId), thumb);
              });
            }
          }).then(() => true);
        });
      })
      .then((uploaded) => {
        if (!uploaded) return;
        if (stillOpen()) {
          ed.shootHasImages = true;
          ed.scheduleShootAutosave();
          renderMoodboard();
        } else {
          ed.renderAll();
        }
        ed.onShootImagesChanged(uploadShootId, { board: true, cover: coverSet });
      })
      .catch(ed.noteStorageFull);
  });
};
