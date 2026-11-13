// Golden hour, in Shoot mode.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootModeGoldenHour = function addShootModeGoldenHour(ed) {
  Object.assign(ed, { shootModeCoords, shootGoldenHour });
  // ---------- Golden hour ----------
  // Where the phone is, for the sun: asked the first time Shoot mode's up on
  // a shoot day, then kept for COORDS_FRESH_MS, since iOS asks again almost
  // every time a home-screen app wants it, and a few kilometres move the sun
  // by seconds. Turned down, it isn't asked again for COORDS_DENIED_MS. With
  // no location there's no golden hour line, and nothing else changes.
  const SHOOT_COORDS_KEY = 'dailies_shoot_coords_v1';
  const COORDS_FRESH_MS = 12 * 60 * 60 * 1000;
  const COORDS_DENIED_MS = 30 * 24 * 60 * 60 * 1000;
  let shootCoords = null;
  ed.shootCoordsAsked = false; // once each time Shoot mode opens (exitShootMode resets it)

  function loadShootCoords() {
    if (shootCoords) return shootCoords;
    try { shootCoords = JSON.parse(localStorage.getItem(SHOOT_COORDS_KEY)) || null; } catch (e) { shootCoords = null; }
    return shootCoords;
  }

  function saveShootCoords(value) {
    shootCoords = value;
    try { localStorage.setItem(SHOOT_COORDS_KEY, JSON.stringify(value)); } catch (e) { /* kept in memory for now */ }
  }

  // Coordinates to work the sun out from, or null — asking for new ones
  // when they're missing or stale (the clock redraws once they arrive).
  // Stale ones still stand in, up to COORDS_FALLBACK_MS old, while that ask
  // is out or if it fails (no signal indoors), so golden hour doesn't vanish
  // from a long shoot day when the morning's fix turns 12 hours old.
  const COORDS_FALLBACK_MS = 3 * 24 * 60 * 60 * 1000;

  function shootModeCoords() {
    const saved = loadShootCoords();
    const age = saved ? Date.now() - (saved.at || 0) : Infinity;
    const usable = !!saved && !saved.denied && typeof saved.lat === 'number' && typeof saved.lng === 'number';
    if (saved && saved.denied) {
      if (age < COORDS_DENIED_MS) return null;
    } else if (usable && age < COORDS_FRESH_MS) {
      return saved;
    }
    if (!ed.shootCoordsAsked && navigator.geolocation) {
      ed.shootCoordsAsked = true;
      navigator.geolocation.getCurrentPosition(pos => {
        saveShootCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, at: Date.now() });
        if (!ed.shootModeOverlay.hidden) ed.renderShootModeClock();
      }, err => {
        // Turned down (not just slow, or no signal indoors).
        if (err && err.code === 1) saveShootCoords({ denied: true, at: Date.now() });
      }, { timeout: 20000, maximumAge: 30 * 60 * 1000 });
    }
    return usable && age < COORDS_FALLBACK_MS ? saved : null;
  }

  // When the sun crosses `altitude` degrees on `day` at lat/lng, rising and
  // setting, or null when it doesn't that day (far north or south). From
  // SunCalc's formulas (Vladimir Agafonkin, BSD-2-Clause), which land within
  // a few minutes: closer than golden hour needs. Worked from the day's
  // local noon, so it's that day's sun.
  function sunCrossings(day, lat, lng, altitude) {
    const rad = Math.PI / 180;
    const J2000 = 2451545;
    const J0 = 0.0009;
    const noon = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 12);
    const d = noon.getTime() / 86400000 - 0.5 + 2440588 - J2000;
    const lw = rad * -lng;
    const phi = rad * lat;
    const n = Math.round(d - J0 - lw / (2 * Math.PI));
    const ds = J0 + lw / (2 * Math.PI) + n;
    const M = rad * (357.5291 + 0.98560028 * ds);
    const C = rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M));
    const L = M + C + rad * 102.9372 + Math.PI;
    const dec = Math.asin(Math.sin(rad * 23.4397) * Math.sin(L));
    const transit = J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
    const x = (Math.sin(rad * altitude) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec));
    if (x < -1 || x > 1) return null;
    const w = Math.acos(x);
    const set = J2000 + J0 + (w + lw) / (2 * Math.PI) + n + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
    const toDate = j => new Date((j + 0.5 - 2440588) * 86400000);
    return { rise: toDate(2 * transit - set), set: toDate(set) };
  }

  // The golden hour — the sun between 6° up and 4° below the horizon — that
  // falls in the shoot: whichever of the day's two (morning, evening) isn't
  // over yet and overlaps the shoot from its start time to its wrap. With
  // no start or wrap time, that end is left open. Null when neither does.
  function shootGoldenHour(shoot, { lat, lng }, now) {
    const day = ed.parseShootDate(shoot.date);
    const high = sunCrossings(day, lat, lng, 6);
    const low = sunCrossings(day, lat, lng, -4);
    if (!high || !low) return null;
    const from = ed.shootDateTime(shoot.date, shoot.startTime);
    const to = ed.shootWrapAt(shoot);
    return [{ start: low.rise, end: high.rise }, { start: high.set, end: low.set }]
      .find(w => w.end > now && (!from || w.end > from) && (!to || w.start < to)) || null;
  }
};
