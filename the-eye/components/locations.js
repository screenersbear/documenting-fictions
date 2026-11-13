// A shoot's location: its shape, how it reads on one line, and telling two apart.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addLocations = function addLocations(ed) {
  Object.assign(ed, { normalizeLocation, isLocationBlank, formatLocationDisplay, formatLocationDisplayNoCountry, locationKey });
  // Normalizes a shoot's location into the structured shape (name/street/
  // city/zip/country). Handles both a legacy plain-string location (folded
  // into `name`) and the old separate `region` field (folded into `country`)
  // so existing saved shoots keep their data after this schema change.
  function normalizeLocation(loc, legacyRegion) {
    if (loc && typeof loc === 'object') {
      return {
        name: loc.name || '',
        street: loc.street || '',
        city: loc.city || '',
        state: loc.state || '',
        zip: loc.zip || '',
        country: loc.country || legacyRegion || '',
      };
    }
    return { name: loc || '', street: '', city: '', state: '', zip: '', country: legacyRegion || '' };
  }

  function isLocationBlank(loc) {
    return !loc || (!ed.hasText(loc.name) && !ed.hasText(loc.street) && !ed.hasText(loc.city) && !ed.hasText(loc.state) && !ed.hasText(loc.zip) && !ed.hasText(loc.country));
  }

  // Composes a location into one display line: "name — street, city, state zip, Country".
  function formatLocationDisplay(loc) {
    if (!loc) return '';
    const parts = [];
    if (ed.hasText(loc.name)) parts.push(loc.name.trim());
    const cityStateZip = [loc.state, loc.zip].filter(ed.hasText).map(v => v.trim()).join(' ');
    const addressLine = [loc.street, loc.city, cityStateZip].filter(ed.hasText).join(', ');
    if (addressLine) parts.push(addressLine);
    if (loc.country) parts.push(ed.REGION_LABELS[loc.country] || loc.country);
    return parts.join(', ');
  }

  // The same line without the country. The shared PDF goes to talent and crew
  // who are already turning up at the address, so the country only pads out a
  // line that's usually wrapping anyway. Blanking the field rather than
  // reimplementing keeps the two formats from drifting apart.
  function formatLocationDisplayNoCountry(loc) {
    return formatLocationDisplay({ ...(loc || {}), country: '' });
  }

  // Case/whitespace-insensitive identity key for deduping/matching locations
  // (e.g. recognizing a past location was picked again for directions reuse).
  function locationKey(loc) {
    return ['name', 'street', 'city', 'state', 'zip', 'country'].map(k => ((loc && loc[k]) || '').trim().toLowerCase()).join('|');
  }
};
