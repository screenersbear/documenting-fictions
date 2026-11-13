// The title's jump menu, and keeping it in step with the scrolling.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootTitleJump = function addShootTitleJump(ed) {
  Object.assign(ed, { updateShootModalJumpMenuVisibility, closeShootModalJumpMenu });
  // ---- Title jump menu + scrollspy ----
  const shootModalTitleBtn = document.getElementById('shootModalTitleBtn');
  const shootModalJumpMenu = document.getElementById('shootModalJumpMenu');

  // Post-shoot Reflection is the only section that can be entirely absent
  // from the form (pre-capture shoots), so its jump-menu item has to track
  // that same visibility rather than always being offered.
  function updateShootModalJumpMenuVisibility() {
    document.getElementById('jumpToPostShootItem').hidden = document.getElementById('postShootContent').hidden;
  }

  function closeShootModalJumpMenu() {
    shootModalJumpMenu.hidden = true;
    shootModalTitleBtn.classList.remove('open');
  }

  shootModalTitleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = shootModalJumpMenu.hidden;
    shootModalJumpMenu.hidden = !willOpen;
    shootModalTitleBtn.classList.toggle('open', willOpen);
  });

  shootModalJumpMenu.addEventListener('click', (e) => {
    const item = e.target.closest('.modal-title-jump-item');
    if (!item) return;
    closeShootModalJumpMenu();
    // Basic Info is the very first section, with the shoot-mode button and
    // the folder-tab decoration sitting above its heading — scrollIntoView
    // on the heading itself stops right at its own top edge, leaving that
    // bit still scrolled past. Scrolling the modal to 0 always reaches the
    // true top of the page instead.
    if (item.dataset.jump === 'basicInfoHeading') {
      ed.shootModalOverlay.querySelector('.modal').scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    const target = document.getElementById(item.dataset.jump);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.addEventListener('click', (e) => {
    if (shootModalJumpMenu.hidden) return;
    if (!shootModalJumpMenu.contains(e.target) && !shootModalTitleBtn.contains(e.target)) {
      closeShootModalJumpMenu();
    }
  });
};
