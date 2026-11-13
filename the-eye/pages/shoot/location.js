// The location popup: name, street, city, zip and country, or a past location.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootLocation = function addShootLocation(ed) {
  Object.assign(ed, { updateLocationBtnDisplay });
  // ---------- Location (popup with name/street/city/zip/country + past locations) ----------
  ed.currentShootLocation = { name: '', street: '', city: '', state: '', zip: '', country: '' };
  ed.pastLocationSamples = [];

  function updateLocationBtnDisplay() {
    const btn = document.getElementById('shootLocationBtn');
    const loc = ed.currentShootLocation;
    // Country alone doesn't count as real content — it's just the
    // pre-filled default (see state.defaultCountry), not something the
    // user actually entered, so it shouldn't show up as a location preview.
    const hasRealContent = ed.hasText(loc.name) || ed.hasText(loc.street) || ed.hasText(loc.city) || ed.hasText(loc.state) || ed.hasText(loc.zip);
    const display = hasRealContent ? ed.formatLocationDisplay(loc) : '';
    btn.textContent = display || 'Tap to add location';
    btn.classList.toggle('has-value', !!display);
  }

  // Most recently used locations first: each ranks by the latest shoot date
  // it's been used for (an undated shoot that's still being planned counts
  // as today), ties broken alphabetically so the order stays stable rather
  // than reflecting shoot-creation order.
  function getAllPastLocations() {
    const latest = {};
    const samples = {};
    const dismissed = new Set(ed.state.dismissedLocationKeys);
    const today = ed.todayStr();
    ed.state.shoots.forEach(s => {
      // A country on its own is just the pre-filled default, not a location
      // anyone picked (same rule as updateLocationBtnDisplay).
      const loc = s.location;
      if (!loc || !['name', 'street', 'city', 'state', 'zip'].some(k => ed.hasText(loc[k]))) return;
      const key = ed.locationKey(loc);
      if (dismissed.has(key)) return;
      // Only a shoot still being planned counts its missing date as today: a
      // canceled/postponed one's kept date is only the original plan
      // (scheduledShootDate leaves it out), so it ranks last.
      const live = !s.archived && s.status !== 'canceled' && s.status !== 'rescheduled';
      const when = ed.scheduledShootDate(s) || (live ? today : '');
      if (!(key in latest) || when >= latest[key]) {
        latest[key] = when;
        samples[key] = s.location;
      }
    });
    return Object.keys(latest)
      .sort((a, b) => latest[b].localeCompare(latest[a]) || ed.formatLocationDisplay(samples[a]).localeCompare(ed.formatLocationDisplay(samples[b])))
      .map(key => samples[key]);
  }

  // Whatever directions were entered the most recent time this exact
  // location was shot at (by shoot date; undated shoots sort last so they
  // only win if nothing else has directions on file) — lets picking a
  // known location bring its directions along automatically.
  function getLastLocationDirections(loc) {
    const key = ed.locationKey(loc);
    const matches = ed.state.shoots.filter(s => s.location && ed.locationKey(s.location) === key && ed.hasText(s.locationDirections));
    if (!matches.length) return '';
    matches.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return matches[0].locationDirections;
  }

  function fillLocationForm(loc) {
    document.getElementById('locationNameInput').value = loc.name || '';
    document.getElementById('locationStreetInput').value = loc.street || '';
    document.getElementById('locationCityInput').value = loc.city || '';
    document.getElementById('locationStateInput').value = loc.state || '';
    document.getElementById('locationZipInput').value = loc.zip || '';
    document.getElementById('locationCountryInput').value = loc.country || '';
  }

  // Rebuilt rather than built once, because deleting from "Manage locations…"
  // changes what belongs in this list while the Location modal is still open
  // behind it. Without a refresh you'd come back to a dropdown still offering
  // locations you just removed, until you closed and reopened the modal.
  function refreshPastLocationsSelect() {
    ed.pastLocationSamples = getAllPastLocations();
    const select = document.getElementById('pastLocationsSelect');
    select.innerHTML = '<option value="">Select a past location…</option>'
      + ed.pastLocationSamples.map((loc, i) => `<option value="${i}">${ed.escapeHtml(ed.formatLocationDisplay(loc))}</option>`).join('')
      + '<option value="__manage__">Manage locations…</option>';
  }

  function openLocationModal() {
    fillLocationForm(ed.currentShootLocation);
    refreshPastLocationsSelect();
    document.getElementById('locationModalOverlay').hidden = false;
  }

  document.getElementById('shootLocationBtn').addEventListener('click', openLocationModal);

  document.getElementById('pastLocationsSelect').addEventListener('change', (e) => {
    if (e.target.value === '__manage__') {
      e.target.value = '';
      openManageLocationsModal();
      return;
    }
    if (e.target.value === '') return;
    const loc = ed.pastLocationSamples[Number(e.target.value)];
    if (loc) fillLocationForm(loc);
  });

  // State / region is optional, like every other line here: plenty of places
  // have none (or none anyone writes), and a studio name on its own is a
  // perfectly good location. Everything that reads a location already skips
  // a blank part — formatLocationDisplay leaves it out of the line, and the
  // past-locations key just has an empty slot for it.
  document.getElementById('saveLocationBtn').addEventListener('click', () => {
    const newLocation = {
      name: document.getElementById('locationNameInput').value.trim(),
      street: document.getElementById('locationStreetInput').value.trim(),
      city: document.getElementById('locationCityInput').value.trim(),
      state: document.getElementById('locationStateInput').value.trim(),
      zip: document.getElementById('locationZipInput').value.trim(),
      country: document.getElementById('locationCountryInput').value,
    };
    const oldKey = ed.locationKey(ed.currentShootLocation);
    const isChange = ed.locationKey(newLocation) !== oldKey;
    ed.currentShootLocation = newLocation;
    updateLocationBtnDisplay();
    // Only autofill on an actual change — re-saving the same location
    // shouldn't clobber directions the user may have just edited by hand.
    if (isChange && !ed.isLocationBlank(newLocation)) {
      const lastDirections = getLastLocationDirections(newLocation);
      if (lastDirections) document.getElementById('shootLocationDirections').value = lastDirections;
    }
    // Remember whichever country gets set the first time ever — most
    // photographers mostly work in one country, so pre-filling it for every
    // new shoot going forward saves a repetitive pick.
    if (newLocation.country && !ed.state.defaultCountry) ed.state.defaultCountry = newLocation.country;
    document.getElementById('locationModalOverlay').hidden = true;
    ed.scheduleShootAutosave();
  });

  function renderManageLocationsList() {
    const samples = getAllPastLocations();
    const container = document.getElementById('manageLocationsList');
    if (!samples.length) {
      container.innerHTML = '<p class="empty-hint">No saved locations yet.</p>';
      return;
    }
    container.innerHTML = samples.map((loc, idx) => `
      <div class="manage-location-row">
        <span>${ed.escapeHtml(ed.formatLocationDisplay(loc))}</span>
        <button type="button" class="delete-manage-location" data-idx="${idx}"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
      </div>
    `).join('');
    container.querySelectorAll('.delete-manage-location').forEach(btn => {
      btn.addEventListener('click', () => {
        const loc = samples[Number(btn.dataset.idx)];
        if (!loc) return;
        const key = ed.locationKey(loc);
        if (!ed.state.dismissedLocationKeys.includes(key)) ed.state.dismissedLocationKeys.push(key);
        ed.saveState();
        renderManageLocationsList();
        // The Location modal's dropdown is still sitting open underneath, so it
        // has to drop the deleted entry now rather than on next open.
        refreshPastLocationsSelect();
      });
    });
  }

  function openManageLocationsModal() {
    renderManageLocationsList();
    document.getElementById('manageLocationsOverlay').hidden = false;
  }
};
