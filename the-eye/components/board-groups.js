// A mood board's PDFs (round 7, 16-mood-board-pdf): each page of a PDF
// added with ADD is one photo of the board, kept with the file's name
// (photo.pdf), and the board shows them together under it ("From
// Lookbook.pdf · 8 pages"). Photos and names in, words out (no page, no
// saved data), so it's unit tested (tests/unit/the-eye/board-groups.test.mjs).
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addBoardGroups = function addBoardGroups(ed) {
  Object.assign(ed, { isPdfFile, pdfRuns, pdfRunWords, pdfAddedWords });

  // A PDF by its type, or by its name when the phone gives no type.
  function isPdfFile(file) {
    return !!file && (file.type === 'application/pdf' || (!file.type && /\.pdf$/i.test(file.name || '')));
  }

  // Where each PDF's pages start on the board, and how many follow on from
  // the same file: [{ at, name, count }]. Photos not from a PDF start none.
  function pdfRuns(images) {
    const runs = [];
    (images || []).forEach((img, at) => {
      const name = img && typeof img.pdf === 'string' ? img.pdf : '';
      const last = runs[runs.length - 1];
      if (!name) return;
      if (last && last.name === name && last.at + last.count === at) last.count += 1;
      else runs.push({ at, name, count: 1 });
    });
    return runs;
  }

  const pages = n => `${n} ${n === 1 ? 'page' : 'pages'}`;
  // Over a PDF's pages on the board.
  function pdfRunWords(run) {
    return `From ${run.name} · ${pages(run.count)}`;
  }
  // Once they're in: each PDF ([{ name, count }]) and its pages.
  function pdfAddedWords(runs) {
    if (runs.length > 1) return `The pages of ${runs.length} PDFs are on the mood board, one photo each.`;
    const { name, count } = runs[0];
    return count === 1 ? `The page of ${name} is on the mood board, as a photo.` : `All ${count} pages of ${name} are on the mood board, one photo each.`;
  }
};
