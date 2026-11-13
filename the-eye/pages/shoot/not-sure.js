// The honest answers on a shoot's page and in the guide: "Date not set" and
// "Location to be decided" (shown while those are empty) and "Not sure yet"
// about the team. Each counts as answered (components/shoot-stage.js) and is
// saved in the shoot's notSure list until the real thing is filled in.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootNotSure = function addShootNotSure(ed) {
  Object.assign(ed, { loadNotSure, syncNotSure, notSureNow });
  const picked = new Set();
  const CHIPS = { date: 'dateNotSetBtn', location: 'locationNotSetBtn', team: 'teamNotSureBtn' };
  const hasPlace = () => ['name', 'street', 'city'].some(k => ed.hasText(ed.currentShootLocation[k]));

  // As the shoot was saved, when it opens.
  function loadNotSure(shoot) {
    picked.clear();
    ((shoot && shoot.notSure) || []).forEach(key => picked.add(key));
    syncNotSure();
  }

  // The list to save: the ones still standing.
  function notSureNow(data) {
    return ed.stillNotSure({ ...data, notSure: [...picked] });
  }

  // Each chip shows whether it's picked; the date's and the place's step
  // aside once there's a real one.
  function syncNotSure() {
    Object.entries(CHIPS).forEach(([key, id]) => {
      const chip = document.getElementById(id);
      const on = picked.has(key) && (key !== 'team' || !ed.getTeamRequiredChoice());
      chip.classList.toggle('active', on);
      chip.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
    document.getElementById('dateNotSetBtn').hidden = ed.hasText(document.getElementById('shootDate').value);
    document.getElementById('locationNotSetBtn').hidden = hasPlace();
  }

  function toggle(key) {
    if (picked.has(key)) picked.delete(key);
    else picked.add(key);
    syncNotSure();
    ed.scheduleShootAutosave();
  }
  document.getElementById('dateNotSetBtn').addEventListener('click', () => toggle('date'));
  document.getElementById('locationNotSetBtn').addEventListener('click', () => toggle('location'));

  // "Not sure yet" takes the place of Just me or With a team, and they of it.
  document.getElementById('teamNotSureBtn').addEventListener('click', () => {
    if (picked.has('team') && !ed.getTeamRequiredChoice()) return;
    picked.add('team');
    ed.setTeamRequiredChoice('');
    syncNotSure();
    ed.scheduleShootAutosave();
  });
  ['teamRequiredNoBtn', 'teamRequiredYesBtn'].forEach(id => document.getElementById(id).addEventListener('click', () => {
    picked.delete('team');
    syncNotSure();
  }));

  // A date typed or a place picked puts its chip away.
  document.getElementById('shootDate').addEventListener('input', syncNotSure);
  document.getElementById('shootDate').addEventListener('change', syncNotSure);
  new MutationObserver(syncNotSure).observe(document.getElementById('shootLocationBtn'), { childList: true, characterData: true, subtree: true });
};
