// Documenting Fictions: stickers on the notebooks' covers, on the shelf
// (user, 11-12). One kind of sticker for all four notebooks, kept here in one
// place, df-stickers, each one marked with the notebook it's on: a photo cut
// to a circle, square or rectangle, a little creased (the look Ref's had),
// stuck on the cover so it swings open with it. Past an edge it folds over:
// shaded where it bends, and on the right it runs on across the edge of the
// pages. Newest on top.
//
// Each notebook used to keep its own (Ref in its database, Contact Sheet as
// printed pictures in its meta, The Eye with its shoots); those are copied in
// here once, the first time the shelf opens with this, and left where they
// were.
//
//   df-stickers / stickers  { id, app, shape, ratio, x, y, size, seed, bytes, type, printed, createdAt }
//     x, y: its middle, as a share of the cover's width and height; size: its
//     width, as a share of the cover's width; ratio: width over height;
//     bytes: the photo (an ArrayBuffer: Safari's stored Blobs break when a
//     record is saved again); printed: the photo already has its paper edge
//     (Contact Sheet's prints), so none is drawn round it.
(function () {
  'use strict';
  const ed = {}; // what the stickers' parts share (the files it runs below)
  const DB = 'df-stickers', STORE = 'stickers'; ed.DB = DB; ed.STORE = STORE;
  const MOVED = 'df-stickers-moved'; ed.MOVED = MOVED;
  const COVER = 1000 / 1360; ed.COVER = COVER; // the cover's width over its height
  const RATIO = { circle: 1, square: 1, rect: 1.5 }; ed.RATIO = RATIO;
  const ratioOf = (s) => (s.shape === 'rect' && s.ratio > 0 ? s.ratio : RATIO[s.shape] || 1); ed.ratioOf = ratioOf;
  const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; ed.uid = uid;
  window.StickerParts.addStickerStore(ed);
  window.StickerParts.addStickerArt(ed);
  window.StickerParts.addNewSticker(ed);

  window.DFStickers = { ready: ed.ready, list: ed.listOf, paint: ed.paint, pick: ed.pick, crop: ed.crop, place: ed.stick, remove: ed.remove, putBack: ed.putBack, thumb: ed.urlOf, ratioOf };
})();
