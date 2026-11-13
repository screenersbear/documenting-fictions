// Choosing the PDF's sections before it's built.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addPdfSections = function addPdfSections(ed) {
  Object.assign(ed, { openPdfSectionsModal });
  // ---------- PDF sections choice (shown before building, so the user can
  // opt out of sections they don't want in this particular share). Direction
  // and References default to OFF — Direction is internal creative planning
  // and References are inspiration links, neither of which usually belongs in
  // the copy that goes out to a client or talent, so they're opt-in.
  // Deliverables only shows for video shoots, and defaults ON. ----------
  let pdfSectionsShootId = null;

  function openPdfSectionsModal(id) {
    pdfSectionsShootId = id;
    const s = ed.state.shoots.find(x => x.id === id);
    document.getElementById('pdfSectionTalent').checked = true;
    document.getElementById('pdfSectionLogistics').checked = true;
    document.getElementById('pdfSectionDeliverables').checked = true;
    document.getElementById('pdfSectionDeliverablesRow').hidden = !ed.isVideoShoot(s);
    document.getElementById('pdfSectionDirection').checked = false;
    document.getElementById('pdfSectionReferences').checked = false;
    document.getElementById('pdfSectionTeam').checked = true;
    document.getElementById('pdfSectionMoodboard').checked = true;
    document.getElementById('pdfSectionMoodboardLabel').textContent = ed.moodboardTerm(s && s.category);
    document.getElementById('pdfSectionsOverlay').hidden = false;
  }

  function closePdfSectionsModal() {
    document.getElementById('pdfSectionsOverlay').hidden = true;
  }

  document.getElementById('pdfSectionsCloseBtn').addEventListener('click', closePdfSectionsModal);

  document.getElementById('pdfSectionsOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('pdfSectionsOverlay')) closePdfSectionsModal();
  });

  document.getElementById('pdfSectionsBuildBtn').addEventListener('click', () => {
    const id = pdfSectionsShootId;
    const chosenSections = {
      talent: document.getElementById('pdfSectionTalent').checked,
      logistics: document.getElementById('pdfSectionLogistics').checked,
      deliverables: document.getElementById('pdfSectionDeliverables').checked,
      direction: document.getElementById('pdfSectionDirection').checked,
      references: document.getElementById('pdfSectionReferences').checked,
      team: document.getElementById('pdfSectionTeam').checked,
      moodboard: document.getElementById('pdfSectionMoodboard').checked,
    };
    closePdfSectionsModal();
    if (id) ed.openPdfPreview(id, chosenSections);
  });
};
