// Export previous shoots: their order and pictures.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addPdfArchiveImages = function addPdfArchiveImages(ed) {
  Object.assign(ed, { archiveExportLabel, compareShootsForArchive, gatherArchiveImages });
  function archiveExportLabel(shoots) {
    const count = shoots.length;
    const dated = shoots.map(s => s.date).filter(Boolean).sort();
    if (!dated.length) return `Shoot archive (${count} shoot${count === 1 ? '' : 's'})`;
    const first = ed.formatDateDots(dated[0]);
    const last = ed.formatDateDots(dated[dated.length - 1]);
    const range = first === last ? first : `${first}-${last}`;
    return `Shoot archive ${range} (${count} shoot${count === 1 ? '' : 's'})`;
  }

  function compareShootsForArchive(a, b) {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return b.date.localeCompare(a.date);
  }

  // Every image collection a shoot owns, gathered up front so the archive
  // builder can lay each one out as a plain image grid alongside the text
  // sections — this is the one thing the single-shoot call sheet doesn't
  // need, since it only ever embeds talent photos and the in-progress mood
  // board there.
  async function gatherArchiveImages(shoot) {
    const [coverEntries, moodboard, finalImages, talentPhotos] = await Promise.all([
      ed.idbGetImages(ed.projectPhotoKey(shoot.id)),
      ed.idbGetImages(shoot.id),
      ed.idbGetImages(ed.finalImagesKey(shoot.id)),
      Promise.all((shoot.talents || []).map(async (t, idx) => {
        if (!t.id) return null;
        const src = ed.photoFromEntries(await ed.idbGetImages(ed.talentPhotoKey(shoot.id, t.id)));
        if (!src) return null;
        return { src, label: ed.hasText(t.name) ? t.name.trim() : `Talent ${idx + 1}` };
      })),
    ]);
    return {
      cover: ed.photoFromEntries(coverEntries),
      moodboard,
      finalImages,
      talentPhotos: talentPhotos.filter(Boolean),
    };
  }
};
