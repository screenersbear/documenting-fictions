(() => {
  // iOS Safari only computes :active styles on elements it thinks have a
  // touch listener — this no-op unlocks tap-flash feedback app-wide.
  document.body.addEventListener('touchstart', () => {}, false);

  const STORAGE_KEY = 'dailies_state_v1';
  const IDB_NAME = 'starky-moodboards';
  const IDB_STORE = 'images';
  const COLLAPSED_SECTIONS_KEY = 'dailies_collapsed_sections_v1';

  // Shared collapsed/expanded tracking for every "tuck-able" heading in the
  // app (Overview's Today/Upcoming/Upcoming deadlines, Shoots' status groups,
  // and any future ones) — persisted so nesting survives tab switches and
  // full app restarts alike.
  function loadCollapsedSections() {
    try {
      const raw = localStorage.getItem(COLLAPSED_SECTIONS_KEY);
      return new Set(raw ? JSON.parse(raw) : []);
    } catch (e) {
      return new Set();
    }
  }

  function saveCollapsedSections() {
    try { localStorage.setItem(COLLAPSED_SECTIONS_KEY, JSON.stringify([...collapsedSections])); } catch (e) {}
  }

  const collapsedSections = loadCollapsedSections();

  function isSectionCollapsed(key) {
    return collapsedSections.has(key);
  }

  function setSectionCollapsed(key, collapsed) {
    if (collapsed) collapsedSections.add(key);
    else collapsedSections.delete(key);
    saveCollapsedSections();
  }

  // The key `rescheduled` is what's saved in shoots and backup files, so it
  // stays as is; only the label shown to the user is "Postponed".
  // Order matters: isPostCaptureStatus treats everything from 'captured'
  // onward (bar Postponed/Canceled) as post-capture, so the video edit steps
  // sit between 'captured' and 'delivered'. Which category sees which keys is
  // decided by PHOTO_ONLY_STATUSES / VIDEO_ONLY_STATUSES below.
  const STATUS_LABELS = {
    prospect: 'Prospect',
    planning: 'Active planning',
    waiting_to_shoot: 'Shoot ready',
    captured: 'Captured',
    waiting_for_selects: 'Waiting for selects', // photo only
    editing: 'Editing',                         // photo only
    rough_cut: 'Rough cut',                     // video only
    client_review: 'Client review',             // video only
    revisions: 'Revisions',                     // video only
    delivered: 'Delivered',
    rescheduled: 'Postponed',
    canceled: 'Canceled',
  };

  // Keeps the visible "Status: X" swatch button in sync with the real
  // (invisible) #shootStatus select underneath it — call after anything
  // changes that select's value.
  function updateStatusSwatchDisplay() {
    const value = document.getElementById('shootStatus').value;
    document.getElementById('statusSwatchDisplay').textContent = `Status: ${STATUS_LABELS[value] || ''}`;
  }

  // Every status from Captured onward (both the photo and the video edit
  // steps), minus the off-track Postponed/Canceled. Excludes these shoots from
  // upcoming/today/day-after/7-day/shoot-mode, and includes them in the
  // reflection badge, the weekly Journal log and the fun facts — a single list
  // so a new post-capture status only has to be added once. Must agree with
  // isPostCaptureStatus, which is order-based on STATUS_LABELS.
  const POST_CAPTURE_STATUSES = ['captured', 'waiting_for_selects', 'editing', 'rough_cut', 'client_review', 'revisions', 'delivered'];

  // ---------- Video shoots ----------
  // Video swaps the photo-only post-capture steps (Waiting for selects,
  // Editing) for its own (Rough cut, Client review, Revisions); everything
  // else, Delivered included, is shared, so archive/complete-shoot work off
  // 'delivered' for both. It also calls its mood board a "Storyboard" (same
  // images, same complete/pending logic), has no final images, and gets a few
  // fields of its own (Crew/Talent call, Deliverables).
  // These are declared here, above `let state = loadState()`, because loading
  // saved data already uses them (a later const would throw there, and
  // loadState's catch would then start the app empty).
  const PHOTO_ONLY_STATUSES = ['waiting_for_selects', 'editing'];
  const VIDEO_ONLY_STATUSES = ['rough_cut', 'client_review', 'revisions'];
  // Overview's "In the edit" bucket (also the deadline prompt, the weekly
  // editing check-in and editingAt): photo Editing, and every video step after
  // Captured and before Delivered.
  const IN_THE_EDIT_STATUSES = ['editing', 'rough_cut', 'client_review', 'revisions'];
  const VIDEO_ASPECT_RATIOS = ['16:9', '9:16', '1:1', '4:5'];

  function isVideoCategory(category) {
    return category === 'video';
  }

  function isVideoShoot(s) {
    return !!s && isVideoCategory(s.category);
  }

  function isInTheEditStatus(status) {
    return IN_THE_EDIT_STATUSES.includes(status);
  }

  // "Mood board" vs "Storyboard" for wording that belongs to one shoot.
  // Capitalised; lower-case it mid-sentence.
  function moodboardTerm(category) {
    return isVideoCategory(category) ? 'Storyboard' : 'Mood board';
  }

  // Status keys offered for a category, in STATUS_LABELS order.
  function statusKeysForCategory(category) {
    const excluded = isVideoCategory(category) ? PHOTO_ONLY_STATUSES : VIDEO_ONLY_STATUSES;
    return Object.keys(STATUS_LABELS).filter(k => !excluded.includes(k));
  }

  // Same, but always keeps the shoot's current status in the list (in its
  // usual place) even when it doesn't belong to the category: a <select>
  // whose value has no matching <option> reads back as '', which the next
  // autosave would then store.
  function statusOptionKeys(category, currentStatus) {
    const keys = statusKeysForCategory(category);
    if (!currentStatus || keys.includes(currentStatus)) return keys;
    return STATUS_LABELS[currentStatus]
      ? Object.keys(STATUS_LABELS).filter(k => k === currentStatus || keys.includes(k))
      : keys.concat(currentStatus);
  }

  // Nearest equivalent when a status doesn't exist for a category. Both sides
  // of every swap are post-capture, so a remap never triggers the reflection
  // prompt or clears a reflection.
  function remapStatusForCategory(status, category) {
    if (isVideoCategory(category)) return PHOTO_ONLY_STATUSES.includes(status) ? 'rough_cut' : status;
    return VIDEO_ONLY_STATUSES.includes(status) ? 'editing' : status;
  }

  // Load/import pass: a video shoot in Waiting for selects/Editing moves to
  // Rough cut, and a non-video shoot holding a video-only step moves to
  // Editing. Idempotent. Runs outside migrateShoot, which returns early for
  // shoots that are already current. A shoot moved INTO the edit this way
  // (Waiting for selects -> Rough cut) never went through a status change,
  // so it gets its edit-start date here — otherwise the weekly "How's
  // editing going" check-in would skip it until its status next changed.
  function normalizeShootStatuses(shoots) {
    shoots.forEach(s => {
      if (!s || !s.status) return;
      const next = remapStatusForCategory(s.status, s.category);
      if (next === s.status) return;
      s.status = next;
      if (isInTheEditStatus(next) && !s.editingAt) s.editingAt = new Date().toISOString();
    });
  }

  // Rebuilds the Edit Shoot status <select> for a category and selects
  // currentStatus. new Option() so a stored value never needs escaping.
  function renderShootStatusSelectOptions(category, currentStatus) {
    const select = document.getElementById('shootStatus');
    const status = currentStatus || 'prospect';
    select.innerHTML = '';
    statusOptionKeys(category, status).forEach(key => {
      select.add(new Option(STATUS_LABELS[key] || key, key));
    });
    select.value = status;
  }

  // Canonical order, unknown values dropped, tolerant of a missing or garbled
  // field (already-migrated saves and imported backups never get a default).
  function normalizeAspectRatios(list) {
    return Array.isArray(list) ? VIDEO_ASPECT_RATIOS.filter(r => list.includes(r)) : [];
  }

  // [label, value] pairs for the Deliverables block, shared by the call sheet,
  // the archive PDF and Archive mode. Empty for non-video shoots, so a shoot
  // switched away from video never prints its leftover values.
  function videoDeliverableFields(s) {
    if (!isVideoShoot(s)) return [];
    return [
      ['Videos', s.deliverables || ''],
      ['Aspect ratios', normalizeAspectRatios(s.aspectRatios).join(', ')],
      ["Where it's going", s.deliverableDestinations || ''],
    ].filter(([, value]) => hasText(value)).map(([label, value]) => [label, value.trim()]);
  }

  const COLLAPSE_ARROW_SVG = '<svg class="collapse-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';

  const TEAM_ROLE_OPTIONS = [
    ['makeup_artist', 'Makeup artist'],
    ['hairstylist', 'Hairstylist'],
    ['fashion_stylist', 'Fashion stylist'],
    ['set_designer', 'Set designer'],
    ['videographer', 'Videographer'],
    ['assistant', 'Assistant'],
    ['other', 'Other'],
  ];

  const SOCIAL_PLATFORM_OPTIONS = [
    ['instagram', 'Instagram'],
    ['tiktok', 'TikTok'],
    ['youtube', 'YouTube'],
    ['other', 'Other'],
  ];

  // Every region the world map (world-map.svg) can highlight — id matches
  // that SVG's element id exactly, label is what shows in the picker.
  // Sourced from the map itself (Wikimedia Commons BlankMap-World-Compact.svg,
  // public domain), so it includes some disputed/micro-territories the map
  // draws as their own shape.
  const REGION_OPTIONS = [
    ['xa', "Abkhazia"],
    ['af', "Afghanistan"],
    ['al', "Albania"],
    ['dz', "Algeria"],
    ['as', "American Samoa"],
    ['ad', "Andorra"],
    ['ao', "Angola"],
    ['ai', "Anguilla"],
    ['ag', "Antigua and Barbuda"],
    ['ar', "Argentina"],
    ['am', "Armenia"],
    ['aw', "Aruba"],
    ['au', "Australia"],
    ['at', "Austria"],
    ['qm', "Azad Kashmir"],
    ['az', "Azerbaijan"],
    ['bs', "Bahamas"],
    ['bh', "Bahrain"],
    ['bd', "Bangladesh"],
    ['bb', "Barbados"],
    ['by', "Belarus"],
    ['be', "Belgium"],
    ['bz', "Belize"],
    ['bj', "Benin"],
    ['bm', "Bermuda"],
    ['bt', "Bhutan"],
    ['bo', "Bolivia"],
    ['bq', "Bonaire, Sint Eustatius and Saba"],
    ['ba', "Bosnia and Herzegovina"],
    ['bw', "Botswana"],
    ['br', "Brazil"],
    ['bn', "Brunei"],
    ['bg', "Bulgaria"],
    ['bf', "Burkina Faso"],
    ['bi', "Burundi"],
    ['kh', "Cambodia"],
    ['cm', "Cameroon"],
    ['ca', "Canada"],
    ['cv', "Cape Verde"],
    ['ky', "Cayman Islands"],
    ['cf', "Central African Republic"],
    ['td', "Chad"],
    ['cl', "Chile"],
    ['cn', "China"],
    ['co', "Colombia"],
    ['km', "Comoros"],
    ['cg', "Congo"],
    ['ck', "Cook Islands"],
    ['cr', "Costa Rica"],
    ['ci', "Cote d'Ivoire"],
    ['qr', "Crimea"],
    ['hr', "Croatia"],
    ['cu', "Cuba"],
    ['cw', "Curacao"],
    ['cy', "Cyprus"],
    ['cz', "Czech Republic"],
    ['cd', "DR Congo"],
    ['dk', "Denmark"],
    ['dj', "Djibouti"],
    ['dm', "Dominica"],
    ['do', "Dominican Republic"],
    ['xd', "Donetsk People's Republic"],
    ['ec', "Ecuador"],
    ['eg', "Egypt"],
    ['sv', "El Salvador"],
    ['gq', "Equatorial Guinea"],
    ['er', "Eritrea"],
    ['ee', "Estonia"],
    ['sz', "Eswatini"],
    ['et', "Ethiopia"],
    ['fk', "Falkland Islands (Malvinas)"],
    ['fo', "Faroe Islands"],
    ['fj', "Fiji"],
    ['fi', "Finland"],
    ['fr', "France"],
    ['gf', "French Guiana"],
    ['pf', "French Polynesia"],
    ['tf', "French Southern Territories"],
    ['ga', "Gabon"],
    ['gm', "Gambia"],
    ['gaza_strip', "Gaza Strip (State of Palestine)"],
    ['ge', "Georgia"],
    ['de', "Germany"],
    ['gh', "Ghana"],
    ['gi', "Gibraltar"],
    ['gr', "Greece"],
    ['gl', "Greenland"],
    ['gd', "Grenada"],
    ['gp', "Guadeloupe"],
    ['gu', "Guam"],
    ['gt', "Guatemala"],
    ['gg', "Guernsey"],
    ['gn', "Guinea"],
    ['gw', "Guinea-Bissau"],
    ['gy', "Guyana"],
    ['ht', "Haiti"],
    ['hn', "Honduras"],
    ['hk', "Hong Kong"],
    ['hu', "Hungary"],
    ['is', "Iceland"],
    ['in', "India"],
    ['id', "Indonesia"],
    ['ir', "Iran"],
    ['iq', "Iraq"],
    ['ie', "Ireland"],
    ['im', "Isle of Man"],
    ['il', "Israel"],
    ['it', "Italy"],
    ['jm', "Jamaica"],
    ['jp', "Japan"],
    ['je', "Jersey"],
    ['jo', "Jordan"],
    ['kz', "Kazakhstan"],
    ['ke', "Kenya"],
    ['ki', "Kiribati"],
    ['xk', "Kosovo"],
    ['kw', "Kuwait"],
    ['kg', "Kyrgyzstan"],
    ['la', "Laos"],
    ['lv', "Latvia"],
    ['lb', "Lebanon"],
    ['ls', "Lesotho"],
    ['lr', "Liberia"],
    ['ly', "Libya"],
    ['li', "Liechtenstein"],
    ['lt', "Lithuania"],
    ['xl', "Luhansk People's Republic"],
    ['lu', "Luxembourg"],
    ['mo', "Macao"],
    ['mg', "Madagascar"],
    ['mw', "Malawi"],
    ['my', "Malaysia"],
    ['mv', "Maldives"],
    ['ml', "Mali"],
    ['mt', "Malta"],
    ['mh', "Marshall Islands"],
    ['mq', "Martinique"],
    ['mr', "Mauritania"],
    ['mu', "Mauritius"],
    ['yt', "Mayotte"],
    ['mx', "Mexico"],
    ['fm', "Micronesia"],
    ['md', "Moldova"],
    ['mc', "Monaco"],
    ['mn', "Mongolia"],
    ['me', "Montenegro"],
    ['ms', "Montserrat"],
    ['ma-', "Morocco"],
    ['mz', "Mozambique"],
    ['mm', "Myanmar"],
    ['na', "Namibia"],
    ['nr', "Nauru"],
    ['np', "Nepal"],
    ['nl', "Netherlands"],
    ['nc', "New Caledonia"],
    ['nz', "New Zealand"],
    ['ni', "Nicaragua"],
    ['ne', "Niger"],
    ['ng', "Nigeria"],
    ['nu', "Niue"],
    ['nf', "Norfolk Island"],
    ['kp', "North Korea"],
    ['mk', "North Macedonia"],
    ['xc', "Northern Cyprus"],
    ['mp', "Northern Mariana Islands"],
    ['no', "Norway"],
    ['om', "Oman"],
    ['pk', "Pakistan"],
    ['pw', "Palau"],
    ['pa', "Panama"],
    ['pg', "Papua New Guinea"],
    ['py', "Paraguay"],
    ['pe', "Peru"],
    ['ph', "Philippines"],
    ['pn', "Pitcairn"],
    ['pl', "Poland"],
    ['pt', "Portugal"],
    ['pr', "Puerto Rico"],
    ['qa', "Qatar"],
    ['re', "Reunion"],
    ['ro', "Romania"],
    ['ru', "Russia"],
    ['rw', "Rwanda"],
    ['xz', "Sahrawi Arab Democratic Republic (Free Zone)"],
    ['bl', "Saint Barthelemy"],
    ['sh', "Saint Helena, Ascension and Tristan Da Cunha"],
    ['kn', "Saint Kitts and Nevis"],
    ['lc', "Saint Lucia"],
    ['mf', "Saint Martin (French Part)"],
    ['pm', "Saint Pierre and Miquelon"],
    ['vc', "Saint Vincent and the Grenadines"],
    ['ws', "Samoa"],
    ['sm', "San Marino"],
    ['st', "Sao Tome and Principe"],
    ['sa', "Saudi Arabia"],
    ['sn', "Senegal"],
    ['rs', "Serbia"],
    ['sc', "Seychelles"],
    ['sl', "Sierra Leone"],
    ['sg', "Singapore"],
    ['sx', "Sint Maarten (Dutch Part)"],
    ['sk', "Slovakia"],
    ['si', "Slovenia"],
    ['sb', "Solomon Islands"],
    ['so', "Somalia"],
    ['xs', "Somaliland"],
    ['za', "South Africa"],
    ['gs', "South Georgia and the South Sandwich Islands"],
    ['kr', "South Korea"],
    ['xo', "South Ossetia"],
    ['ss', "South Sudan"],
    ['es', "Spain"],
    ['lk', "Sri Lanka"],
    ['sd', "Sudan"],
    ['sr', "Suriname"],
    ['se', "Sweden"],
    ['ch', "Switzerland"],
    ['sy', "Syria"],
    ['tw', "Taiwan"],
    ['tj', "Tajikistan"],
    ['tz', "Tanzania"],
    ['th', "Thailand"],
    ['tl', "Timor-Leste"],
    ['tg', "Togo"],
    ['tk', "Tokelau"],
    ['to', "Tonga"],
    ['xp', "Transnistria"],
    ['tt', "Trinidad and Tobago"],
    ['tn', "Tunisia"],
    ['tr', "Turkey"],
    ['tm', "Turkmenistan"],
    ['tc', "Turks and Caicos Islands"],
    ['tv', "Tuvalu"],
    ['ug', "Uganda"],
    ['ua', "Ukraine"],
    ['ae', "United Arab Emirates"],
    ['gb', "United Kingdom"],
    ['us', "United States of America"],
    ['uy', "Uruguay"],
    ['uz', "Uzbekistan"],
    ['vu', "Vanuatu"],
    ['va', "Vatican City"],
    ['ve', "Venezuela"],
    ['vn', "Vietnam"],
    ['vg', "Virgin Islands, British"],
    ['vi', "Virgin Islands, U.S."],
    ['wf', "Wallis and Futuna"],
    ['west_bank', "West Bank (State of Palestine)"],
    ['eh-', "Western Sahara"],
    ['ye', "Yemen"],
    ['zm', "Zambia"],
    ['zw', "Zimbabwe"],
  ];

  const REGION_LABELS = Object.fromEntries(REGION_OPTIONS);

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
    return !loc || (!hasText(loc.name) && !hasText(loc.street) && !hasText(loc.city) && !hasText(loc.state) && !hasText(loc.zip) && !hasText(loc.country));
  }

  // Composes a location into one display line: "name — street, city, state zip, Country".
  function formatLocationDisplay(loc) {
    if (!loc) return '';
    const parts = [];
    if (hasText(loc.name)) parts.push(loc.name.trim());
    const cityStateZip = [loc.state, loc.zip].filter(hasText).map(v => v.trim()).join(' ');
    const addressLine = [loc.street, loc.city, cityStateZip].filter(hasText).join(', ');
    if (addressLine) parts.push(addressLine);
    if (loc.country) parts.push(REGION_LABELS[loc.country] || loc.country);
    return parts.join(' — ');
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

  const CATEGORY_LABELS = {
    commercial: 'Commercial',
    content_shoot: 'Content shoot',
    video: 'Video',
    editorial: 'Editorial',
    lighting_test: 'Lighting test',
    portfolio_building: 'Portfolio building',
    test_shoot: 'Test shoot',
    event: 'Event',
    wedding: 'Wedding',
    engagement: 'Engagement',
    family: 'Family',
    headshot: 'Headshot',
    branding: 'Branding',
    publicity: 'Publicity',
    maternity: 'Maternity',
    other: 'Other',
    uncategorized: 'Uncategorized',
  };

  const CATEGORY_FILTER_ORDER = ['commercial', 'content_shoot', 'video', 'editorial', 'lighting_test', 'portfolio_building', 'test_shoot', 'event', 'wedding', 'engagement', 'family', 'headshot', 'branding', 'publicity', 'maternity', 'other'];

  // Grammatical plural form of each category, for use as a countable noun in
  // a sentence (e.g. "more commercial shoots than video shoots") — CATEGORY_LABELS
  // are display titles ("Test shoot"), which read wrong dropped straight into
  // a sentence like that ("more Test shoot than Video").
  const CATEGORY_PLURAL_LABELS = {
    commercial: 'commercial shoots',
    video: 'video shoots',
    editorial: 'editorial shoots',
    lighting_test: 'lighting test shoots',
    portfolio_building: 'portfolio building shoots',
    test_shoot: 'test shoots',
    event: 'event shoots',
    wedding: 'wedding shoots',
    engagement: 'engagement shoots',
    family: 'family shoots',
    headshot: 'headshot shoots',
    branding: 'branding shoots',
    publicity: 'publicity shoots',
    maternity: 'maternity shoots',
    other: 'other shoots',
  };

  // Shared by every "I'm done here" button that used to just say "Save"
  // (Edit Shoot, and the Journal view's closing button) — everything here
  // already autosaves as you go, so these are really just a satisfying
  // confirmation tap, not a literal save action.
  // "I know it auto saves everything I do but I need a button to hit" is
  // held out for now — measured against the Save button's real width, it
  // wraps to 2 lines everywhere except when a delivered-but-not-archived
  // shoot puts Save side by side with Complete Shoot, where it needs ~5
  // lines and would force the button to grow. Left out until it's
  // shortened or swapped for something that fits at that narrower width.
  const SAVE_MESSAGES = [
    'I guess so', 'yup, yup', "that's good", 'okay', 'yes',
    "let's goooo", 'incredible', "I'm a genius", 'so good', 'good work',
    'affirm here', "I'm a visionary",
  ];

  function pickRandomSaveMessage() {
    return SAVE_MESSAGES[Math.floor(Math.random() * SAVE_MESSAGES.length)];
  }

  // Shared by the Shoots and Archive tabs: which category chips a user
  // actually wants cluttering their filter row. Missing entries default to
  // visible so new categories show up automatically.
  const CATEGORY_VISIBILITY_KEY = 'dailies_category_chip_visibility_v1';

  function loadCategoryVisibility() {
    try {
      return JSON.parse(localStorage.getItem(CATEGORY_VISIBILITY_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  let categoryVisibility = loadCategoryVisibility();

  function isCategoryVisible(cat) {
    return categoryVisibility[cat] !== false;
  }

  function saveCategoryVisibility() {
    localStorage.setItem(CATEGORY_VISIBILITY_KEY, JSON.stringify(categoryVisibility));
  }

  // Tonally matched to the app's navy/mango-yellow brand pair: same
  // mid-to-dark, non-neon register, cycled per pie in this fixed order.
  const PIE_COLORS = [
    '#ffd103', // mango yellow (accent)
    '#313d45', // navy (text)
    '#c8683d', // terracotta
    '#5b7c99', // dusty blue
    '#5c8a72', // sage green
    '#8a5a72', // plum
    '#d9a441', // warm sand
    '#7d8a92', // slate
  ];

  const NEW_SHOOT_TITLES = [
    'we log shoots here',
    'oh yeah, booked and blessed',
    "we're up (planning shoots)",
    'shoot log, obviously',
    "professional shoot planner (that's you)",
    'big dreamer, you',
    'brethren, a new shoot has arrived',
    'imagine photo shoots',
  ];

  function randomNewShootTitle() {
    return NEW_SHOOT_TITLES[Math.floor(Math.random() * NEW_SHOOT_TITLES.length)];
  }

  const VISUAL_LANGUAGE_TAGS = ['Lifestyle', 'Documentary', 'Surrealism', 'Portrait', 'Fashion', 'Fitness', 'Cinematic', 'Commercial', 'Headshot', 'Beauty', 'Couples', 'Other'];
  // Tags dropped from VISUAL_LANGUAGE_TAGS. Kept as a named list because the
  // framework lives in saved state, not in the constant above — an existing
  // install has its own copy, so retiring a tag takes a migration (see
  // removeFrameworkTags).
  const RETIRED_VISUAL_LANGUAGE_TAGS = ['Magic realism'];

  function seedFrameworks() {
    return [
      {
        id: uid(),
        name: 'Visual Language',
        tags: [...VISUAL_LANGUAGE_TAGS],
      },
    ];
  }

  const THEME_KEYS = ['default', 'pink', 'purple', 'red', 'blue', 'green'];

  // Up here with THEME_KEYS for the same reason: normalizeProjects (run by
  // loadState) uses it, and a const declared any further down would throw
  // there and start the app empty.
  const UNTITLED_PROJECT_NAME = 'Untitled project';

  function defaultState() {
    return {
      shoots: [],
      projects: [],
      frameworks: seedFrameworks(),
      journalEntries: [],
      titleDisplayMode: 'talent',
      colorTheme: 'default',
      defaultCountry: '',
      dismissedLocationKeys: [],
      dismissedTeamMemberKeys: [],
      dismissedTalentKeys: [],
      dismissedLightingSetupKeys: [],
      photographer: emptyPhotographer(),
    };
  }

  // Who's behind the camera — surfaced on call sheets ahead of the rest of the
  // crew. Every field is optional; the first-run prompt and the app menu both
  // edit this same object.
  function emptyPhotographer() {
    return { name: '', businessName: '', socialPlatform: 'instagram', socialHandle: '', phone: '' };
  }

  // Handle fields prefill with "@" so there's less to type — but if that's
  // all that's left when the field is saved (tapped in, nothing typed,
  // tapped away), it should read as never having been set, not as a real
  // (garbage) handle. Used everywhere a handle gets committed: photographer,
  // talent, team member.
  function normalizeSocialHandle(value) {
    const trimmed = (value || '').trim();
    return trimmed === '@' ? '' : trimmed;
  }

  function normalizePhotographer(p) {
    const src = (p && typeof p === 'object') ? p : {};
    return {
      name: src.name || '',
      businessName: src.businessName || '',
      socialPlatform: src.socialPlatform || 'instagram',
      socialHandle: src.socialHandle || '',
      phone: src.phone || '',
    };
  }

  function photographerHasInfo(p) {
    return !!p && (hasText(p.name) || hasText(p.businessName) || hasText(p.socialHandle) || hasText(p.phone));
  }

  function migrateJournalEntry(e) {
    const entry = {
      id: e.id || uid(),
      title: e.title || '',
      body: e.body || '',
      tags: Array.isArray(e.tags) ? e.tags : [],
      createdAt: e.createdAt || todayStr(),
    };
    if (e.sourceShootId) entry.sourceShootId = e.sourceShootId;
    return entry;
  }

  // One-time, idempotent cleanup: drops the old Documenting Fictions
  // Principles framework (this app is meant to be shareable, not tied to one
  // photographer's vocabulary) and the Lighting framework (folded into the
  // more robust Lighting setups list instead — see removeFramework in
  // loadState for the accompanying per-shoot frameworkTags cleanup), and
  // upgrades Visual Language's tags forward through each past default set,
  // but only while they still exactly match a known-old default (so a
  // user's own edits are never clobbered).
  function migrateFrameworks(frameworks) {
    let result = frameworks.filter(f => f.name !== 'Documenting Fictions Principles' && f.name !== 'Lighting');
    const oldestVisualTags = ['Narrative Realism', 'Expressive Performance', 'Editorial Aesthetic', 'Cinematic Atmosphere'];
    const midVisualTags = ['Realism', 'Lifestyle', 'Documentary', 'Magic realism', 'Surreal', 'Other'];
    const priorVisualTags = ['Realism', 'Lifestyle', 'Documentary', 'Magic realism', 'Surreal', 'Portrait', 'Other'];
    const laterVisualTags = ['Realism', 'Lifestyle', 'Documentary', 'Magic realism', 'Surrealism', 'Portrait', 'Other'];
    const newVisualTags = ['Lifestyle', 'Documentary', 'Magic realism', 'Surrealism', 'Portrait', 'Fashion', 'Fitness', 'Cinematic', 'Other'];
    const newerVisualTags = ['Lifestyle', 'Documentary', 'Magic realism', 'Surrealism', 'Portrait', 'Fashion', 'Fitness', 'Cinematic', 'Commercial', 'Headshot', 'Test shoot', 'Other'];
    const priorNewestVisualTags = ['Lifestyle', 'Documentary', 'Magic realism', 'Surrealism', 'Portrait', 'Fashion', 'Fitness', 'Cinematic', 'Commercial', 'Headshot', 'Other'];
    const beforeCouplesVisualTags = ['Lifestyle', 'Documentary', 'Surrealism', 'Portrait', 'Fashion', 'Fitness', 'Cinematic', 'Commercial', 'Headshot', 'Beauty', 'Other'];
    const vl = result.find(f => f.name === 'Visual Language');
    if (vl) {
      const current = JSON.stringify(vl.tags);
      if (current === JSON.stringify(oldestVisualTags) || current === JSON.stringify(midVisualTags) || current === JSON.stringify(priorVisualTags) || current === JSON.stringify(laterVisualTags) || current === JSON.stringify(newVisualTags) || current === JSON.stringify(newerVisualTags) || current === JSON.stringify(priorNewestVisualTags) || current === JSON.stringify(beforeCouplesVisualTags)) {
        vl.tags = [...VISUAL_LANGUAGE_TAGS];
      }
    }
    return result.length ? result : seedFrameworks();
  }

  // Drops a whole framework's stale frameworkTags entries once it's been
  // retired (see migrateFrameworks) — mirrors removeFrameworkTags but for a
  // framework that no longer exists at all, so there's no fw.id left to read
  // off the migrated list; the caller passes the id it captured beforehand.
  // "Early idea" (idea_phase) is a retired status — folded into Active
  // planning, the next stage forward, since it never got its own migration
  // and existing shoots there would otherwise keep a status STATUS_LABELS
  // no longer has an entry for.
  function migrateIdeaPhaseStatus(shoots) {
    shoots.forEach(s => {
      if (s.status === 'idea_phase') s.status = 'planning';
    });
  }

  function removeFramework(shoots, frameworkId) {
    if (!frameworkId) return;
    shoots.forEach(s => {
      s.frameworkTags = (s.frameworkTags || []).filter(t => t.frameworkId !== frameworkId);
    });
  }

  // Retires tags from a framework: drops them from the framework's own list and
  // from every shoot that had one checked. Clearing the shoots matters — a
  // selection pointing at a tag with no checkbox left is invisible but still
  // counted, so leaving them behind would quietly skew anything that tallies
  // tags. Also inserts any newly added tags, positioned to match canonicalOrder
  // rather than appended, so the list doesn't reshuffle for existing users.
  function removeFrameworkTags(shoots, frameworks, frameworkName, retiredTags, canonicalOrder) {
    const fw = frameworks.find(f => f.name === frameworkName);
    if (!fw) return;
    const retired = new Set(retiredTags);
    if (!fw.tags.some(t => retired.has(t))) return;

    const kept = fw.tags.filter(t => !retired.has(t));
    const added = canonicalOrder.filter(t => !kept.includes(t));
    // Rebuild in canonical order, keeping any user-added tags the constant
    // doesn't know about pinned to the end.
    const known = canonicalOrder.filter(t => kept.includes(t) || added.includes(t));
    const custom = kept.filter(t => !canonicalOrder.includes(t));
    fw.tags = known.concat(custom);

    shoots.forEach(s => {
      s.frameworkTags = (s.frameworkTags || []).filter(t => !(t.frameworkId === fw.id && retired.has(t.tag)));
    });
  }

  // Renames a specific tag string within a framework's tag list, and keeps
  // any shoot that already had the old tag checked pointed at the new one
  // (otherwise the checkbox would silently appear unchecked after rename).
  function renameFrameworkTag(shoots, frameworks, frameworkName, oldTag, newTag) {
    const fw = frameworks.find(f => f.name === frameworkName);
    if (!fw) return;
    shoots.forEach(s => {
      (s.frameworkTags || []).forEach(t => {
        if (t.frameworkId === fw.id && t.tag === oldTag) t.tag = newTag;
      });
    });
  }

  // Migrates a shoot forward through each past shape this app has used:
  // old flat manifestoTags/visualTags/concept -> frameworkTags[]/premise;
  // old shootType + isProofBuilding -> single category; old deliveryStatus
  // -> lifecycle status; old single reflection field -> lessonsLearned
  // (the closest of the new three reflection boxes, since a clean 3-way
  // split of old freeform text isn't possible).
  function migrateShoot(s, frameworks) {
    if (s.frameworkTags && s.category && s.status !== undefined && s.moodboardComplete !== undefined && Array.isArray(s.references) && s.teamRequired !== undefined && Array.isArray(s.talents) && s.location && typeof s.location === 'object') return s;
    const dfp = frameworks.find(f => f.name === 'Documenting Fictions Principles');
    const vl = frameworks.find(f => f.name === 'Visual Language');
    const frameworkTags = s.frameworkTags || [];
    (s.manifestoTags || []).forEach(tag => { if (dfp) frameworkTags.push({ frameworkId: dfp.id, tag }); });
    (s.visualTags || []).forEach(tag => { if (vl) frameworkTags.push({ frameworkId: vl.id, tag }); });
    const category = s.category || (s.isProofBuilding || s.shootType === 'proof' ? 'portfolio_building' : 'client');
    const status = s.status !== undefined ? s.status : (hasText(s.deliveryStatus) ? 'delivered' : 'prospect');
    const lessonsLearned = s.lessonsLearned !== undefined ? s.lessonsLearned : (s.reflection || '');
    return {
      ...s,
      title: s.title || '',
      status,
      location: normalizeLocation(s.location, s.region),
      startTime: s.startTime || s.time || '',
      endTime: s.endTime || '',
      crewCallTime: s.crewCallTime || '',
      talentCallTime: s.talentCallTime || '',
      premise: s.premise !== undefined ? s.premise : (s.concept || ''),
      character: s.character || '',
      shootGoals: s.shootGoals || '',
      elevatorPitch: s.elevatorPitch || '',
      deliverables: s.deliverables || '',
      aspectRatios: normalizeAspectRatios(s.aspectRatios),
      deliverableDestinations: s.deliverableDestinations || '',
      emotionalBeats: s.emotionalBeats || [],
      worldNotes: s.worldNotes || '',
      lightingNotes: s.lightingNotes || '',
      wardrobeNotes: s.wardrobeNotes || '',
      references: Array.isArray(s.references) ? s.references : (hasText(s.references) ? [s.references] : []),
      frameworkTags,
      category,
      generalNotes: s.generalNotes || '',
      whatWentRight: s.whatWentRight || '',
      couldBeBetter: s.couldBeBetter || '',
      lessonsLearned,
      projectPhoto: s.projectPhoto || null,
      moodboardComplete: s.moodboardComplete || false,
      teamRequired: s.teamRequired || (s.requiresTeam ? 'yes' : ''),
      teamFinalized: s.teamFinalized || false,
      teamMembers: (s.teamMembers || []).map(tm => ({ socialPlatform: 'instagram', ...tm })),
      talents: Array.isArray(s.talents) ? s.talents : (hasText(s.talentName) || (s.socialHandles || []).some(sh => hasText(sh.handle)) ? [{ name: s.talentName || '', socialHandles: s.socialHandles || [] }] : []),
      archived: s.archived || false,
    };
  }

  // A project id (and a shoot's projectId, when it has one) is any non-empty
  // string.
  function isValidProjectId(id) {
    return typeof id === 'string' && id.trim() !== '';
  }

  // The projects that still have at least one shoot. Takes its inputs rather
  // than reading `state`, so loadState can use it too — pruneEmptyProjects is
  // the live-state version.
  function projectsWithMembers(projects, shoots) {
    const used = new Set();
    shoots.forEach(s => {
      if (s && isValidProjectId(s.projectId)) used.add(s.projectId);
    });
    return projects.filter(p => used.has(p.id));
  }

  // Load/import pass for state.projects (see "Projects" further down for what
  // a project is). Keeps well-formed { id, name, createdAt } records — the
  // first of any repeated id wins, names are trimmed and a blank one becomes
  // "Untitled project" — and clears a shoot's projectId that isn't a usable
  // id. A shoot whose project has no record gets the record rebuilt rather
  // than its projectId stripped: an older cached build (whose loadState
  // doesn't know about state.projects) drops every record on its next save
  // but keeps each shoot's projectId, since shoots are saved whole — so
  // rebuilding here brings the grouping back, named after the project's
  // earliest shoot that has a title. Projects left with no shoots are dropped.
  // Called from loadState, so it must not touch `state`, and anything it reads
  // has to be a function declaration or a const declared above
  // `let state = loadState()`.
  function normalizeProjects(rawProjects, shoots) {
    const byId = new Map();
    (Array.isArray(rawProjects) ? rawProjects : []).forEach(p => {
      if (!p || typeof p !== 'object' || !isValidProjectId(p.id) || byId.has(p.id)) return;
      const record = {
        id: p.id,
        name: (typeof p.name === 'string' && p.name.trim()) || UNTITLED_PROJECT_NAME,
        createdAt: (typeof p.createdAt === 'string' && p.createdAt) || todayStr(),
      };
      // A multi-day project's lead day and the signature of what was last
      // mirrored from it (see syncProjectMirrors).
      if (isValidProjectId(p.leadShootId)) record.leadShootId = p.leadShootId;
      if (typeof p.mirrorSig === 'number') record.mirrorSig = p.mirrorSig;
      byId.set(p.id, record);
    });
    const membersById = new Map();
    shoots.forEach(s => {
      if (!s || s.projectId === undefined || s.projectId === '') return;
      if (!isValidProjectId(s.projectId)) {
        s.projectId = '';
        return;
      }
      if (!membersById.has(s.projectId)) membersById.set(s.projectId, []);
      membersById.get(s.projectId).push(s);
    });
    membersById.forEach((members, id) => {
      if (byId.has(id)) return;
      const named = members
        .slice()
        .sort((a, b) => dateTimeSortKey(a).localeCompare(dateTimeSortKey(b)))
        .find(s => typeof s.title === 'string' && s.title.trim());
      byId.set(id, { id, name: named ? named.title.trim() : UNTITLED_PROJECT_NAME, createdAt: todayStr() });
    });
    return projectsWithMembers([...byId.values()], shoots);
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      const rawFrameworks = (Array.isArray(parsed.frameworks) && parsed.frameworks.length) ? parsed.frameworks : seedFrameworks();
      const retiredLightingFwId = (rawFrameworks.find(f => f.name === 'Lighting') || {}).id;
      const frameworks = migrateFrameworks(rawFrameworks);
      const shoots = (parsed.shoots || []).map(s => migrateShoot(s, frameworks));
      migrateIdeaPhaseStatus(shoots);
      normalizeShootStatuses(shoots);
      removeFramework(shoots, retiredLightingFwId);
      renameFrameworkTag(shoots, frameworks, 'Visual Language', 'Surreal', 'Surrealism');
      removeFrameworkTags(shoots, frameworks, 'Visual Language', RETIRED_VISUAL_LANGUAGE_TAGS, VISUAL_LANGUAGE_TAGS);
      // Needs the shoots in their final shape: it rebuilds any project record
      // a shoot still points at and drops projects left with no shoots.
      const projects = normalizeProjects(parsed.projects, shoots);
      // sourceShootId entries were auto-mirrored from a shoot's own reflection
      // fields — that mirroring is gone (Reflections now only ever shows
      // entries written there directly), so any left over from before are
      // dropped here rather than lingering as orphaned duplicates. The
      // reflection text itself isn't lost: it still lives on the shoot.
      const journalEntries = (Array.isArray(parsed.journalEntries) ? parsed.journalEntries : [])
        .filter(e => !e.sourceShootId)
        .map(migrateJournalEntry);
      return {
        shoots,
        projects,
        frameworks,
        journalEntries,
        titleDisplayMode: parsed.titleDisplayMode === 'title' ? 'title' : 'talent',
        colorTheme: THEME_KEYS.includes(parsed.colorTheme) ? parsed.colorTheme : 'default',
        defaultCountry: typeof parsed.defaultCountry === 'string' ? parsed.defaultCountry : '',
        dismissedLocationKeys: Array.isArray(parsed.dismissedLocationKeys) ? parsed.dismissedLocationKeys : [],
        dismissedTeamMemberKeys: Array.isArray(parsed.dismissedTeamMemberKeys) ? parsed.dismissedTeamMemberKeys : [],
        dismissedTalentKeys: Array.isArray(parsed.dismissedTalentKeys) ? parsed.dismissedTalentKeys : [],
        dismissedLightingSetupKeys: Array.isArray(parsed.dismissedLightingSetupKeys) ? parsed.dismissedLightingSetupKeys : [],
        photographer: normalizePhotographer(parsed.photographer),
      };
    } catch (e) {
      console.error('Failed to load state, starting fresh', e);
      return defaultState();
    }
  }

  // Photos stay on the in-memory objects so rendering can read them
  // synchronously, but they're stripped back out on the way to localStorage —
  // they live in IndexedDB instead (see projectPhotoKey/talentPhotoKey). This
  // is what keeps a routine autosave a small text-only write instead of
  // re-serializing every base64 photo in the library.
  // NOTE: a JSON replacer matches by key name at any depth, so these two names
  // are reserved for photos — don't reuse them for anything that must persist.
  function stripPhotos(key, value) {
    if (key === 'projectPhoto' || key === 'photo') return undefined;
    return value;
  }

  function saveState() {
    // Every save first brings multi-day projects in line: a change to a lead
    // day is mirrored onto the days following it, and a following day that
    // was changed by hand stops following (see syncProjectMirrors).
    syncProjectMirrors();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state, stripPhotos));
  }

  let state = loadState();
  applyColorTheme(state.colorTheme);

  // ---------- helpers ----------
  function todayStr() {
    return formatDate(new Date());
  }

  // Mirrors the "Due:" label on the deadline — "Shoots:" while the date is
  // still ahead (or today), "Shot:" once it's in the past, so a glance at
  // either label tells you whether that half of the bubble is done or not.
  function shootDateLabel(s, formatter) {
    if (!s.date) return 'Date TBD';
    const prefix = s.date >= todayStr() ? 'Shoots' : 'Shot';
    return `${prefix}: ${formatter(s.date)}`;
  }

  function formatDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // Buckets a future date string into this week / next week / later, for
  // the Overview's Upcoming subheadings. Weeks run Sunday-Saturday.
  function weekBucket(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfThisWeek = new Date(today);
    endOfThisWeek.setDate(today.getDate() + (6 - today.getDay()));
    const endOfNextWeek = new Date(endOfThisWeek);
    endOfNextWeek.setDate(endOfThisWeek.getDate() + 7);
    if (date <= endOfThisWeek) return 'this_week';
    if (date <= endOfNextWeek) return 'next_week';
    return 'later';
  }

  const WEEK_BUCKET_LABELS = { this_week: 'This week', next_week: 'Next week', later: 'Later' };

  const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function monthLabel(monthNum) {
    return monthNum === '00' ? 'Undated' : (MONTH_NAMES[Number(monthNum) - 1] || monthNum);
  }

  // 'YYYY-MM-DD' -> 'MM.DD.YY', for the call sheet / archive PDF naming
  // format — distinct from prettyDate's "Jan 5, 2026" used on-page.
  function formatDateDots(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${m}.${d}.${y.slice(2)}`;
  }

  // A nested level of collapsing inside an already-collapsible Overview
  // section: each week-bucket subheading (This week / Next week / Later)
  // toggles just its own rows, independent of its sibling buckets and of
  // the outer section — same isSectionCollapsed persistence, one key per
  // bucket (e.g. "overview:upcoming:this_week"). Takes collapseProjects()
  // items rather than bare shoots, so a project's box is drawn once and
  // lands in the bucket of its own date for this list (see listItemDate).
  function renderBucketedShoots(container, items, buckets, dateField, collapsePrefix, rowOpts) {
    buckets.forEach(bucketKey => {
      const bucketItems = items.filter(item => weekBucket(listItemDate(item, dateField)) === bucketKey);
      if (!bucketItems.length) return;

      const collapseKey = `${collapsePrefix}:${bucketKey}`;
      const collapsed = isSectionCollapsed(collapseKey);

      const heading = document.createElement('p');
      heading.className = `upcoming-subheading${collapsed ? ' collapsed' : ''}`;
      heading.innerHTML = `${escapeHtml(WEEK_BUCKET_LABELS[bucketKey])}${COLLAPSE_ARROW_SVG}`;
      container.appendChild(heading);

      const rowsWrap = document.createElement('div');
      rowsWrap.className = 'upcoming-subheading-rows';
      rowsWrap.hidden = collapsed;
      bucketItems.forEach(item => renderListItem(rowsWrap, item, rowOpts));
      container.appendChild(rowsWrap);

      heading.addEventListener('click', () => {
        const nowCollapsed = !rowsWrap.hidden;
        rowsWrap.hidden = nowCollapsed;
        heading.classList.toggle('collapsed', nowCollapsed);
        setSectionCollapsed(collapseKey, nowCollapsed);
      });
    });
  }

  function prettyDate(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }

  // Numeral date with dot separators, e.g. "7.10.26" — field order follows
  // the device's locale (M/D/Y, D/M/Y, Y/M/D, ...) via Intl.
  function prettyDateShort(dateStr) {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const parts = new Intl.DateTimeFormat(undefined, { year: '2-digit', month: 'numeric', day: 'numeric' }).formatToParts(dt);
    return parts.filter(p => p.type !== 'literal').map(p => p.value).join('.');
  }

  function prettyTime(timeStr) {
    if (!timeStr) return '';
    const [hStr, mStr] = timeStr.split(':');
    let h = Number(hStr);
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12;
    if (h === 0) h = 12;
    return `${h}:${mStr} ${ampm}`;
  }

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }

  function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function dateSortKey(dateStr) {
    return dateStr || '9999-99-99';
  }

  function dateTimeSortKey(s) {
    return `${dateSortKey(s.date)}T${s.startTime || '00:00'}`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function hasText(v) {
    return !!(v && v.trim());
  }

  // Date-TBD shoots are deliberately left out of the Overview's Upcoming
  // list — with no date they can't be placed in this week/next week/later,
  // and they're still reachable from the Shoots tab regardless.
  function isUpcoming(s) {
    return !s.archived && !POST_CAPTURE_STATUSES.includes(s.status) && s.status !== 'rescheduled' && s.status !== 'canceled' && !!s.date && s.date > todayStr();
  }

  function isToday(s) {
    return !s.archived && !POST_CAPTURE_STATUSES.includes(s.status) && s.status !== 'rescheduled' && s.status !== 'canceled' && s.date === todayStr();
  }

  // A past-due deadline stays listed here (in red, via the .overdue class on
  // .shoot-row-due) rather than quietly disappearing — it's still owed, just
  // late. It only drops off once delivered or archived.
  function isUpcomingDeadline(s) {
    return !s.archived && !!s.deadline && s.status !== 'delivered';
  }

  // A mood board only realistically matters for a shoot that's actively
  // being planned — a prospect is still too early to know if there'll even
  // be one, and anything past "shoot ready" already happened, so there's
  // nothing left to prep. Scoped to exactly these two statuses rather than
  // "not yet post-capture", which used to let prospects slip through too.
  function moodboardPending(s) {
    return (s.status === 'planning' || s.status === 'waiting_to_shoot') && !s.moodboardComplete;
  }

  // Same cut-off for an unfinalized team: once a shoot is past "shoot ready"
  // (captured onward, postponed or canceled) there's no team left to
  // assemble. Prospects keep it, as before — unlike a mood board, a team can
  // reasonably be lined up before the shoot is even confirmed.
  function teamPending(s) {
    const status = s.status || 'prospect';
    return (status === 'prospect' || status === 'planning' || status === 'waiting_to_shoot')
      && s.teamRequired === 'yes' && !s.teamFinalized;
  }

  function shootPendingLabels(s) {
    const labels = [];
    if (teamPending(s)) labels.push('Team');
    // The underlying value is left alone either way, so it's exactly right
    // again if the status ever moves back into range.
    if (moodboardPending(s)) labels.push(isVideoShoot(s) ? 'Storyboard' : 'Moodboard');
    return labels;
  }

  // The first talent with a name, used wherever a shoot needs a single
  // "the talent" fallback (display name, PDF title/filename) despite
  // possibly having several talent cards.
  function primaryTalentName(s) {
    const t = (s.talents || []).find(t => hasText(t.name));
    return t ? t.name : '';
  }

  // Defaults to talent name first (falling back to the shoot title, then a
  // placeholder); the app-wide display setting (state.titleDisplayMode) flips
  // the priority for every shoot at once.
  function shootDisplayName(s) {
    const talentName = primaryTalentName(s);
    return state.titleDisplayMode === 'title'
      ? (s.title || talentName || 'Untitled shoot')
      : (talentName || s.title || 'Untitled shoot');
  }

  const SHOOT_THUMB_EMPTY_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13" r="3.5"/></svg>`;

  function shootThumbHtml(s) {
    return s.projectPhoto
      ? `<div class="shoot-thumb"><img src="${s.projectPhoto}" alt="" /></div>`
      : `<div class="shoot-thumb shoot-thumb-empty">${SHOOT_THUMB_EMPTY_SVG}</div>`;
  }

  function renderShootRow(container, s, opts) {
    // Lets a section suppress the whole badge outright — e.g. Overview's
    // Proofs pending and Upcoming deadlines sections are each already one
    // homogeneous category, so re-stating "Pending: Proofs" or the status
    // on every row there is redundant. Today/Upcoming shoots mix several
    // statuses together, so the badge still earns its place there.
    const showBadge = !opts || opts.showBadge !== false;
    // Archive opts this in: a delivered shoot doesn't need its own status
    // re-stated there (it's implied by being in Archive), but if it's
    // missing final images that's worth flagging — resolved async below
    // since it requires an IndexedDB lookup, unlike every other badge part.
    const checkFinalImages = !!(showBadge && opts && opts.checkFinalImages && s.status === 'delivered' && !isVideoShoot(s));
    const statusLabel = (showBadge && opts && opts.showStatus && !checkFinalImages) ? (STATUS_LABELS[s.status] || '') : '';
    const pendingLabels = (showBadge && opts && opts.showPending) ? shootPendingLabels(s) : [];
    const pendingText = pendingLabels.length ? `Pending: ${escapeHtml(pendingLabels.join(', '))}` : '';
    // Proofs are only "pending" for the captured step itself — once a shoot
    // moves to waiting_for_selects, proofs have already gone out. Video has
    // no proofs step at all (after Captured it goes to Rough cut).
    const proofsPendingText = (showBadge && s.status === 'captured' && !isVideoShoot(s)) ? 'Pending: Proofs' : '';
    // Once a shoot's captured there's a reflection worth writing eventually —
    // flag it if that's never happened yet, same idea as missing final images.
    // Applies on the Shoots page too, not just Archive, now that reflections
    // are expected any time from captured onward rather than only once archived.
    const hasReflection = hasText(s.whatWentRight) || hasText(s.couldBeBetter) || hasText(s.lessonsLearned);
    const reflectionPendingText = (showBadge && POST_CAPTURE_STATUSES.includes(s.status) && !hasReflection) ? 'Pending: Reflection' : '';
    // Status now gets its own stacked line with a background pill (see
    // .shoot-row-status-pill below) — everything else stays in the old
    // <br>-joined badge, which keeps its existing hidden/shown logic and its
    // async final-images top-up untouched, just moved to its own line under
    // the stack instead of sharing a slot with status.
    const badgeParts = [pendingText, proofsPendingText, reflectionPendingText].filter(Boolean);
    const badgeHtml = badgeParts.join('<br>');
    // Once delivered (or archived) there's nothing left to deliver, so the
    // deadline no longer means anything — don't show it. Otherwise, an
    // overdue deadline still shows, just in red.
    const isOverdue = !!s.deadline && s.deadline < todayStr();
    const dueHtml = (s.deadline && !s.archived && s.status !== 'delivered')
      ? `<span class="shoot-row-date-line shoot-row-due${isOverdue ? ' overdue' : ''}">Due: ${prettyDateShort(s.deadline)}</span>`
      : '';
    const statusHtml = statusLabel
      ? `<span class="shoot-row-status-pill">${escapeHtml(statusLabel)}</span>`
      : '';
    // Opt-in (Today only): "Desert Western · Day 2 of 3" under the date for
    // a shoot that's part of a project, in the date line's own style.
    const rowProject = (opts && opts.showProjectLine && s.projectId) ? findProject(s.projectId) : null;
    const rowDayInfo = rowProject ? projectDayInfo(s) : null;
    const projectLineHtml = rowProject
      ? `<span class="shoot-row-date-line">${escapeHtml(rowProject.name)}${rowDayInfo ? ` · Day ${rowDayInfo.day} of ${rowDayInfo.total}` : ''}</span>`
      : '';
    const div = document.createElement('div');
    div.className = 'shoot-row';
    div.innerHTML = `
      ${shootThumbHtml(s)}
      <div class="shoot-row-body">
        <span class="shoot-row-title"><strong>${escapeHtml(shootDisplayName(s))}</strong></span>
        <span class="shoot-row-date-line">${shootDateLabel(s, prettyDateShort)}</span>
        ${projectLineHtml}
        ${dueHtml}
        ${statusHtml}
        <span class="badge"${badgeHtml ? '' : ' hidden'}>${badgeHtml}</span>
      </div>
      <div class="shoot-row-accent-strip">
        <button type="button" class="row-options-btn" aria-label="Options">&#8942;</button>
      </div>
    `;
    div.addEventListener('click', () => {
      if (opts && opts.switchToShootsTab) document.querySelector('.tab[data-view="shoots"]').click();
      if (opts && opts.openArchiveMode) { openArchiveMode(s.id); return; }
      openShootModal(s.id);
    });
    div.querySelector('.row-options-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      openShootOptions(s.id);
    });
    if (checkFinalImages) {
      idbGetImages(finalImagesKey(s.id)).then(images => {
        if (images.length) return;
        const badgeEl = div.querySelector('.badge');
        badgeEl.innerHTML = [...badgeParts, 'Pending: Final images'].join('<br>');
        badgeEl.hidden = false;
      }).catch(() => {});
    }
    container.appendChild(div);
  }

  // A smaller, photo-free row for tight spaces (the Overview counter
  // popups) — title, status, and shoot date, each on its own line, so
  // nothing is ever squeezed side-by-side against anything else.
  // opts.openArchiveMode (the project popup, for archived days) opens the
  // read-only Archive mode recap instead, same as a row on the Archive tab.
  function renderCompactShootRow(container, s, opts) {
    const statusLabel = STATUS_LABELS[s.status] || '';
    const div = document.createElement('div');
    div.className = 'shoot-row-compact';
    div.innerHTML = `
      <div class="shoot-row-compact-body">
        <span class="shoot-row-compact-title">${escapeHtml(shootDisplayName(s))}</span>
        ${statusLabel ? `<span class="badge">${escapeHtml(statusLabel)}</span>` : ''}
        <span class="mi-sub">${shootDateLabel(s, prettyDateShort)}</span>
      </div>
      <button type="button" class="row-options-btn" aria-label="Options">&#8942;</button>
    `;
    div.addEventListener('click', () => {
      if (opts && opts.openArchiveMode) { openArchiveMode(s.id); return; }
      openShootModal(s.id);
    });
    div.querySelector('.row-options-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      openShootOptions(s.id);
    });
    container.appendChild(div);
  }

  // ---------- Projects in lists ----------
  // Every list of shoot rows (Overview, the counter popups, Shoots, Archive)
  // runs its shoots through collapseProjects() first, so a project's members
  // show as ONE box per list instead of a row per day. The helpers below read
  // either kind of item the same way. Today, Stats and the Journal stay
  // per-shoot and never see project boxes.

  // The shoot an item is sorted and filed by: a plain shoot is its own; a
  // project box uses its rep (collapseProjects: its next day ahead, else its
  // first day).
  function listItemRep(item) {
    return item.kind === 'project' ? item.rep : item.shoot;
  }

  // The date a list item is filed under for a given shoot field ('date' or
  // 'deadline') — a shoot's own value, or a project box's rep's, except for
  // 'deadline', where a project files under the earliest still-owed deadline
  // among its listed members: the same one its Due line shows.
  function listItemDate(item, field) {
    if (item.kind !== 'project') return item.shoot[field] || '';
    if (field === 'deadline') return projectNextDeadline(item.members);
    return item.rep[field] || '';
  }

  // Shoots-tab Status-sort group: a shoot's own status, or for a project box
  // the least-advanced status among its listed members, so the box sits with
  // whatever's still left to do.
  function listItemStatusKey(item) {
    return item.kind === 'project' ? projectGroupStatusKey(item.members) : (item.shoot.status || 'prospect');
  }

  // Short dot-date range in prettyDateShort's locale-ordered numeral style —
  // "10.14–10.16.26" on an M/D/Y device. Two ends in the same year write the
  // year once, on whichever end the locale puts it (the end for M/D/Y and
  // D/M/Y, the start for Y/M/D), so the range still reads in the device's own
  // field order; different years spell out both ends in full; a single date
  // (or two equal ones) is just that date.
  function prettyDateRangeShort(startStr, endStr) {
    if (!startStr || !endStr || startStr === endStr) return prettyDateShort(startStr || endStr);
    if (startStr.slice(0, 4) !== endStr.slice(0, 4)) return `${prettyDateShort(startStr)}–${prettyDateShort(endStr)}`;
    const numeralParts = (dateStr) => {
      const [y, m, d] = dateStr.split('-').map(Number);
      return new Intl.DateTimeFormat(undefined, { year: '2-digit', month: 'numeric', day: 'numeric' })
        .formatToParts(new Date(y, m - 1, d))
        .filter(p => p.type !== 'literal');
    };
    const startParts = numeralParts(startStr);
    const endParts = numeralParts(endStr);
    const join = (parts, withYear) => parts.filter(p => withYear || p.type !== 'year').map(p => p.value).join('.');
    const yearFirst = startParts.length > 0 && startParts[0].type === 'year';
    return yearFirst
      ? `${join(startParts, true)}–${join(endParts, false)}`
      : `${join(startParts, false)}–${join(endParts, true)}`;
  }

  // First-to-last date span of the given members ('' when none has a date).
  // Undated members are simply left out of the span.
  function projectDateRangeText(members) {
    const dates = members.map(s => s.date).filter(Boolean).sort();
    return dates.length ? prettyDateRangeShort(dates[0], dates[dates.length - 1]) : '';
  }

  // A project box's version of shootDateLabel: the same "Shoots:"/"Shot:"
  // prefix ("Shoots" while its last listed day is still ahead or today,
  // "Shot" once every listed day has passed) over the span of its listed
  // members' dates. "Date TBD" when none of them has a date yet.
  function projectDateRangeLabel(members) {
    const range = projectDateRangeText(members);
    if (!range) return 'Date TBD';
    const last = members.map(s => s.date).filter(Boolean).sort().pop();
    return `${last >= todayStr() ? 'Shoots' : 'Shot'}: ${range}`;
  }

  // Earliest still-owed deadline among the given members, by the same rule
  // as Upcoming deadlines (isUpcomingDeadline): overdue still counts (and
  // shows in red), delivered or archived doesn't. '' when there's none.
  function projectNextDeadline(members) {
    return members.filter(isUpcomingDeadline).map(s => s.deadline).sort()[0] || '';
  }

  // One box standing in for a project's members in a list. It uses the same
  // .shoot-row markup and classes as renderShootRow (same 96px thumb, accent
  // strip and 120px body floor) but is filled from the project:
  // - its name, and its rep's cover (else the first member's that has one);
  // - the date span of the members in THIS list;
  // - a "N shoots" line in the date line's style. N counts every member,
  //   archived ones included, so it reads the same in every list, plus
  //   "· 2 of 3 shot" while the project is part-way through capture;
  // - the earliest still-owed deadline, and the union of its listed members'
  //   Pending labels.
  // The same opts as renderShootRow switch the status pill and Pending line
  // on or off. Title + date + count + due + one pill/badge line still fits
  // inside the 120px min-height, so the box lines up with the shoot rows
  // around it. Like a shoot row, it only grows when a long Pending line wraps
  // on a narrow screen. Tapping the box, or its ⋮, opens the project popup,
  // never one shoot; each day is reachable from there.
  function renderProjectRow(container, item, opts) {
    const { project, members, rep } = item;
    const allMembers = projectMembers(project.id);
    const showBadge = !opts || opts.showBadge !== false;
    const statusKey = (showBadge && opts && opts.showStatus) ? projectGroupStatusKey(members) : '';
    const statusLabel = statusKey ? (STATUS_LABELS[statusKey] || '') : '';
    const pendingLabels = (showBadge && opts && opts.showPending)
      ? [...new Set([].concat(...members.map(s => shootPendingLabels(s))))]
      : [];
    const pendingText = pendingLabels.length ? `Pending: ${escapeHtml(pendingLabels.join(', '))}` : '';
    // The same per-day reminders a shoot row adds whenever its badge shows
    // (proofs owed on a captured photo day, a reflection never written),
    // said once for the box when any listed day has them.
    const proofsPendingText = (showBadge && members.some(s => s.status === 'captured' && !isVideoShoot(s))) ? 'Pending: Proofs' : '';
    const reflectionPendingText = (showBadge && members.some(s => POST_CAPTURE_STATUSES.includes(s.status)
      && !hasText(s.whatWentRight) && !hasText(s.couldBeBetter) && !hasText(s.lessonsLearned))) ? 'Pending: Reflection' : '';
    const badgeHtml = [pendingText, proofsPendingText, reflectionPendingText].filter(Boolean).join('<br>');
    // "· 2 of 3 shot" only while the project is part-way through capture
    // (projectShotProgressLabel is the same test projectStatusLabel uses); a
    // project entirely ahead or entirely shot already says so through its
    // dates and the list it sits in.
    const progress = projectShotProgressLabel(allMembers);
    const progressText = progress ? ` · ${progress}` : '';
    const countText = `${allMembers.length} ${allMembers.length === 1 ? 'shoot' : 'shoots'}${progressText}`;
    const deadline = projectNextDeadline(members);
    const isOverdue = !!deadline && deadline < todayStr();
    const dueHtml = deadline
      ? `<span class="shoot-row-date-line shoot-row-due${isOverdue ? ' overdue' : ''}">Due: ${prettyDateShort(deadline)}</span>`
      : '';
    const statusHtml = statusLabel
      ? `<span class="shoot-row-status-pill">${escapeHtml(statusLabel)}</span>`
      : '';
    const coverShoot = (rep && rep.projectPhoto) ? rep : allMembers.find(s => s.projectPhoto);
    const div = document.createElement('div');
    div.className = 'shoot-row';
    div.innerHTML = `
      ${shootThumbHtml(coverShoot || {})}
      <div class="shoot-row-body">
        <span class="shoot-row-title"><strong>${escapeHtml(project.name || UNTITLED_PROJECT_NAME)}</strong></span>
        <span class="shoot-row-date-line">${escapeHtml(projectDateRangeLabel(members))}</span>
        <span class="shoot-row-date-line">${escapeHtml(countText)}</span>
        ${dueHtml}
        ${statusHtml}
        <span class="badge"${badgeHtml ? '' : ' hidden'}>${badgeHtml}</span>
      </div>
      <div class="shoot-row-accent-strip">
        <button type="button" class="row-options-btn" aria-label="Project options">&#8942;</button>
      </div>
    `;
    div.addEventListener('click', () => openProjectPopup(project.id));
    div.querySelector('.row-options-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      openProjectPopup(project.id);
    });
    container.appendChild(div);
  }

  // renderCompactShootRow's counterpart for the Overview counter popups: the
  // project's name, its derived status in the status slot, and the date span
  // of its listed members. The status comes from the listed members only:
  // in "In the edit" that's the days actually in the edit, not a later day
  // still being planned. Tap or ⋮ opens the project popup, which stacks
  // above this one.
  function renderCompactProjectRow(container, item) {
    const { project, members } = item;
    const statusLabel = projectStatusLabel(members);
    const div = document.createElement('div');
    div.className = 'shoot-row-compact';
    div.innerHTML = `
      <div class="shoot-row-compact-body">
        <span class="shoot-row-compact-title">${escapeHtml(project.name || UNTITLED_PROJECT_NAME)}</span>
        ${statusLabel ? `<span class="badge">${escapeHtml(statusLabel)}</span>` : ''}
        <span class="mi-sub">${escapeHtml(projectDateRangeLabel(members))}</span>
      </div>
      <button type="button" class="row-options-btn" aria-label="Project options">&#8942;</button>
    `;
    div.addEventListener('click', () => openProjectPopup(project.id));
    div.querySelector('.row-options-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      openProjectPopup(project.id);
    });
    container.appendChild(div);
  }

  // Draws one collapseProjects() item: a normal shoot row, or a project box.
  function renderListItem(container, item, opts) {
    if (item.kind === 'project') renderProjectRow(container, item, opts);
    else renderShootRow(container, item.shoot, opts);
  }

  // Compact (counter popup) version of renderListItem.
  function renderCompactListItem(container, item) {
    if (item.kind === 'project') renderCompactProjectRow(container, item);
    else renderCompactShootRow(container, item.shoot);
  }

  // ---------- mood board / final image storage (IndexedDB) ----------
  function idbOpen() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(IDB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  // Old shoots stored images as plain data-URL strings; normalize to
  // { src, caption } objects so callers never have to branch on shape.
  function normalizeMoodboardImages(images) {
    return (images || []).map(img => (typeof img === 'string' ? { src: img, caption: '' } : img));
  }

  function idbGetImages(key) {
    return idbOpen().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(normalizeMoodboardImages(req.result));
      req.onerror = () => reject(req.error);
    }));
  }

  function idbSetImages(key, images) {
    return idbOpen().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(images, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    }));
  }

  function idbDeleteImages(key) {
    return idbOpen().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).delete(key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    }));
  }

  function finalImagesKey(shootId) {
    return shootId + '__final';
  }

  function journalImagesKey(entryId) {
    return entryId + '__journal';
  }

  // Linked entries share their source shoot's final-images store (see
  // currentJournalImagesKey() for the same rule applied to the open modal);
  // this is the list-view equivalent for looking up any entry's images.
  function journalEntryImagesKey(e) {
    return e.sourceShootId ? finalImagesKey(e.sourceShootId) : journalImagesKey(e.id);
  }

  // ---------- Photo storage (project + talent photos live in IndexedDB) ----------
  // These two used to sit inline on the shoot object as base64 data URLs, which
  // meant every autosave re-serialized all of them into the localStorage blob
  // just to record a title edit. They're stored as a single-entry
  // [{src, caption}] array so they use the exact same store shape as every
  // other image collection here — which also means export/import carries them
  // with no change to the payload format.
  function projectPhotoKey(shootId) {
    return shootId + '__cover';
  }

  function talentPhotoKey(shootId, talentId) {
    return shootId + '__talent_' + talentId;
  }

  function photoFromEntries(entries) {
    return (entries && entries[0] && entries[0].src) || '';
  }

  function savePhotoToIdb(key, dataUrl) {
    return idbSetImages(key, dataUrl ? [{ src: dataUrl, caption: '' }] : []);
  }

  // Every IDB key a shoot owns, so deleting one doesn't orphan rows.
  function shootPhotoKeys(shoot) {
    return [projectPhotoKey(shoot.id)].concat((shoot.talents || []).filter(t => t.id).map(t => talentPhotoKey(shoot.id, t.id)));
  }

  // ---------- Storage usage (App menu) ----------
  // Every image key in the store matches exactly one of these suffix
  // patterns except mood board images, which were the original, un-suffixed
  // shape this store started with — so "none of the above" is what's left
  // for that bucket, not a dedicated pattern of its own.
  function categorizeStorageKey(key) {
    if (key.endsWith('__cover')) return 'cover';
    if (key.endsWith('__final')) return 'final';
    if (key.endsWith('__journal')) return 'journal';
    if (key.includes('__talent_')) return 'talent';
    return 'moodboard';
  }

  // Estimated from the data URL's own encoded length rather than decoding
  // it — base64 inflates the true byte count by ~4/3, so this runs a hair
  // high, but consistently so across every category, which is what matters
  // for comparing them against each other rather than for a byte-exact figure.
  function estimateDataUrlBytes(src) {
    if (!src) return 0;
    const commaIdx = src.indexOf(',');
    const payload = commaIdx === -1 ? src : src.slice(commaIdx + 1);
    return Math.round(payload.length * 0.75);
  }

  function computeIdbStorageBreakdown() {
    return idbOpen().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const totals = { moodboard: 0, cover: 0, talent: 0, final: 0, journal: 0 };
      const counts = { moodboard: 0, cover: 0, talent: 0, final: 0, journal: 0 };
      const req = tx.objectStore(IDB_STORE).openCursor();
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (!cursor) return;
        const category = categorizeStorageKey(String(cursor.key));
        normalizeMoodboardImages(cursor.value).forEach(img => {
          totals[category] += estimateDataUrlBytes(img.src);
          counts[category] += 1;
        });
        cursor.continue();
      };
      tx.oncomplete = () => resolve({ totals, counts });
      tx.onerror = () => reject(tx.error);
    }));
  }

  function formatStorageBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  const STORAGE_CATEGORY_LABELS = [
    ['moodboard', 'Mood board photos'],
    ['final', 'Final images'],
    ['cover', 'Cover photos'],
    ['talent', 'Talent photos'],
    ['journal', 'Journal photos'],
  ];

  async function openStorageUsageModal() {
    const overlay = document.getElementById('storageUsageOverlay');
    const body = document.getElementById('storageUsageBody');
    overlay.hidden = false;
    body.innerHTML = '<p class="field-hint">Calculating…</p>';

    const [estimate, breakdown] = await Promise.all([
      (navigator.storage && navigator.storage.estimate)
        ? navigator.storage.estimate().catch(() => null)
        : Promise.resolve(null),
      computeIdbStorageBreakdown().catch(() => null),
    ]);
    // The popup may have been closed while these were in flight.
    if (overlay.hidden) return;

    const rows = [];
    if (estimate && estimate.usage != null) {
      rows.push(`
        <div class="storage-usage-total">
          <p class="storage-usage-total-label">Total on this device</p>
          <p class="storage-usage-total-value">${formatStorageBytes(estimate.usage)}</p>
        </div>
      `);
    }

    if (breakdown) {
      STORAGE_CATEGORY_LABELS.forEach(([key, label]) => {
        if (!breakdown.counts[key]) return;
        rows.push(`
          <div class="storage-usage-row">
            <p class="storage-usage-row-label">${label}</p>
            <p class="storage-usage-row-value">${formatStorageBytes(breakdown.totals[key])} <span class="storage-usage-row-count">(${breakdown.counts[key]})</span></p>
          </div>
        `);
      });
    }

    let appDataBytes = 0;
    try { appDataBytes = new Blob([localStorage.getItem(STORAGE_KEY) || '']).size; } catch (e) {}
    rows.push(`
      <div class="storage-usage-row">
        <p class="storage-usage-row-label">Shoots, journal &amp; settings (text only)</p>
        <p class="storage-usage-row-value">${formatStorageBytes(appDataBytes)}</p>
      </div>
    `);

    rows.push(`
      <div class="storage-usage-row">
        <p class="storage-usage-row-label">Shoots logged</p>
        <p class="storage-usage-row-value">${state.shoots.length}</p>
      </div>
    `);

    body.innerHTML = rows.join('');
  }

  document.getElementById('storageUsageBtn').addEventListener('click', () => {
    closeAppMenu();
    openStorageUsageModal();
  });
  document.getElementById('storageUsageCloseBtn').addEventListener('click', () => {
    document.getElementById('storageUsageOverlay').hidden = true;
  });
  document.getElementById('storageUsageOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('storageUsageOverlay')) document.getElementById('storageUsageOverlay').hidden = true;
  });

  // Reads every shoot's photos back onto the in-memory state so that all the
  // render code can keep reading shoot.projectPhoto / talent.photo
  // synchronously, exactly as it did when they were stored inline.
  //
  // Each result is written onto whatever shoot/talent currently has that id in
  // `state` (looked up when the read lands, not captured up front) — `state`
  // gets swapped by a pull-to-refresh and shoot objects get replaced by copies
  // on every autosave, so a captured reference can already be an orphan by
  // then. It only fills a photo that's missing, so a late read can never put
  // an older copy over one that was just added, and one read failing no longer
  // ends the whole batch early (which used to let the caller repaint before
  // the other reads had landed). Resolves to how many photos it filled in, so
  // a caller can skip a repaint when nothing changed.
  function hydratePhotos() {
    let filled = 0;
    const jobs = [];
    state.shoots.forEach(shoot => {
      const shootId = shoot.id;
      jobs.push(idbGetImages(projectPhotoKey(shootId)).then(entries => {
        const src = photoFromEntries(entries);
        const cur = state.shoots.find(x => x.id === shootId);
        if (src && cur && !cur.projectPhoto) { cur.projectPhoto = src; filled++; }
      }).catch(() => {}));
      (shoot.talents || []).forEach(talent => {
        if (!talent.id) return;
        const talentId = talent.id;
        jobs.push(idbGetImages(talentPhotoKey(shootId, talentId)).then(entries => {
          const src = photoFromEntries(entries);
          const cur = state.shoots.find(x => x.id === shootId);
          const t = cur && (cur.talents || []).find(x => x.id === talentId);
          if (src && t && !t.photo) { t.photo = src; filled++; }
        }).catch(() => {}));
      });
    });
    return Promise.all(jobs).then(() => filled);
  }

  // Re-attaches the photos already held in memory onto a freshly rebuilt state
  // (matched by id), so reloading `state` from storage — which never has
  // photos, see stripPhotos — can't cause even a single frame of empty
  // thumbnails while IndexedDB is re-read.
  function carryPhotosOver(from, to) {
    const previous = new Map((from.shoots || []).map(s => [s.id, s]));
    (to.shoots || []).forEach(s => {
      const old = previous.get(s.id);
      if (!old) return;
      if (old.projectPhoto && !s.projectPhoto) s.projectPhoto = old.projectPhoto;
      const oldTalents = new Map((old.talents || []).filter(t => t.id).map(t => [t.id, t]));
      (s.talents || []).forEach(t => {
        const o = t.id && oldTalents.get(t.id);
        if (o && o.photo && !t.photo) t.photo = o.photo;
      });
    });
  }

  // One-time move for data saved before photos lived in IDB: anything still
  // inline gets written out to its own key, then dropped from the blob by the
  // next saveState(). Safe to run on every boot — after the first pass there's
  // nothing inline left to find.
  function migrateInlinePhotos() {
    const jobs = [];
    state.shoots.forEach(shoot => {
      if (shoot.projectPhoto) jobs.push(savePhotoToIdb(projectPhotoKey(shoot.id), shoot.projectPhoto));
      (shoot.talents || []).forEach(talent => {
        if (talent.id && talent.photo) jobs.push(savePhotoToIdb(talentPhotoKey(shoot.id, talent.id), talent.photo));
      });
    });
    if (!jobs.length) return Promise.resolve();
    return Promise.all(jobs).then(() => saveState()).catch(() => {});
  }

  // ---------- Projects (groups of shoots) ----------
  // A project groups shoots that belong together — the days of a multi-day
  // shoot, or several shoots that make up one video. Membership lives only on
  // the shoot (shoot.projectId; '' or missing = no project, and a shoot is in
  // at most one), so a record in state.projects is just { id, name,
  // createdAt }: deleting, archiving or importing a shoot needs no project
  // bookkeeping, and a project left with no shoots is simply dropped
  // (pruneEmptyProjects). Projects own no photos — lists borrow a member
  // shoot's cover — so there are no IndexedDB rows of their own to hydrate,
  // export or clean up. Always go through projectsList() rather than reading
  // state.projects directly.

  // Always an array, even on a state object built before projects existed.
  function projectsList() {
    if (!Array.isArray(state.projects)) state.projects = [];
    return state.projects;
  }

  function findProject(id) {
    if (!id) return undefined;
    return projectsList().find(p => p.id === id);
  }

  // Every shoot in the project, archived ones included, in shoot-date order
  // (date TBD last, same as every other date-sorted list).
  function projectMembers(projectId) {
    if (!projectId) return [];
    return state.shoots
      .filter(s => s.projectId === projectId)
      .sort((a, b) => dateTimeSortKey(a).localeCompare(dateTimeSortKey(b)));
  }

  // Postponed (key: rescheduled) and Canceled shoots are off the schedule —
  // applyStatusChange clears their date — so they don't count as a day of
  // the project or toward its progress.
  function isProjectLiveShoot(s) {
    return s.status !== 'rescheduled' && s.status !== 'canceled';
  }

  // "Day 2 of 3": a shoot's place among its project's distinct shoot dates
  // (two shoots on the same date are the same day). null when there's
  // nothing useful to say — not in a project, no date yet, postponed or
  // canceled, or a project that only spans one date.
  function projectDayInfo(shoot) {
    if (!shoot || !shoot.projectId || !findProject(shoot.projectId)) return null;
    if (!shoot.date || !isProjectLiveShoot(shoot)) return null;
    const dates = [...new Set(projectMembers(shoot.projectId)
      .filter(s => s.date && isProjectLiveShoot(s))
      .map(s => s.date))].sort();
    const idx = dates.indexOf(shoot.date);
    if (dates.length < 2 || idx === -1) return null;
    return { day: idx + 1, total: dates.length };
  }

  // The least-advanced status among the given shoots, in STATUS_LABELS order
  // (a missing status reads as Prospect, same as everywhere else).
  function projectLeastAdvancedStatus(shoots) {
    const order = Object.keys(STATUS_LABELS);
    let best = -1;
    shoots.forEach(s => {
      const idx = order.indexOf(s.status || 'prospect');
      if (idx !== -1 && (best === -1 || idx < best)) best = idx;
    });
    return best === -1 ? 'prospect' : order[best];
  }

  // "2 of 3 shot" while a project is part-way through its shoot days (some
  // of its live shoots captured or later, some not yet); '' otherwise. Split
  // out of projectStatusLabel because list boxes show only this part next to
  // the shoot count.
  function projectShotProgressLabel(members) {
    const live = (members || []).filter(isProjectLiveShoot);
    const shotCount = live.filter(s => isPostCaptureStatus(s.status)).length;
    return shotCount && shotCount < live.length ? `${shotCount} of ${live.length} shot` : '';
  }

  // One status for a whole project: its progress while it's part-shot,
  // otherwise the status of the shoot furthest behind (a project is only as
  // far along as its slowest day). With every shoot off the schedule it's
  // Canceled if they all are, else Postponed. '' for no shoots at all.
  function projectStatusLabel(members) {
    const list = members || [];
    if (!list.length) return '';
    const live = list.filter(isProjectLiveShoot);
    if (!live.length) return list.every(s => s.status === 'canceled') ? STATUS_LABELS.canceled : STATUS_LABELS.rescheduled;
    return projectShotProgressLabel(live) || STATUS_LABELS[projectLeastAdvancedStatus(live)] || '';
  }

  // Which Shoots-tab Status group a project's box goes in — the same rule as
  // projectStatusLabel, as a status key.
  function projectGroupStatusKey(members) {
    const list = members || [];
    const live = list.filter(isProjectLiveShoot);
    if (!live.length) return list.length && list.every(s => s.status === 'canceled') ? 'canceled' : 'rescheduled';
    return projectLeastAdvancedStatus(live);
  }

  // The shoot that stands in for a project in a list (its thumbnail, its
  // placement by date or category): the next shoot day from today on, else
  // the earliest-dated one, else simply the first one given.
  function projectRepresentative(members) {
    if (!members || !members.length) return null;
    const today = todayStr();
    const dated = members
      .filter(s => s.date)
      .sort((a, b) => dateTimeSortKey(a).localeCompare(dateTimeSortKey(b)));
    return dated.find(s => s.date >= today) || dated[0] || members[0];
  }

  // Folds a list of shoots into list items, in the order each first appears:
  // a shoot outside any project stays { kind: 'shoot', shoot }, and a
  // project's shoots become one { kind: 'project', project, members, rep }
  // where the first of them was. `members` is only the project's shoots that
  // are in THIS list, in list order (projectMembers() has all of them), and
  // `rep` is projectRepresentative() of those. A projectId whose record is
  // missing reads as no project.
  function collapseProjects(shoots) {
    const projectsById = new Map(projectsList().map(p => [p.id, p]));
    const items = [];
    const projectItems = new Map();
    (shoots || []).forEach(s => {
      const project = s.projectId ? projectsById.get(s.projectId) : undefined;
      if (!project) {
        items.push({ kind: 'shoot', shoot: s });
        return;
      }
      let item = projectItems.get(project.id);
      if (!item) {
        item = { kind: 'project', project, members: [], rep: null };
        projectItems.set(project.id, item);
        items.push(item);
      }
      item.members.push(s);
    });
    projectItems.forEach(item => { item.rep = projectRepresentative(item.members); });
    return items;
  }

  // Doesn't save. Link a shoot to it (setShootProject) straight away — until
  // one is, the next pruneEmptyProjects() drops it again.
  function createProject(name) {
    const project = {
      id: uid(),
      name: (typeof name === 'string' && name.trim()) || UNTITLED_PROJECT_NAME,
      createdAt: todayStr(),
    };
    projectsList().push(project);
    return project;
  }

  // Doesn't save. Run after anything that can take a project's last shoot
  // away (deleting a shoot, taking one out, moving one to another project).
  function pruneEmptyProjects() {
    state.projects = projectsWithMembers(projectsList(), state.shoots);
  }

  // Puts a shoot in a project ('' takes it out), replacing the shoot object
  // the same way every other shoot edit does. Every later save keeps it:
  // autosaveShoot spreads the old shoot under the form's data, and the form
  // never gathers projectId. Then drops any project this left empty. Doesn't
  // save or render. Returns the updated shoot, or null (and changes nothing)
  // when the shoot isn't in state.shoots yet or the project doesn't exist.
  function setShootProject(shootId, projectId) {
    const idx = state.shoots.findIndex(x => x.id === shootId);
    if (idx === -1) return null;
    if (projectId && !findProject(projectId)) return null;
    const prev = state.shoots[idx];
    // A shoot that changes projects (or leaves one) is no longer one of a
    // multi-day project's following days — it never follows another lead.
    const moving = (prev.projectId || '') !== (projectId || '');
    state.shoots[idx] = { ...prev, projectId: projectId || '', ...(moving ? { followsLead: false } : {}) };
    pruneEmptyProjects();
    return state.shoots[idx];
  }

  // ---------- Multi-day mirroring ----------
  // A project made with "Multi-day shoot" has a lead day — the shoot it was
  // made from (project.leadShootId) — and its other days follow it
  // (shoot.followsLead). Everything planned on the lead is mirrored onto
  // the following days, now and on every later change: title, category,
  // talent, team, location and directions, the concept fields, shooting
  // notes, deliverables, deadline, references, frameworks, lighting setups,
  // the mood board and its cover. Each day keeps its own date, times,
  // status, shot list, reflection and final images. Changing any mirrored
  // detail on a following day by hand makes that day its own from then on
  // (followsLead off), and the lead's later changes skip it.
  //
  // The text/list details are compared by signature on every save (run from
  // saveState), so every way of editing a shoot — the form, the ⋮ menu,
  // Shoot mode, the talent popup — is covered without hooks of its own.
  // Photos live in IndexedDB, so mood board and cover changes are reported
  // separately through onShootImagesChanged().

  // The lead day, if the project has one that's still in it.
  function projectLeadOf(project) {
    if (!project || !project.leadShootId) return null;
    const lead = state.shoots.find(s => s.id === project.leadShootId);
    return lead && lead.projectId === project.id ? lead : null;
  }

  // The shoots currently following a project's lead.
  function projectFollowers(project, lead) {
    return state.shoots.filter(s => s.projectId === project.id && s.followsLead && s.id !== lead.id);
  }

  // The mirrored text/list details as one comparable number, normalized the
  // way the Edit Shoot form round-trips them (trimmed references, tags in a
  // fixed order, no list ids, the team platform defaulted), so opening a
  // following day and closing it untouched never reads as an edit. Photos
  // are left out on purpose: at launch they arrive from IndexedDB a moment
  // after everything else, which would look like a change.
  function mirrorSignature(s) {
    const loc = normalizeLocation(s.location);
    // Only tags the form can actually show (their framework and tag still
    // exist — Manage Frameworks can delete or rename them without touching
    // shoots), once each, since a re-save through the form drops the rest.
    const frameworkTags = [...new Set((s.frameworkTags || [])
      .filter(t => (state.frameworks || []).some(fw => fw.id === t.frameworkId && (fw.tags || []).includes(t.tag)))
      .map(t => `${t.frameworkId}|${t.tag}`))].sort();
    return hashString(JSON.stringify([
      // Trimmed like the form saves them (Shoot mode stores text as typed).
      ['title', 'teamRequired', 'talentDirections', 'teamDirections', 'locationDirections',
        'premise', 'character', 'worldNotes', 'shootGoals', 'elevatorPitch', 'shootingNotes',
        'deliverables', 'deliverableDestinations', 'deadline'].map(k => (typeof s[k] === 'string' ? s[k].trim() : '')),
      // A category the form has no option for (e.g. an old shoot's 'client')
      // reads back from the form as none at all.
      CATEGORY_LABELS[s.category] ? s.category : '',
      !!s.teamFinalized,
      !!s.moodboardComplete,
      (s.talents || []).map(t => [(t.name || '').trim(), (t.socialHandles || []).map(h => [h.platform || '', h.handle || ''])]),
      (s.teamMembers || []).map(tm => [tm.name || '', tm.role || '', tm.socialPlatform || 'instagram', tm.socialHandle || '']),
      [loc.name, loc.street, loc.city, loc.state, loc.zip, loc.country],
      normalizeAspectRatios(s.aspectRatios),
      (s.references || []).map(r => (typeof r === 'string' ? r.trim() : '')).filter(Boolean),
      frameworkTags,
      (s.lightingSetups || []).map(l => [l.name || '', l.characteristics || '', l.description !== undefined ? l.description : (l.text || '')]),
    ]));
  }

  // Copies the lead's mirrored details onto one following day — in place,
  // since Shoot mode and the form hold live references to shoot objects. A
  // category change brings the day's status along to its nearest
  // equivalent, the same as flipping the category in the form does.
  function applyLeadDetails(lead, day) {
    ['title', 'category', 'teamRequired', 'talentDirections', 'teamDirections', 'locationDirections',
      'premise', 'character', 'worldNotes', 'shootGoals', 'elevatorPitch', 'shootingNotes',
      'deliverables', 'deliverableDestinations', 'deadline'].forEach(k => { day[k] = lead[k] || ''; });
    day.teamFinalized = !!lead.teamFinalized;
    day.moodboardComplete = !!lead.moodboardComplete;
    day.teamMembers = (lead.teamMembers || []).map(tm => ({ ...tm }));
    day.location = normalizeLocation(lead.location);
    day.aspectRatios = normalizeAspectRatios(lead.aspectRatios);
    day.references = [...(lead.references || [])];
    day.frameworkTags = (lead.frameworkTags || []).map(t => ({ ...t }));
    day.lightingSetups = (lead.lightingSetups || []).map(item => ({
      id: uid(),
      name: item.name || '',
      characteristics: item.characteristics || '',
      description: item.description !== undefined ? item.description : (item.text || ''),
    }));
    // Same people (same talent ids) as the lead. A photo the lead hasn't got
    // in memory keeps the day's own copy rather than blanking it; a new or
    // changed one is written to this day's own IndexedDB row too, so it
    // survives a reload.
    const previous = new Map((day.talents || []).map(t => [t.id, t]));
    day.talents = (lead.talents || []).map(t => {
      const id = t.id || uid();
      const prev = previous.get(id);
      const photo = t.photo || (prev && prev.photo) || '';
      if (t.photo && (!prev || prev.photo !== t.photo)) savePhotoToIdb(talentPhotoKey(day.id, id), t.photo).catch(() => {});
      return { id, name: t.name || '', socialHandles: (t.socialHandles || []).map(h => ({ ...h })), photo };
    });
    day.status = remapStatusForCategory(day.status || 'prospect', day.category);
  }

  // Lets the user know a day just stopped following, and refreshes its
  // Multi-day row if that day's the one open.
  function announceDayDetached(day, lead) {
    const info = projectDayInfo(day);
    const leadInfo = projectDayInfo(lead);
    const dayName = info ? `Day ${info.day}` : 'This day';
    const leadName = leadInfo ? `Day ${leadInfo.day}` : 'the first day';
    showToast(`${dayName} now has its own changes, so later edits to ${leadName} won't copy to it`);
    if (!shootModalOverlay.hidden && currentShootId === day.id) updateMultiDayRow();
  }

  // Run by saveState before every save. For each project with a lead: a
  // following day whose details no longer match what was last mirrored onto
  // it was edited by hand, so it stops following — unless it now matches
  // the lead anyway (the talent popup updates a person on every shoot at
  // once). Then, if the lead itself changed since the last mirror, its
  // details are copied onto every day still following it.
  function syncProjectMirrors() {
    if (!state || !Array.isArray(state.shoots) || !Array.isArray(state.projects)) return;
    state.projects.forEach(project => {
      const lead = projectLeadOf(project);
      if (!lead) return;
      const leadSig = mirrorSignature(lead);
      projectFollowers(project, lead).forEach(day => {
        const sig = mirrorSignature(day);
        if (sig === day.mirrorSig) return;
        if (sig === leadSig) { day.mirrorSig = sig; return; }
        day.followsLead = false;
        delete day.mirrorSig;
        announceDayDetached(day, lead);
      });
      if (leadSig === project.mirrorSig) return;
      projectFollowers(project, lead).forEach(day => {
        applyLeadDetails(lead, day);
        day.mirrorSig = mirrorSignature(day);
      });
      project.mirrorSig = leadSig;
    });
  }

  // Called once a shoot's mood board ({ board: true }) and/or cover
  // ({ cover: true }) has been changed by hand — both live in IndexedDB,
  // outside the signature above. On a lead day it copies what changed onto
  // every following day; on a following day it counts as making that day
  // its own. A cover set from a day's own final images is never reported:
  // it belongs to that day.
  function onShootImagesChanged(shootId, what) {
    const shoot = state.shoots.find(s => s.id === shootId);
    if (!shoot || !shoot.projectId) return;
    const project = findProject(shoot.projectId);
    const lead = projectLeadOf(project);
    if (!lead) return;
    if (shoot.id === lead.id) {
      mirrorLeadImages(project, lead, what || { board: true });
      return;
    }
    if (!shoot.followsLead) return;
    shoot.followsLead = false;
    delete shoot.mirrorSig;
    announceDayDetached(shoot, lead);
    saveState();
  }

  // The lead's mood board and/or cover (per `what`), copied onto each
  // following day's own IndexedDB rows — or just onto `targets` — and the
  // cover onto the in-memory shoot for the lists too. A day that already
  // has final images of its own keeps its cover: once it's been shot, its
  // cover is its own photo, not the plan's.
  function mirrorLeadImages(project, lead, what, targets) {
    const days = targets || projectFollowers(project, lead);
    const wantBoard = !!(what && what.board);
    const wantCover = !!(what && what.cover);
    if (!days.length || (!wantBoard && !wantCover)) return Promise.resolve();
    return Promise.all([
      wantBoard ? idbGetImages(lead.id).catch(() => null) : Promise.resolve(null),
      wantCover ? idbGetImages(projectPhotoKey(lead.id)).catch(() => null) : Promise.resolve(null),
    ]).then(([board, coverRows]) => {
      const cover = wantCover ? (photoFromEntries(coverRows) || lead.projectPhoto || '') : '';
      return Promise.all(days.map(day => {
        const writes = [];
        if (board) writes.push(idbSetImages(day.id, board.map(img => ({ ...img }))));
        if (cover) {
          writes.push(idbGetImages(finalImagesKey(day.id)).catch(() => []).then(finals => {
            if (finals.length) return;
            const live = state.shoots.find(x => x.id === day.id);
            if (live) live.projectPhoto = cover;
            return savePhotoToIdb(projectPhotoKey(day.id), cover);
          }));
        }
        return Promise.all(writes.map(w => w.catch(() => {})));
      }));
    }).then(() => renderAll()).catch(() => {});
  }

  // Every field a saved shoot carries — the Edit Shoot form's own set
  // (gatherShootFormData) plus the older ones migrateShoot fills in — each at
  // its empty default, so a shoot made in code reads exactly like one saved
  // through the form. Location starts with the default country, same as a
  // new shoot draft. projectPhoto lives in memory only (see stripPhotos),
  // like on every other shoot.
  function blankShootRecord(id) {
    return {
      id,
      title: '',
      status: 'prospect',
      date: '',
      deadline: '',
      startTime: '',
      endTime: '',
      crewCallTime: '',
      talentCallTime: '',
      location: normalizeLocation({ country: state.defaultCountry || '' }),
      talents: [],
      category: '',
      premise: '',
      character: '',
      shootGoals: '',
      elevatorPitch: '',
      deliverables: '',
      aspectRatios: [],
      deliverableDestinations: '',
      worldNotes: '',
      moodboardComplete: false,
      teamRequired: '',
      teamFinalized: false,
      teamMembers: [],
      references: [],
      frameworkTags: [],
      whatWentRight: '',
      couldBeBetter: '',
      lessonsLearned: '',
      talentDirections: '',
      teamDirections: '',
      shootingNotes: '',
      locationDirections: '',
      shotList: [],
      lightingSetups: [],
      emotionalBeats: [],
      lightingNotes: '',
      wardrobeNotes: '',
      generalNotes: '',
      projectPhoto: null,
      archived: false,
      projectId: '',
    };
  }

  // Makes a new shoot in the source's project (or overrides.projectId) and
  // adds it to state.shoots; the caller saves and renders. The only
  // overrides read are `date` and `projectId`.
  //   'day':   the next day of the same shoot. Carries over what stays the
  //            same from day to day — title, talent (with their photos),
  //            team, location, times, directions, the concept, shooting
  //            notes, video deliverables, deadline, references, frameworks,
  //            lighting setups (fresh ids), the mood board and the cover
  //            photo — and nothing that belongs to a day that already
  //            happened: no date (that's overrides.date), reflection, final
  //            images, capture/edit timestamps or reminder flags. A source
  //            that's already been shot hands over the shots it didn't tick
  //            off as the new day's list; otherwise the list starts empty.
  //            Status stays put while the source is still before the shoot,
  //            else it starts back at Active planning.
  //   'brief': another shoot for the same project — just the concept, video
  //            deliverables, deadline, references and frameworks, in Active
  //            planning; no title, date, people, place or photos.
  // Photos are read from IndexedDB first (at boot the in-memory copies may
  // not have hydrated yet), falling back to what's in memory, and every
  // write has landed before this resolves, so opening the new shoot straight
  // away finds its mood board, cover and talent photos in place. The shoot
  // is pushed only after those awaits, so it always lands in the live
  // `state` (a pull-to-refresh swaps that object out).
  async function copyShootForProject(src, mode, overrides) {
    const opts = overrides || {};
    // By id: an autosave since the caller looked the source up replaces the
    // shoot object, which would leave `src` an orphan holding older data.
    const source = (src && state.shoots.find(x => x.id === src.id)) || src;
    if (!source) return null;
    let id = uid();
    while (state.shoots.some(x => x.id === id)) id = uid();
    const shoot = blankShootRecord(id);
    shoot.projectId = opts.projectId !== undefined ? (opts.projectId || '') : (source.projectId || '');
    shoot.date = typeof opts.date === 'string' ? opts.date : '';

    // The brief — the part both modes share.
    shoot.category = source.category || '';
    shoot.premise = source.premise || '';
    shoot.character = source.character || '';
    shoot.worldNotes = source.worldNotes || '';
    shoot.shootGoals = source.shootGoals || '';
    shoot.elevatorPitch = source.elevatorPitch || '';
    shoot.deliverables = source.deliverables || '';
    shoot.aspectRatios = normalizeAspectRatios(source.aspectRatios);
    shoot.deliverableDestinations = source.deliverableDestinations || '';
    shoot.deadline = source.deadline || '';
    shoot.references = Array.isArray(source.references) ? [...source.references] : [];
    shoot.frameworkTags = (source.frameworkTags || []).map(t => ({ ...t }));

    if (mode === 'day') {
      shoot.title = source.title || '';
      shoot.status = ['prospect', 'planning', 'waiting_to_shoot'].includes(source.status) ? source.status : 'planning';
      shoot.startTime = source.startTime || '';
      shoot.endTime = source.endTime || '';
      shoot.crewCallTime = source.crewCallTime || '';
      shoot.talentCallTime = source.talentCallTime || '';
      shoot.location = normalizeLocation(source.location);
      shoot.locationDirections = source.locationDirections || '';
      shoot.talentDirections = source.talentDirections || '';
      shoot.teamDirections = source.teamDirections || '';
      shoot.shootingNotes = source.shootingNotes || '';
      shoot.teamRequired = source.teamRequired || '';
      shoot.teamFinalized = !!source.teamFinalized;
      shoot.teamMembers = (source.teamMembers || []).map(tm => ({ socialPlatform: 'instagram', ...tm }));
      shoot.moodboardComplete = !!source.moodboardComplete;
      // Same old-shape handling as openShootModal; fresh ids since they're
      // per-list ids, not shared identities.
      shoot.lightingSetups = (source.lightingSetups || []).map(item => ({
        id: uid(),
        name: item.name || '',
        characteristics: item.characteristics || '',
        description: item.description !== undefined ? item.description : (item.text || ''),
      }));
      // Blank rows are dropped too — they'd only be empty lines to delete.
      shoot.shotList = isPostCaptureStatus(source.status)
        ? (source.shotList || [])
          .filter(item => item && !item.checked && typeof item.text === 'string' && hasText(item.text))
          .map(item => ({ ...(item.id ? { id: uid() } : {}), text: item.text, checked: false }))
        : [];

      const sourceTalents = source.talents || [];
      const readRows = key => idbGetImages(key).catch(() => []);
      const [moodboardImages, coverRows, talentRows] = await Promise.all([
        readRows(source.id),
        readRows(projectPhotoKey(source.id)),
        // A talent without an id can't have a row (the key needs one), so its
        // photo, if any, can only be the in-memory one.
        Promise.all(sourceTalents.map(t => (t.id ? readRows(talentPhotoKey(source.id, t.id)) : Promise.resolve([])))),
      ]);
      // Same talent ids — the photo keys include the shoot id, so they can't
      // collide — so the same person stays recognisable across days.
      shoot.talents = sourceTalents.map((t, i) => ({
        id: t.id || uid(),
        name: t.name || '',
        socialHandles: (t.socialHandles || []).map(sh => ({ ...sh })),
        photo: photoFromEntries(talentRows[i]) || t.photo || '',
      }));
      shoot.projectPhoto = photoFromEntries(coverRows) || source.projectPhoto || null;

      const writes = [];
      if (moodboardImages.length) writes.push(idbSetImages(id, moodboardImages.map(img => ({ ...img }))));
      if (shoot.projectPhoto) writes.push(savePhotoToIdb(projectPhotoKey(id), shoot.projectPhoto));
      shoot.talents.forEach(t => {
        if (t.photo) writes.push(savePhotoToIdb(talentPhotoKey(id, t.id), t.photo));
      });
      // One failed write shouldn't sink the rest (or the new shoot): the
      // photos are on the in-memory shoot regardless, same as after any
      // other failed photo save.
      await Promise.all(writes.map(w => w.catch(() => {})));
    } else {
      shoot.status = 'planning';
    }

    // The project may have been ungrouped (or lost its last shoot) while
    // the photos above were copying. Pointing the new shoot at a record
    // that's gone would have the next load rebuild that project, undoing the
    // ungroup — so it lands as a shoot of its own instead.
    if (shoot.projectId && !findProject(shoot.projectId)) shoot.projectId = '';

    // Same bookkeeping as a shoot created through the form (autosaveShoot).
    applyStatusTimestamps(shoot, null, shoot.status);
    state.shoots.push(shoot);
    return shoot;
  }

  function resizeImageFile(file, maxDim, quality) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
            else { width = Math.round(width * maxDim / height); height = maxDim; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          canvas.getContext('2d').drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  function resizeDataUrlThumb(dataUrl, maxDim, quality) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) { height = Math.round(height * maxDim / width); width = maxDim; }
          else { width = Math.round(width * maxDim / height); height = maxDim; }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = dataUrl;
    });
  }

  // ---------- tab navigation ----------
  const views = {
    overview: document.getElementById('view-overview'),
    shoots: document.getElementById('view-shoots'),
    archive: document.getElementById('view-archive'),
    journal: document.getElementById('view-journal'),
    stats: document.getElementById('view-stats'),
  };

  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const view = btn.dataset.view;
      document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b === btn));
      Object.entries(views).forEach(([key, el]) => { el.hidden = key !== view; });
      // Stop the Archive photo rotation the moment you leave it, rather than
      // waiting on renderArchiveSlideshow's async pass to notice.
      if (view !== 'archive') stopArchiveSlideshow();
      window.scrollTo(0, 0);
      renderAll();
      // Journal's intro was rewritten when the Log and Reflections notebooks
      // merged into one page, under a new key so anyone who dismissed the old
      // wording sees the new one once.
      showTabIntro(view === 'journal' ? 'journal2' : view);
    });
  });

  // ---------- First-time tab intro popups ----------
  const TAB_INTROS = {
    overview: {
      title: 'Overview',
      text: "this is your at-a-glance dashboard to see how many shoots are ready to go, still being planned, or waiting on a team or mood board, plus what's coming up next. tap '+ new shoot' anytime to start logging one.",
    },
    shoots: {
      title: 'Shoots',
      text: 'every active shoot lives here, grouped by status from early idea through delivered. Filter by category up top, and tap any card to reopen it.',
    },
    archive: {
      title: 'Archive',
      text: "shoots move here once you mark them complete, keeping your active list clean while still letting you look back. This is also where you'll find backup and restore for all your data.",
    },
    journal2: {
      title: 'Journal',
      text: "one running page with two kinds of entries. The weekly log fills itself in for every week you shoot: which shoots happened, their categories, and the lessons learned pulled from each shoot's reflection. Tap any shoot or takeaway to see where it came from. Tap '+' to add your own reflection anytime, and tag entries with hashtags so you can find them again later. The table of contents jumps you to any entry or week.",
    },
    stats: {
      title: 'Stats',
      text: 'swipe between breakdowns of your visual languages, categories, team members, statuses, and locations. tap any slice to see exactly which shoots are behind it.',
    },
    // Shown once, right after the first automatic daily report is dismissed —
    // that's the moment the report exists in your head and "where did that go?"
    // is the natural next question. Routed through showTabIntro so it reuses
    // the same popup and seen-once bookkeeping as the tab intros.
    // Shown once, right after shoot mode is declined — the moment the question
    // "fine, but how do I get it back?" actually occurs to you.
    'shootmode:where': {
      title: 'Whenever you want it',
      text: "no problem. Shoot mode is always one tap away: open the shoot and hit the 'shoot mode' button at the top of the page.",
    },
    'report:bell': {
      title: 'Find this again',
      text: "that was your daily report — it turns up once a day with anything that needs attention. You can pull it back up whenever you like: tap the bell at the top of the Overview screen.",
    },
  };

  const TAB_INTRO_KEY = 'dailies_seen_tab_intros_v1';

  function loadSeenTabIntros() {
    try {
      return JSON.parse(localStorage.getItem(TAB_INTRO_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  let seenTabIntros = loadSeenTabIntros();

  function showTabIntro(view) {
    const intro = TAB_INTROS[view];
    if (!intro || seenTabIntros[view]) return;
    document.getElementById('tabIntroTitle').textContent = intro.title;
    document.getElementById('tabIntroText').textContent = intro.text;
    document.getElementById('tabIntroOverlay').hidden = false;
    seenTabIntros[view] = true;
    localStorage.setItem(TAB_INTRO_KEY, JSON.stringify(seenTabIntros));
  }

  document.getElementById('tabIntroCloseBtn').addEventListener('click', () => {
    document.getElementById('tabIntroOverlay').hidden = true;
  });

  // ---------- Photographer information ----------
  // Asked once on first open, and editable any time from the app menu. The
  // prompt is marked seen as soon as it's shown (not on save), so declining to
  // fill it in doesn't mean being asked again every launch.
  const PHOTOGRAPHER_PROMPT_KEY = 'dailies_seen_photographer_prompt_v1';

  function openPhotographerModal(isFirstRun) {
    const p = normalizePhotographer(state.photographer);
    document.getElementById('photographerNameInput').value = p.name;
    document.getElementById('photographerBusinessInput').value = p.businessName;
    document.getElementById('photographerPlatformSelect').value = p.socialPlatform;
    document.getElementById('photographerHandleInput').value = p.socialHandle || '@';
    document.getElementById('photographerPhoneInput').value = p.phone;
    document.getElementById('photographerIntroText').hidden = !isFirstRun;
    document.getElementById('photographerModalTitle').textContent =
      isFirstRun ? 'Welcome — a bit about you' : 'Photographer information';
    document.getElementById('photographerModalOverlay').hidden = false;
  }

  function closePhotographerModal() {
    document.getElementById('photographerModalOverlay').hidden = true;
  }

  function savePhotographerFromForm() {
    state.photographer = normalizePhotographer({
      name: document.getElementById('photographerNameInput').value.trim(),
      businessName: document.getElementById('photographerBusinessInput').value.trim(),
      socialPlatform: document.getElementById('photographerPlatformSelect').value,
      socialHandle: normalizeSocialHandle(document.getElementById('photographerHandleInput').value),
      phone: document.getElementById('photographerPhoneInput').value.trim(),
    });
    saveState();
    closePhotographerModal();
  }

  document.getElementById('photographerSaveBtn').addEventListener('click', savePhotographerFromForm);
  document.getElementById('photographerCloseBtn').addEventListener('click', closePhotographerModal);
  document.getElementById('photographerModalOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('photographerModalOverlay')) closePhotographerModal();
  });

  document.getElementById('photographerInfoBtn').addEventListener('click', () => {
    closeAppMenu();
    openPhotographerModal(false);
  });

  function maybeShowPhotographerPrompt() {
    if (localStorage.getItem(PHOTOGRAPHER_PROMPT_KEY)) return;
    localStorage.setItem(PHOTOGRAPHER_PROMPT_KEY, '1');
    openPhotographerModal(true);
  }

  // ---------- First-time status swatch button intro ----------
  // Shown once, the first time a new shoot is created, so it's clear the
  // "Status: ..." button up top is tappable rather than just a label.
  const STATUS_SWATCH_INTRO_KEY = 'dailies_seen_status_swatch_intro_v1';

  function maybeShowStatusSwatchIntro() {
    if (localStorage.getItem(STATUS_SWATCH_INTRO_KEY)) return;
    document.getElementById('statusSwatchIntroOverlay').hidden = false;
    localStorage.setItem(STATUS_SWATCH_INTRO_KEY, '1');
  }

  document.getElementById('statusSwatchIntroCloseBtn').addEventListener('click', () => {
    document.getElementById('statusSwatchIntroOverlay').hidden = true;
  });

  // ---------- Overview (home) ----------
  document.getElementById('newShootBtn').addEventListener('click', () => openShootModal(null));

  const STAT_BOX_FILTERS = {
    selects: s => !s.archived && s.status === 'waiting_for_selects',
    // Photo shoots in Editing, plus every video step after Captured and
    // before Delivered (Rough cut, Client review, Revisions): video has no
    // separate selects stage, so its whole edit lives in this one tile.
    editing: s => !s.archived && isInTheEditStatus(s.status),
    // Only shoots still being planned or waiting to shoot. Prospects are too
    // early for anyone to have a team or mood board started, and a shoot
    // that's captured, in selects/editing, delivered, postponed or canceled
    // is past needing either — it used to sneak into this count (and list)
    // through an unfinalized team alone, under a title that says "mood
    // boards pending".
    pending: s => !s.archived && (s.status === 'planning' || s.status === 'waiting_to_shoot') && shootPendingLabels(s).length > 0,
  };

  const STAT_BOX_TITLES = {
    pending: 'Teams + mood boards pending',
    selects: 'Waiting for selects',
    editing: 'In the edit',
  };

  document.getElementById('statsRow').addEventListener('click', (e) => {
    const box = e.target.closest('.stat-box');
    if (!box) return;
    const key = box.dataset.stat;
    openStatBoxDetail(STAT_BOX_FILTERS[key], STAT_BOX_TITLES[key], key);
  });

  // Tracks which stat box's list is showing so closeShootModal can re-apply
  // the same filter — the popup stacks UNDER the shoot modal rather than
  // closing when a row's shoot is opened (see .stat-box-detail-overlay's
  // z-index comment), so without this a shoot you just completed from here
  // stayed listed until you closed and reopened the popup by hand.
  let activeStatBoxKey = null;

  // Reference-counted rather than a single on/off flag — the stat box detail
  // popup and the shoot modal can be open at once (a shoot opened from a stat
  // box list stacks on top rather than closing it first, see the z-index
  // comment above), so the second lock must not stomp the first one's saved
  // scroll position, and the page should only actually unlock once both are
  // closed again.
  let bodyScrollLockY = 0;
  let bodyScrollLockCount = 0;
  function lockBodyScroll() {
    if (bodyScrollLockCount === 0) {
      bodyScrollLockY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${bodyScrollLockY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
    }
    bodyScrollLockCount++;
  }
  function unlockBodyScroll() {
    bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1);
    if (bodyScrollLockCount === 0) {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      window.scrollTo(0, bodyScrollLockY);
    }
  }

  // Split out from openStatBoxDetail so a later refresh (see closeShootModal)
  // can repaint just the list, without replaying the open animation or
  // re-locking scroll on a popup that's already open.
  function renderStatBoxDetailList(filterFn) {
    const shoots = state.shoots.filter(filterFn)
      .sort((a, b) => dateTimeSortKey(a).localeCompare(dateTimeSortKey(b)));
    // One compact box per project, matching the tile's own count (see
    // renderOverview), placed where its earliest listed day would sit.
    const items = collapseProjects(shoots);
    const list = document.getElementById('statBoxDetailList');
    list.innerHTML = '';
    items.forEach(item => renderCompactListItem(list, item));
    document.getElementById('statBoxDetailEmpty').hidden = items.length > 0;
  }

  function openStatBoxDetail(filterFn, title, key) {
    activeStatBoxKey = key;
    document.getElementById('statBoxDetailTitle').textContent = title;
    renderStatBoxDetailList(filterFn);
    const overlay = document.getElementById('statBoxDetailOverlay');
    overlay.hidden = false;
    lockBodyScroll();
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('open')));
  }

  // The stat box popup stacks UNDER the shoot modal rather than closing when
  // a row's shoot is opened (see .stat-box-detail-overlay's z-index comment),
  // so every path that can close the shoot modal — save, delete (both the
  // in-modal button and the options-menu one), complete, unarchive — needs
  // to call this or a shoot that just stopped matching the active filter
  // (mood board checked off, deleted, completed…) sits there stale until
  // the popup itself is closed and reopened by hand.
  function refreshOpenStatBoxDetail() {
    if (activeStatBoxKey && !document.getElementById('statBoxDetailOverlay').hidden) {
      renderStatBoxDetailList(STAT_BOX_FILTERS[activeStatBoxKey]);
    }
  }

  function closeStatBoxDetail() {
    activeStatBoxKey = null;
    const overlay = document.getElementById('statBoxDetailOverlay');
    overlay.classList.remove('open');
    unlockBodyScroll();
    setTimeout(() => { overlay.hidden = true; }, 200);
  }

  document.getElementById('statBoxDetailCloseBtn').addEventListener('click', closeStatBoxDetail);
  document.getElementById('statBoxDetailOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeStatBoxDetail();
  });
  // ---------- Project popup ----------
  // A project's own page: every member shoot (archived included) as the
  // same compact rows the stat box popup uses, plus the project-level
  // actions. Built on the stat box popup's overlay/modal classes, so it
  // shares that z-index — under the shoot modal (10) and the kebab sheet
  // (20), so a row's shoot or ⋮ opened from here stacks on top — and
  // renderAll() repaints it (refreshOpenProjectPopup) once they close,
  // the same job refreshOpenStatBoxDetail does for the stat boxes.
  let activeProjectId = null;
  let projectPopupHideTimer = null;
  // Guards "+ Add a day" against a double tap starting a second copy while
  // the first is still awaiting its IndexedDB writes (and Archive/Ungroup
  // against changing the project mid-copy).
  let projectPopupBusy = false;

  // Title, summary and member list only — the rename row is left exactly
  // as it is, so a repaint while you're typing a new name never wipes it.
  function renderProjectPopupBody(project) {
    const members = projectMembers(project.id);
    document.getElementById('projectDetailTitle').textContent = project.name;
    const n = members.length;
    document.getElementById('projectDetailSummary').textContent = [
      `${n} shoot${n === 1 ? '' : 's'}`,
      projectDateRangeText(members),
      projectStatusLabel(members),
    ].filter(Boolean).join(' · ');
    // Flips once every shoot in the project is archived, the same way the
    // ⋮ menu's Archive/Unarchive shoot item does for one shoot.
    document.getElementById('projectArchiveBtn').textContent =
      members.length && members.every(s => s.archived) ? 'Unarchive project' : 'Archive project';
    const list = document.getElementById('projectDetailList');
    list.innerHTML = '';
    members.forEach(s => {
      // The stock compact row, so its tap (opens the shoot modal, which
      // stacks above this popup) and its ⋮ (normal shoot options) work
      // here unchanged; only the title gets its "Day N" prefix. An archived
      // day opens its Archive mode recap instead, like on the Archive tab.
      renderCompactShootRow(list, s, { openArchiveMode: !!s.archived });
      const info = projectDayInfo(s);
      if (!info) return;
      const titleEl = list.lastElementChild && list.lastElementChild.querySelector('.shoot-row-compact-title');
      if (titleEl) titleEl.textContent = `Day ${info.day} · ${titleEl.textContent}`;
    });
  }

  function hideProjectRename() {
    document.getElementById('projectRenameRow').hidden = true;
  }

  function openProjectPopup(projectId) {
    const project = findProject(projectId);
    if (!project || !projectMembers(project.id).length) return;
    // Already open (e.g. "Open <name>" from a member's ⋮ while this is
    // showing) just repaints — no second scroll lock, no replayed fade.
    const wasOpen = activeProjectId !== null;
    if (activeProjectId !== projectId) hideProjectRename();
    activeProjectId = projectId;
    // A reopen inside a previous close's 200ms fade must not be hidden
    // out from under itself when that timer lands.
    clearTimeout(projectPopupHideTimer);
    renderProjectPopupBody(project);
    const overlay = document.getElementById('projectDetailOverlay');
    overlay.hidden = false;
    if (wasOpen) return;
    overlay.querySelector('.stat-box-detail-modal').scrollTop = 0;
    lockBodyScroll();
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('open')));
  }

  // Called at the end of every renderAll(): anything that changes a shoot
  // re-renders the lists, and this keeps the popup underneath in step —
  // or closes it once the project is gone (ungrouped, last shoot deleted
  // or moved out).
  function refreshOpenProjectPopup() {
    if (activeProjectId === null) return;
    const project = findProject(activeProjectId);
    if (!project || !projectMembers(project.id).length) {
      closeProjectPopup();
      return;
    }
    renderProjectPopupBody(project);
  }

  function closeProjectPopup() {
    if (activeProjectId === null) return;
    activeProjectId = null;
    hideProjectRename();
    const overlay = document.getElementById('projectDetailOverlay');
    overlay.classList.remove('open');
    unlockBodyScroll();
    clearTimeout(projectPopupHideTimer);
    projectPopupHideTimer = setTimeout(() => { overlay.hidden = true; }, 200);
  }

  document.getElementById('projectDetailCloseBtn').addEventListener('click', closeProjectPopup);
  document.getElementById('projectDetailOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeProjectPopup();
  });

  // A new day carries the latest day forward: same talent, team, location,
  // times, concept, mood board and lighting, dated the day after it.
  document.getElementById('projectAddDayBtn').addEventListener('click', async () => {
    const project = findProject(activeProjectId);
    if (!project || projectPopupBusy) return;
    const members = projectMembers(project.id);
    if (!members.length) return;
    // projectMembers is date-sorted with undated shoots last, so the last
    // dated member is the latest day — the new one is dated the day after.
    const dated = members.filter(s => s.date);
    const latest = dated.length ? dated[dated.length - 1] : members[members.length - 1];
    let nextDate = '';
    if (latest.date) {
      const [y, m, d] = latest.date.split('-').map(Number);
      nextDate = formatDate(new Date(y, m - 1, d + 1));
    }
    projectPopupBusy = true;
    try {
      // Carries the latest day forward (its times, status, any shots it
      // didn't get to)...
      const shoot = await copyShootForProject(latest, 'day', { date: nextDate });
      // ...and in a multi-day project, then takes on the lead's mirrored
      // details, mood board and cover as they are now (read after the copy,
      // so an edit made to Day 1 meanwhile isn't missed) and follows it.
      const liveProject = findProject(project.id);
      const lead = projectLeadOf(liveProject);
      if (lead && shoot.projectId === project.id) {
        applyLeadDetails(lead, shoot);
        await mirrorLeadImages(liveProject, lead, { board: true, cover: true }, [shoot]);
        shoot.followsLead = true;
        shoot.mirrorSig = mirrorSignature(shoot);
      }
      saveState();
      renderAll();
      refreshOpenStatBoxDetail();
      if (shoot.projectId) {
        const info = projectDayInfo(shoot);
        const dayNumber = info ? info.day : projectMembers(project.id).length;
        showToast(`Day ${dayNumber} added to ${project.name}`);
      } else {
        showToast(`${project.name} was ungrouped, so this was added as its own shoot`);
      }
      // A row tapped while the copy was still being written may already
      // have the shoot modal open — re-filling it would drop unsaved typing.
      if (shootModalOverlay.hidden) openShootModal(shoot.id);
    } catch (err) {
      showToast("Couldn't add a day. Please try again.");
    } finally {
      projectPopupBusy = false;
    }
  });

  document.getElementById('projectRenameBtn').addEventListener('click', () => {
    const project = findProject(activeProjectId);
    if (!project) return;
    const row = document.getElementById('projectRenameRow');
    if (!row.hidden) { row.hidden = true; return; }
    const input = document.getElementById('projectRenameInput');
    input.value = project.name;
    row.hidden = false;
    input.focus();
  });

  function saveProjectRename() {
    const project = findProject(activeProjectId);
    const name = document.getElementById('projectRenameInput').value.trim();
    hideProjectRename();
    // An emptied box reads as "never mind" rather than wiping the name.
    if (!project || !name || name === project.name) return;
    state.projects = projectsList().map(p => (p.id === project.id ? { ...p, name } : p));
    saveState();
    renderAll();
    refreshOpenStatBoxDetail();
  }

  document.getElementById('saveProjectRenameBtn').addEventListener('click', saveProjectRename);

  document.getElementById('projectRenameInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveProjectRename();
  });

  // Archives every shoot in the project in one go (whatever their status,
  // same as the ⋮ menu's Archive shoot), or brings them all back once the
  // whole project is archived. Days already archived on their own just stay
  // archived. The popup stays open on the result, now reading Unarchive.
  document.getElementById('projectArchiveBtn').addEventListener('click', () => {
    const project = findProject(activeProjectId);
    // Not mid-copy: a day still being added would miss the change.
    if (!project || projectPopupBusy) return;
    const members = projectMembers(project.id);
    if (!members.length) return;
    const unarchiving = members.every(s => s.archived);
    const n = members.length;
    const who = n === 1 ? 'Its 1 shoot moves' : `All ${n} shoots move`;
    const question = unarchiving
      ? `Unarchive ${project.name}? ${who} back to Shoots.`
      : `Archive ${project.name}? ${who} to Archive.`;
    if (!confirm(question)) return;
    state.shoots = state.shoots.map(s => (s.projectId === project.id ? { ...s, archived: !unarchiving } : s));
    saveState();
    renderAll();
    refreshOpenStatBoxDetail();
    showToast(unarchiving ? `${project.name} is back in Shoots` : `${project.name} moved to Archive`);
  });

  document.getElementById('projectUngroupBtn').addEventListener('click', () => {
    const project = findProject(activeProjectId);
    // Not mid-copy: the day being added would otherwise land after its
    // project is already gone.
    if (!project || projectPopupBusy) return;
    const members = projectMembers(project.id);
    const n = members.length;
    const rest = n === 1 ? 'Its 1 shoot stays as a separate shoot.' : `Its ${n} shoots stay as separate shoots.`;
    if (!confirm(`Ungroup ${project.name}? ${rest}`)) return;
    members.forEach(s => setShootProject(s.id, ''));
    // Removed explicitly as well, rather than leaning only on the prune
    // inside setShootProject, so ungrouping never depends on how that
    // prune decides "empty".
    state.projects = projectsList().filter(p => p.id !== project.id);
    saveState();
    closeProjectPopup();
    renderAll();
    refreshOpenStatBoxDetail();
  });

  function renderOverview() {
    const todayShoots = state.shoots.filter(isToday)
      .sort((a, b) => dateTimeSortKey(a).localeCompare(dateTimeSortKey(b)));
    const upcomingShoots = state.shoots.filter(isUpcoming)
      .sort((a, b) => dateTimeSortKey(a).localeCompare(dateTimeSortKey(b)));
    const deadlineShoots = state.shoots.filter(isUpcomingDeadline)
      .filter(s => weekBucket(s.deadline) === 'this_week' || weekBucket(s.deadline) === 'next_week')
      .sort((a, b) => dateSortKey(a.deadline).localeCompare(dateSortKey(b.deadline)));
    // Video has no proofs step, so a captured video shoot isn't listed here.
    const proofsPendingShoots = state.shoots.filter(s => !s.archived && s.status === 'captured' && !isVideoShoot(s))
      .sort((a, b) => dateTimeSortKey(a).localeCompare(dateTimeSortKey(b)));

    // A project's members collapse into one box per list (collapseProjects),
    // so every list below and each counter's number counts a project once —
    // a tile's number always matches the rows its popup shows. Today is the
    // one exception: a project day happening today is listed as itself.
    const upcomingItems = collapseProjects(upcomingShoots);
    const proofsPendingItems = collapseProjects(proofsPendingShoots);
    const deadlineItems = collapseProjects(deadlineShoots);

    const pendingTeamMoodboardCount = collapseProjects(state.shoots.filter(STAT_BOX_FILTERS.pending)).length;
    const waitingForSelectsCount = collapseProjects(state.shoots.filter(STAT_BOX_FILTERS.selects)).length;
    const inTheEditCount = collapseProjects(state.shoots.filter(STAT_BOX_FILTERS.editing)).length;

    document.getElementById('statsRow').innerHTML = `
      <div class="stat-box" data-stat="pending">
        <span class="stat-num">${pendingTeamMoodboardCount}</span>
        <span class="stat-label">Teams + mood boards pending</span>
      </div>
      <div class="stat-box" data-stat="selects">
        <span class="stat-num">${waitingForSelectsCount}</span>
        <span class="stat-label">Waiting for selects</span>
      </div>
      <div class="stat-box" data-stat="editing">
        <span class="stat-num">${inTheEditCount}</span>
        <span class="stat-label">In the edit</span>
      </div>
    `;

    document.getElementById('todaySection').hidden = todayShoots.length === 0;
    document.getElementById('todayCount').textContent = `[${todayShoots.length}]`;
    const todayList = document.getElementById('todayShootsList');
    todayList.innerHTML = '';
    // Today lists each shoot day as itself (a project's other days are still
    // one box under Upcoming), so a project day says which project it's from.
    todayShoots.forEach(s => renderShootRow(todayList, s, { showStatus: true, showProjectLine: true }));

    // Always visible, even at zero — same reasoning as Upcoming deadlines
    // below: a reliable place to glance at what's coming, empty or not.
    document.getElementById('upcomingCount').textContent = `[${upcomingItems.length}]`;
    const upList = document.getElementById('upcomingShootsList');
    upList.innerHTML = '';
    if (!upcomingItems.length) {
      upList.innerHTML = '<p class="empty-hint upcoming-empty-hint">Upcoming shoots go here, brometheus.</p>';
    } else {
      renderBucketedShoots(upList, upcomingItems, ['this_week', 'next_week', 'later'], 'date', 'overview:upcoming', { showStatus: true });
    }

    // Always visible, same reasoning as Upcoming deadlines below — a
    // reliable place to check, empty or not, rather than something that
    // pops in and out of the page.
    document.getElementById('proofsPendingCount').textContent = `[${proofsPendingItems.length}]`;
    const proofsList = document.getElementById('proofsPendingShootsList');
    proofsList.innerHTML = '';
    if (!proofsPendingItems.length) {
      proofsList.innerHTML = '<p class="empty-hint">No shoots waiting on proofs.</p>';
    } else {
      proofsPendingItems.forEach(item => renderListItem(proofsList, item, { showBadge: false }));
    }

    // Always visible, even at zero — unlike Today/Upcoming, this section
    // isn't about whether anything's due right now so much as being a
    // reliable place to glance at what's coming, empty or not.
    document.getElementById('upcomingDeadlinesCount').textContent = `[${deadlineItems.length}]`;
    const deadlineList = document.getElementById('upcomingDeadlinesShootsList');
    deadlineList.innerHTML = '';
    if (!deadlineItems.length) {
      deadlineList.innerHTML = '<p class="empty-hint">No deadlines on the horizon.</p>';
    } else {
      renderBucketedShoots(deadlineList, deadlineItems, ['this_week', 'next_week'], 'deadline', 'overview:upcomingDeadlines', { showBadge: false });
    }

    // Section heading colors alternate dynamically, always starting with
    // yellow — Today drops out of the page entirely when nothing's due
    // today, so whichever section actually lands first (Today or Upcoming)
    // gets yellow, not a section tied to a fixed color.
    const overviewSectionIds = ['todaySection', 'upcomingSection', 'proofsPendingSection', 'upcomingDeadlinesSection'];
    let nextIsYellow = true;
    overviewSectionIds.forEach(id => {
      const section = document.getElementById(id);
      if (section.hidden) return;
      const heading = section.querySelector('h2');
      heading.classList.toggle('heading-yellow', nextIsYellow);
      heading.classList.toggle('heading-navy', !nextIsYellow);
      nextIsYellow = !nextIsYellow;
    });

    applyOverviewCollapseState();
  }

  const OVERVIEW_COLLAPSE_SECTIONS = [
    ['overview:today', '#todaySection h2', 'todayShootsList'],
    ['overview:upcoming', '#upcomingSection h2', 'upcomingShootsList'],
    ['overview:proofsPending', '#proofsPendingSection h2', 'proofsPendingShootsList'],
    ['overview:upcomingDeadlines', '#upcomingDeadlinesSection h2', 'upcomingDeadlinesShootsList'],
  ];

  function applyOverviewCollapseState() {
    OVERVIEW_COLLAPSE_SECTIONS.forEach(([key, headingSelector, listId]) => {
      const heading = document.querySelector(headingSelector);
      const list = document.getElementById(listId);
      const collapsed = isSectionCollapsed(key);
      list.hidden = collapsed;
      heading.classList.toggle('collapsed', collapsed);
    });
  }

  OVERVIEW_COLLAPSE_SECTIONS.forEach(([key, headingSelector, listId]) => {
    const heading = document.querySelector(headingSelector);
    const list = document.getElementById(listId);
    heading.addEventListener('click', () => {
      const nowCollapsed = !list.hidden;
      setSectionCollapsed(key, nowCollapsed);
      list.hidden = nowCollapsed;
      heading.classList.toggle('collapsed', nowCollapsed);
    });
  });

  // ---------- Shoot Log view ----------
  // The Shoots page has three sort modes, each with its own nested-heading
  // scheme:
  //  - 'status' (default): grouped by status, same as always.
  //  - 'shoot_date': ignores status entirely and reorganizes every shoot by
  //    how soon it happens.
  //  - 'category': grouped by shoot category, only showing categories that
  //    actually have a shoot in them.
  // The chosen sort is remembered on this device (like collapsed sections),
  // so the Shoots page reopens the way it was left, even after a relaunch.
  const SHOOT_SORT_KEY = 'dailies_shoot_sort_v1';
  const SHOOT_SORT_LABELS = { status: 'Status', shoot_date: 'Shoot date', category: 'Category' };

  function loadShootSort() {
    try {
      const saved = localStorage.getItem(SHOOT_SORT_KEY);
      return SHOOT_SORT_LABELS[saved] ? saved : 'status';
    } catch (e) {
      return 'status';
    }
  }

  let shootSort = loadShootSort();

  const SHOOT_DATE_BUCKET_ORDER = ['this_week', 'next_week', 'later_this_month', 'next_month', 'future', 'past', 'undated'];
  const SHOOT_DATE_BUCKET_LABELS = {
    past: 'Past',
    this_week: 'This week',
    next_week: 'Next week',
    later_this_month: 'Later this month',
    next_month: 'Next month',
    future: 'In the future',
    undated: 'Undated',
  };

  // Buckets a shoot date by proximity for the 'shoot_date' sort — a finer
  // breakdown than weekBucket() (which only serves Overview's this/next/later
  // split), since this needs to separate "later this month" from "next month"
  // from "further out," and also has to account for dates already in the
  // past (weekBucket() is only ever used for upcoming, not-yet-shot dates).
  function shootDateBucket(dateStr) {
    if (!dateStr) return 'undated';
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfThisWeek = new Date(today);
    startOfThisWeek.setDate(today.getDate() - today.getDay());
    const endOfThisWeek = new Date(startOfThisWeek);
    endOfThisWeek.setDate(startOfThisWeek.getDate() + 6);
    const startOfNextWeek = new Date(endOfThisWeek);
    startOfNextWeek.setDate(endOfThisWeek.getDate() + 1);
    const endOfNextWeek = new Date(startOfNextWeek);
    endOfNextWeek.setDate(startOfNextWeek.getDate() + 6);
    const endOfThisMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const endOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 2, 0);

    if (date < startOfThisWeek) return 'past';
    if (date <= endOfThisWeek) return 'this_week';
    if (date <= endOfNextWeek) return 'next_week';
    if (date <= endOfThisMonth) return 'later_this_month';
    if (date <= endOfNextMonth) return 'next_month';
    return 'future';
  }

  function renderShootSortOptions() {
    document.getElementById('shootSortToggle').textContent = `Sort: ${SHOOT_SORT_LABELS[shootSort]}`;
    document.querySelectorAll('#shootSortOptions .chip').forEach(chip => {
      chip.classList.toggle('active', chip.dataset.sort === shootSort);
    });
  }

  document.getElementById('shootSortToggle').addEventListener('click', () => {
    const options = document.getElementById('shootSortOptions');
    options.hidden = !options.hidden;
  });

  document.getElementById('shootSortOptions').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip || !chip.dataset.sort) return;
    shootSort = chip.dataset.sort;
    try { localStorage.setItem(SHOOT_SORT_KEY, shootSort); } catch (e) { /* ignore */ }
    document.getElementById('shootSortOptions').hidden = true;
    renderShoots();
  });

  function renderCategoryFilterChips(containerId, toggleId, activeFilter) {
    const container = document.getElementById(containerId);
    const visibleCats = CATEGORY_FILTER_ORDER.filter(isCategoryVisible);
    container.innerHTML = `
      <button type="button" class="chip ${activeFilter === 'all' ? 'active' : ''}" data-filter="all">All</button>
      ${visibleCats.map(cat => `<button type="button" class="chip ${activeFilter === cat ? 'active' : ''}" data-filter="${cat}">${CATEGORY_LABELS[cat]}</button>`).join('')}
      <button type="button" class="chip chip-manage"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> Edit</button>
    `;
    document.getElementById(toggleId).textContent = `Filter: ${activeFilter === 'all' ? 'All' : (CATEGORY_LABELS[activeFilter] || 'All')}`;
  }

  // Shared renderer for one nested group (status / date bucket / category)
  // on the Shoots page — same collapsible pill-heading + rows-wrap structure
  // regardless of which sort mode built the group. Takes collapseProjects()
  // items, so a project shows as one box (see renderListItem).
  function renderShootGroup(list, groupKey, label, items, visibleIndex) {
    const groupEl = document.createElement('div');
    groupEl.className = 'shoot-status-group';

    const collapseKey = `shoots:${groupKey}`;
    const collapsed = isSectionCollapsed(collapseKey);
    const heading = document.createElement('h2');
    heading.className = `status-group-heading ${visibleIndex % 2 === 0 ? 'heading-yellow' : 'heading-navy'}${collapsed ? ' collapsed' : ''}`;
    heading.innerHTML = `${escapeHtml(label)}${COLLAPSE_ARROW_SVG}`;

    const rowsWrap = document.createElement('div');
    rowsWrap.className = 'shoot-status-rows';
    rowsWrap.hidden = collapsed;
    items.forEach(item => renderListItem(rowsWrap, item, { showPending: true }));

    heading.addEventListener('click', () => {
      const nowHidden = !rowsWrap.hidden;
      rowsWrap.hidden = nowHidden;
      heading.classList.toggle('collapsed', nowHidden);
      setSectionCollapsed(collapseKey, nowHidden);
    });

    groupEl.appendChild(heading);
    groupEl.appendChild(rowsWrap);
    list.appendChild(groupEl);
  }

  // Default — grouped by status, same as always: every group orders by
  // shoot date except the edit stages (Editing, and video's Rough cut/Client
  // review/Revisions), which order by deadline since that's the date that
  // actually matters once a shoot's already been captured. A project box
  // goes in the group of its least-advanced listed day (listItemStatusKey)
  // and sorts by its rep, through the same comparators.
  function renderShootsByStatus(list, items) {
    let visibleIndex = 0;
    Object.keys(STATUS_LABELS).forEach(statusKey => {
      const group = items.filter(item => listItemStatusKey(item) === statusKey)
        .sort((a, b) => {
          const repA = listItemRep(a);
          const repB = listItemRep(b);
          // Edit stages sort by the deadline each row shows (for a project
          // box, its earliest still-owed one — see listItemDate).
          return isInTheEditStatus(statusKey)
            ? dateSortKey(listItemDate(a, 'deadline')).localeCompare(dateSortKey(listItemDate(b, 'deadline')))
            : dateTimeSortKey(repA).localeCompare(dateTimeSortKey(repB));
        });
      if (!group.length) return;
      renderShootGroup(list, statusKey, STATUS_LABELS[statusKey], group, visibleIndex);
      visibleIndex++;
    });
  }

  // Ignores status entirely — every shoot lands in one bucket by how soon
  // (or how long ago) its shoot date is; a project box by its rep's date
  // (its next day ahead, else its first day).
  function renderShootsByDate(list, items) {
    const buckets = new Map();
    items.forEach(item => {
      const bucket = shootDateBucket(listItemRep(item).date);
      if (!buckets.has(bucket)) buckets.set(bucket, []);
      buckets.get(bucket).push(item);
    });
    let visibleIndex = 0;
    SHOOT_DATE_BUCKET_ORDER.forEach(bucketKey => {
      const group = buckets.get(bucketKey);
      if (!group || !group.length) return;
      group.sort((a, b) => dateTimeSortKey(listItemRep(a)).localeCompare(dateTimeSortKey(listItemRep(b))));
      renderShootGroup(list, `date:${bucketKey}`, SHOOT_DATE_BUCKET_LABELS[bucketKey], group, visibleIndex);
      visibleIndex++;
    });
  }

  // Grouped by category — only categories with at least one shoot show up,
  // in the app's usual category order (not alphabetical; that's just for
  // the Edit Shoot category dropdown). A project box files under its rep's
  // category.
  function renderShootsByCategory(list, items) {
    const buckets = new Map();
    items.forEach(item => {
      const cat = listItemRep(item).category || 'other';
      if (!buckets.has(cat)) buckets.set(cat, []);
      buckets.get(cat).push(item);
    });
    let visibleIndex = 0;
    CATEGORY_FILTER_ORDER.forEach(cat => {
      const group = buckets.get(cat);
      if (!group || !group.length) return;
      group.sort((a, b) => dateTimeSortKey(listItemRep(a)).localeCompare(dateTimeSortKey(listItemRep(b))));
      renderShootGroup(list, `cat:${cat}`, CATEGORY_LABELS[cat] || 'Other', group, visibleIndex);
      visibleIndex++;
    });
  }

  function renderShoots() {
    renderShootSortOptions();
    const list = document.getElementById('shootList');
    // Collapsed once for the whole page, so every sort mode files a
    // project's box exactly once (by its rep, or its least-advanced day for
    // Status) rather than splitting it across groups.
    const items = collapseProjects(state.shoots.filter(s => !s.archived));

    list.innerHTML = '';
    document.getElementById('shootEmpty').hidden = items.length !== 0;

    if (shootSort === 'shoot_date') renderShootsByDate(list, items);
    else if (shootSort === 'category') renderShootsByCategory(list, items);
    else renderShootsByStatus(list, items);
  }

  // ---------- Archive view ----------
  let archiveFilter = 'all';
  let archiveSlideshowTimer = null;
  let archiveSlideshowSignature = '';

  // The rotation is deliberately split out from the DOM build below. Each tick
  // cross-fades and scales a full-size photo over 4.2s on a 4.2s interval, so
  // something is always animating — left running it would keep compositing
  // large bitmaps while you're on a completely different tab. It's started
  // only while Archive is actually on screen (see stopArchiveSlideshow's
  // callers: tab switches and the app going to the background).
  function startArchiveSlideshow() {
    stopArchiveSlideshow();
    const container = document.getElementById('archiveSlideshow');
    if (!container || views.archive.hidden || document.hidden) return;
    const imgs = container.querySelectorAll('img');
    if (imgs.length < 2) return;
    let idx = Array.prototype.findIndex.call(imgs, im => im.classList.contains('active'));
    if (idx < 0) idx = 0;
    archiveSlideshowTimer = setInterval(() => {
      const current = container.querySelectorAll('img');
      if (!current.length) return;
      current[idx].classList.remove('active');
      idx = (idx + 1) % current.length;
      current[idx].classList.add('active');
    }, 4200);
  }

  function stopArchiveSlideshow() {
    clearInterval(archiveSlideshowTimer);
    archiveSlideshowTimer = null;
  }

  // Pulls final images across every non-video shoot (any status) and cycles
  // through them; skips a rebuild if the image set hasn't actually changed so
  // the animation doesn't restart every time renderAll() runs. Video shoots
  // have no final images (any left from before a switch to video are hidden).
  function renderArchiveSlideshow() {
    const shoots = state.shoots.filter(s => !isVideoShoot(s));
    Promise.all(shoots.map(s => idbGetImages(finalImagesKey(s.id)))).then(results => {
      const images = [];
      results.forEach((imgs, i) => {
        imgs.forEach(img => { if (img.src) images.push({ src: img.src, shootId: shoots[i].id }); });
      });
      const signature = images.map(img => img.src).join('|');
      // Unchanged image set: leave the existing <img>s alone, but still
      // re-evaluate the timer — this is the path taken when you navigate back
      // to Archive, where the DOM is already built but the rotation is stopped.
      if (signature === archiveSlideshowSignature) {
        startArchiveSlideshow();
        return;
      }
      archiveSlideshowSignature = signature;
      shuffleArray(images);

      stopArchiveSlideshow();
      const container = document.getElementById('archiveSlideshow');
      container.querySelectorAll('img').forEach(img => img.remove());
      document.getElementById('archiveSlideshowEmpty').hidden = images.length > 0;
      if (!images.length) return;

      images.forEach((entry, idx) => {
        const img = document.createElement('img');
        img.src = entry.src;
        img.dataset.shootId = entry.shootId;
        if (idx === 0) img.classList.add('active');
        container.appendChild(img);
      });

      startArchiveSlideshow();
    });
  }

  document.getElementById('archiveSlideshow').addEventListener('click', (e) => {
    const img = e.target.closest('img');
    if (!img) return;
    const shoot = state.shoots.find(s => s.id === img.dataset.shootId);
    if (!shoot) return;
    document.querySelector(`.tab[data-view="${shoot.archived ? 'archive' : 'shoots'}"]`).click();
    openShootModal(shoot.id);
  });

  document.getElementById('archiveFilterToggle').addEventListener('click', () => {
    const filters = document.getElementById('archiveFilters');
    filters.hidden = !filters.hidden;
  });

  document.getElementById('archiveFilters').addEventListener('click', (e) => {
    if (e.target.closest('.chip-manage')) {
      document.getElementById('archiveFilters').hidden = true;
      openCategoryVisibilityModal();
      return;
    }
    const chip = e.target.closest('.chip');
    if (!chip || !chip.dataset.filter) return;
    archiveFilter = chip.dataset.filter;
    document.getElementById('archiveFilters').hidden = true;
    renderArchive();
  });

  // Groups archived shoots into year > month buckets, most recent first, so
  // a growing archive stays browsable instead of one long flat list.
  // Undated shoots (no shoot date recorded) fall into their own trailing
  // "Undated" bucket rather than disappearing. Same collapsible pill
  // heading as the Shoots screen's status groups, nested one level for
  // months — collapse state persists per year and per year+month.
  function renderArchive() {
    renderArchiveSlideshow();
    renderCategoryFilterChips('archiveFilters', 'archiveFilterToggle', archiveFilter);
    const list = document.getElementById('archiveList');
    // Filter first, then collapse: a project box stands for the members that
    // match the active category filter (its date span covers just those).
    // It's filed by its rep's date (for a fully past project, its first day),
    // so it shows once, under one month, even when its days straddle a month
    // or year boundary. Newest first, same as before.
    let shoots = state.shoots.filter(s => s.archived);
    if (archiveFilter !== 'all') shoots = shoots.filter(s => s.category === archiveFilter);
    const items = collapseProjects(shoots)
      .sort((a, b) => dateSortKey(listItemRep(b).date).localeCompare(dateSortKey(listItemRep(a).date)));

    list.innerHTML = '';
    document.getElementById('archiveEmpty').hidden = items.length !== 0;

    const years = new Map();
    items.forEach(item => {
      const date = listItemRep(item).date;
      const year = date ? date.slice(0, 4) : 'Undated';
      const month = date ? date.slice(5, 7) : '00';
      if (!years.has(year)) years.set(year, new Map());
      const months = years.get(year);
      if (!months.has(month)) months.set(month, []);
      months.get(month).push(item);
    });

    const sortedYears = [...years.keys()].sort((a, b) => {
      if (a === 'Undated') return 1;
      if (b === 'Undated') return -1;
      return b.localeCompare(a);
    });

    let visibleYearIndex = 0;
    sortedYears.forEach(year => {
      const months = years.get(year);
      const sortedMonths = [...months.keys()].sort((a, b) => b.localeCompare(a));

      const yearGroupEl = document.createElement('div');
      yearGroupEl.className = 'shoot-status-group';

      const yearCollapseKey = `archive:${year}`;
      const yearCollapsed = isSectionCollapsed(yearCollapseKey);
      const yearHeading = document.createElement('h2');
      yearHeading.className = `status-group-heading ${visibleYearIndex % 2 === 0 ? 'heading-yellow' : 'heading-navy'}${yearCollapsed ? ' collapsed' : ''}`;
      yearHeading.innerHTML = `${escapeHtml(year)}${COLLAPSE_ARROW_SVG}`;

      const yearRowsWrap = document.createElement('div');
      yearRowsWrap.className = 'shoot-status-rows';
      yearRowsWrap.hidden = yearCollapsed;

      if (year === 'Undated') {
        // Undated only ever has the one '00' month bucket anyway — a
        // second "Undated" sub-heading under the "Undated" year heading
        // is pure redundancy, so just list the shoots directly.
        sortedMonths.forEach(month => {
          months.get(month).forEach(item => renderListItem(yearRowsWrap, item, { showBadge: false, openArchiveMode: true }));
        });
      } else {
        let visibleMonthIndex = 0;
        sortedMonths.forEach(month => {
          const monthGroupEl = document.createElement('div');
          monthGroupEl.className = 'archive-month-group';

          const monthCollapseKey = `archive:${year}:${month}`;
          const monthCollapsed = isSectionCollapsed(monthCollapseKey);
          const monthHeading = document.createElement('h3');
          monthHeading.className = `status-group-heading archive-month-heading ${visibleMonthIndex % 2 === 0 ? 'heading-yellow' : 'heading-navy'}${monthCollapsed ? ' collapsed' : ''}`;
          monthHeading.innerHTML = `${escapeHtml(monthLabel(month))}${COLLAPSE_ARROW_SVG}`;

          const monthRowsWrap = document.createElement('div');
          monthRowsWrap.className = 'shoot-status-rows';
          monthRowsWrap.hidden = monthCollapsed;
          months.get(month).forEach(item => renderListItem(monthRowsWrap, item, { showBadge: false, openArchiveMode: true }));

          monthHeading.addEventListener('click', () => {
            const nowHidden = !monthRowsWrap.hidden;
            monthRowsWrap.hidden = nowHidden;
            monthHeading.classList.toggle('collapsed', nowHidden);
            setSectionCollapsed(monthCollapseKey, nowHidden);
          });

          monthGroupEl.appendChild(monthHeading);
          monthGroupEl.appendChild(monthRowsWrap);
          yearRowsWrap.appendChild(monthGroupEl);
          visibleMonthIndex++;
        });
      }

      yearHeading.addEventListener('click', () => {
        const nowHidden = !yearRowsWrap.hidden;
        yearRowsWrap.hidden = nowHidden;
        yearHeading.classList.toggle('collapsed', nowHidden);
        setSectionCollapsed(yearCollapseKey, nowHidden);
      });

      yearGroupEl.appendChild(yearHeading);
      yearGroupEl.appendChild(yearRowsWrap);
      list.appendChild(yearGroupEl);
      visibleYearIndex++;
    });
  }

  // ---------- Journal ----------
  let currentJournalEntry = null;
  let journalIsNew = false;
  let journalMode = 'view';
  let currentJournalTags = [];
  let journalSaveTimer = null;
  let journalHasImages = false;
  let journalPromptOffered = null;

  // 300 photography-specific reflection prompts (craft, personal growth,
  // business growth) offered via the "Need a starting prompt?" button.
  const JOURNAL_PROMPTS = [
    'What does the light in your favorite recent image tell you about how your eye has changed this year?',
    'When you look back at your earliest portraits, what technical habit do you notice yourself repeating that you no longer do?',
    'Where in your process do you still hesitate, and what would it take to move through that hesitation?',
    'What is a compositional choice you used to avoid that you now reach for instinctively?',
    'Describe an image where you let a mistake stay in the frame — what did it end up giving you?',
    'Which of your recent edits pulled you further from what your camera actually captured, and why did that feel right?',
    'What have you been quietly practicing behind the scenes that hasn\'t shown up in your published work yet?',
    'When did you last change your mind mid-shoot about how a story should be told, and what shifted?',
    'What\'s a piece of gear or software you\'ve been avoiding learning, and what is that avoidance protecting you from?',
    'Think of a portrait you underexposed on purpose — what were you trying to make the viewer feel?',
    'What do your color grades keep telling on you about your current mood or mindset?',
    'Which subject\'s face have you photographed enough times that you\'re starting to see new things in familiar light?',
    'What is the difference between the photographer you were a year ago and the one editing tonight?',
    'Where does your eye go first when you walk into a new space, and has that instinct shifted recently?',
    'What\'s an editing decision you keep un-doing and re-doing on the same image, and what does that back-and-forth reveal?',
    'Which of your recent images relied on someone else\'s trust more than your own technical skill?',
    'What is a lighting setup you\'ve stopped using, and what replaced it in your instincts?',
    'When did a technical limitation — bad light, wrong lens, no time — accidentally push your storytelling somewhere better?',
    'What\'s the difference between a photo you took to prove something and one you took because you needed to see it?',
    'Which recurring pose or gesture do you now steer subjects away from, and when did that change?',
    'What have you started noticing in other photographers\' work that you didn\'t have language for a year ago?',
    'Where in your editing workflow do you rush, and what would slowing down there cost you?',
    'What\'s an image you\'re proud of that you almost didn\'t take because it broke one of your own rules?',
    'Which part of your process still feels like performance rather than instinct?',
    'What does your default crop ratio say about how you think a story should be framed?',
    'When did you last choose imperfection over polish in a final image, and how did that sit with you?',
    'What technical skill are you building right now that has nothing to do with the camera itself?',
    'Which recent shoot made you realize your composition instincts have outgrown your gear, or the reverse?',
    'What\'s a visual habit from your early work you\'re trying to unlearn on purpose?',
    'Where do you still copy another photographer\'s choices instead of trusting your own eye?',
    'What\'s the boldest editing choice you\'ve made this year that a client or viewer never noticed?',
    'Which image took the most technical risk, and what would you have lost by playing it safe?',
    'What do you keep photographing that you haven\'t figured out how to talk about yet?',
    'When does your work feel most like you, technically speaking — in the shooting or in the editing?',
    'What\'s a piece of feedback about your style that stung because it was accurate?',
    'Which shadow, reflection, or blur have you been chasing across several shoots without naming why?',
    'What story are you telling with your sequencing choices lately, separate from any single image?',
    'Where has your relationship with sharpness and focus shifted — what used to feel essential that no longer does?',
    'What\'s an editing preset or look you built for yourself, and what does it protect you from deciding each time?',
    'Which recent portrait required you to abandon your plan entirely — what did you learn from following the moment instead?',
    'What technical constraint are you currently working within on purpose, as a way of forcing growth?',
    'Which of your images do you return to not because it\'s good, but because it\'s unresolved?',
    'What have you stopped explaining to clients because you trust your instincts on it now?',
    'Where does your work get quieter — less composed, less controlled — and what happens there?',
    'What\'s a color, texture, or type of light you avoid because it\'s difficult, not because it\'s wrong for the story?',
    'Which recent choice in the edit surprised you, as if someone else made it?',
    'What does the gap between how you shoot and how you were taught to shoot look like right now?',
    'When did you last let a subject\'s discomfort into the frame instead of directing it away?',
    'What\'s a narrative device — silence, distance, repetition — you\'ve started borrowing from outside photography?',
    'Which of your technical strengths has quietly become a crutch?',
    'What would your work look like if you removed the safety net you always fall back on?',
    'Where do you sense your next stylistic shift coming from, even if you can\'t see it clearly yet?',
    'What\'s an image you keep revisiting in your edits months later, and what does it still ask of you?',
    'Which lighting decision do you make almost without thinking now that used to take real deliberation?',
    'What have you learned about restraint — pulling back rather than adding — in your recent editing?',
    'Where in your body do you feel it when a frame is right, before you can explain why?',
    'What\'s a technical rule you broke recently on purpose, and what did it cost or earn you?',
    'Which of your images tells a story you didn\'t consciously intend to tell?',
    'What do you notice yourself avoiding in post-production — a tone, a correction, a truth?',
    'When did your understanding of composition move from rules to something more like intuition?',
    'What\'s a risk you took with a client\'s portrait that you wouldn\'t have taken a year ago?',
    'Which piece of your process have you handed over to trust — in your gear, your instinct, or your subject — that you used to control?',
    'What does your unedited, unfiltered first look at a shoot tell you that the final selects don\'t?',
    'Where do you find yourself softening an image\'s harder truths, and is that instinct serving the story?',
    'What\'s a technique you admire in someone else\'s work that you\'ve tried and deliberately abandoned?',
    'Which recent shoot asked more of your patience than your technical skill?',
    'What does the pace of your shutter finger these days say about how you\'re seeing?',
    'Where has your eye for negative space changed, and what filled that space before?',
    'What\'s an image that only worked because you let go of your original intention for it?',
    'Which technical habit are you currently trying to build so it becomes as automatic as breathing?',
    'What does it feel like in your body when you know a shot is right before you even check the screen?',
    'When was the last time you trusted your first instinct instead of second-guessing it?',
    'What would you shoot differently if you were certain no one would judge the result?',
    'Which of your photographs took the most courage to show someone else, and why?',
    'When do you feel most like yourself behind the camera?',
    'What\'s a compliment about your work you still have trouble believing?',
    'How has the way you carry yourself on a shoot changed since your first paid job?',
    'What would it look like to direct a session without apologizing for your choices?',
    'If a stranger only ever saw your portfolio, what would they assume about who you are?',
    'Which recurring subject or gesture in your photographs says something true about you that you rarely say out loud?',
    'What part of your personality shows up most clearly in how you pose or direct people?',
    'How do you introduce yourself as a photographer now compared to how you did five years ago?',
    'What\'s a story you tell about becoming a photographer that isn\'t quite the whole truth?',
    'Which photographer you used to want to be like no longer fits who you\'ve become?',
    'What does your camera let you say that your voice doesn\'t?',
    'What does a creative block actually feel like for you physically, not just as an idea?',
    'What\'s the difference between a day you can\'t shoot and a day you won\'t?',
    'When you\'re stuck, what\'s the first thing you blame, and is it ever actually true?',
    'What has staring at a blank shot list taught you about what you\'re avoiding?',
    'Which project have you quietly abandoned, and what does its unfinished state tell you?',
    'What ritual, if any, actually gets you unstuck, and why do you resist doing it?',
    'How do you know the difference between needing rest and needing to push through?',
    'What were you chasing the day you decided to take photography seriously?',
    'Is the reason you picked up a camera still the reason you keep picking it up?',
    'What would you photograph this year if income were never part of the decision?',
    'When did you last shoot something purely because you wanted to, with no client attached?',
    'What keeps you at this after a shoot that didn\'t go the way you hoped?',
    'Whose recognition are you actually working for, and have you ever asked yourself that honestly?',
    'What\'s the last moment you felt like a fraud with a camera in your hands, and what triggered it?',
    'Which client or peer\'s opinion of your work do you weigh more than your own, and why them?',
    'What would you need to believe about yourself to stop over-explaining your process to clients?',
    'When a shoot goes well, do you credit skill or luck first, and what does that say?',
    'What credential or milestone do you think would finally make you feel legitimate, and would it really?',
    'How do you talk to yourself in your head during a shoot that isn\'t going well?',
    'What\'s a body of work you haven\'t started because it feels too big for you yet?',
    'If you had to describe your ambition honestly, is it about the work, the recognition, or something else?',
    'What would you have to give up to pursue the kind of photography you actually want to make?',
    'Where do you want your work to be in five years that it isn\'t right now?',
    'What\'s the boldest thing you\'d photograph if you stopped waiting for permission?',
    'Which opportunity have you turned down that you still think about?',
    'What do the people you\'re drawn to photograph have in common with you?',
    'What does your instinct to move closer or step back from a subject say about how you relate to people?',
    'Which of your photographs, looking back, was really about you and not your subject?',
    'What do you notice about yourself in how you wait for a moment versus how you chase one?',
    'What does the way you edit, what you keep and what you cut, reveal about what you value?',
    'When you photograph strangers versus people you love, what changes in you?',
    'What used to impress you in a photograph that leaves you unmoved now?',
    'Which of your early favorites would you be embarrassed to shoot the same way today?',
    'What have you started noticing in light or gesture that you used to walk right past?',
    'How has your definition of a good portrait changed since you started?',
    'What photographers or images shaped your eye early on, and do they still?',
    'What do you find yourself drawn to now that would have bored you a few years ago?',
    'Which habit in your work do you think you\'ve outgrown but haven\'t fully let go of?',
    'What\'s the photograph you\'re afraid to take because of what it might say about you?',
    'When have you played it safe in your work purely to avoid criticism?',
    'What feedback are you most afraid of hearing about a project you care about?',
    'What would you shoot if failing publicly didn\'t scare you?',
    'Which fear has quietly shaped your style more than your taste has?',
    'What did the last risk you took in your work cost you, and was it worth it?',
    'When did you last say yes to a shoot that scared you, and what happened?',
    'What does your relationship with your own reflection in a mirror tell you compared to your reflection in your photographs?',
    'Which part of the creative process do you rush through because sitting with it is uncomfortable?',
    'What do you do differently on the days you feel like an artist versus the days you feel like a vendor?',
    'What would change about your work if you stopped comparing your behind-the-scenes to everyone else\'s highlight reel?',
    'What\'s a piece of criticism you dismissed too quickly and later realized was right?',
    'How do you know when a photograph is actually finished versus when you\'re just tired of looking at it?',
    'What does your camera bag, kept exactly as it is, say about how you think of yourself as an artist?',
    'When you imagine the photographer you want to become, what is she doing differently than you today?',
    'What\'s the compliment you wish someone would give your work that no one ever has?',
    'Which shoot changed how you see yourself, not just how you see your subject?',
    'What does the pace at which you shoot, rushed or unhurried, say about your state of mind lately?',
    'What would it take for you to raise your prices without apologizing for it?',
    'When was the last time you undercharged out of fear rather than strategy, and what did that cost you?',
    'If you priced your work purely on the value it creates for a client rather than the hours you spend, what would change?',
    'What story do you tell yourself about what you\'re "allowed" to charge?',
    'Which package or offering do you keep quietly discounting, and what would happen if you simply stopped?',
    'How does your body react when a client pushes back on your price?',
    'Whose pricing do you keep comparing yourself to, and does that comparison actually serve you?',
    'What\'s the smallest price increase you could make this year that would still feel honest?',
    'When you say a number out loud to a client, what are you really afraid they\'ll think of you?',
    'What would your business look like if you charged for your experience instead of just your time?',
    'Which client relationship taught you the most about what you will and won\'t tolerate?',
    'What does an ideal client actually feel like to work with, beyond simply paying on time?',
    'How has the way you speak to clients changed since your first year in business?',
    'What client interaction are you still turning over in your mind, and why won\'t it settle?',
    'Who is a past client you\'d work with again without hesitation, and what made that relationship so easy?',
    'Where do you catch yourself over-explaining or over-apologizing to clients, and where do you think that habit began?',
    'What do your best clients have in common that you could learn to spot earlier?',
    'How do you want to be remembered by the people whose stories you\'ve photographed?',
    'What part of your work are you proudest of that your marketing never actually shows?',
    'If a stranger scrolled through your portfolio with zero context, what would they assume matters most to you?',
    'What\'s one marketing habit you keep meaning to build but always let slide?',
    'Whose work pulls you in enough to study it closely, and what exactly is it that draws you?',
    'What do you genuinely enjoy about putting yourself out there, if anything?',
    'When did your brand start to feel like you instead of an echo of someone else\'s?',
    'What are you avoiding saying publicly about your work, and what\'s underneath that hesitation?',
    'If you had one breath to explain what makes your photography different, what would you say today?',
    'Which platform or habit drains you most right now, and what would it take to let it go?',
    'Where do most of your best clients actually come from, and are you tending that source or neglecting it?',
    'What would it mean to market from confidence instead of scarcity this season?',
    'What boundary did you set this year that you\'re genuinely proud of holding?',
    'When did you last say yes to a job you already knew, somewhere inside, you should decline?',
    'What does it cost you, physically or emotionally, when you don\'t protect your time off?',
    'Which kind of request is hardest for you to turn down, and what do you think is underneath that difficulty?',
    'What would your ideal response to a scope-creep request sound like, if you let yourself practice it?',
    'Whose approval are you still chasing when you take on work that doesn\'t actually fit you?',
    'What kind of shoot or client have you decided you\'re finished taking on, and how did you arrive there?',
    'When a client pushes past a boundary you\'ve set, what usually happens next, and is that outcome acceptable to you?',
    'What would shift in your business if "no" became a complete sentence for you?',
    'How do you tell the difference between a boundary and a wall you\'ve built out of fear?',
    'What\'s the last negotiation where you left something on the table just to avoid conflict?',
    'How differently do you advocate for your own worth compared to how you\'d advocate for someone else\'s?',
    'What would you need to believe about yourself to negotiate without flinching?',
    'When a client asks if you can "do better on price," what\'s your honest first instinct, and do you trust it?',
    'What negotiation win are you still not giving yourself proper credit for?',
    'What do you wish you\'d said in a past negotiation that you didn\'t have the words for at the time?',
    'Looking at your current client base, what pattern do you notice about who finds you and why?',
    'What kind of client did you dream of working with when you started, and are they the ones actually showing up now?',
    'Which quiet referral or relationship built more of your business than you\'ve ever fully acknowledged?',
    'What would it take to attract fewer clients overall but ones who are a far better fit?',
    'Where have you been fishing for clients who were never going to bite?',
    'What did a slow season in your business teach you that nothing else could have?',
    'If you could only keep five clients from your entire history, who would make that list, and why?',
    'What does financial stability actually look like for you in specific numbers, not vague comfort?',
    'When you imagine your business earning exactly what you want, what does that version of your daily life look like?',
    'Which financial habit from your early years in business are you still carrying, whether or not it still serves you?',
    'What expense do you resent paying that might actually be an investment worth reframing?',
    'How honest are you with yourself about your numbers each month?',
    'What would you do differently this year if money stopped being the loudest voice in the room?',
    'What financial fear have you never said out loud, not even to yourself?',
    'If your income doubled next year, what would you actually want to spend it on?',
    'What\'s a mistake you made early on that you\'re quietly grateful for now?',
    'Which piece of business advice did you follow that turned out to be wrong for you specifically?',
    'What decision do you keep replaying, and what would you tell the version of you who made it?',
    'What went badly with a client or a shoot in a way that reshaped how you work now?',
    'Which old failure are you still faintly ashamed of, and what would it feel like to finally let it go?',
    'What pattern of mistake keeps resurfacing in different forms throughout your business?',
    'What does burnout look like in your body before it ever shows up in your work?',
    'When did you last take a full day off without checking your email, and how did that actually feel?',
    'What part of running this business no longer feels sustainable the way you\'re currently doing it?',
    'If you kept working at this exact pace for five more years, what would you gain, and what would you lose?',
    'What shift in the photography industry over the past few years has most changed how you work?',
    'When you think about how AI is reshaping image-making, what feeling rises first — curiosity, dread, or something harder to name?',
    'Which industry norm you once accepted without question now strikes you as worth questioning?',
    'How has the way clients discover and hire photographers changed since you started, and what do you make of it?',
    'What part of the business side of photography still catches you off guard, even now?',
    'If you could freeze one aspect of this industry exactly as it is today, what would it be and why?',
    'What\'s a trend in the field you\'ve resisted following, and what has that resistance cost or given you?',
    'How do you talk about the future of your craft with photographers who came up in a different era than you?',
    'What assumption about "making it" in this industry have you had to unlearn?',
    'Who in your local photography scene do you wish you knew better, and what\'s stopped you from reaching out?',
    'Describe a moment when another photographer\'s generosity changed the course of your work.',
    'What does genuine community among photographers look like to you, versus its performance online?',
    'When was the last time you felt truly seen by a peer in this field, and what made that possible?',
    'What role do you play in your photography community — the one who organizes, the one who listens, the one who disappears?',
    'How has collaborating with another photographer, rather than competing, opened something up for you?',
    'What would you want to build for the next generation of photographers coming into this community?',
    'Which relationships in this industry have outlasted the projects that started them?',
    'How do you show up for other photographers when their work is being celebrated and yours isn\'t?',
    'What unwritten rule of your craft do you still honor, even when no one would notice if you didn\'t?',
    'How has your definition of "good work" shifted since you first picked up a camera professionally?',
    'Which technical habit have you kept out of loyalty rather than necessity?',
    'What does integrity look like in your practice when no client or audience is watching?',
    'What\'s a belief about "the right way" to shoot that you\'ve quietly abandoned?',
    'Where do you draw the line between craft and commerce in your own work?',
    'What tradition within photography do you feel responsible for carrying forward?',
    'How has your relationship to the tools of your craft — camera, light, film, software — changed as the culture around them has changed?',
    'What reliably pulls you out of a creative rut when the industry noise gets too loud?',
    'When did you last feel pure wonder about making an image, and what brought it on?',
    'What keeps your love for this work intact on the days the business of it wears you down?',
    'Which photographer\'s body of work do you return to when you need to remember why you started?',
    'What non-photography source has quietly been feeding your creative eye lately?',
    'How do you protect your curiosity from turning into content-production fatigue?',
    'What would it look like to make one image this month purely for yourself, with no audience in mind?',
    'When inspiration feels borrowed rather than earned, how do you find your way back to something true?',
    'Where does your inspiration come from when everyone around you seems to be chasing the same aesthetic?',
    'Whose career trajectory do you compare yourself to most, and what does that comparison actually reveal about your own desires?',
    'What does it cost you to scroll through other photographers\' portfolios right before or after a shoot?',
    'When have you mistaken someone else\'s visibility for your own lack of worth?',
    'What\'s the difference for you between healthy ambition and corrosive competitiveness?',
    'How do you metabolize seeing a photographer you admire book the job you wanted?',
    'What would change in your work if you never learned what your peers were charging or booking?',
    'Which photographer\'s success has been hardest for you to feel happy about, and why?',
    'What does "enough" look like for you in a field that rewards constant visible growth?',
    'When you feel behind, what story are you telling yourself about what that means?',
    'How has comparison ever secretly served you, even while it hurt?',
    'Who mentored you without ever calling it that, and what did they give you?',
    'What do you wish someone had told you plainly when you were starting out?',
    'Which photographer are you quietly mentoring, even if it hasn\'t been named that way yet?',
    'What\'s something you learned from a mentor that you\'ve since had to unlearn?',
    'How do you decide when someone asking for your time deserves your honesty over your encouragement?',
    'What do you owe the photographers who opened doors for you, and how are you repaying it?',
    'How has being asked for mentorship changed the way you see your own experience?',
    'What kind of mentor do you wish existed for you right now, at this stage of your career?',
    'What does your feed perform that your actual practice doesn\'t reflect?',
    'How has chasing the algorithm ever pulled you away from the image you actually wanted to make?',
    'What would you post if you knew no client would ever see it?',
    'When did visibility online last feel like validation rather than exposure?',
    'What part of your work do you hide from social media, and why?',
    'How do you know when you\'re making an image for the platform instead of for the story?',
    'When a post underperforms, what do you actually believe about the work versus what the algorithm tells you?',
    'What would your practice look like if visibility were no longer tied to your income?',
    'Whose work makes you want to put down your camera and just look for a while?',
    'What quality in another photographer\'s images do you admire but haven\'t found in your own yet?',
    'Which image by another photographer has stayed with you long after you saw it, and why?',
    'What do you envy in a peer\'s work, and what might that envy be pointing you toward?',
    'Whose eye do you trust completely, even when you don\'t understand their choices?',
    'What\'s a photographer\'s career you admire the shape of, not just the images?',
    'When you study a photograph you love, what are you actually looking for?',
    'What do you notice yourself borrowing, consciously or not, from photographers you admire?',
    'Whose restraint in their work teaches you something your own instincts resist?',
    'What does it feel like in your body the moment a subject stops performing and starts simply being themselves in front of your lens?',
    'Think of a client who arrived guarded—what did you do, or not do, that let them soften?',
    'How do you know, in the middle of a shoot, that you\'ve earned someone\'s trust rather than just their compliance?',
    'Recall a moment when you had to choose between the shot you wanted and the comfort of the person you were photographing—what did you choose, and how do you feel about it now?',
    'What\'s a piece of direction you give often that you\'ve never really examined—where did it come from?',
    'Describe the last time a subject cried in front of your camera, and what you did in that instant.',
    'When has silence on set told you more than anything either of you said?',
    'Who is the collaborator—stylist, assistant, agent, makeup artist—who reads a room better than you do, and what have you learned from watching them work?',
    'What do you do differently when you sense someone has been hurt by a photographer before?',
    'Think about a shoot where the client\'s vision and your instinct pulled in opposite directions—how did you find the middle, or did you?',
    'What does trust sound like, specifically — what words or tone do you reach for in the first five minutes with someone new?',
    'When was the last time you were wrong about someone before the camera even came out, and what taught you that?',
    'Describe a subject who taught you something about your own way of seeing.',
    'What\'s the difference between a client who directs you and a client who lets you lead — and which unsettles you more?',
    'Recall a shoot that felt like a genuine conversation rather than a job — what made it that way?',
    'How do you handle the moment a client\'s expectations and the person actually standing in front of you don\'t match?',
    'What have you learned about consent and comfort that no one taught you in school?',
    'Think of the collaborator you\'ve worked with the longest — how has your shorthand with them changed over the years?',
    'When has a subject surprised you by trusting you with something vulnerable, on or off camera?',
  ];

  // The journal list can run long — offers a quick way back to the top
  // without hunting for it. Only relevant while the Journal is the active
  // tab; hidden the instant it isn't.
  const journalScrollTopBtn = document.getElementById('journalScrollTopBtn');
  function updateJournalScrollTopBtn() {
    journalScrollTopBtn.hidden = views.journal.hidden || window.scrollY < 400;
  }
  window.addEventListener('scroll', updateJournalScrollTopBtn, { passive: true });
  journalScrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // Linked entries (auto-compiled from a shoot's post-shoot reflection)
  // share the shoot's own final-images store instead of getting a separate
  // copy — same files, no duplicated storage. Standalone entries get their
  // own dedicated key.
  function currentJournalImagesKey() {
    if (!currentJournalEntry) return null;
    return currentJournalEntry.sourceShootId
      ? finalImagesKey(currentJournalEntry.sourceShootId)
      : journalImagesKey(currentJournalEntry.id);
  }

  // Shared renderer for both the edit-mode grid (add/delete affordances) and
  // the view-mode grid (read-only gallery) — same images, same image viewer,
  // just with the mutating controls left out when editable is false.
  function renderImagesGrid(grid, key, editable, onChanged) {
    grid.innerHTML = '';
    if (!key) { journalHasImages = false; return; }
    idbGetImages(key).then(images => {
      // journalHasImages feeds autosaveJournal()'s "does this entry have any
      // content" check, so it has to stay accurate in view mode too — not
      // just while the edit-mode grid (with its add/delete controls) is up.
      journalHasImages = images.length > 0;
      grid.innerHTML = images.length ? '' : (editable ? '<p class="empty-hint">No photos yet.</p>' : '');
      images.forEach((img, idx) => {
        const thumb = document.createElement('div');
        thumb.className = 'moodboard-thumb';
        thumb.innerHTML = `<img src="${img.src}" alt="" data-idx="${idx}" />` +
          (editable ? `<button type="button" class="final-thumb-delete" data-idx="${idx}"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>` : '');
        grid.appendChild(thumb);
      });
      if (editable) {
        grid.querySelectorAll('.final-thumb-delete').forEach(btn => {
          btn.addEventListener('click', () => {
            if (!confirm("Delete this photo? This can't be undone.")) return;
            idbGetImages(key).then(imgs => {
              imgs.splice(Number(btn.dataset.idx), 1);
              return idbSetImages(key, imgs);
            }).then(() => {
              onChanged();
              scheduleJournalAutosave();
            });
          });
        });
      }
      grid.querySelectorAll('.moodboard-thumb img').forEach(imgEl => {
        imgEl.addEventListener('click', () => {
          openImageViewer(images, Number(imgEl.dataset.idx), key, onChanged, false);
        });
      });
    }).catch(() => { grid.innerHTML = ''; });
  }

  function renderJournalImages() {
    renderImagesGrid(document.getElementById('journalImagesGrid'), currentJournalImagesKey(), true, renderJournalImages);
  }

  function renderJournalViewImages() {
    renderImagesGrid(document.getElementById('journalViewImagesGrid'), currentJournalImagesKey(), false, renderJournalViewImages);
  }

  document.getElementById('addJournalPhotos').addEventListener('click', () => {
    document.getElementById('journalImagesFileInput').click();
  });

  document.getElementById('journalImagesFileInput').addEventListener('change', (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    if (!files.length) return;
    const key = currentJournalImagesKey();
    if (!key) return;
    Promise.all(files.map(f => resizeImageFile(f, 1280, 0.72)))
      .then(newImages => idbGetImages(key).then(existing => {
        const combined = existing.concat(newImages.map(src => ({ src, caption: '' })));
        return idbSetImages(key, combined);
      }))
      .then(() => {
        renderJournalImages();
        scheduleJournalAutosave();
      })
      .catch(() => {});
  });

  function getAllUsedJournalTags() {
    const set = new Set();
    state.journalEntries.forEach(e => (e.tags || []).forEach(t => set.add(t)));
    return [...set].sort();
  }

  // Read-only photo strip for an entry rendered inline in the list.
  //
  // Deliberately NOT renderImagesGrid(): that one maintains journalHasImages
  // for the open editor's autosave "does this entry have any content" check,
  // and the list redraws while an entry can still be open — sharing it would
  // let a background list render overwrite the editor's flag with some other
  // entry's answer.
  function renderJournalListImages(grid, key) {
    return idbGetImages(key).then(images => {
      grid.hidden = !images.length;
      grid.innerHTML = '';
      images.forEach((img, idx) => {
        const thumb = document.createElement('div');
        thumb.className = 'moodboard-thumb';
        thumb.innerHTML = `<img src="${img.src}" alt="" />`;
        thumb.querySelector('img').addEventListener('click', (ev) => {
          // The whole sheet of paper is tappable, so a photo tap has to stop
          // here or it also fires the edit / jump-to-shoot handler underneath.
          ev.stopPropagation();
          openImageViewer(images, idx, key, () => renderJournal(), false);
        });
        grid.appendChild(thumb);
      });
    }).catch(() => { grid.hidden = true; });
  }

  // Sizes .journal-paper's --header-band (see the CSS) to this specific
  // entry's actual title/date height, so the blank band above the ruling
  // always fully covers it — a fixed guess would either crop a long wrapped
  // title or leave excess blank space under a short one — and sits the
  // heading on the first visible rule, at the bottom of that band. Reads as 0 (and is
  // skipped) whenever the card isn't laid out yet — not just inside a
  // collapsed month/year group, but even a fully-visible one: renderYear-
  // MonthGroups builds a whole year's months and cards in memory before
  // attaching that year to the live list in one shot, so every card is still
  // a detached, unlaid-out node at the moment renderItem builds it,
  // regardless of collapse state. Never call this from inside renderItem —
  // it always reads 0 there. renderJournal's own post-pass (after
  // renderYearMonthGroups returns, once the list is genuinely in the
  // document) is what actually measures correctly for a visible entry;
  // onReveal covers the collapsed-group case for everything left over.
  function applyJournalHeaderBand(card) {
    const heading = card.querySelector('.journal-entry-heading');
    const paper = card.querySelector('.journal-paper');
    if (!heading || !paper || !heading.offsetHeight) return;
    // .journal-paper's own 14px top padding sits above the heading, plus a
    // little extra room for open space above the title, snapped up to the
    // ruled-line pattern's own existing line positions (21, 49, 77, 105px,
    // ... — see .journal-paper's 22px background-position) so the band's
    // bottom edge lands exactly on a real rule instead of slicing one in half.
    const headingBottom = 14 + heading.offsetHeight;
    const minBand = headingBottom + 8;
    const band = Math.ceil((minBand - 21) / 28) * 28 + 21;
    paper.style.setProperty('--header-band', band + 'px');
    // The heading is whole 28px rows (see .journal-entry-heading), so this
    // margin drops it to the bottom of the band: its last row sits right on
    // the first visible rule, any extra title rows stack above it, and the
    // entry's own text — which follows directly — starts on the first row
    // below that rule. The leftover space lands above the title.
    heading.style.marginTop = (band - headingBottom) + 'px';
  }

  // One entry, rendered inline on lined notebook paper under a coloured title
  // banner — the same card shape the Log uses for a week, so the two kinds of
  // entry read as one continuous scrolling page rather than a list of things
  // to open.
  function renderJournalEntryCard(container, e) {
    const card = document.createElement('div');
    card.className = 'card log-card journal-entry-card';
    // Anchor the table of contents scrolls to (see scrollToJournalItem).
    card.dataset.entryId = e.id;
    // Alternates within the month it lands in, so collapsing a month never
    // leaves two same-coloured banners stacked against each other.
    const headingColorClass = container.children.length % 2 === 0 ? 'heading-yellow' : 'heading-navy';
    const linkedShoot = e.sourceShootId ? state.shoots.find(s => s.id === e.sourceShootId) : null;
    // Same "--- shoot name" credit the Log puts after each takeaway; this entry
    // was compiled from that shoot's reflection, so it's the same attribution.
    const credit = linkedShoot
      ? `<span class="log-takeaway-source"> --- ${escapeHtml(shootDisplayName(linkedShoot))}</span>`
      : '';
    const tagsHtml = (e.tags || []).map(t => `<span class="beat-chip view-only">${escapeHtml(t)}</span>`).join('');

    card.innerHTML = `
      <div class="log-week-heading ${headingColorClass} journal-entry-binding">
        <button type="button" class="journal-entry-options" aria-label="Options">&#8942;</button>
      </div>
      <div class="journal-paper log-paper">
        <div class="journal-entry-heading">
          <span class="journal-entry-title">${escapeHtml(e.title || 'Untitled entry')}</span>
          <span class="journal-entry-date">${prettyDate(e.createdAt)}</span>
        </div>
        <div class="journal-entry-body">${escapeHtml(e.body || '')}${credit}</div>
        <div class="journal-entry-images moodboard-grid" hidden></div>
        <div class="journal-entry-tags"${tagsHtml ? '' : ' hidden'}>${tagsHtml}</div>
      </div>
    `;

    const paper = card.querySelector('.journal-paper');
    if (linkedShoot) {
      // Auto-compiled entries are never edited here — they route back to the
      // shoot's own reflection fields so the two stay in sync. Reuses the Log's
      // "this refers to" popup rather than a confirm(), so tapping a reflection
      // behaves exactly like tapping a weekly log takeaway.
      paper.addEventListener('click', () => showLogShootRef(e.sourceShootId));
    } else {
      // Hand-written entries open straight into the editor: the body is already
      // fully readable right here, so a read-only stop on the way would be a
      // popup that shows you what you're already looking at.
      paper.addEventListener('click', () => openJournalModal(e.id, 'edit'));
    }

    card.querySelector('.journal-entry-options').addEventListener('click', (ev) => {
      ev.stopPropagation();
      openJournalOptions(e.id);
    });

    container.appendChild(card);
    // Returned (not fire-and-forget) so scrollToJournalItem can wait for
    // every card's cover photos to finish loading before it scrolls — those
    // load from IndexedDB asynchronously and would otherwise grow cards
    // above the target after the scroll already landed, shoving it back out
    // of view.
    return renderJournalListImages(card.querySelector('.journal-entry-images'), journalEntryImagesKey(e));
  }

  // Collapsible year > month nesting for the Journal (and its table of
  // contents), so log weeks and written entries fold and scroll together.
  // Archive grows its own copy of this shape straight from shoot dates; this
  // one takes the date off each item via dateOf(), so it can group anything.
  //
  // Order within a month is whatever order `items` arrives in — callers sort
  // first. Headings alternate colour by *visible* index so a fold never leaves
  // two same-coloured bars stacked.
  function renderYearMonthGroups(list, items, opts) {
    const { dateOf, keyPrefix, renderItem, onReveal } = opts;
    // Collects whatever each renderItem call returns (e.g. a journal card's
    // image-loading promise) so a caller that needs to know when everything
    // has actually finished rendering — not just synchronously appended —
    // can Promise.all() this. Callers that don't care just ignore it.
    const results = [];

    const years = new Map();
    items.forEach(item => {
      const d = dateOf(item);
      const year = d ? d.slice(0, 4) : 'Undated';
      const month = d ? d.slice(5, 7) : '00';
      if (!years.has(year)) years.set(year, new Map());
      const months = years.get(year);
      if (!months.has(month)) months.set(month, []);
      months.get(month).push(item);
    });

    const sortedYears = [...years.keys()].sort((a, b) => {
      if (a === 'Undated') return 1;
      if (b === 'Undated') return -1;
      return b.localeCompare(a);
    });

    let visibleYearIndex = 0;
    sortedYears.forEach(year => {
      const months = years.get(year);
      const sortedMonths = [...months.keys()].sort((a, b) => b.localeCompare(a));

      const yearGroupEl = document.createElement('div');
      yearGroupEl.className = 'shoot-status-group';

      const yearCollapseKey = `${keyPrefix}:${year}`;
      const yearCollapsed = isSectionCollapsed(yearCollapseKey);
      const yearHeading = document.createElement('h2');
      yearHeading.className = `status-group-heading ${visibleYearIndex % 2 === 0 ? 'heading-yellow' : 'heading-navy'}${yearCollapsed ? ' collapsed' : ''}`;
      yearHeading.innerHTML = `${escapeHtml(year)}${COLLAPSE_ARROW_SVG}`;

      const yearRowsWrap = document.createElement('div');
      yearRowsWrap.className = 'shoot-status-rows';
      yearRowsWrap.hidden = yearCollapsed;

      if (year === 'Undated') {
        // Undated only ever has the one '00' month bucket, so an "Undated"
        // sub-heading under the "Undated" year heading is the same word twice.
        sortedMonths.forEach(month => {
          months.get(month).forEach(item => results.push(renderItem(yearRowsWrap, item)));
        });
      } else {
        let visibleMonthIndex = 0;
        sortedMonths.forEach(month => {
          const monthGroupEl = document.createElement('div');
          monthGroupEl.className = 'archive-month-group';

          const monthCollapseKey = `${keyPrefix}:${year}:${month}`;
          const monthCollapsed = isSectionCollapsed(monthCollapseKey);
          const monthHeading = document.createElement('h3');
          monthHeading.className = `status-group-heading archive-month-heading ${visibleMonthIndex % 2 === 0 ? 'heading-yellow' : 'heading-navy'}${monthCollapsed ? ' collapsed' : ''}`;
          monthHeading.innerHTML = `${escapeHtml(monthLabel(month))}${COLLAPSE_ARROW_SVG}`;

          const monthRowsWrap = document.createElement('div');
          monthRowsWrap.className = 'shoot-status-rows';
          monthRowsWrap.hidden = monthCollapsed;
          months.get(month).forEach(item => results.push(renderItem(monthRowsWrap, item)));

          monthHeading.addEventListener('click', () => {
            const nowHidden = !monthRowsWrap.hidden;
            monthRowsWrap.hidden = nowHidden;
            monthHeading.classList.toggle('collapsed', nowHidden);
            setSectionCollapsed(monthCollapseKey, nowHidden);
            if (!nowHidden && onReveal) onReveal(monthRowsWrap);
          });

          monthGroupEl.appendChild(monthHeading);
          monthGroupEl.appendChild(monthRowsWrap);
          yearRowsWrap.appendChild(monthGroupEl);
          visibleMonthIndex++;
        });
      }

      yearHeading.addEventListener('click', () => {
        const nowHidden = !yearRowsWrap.hidden;
        yearRowsWrap.hidden = nowHidden;
        yearHeading.classList.toggle('collapsed', nowHidden);
        setSectionCollapsed(yearCollapseKey, nowHidden);
        if (!nowHidden && onReveal) onReveal(yearRowsWrap);
      });

      yearGroupEl.appendChild(yearHeading);
      yearGroupEl.appendChild(yearRowsWrap);
      list.appendChild(yearGroupEl);
      visibleYearIndex++;
    });

    return results;
  }

  // createdAt only holds a date (see todayStr), so two entries written the
  // same day compare equal — journalEntries is append-only (always pushed,
  // never unshifted), so the array's own order already IS creation order.
  // Array.sort is stable, and stability alone would keep same-day ties in
  // that oldest-first order, which is the wrong direction for "most recent
  // first" — breaking ties by original index (reversed) fixes that without
  // needing a real timestamp field.
  function sortJournalEntriesRecent(entries) {
    return entries
      .map((e, i) => [e, i])
      .sort(([ea, ia], [eb, ib]) => {
        const cmp = (eb.createdAt || '').localeCompare(ea.createdAt || '');
        return cmp !== 0 ? cmp : ib - ia;
      })
      .map(([e]) => e);
  }

  // Filter chips, same pattern as the Archive's: a toggle showing the current
  // choice, and a row of chips that opens under it and closes again on a pick.
  // Not remembered between launches — it opens on everything each time.
  let journalFilter = 'all';
  const JOURNAL_FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'log', label: 'Weekly log' },
    { key: 'entries', label: 'My entries' },
  ];

  function renderJournalFilterChips() {
    document.getElementById('journalFilters').innerHTML = JOURNAL_FILTERS
      .map(f => `<button type="button" class="chip ${f.key === journalFilter ? 'active' : ''}" data-filter="${f.key}">${f.label}</button>`)
      .join('');
    document.getElementById('journalFilterToggle').textContent =
      `Filter: ${JOURNAL_FILTERS.find(f => f.key === journalFilter).label}`;
  }

  document.getElementById('journalFilterToggle').addEventListener('click', () => {
    const filters = document.getElementById('journalFilters');
    filters.hidden = !filters.hidden;
  });

  document.getElementById('journalFilters').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip || !chip.dataset.filter) return;
    journalFilter = chip.dataset.filter;
    document.getElementById('journalFilters').hidden = true;
    renderJournal();
  });

  // Every card on the Journal page, newest first: the auto-generated weekly
  // log weeks and the entries written by hand, merged by date. A tie goes to
  // the entry — a week is dated by its Sunday start, so anything written that
  // day is the more recent of the two.
  function journalFeedItems() {
    const entries = journalFilter === 'log' ? [] : sortJournalEntriesRecent(state.journalEntries)
      .map(e => ({ type: 'entry', date: e.createdAt || '', entry: e }));
    const weeks = journalFilter === 'entries' ? [] : computeWeeklyLog()
      .map(w => ({ type: 'week', date: formatDate(w.start), week: w }));
    const merged = [];
    let i = 0;
    let j = 0;
    while (i < entries.length || j < weeks.length) {
      if (j >= weeks.length || (i < entries.length && entries[i].date >= weeks[j].date)) merged.push(entries[i++]);
      else merged.push(weeks[j++]);
    }
    return merged;
  }

  function renderJournalFeedItem(container, item) {
    if (item.type === 'week') return renderLogWeekCard(container, item.week);
    return renderJournalEntryCard(container, item.entry);
  }

  // Nested by year > month of each item's own date (an entry's createdAt, a
  // log week's start) — same grouping structure Archive uses for shoots.
  // Returns a promise that resolves once every card's cover photos have
  // finished loading (see renderJournalEntryCard) — most callers can ignore
  // it, but scrollToJournalItem needs it so the layout has stopped shifting
  // before it scrolls.
  function renderJournal() {
    // Sorted before grouping, because renderYearMonthGroups keeps whatever
    // order it's handed.
    const items = journalFeedItems();

    const list = document.getElementById('journalList');
    list.innerHTML = '';
    renderJournalFilterChips();
    const empty = document.getElementById('journalEmpty');
    empty.hidden = items.length !== 0;
    if (!empty.hidden) {
      empty.textContent = journalFilter === 'log'
        ? "No weekly log yet — it fills in on its own once a shoot is marked captured."
        : journalFilter === 'entries'
          ? "No entries of your own yet — tap + to write one. Anything on your mind?"
          : "Nothing here yet — the weekly log fills in on its own once a shoot is marked captured, and + adds an entry of your own. Anything on your mind?";
    }

    const imagePromises = renderYearMonthGroups(list, items, {
      dateOf: item => item.date,
      keyPrefix: 'journal',
      renderItem: renderJournalFeedItem,
      // Covers a card in a month/year that's still collapsed at this point —
      // it stays genuinely unmeasurable (real height 0) until the group
      // holding it is actually opened, which is what this re-runs for.
      onReveal: wrap => wrap.querySelectorAll('.journal-entry-card').forEach(applyJournalHeaderBand),
    });
    // Every card just built is a real, attached, laid-out node now — each
    // year's whole subtree (months, cards, all of it) only gets appended to
    // `list` at the very end of building that year (see renderYearMonth-
    // Groups), so nothing in it could be measured correctly any earlier than
    // this, not even a card in a section that's expanded by default.
    list.querySelectorAll('.journal-entry-card').forEach(applyJournalHeaderBand);
    return Promise.all(imagePromises);
  }

  // ---------- Journal table of contents ----------
  // Reuses renderYearMonthGroups with its own 'journalToc' keyPrefix, so
  // expanding/collapsing a year or month inside the TOC popup never disturbs
  // what's expanded in the real list underneath (and vice versa).
  function renderJournalTocItem(container, item) {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'journal-toc-item' + (item.type === 'week' ? ' journal-toc-item-log' : '');
    row.textContent = item.type === 'week' ? item.week.label : (item.entry.title || 'Untitled entry');
    row.addEventListener('click', () => scrollToJournalItem(item));
    container.appendChild(row);
  }

  function openJournalToc() {
    const items = journalFeedItems();
    const list = document.getElementById('journalTocList');
    list.innerHTML = '';
    document.getElementById('journalTocEmpty').hidden = items.length !== 0;
    renderYearMonthGroups(list, items, {
      dateOf: item => item.date,
      keyPrefix: 'journalToc',
      renderItem: renderJournalTocItem,
    });
    document.getElementById('journalTocOverlay').hidden = false;
  }

  document.getElementById('journalTocBtn').addEventListener('click', openJournalToc);

  // Expands whichever year/month the item actually lives under in the real
  // list (that list's own 'journal' collapse keys, independent of the TOC's),
  // then scrolls it to the top of the same scrolling space.
  function scrollToJournalItem(item) {
    const d = item.date;
    if (d) {
      setSectionCollapsed(`journal:${d.slice(0, 4)}`, false);
      setSectionCollapsed(`journal:${d.slice(0, 4)}:${d.slice(5, 7)}`, false);
    }
    document.getElementById('journalTocOverlay').hidden = true;
    const selector = item.type === 'week'
      ? `.log-card[data-week-key="${item.date}"]`
      : `.journal-entry-card[data-entry-id="${item.entry.id}"]`;
    // Wait for renderJournal's cover photos to finish loading before
    // scrolling — otherwise a photo landing above the target after the
    // scroll already happened grows that card and shoves the target back
    // down, so it lands short of the top instead of flush with it.
    renderJournal().then(() => {
      const card = document.querySelector(selector);
      if (card) card.scrollIntoView({ block: 'start', behavior: 'smooth' });
    });
  }

  // ---------- Journal weekly log (auto-generated recap) ----------
  // Fully derived from state.shoots — nothing here is persisted, so editing
  // a shoot's category or lessons-learned later just updates the log the
  // next time it's opened. Weeks run Sunday-Saturday, matching weekBucket()'s
  // convention elsewhere in the app.
  function shootWeekWindow(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const start = new Date(date);
    start.setDate(date.getDate() - date.getDay());
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { start, end };
  }

  function weekRangeLabel(start, end) {
    const startMonth = MONTH_NAMES[start.getMonth()].slice(0, 3);
    const endMonth = MONTH_NAMES[end.getMonth()].slice(0, 3);
    if (start.getMonth() === end.getMonth()) {
      return `${startMonth} ${start.getDate()}–${end.getDate()}, ${end.getFullYear()}`;
    }
    return `${startMonth} ${start.getDate()} – ${endMonth} ${end.getDate()}, ${end.getFullYear()}`;
  }

  function computeWeeklyLog() {
    const shotShoots = state.shoots.filter(s => s.date && POST_CAPTURE_STATUSES.includes(s.status));
    const weeks = new Map();
    shotShoots.forEach(s => {
      const { start, end } = shootWeekWindow(s.date);
      const key = formatDate(start);
      if (!weeks.has(key)) weeks.set(key, { start, end, shoots: [] });
      weeks.get(key).shoots.push(s);
    });
    return Array.from(weeks.values())
      .sort((a, b) => b.start - a.start)
      .map(w => ({
        // Kept so the list can group weeks by year > month. A week straddling
        // a month boundary files under the month it *starts* in, matching the
        // month its label leads with.
        start: w.start,
        label: weekRangeLabel(w.start, w.end),
        shoots: w.shoots.slice().sort((a, b) => a.date.localeCompare(b.date)),
        // Keeps each takeaway tied to the shoot it came from (rather than a
        // flat list of strings) so tapping one can open that same shoot.
        // One shoot's Lessons Learned is always exactly one takeaway here —
        // splitting on every newline used to turn a single entry into
        // several bullets the moment it had a paragraph break in it, which
        // read as several distinct lessons instead of the one the shoot
        // actually had. Internal line breaks are collapsed to spaces rather
        // than dropped outright, so the text stays readable as one bullet.
        takeaways: w.shoots
          .map(s => ({ text: (s.lessonsLearned || '').replace(/\s*\n+\s*/g, ' ').trim(), shootId: s.id }))
          .filter(t => t.text),
      }));
  }

  // Tapping a shoot or takeaway in the Log opens a small "this refers to"
  // popup rather than jumping straight to the shoot modal — the Log is a
  // read-only recap, so a confirm step avoids an accidental jump away from it.
  let logShootRefId = null;

  function showLogShootRef(shootId) {
    const s = state.shoots.find(x => x.id === shootId);
    if (!s) return;
    logShootRefId = shootId;
    document.getElementById('logShootRefName').textContent = shootDisplayName(s);
    document.getElementById('logShootRefOverlay').hidden = false;
  }

  document.getElementById('logShootRefCancelBtn').addEventListener('click', () => {
    document.getElementById('logShootRefOverlay').hidden = true;
  });

  document.getElementById('logShootRefViewBtn').addEventListener('click', () => {
    document.getElementById('logShootRefOverlay').hidden = true;
    const shootId = logShootRefId;
    if (!shootId) return;
    const s = state.shoots.find(x => x.id === shootId);
    if (!s) return;
    document.querySelector(`.tab[data-view="${s.archived ? 'archive' : 'shoots'}"]`).click();
    openShootModal(shootId);
    // Land on the Reflection section rather than the top of the shoot — that's
    // where the takeaway was written, so it's what you came to look at.
    // openShootModal restores its own saved scroll position on a double-rAF, so
    // this has to run after that or it gets undone; two frames puts it in the
    // same tick, ordered after. scrollTop is set directly rather than via
    // scrollIntoView because a smooth scroll here is both a long animated jump
    // and easily clobbered by that restore. The header offset keeps the section
    // heading clear of the sticky modal header.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const content = showPostShootContentExpanded();
        const modalEl = shootModalOverlay.querySelector('.modal');
        const header = shootModalOverlay.querySelector('.shoot-modal-header');
        const headerH = header ? header.getBoundingClientRect().height : 0;
        modalEl.scrollTop += content.getBoundingClientRect().top - modalEl.getBoundingClientRect().top - headerH;
        updateShootModalTitleFromScroll();
      });
    });
  });

  document.getElementById('logShootRefOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.hidden = true;
  });

  // One week of the Log, on the same lined notebook paper the written entries
  // use — the Log is the other half of the same journal, so it reads as
  // written on the same pad rather than as a report about it.
  function renderLogWeekCard(container, w) {
    const card = document.createElement('div');
    card.className = 'card log-card';
    // Anchor the table of contents scrolls to (see scrollToJournalItem).
    card.dataset.weekKey = formatDate(w.start);
    // Alternates within the month it lands in, so collapsing a month never
    // leaves two same-coloured banners stacked against each other.
    const headingColorClass = container.children.length % 2 === 0 ? 'heading-yellow' : 'heading-navy';
    const shootsHtml = w.shoots.map(s =>
      `<li data-shoot-id="${s.id}">${escapeHtml(shootDisplayName(s))} <span class="log-shoot-category">(${escapeHtml(CATEGORY_LABELS[s.category] || 'Uncategorized')})</span></li>`
    ).join('');
    const takeawaysHtml = w.takeaways.length
      // Each takeaway is credited to its shoot inline, so the list still reads
      // as attributed even before you tap through to confirm which one.
      ? `<ul class="log-takeaways">${w.takeaways.map(t => {
          const from = shootDisplayName(state.shoots.find(x => x.id === t.shootId) || {});
          const credit = from ? `<span class="log-takeaway-source"> --- ${escapeHtml(from)}</span>` : '';
          return `<li data-shoot-id="${t.shootId}">${escapeHtml(t.text)}${credit}</li>`;
        }).join('')}</ul>`
      : `<p class="log-no-takeaways">No takeaways logged this week.</p>`;
    card.innerHTML = `
      <p class="log-week-heading ${headingColorClass}">${escapeHtml(w.label)}</p>
      <div class="journal-paper log-paper">
        <p class="log-section-label">Shoots this week</p>
        <ul class="log-shoots">${shootsHtml}</ul>
        <p class="log-section-label">Takeaways</p>
        ${takeawaysHtml}
      </div>
    `;
    card.querySelectorAll('.log-shoots li[data-shoot-id], .log-takeaways li[data-shoot-id]').forEach(li => {
      li.addEventListener('click', () => showLogShootRef(li.dataset.shootId));
    });
    container.appendChild(card);
  }

  // ---------- Journal entry options (kebab menu on the list card) ----------
  let optionsJournalEntryId = null;

  function openJournalOptions(id) {
    optionsJournalEntryId = id;
    document.getElementById('journalOptionsOverlay').hidden = false;
  }

  function closeJournalOptions() {
    document.getElementById('journalOptionsOverlay').hidden = true;
    optionsJournalEntryId = null;
  }

  document.getElementById('journalOptionsCancelBtn').addEventListener('click', closeJournalOptions);

  document.getElementById('journalOptionsOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeJournalOptions();
  });

  document.getElementById('deleteJournalOptionBtn').addEventListener('click', () => {
    const id = optionsJournalEntryId;
    closeJournalOptions();
    if (!id) return;
    if (!confirm("Delete this journal entry? This can't be undone.")) return;
    const entry = state.journalEntries.find(e => e.id === id);
    if (entry && !entry.sourceShootId) {
      idbDeleteImages(journalImagesKey(entry.id)).catch(() => {});
    }
    state.journalEntries = state.journalEntries.filter(e => e.id !== id);
    saveState();
    renderJournal();
  });

  // Auto-generated post-shoot journal entries aren't edited in place —
  // editing always routes back through the shoot's own reflection fields
  // so the two stay in sync.
  function openPostShootJournalPrompt(shootId) {
    const s = state.shoots.find(x => x.id === shootId);
    if (!s) { showToast("This shoot no longer exists."); return; }
    document.querySelector(`.tab[data-view="${s.archived ? 'archive' : 'shoots'}"]`).click();
    openShootModal(shootId);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.getElementById('postShootContent').scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  function renderJournalTagsChips() {
    const container = document.getElementById('journalTagsChips');
    container.innerHTML = currentJournalTags.map((t, idx) => `
      <span class="beat-chip">${escapeHtml(t)}<button type="button" class="journal-tag-remove" data-idx="${idx}">&times;</button></span>
    `).join('');
    container.querySelectorAll('.journal-tag-remove').forEach(btn => {
      btn.addEventListener('click', () => {
        currentJournalTags.splice(Number(btn.dataset.idx), 1);
        renderJournalTagsChips();
        renderJournalTagsSuggestions();
        scheduleJournalAutosave();
      });
    });
  }

  function renderJournalTagsSuggestions() {
    const container = document.getElementById('journalTagsSuggestions');
    const suggestions = getAllUsedJournalTags().filter(t => !currentJournalTags.includes(t));
    container.innerHTML = suggestions.map(t => `<button type="button" class="beat-suggestion" data-tag="${escapeHtml(t)}">+ ${escapeHtml(t)}</button>`).join('');
    container.querySelectorAll('.beat-suggestion').forEach(btn => {
      btn.addEventListener('click', () => addJournalTag(btn.dataset.tag));
    });
  }

  function addJournalTag(text) {
    const trimmed = text.trim().replace(/^#/, '');
    if (!trimmed || currentJournalTags.includes(trimmed)) return;
    currentJournalTags.push(trimmed);
    renderJournalTagsChips();
    renderJournalTagsSuggestions();
    scheduleJournalAutosave();
  }

  const journalTagsInput = document.getElementById('journalTagsInput');
  journalTagsInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addJournalTag(journalTagsInput.value);
      journalTagsInput.value = '';
    }
  });

  function autosaveJournal() {
    if (!currentJournalEntry) return;
    // View mode has no editable fields, so there's nothing on the entry to
    // re-derive from the form — skip straight to the content check below
    // (the edit-mode form fields may still hold a previous entry's draft).
    if (journalMode === 'edit') {
      currentJournalEntry.title = document.getElementById('journalSubject').value;
      currentJournalEntry.body = document.getElementById('journalBody').value;
      currentJournalEntry.tags = [...currentJournalTags];
    }

    const hasContent = hasText(currentJournalEntry.title) || hasText(currentJournalEntry.body) || currentJournalEntry.tags.length > 0 || journalHasImages;
    const idx = state.journalEntries.findIndex(x => x.id === currentJournalEntry.id);

    if (hasContent) {
      if (idx === -1) {
        state.journalEntries.push(currentJournalEntry);
        journalIsNew = false;
        document.getElementById('deleteJournalBtn').hidden = false;
      } else {
        state.journalEntries[idx] = currentJournalEntry;
      }
      saveState();
    } else if (idx !== -1) {
      state.journalEntries.splice(idx, 1);
      saveState();
    }
  }

  function scheduleJournalAutosave() {
    clearTimeout(journalSaveTimer);
    // Unlike the shoot form's notes fields (which are readonly and edited in
    // the expand modal), the journal body is typed straight into, so this is
    // the app's one genuinely long typing session. Same reasoning as
    // scheduleShootAutosave: a backstop, with blur and backgrounding both
    // saving immediately.
    journalSaveTimer = setTimeout(autosaveJournal, 2000);
  }

  function saveJournalNow() {
    if (!currentJournalEntry) return;
    clearTimeout(journalSaveTimer);
    autosaveJournal();
  }

  document.getElementById('journalSubject').addEventListener('input', scheduleJournalAutosave);
  document.getElementById('journalBody').addEventListener('input', scheduleJournalAutosave);
  document.getElementById('journalSubject').addEventListener('blur', saveJournalNow);
  document.getElementById('journalBody').addEventListener('blur', saveJournalNow);

  const journalModalOverlay = document.getElementById('journalModalOverlay');
  const OPEN_JOURNAL_KEY = 'dailies_open_journal_entry';

  function setOpenJournalMarker(id) {
    try { localStorage.setItem(OPEN_JOURNAL_KEY, id); } catch (e) {}
  }

  function clearOpenJournalMarker() {
    try { localStorage.removeItem(OPEN_JOURNAL_KEY); } catch (e) {}
  }

  // The full typing setup (title/body/hashtags/photos) — reachable directly
  // for a brand-new entry, or via the Edit button on an existing standalone
  // one.
  function showJournalEditMode() {
    journalMode = 'edit';
    document.getElementById('journalSubject').value = currentJournalEntry.title;
    document.getElementById('journalBody').value = currentJournalEntry.body;
    currentJournalTags = [...currentJournalEntry.tags];
    renderJournalTagsChips();
    renderJournalTagsSuggestions();
    journalTagsInput.value = '';
    document.getElementById('deleteJournalBtn').hidden = journalIsNew;
    renderJournalImages();
    document.getElementById('journalViewMode').hidden = true;
    document.getElementById('journalForm').hidden = false;
  }

  // A read-only popup of the saved entry — no textboxes, no editing
  // mechanics — until the Edit button switches back to edit mode.
  function showJournalViewMode() {
    journalMode = 'view';
    const e = currentJournalEntry;
    document.getElementById('journalViewTitle').textContent = e.title || 'Untitled entry';
    document.getElementById('journalViewDate').textContent = prettyDate(e.createdAt);
    const tagsEl = document.getElementById('journalViewTags');
    tagsEl.innerHTML = (e.tags || []).map(t => `<span class="beat-chip view-only">${escapeHtml(t)}</span>`).join('');
    tagsEl.hidden = !(e.tags && e.tags.length);
    document.getElementById('journalViewBody').textContent = e.body || '';
    document.getElementById('journalViewLinkedHint').hidden = !e.sourceShootId;
    document.getElementById('deleteJournalViewBtn').hidden = journalIsNew;
    document.getElementById('journalViewDoneBtn').textContent = pickRandomSaveMessage();
    renderJournalViewImages();
    document.getElementById('journalForm').hidden = true;
    document.getElementById('journalViewMode').hidden = false;
  }

  function openJournalModal(id, mode) {
    const existing = id ? state.journalEntries.find(x => x.id === id) : null;
    journalIsNew = !existing;
    currentJournalEntry = existing || { id: uid(), title: '', body: '', tags: [], createdAt: todayStr() };
    setOpenJournalMarker(currentJournalEntry.id);
    journalHasImages = false;

    // A brand-new entry starts in edit mode (nothing to view yet), as does one
    // opened straight from the Reflections list, where the body is already read
    // inline. Everything else opens read-only. Auto-compiled shoot reflections
    // never get edit mode here at all — editing them routes back to the shoot —
    // so the sourceShootId guard holds even if a caller asks for it.
    if (journalIsNew || (mode === 'edit' && !currentJournalEntry.sourceShootId)) showJournalEditMode();
    else showJournalViewMode();

    journalModalOverlay.hidden = false;
  }

  // Auto-compiled entries never edit in place — "editing" always hands off
  // to the shoot's own reflection fields instead, so the two stay in sync.
  function revisitLinkedJournalEntry() {
    const shootId = currentJournalEntry.sourceShootId;
    if (!confirm('Do you want to revisit this shoot and modify the entry?')) return;
    closeJournalModal();
    openPostShootJournalPrompt(shootId);
  }

  document.getElementById('journalViewBody').addEventListener('click', () => {
    if (currentJournalEntry && currentJournalEntry.sourceShootId) revisitLinkedJournalEntry();
  });

  document.getElementById('editJournalBtn').addEventListener('click', () => {
    if (currentJournalEntry && currentJournalEntry.sourceShootId) revisitLinkedJournalEntry();
    else showJournalEditMode();
  });

  function closeJournalModal() {
    clearTimeout(journalSaveTimer);
    autosaveJournal();
    clearOpenJournalMarker();
    journalModalOverlay.hidden = true;
    currentJournalEntry = null;
    renderJournal();
  }

  document.getElementById('addJournalBtn').addEventListener('click', () => openJournalModal(null));

  // Saving no longer closes the modal — it drops back to the read-only view
  // of what was just written, right in the same popup. An entry that ends
  // up with no real content (autosave already deletes it) just closes.
  document.getElementById('saveJournalBtn').addEventListener('click', () => {
    clearTimeout(journalSaveTimer);
    autosaveJournal();
    const e = currentJournalEntry;
    const hasContent = e && (hasText(e.title) || hasText(e.body) || e.tags.length > 0 || journalHasImages);
    if (hasContent) showJournalViewMode();
    else closeJournalModal();
  });

  function deleteCurrentJournalEntry() {
    if (!currentJournalEntry) return;
    if (!confirm('Delete this journal entry? This can\'t be undone.')) return;
    // Linked entries share the shoot's own final-images store — only
    // standalone entries own a dedicated image key to clean up here.
    if (!currentJournalEntry.sourceShootId) {
      idbDeleteImages(journalImagesKey(currentJournalEntry.id)).catch(() => {});
    }
    state.journalEntries = state.journalEntries.filter(x => x.id !== currentJournalEntry.id);
    saveState();
    clearTimeout(journalSaveTimer);
    clearOpenJournalMarker();
    journalModalOverlay.hidden = true;
    currentJournalEntry = null;
    renderJournal();
  }

  document.getElementById('deleteJournalBtn').addEventListener('click', deleteCurrentJournalEntry);
  document.getElementById('deleteJournalViewBtn').addEventListener('click', deleteCurrentJournalEntry);
  document.getElementById('journalViewDoneBtn').addEventListener('click', closeJournalModal);

  journalModalOverlay.addEventListener('click', (e) => {
    if (e.target === journalModalOverlay) closeJournalModal();
  });

  // ---------- Journal starting-prompt picker ----------
  // Offers a random prompt from JOURNAL_PROMPTS; accepting inserts it in
  // brackets at the top of the entry body for the user to write underneath.
  function pickRandomJournalPrompt(excludeText) {
    if (JOURNAL_PROMPTS.length <= 1) return JOURNAL_PROMPTS[0];
    let p;
    do { p = JOURNAL_PROMPTS[Math.floor(Math.random() * JOURNAL_PROMPTS.length)]; } while (p === excludeText);
    return p;
  }

  function showRandomJournalPrompt() {
    journalPromptOffered = pickRandomJournalPrompt(journalPromptOffered);
    document.getElementById('journalPromptText').textContent = journalPromptOffered;
    document.getElementById('journalPromptOverlay').hidden = false;
  }

  document.getElementById('journalPromptBtn').addEventListener('click', showRandomJournalPrompt);
  document.getElementById('journalPromptAnotherBtn').addEventListener('click', showRandomJournalPrompt);

  document.getElementById('journalPromptAcceptBtn').addEventListener('click', () => {
    document.getElementById('journalPromptOverlay').hidden = true;
    if (!journalPromptOffered) return;
    const body = document.getElementById('journalBody');
    const prefix = `[${journalPromptOffered}]\n\n`;
    body.value = prefix + body.value;
    body.focus();
    body.setSelectionRange(prefix.length, prefix.length);
    scheduleJournalAutosave();
  });

  document.getElementById('journalPromptOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.hidden = true;
  });

  // ---------- Framework tags (rendered inside the shoot modal) ----------
  // Every framework-tag checkbox container in the Visuals section, in DOM
  // order — Visual Language renders early (before References/Mood board);
  // any custom frameworks a user adds via Manage render later. Anything that
  // needs to touch "all framework checkboxes" regardless of which container
  // they landed in (autosave gathering, the auto-advance-focus listener)
  // reads this list rather than hardcoding a single id.
  const FRAMEWORK_TAG_CONTAINER_IDS = ['frameworkTagsContainerEarly', 'frameworkTagsContainer'];
  const FRAMEWORK_TAG_CHECKBOX_SELECTOR = FRAMEWORK_TAG_CONTAINER_IDS.map(id => `#${id} input[type="checkbox"]`).join(', ');
  // NOT `FRAMEWORK_TAG_CHECKBOX_SELECTOR + ':checked'` — appending to a
  // comma-joined selector only scopes to the LAST item in the list ("all of A,
  // checked B" rather than "checked in either"), which silently pulled in
  // every Visual Language checkbox regardless of state. Each part needs its
  // own suffix.
  const FRAMEWORK_TAG_CHECKED_SELECTOR = FRAMEWORK_TAG_CONTAINER_IDS.map(id => `#${id} input[type="checkbox"]:checked`).join(', ');

  function renderFrameworkTagGroup(container, frameworks, selectedTags) {
    container.innerHTML = frameworks.map(fw => {
      const collapseKey = `shoot:framework:${fw.id}`;
      const collapsed = isSectionCollapsed(collapseKey);
      return `
        <div class="framework-subsection">
          <h4 class="subsection-heading framework-heading${collapsed ? ' collapsed' : ''}" data-fw-id="${fw.id}">${escapeHtml(fw.name)}${COLLAPSE_ARROW_SVG}</h4>
          <div class="framework-subsection-body" data-fw-body="${fw.id}" ${collapsed ? 'hidden' : ''}>
            <div class="tag-group">
              ${fw.tags.map(tag => {
                const entry = selectedTags.find(t => t.frameworkId === fw.id && t.tag === tag);
                return `<label class="tag-check"><input type="checkbox" data-fw="${fw.id}" value="${escapeHtml(tag)}" ${entry ? 'checked' : ''} /> ${escapeHtml(tag)}</label>`;
              }).join('')}
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.framework-heading').forEach(heading => {
      const fwId = heading.dataset.fwId;
      const body = container.querySelector(`.framework-subsection-body[data-fw-body="${fwId}"]`);
      heading.addEventListener('click', () => {
        const nowCollapsed = !body.hidden;
        setSectionCollapsed(`shoot:framework:${fwId}`, nowCollapsed);
        body.hidden = nowCollapsed;
        heading.classList.toggle('collapsed', nowCollapsed);
      });
    });
  }

  // Visual Language renders as its own smaller, collapsible subsection nested
  // under Visuals (same visual language as Shot list), in its own early
  // container so References/Mood board can sit between it and everything
  // else. Any custom frameworks a user adds via Manage render into the later
  // container. Lighting setups is its own standalone section further down —
  // no longer nested under a framework at all (see the Lighting removal in
  // migrateFrameworks/loadState).
  function renderShootFrameworkTags(shoot) {
    const earlyContainer = document.getElementById('frameworkTagsContainerEarly');
    const container = document.getElementById('frameworkTagsContainer');

    const selectedTags = shoot ? (shoot.frameworkTags || []) : [];
    const visualLanguageFws = state.frameworks.filter(fw => fw.name === 'Visual Language');
    const restFws = state.frameworks.filter(fw => fw.name !== 'Visual Language');
    renderFrameworkTagGroup(earlyContainer, visualLanguageFws, selectedTags);
    renderFrameworkTagGroup(container, restFws, selectedTags);
    // Empty once Lighting's gone, unless a custom framework was added via
    // Manage — hidden rather than left as a stray gap (see the margin-top
    // this container gets further down in Visuals).
    container.hidden = restFws.length === 0;
  }

  function syncShootFrameworkTags() {
    if (!shootModalOverlay.hidden) {
      const s = editingShootId ? state.shoots.find(x => x.id === editingShootId) : null;
      renderShootFrameworkTags(s);
    }
  }

  // Checking a tag auto-advances focus to the next checkbox so a run of
  // taps can march down the list without re-aiming each time. Attached to
  // each framework container separately (rather than delegated from a shared
  // ancestor) so it can't also catch unrelated checkboxes — the mood board
  // "complete?" box sits between the two in the DOM now.
  FRAMEWORK_TAG_CONTAINER_IDS.forEach(id => {
    document.getElementById(id).addEventListener('change', (e) => {
      if (e.target.type !== 'checkbox' || !e.target.checked) return;
      const all = [...document.querySelectorAll(FRAMEWORK_TAG_CHECKBOX_SELECTOR)];
      const next = all[all.indexOf(e.target) + 1];
      if (next) next.focus();
    });
  });

  // ---------- Known-contact handle lookup (talents + team members) ----------
  // Scans every shoot's talents/team members for a name match and returns
  // whatever handle(s) were saved for them last time — so a returning
  // client or a repeat team member's handle doesn't have to be retyped.
  // Rebuilt fresh on every lookup (simple over clever: this app's shoot
  // count never gets remotely large enough for that to matter).
  function buildContactHandleRegistry() {
    const registry = new Map(); // name (trimmed, lowercased) -> Map(platform -> handle)
    function record(name, platform, handle) {
      const key = (name || '').trim().toLowerCase();
      if (!key || !hasText(handle)) return;
      if (!registry.has(key)) registry.set(key, new Map());
      registry.get(key).set(platform || 'instagram', handle.trim());
    }
    state.shoots.forEach(s => {
      (s.talents || []).forEach(t => {
        (t.socialHandles || []).forEach(sh => record(t.name, sh.platform, sh.handle));
      });
      (s.teamMembers || []).forEach(tm => record(tm.name, tm.socialPlatform, tm.socialHandle));
    });
    return registry;
  }

  function lookupContactHandles(name) {
    const key = (name || '').trim().toLowerCase();
    if (!key) return [];
    const entry = buildContactHandleRegistry().get(key);
    if (!entry) return [];
    return Array.from(entry.entries()).map(([platform, handle]) => ({ platform, handle }));
  }

  // Team members only have room for one handle — prefer instagram (the
  // default platform) if the contact has one, otherwise whatever's on file.
  function lookupBestContactHandle(name) {
    const matches = lookupContactHandles(name);
    if (!matches.length) return null;
    return matches.find(m => m.platform === 'instagram') || matches[0];
  }

  // ---------- Talents (dynamic list, right under Title) ----------
  // Each talent renders as a compact read-only summary card — name, and
  // handles as plain text — with an Edit button that reopens the same popup
  // used to add one, prefilled (see openTalentModal/talentModalDraft below).
  // Mirrors the Location popup's pattern: nothing commits to currentTalents
  // until Save is tapped, so canceling out of an edit throws nothing away.
  let currentTalents = [];

  function renderTalents() {
    const container = document.getElementById('talentsList');
    container.innerHTML = currentTalents.map((talent, idx) => {
      const handles = (talent.socialHandles || []).filter(sh => hasText(sh.handle));
      return `
      <div class="team-member-card talent-summary-card" data-idx="${idx}">
        <div class="talent-summary-heading">
          ${talent.photo ? `<img src="${talent.photo}" alt="" class="talent-summary-photo" />` : ''}
          <span class="talent-summary-name">${escapeHtml(hasText(talent.name) ? talent.name : `Talent ${idx + 1}`)}</span>
        </div>
        ${handles.length ? `
          <div class="talent-summary-handles">
            ${handles.map(sh => {
              const entry = SOCIAL_PLATFORM_OPTIONS.find(([val]) => val === sh.platform);
              return `<span>${escapeHtml(entry ? entry[1] : 'Other')}: ${escapeHtml(sh.handle)}</span>`;
            }).join('')}
          </div>
        ` : ''}
        <button type="button" class="talent-summary-delete" data-idx="${idx}"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
      </div>
    `;
    }).join('');

    // The whole card is the "edit" affordance now — no separate button needed.
    container.querySelectorAll('.talent-summary-card').forEach(card => {
      card.addEventListener('click', () => openTalentModal(Number(card.dataset.idx)));
    });
    container.querySelectorAll('.talent-summary-delete').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        // The card itself opens the edit popup, so the delete "x" has to stop
        // the click here or it also reopens a popup for the talent it just removed.
        ev.stopPropagation();
        const idx = Number(btn.dataset.idx);
        const talent = currentTalents[idx];
        if (!talent) return;
        // Removing a talent also throws away their handles and photo, so it
        // asks first rather than vanishing on a mis-tap.
        const who = hasText(talent.name) ? talent.name.trim() : `Talent ${idx + 1}`;
        if (!confirm(`Remove ${who} from this shoot? Their handles and photo will be removed too.`)) return;
        if (currentShootId && talent.id) idbDeleteImages(talentPhotoKey(currentShootId, talent.id)).catch(() => {});
        currentTalents.splice(idx, 1);
        renderTalents();
        scheduleShootAutosave();
      });
    });
  }

  document.getElementById('addTalentBtn').addEventListener('click', () => openTalentModal(null));

  // ---------- Talent popup (name/handles/photo + a "returning talent" picker) ----------
  // talentModalTargetIdx: index into currentTalents being edited, or null
  // while adding a new one. talentModalDraft holds the in-progress edits —
  // nothing in currentTalents changes until Save (see saveTalentModalBtn).
  let talentModalTargetIdx = null;
  let talentModalDraft = null;
  let pastTalentSamples = [];

  // Every distinct past talent name, ranked: talents who were the FIRST
  // (lead) name on 2+ shoots first, then talents who were lead on exactly
  // one shoot, then everyone who only ever appeared as a secondary/tertiary
  // talent — alphabetical within each tier. The sample pulled in for each
  // name (handles/photo) is whichever shoot used it most recently, same
  // "most recent wins" reasoning as getLastLocationDirections below.
  function getAllPastTalents() {
    const leadCounts = {};
    const sampleDates = {};
    const samples = {};
    const dismissed = new Set(state.dismissedTalentKeys);
    state.shoots.forEach(s => {
      (s.talents || []).forEach((t, i) => {
        if (!hasText(t.name)) return;
        const key = t.name.trim().toLowerCase();
        if (dismissed.has(key)) return;
        if (i === 0) leadCounts[key] = (leadCounts[key] || 0) + 1;
        const d = s.date || '';
        if (!(key in sampleDates) || d > sampleDates[key]) {
          sampleDates[key] = d;
          samples[key] = t;
        }
      });
    });
    return Object.keys(samples)
      .sort((a, b) => {
        const aLead = leadCounts[a] || 0;
        const bLead = leadCounts[b] || 0;
        const tier = n => (n >= 2 ? 0 : n === 1 ? 1 : 2);
        const tierDiff = tier(aLead) - tier(bLead);
        return tierDiff || samples[a].name.localeCompare(samples[b].name);
      })
      .map(key => samples[key]);
  }

  function refreshPastTalentsSelect() {
    pastTalentSamples = getAllPastTalents();
    const select = document.getElementById('pastTalentsSelect');
    select.innerHTML = '<option value="">Select a past talent…</option>'
      + pastTalentSamples.map((t, i) => `<option value="${i}">${escapeHtml(t.name)}</option>`).join('')
      + '<option value="__manage__">Manage saved…</option>';
  }

  document.getElementById('pastTalentsSelect').addEventListener('change', (e) => {
    if (e.target.value === '__manage__') {
      e.target.value = '';
      openManageTalentsModal();
      return;
    }
    if (e.target.value === '') return;
    const t = pastTalentSamples[Number(e.target.value)];
    if (!t || !talentModalDraft) return;
    talentModalDraft.name = t.name || '';
    talentModalDraft.socialHandles = (t.socialHandles || []).map(sh => ({ ...sh }));
    talentModalDraft.photo = t.photo || '';
    // This card now shows someone else, so its own photo is replaced outright
    // (even by none) — but that's not a request to strip the photo off that
    // person's other shoots, and any earlier Remove press no longer applies.
    talentModalDraft.photoRemoved = false;
    talentModalDraft.photoSwapped = true;
    // Picking a returning talent links this draft to their identity (by
    // name, same matching getAllPastTalents already uses) — saveTalentModalBtn
    // uses this to propagate any edits back to every other shoot's copy of
    // the same person instead of leaving them out of sync.
    talentModalDraft._matchName = t.name || '';
    fillTalentModalForm();
  });

  // Same non-destructive "dismiss" pattern as Manage Locations — deleting
  // here only hides a name from future quick-picks (dismissedTalentKeys),
  // it never touches any shoot's own talents array or the profile-sync
  // matching saveTalentModalBtn does by name.
  function renderManageTalentsList() {
    const samples = getAllPastTalents();
    const container = document.getElementById('manageTalentsList');
    if (!samples.length) {
      container.innerHTML = '<p class="empty-hint">No saved talents yet.</p>';
      return;
    }
    container.innerHTML = samples.map((t, idx) => `
      <div class="manage-location-row">
        <span>${escapeHtml(t.name)}</span>
        <button type="button" class="delete-manage-location" data-idx="${idx}"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
      </div>
    `).join('');
    container.querySelectorAll('.delete-manage-location').forEach(btn => {
      btn.addEventListener('click', () => {
        const t = samples[Number(btn.dataset.idx)];
        if (!t) return;
        const key = t.name.trim().toLowerCase();
        if (!state.dismissedTalentKeys.includes(key)) state.dismissedTalentKeys.push(key);
        saveState();
        renderManageTalentsList();
        // The Talent modal's dropdown is still open underneath, so it has
        // to drop the deleted entry now rather than on next open.
        refreshPastTalentsSelect();
      });
    });
  }

  function openManageTalentsModal() {
    renderManageTalentsList();
    document.getElementById('manageTalentsOverlay').hidden = false;
  }

  function renderTalentModalHandles() {
    const container = document.getElementById('talentModalHandlesList');
    container.innerHTML = talentModalDraft.socialHandles.map((sh, shIdx) => `
      <div class="social-handle-row">
        <select class="social-handle-platform" data-handle-idx="${shIdx}">
          ${SOCIAL_PLATFORM_OPTIONS.map(([val, label]) => `<option value="${val}" ${sh.platform === val ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
        <input type="text" class="social-handle-input" data-handle-idx="${shIdx}" placeholder="@handle" value="${escapeHtml(sh.handle || '@')}" />
        <button type="button" class="delete-social-handle" data-handle-idx="${shIdx}"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
      </div>
    `).join('');
    container.querySelectorAll('.social-handle-platform').forEach(sel => {
      sel.addEventListener('change', () => {
        talentModalDraft.socialHandles[Number(sel.dataset.handleIdx)].platform = sel.value;
      });
    });
    container.querySelectorAll('.social-handle-input').forEach(input => {
      input.addEventListener('input', () => {
        talentModalDraft.socialHandles[Number(input.dataset.handleIdx)].handle = input.value;
      });
    });
    container.querySelectorAll('.delete-social-handle').forEach(btn => {
      btn.addEventListener('click', () => {
        talentModalDraft.socialHandles.splice(Number(btn.dataset.handleIdx), 1);
        renderTalentModalHandles();
      });
    });
  }

  document.getElementById('talentModalAddHandleBtn').addEventListener('click', () => {
    talentModalDraft.socialHandles.push({ platform: 'instagram', handle: '' });
    renderTalentModalHandles();
  });

  function renderTalentModalPhoto() {
    document.getElementById('talentModalPhotoBtn').textContent = talentModalDraft.photo ? 'Change talent photo' : '+ Add talent photo';
    const wrap = document.getElementById('talentModalPhotoWrap');
    wrap.innerHTML = talentModalDraft.photo ? `
      <div class="talent-photo-wrap">
        <div class="moodboard-thumb talent-photo-thumb">
          <img src="${talentModalDraft.photo}" alt="" id="talentModalPhotoImg" />
        </div>
        <button type="button" class="manage-link" id="talentModalPhotoRemoveBtn">Remove photo</button>
      </div>
    ` : '';
    const img = document.getElementById('talentModalPhotoImg');
    if (img) img.addEventListener('click', () => openImageViewer([{ src: talentModalDraft.photo, caption: '' }], 0, null, null, false));
    const removeBtn = document.getElementById('talentModalPhotoRemoveBtn');
    if (removeBtn) removeBtn.addEventListener('click', () => {
      talentModalDraft.photo = '';
      // The one thing that means "this person has no photo now" — a draft that
      // merely doesn't have one (never added, or not loaded yet) must not be
      // taken for it (see saveTalentModalBtn).
      talentModalDraft.photoRemoved = true;
      renderTalentModalPhoto();
    });
  }

  document.getElementById('talentModalPhotoBtn').addEventListener('click', () => {
    document.getElementById('talentPhotoFileInput').click();
  });

  document.getElementById('talentPhotoFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file || !talentModalDraft) return;
    resizeImageFile(file, 1280, 0.72).then(dataUrl => {
      openProjectPhotoCrop(dataUrl, 'talent');
    }).catch(() => {});
  });

  function fillTalentModalForm() {
    document.getElementById('talentModalNameInput').value = talentModalDraft.name || '';
    renderTalentModalHandles();
    renderTalentModalPhoto();
  }

  function openTalentModal(idx) {
    talentModalTargetIdx = (idx === null || idx === undefined) ? null : idx;
    const existing = talentModalTargetIdx !== null ? currentTalents[talentModalTargetIdx] : null;
    talentModalDraft = existing
      ? { id: existing.id, name: existing.name || '', socialHandles: (existing.socialHandles || []).map(sh => ({ ...sh })), photo: existing.photo || '' }
      : { id: uid(), name: '', socialHandles: [], photo: '' };
    // Editing someone already named (whether typed fresh earlier or picked
    // from "returning talent" on a past visit) still counts as their
    // identity — an edit here should propagate to their other shoots too,
    // not just to picks made in this exact session. See saveTalentModalBtn.
    talentModalDraft._matchName = talentModalDraft.name || '';
    refreshPastTalentsSelect();
    fillTalentModalForm();
    document.getElementById('talentModalOverlay').hidden = false;
  }

  document.getElementById('talentModalNameInput').addEventListener('input', (e) => {
    talentModalDraft.name = e.target.value;
  });

  document.getElementById('saveTalentModalBtn').addEventListener('click', () => {
    const draft = talentModalDraft;
    draft.name = document.getElementById('talentModalNameInput').value.trim();
    draft.socialHandles = draft.socialHandles.map(sh => ({ ...sh, handle: normalizeSocialHandle(sh.handle) }));
    const oldPhoto = talentModalTargetIdx !== null ? (currentTalents[talentModalTargetIdx].photo || '') : '';
    const photoRemoved = !!draft.photoRemoved;
    const photoSwapped = !!draft.photoSwapped;
    delete draft.photoRemoved;
    delete draft.photoSwapped;
    // A draft with no photo only means "no photo" if the user said so (Remove,
    // or picking a different person). Otherwise it's empty because the photo
    // simply hadn't reached memory when the popup opened, and saving it must
    // not turn that into a deletion.
    if (!draft.photo && oldPhoto && !photoRemoved && !photoSwapped) draft.photo = oldPhoto;

    if (talentModalTargetIdx !== null) currentTalents[talentModalTargetIdx] = draft;
    else currentTalents.push(draft);

    if (currentShootId) {
      if (draft.photo) savePhotoToIdb(talentPhotoKey(currentShootId, draft.id), draft.photo).catch(() => {});
      else if (oldPhoto) idbDeleteImages(talentPhotoKey(currentShootId, draft.id)).catch(() => {});
    }
    // With no mood board or final images yet, nothing has claimed the cover
    // (those paths auto-set it from their first photo) — so a talent photo
    // becomes the shoot's cover rather than leaving the bubble blank. Both
    // boxes are 4:5, so it drops in without any odd object-fit cropping.
    if (draft.photo && !pendingProjectPhoto) {
      pendingProjectPhoto = draft.photo;
      const coverShootId = currentShootId;
      if (coverShootId) {
        savePhotoToIdb(projectPhotoKey(coverShootId), draft.photo).catch(() => {})
          .then(() => onShootImagesChanged(coverShootId, { cover: true }));
      }
    }

    // A talent picked from "returning talent" (or reopened from a card that
    // was itself picked that way once) is the same person everywhere they
    // appear — a handle added, a photo added, or a name fixed here should
    // update every other shoot's copy too, rather than leaving those behind
    // as stale duplicates of who they used to be. Matched by name, same as
    // getAllPastTalents groups them; matches on THIS shoot are left alone
    // since the block above already wrote the one being edited.
    const matchName = (draft._matchName || '').trim().toLowerCase();
    delete draft._matchName;
    if (matchName) {
      state.shoots.forEach(s => {
        if (s.id === currentShootId) return;
        (s.talents || []).forEach(t => {
          if ((t.name || '').trim().toLowerCase() !== matchName) return;
          const oldTalentPhoto = t.photo || '';
          t.name = draft.name;
          t.socialHandles = draft.socialHandles.map(sh => ({ ...sh }));
          if (draft.photo) {
            t.photo = draft.photo;
            savePhotoToIdb(talentPhotoKey(s.id, t.id), draft.photo).catch(() => {});
          } else if (photoRemoved) {
            t.photo = '';
            if (oldTalentPhoto) idbDeleteImages(talentPhotoKey(s.id, t.id)).catch(() => {});
          }
          // Otherwise this copy simply has no photo to share, which says
          // nothing about the other shoots' — their photo and stored image
          // are left alone. (Saving a photo-less copy used to permanently
          // delete every other copy's photo.)
        });
      });
      // The open shoot's own copy is committed in the same save, so a
      // multi-day lead and the days following it change together — saved
      // apart, the following days would look edited by hand and stop
      // mirroring (see syncProjectMirrors).
      clearTimeout(shootSaveTimer);
      if (!autosaveShoot()) saveState();
      renderAll();
    }

    document.getElementById('talentModalOverlay').hidden = true;
    talentModalDraft = null;
    renderTalents();
    scheduleShootAutosave();
  });

  // ---------- Team members (popup, mirrors the Talent popup pattern) ----------
  // Each member renders as a read-only summary card — role, name, and handle
  // as plain text — with the card itself reopening the same popup used to
  // add one, prefilled (see openTeamMemberModal/teamMemberModalDraft below).
  // Nothing commits to currentTeamMembers until Save is tapped.
  let currentTeamMembers = [];

  function renderTeamMembers() {
    const container = document.getElementById('teamMembersList');
    container.innerHTML = currentTeamMembers.map((tm, idx) => {
      const roleLabel = (TEAM_ROLE_OPTIONS.find(([val]) => val === tm.role) || [null, 'Other'])[1];
      const platformLabel = (SOCIAL_PLATFORM_OPTIONS.find(([val]) => val === tm.socialPlatform) || [null, 'Other'])[1];
      return `
      <div class="team-member-card team-member-summary-card" data-idx="${idx}">
        <div class="talent-summary-heading">
          <span class="talent-summary-name">${escapeHtml(hasText(tm.name) ? tm.name : `Team member ${idx + 1}`)}</span>
        </div>
        <div class="talent-summary-handles">
          <span>${escapeHtml(roleLabel)}</span>
          ${hasText(tm.socialHandle) ? `<span>${escapeHtml(platformLabel)}: ${escapeHtml(tm.socialHandle)}</span>` : ''}
        </div>
        <button type="button" class="talent-summary-delete" data-idx="${idx}"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
      </div>
    `;
    }).join('');

    // The whole card is the "edit" affordance — no separate button needed.
    container.querySelectorAll('.team-member-summary-card').forEach(card => {
      card.addEventListener('click', () => openTeamMemberModal(Number(card.dataset.idx)));
    });
    container.querySelectorAll('.talent-summary-delete').forEach(btn => {
      btn.addEventListener('click', (ev) => {
        // The card itself opens the edit popup, so the delete "x" has to stop
        // the click here or it also reopens a popup for the member it just removed.
        ev.stopPropagation();
        const idx = Number(btn.dataset.idx);
        currentTeamMembers.splice(idx, 1);
        renderTeamMembers();
        scheduleShootAutosave();
      });
    });
  }

  document.getElementById('addTeamMemberBtn').addEventListener('click', () => openTeamMemberModal(null));

  // ---------- Team member popup (name/role/handle + a "returning member" picker) ----------
  let teamMemberModalTargetIdx = null;
  let teamMemberModalDraft = null;
  let pastTeamMemberSamples = [];

  // Every distinct past team member name, ranked by how many past shoots
  // they've worked (most-used first, alphabetical within a tie) — same
  // "returning contact" idea as past locations, just counted by name
  // instead of by location key. The sample pulled in for each name is
  // whichever shoot used it most recently.
  function getAllPastTeamMembers() {
    const counts = {};
    const sampleDates = {};
    const samples = {};
    const dismissed = new Set(state.dismissedTeamMemberKeys);
    state.shoots.forEach(s => {
      (s.teamMembers || []).forEach(tm => {
        if (!hasText(tm.name)) return;
        const key = tm.name.trim().toLowerCase();
        if (dismissed.has(key)) return;
        counts[key] = (counts[key] || 0) + 1;
        const d = s.date || '';
        if (!(key in sampleDates) || d > sampleDates[key]) {
          sampleDates[key] = d;
          samples[key] = tm;
        }
      });
    });
    return Object.keys(counts)
      .sort((a, b) => counts[b] - counts[a] || samples[a].name.localeCompare(samples[b].name))
      .map(key => samples[key]);
  }

  // Static option lists — populated once rather than per-render, since
  // (unlike the old inline repeater) this modal isn't rebuilt every time
  // a team member is added or edited.
  document.getElementById('teamMemberModalRoleSelect').innerHTML =
    TEAM_ROLE_OPTIONS.map(([val, label]) => `<option value="${val}">${label}</option>`).join('');
  document.getElementById('teamMemberModalSocialPlatform').innerHTML =
    SOCIAL_PLATFORM_OPTIONS.map(([val, label]) => `<option value="${val}">${label}</option>`).join('');

  function refreshPastTeamMembersSelect() {
    pastTeamMemberSamples = getAllPastTeamMembers();
    const select = document.getElementById('pastTeamMembersSelect');
    select.innerHTML = '<option value="">Select a past team member…</option>'
      + pastTeamMemberSamples.map((tm, i) => `<option value="${i}">${escapeHtml(tm.name)}</option>`).join('')
      + '<option value="__manage__">Manage saved…</option>';
  }

  document.getElementById('pastTeamMembersSelect').addEventListener('change', (e) => {
    if (e.target.value === '__manage__') {
      e.target.value = '';
      openManageTeamMembersModal();
      return;
    }
    if (e.target.value === '') return;
    const tm = pastTeamMemberSamples[Number(e.target.value)];
    if (!tm || !teamMemberModalDraft) return;
    teamMemberModalDraft.role = tm.role || 'makeup_artist';
    teamMemberModalDraft.name = tm.name || '';
    teamMemberModalDraft.socialPlatform = tm.socialPlatform || 'instagram';
    teamMemberModalDraft.socialHandle = tm.socialHandle || '';
    fillTeamMemberModalForm();
  });

  // Same non-destructive "dismiss" pattern as Manage Locations — deleting
  // here only hides a name from future quick-picks (dismissedTeamMemberKeys),
  // it never touches any shoot's own teamMembers array.
  function renderManageTeamMembersList() {
    const samples = getAllPastTeamMembers();
    const container = document.getElementById('manageTeamMembersList');
    if (!samples.length) {
      container.innerHTML = '<p class="empty-hint">No saved team members yet.</p>';
      return;
    }
    container.innerHTML = samples.map((tm, idx) => `
      <div class="manage-location-row">
        <span>${escapeHtml(tm.name)}</span>
        <button type="button" class="delete-manage-location" data-idx="${idx}"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
      </div>
    `).join('');
    container.querySelectorAll('.delete-manage-location').forEach(btn => {
      btn.addEventListener('click', () => {
        const tm = samples[Number(btn.dataset.idx)];
        if (!tm) return;
        const key = tm.name.trim().toLowerCase();
        if (!state.dismissedTeamMemberKeys.includes(key)) state.dismissedTeamMemberKeys.push(key);
        saveState();
        renderManageTeamMembersList();
        // The Team member modal's dropdown is still open underneath, so it
        // has to drop the deleted entry now rather than on next open.
        refreshPastTeamMembersSelect();
      });
    });
  }

  function openManageTeamMembersModal() {
    renderManageTeamMembersList();
    document.getElementById('manageTeamMembersOverlay').hidden = false;
  }

  function fillTeamMemberModalForm() {
    document.getElementById('teamMemberModalRoleSelect').value = teamMemberModalDraft.role || 'makeup_artist';
    document.getElementById('teamMemberModalNameInput').value = teamMemberModalDraft.name || '';
    document.getElementById('teamMemberModalSocialPlatform').value = teamMemberModalDraft.socialPlatform || 'instagram';
    document.getElementById('teamMemberModalSocialInput').value = teamMemberModalDraft.socialHandle || '@';
  }

  function openTeamMemberModal(idx) {
    teamMemberModalTargetIdx = (idx === null || idx === undefined) ? null : idx;
    const existing = teamMemberModalTargetIdx !== null ? currentTeamMembers[teamMemberModalTargetIdx] : null;
    teamMemberModalDraft = existing
      ? { ...existing }
      : { role: 'makeup_artist', name: '', socialPlatform: 'instagram', socialHandle: '' };
    refreshPastTeamMembersSelect();
    fillTeamMemberModalForm();
    document.getElementById('teamMemberModalOverlay').hidden = false;
  }

  document.getElementById('teamMemberModalRoleSelect').addEventListener('change', (e) => {
    teamMemberModalDraft.role = e.target.value;
  });

  document.getElementById('teamMemberModalNameInput').addEventListener('input', (e) => {
    teamMemberModalDraft.name = e.target.value;
  });

  // Same auto-fill as before the popup redesign: leaving the name field
  // having typed a known contact's name fills in whatever handle was saved
  // for them last time, unless one's already been typed here.
  document.getElementById('teamMemberModalNameInput').addEventListener('blur', () => {
    const draft = teamMemberModalDraft;
    if (!draft || hasText(draft.socialHandle)) return;
    const match = lookupBestContactHandle(draft.name);
    if (!match) return;
    draft.socialPlatform = match.platform;
    draft.socialHandle = match.handle;
    fillTeamMemberModalForm();
  });

  document.getElementById('teamMemberModalSocialPlatform').addEventListener('change', (e) => {
    teamMemberModalDraft.socialPlatform = e.target.value;
  });

  document.getElementById('teamMemberModalSocialInput').addEventListener('input', (e) => {
    teamMemberModalDraft.socialHandle = e.target.value;
  });

  document.getElementById('saveTeamMemberModalBtn').addEventListener('click', () => {
    const draft = teamMemberModalDraft;
    draft.name = document.getElementById('teamMemberModalNameInput').value.trim();
    draft.socialHandle = normalizeSocialHandle(draft.socialHandle);

    if (teamMemberModalTargetIdx !== null) currentTeamMembers[teamMemberModalTargetIdx] = draft;
    else currentTeamMembers.push(draft);

    document.getElementById('teamMemberModalOverlay').hidden = true;
    teamMemberModalDraft = null;
    renderTeamMembers();
    scheduleShootAutosave();
  });

  function updateTeamRequiredUI() {
    const yes = document.getElementById('teamRequiredYes').checked;
    const no = document.getElementById('teamRequiredNo').checked;
    document.getElementById('teamDetailsBlock').hidden = !yes;
    document.getElementById('teamFinalizedNote').hidden = !no;
  }

  document.getElementById('teamRequiredYes').addEventListener('change', (e) => {
    if (e.target.checked) document.getElementById('teamRequiredNo').checked = false;
    updateTeamRequiredUI();
  });

  document.getElementById('teamRequiredNo').addEventListener('change', (e) => {
    if (e.target.checked) document.getElementById('teamRequiredYes').checked = false;
    updateTeamRequiredUI();
  });

  // ---------- Shot list (checklist inside Shoot-day notes) ----------
  // Checked items stay in the underlying array in their original order —
  // renderShotList() just displays unchecked-first, checked-last, so
  // unchecking an item returns it to its original spot automatically.
  let currentShotList = [];

  // Shots and lighting setups read as lines of writing rather than boxes, so
  // each row is sized to exactly the text in it instead of a fixed slab of
  // empty field.
  //
  // scrollHeight is content + padding but NOT border, while `* { box-sizing:
  // border-box }` makes an assigned height cover content + padding + border.
  // Assigning scrollHeight straight across therefore lands the box short by the
  // border width and shaves the last line — so the borders get added back.
  //
  // scrollHeight is also 0 while the row is hidden (no layout), and assigning
  // that would flatten it to nothing; a zero measurement is skipped so the row
  // keeps its one-line default until something visible re-runs this.
  function autoSizeTextarea(el) {
    el.style.height = 'auto';
    if (!el.scrollHeight) return;
    const cs = getComputedStyle(el);
    const borders = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth);
    el.style.height = (el.scrollHeight + borders) + 'px';
  }

  // #shootModeShotList included here too — openShootMode's own re-measure
  // pass calls this function expecting it to cover Shoot Mode's shot rows
  // as well as the main form's; it silently didn't, since this selector
  // never named that list, leaving a shot with wrapped text visibly
  // clipped to one line the moment you entered Shoot Mode (correcting
  // itself only once you typed in it, which re-triggers sizing via the
  // row's own input listener).
  function autoSizeAllListTextareas() {
    document.querySelectorAll('#shotListItems .shot-text, #lightingSetupsItems .lighting-setup-description, #shootModeShotList .shot-text, #shootModeShootingNotes')
      .forEach(autoSizeTextarea);
  }

  // A field with something in it should read as what you wrote, not as an input
  // still waiting for you — the same treatment the shot list got. An EMPTY field
  // keeps its box, because the box is the thing that says "put something here";
  // a filled one keeps a rule underneath, which is what says "tap to change it".
  //
  // Only free-text fields qualify. Date, time and select are pickers: stripping
  // their frame would read as broken rather than as written-in, and there's no
  // typing to reveal. The shot rows are skipped too — they already carry this
  // look permanently via .shot-text, and their own renderer sizes them. The
  // lighting fields (no .shot-text) do qualify, which is why their renderer
  // re-syncs them itself after rebuilding.
  function isBoxSheddingField(el) {
    if (el.classList.contains('shot-text')) return false;
    if (el.tagName === 'TEXTAREA') return true;
    return el.tagName === 'INPUT' && (!el.type || el.type === 'text');
  }

  function syncFieldFilledState(el) {
    if (!el || !el.tagName || !isBoxSheddingField(el)) return;
    const filled = !!el.value.trim();
    el.classList.toggle('is-filled', filled);
    if (el.tagName !== 'TEXTAREA') return;
    // Filled: shrink to the text, so losing the box doesn't leave a tall band of
    // empty ruled space. Empty: hand the height back to the rows attribute.
    if (filled) autoSizeTextarea(el);
    else el.style.height = '';
  }

  function syncAllShootFormFields() {
    document.querySelectorAll('#shootForm input, #shootForm textarea').forEach(syncFieldFilledState);
  }

  // What a list inside the shoot form actually scrolls in: the new-shoot
  // wizard's card body while the list is borrowed onto one of its slides
  // (see SHOOT_WIZARD_STEPS), the shoot modal itself the rest of the time.
  // Saving/restoring the modal's scroll for a list that's in the card would
  // leave the card free to lurch on every re-render.
  function shootListScroller(container) {
    return (container && container.closest('#shootWizardBody')) || shootModalOverlay.querySelector('.modal');
  }

  // Ticking a checkbox re-renders its whole list, because checked items sort to
  // the bottom — which destroys the very node that was tapped. Left alone the
  // browser drops focus and the modal lurches hundreds of pixels: measured at
  // 3399 -> 2621 on a shoot with a couple of setups.
  //
  // Restoring inside the change handler isn't enough on its own — the click's
  // own default processing runs after the handler and undoes it — so the same
  // restore is repeated on the next frame, which is the first moment nothing
  // else is still touching scroll or focus. preventScroll keeps the view still
  // while focus follows the item down to its new position.
  function restoreAfterListReorder(container, checkIdx, savedScrollTop) {
    const apply = () => {
      const scroller = shootListScroller(container);
      if (scroller && savedScrollTop !== undefined) scroller.scrollTop = savedScrollTop;
      if (checkIdx === undefined) return;
      const cb = container.querySelector(`.shot-check[data-idx="${checkIdx}"]`);
      if (cb) cb.focus({ preventScroll: true });
    };
    apply();
    requestAnimationFrame(apply);
  }

  function renderShotList(focusIdx, refocusCheckIdx) {
    const container = document.getElementById('shotListItems');
    const scroller = shootListScroller(container);
    const savedScrollTop = refocusCheckIdx === undefined || !scroller ? undefined : scroller.scrollTop;
    const indexed = currentShotList.map((item, idx) => ({ ...item, idx }));
    const ordered = indexed.filter(i => !i.checked).concat(indexed.filter(i => i.checked));
    container.innerHTML = ordered.map(item => `
      <div class="shot-list-row${item.checked ? ' shot-checked' : ''}" data-idx="${item.idx}">
        <button type="button" class="shot-drag-handle" aria-label="Drag to reorder shot" tabindex="-1">&#8942;</button>
        <input type="checkbox" class="shot-check" data-idx="${item.idx}" ${item.checked ? 'checked' : ''} />
        <textarea class="shot-text" data-idx="${item.idx}" rows="1" placeholder="Describe the shot">${escapeHtml(item.text || '')}</textarea>
        <button type="button" class="delete-shot" data-idx="${item.idx}"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
      </div>
    `).join('');

    container.querySelectorAll('.shot-check').forEach(cb => {
      cb.addEventListener('change', () => {
        const idx = Number(cb.dataset.idx);
        currentShotList[idx].checked = cb.checked;
        renderShotList(undefined, idx);
        scheduleShootAutosave();
      });
    });
    container.querySelectorAll('.shot-text').forEach(textarea => {
      autoSizeTextarea(textarea);
      textarea.addEventListener('input', () => {
        currentShotList[Number(textarea.dataset.idx)].text = textarea.value;
        autoSizeTextarea(textarea);
        scheduleShootAutosave();
      });
      textarea.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const idx = Number(textarea.dataset.idx);
        currentShotList[idx].text = textarea.value;
        // If the row right after is already a blank one — e.g. it was just
        // created by an earlier Enter, and the user tapped back up to fix
        // something above it rather than typing into it — reuse that one
        // instead of stacking a second blank row on top of it.
        const next = currentShotList[idx + 1];
        if (!next || hasText(next.text)) {
          currentShotList.splice(idx + 1, 0, { text: '', checked: false });
        }
        renderShotList(idx + 1);
        scheduleShootAutosave();
      });
    });
    container.querySelectorAll('.delete-shot').forEach(btn => {
      btn.addEventListener('click', () => {
        currentShotList.splice(Number(btn.dataset.idx), 1);
        renderShotList();
        scheduleShootAutosave();
      });
    });
    container.querySelectorAll('.shot-drag-handle').forEach(handle => {
      wireShotDragHandle(handle, container);
    });

    if (focusIdx !== undefined) {
      const focusInput = container.querySelector(`.shot-text[data-idx="${focusIdx}"]`);
      if (focusInput) {
        focusInput.focus();
        // A row added via Enter can land low enough in this scrolling form
        // to come up right against the sticky Save bar fixed below it (or
        // the iOS keyboard) — the browser's own scroll-into-view-on-focus
        // doesn't know either is there and won't leave them any clearance.
        // Centering it ourselves guarantees a clear look at what's being
        // typed instead of a sliver hidden behind either one. Same fix as
        // Shoot Mode's own shot list — see renderShootModeShots.
        focusInput.scrollIntoView({ block: 'center' });
        if (window.visualViewport) {
          window.visualViewport.addEventListener(
            'resize',
            () => focusInput.scrollIntoView({ block: 'center' }),
            { once: true }
          );
        }
      }
    }
    restoreAfterListReorder(container, refocusCheckIdx, savedScrollTop);
  }

  // Press-and-hold reorder for shot rows. Dragging is restricted to rows
  // within the same checked/unchecked bucket, since renderShotList always
  // displays unchecked-first/checked-last — letting a drag cross that
  // boundary would just get silently undone by the next render.
  function wireShotDragHandle(handle, container) {
    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      const row = handle.closest('.shot-list-row');
      if (!row) return;
      const pointerId = e.pointerId;
      const bucketSelector = row.classList.contains('shot-checked')
        ? '.shot-list-row.shot-checked'
        : '.shot-list-row:not(.shot-checked)';

      // The bucket's total span stays constant for the whole drag (reordering
      // same rows doesn't change how much vertical space they occupy), so
      // these bounds are captured once, before any transform, and used to
      // keep the dragged row from drifting past its own bucket — e.g. below
      // the last shot and on top of the "+ Add shot" button.
      const bucketRects = Array.from(container.querySelectorAll(bucketSelector)).map(r => r.getBoundingClientRect());
      const bucketTop = Math.min(...bucketRects.map(r => r.top));
      const bucketBottom = Math.max(...bucketRects.map(r => r.bottom));

      let baseClientY = e.clientY;
      let baseTranslateY = 0;
      let appliedTransform = 0;
      row.classList.add('shot-dragging');
      if (navigator.vibrate) navigator.vibrate(15);
      // iOS Safari has no Vibration API at all, so this pulse is the only
      // "felt" grab feedback that actually reaches an iPhone — a quick
      // scale/color flash on the handle itself, right under the finger.
      handle.classList.add('shot-drag-pulse');
      handle.addEventListener('animationend', () => {
        handle.classList.remove('shot-drag-pulse');
      }, { once: true });
      try { handle.setPointerCapture(e.pointerId); } catch (err) { /* capture is a nice-to-have, not required */ }

      function onMove(ev) {
        if (ev.pointerId !== pointerId) return;
        const rawRect = row.getBoundingClientRect();
        const layoutTop = rawRect.top - appliedTransform;
        const rowHeight = rawRect.height;
        const minDy = bucketTop - layoutTop;
        const maxDy = (bucketBottom - rowHeight) - layoutTop;
        const proposedDy = baseTranslateY + (ev.clientY - baseClientY);
        const dy = Math.min(maxDy, Math.max(minDy, proposedDy));

        row.style.transform = `translateY(${dy}px)`;
        appliedTransform = dy;

        // A fast flick can carry the row's center past more than one
        // neighbor between two pointermove events — checking just the
        // immediate neighbor once per event let the dragged row's visual
        // position (driven directly by the finger, above) outrun its actual
        // slot in the list, landing on top of rows it hadn't swapped past
        // yet. Loop until neither neighbor qualifies, so the DOM order
        // always catches up to wherever the transform already put it.
        const before = row.getBoundingClientRect();
        let swapped = false;
        while (true) {
          const rows = Array.from(container.querySelectorAll(bucketSelector));
          const idx = rows.indexOf(row);
          const rowRect = row.getBoundingClientRect();
          const rowCenter = rowRect.top + rowRect.height / 2;
          const next = rows[idx + 1];
          const prev = rows[idx - 1];

          let neighbor = null;
          let insertBeforeRow = false;
          if (next) {
            const nextRect = next.getBoundingClientRect();
            // >= (not >): the bucket-bounds clamp above can cap the dragged
            // row's center at exactly the last slot's center, so a strict ">"
            // would make the final swap unreachable.
            if (rowCenter >= nextRect.top + nextRect.height / 2) neighbor = next;
          }
          if (!neighbor && prev) {
            const prevRect = prev.getBoundingClientRect();
            if (rowCenter <= prevRect.top + prevRect.height / 2) { neighbor = prev; insertBeforeRow = true; }
          }
          if (!neighbor) break;

          if (insertBeforeRow) container.insertBefore(row, neighbor);
          else container.insertBefore(neighbor, row);
          swapped = true;
        }
        if (!swapped) return;

        row.style.transform = 'none';
        const after = row.getBoundingClientRect();
        baseTranslateY = before.top - after.top;
        baseClientY = ev.clientY;
        row.style.transform = `translateY(${baseTranslateY}px)`;
        appliedTransform = baseTranslateY;
      }

      function onEnd(ev) {
        if (ev && ev.pointerId !== undefined && ev.pointerId !== pointerId) return;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onEnd);
        window.removeEventListener('pointercancel', onEnd);
        row.classList.remove('shot-dragging');
        row.style.transform = '';
        const rows = Array.from(container.querySelectorAll('.shot-list-row'));
        currentShotList = rows.map(r => currentShotList[Number(r.dataset.idx)]);
        renderShotList();
        scheduleShootAutosave();
      }

      // Listening on window (not the handle) means tracking survives even
      // if the row hits its bucket clamp and stops moving while the finger
      // keeps going — hit-testing on a now-stationary handle would miss
      // the finger and silently stop delivering events, leaving the row
      // stuck mid-drag with no pointerup ever arriving to release it.
      // setPointerCapture above is kept too, as a belt-and-suspenders
      // targeting hint, but window is what makes this actually reliable.
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onEnd);
      window.addEventListener('pointercancel', onEnd);
    });
  }

  document.getElementById('addShotBtn').addEventListener('click', () => {
    currentShotList.push({ text: '', checked: false });
    renderShotList(currentShotList.length - 1);
    scheduleShootAutosave();
  });

  // ---------- Drag-to-reorder for lists of rows that differ in height ----------
  // Same press-and-drag feel as the shot list, but built for rows of very
  // different heights (a collapsed lighting setup is ~46px, an open one a few
  // hundred), which the shot list's version isn't:
  //   - 'edge' crossing: the dragged row's leading edge against the
  //     neighbour's midline. Comparing centres can't reach the end slots once
  //     the clamp stops a tall row's centre short of a short neighbour's.
  //   - the scroller auto-scrolls near its visible edge, and any scroll is
  //     folded into the drag so the row stays under the finger.
  //   - the transform is re-derived right after every swap, so moving past
  //     several neighbours in one go can't over-swap.
  //   - the neighbour hops over the dragged row, so the dragged node is never
  //     detached (it keeps its pointer capture).
  //   - a drop that changes nothing commits nothing: no re-render, no save.
  const DRAG_SWAP_BIAS = 6;         // px past a neighbour's midline before a swap (stops flip-flopping at the boundary)
  const DRAG_EDGE_ZONE = 56;        // px inside the scroller's visible edge where auto-scroll starts
  const DRAG_MAX_SCROLL_STEP = 14;  // px per 16ms tick at the very edge
  const DRAG_EDGE_INTENT = 12;      // px a grab inside an edge zone must move toward that edge before it scrolls

  // opts: { container, rowSelector, draggingClass, scroll?: { el, bounds() -> {top, bottom} },
  //         onStart?(row), onCommit(rowsInNewDomOrder) }. Rows must be direct children of container.
  function wireRowDragReorder(handle, opts) {
    const { container, rowSelector, draggingClass, scroll, onStart, onCommit } = opts;
    // Android's long-press would otherwise raise a context menu and cancel the pointer mid-grab.
    handle.addEventListener('contextmenu', (e) => e.preventDefault());
    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      const row = handle.closest(rowSelector);
      if (!row || container.querySelector('.' + draggingClass)) return; // one drag at a time
      const pointerId = e.pointerId;
      if (onStart) onStart(row); // before any measuring: it may blur a field / close a dropdown

      const startRows = Array.from(container.querySelectorAll(rowSelector));
      const startRects = startRows.map(r => r.getBoundingClientRect());
      const limitTop0 = Math.min(...startRects.map(r => r.top));
      const limitBottom0 = Math.max(...startRects.map(r => r.bottom));

      const scrollEl = scroll ? scroll.el : null;
      const scrollStart = scrollEl ? scrollEl.scrollTop : 0;
      let lastScrollTop = scrollStart;
      // Chrome's scroll anchoring can nudge scrollTop when two rows of different heights swap.
      const prevOverflowAnchor = scrollEl ? scrollEl.style.overflowAnchor : '';
      if (scrollEl) scrollEl.style.overflowAnchor = 'none';

      const startClientY = e.clientY;
      let lastClientY = e.clientY;
      let baseClientY = e.clientY;
      let baseTranslateY = 0;
      let appliedTransform = 0;
      let armed = false; // auto-scroll only once the finger has actually moved a few px
      // Each edge arms separately. A card grabbed while it's already inside an
      // edge zone (common: the first card sits right under the sticky header)
      // must not start scrolling toward that edge just because the finger
      // drifted — it arms once the finger has been clear of the zone, or has
      // deliberately moved toward the edge from where it grabbed.
      let topArmed = true;
      let bottomArmed = true;
      if (scroll) {
        const b0 = scroll.bounds();
        topArmed = e.clientY >= b0.top + DRAG_EDGE_ZONE;
        bottomArmed = e.clientY <= b0.bottom - DRAG_EDGE_ZONE;
      }

      row.classList.add(draggingClass);
      if (navigator.vibrate) navigator.vibrate(15);
      handle.classList.add('shot-drag-pulse');
      handle.addEventListener('animationend', () => handle.classList.remove('shot-drag-pulse'), { once: true });
      try { handle.setPointerCapture(pointerId); } catch (err) { /* capture is a nice-to-have, not required */ }

      function update(clientY) {
        // Anything that scrolled the scroller since the last pass (our
        // auto-scroll, a wheel, the browser) moved the row's layout slot
        // under a stationary finger: fold it into the baseline.
        if (scrollEl && scrollEl.scrollTop !== lastScrollTop) {
          baseTranslateY += scrollEl.scrollTop - lastScrollTop;
          lastScrollTop = scrollEl.scrollTop;
        }
        const scrolled = scrollEl ? scrollEl.scrollTop - scrollStart : 0;
        const raw = row.getBoundingClientRect();
        const layoutTop = raw.top - appliedTransform;
        const minDy = (limitTop0 - scrolled) - layoutTop;
        const maxDy = (limitBottom0 - scrolled - raw.height) - layoutTop;
        const dy = Math.min(maxDy, Math.max(minDy, baseTranslateY + (clientY - baseClientY)));
        row.style.transform = `translateY(${dy}px)`;
        appliedTransform = dy;

        for (let guard = 0; guard < 100; guard++) {
          const rows = Array.from(container.querySelectorAll(rowSelector));
          const i = rows.indexOf(row);
          const r = row.getBoundingClientRect();
          const next = rows[i + 1];
          const prev = rows[i - 1];
          let neighbor = null;
          let neighborIsPrev = false;
          if (next) {
            const n = next.getBoundingClientRect();
            // >= (not >): the clamp can park the leading edge exactly on the last slot's midline.
            if (r.bottom - DRAG_SWAP_BIAS >= n.top + n.height / 2) neighbor = next;
          }
          if (!neighbor && prev) {
            const pr = prev.getBoundingClientRect();
            if (r.top + DRAG_SWAP_BIAS <= pr.top + pr.height / 2) { neighbor = prev; neighborIsPrev = true; }
          }
          if (!neighbor) break;

          const visualTop = r.top;
          // Move the NEIGHBOUR over the dragged row, never the dragged row itself.
          if (neighborIsPrev) container.insertBefore(neighbor, row.nextSibling);
          else container.insertBefore(neighbor, row);
          // The swap shifted the row's layout slot; re-derive the transform
          // now so the next pass sees the row exactly where the finger left it.
          row.style.transform = 'none';
          baseTranslateY = visualTop - row.getBoundingClientRect().top;
          baseClientY = clientY;
          row.style.transform = `translateY(${baseTranslateY}px)`;
          appliedTransform = baseTranslateY;
        }
      }

      function onMove(ev) {
        if (ev.pointerId !== pointerId) return;
        lastClientY = ev.clientY;
        if (!armed && Math.abs(ev.clientY - startClientY) > 4) armed = true;
        update(ev.clientY);
      }

      // setInterval, not rAF: rAF doesn't fire in a backgrounded test tab.
      let scrollTimer = null;
      if (scrollEl) {
        scrollTimer = setInterval(() => {
          const { top, bottom } = scroll.bounds();
          if (!topArmed && (lastClientY >= top + DRAG_EDGE_ZONE || startClientY - lastClientY >= DRAG_EDGE_INTENT)) topArmed = true;
          if (!bottomArmed && (lastClientY <= bottom - DRAG_EDGE_ZONE || lastClientY - startClientY >= DRAG_EDGE_INTENT)) bottomArmed = true;
          let step = 0;
          if (armed) {
            if (topArmed && lastClientY < top + DRAG_EDGE_ZONE) {
              step = -DRAG_MAX_SCROLL_STEP * Math.min(1, (top + DRAG_EDGE_ZONE - lastClientY) / DRAG_EDGE_ZONE);
            } else if (bottomArmed && lastClientY > bottom - DRAG_EDGE_ZONE) {
              step = DRAG_MAX_SCROLL_STEP * Math.min(1, (lastClientY - (bottom - DRAG_EDGE_ZONE)) / DRAG_EDGE_ZONE);
            }
          }
          if (step) scrollEl.scrollTop += Math.sign(step) * Math.max(1, Math.round(Math.abs(step)));
          if (scrollEl.scrollTop !== lastScrollTop) update(lastClientY);
        }, 16);
      }

      function onEnd(ev) {
        if (ev && ev.pointerId !== undefined && ev.pointerId !== pointerId) return;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onEnd);
        window.removeEventListener('pointercancel', onEnd);
        clearInterval(scrollTimer);
        row.classList.remove(draggingClass);
        row.style.transform = '';
        const endRows = Array.from(container.querySelectorAll(rowSelector));
        const changed = endRows.some((r, i) => r !== startRows[i]);
        try {
          if (changed) onCommit(endRows);
        } finally {
          if (scrollEl) scrollEl.style.overflowAnchor = prevOverflowAnchor;
        }
      }

      // window, not the handle: once the row hits its clamp it stops being
      // under the finger, and hit-testing a stationary handle would miss it.
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onEnd);
      window.addEventListener('pointercancel', onEnd);
    });
  }

  // ---------- Lighting setups (nested bubble cards, in Visuals) ----------
  // Collapsible outlined card per setup (same visual pattern Talent used to
  // use before its own popup redesign) instead of the old single-field
  // checklist — each setup gets a name (the card's heading), plus
  // characteristics and a longer description.
  let currentLightingSetups = [];

  function lightingSetupCollapseKey(setup) {
    return `shoot:${currentShootId}:lightingSetup:${setup.id}`;
  }

  // Grouped by name across every shoot's lightingSetups, most-recent shoot's
  // version winning ties — same "most recent wins" shape as
  // getAllPastTalents/getLastLocationDirections, just without lead-count
  // tiering since setups aren't ranked, only deduped.
  function getPastLightingSetups() {
    const sampleDates = {};
    const samples = {};
    const dismissed = new Set(state.dismissedLightingSetupKeys);
    state.shoots.forEach(s => {
      (s.lightingSetups || []).forEach(item => {
        if (!hasText(item.name)) return;
        const key = item.name.trim().toLowerCase();
        if (dismissed.has(key)) return;
        const d = s.date || '';
        if (!(key in sampleDates) || d > sampleDates[key]) {
          sampleDates[key] = d;
          samples[key] = item;
        }
      });
    });
    return Object.keys(samples)
      .sort((a, b) => samples[a].name.localeCompare(samples[b].name))
      .map(key => samples[key]);
  }

  // Typing (or just tapping into) a setup's name shows past setups sharing
  // this shoot's Visuals-section styling as a dropdown under the field —
  // picking one COPIES its name/characteristics/description in, a one-time
  // fill rather than the Talent popup's ongoing cross-shoot sync. Lighting
  // setups are far more likely than a person's identity to legitimately
  // vary shoot to shoot under the same name (a different room, different
  // gear), so silently keeping every past "Rembrandt lighting" in sync
  // would rewrite descriptions the user never touched.
  function updateLightingSetupSuggestions(idx, input) {
    const wrap = input.closest('.lighting-setup-name-wrap');
    const box = wrap.querySelector('.lighting-setup-suggestions');
    const card = input.closest('.lighting-setup-card');
    const query = input.value.trim().toLowerCase();
    const ownId = currentLightingSetups[idx].id;
    const matches = getPastLightingSetups()
      // Autosave can land mid-typing, which briefly puts THIS setup's own
      // in-progress name into state.shoots — without this it would then
      // suggest itself back to whoever's still typing it.
      .filter(item => item.id !== ownId)
      .filter(item => !query || item.name.toLowerCase().includes(query));
    if (!matches.length) {
      box.hidden = true;
      card.classList.remove('lighting-setup-suggestions-open');
      return;
    }
    // Manage leads the list, and every match is listed (the box scrolls past
    // its max-height) rather than a capped handful with Manage buried last.
    box.innerHTML = '<button type="button" class="lighting-setup-suggestion lighting-setup-suggestion-manage">Manage saved…</button>'
      + matches.map((item, i) => `
      <button type="button" class="lighting-setup-suggestion" data-idx="${idx}" data-match="${i}">${escapeHtml(item.name)}</button>
    `).join('');
    box.querySelectorAll('.lighting-setup-suggestion:not(.lighting-setup-suggestion-manage)').forEach((btn, i) => {
      // mousedown (not click) fires before the field's blur, so the copy
      // lands before blur's own handler hides this dropdown out from
      // under it — preventDefault keeps focus on the field throughout.
      btn.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const picked = matches[i];
        currentLightingSetups[idx].name = picked.name || '';
        currentLightingSetups[idx].characteristics = picked.characteristics || '';
        currentLightingSetups[idx].description = picked.description || '';
        renderLightingSetups();
        scheduleShootAutosave();
      });
    });
    box.querySelector('.lighting-setup-suggestion-manage').addEventListener('mousedown', (e) => {
      e.preventDefault();
      openManageLightingSetupsModal();
    });
    box.hidden = false;
    card.classList.add('lighting-setup-suggestions-open');
  }

  // Same non-destructive "dismiss" pattern as Manage Locations — deleting
  // here only hides a name from future suggestions (dismissedLightingSetup-
  // Keys), it never touches any shoot's own lightingSetups array.
  function renderManageLightingSetupsList() {
    const samples = getPastLightingSetups();
    const container = document.getElementById('manageLightingSetupsList');
    if (!samples.length) {
      container.innerHTML = '<p class="empty-hint">No saved lighting setups yet.</p>';
      return;
    }
    container.innerHTML = samples.map((item, idx) => `
      <div class="manage-location-row">
        <span>${escapeHtml(item.name)}</span>
        <button type="button" class="delete-manage-location" data-idx="${idx}"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
      </div>
    `).join('');
    container.querySelectorAll('.delete-manage-location').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = samples[Number(btn.dataset.idx)];
        if (!item) return;
        const key = item.name.trim().toLowerCase();
        if (!state.dismissedLightingSetupKeys.includes(key)) state.dismissedLightingSetupKeys.push(key);
        saveState();
        renderManageLightingSetupsList();
        // Unlike the other three "manage saved" lists, this one opens from a
        // transient typeahead rather than a persistent select still sitting
        // open behind it — but that typeahead's field never lost focus (see
        // updateLightingSetupSuggestions' preventDefault), so its box is
        // still showing whatever it last rendered, dismissed entry and all.
        // Hiding it here avoids a stale delete offer; it rebuilds correctly
        // on the field's next input/focus.
        document.querySelectorAll('.lighting-setup-suggestions').forEach(box => { box.hidden = true; });
      });
    });
  }

  function openManageLightingSetupsModal() {
    renderManageLightingSetupsList();
    document.getElementById('manageLightingSetupsOverlay').hidden = false;
  }

  function closeLightingSuggestions() {
    document.querySelectorAll('#lightingSetupsItems .lighting-setup-suggestions').forEach(box => { box.hidden = true; });
    document.querySelectorAll('#lightingSetupsItems .lighting-setup-suggestions-open')
      .forEach(card => card.classList.remove('lighting-setup-suggestions-open'));
  }

  // The part of the modal a dragged card can actually be seen in: below the
  // sticky header, above the sticky Save bar, and above the iOS keyboard.
  function lightingDragScrollBounds(modalEl) {
    const m = modalEl.getBoundingClientRect();
    const header = modalEl.querySelector('.shoot-modal-header');
    const actions = modalEl.querySelector('.modal-actions');
    const vv = window.visualViewport;
    return {
      top: Math.max(m.top, header ? header.getBoundingClientRect().bottom : m.top),
      bottom: Math.min(m.bottom, actions ? actions.getBoundingClientRect().top : m.bottom, vv ? vv.offsetTop + vv.height : m.bottom),
    };
  }

  // The same, for a lighting list borrowed onto a new-shoot wizard slide:
  // the card body's own visible box, still capped above the iOS keyboard.
  function wizardBodyDragBounds(body) {
    const r = body.getBoundingClientRect();
    const vv = window.visualViewport;
    return {
      top: r.top,
      bottom: Math.min(r.bottom, vv ? vv.offsetTop + vv.height : r.bottom),
    };
  }

  function commitLightingReorder(cards) {
    // The modal was closed mid-drag: closeShootModal already saved the old order.
    if (shootModalOverlay.hidden) return;
    const container = document.getElementById('lightingSetupsItems');
    const scroller = shootListScroller(container);
    const savedScrollTop = scroller ? scroller.scrollTop : undefined;
    // Each card's data-idx is its PRE-drag index (renderLightingSetups stamps
    // it), so DOM order maps straight back onto the array. The SAME setup
    // objects are reused, so every id (and the collapsed state keyed by it)
    // follows its card.
    const reordered = cards.map(c => currentLightingSetups[Number(c.dataset.idx)]);
    if (reordered.length === currentLightingSetups.length && reordered.every(Boolean)) {
      currentLightingSetups = reordered;
      // Reordering fires no input event, so nothing else would save it.
      scheduleShootAutosave();
    }
    // Renumbers data-idx and the "Setup N" placeholders, and re-binds the
    // handlers that captured their index at render time.
    renderLightingSetups();
    restoreAfterListReorder(container, undefined, savedScrollTop);
  }

  function wireLightingDragHandle(handle) {
    const container = document.getElementById('lightingSetupsItems');
    const modalEl = shootModalOverlay.querySelector('.modal');
    wireRowDragReorder(handle, {
      container,
      rowSelector: '.lighting-setup-card',
      draggingClass: 'lighting-dragging',
      // Getters rather than fixed values: the list may be on the page
      // (scrolling in the modal, between its sticky header and Save bar) or
      // borrowed onto a new-shoot wizard slide (scrolling in the card), and
      // wireRowDragReorder reads `el` on every grab and bounds() every tick.
      // Left pointing at the modal, a drag in the card would auto-scroll the
      // covered page behind it and fold that scroll into the dragged row.
      scroll: {
        get el() { return shootListScroller(container); },
        bounds: () => {
          const wizardBody = container.closest('#shootWizardBody');
          return wizardBody ? wizardBodyDragBounds(wizardBody) : lightingDragScrollBounds(modalEl);
        },
      },
      onStart: () => {
        // On iOS tapping a button never blurs a focused field, and a swap
        // would move that field mid-drag (dropping the keyboard at a random
        // moment) — so blur it now, which also hides its open suggestions.
        const active = document.activeElement;
        if (active && active !== document.body && container.contains(active)) active.blur();
        closeLightingSuggestions();
      },
      onCommit: commitLightingReorder,
    });
  }

  function renderLightingSetups() {
    const container = document.getElementById('lightingSetupsItems');
    container.innerHTML = currentLightingSetups.map((item, idx) => {
      const collapsed = isSectionCollapsed(lightingSetupCollapseKey(item));
      return `
      <div class="team-member-card lighting-setup-card${collapsed ? ' lighting-setup-card-collapsed' : ''}" data-idx="${idx}">
        <div class="lighting-setup-card-bar">
          <button type="button" class="shot-drag-handle lighting-drag-handle" aria-label="Drag to reorder lighting setup" tabindex="-1">&#8942;</button>
          <div class="lighting-setup-name-wrap">
            <input type="text" class="lighting-setup-name" data-idx="${idx}" placeholder="Setup ${idx + 1}" aria-label="Lighting setup ${idx + 1} name" value="${escapeHtml(item.name || '')}" autocomplete="off" />
            <div class="lighting-setup-suggestions" hidden></div>
          </div>
          <button type="button" class="lighting-setup-collapse-toggle" data-idx="${idx}" aria-label="Collapse lighting setup" aria-expanded="${collapsed ? 'false' : 'true'}">
            ${COLLAPSE_ARROW_SVG}
          </button>
          <button type="button" class="delete-lighting-setup" data-idx="${idx}"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
        </div>
        <div class="lighting-setup-card-body"${collapsed ? ' hidden' : ''}>
          <input type="text" class="lighting-setup-characteristics" data-idx="${idx}" placeholder="mood, quality, style, etc." aria-label="Characteristics" value="${escapeHtml(item.characteristics || '')}" />
          <textarea class="lighting-setup-description" data-idx="${idx}" rows="2" placeholder="Describe the setup." aria-label="Description">${escapeHtml(item.description || '')}</textarea>
        </div>
      </div>
    `;
    }).join('');

    container.querySelectorAll('.lighting-setup-description').forEach(autoSizeTextarea);

    container.querySelectorAll('.lighting-setup-collapse-toggle').forEach(btn => {
      btn.addEventListener('click', () => {
        const setup = currentLightingSetups[Number(btn.dataset.idx)];
        if (!setup) return;
        const key = lightingSetupCollapseKey(setup);
        setSectionCollapsed(key, !isSectionCollapsed(key));
        renderLightingSetups();
        // Collapsing alone doesn't touch a form field, so nothing else would
        // autosave — same reasoning (and same fix) as the talent collapse
        // toggle: a setup saved before it had an id needs this to persist
        // the one just minted on load, or the collapse key it's hanging off
        // of is orphaned by the next reopen's fresh id.
        scheduleShootAutosave();
      });
    });
    container.querySelectorAll('.delete-lighting-setup').forEach(btn => {
      btn.addEventListener('click', () => {
        currentLightingSetups.splice(Number(btn.dataset.idx), 1);
        renderLightingSetups();
        scheduleShootAutosave();
      });
    });
    container.querySelectorAll('.lighting-setup-name').forEach(input => {
      const idx = Number(input.dataset.idx);
      input.addEventListener('input', () => {
        currentLightingSetups[idx].name = input.value;
        updateLightingSetupSuggestions(idx, input);
      });
      // Focusing an empty field browses every past setup, same as tapping
      // open the Returning talent/team-member select — you shouldn't have
      // to already remember a name to find it.
      input.addEventListener('focus', () => updateLightingSetupSuggestions(idx, input));
      input.addEventListener('blur', () => {
        input.closest('.lighting-setup-name-wrap').querySelector('.lighting-setup-suggestions').hidden = true;
        input.closest('.lighting-setup-card').classList.remove('lighting-setup-suggestions-open');
      });
      input.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        input.blur();
      });
    });
    container.querySelectorAll('.lighting-setup-characteristics').forEach(input => {
      input.addEventListener('input', () => {
        currentLightingSetups[Number(input.dataset.idx)].characteristics = input.value;
      });
    });
    container.querySelectorAll('.lighting-setup-description').forEach(textarea => {
      textarea.addEventListener('input', () => {
        currentLightingSetups[Number(textarea.dataset.idx)].description = textarea.value;
        autoSizeTextarea(textarea);
      });
    });
    container.querySelectorAll('.lighting-drag-handle').forEach(wireLightingDragHandle);
    // The fields were just rebuilt, so they have no .is-filled class until
    // something re-syncs them (renderReferences does the same) — otherwise
    // every re-render, a reorder included, made filled fields look empty.
    // Only these fields: re-measuring every textarea in the form would briefly
    // shrink the long note boxes and could clamp the modal's scroll position.
    container.querySelectorAll('input, textarea').forEach(syncFieldFilledState);
  }

  document.getElementById('addLightingSetupBtn').addEventListener('click', () => {
    currentLightingSetups.push({ id: uid(), name: '', characteristics: '', description: '' });
    renderLightingSetups();
    // Same reasoning as +Add talent — focus the new card's name field so the
    // keyboard opens on the right box and the browser scrolls it into view.
    const cards = document.querySelectorAll('#lightingSetupsItems .lighting-setup-card');
    const newField = cards.length ? cards[cards.length - 1].querySelector('.lighting-setup-name') : null;
    if (newField) {
      newField.scrollIntoView({ block: 'center', behavior: 'smooth' });
      newField.focus();
    }
    scheduleShootAutosave();
  });

  // ---------- Location (popup with name/street/city/zip/country + past locations) ----------
  let currentShootLocation = { name: '', street: '', city: '', state: '', zip: '', country: '' };
  let pastLocationSamples = [];

  function updateLocationBtnDisplay() {
    const btn = document.getElementById('shootLocationBtn');
    const loc = currentShootLocation;
    // Country alone doesn't count as real content — it's just the
    // pre-filled default (see state.defaultCountry), not something the
    // user actually entered, so it shouldn't show up as a location preview.
    const hasRealContent = hasText(loc.name) || hasText(loc.street) || hasText(loc.city) || hasText(loc.state) || hasText(loc.zip);
    const display = hasRealContent ? formatLocationDisplay(loc) : '';
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
    const dismissed = new Set(state.dismissedLocationKeys);
    const today = todayStr();
    state.shoots.forEach(s => {
      // A country on its own is just the pre-filled default, not a location
      // anyone picked (same rule as updateLocationBtnDisplay).
      const loc = s.location;
      if (!loc || !['name', 'street', 'city', 'state', 'zip'].some(k => hasText(loc[k]))) return;
      const key = locationKey(loc);
      if (dismissed.has(key)) return;
      // Only a shoot still being planned counts its missing date as today: a
      // canceled/postponed one has had its date cleared, so it ranks last.
      const live = !s.archived && s.status !== 'canceled' && s.status !== 'rescheduled';
      const when = s.date || (live ? today : '');
      if (!(key in latest) || when >= latest[key]) {
        latest[key] = when;
        samples[key] = s.location;
      }
    });
    return Object.keys(latest)
      .sort((a, b) => latest[b].localeCompare(latest[a]) || formatLocationDisplay(samples[a]).localeCompare(formatLocationDisplay(samples[b])))
      .map(key => samples[key]);
  }

  // Whatever directions were entered the most recent time this exact
  // location was shot at (by shoot date; undated shoots sort last so they
  // only win if nothing else has directions on file) — lets picking a
  // known location bring its directions along automatically.
  function getLastLocationDirections(loc) {
    const key = locationKey(loc);
    const matches = state.shoots.filter(s => s.location && locationKey(s.location) === key && hasText(s.locationDirections));
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
    pastLocationSamples = getAllPastLocations();
    const select = document.getElementById('pastLocationsSelect');
    select.innerHTML = '<option value="">Select a past location…</option>'
      + pastLocationSamples.map((loc, i) => `<option value="${i}">${escapeHtml(formatLocationDisplay(loc))}</option>`).join('')
      + '<option value="__manage__">Manage locations…</option>';
  }

  function openLocationModal() {
    fillLocationForm(currentShootLocation);
    document.getElementById('locationStateInput').classList.remove('field-invalid');
    document.getElementById('locationStateError').hidden = true;
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
    const loc = pastLocationSamples[Number(e.target.value)];
    if (loc) fillLocationForm(loc);
  });

  document.getElementById('locationStateInput').addEventListener('input', (e) => {
    if (hasText(e.target.value)) {
      e.target.classList.remove('field-invalid');
      document.getElementById('locationStateError').hidden = true;
    }
  });

  document.getElementById('saveLocationBtn').addEventListener('click', () => {
    const stateInput = document.getElementById('locationStateInput');
    if (!hasText(stateInput.value)) {
      stateInput.classList.add('field-invalid');
      document.getElementById('locationStateError').hidden = false;
      return;
    }
    stateInput.classList.remove('field-invalid');
    document.getElementById('locationStateError').hidden = true;
    const newLocation = {
      name: document.getElementById('locationNameInput').value.trim(),
      street: document.getElementById('locationStreetInput').value.trim(),
      city: document.getElementById('locationCityInput').value.trim(),
      state: stateInput.value.trim(),
      zip: document.getElementById('locationZipInput').value.trim(),
      country: document.getElementById('locationCountryInput').value,
    };
    const oldKey = locationKey(currentShootLocation);
    const isChange = locationKey(newLocation) !== oldKey;
    currentShootLocation = newLocation;
    updateLocationBtnDisplay();
    // Only autofill on an actual change — re-saving the same location
    // shouldn't clobber directions the user may have just edited by hand.
    if (isChange && !isLocationBlank(newLocation)) {
      const lastDirections = getLastLocationDirections(newLocation);
      if (lastDirections) document.getElementById('shootLocationDirections').value = lastDirections;
    }
    // Remember whichever country gets set the first time ever — most
    // photographers mostly work in one country, so pre-filling it for every
    // new shoot going forward saves a repetitive pick.
    if (newLocation.country && !state.defaultCountry) state.defaultCountry = newLocation.country;
    document.getElementById('locationModalOverlay').hidden = true;
    scheduleShootAutosave();
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
        <span>${escapeHtml(formatLocationDisplay(loc))}</span>
        <button type="button" class="delete-manage-location" data-idx="${idx}"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
      </div>
    `).join('');
    container.querySelectorAll('.delete-manage-location').forEach(btn => {
      btn.addEventListener('click', () => {
        const loc = samples[Number(btn.dataset.idx)];
        if (!loc) return;
        const key = locationKey(loc);
        if (!state.dismissedLocationKeys.includes(key)) state.dismissedLocationKeys.push(key);
        saveState();
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

  // ---------- References (dynamic list of external links) ----------
  let currentReferences = [];

  function renderReferences() {
    const container = document.getElementById('referencesList');
    container.innerHTML = currentReferences.map((url, idx) => `
      <div class="reference-row">
        <input type="text" class="reference-input" data-idx="${idx}" value="${escapeHtml(url)}" placeholder="https://…" />
        <button type="button" class="reference-open" data-idx="${idx}" aria-label="Open link">&#8599;</button>
        <button type="button" class="delete-reference" data-idx="${idx}"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
      </div>
    `).join('');

    container.querySelectorAll('.reference-input').forEach(input => {
      input.addEventListener('input', () => {
        currentReferences[Number(input.dataset.idx)] = input.value;
      });
    });
    container.querySelectorAll('.reference-open').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = (currentReferences[Number(btn.dataset.idx)] || '').trim();
        if (!url) return;
        window.open(/^https?:\/\//i.test(url) ? url : `https://${url}`, '_blank', 'noopener');
      });
    });
    container.querySelectorAll('.delete-reference').forEach(btn => {
      btn.addEventListener('click', () => {
        currentReferences.splice(Number(btn.dataset.idx), 1);
        renderReferences();
        scheduleShootAutosave();
      });
    });
    syncAllShootFormFields();
  }

  document.getElementById('addReferenceBtn').addEventListener('click', () => {
    currentReferences.push('');
    renderReferences();
    scheduleShootAutosave();
  });

  // ---------- Time range (default end time to 2h after start) ----------
  // The step="1800" attribute keeps a native wheel/spinner picker to :00/:30
  // stops, but a typed-in value (desktop keyboard entry, or a pasted value)
  // can still land off-step — rounding here on commit guarantees the shoot
  // never actually saves an odd time like 2:43 regardless of how it was entered.
  function roundToNearestHalfHour(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const totalMinutes = ((Math.round((h * 60 + m) / 30) * 30) + 1440) % 1440;
    return `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;
  }

  document.getElementById('shootStartTime').addEventListener('change', () => {
    const startInput = document.getElementById('shootStartTime');
    const endInput = document.getElementById('shootEndTime');
    if (!startInput.value) return;
    startInput.value = roundToNearestHalfHour(startInput.value);
    const [h, m] = startInput.value.split(':').map(Number);
    const endH = (h + 2) % 24;
    endInput.value = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  });

  document.getElementById('shootEndTime').addEventListener('change', () => {
    const endInput = document.getElementById('shootEndTime');
    if (!endInput.value) return;
    endInput.value = roundToNearestHalfHour(endInput.value);
  });

  // Video-only call times (crew/talent) snap to :00/:30 the same way.
  ['shootCrewCallTime', 'shootTalentCallTime'].forEach(id => {
    document.getElementById(id).addEventListener('change', () => {
      const input = document.getElementById(id);
      if (!input.value) return;
      input.value = roundToNearestHalfHour(input.value);
    });
  });

  // ---------- Tiered concept fields (narrative vs commercial categories) ----------
  const COMMERCIAL_TIER_CATEGORIES = ['commercial', 'video', 'lighting_test', 'headshot', 'event'];

  function updateCategoryTierUI() {
    const category = document.getElementById('shootCategory').value;
    const isCommercialTier = COMMERCIAL_TIER_CATEGORIES.includes(category);
    document.getElementById('narrativeFieldsBlock').hidden = isCommercialTier;
    document.getElementById('shootPremiseLabelText').textContent = isCommercialTier ? 'Concept (if applicable)' : 'Concept';
    // Video-only fields: Deliverables (Direction) and Crew/Talent call times
    // (Logistics). Hiding never clears them, so flipping away from Video and
    // back keeps whatever was filled in.
    const isVideo = isVideoCategory(category);
    const deliverablesBlock = document.getElementById('videoDeliverablesBlock');
    deliverablesBlock.hidden = !isVideo;
    document.getElementById('videoCallTimesRow').hidden = !isVideo;
    if (isVideo) deliverablesBlock.querySelectorAll('input, textarea').forEach(syncFieldFilledState);
  }

  document.getElementById('shootCategory').addEventListener('change', updateCategoryTierUI);

  // Video swaps "Mood board" for "Storyboard" and has no Final images (the
  // section's hidden, never cleared — flipping back to a photo category
  // brings any images uploaded before the switch right back).
  function updateVideoCategoryUI() {
    const category = document.getElementById('shootCategory').value;
    document.getElementById('moodboardSectionLabel').textContent = moodboardTerm(category);
    updateMoodboardCompleteLabel();
    document.getElementById('finalImagesSection').hidden = isVideoCategory(category);
  }

  document.getElementById('shootCategory').addEventListener('change', updateVideoCategoryUI);

  // ---------- Progressive reveal (new-shoot onboarding only) ----------
  // Only the Direction fields still gate behind a prompt, since which ones
  // show depends on the chosen category. Logistics/Visuals/Shoot-day notes
  // are always present once their bubble is expanded — no separate reveal.
  function revealSection2() {
    document.getElementById('formSection2').hidden = false;
    document.getElementById('categoryContinuePrompt').hidden = true;
  }

  document.getElementById('shootCategory').addEventListener('change', () => {
    if (document.getElementById('shootCategory').value) revealSection2();
  });

  function initProgressiveReveal(s) {
    const isNewShoot = !s;
    if (!isNewShoot || document.getElementById('shootCategory').value) {
      revealSection2();
    } else {
      document.getElementById('formSection2').hidden = true;
      document.getElementById('categoryContinuePrompt').hidden = false;
    }
  }

  // ---------- Shoot form section bubbles (Logistics/Direction/Visuals/Shoot-day
  // notes, plus the Shot list sub-section) — collapse state is shared across
  // every shoot, same as the Overview/Shoots tab collapsible headings.
  const SHOOT_FORM_COLLAPSE_SECTIONS = [
    ['shoot:basicInfo', '#basicInfoHeading', 'basicInfoBody'],
    ['shoot:logistics', '#logisticsHeading', 'logisticsBody'],
    ['shoot:team', '#teamHeading', 'teamBody'],
    ['shoot:direction', '#directionHeading', 'directionBody'],
    ['shoot:visuals', '#visualsHeading', 'visualsBody'],
    ['shoot:lightingSetups', '#lightingSetupsHeading', 'lightingSetupsBody'],
    // Keyed 'shoot:shootDayNotes' rather than 'shoot:shotList': this IS the old
    // Shoot day section, renamed once its only remaining content was the shot
    // list. Keeping the key means an existing fold state still applies to it.
    ['shoot:shootDayNotes', '#shotListHeading', 'shotListBody'],
    ['shoot:postShoot', '#postShootHeading', 'postShootBody'],
  ];

  // Any auto-sized textarea measured while its section was collapsed reports
  // zero height and keeps the one-line/rows-default size — true for the shot
  // list and lighting setups (handled below), but just as true for every
  // other collapsible section's own readonly notes fields (Location
  // directions, Character, Concept, Talent/Team directions, etc.): a shoot
  // opened with, say, Logistics collapsed leaves Location directions stuck
  // too short once Logistics is expanded, cutting its text off, since
  // nothing else ever re-measures it. Every path that reveals a section runs
  // this so everything inside gets its real height the moment it's actually
  // on screen. Idempotent, so calling it broadly is fine.
  function onShootSectionRevealed(bodyId) {
    if (bodyId === 'shotListBody' || bodyId === 'lightingSetupsBody') autoSizeAllListTextareas();
    const body = document.getElementById(bodyId);
    if (body) body.querySelectorAll('textarea').forEach(syncFieldFilledState);
  }

  function applyShootFormCollapseState() {
    SHOOT_FORM_COLLAPSE_SECTIONS.forEach(([key, headingSelector, bodyId]) => {
      const heading = document.querySelector(headingSelector);
      const body = document.getElementById(bodyId);
      const collapsed = isSectionCollapsed(key);
      body.hidden = collapsed;
      heading.classList.toggle('collapsed', collapsed);
      if (!collapsed) onShootSectionRevealed(bodyId);
    });
  }

  SHOOT_FORM_COLLAPSE_SECTIONS.forEach(([key, headingSelector, bodyId]) => {
    const heading = document.querySelector(headingSelector);
    const body = document.getElementById(bodyId);
    heading.addEventListener('click', () => {
      const nowCollapsed = !body.hidden;
      setSectionCollapsed(key, nowCollapsed);
      body.hidden = nowCollapsed;
      heading.classList.toggle('collapsed', nowCollapsed);
      if (!nowCollapsed) onShootSectionRevealed(bodyId);
    });
  });

  // ---------- Expand field (every notes-style textarea in the shoot form) ----------
  // These fields are readonly on the small form; tapping one opens a bigger
  // writing surface in a modal instead of typing directly in the compressed box.
  const EXPAND_FIELD_LABELS = {
    shootCharacter: 'Character/Personality',
    shootWorldNotes: 'World-building notes',
    shootGoals: 'Shoot goals',
    shootElevatorPitch: 'Elevator pitch',
    shootWentRight: 'What went right',
    shootCouldBeBetter: "What could've gone better",
    shootLessonsLearned: 'Lessons for next time',
    shootTalentDirections: 'Directions for talent',
    shootTeamDirections: 'Directions for team',
    shootShootingNotes: 'Shooting notes',
    shootLocationDirections: 'Location directions',
    shootDeliverables: 'Deliverables',
  };
  let expandFieldOnSave = null;

  function expandFieldLabel(fieldId) {
    if (fieldId === 'shootPremise') return document.getElementById('shootPremiseLabelText').textContent;
    return EXPAND_FIELD_LABELS[fieldId] || '';
  }

  // Accepts either a field id (the main form's own readonly fields — reads
  // label/value/placeholder/maxLength off that field, and writes back +
  // re-dispatches 'input' so the field's own listener persists it) or a
  // {title, value, placeholder, maxLength, onSave} config for callers with
  // no backing DOM field to read from, like Shoot Mode's Quick review —
  // those write straight to the shoot object themselves, same as
  // everything else in Shoot Mode does.
  function openExpandField(fieldIdOrConfig) {
    let config;
    if (typeof fieldIdOrConfig === 'string') {
      const field = document.getElementById(fieldIdOrConfig);
      config = {
        title: expandFieldLabel(fieldIdOrConfig),
        value: field.value,
        placeholder: field.placeholder,
        maxLength: field.maxLength,
        onSave: (newValue) => {
          field.value = newValue;
          // The readonly field is what's visible on the main form once this
          // popup closes — it should always read from the start of what was
          // written, not wherever the popup's own cursor/scroll happened to
          // be sitting.
          field.scrollTop = 0;
          field.dispatchEvent(new Event('input', { bubbles: true }));
        },
      };
    } else {
      config = fieldIdOrConfig;
    }
    expandFieldOnSave = config.onSave;
    document.getElementById('expandFieldTitle').textContent = config.title;
    const textarea = document.getElementById('expandFieldTextarea');
    textarea.value = config.value || '';
    textarea.maxLength = config.maxLength || 2000;
    textarea.placeholder = config.placeholder || '';
    document.getElementById('expandFieldOverlay').hidden = false;
    // Deferred a frame: focusing (which opens the keyboard) in the same tick
    // as un-hiding gives the browser no chance to lay out the now-visible
    // modal first, which is one way the keyboard-open/scroll-into-view
    // behavior it triggers can end up positioning this popup off-screen.
    requestAnimationFrame(() => textarea.focus());
  }

  function closeExpandField() {
    document.getElementById('expandFieldOverlay').hidden = true;
    expandFieldOnSave = null;
  }

  document.getElementById('expandFieldTextarea').addEventListener('input', () => {
    if (expandFieldOnSave) expandFieldOnSave(document.getElementById('expandFieldTextarea').value);
  });

  document.getElementById('expandFieldCloseBtn').addEventListener('click', closeExpandField);
  document.getElementById('expandFieldOkBtn').addEventListener('click', closeExpandField);
  document.getElementById('expandFieldOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('expandFieldOverlay')) closeExpandField();
  });

  [
    'shootPremise', 'shootCharacter', 'shootWorldNotes', 'shootGoals',
    'shootElevatorPitch',
    'shootWentRight', 'shootCouldBeBetter', 'shootLessonsLearned',
    'shootTalentDirections', 'shootTeamDirections', 'shootLocationDirections',
    'shootShootingNotes', 'shootDeliverables',
  ].forEach(fieldId => {
    document.getElementById(fieldId).addEventListener('click', (e) => {
      // Not readonly right now = borrowed onto a new-shoot wizard slide,
      // which has the room to type in place (see moveBlockIntoShootWizard).
      if (!e.currentTarget.readOnly) return;
      openExpandField(fieldId);
    });
  });

  // ---------- Post-shoot reflection (gated behind captured-or-later status) ----------
  let previousStatusValue = 'prospect';
  // The status swap the last category flip made ({ from, to }), so flipping
  // the category straight back restores the original status (a mis-tap on
  // the category dropdown stays lossless). Reset per modal open.
  let categoryRemap = null;

  function isPostCaptureStatus(status) {
    // Postponed (key: rescheduled)/canceled are an off-track branch, not a step further along
    // the capture pipeline, regardless of where they sit in STATUS_LABELS.
    // Must agree with POST_CAPTURE_STATUSES; the video edit keys sit between
    // captured and delivered in STATUS_LABELS for this reason.
    if (status === 'rescheduled' || status === 'canceled') return false;
    const order = Object.keys(STATUS_LABELS);
    return order.indexOf(status) >= order.indexOf('captured');
  }

  function openPostShootPrompt() {
    document.getElementById('postShootPromptText').textContent = 'Complete post shoot reflection?';
    document.getElementById('postShootPromptActions').hidden = false;
    document.getElementById('postShootPromptDismissBtn').hidden = true;
    document.getElementById('postShootPromptOverlay').hidden = false;
  }

  // Reveals the Post-shoot Reflection section and forces it open, overriding
  // any stale collapse state left over from a different shoot (the collapse
  // flag isn't per-shoot, so a previously-collapsed shoot shouldn't cause a
  // newly-appearing section to render pre-collapsed).
  function showPostShootContentExpanded() {
    const content = document.getElementById('postShootContent');
    content.hidden = false;
    setSectionCollapsed('shoot:postShoot', false);
    document.getElementById('postShootBody').hidden = false;
    document.getElementById('postShootHeading').classList.remove('collapsed');
    return content;
  }

  document.getElementById('postShootPromptYesBtn').addEventListener('click', () => {
    document.getElementById('postShootPromptOverlay').hidden = true;
    // "Yes" from the new-shoot wizard's first slide (a shoot being logged
    // after the fact) means "take me to the reflection now" — close the
    // wizard first so the scroll below lands on the page, not behind it.
    if (shootWizardActive) endShootWizard();
    const content = showPostShootContentExpanded();
    updateShootModalJumpMenuVisibility();
    content.scrollIntoView({ behavior: 'smooth', block: 'start' });
    maybeOpenDeadlinePrompt();
  });

  document.getElementById('postShootPromptLaterBtn').addEventListener('click', () => {
    showPostShootContentExpanded();
    updateShootModalJumpMenuVisibility();
    document.getElementById('postShootPromptText').textContent = "the post-shoot reflection questions will be at the bottom of this shoot whenever you're ready.";
    document.getElementById('postShootPromptActions').hidden = true;
    document.getElementById('postShootPromptDismissBtn').hidden = false;
  });

  document.getElementById('postShootPromptDismissBtn').addEventListener('click', () => {
    document.getElementById('postShootPromptOverlay').hidden = true;
    maybeOpenDeadlinePrompt();
  });

  // ---------- Add deadline prompt (shown once a shoot moves into the edit —
  // Editing, or any of a video's Rough cut/Client review/Revisions — without
  // a deadline set yet — chained after the post-shoot reflection
  // prompt when both apply, e.g. a shoot logged retroactively straight into
  // "editing", so the two never show stacked on top of each other). ----------
  function openDeadlinePrompt() {
    document.getElementById('deadlinePromptDateInput').value = '';
    document.getElementById('deadlinePromptOverlay').hidden = false;
  }

  function maybeOpenDeadlinePrompt() {
    if (isInTheEditStatus(document.getElementById('shootStatus').value) && !hasText(document.getElementById('shootDeadline').value)) {
      openDeadlinePrompt();
    }
  }

  document.getElementById('deadlinePromptOkBtn').addEventListener('click', () => {
    const dateValue = document.getElementById('deadlinePromptDateInput').value;
    document.getElementById('deadlinePromptOverlay').hidden = true;
    if (dateValue) {
      document.getElementById('shootDeadline').value = dateValue;
      scheduleShootAutosave();
    }
  });

  document.getElementById('deadlinePromptNotNowBtn').addEventListener('click', () => {
    document.getElementById('deadlinePromptOverlay').hidden = true;
    showToast('You can add a deadline anytime from Basic Info.');
  });

  // Shoot mode only makes sense once a shoot has a shot list and mood board
  // worth working from and a day it's actually happening — "Shoot ready" is the
  // one status that means both. Re-run on every status change (not just on
  // load), since flipping the swatch while the modal is open is the normal way
  // a shoot reaches that status in the first place. An archived shoot gets
  // Archive mode's button in this exact same spot instead — the two are
  // mutually exclusive, so Shoot mode is also hidden once archived even on
  // the off chance a shoot got archived without ever reaching "Shoot ready".
  function updateEnterShootModeBtnVisibility() {
    const status = document.getElementById('shootStatus').value;
    const shoot = editingShootId ? state.shoots.find(s => s.id === editingShootId) : null;
    const isArchived = !!(shoot && shoot.archived);
    document.getElementById('enterShootModeBtn').hidden = !editingShootId || isArchived || status !== 'waiting_to_shoot';
    document.getElementById('enterArchiveModeBtn').hidden = !editingShootId || !isArchived;
  }

  document.getElementById('shootStatus').addEventListener('change', (e) => {
    const newValue = e.target.value;

    // Postponed (key: rescheduled)/canceled shoots no longer have a date to keep — clear it
    // in the form itself so the very next autosave doesn't resurrect it.
    if (newValue === 'rescheduled' || newValue === 'canceled') {
      document.getElementById('shootDate').value = '';
      document.getElementById('shootStartTime').value = '';
      document.getElementById('shootEndTime').value = '';
      document.getElementById('shootCrewCallTime').value = '';
      document.getElementById('shootTalentCallTime').value = '';
    }

    const wasPostCapture = isPostCaptureStatus(previousStatusValue);
    const isPostCapture = isPostCaptureStatus(newValue);

    if (isPostCapture && !wasPostCapture) {
      previousStatusValue = newValue;
      openPostShootPrompt();
    } else if (wasPostCapture && !isPostCapture) {
      const confirmed = confirm("Reverting to an earlier status will clear any post-shoot reflection responses you've filled out. Continue?");
      if (confirmed) {
        document.getElementById('shootWentRight').value = '';
        document.getElementById('shootCouldBeBetter').value = '';
        document.getElementById('shootLessonsLearned').value = '';
        document.getElementById('postShootContent').hidden = true;
        updateShootModalJumpMenuVisibility();
        previousStatusValue = newValue;
        scheduleShootAutosave();
      } else {
        e.target.value = previousStatusValue;
      }
    } else {
      // Only on entering the edit bucket: a video stepping Rough cut ->
      // Client review -> Revisions shouldn't re-ask at every step.
      const wasInTheEdit = isInTheEditStatus(previousStatusValue);
      previousStatusValue = newValue;
      if (isInTheEditStatus(newValue) && !wasInTheEdit) maybeOpenDeadlinePrompt();
    }

    const isArchived = !document.getElementById('unarchiveShootBtn').hidden;
    document.getElementById('completeShootBtn').hidden = !editingShootId || isArchived || document.getElementById('shootStatus').value !== 'delivered';
    updateMoodboardCompleteVisibility();
    updateStatusSwatchDisplay();
    updateEnterShootModeBtnVisibility();
  });

  // ---------- Category -> status options (video has its own edit steps) ----------
  // Flipping a shoot to or from Video rebuilds the status select for the new
  // category and swaps a category-specific status for its nearest equivalent
  // (Waiting for selects/Editing -> Rough cut; Rough cut/Client review/
  // Revisions -> Editing), so the select never goes blank. Both sides of
  // every swap are post-capture, so no reflection prompt/confirm is involved.
  // Flipping straight back restores the original status (see categoryRemap).
  function syncStatusSelectToCategory() {
    const category = document.getElementById('shootCategory').value;
    const current = document.getElementById('shootStatus').value || previousStatusValue || 'prospect';
    // Looked up fresh: autosaveShoot replaces the shoot object on every save.
    const live = state.shoots.find(x => x.id === currentShootId);
    let next = remapStatusForCategory(current, category);
    if (categoryRemap && current === categoryRemap.to && remapStatusForCategory(categoryRemap.from, category) === categoryRemap.from) {
      next = categoryRemap.from;
      // The flip's save may have stamped an edit-start date (Waiting for
      // selects -> Rough cut counts as entering the edit). Flipping straight
      // back puts it back how it was, so a mis-tap doesn't start the weekly
      // editing check-in clock early. The next autosave writes it.
      if (live) {
        if (categoryRemap.editingAt) live.editingAt = categoryRemap.editingAt;
        else delete live.editingAt;
      }
    }
    if (next !== current) categoryRemap = { from: current, to: next, editingAt: live ? live.editingAt : undefined };
    renderShootStatusSelectOptions(category, next);
    previousStatusValue = next;
    updateStatusSwatchDisplay();
  }

  document.getElementById('shootCategory').addEventListener('change', syncStatusSelectToCategory);

  function updateMoodboardCompleteLabel() {
    const checked = document.getElementById('shootMoodboardComplete').checked;
    const term = moodboardTerm(document.getElementById('shootCategory').value);
    document.getElementById('moodboardCompleteLabel').textContent = `${term} complete or not required${checked ? '' : '?'}`;
  }

  // Past capture, the mood board is moot — hide the checkbox entirely rather
  // than let it keep tracking a value nobody's looking at anymore. Same for
  // canceled/postponed (key: rescheduled), an off-track branch rather than a step further
  // along (isPostCaptureStatus alone doesn't cover those — see its own
  // comment). The value itself is never touched here, so reverting to an
  // earlier status brings the row (and whatever it was actually set to)
  // right back.
  function updateMoodboardCompleteVisibility() {
    const status = document.getElementById('shootStatus').value;
    document.getElementById('moodboardCompleteRow').hidden =
      isPostCaptureStatus(status) || status === 'canceled' || status === 'rescheduled';
  }

  document.getElementById('shootMoodboardComplete').addEventListener('change', updateMoodboardCompleteLabel);

  function updateTeamFinalizedLabel() {
    const checked = document.getElementById('shootTeamFinalized').checked;
    document.getElementById('teamFinalizedLabel').textContent = checked ? 'Team finalized' : 'Team finalized?';
  }

  document.getElementById('shootTeamFinalized').addEventListener('change', updateTeamFinalizedLabel);

  // ---------- Shoot modal ----------
  const shootModalOverlay = document.getElementById('shootModalOverlay');
  const shootForm = document.getElementById('shootForm');
  let editingShootId = null;
  let currentShootId = null;
  let pendingProjectPhoto = null;
  let shootHasImages = false;
  let shootSaveTimer = null;
  const shootScrollPositions = {};
  let shootModalBaseTitle = '';
  // New-shoot planning wizard (see SHOOT_WIZARD_STEPS). Tracked by its own
  // flag rather than by editingShootId === null: Multi-day's "Create days"
  // saves a brand-new draft mid-wizard, which flips that to the shoot's id.
  let shootWizardActive = false;
  let shootWizardStepKey = null;
  let shootWizardMoved = [];          // { el, placeholder, wasHidden, unhid, unlocked } per borrowed block
  let shootWizardPendingId = null;    // shoot a queued wizard is waiting to open over
  let shootWizardStartTimer = null;
  let shootWizardViewportMaxH = 0;    // tallest visible height seen this run — the keyboard yardstick

  // Shared by the scroll-position-restore anchors below, the jump menu, and
  // the scrollspy title — the one canonical list of top-level sections in
  // the form, in on-page order.
  const SHOOT_MODAL_SECTIONS = [
    { id: 'basicInfoHeading', label: 'Basic Info' },
    { id: 'logisticsHeading', label: 'Logistics' },
    { id: 'teamHeading', label: 'Team' },
    { id: 'directionHeading', label: 'Direction' },
    { id: 'visualsHeading', label: 'Visuals' },
    { id: 'shotListHeading', label: 'Shot list' },
    { id: 'postShootHeading', label: 'Reflection' },
  ];

  // The only prominent section dividers in the form. Restoring scroll
  // snaps to whichever of these sits at or above the remembered position,
  // rather than landing mid-field, which would feel arbitrary. Anchors are
  // offset by the sticky header's height so the heading lands just below it
  // instead of hidden behind it.
  function shootModalSectionAnchors(container) {
    const anchors = [0];
    const containerRect = container.getBoundingClientRect();
    const header = document.querySelector('.shoot-modal-header');
    // Use the gap between the container's own top edge and the sticky
    // header's bottom edge, not just the header's own height — the modal
    // has top padding the header sits inside of, so headerOffset needs to
    // cover that too or the heading still lands partly behind the header.
    const headerOffset = header ? header.getBoundingClientRect().bottom - containerRect.top : 0;
    SHOOT_MODAL_SECTIONS.forEach(sec => {
      const el = document.getElementById(sec.id);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      const top = rect.top - containerRect.top + container.scrollTop - headerOffset;
      anchors.push(Math.max(0, top));
    });
    return anchors.sort((a, b) => a - b);
  }

  function snapScrollTarget(rawTarget, container) {
    let snapped = 0;
    shootModalSectionAnchors(container).forEach(a => {
      if (a <= rawTarget + 1) snapped = a;
    });
    return snapped;
  }

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
      shootModalOverlay.querySelector('.modal').scrollTo({ top: 0, behavior: 'smooth' });
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

  // ---------- Guided tour of the shoot page ----------
  // Steps through the same sections as the title jump-menu, one at a time,
  // scrolling to each and explaining what it's for.
  const SHOOT_TOUR_STEPS = [
    { id: 'basicInfoHeading', title: 'Basic Info', text: "Title, talent, status, and category — the foundation of the shoot." },
    { id: 'logisticsHeading', title: 'Logistics', text: 'Shoot date, deadline, time, and location — the when and where.' },
    { id: 'teamHeading', title: 'Team', text: "Who's on the shoot and how to reach them." },
    { id: 'directionHeading', title: 'Direction', text: "Concept, character, and creative direction — the story you're telling." },
    { id: 'visualsHeading', title: 'Visuals', text: () => `${moodboardTerm(document.getElementById('shootCategory').value)}, references, and frameworks — the visual language for the shoot.`, nestedIds: ['lightingSetupsHeading'] },
    { id: 'shotListHeading', title: 'Shot list', text: "Every shot you want to come away with — tap a line to write, Enter to start the next one, and tick them off as you go — plus notes for the day and what you'll be asking of the talent and the team." },
    { id: 'postShootHeading', title: 'Reflection', text: 'What went right, what could be better, and lessons for next time — filled in after the shoot.' },
  ];
  let shootTourStepIndex = 0;

  // Force-expands a collapsed section (and any of its nested sub-sections)
  // so the tour's explanation always has real content visible above it
  // instead of describing something the user can't currently see.
  function expandShootFormSection(headingId) {
    const entry = SHOOT_FORM_COLLAPSE_SECTIONS.find(([, headingSelector]) => headingSelector === `#${headingId}`);
    if (!entry) return;
    const [key, headingSelector, bodyId] = entry;
    const heading = document.querySelector(headingSelector);
    const body = document.getElementById(bodyId);
    if (!heading || !body) return;
    setSectionCollapsed(key, false);
    body.hidden = false;
    heading.classList.remove('collapsed');
    onShootSectionRevealed(bodyId);
  }

  function renderShootTourStep() {
    const step = SHOOT_TOUR_STEPS[shootTourStepIndex];
    document.getElementById('shootTourStep').textContent = `Step ${shootTourStepIndex + 1} of ${SHOOT_TOUR_STEPS.length}`;
    document.getElementById('shootTourTitle').textContent = step.title;
    document.getElementById('shootTourText').textContent = typeof step.text === 'function' ? step.text() : step.text;
    document.getElementById('shootTourBackBtn').hidden = shootTourStepIndex === 0;
    document.getElementById('shootTourNextBtn').textContent = shootTourStepIndex === SHOOT_TOUR_STEPS.length - 1 ? 'Done' : 'Next';
    expandShootFormSection(step.id);
    (step.nestedIds || []).forEach(expandShootFormSection);
    const target = document.getElementById(step.id);
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function closeShootTour() {
    document.getElementById('shootTourOverlay').hidden = true;
  }

  document.getElementById('shootTourBtn').addEventListener('click', () => {
    // Covered by the new-shoot wizard's backdrop, but still reachable by
    // keyboard focus — and the tour would scroll the page behind the wizard.
    if (shootWizardActive) return;
    closeShootModalJumpMenu();
    shootTourStepIndex = 0;
    document.getElementById('shootTourOverlay').hidden = false;
    renderShootTourStep();
  });

  document.getElementById('shootTourBackBtn').addEventListener('click', () => {
    if (shootTourStepIndex === 0) return;
    shootTourStepIndex--;
    renderShootTourStep();
  });

  document.getElementById('shootTourNextBtn').addEventListener('click', () => {
    if (shootTourStepIndex === SHOOT_TOUR_STEPS.length - 1) { closeShootTour(); return; }
    shootTourStepIndex++;
    renderShootTourStep();
  });

  document.getElementById('shootTourSkipBtn').addEventListener('click', closeShootTour);

  // ---------- New-shoot planning wizard ----------
  // A brand-new shoot opens with a step-by-step popup over the dimmed page —
  // a few fields per slide, like an installer, instead of the whole form at
  // once. Each slide BORROWS the real field blocks from the page: they're
  // moved into the card (a comment node keeps their spot — it has no box, so
  // it adds no stray flex gap) and moved straight back when the slide changes
  // or the wizard closes. Whatever's typed therefore lands in the real form:
  // autosave, the talent/location/team popups, the mood board, Multi-day and
  // every category-driven show/hide work untouched, and the page is already
  // filled in when the wizard's done. Only openShootModal(null) starts it —
  // existing shoots, "+ Add a day" copies and the rest never do.
  //
  // The markup sits inside #shootForm on purpose (the form-level input/
  // change/focusout listeners and the #shootForm field styles keep applying
  // to borrowed blocks), and every popup a slide can open is a later
  // body-level overlay, so it stacks above the wizard with no z-index work.
  //
  // Slides run in this order, so reordering them is reordering this list.
  //   key        stable id; the current slide is tracked by key because a
  //              category change on slide 1 adds/removes slides around it
  //   title      string, or a function read on every render
  //   hint       optional — a line under the title (string or function)
  //   blocks()   the page elements to borrow, resolved from field ids while
  //              they're back in place on the page
  //   when()     optional — the slide is skipped (and not counted) if false
  //   enter()/leave() optional — after the blocks move in / after they're back

  // Shorthand for the step list: a field by id, or the block around it.
  function shootWizardBlock(fieldId, selector) {
    const el = document.getElementById(fieldId);
    if (!el) return null;
    return selector ? el.closest(selector) : el;
  }

  function shootFieldHasText(fieldId) {
    return hasText(document.getElementById(fieldId).value);
  }

  // The framework tag groups are collapsible (and the fold is remembered),
  // but a slide that's only there to tick tags shouldn't open on a closed
  // heading — open while on the slide, then back to whatever's remembered
  // (including a fold the user tapped while on it, which the heading saves).
  function setShootWizardFrameworkGroupsOpen(forceOpen) {
    const selector = FRAMEWORK_TAG_CONTAINER_IDS.map(id => `#${id} .framework-subsection-body`).join(', ');
    document.querySelectorAll(selector).forEach(body => {
      const collapsed = !forceOpen && isSectionCollapsed(`shoot:framework:${body.dataset.fwBody}`);
      body.hidden = collapsed;
      const heading = body.parentElement.querySelector('.framework-heading');
      if (heading) heading.classList.toggle('collapsed', collapsed);
    });
  }

  const SHOOT_WIZARD_STEPS = [
    {
      key: 'basics',
      title: 'The basics',
      blocks: () => [
        shootWizardBlock('shootStatus', '.status-swatch-wrap'),
        shootWizardBlock('shootTitle', 'label'),
        shootWizardBlock('shootCategory', 'label'),
      ],
    },
    {
      key: 'talent',
      title: 'Talent',
      hint: "Who's in front of the camera? Add each person, with their handles and a photo if you have one.",
      blocks: () => [shootWizardBlock('addTalentBtn', '.talents-section')],
    },
    {
      key: 'when',
      title: 'Date & time',
      // Last day and the video call times keep showing/hiding themselves.
      blocks: () => [
        shootWizardBlock('shootDate', 'label'),
        shootWizardBlock('multiDayRow'),
        shootWizardBlock('multiDayLastDayLabel'),
        shootWizardBlock('shootStartTime', '.time-range-row'),
        shootWizardBlock('videoCallTimesRow'),
      ],
    },
    {
      key: 'location',
      title: 'Location',
      hint: "Where it's happening, and anything people need to know to find it.",
      blocks: () => [
        shootWizardBlock('shootLocationBtn', 'label'),
        shootWizardBlock('shootLocationDirections', 'label'),
      ],
    },
    {
      key: 'team',
      title: 'Team',
      hint: "Is anyone helping out? Add each person once you know who's on board.",
      blocks: () => [shootWizardBlock('teamBody')],
    },
    {
      key: 'goals',
      title: 'Goals',
      hint: () => (isVideoCategory(document.getElementById('shootCategory').value)
        ? "What the shoot needs to accomplish, and what you're delivering at the end."
        : 'What does this shoot need to accomplish?'),
      blocks: () => [
        shootWizardBlock('shootGoals', 'label'),
        shootWizardBlock('videoDeliverablesBlock'),
      ],
    },
    {
      key: 'idea',
      title: 'The idea',
      hint: 'The concept behind the shoot, then the whole thing in a single line.',
      blocks: () => [
        // Wizard-only: walks through a few questions and writes a concept.
        shootWizardBlock('conceptHelperBtn'),
        shootWizardBlock('shootPremise', 'label'),
        shootWizardBlock('shootElevatorPitch', 'label'),
      ],
    },
    {
      key: 'story',
      title: 'The story',
      hint: "Who the talent is being, and the world they're in.",
      blocks: () => [shootWizardBlock('narrativeFieldsBlock')],
      // Narrative categories only — the same switch that shows these fields
      // on the page (updateCategoryTierUI), where a blank category counts as
      // narrative too.
      when: () => !document.getElementById('narrativeFieldsBlock').hidden,
    },
    {
      key: 'visualLanguage',
      title: 'Visual language',
      hint: "Tick whatever describes the look you're after.",
      // The Manage link stays on the page: editing a framework re-renders the
      // tags from the SAVED shoot, which would clear ticks on a new draft.
      blocks: () => [
        document.getElementById('frameworkTagsContainerEarly').children.length ? shootWizardBlock('frameworkTagsContainerEarly') : null,
        // Holds custom frameworks only, and is flagged hidden when there are
        // none — but no CSS rule actually hides it, so it'd arrive as an
        // empty box. Left on the page in that case.
        document.getElementById('frameworkTagsContainer').hidden ? null : shootWizardBlock('frameworkTagsContainer'),
      ],
      when: () => (state.frameworks || []).some(fw => (fw.tags || []).length > 0),
      enter: () => setShootWizardFrameworkGroupsOpen(true),
      leave: () => setShootWizardFrameworkGroupsOpen(false),
    },
    {
      key: 'references',
      title: 'References',
      hint: "Anything you're drawing inspiration from. Add as many links as you like.",
      blocks: () => [shootWizardBlock('referencesList', '.references-block')],
    },
    {
      key: 'moodboard',
      // Mood board or Storyboard, by category — same wording as the section.
      title: () => moodboardTerm(document.getElementById('shootCategory').value),
      hint: () => {
        const term = moodboardTerm(document.getElementById('shootCategory').value).toLowerCase();
        return document.getElementById('moodboardCompleteRow').hidden
          ? `Images that set the look. Add a few now, or come back to the ${term} later.`
          : `Images that set the look. Tick the box once the ${term} is done, or if this shoot doesn't need one.`;
      },
      // Anchored on the grid: Final images shares the .moodboard-section class.
      blocks: () => [shootWizardBlock('moodboardGrid', '.moodboard-section')],
    },
    {
      key: 'lighting',
      title: 'Lighting setups',
      hint: 'Plan the light you want, one setup at a time.',
      // The section's body only — its heading stays on the page with the
      // jump menu/scrollspy/tour anchors. Shown here even if folded there.
      blocks: () => [shootWizardBlock('lightingSetupsBody')],
    },
    {
      key: 'shotList',
      title: 'Shot list',
      hint: 'Every shot you want to come away with. Tap a line to write, and Enter starts the next one.',
      // Its own pieces rather than the whole section body: Directions for
      // talent/team live in the same section on the page but get their own
      // slide, right after this one.
      blocks: () => [
        shootWizardBlock('shotListItems'),
        shootWizardBlock('addShotBtn'),
        shootWizardBlock('shootShootingNotes', 'label'),
      ],
    },
    {
      key: 'directions',
      title: 'Directions',
      hint: "Notes for the day: what you'll ask of the talent, and what the team needs to know.",
      blocks: () => [
        shootWizardBlock('shootTalentDirections', 'label'),
        shootWizardBlock('shootTeamDirections', 'label'),
      ],
    },
    {
      key: 'deadline',
      title: 'Deadline',
      hint: "When everything's due, if there's a date to hit.",
      blocks: () => [shootWizardBlock('shootDeadline', 'label')],
    },
    {
      key: 'finish',
      title: 'All set',
      hint: 'Everything you filled in is already on the shoot page. Add to it or change it there anytime.',
      blocks: () => [],
    },
  ];

  // The slides that currently apply (the one on screen always counts, so the
  // "Step x of y" line can never lose its own place).
  function shootWizardStepsInPlay() {
    return SHOOT_WIZARD_STEPS.filter(step => step.key === shootWizardStepKey || !step.when || step.when());
  }

  // The nearest slide that applies before (-1) or after (+1) the current
  // one, or null at either end. Re-evaluated every time, since slide 1's
  // category decides whether The story applies at all.
  function adjacentShootWizardStep(direction) {
    const from = SHOOT_WIZARD_STEPS.findIndex(step => step.key === shootWizardStepKey);
    for (let i = from + direction; i >= 0 && i < SHOOT_WIZARD_STEPS.length; i += direction) {
      const step = SHOOT_WIZARD_STEPS[i];
      if (!step.when || step.when()) return step;
    }
    return null;
  }

  // Before anything moves: a focused field that's moved loses focus without
  // a focusout (so without its saveShootNow), and iOS never blurs a field
  // when a button is tapped. Blurring also drops the keyboard/native picker.
  function blurShootWizardFocus() {
    const active = document.activeElement;
    if (active && active !== document.body && document.getElementById('shootWizard').contains(active)) active.blur();
  }

  function moveBlockIntoShootWizard(el, body) {
    if (!el || body.contains(el)) return;
    const placeholder = document.createComment('shoot-wizard');
    el.before(placeholder);
    // A collapsible section body brings its remembered fold along — shown
    // regardless while it's on a slide, given its fold back on the way out.
    const isSectionBody = SHOOT_FORM_COLLAPSE_SECTIONS.some(([, , bodyId]) => bodyId === el.id);
    const record = { el, placeholder, wasHidden: el.hidden, unhid: isSectionBody, unlocked: [], wasInert: el.inert };
    if (isSectionBody) el.hidden = false;
    // A block that sits directly under #shootForm (Team, Shot list) was made
    // inert itself along with the rest of the covered page — it has to come
    // alive in the card, then go back to how it was on the page.
    el.inert = false;
    // On the page these open the expand popup instead of taking typing (see
    // its click guard); a slide has the room to type in place.
    el.querySelectorAll('textarea[readonly]').forEach(field => {
      field.readOnly = false;
      record.unlocked.push(field);
    });
    body.appendChild(el);
    shootWizardMoved.push(record);
  }

  function restoreShootWizardBlocks() {
    shootWizardMoved.forEach(({ el, placeholder, wasHidden, unhid, unlocked, wasInert }) => {
      unlocked.forEach(field => { field.readOnly = true; });
      if (unhid) el.hidden = wasHidden;
      el.inert = wasInert;
      if (placeholder.parentNode) placeholder.replaceWith(el);
    });
    shootWizardMoved = [];
    const step = SHOOT_WIZARD_STEPS.find(s => s.key === shootWizardStepKey);
    if (step && step.leave) step.leave();
  }

  function renderShootWizardChrome() {
    const step = SHOOT_WIZARD_STEPS.find(s => s.key === shootWizardStepKey);
    if (!step) return;
    const inPlay = shootWizardStepsInPlay();
    const isLast = !adjacentShootWizardStep(1);
    document.getElementById('shootWizardStep').textContent = `Step ${inPlay.indexOf(step) + 1} of ${inPlay.length}`;
    document.getElementById('shootWizardTitle').textContent = typeof step.title === 'function' ? step.title() : step.title;
    const hintEl = document.getElementById('shootWizardHint');
    hintEl.textContent = (typeof step.hint === 'function' ? step.hint() : step.hint) || '';
    // A slide without a hint doesn't keep an empty line's spacing.
    hintEl.hidden = !hintEl.textContent;
    // No Back on the first slide, nor on the last: that one is just the
    // confirm button (see below).
    document.getElementById('shootWizardBackBtn').hidden = isLast || !adjacentShootWizardStep(-1);
    // Small "Don't show again" link, on the first slide only.
    document.getElementById('shootWizardDontShowBtn').hidden = inPlay.indexOf(step) !== 0;
    // Forward is always possible, filled in or not. On the last slide the
    // forward button is the shoot page's own Save — same varying text as the
    // page's button (picked when the shoot opened) — and the separate "Go to
    // shoot page" row, on every other slide, steps aside.
    const nextBtn = document.getElementById('shootWizardNextBtn');
    nextBtn.textContent = isLast ? document.getElementById('saveShootBtn').textContent : 'Next';
    nextBtn.classList.toggle('shoot-wizard-save', isLast);
    document.getElementById('shootWizardExitRow').hidden = isLast;
  }

  // Run from scheduleShootAutosave on every change while the wizard's up.
  function refreshShootWizard() {
    renderShootWizardChrome();
    // Values written from code fire no input event, so they'd keep their
    // empty-field look on the slide — a picked location's remembered
    // directions, for one. Only fields whose look is actually out of step get
    // re-synced: re-measuring every box on each keystroke can briefly shrink
    // the card's content and knock its scroll position.
    document.querySelectorAll('#shootWizardBody input, #shootWizardBody textarea').forEach(el => {
      if (el !== document.activeElement && isBoxSheddingField(el) && el.classList.contains('is-filled') !== hasText(el.value)) syncFieldFilledState(el);
    });
  }

  function showShootWizardStep(key) {
    const step = SHOOT_WIZARD_STEPS.find(s => s.key === key);
    if (!step) return;
    blurShootWizardFocus();
    restoreShootWizardBlocks();
    shootWizardStepKey = key;
    const body = document.getElementById('shootWizardBody');
    step.blocks().forEach(block => moveBlockIntoShootWizard(block, body));
    if (step.enter) step.enter();
    body.scrollTop = 0;
    renderShootWizardChrome();
    // Measured now, at the card's width, with the wizard already visible — a
    // hidden one would measure zero and leave every box at its rows default.
    body.querySelectorAll('input, textarea').forEach(syncFieldFilledState);
    autoSizeAllListTextareas();
    // The card, not a field: focusing a field on every slide would throw the
    // keyboard up over the slide before it's even been read.
    document.getElementById('shootWizardCard').focus({ preventScroll: true });
  }

  // Fits the wizard to the part of the screen that's actually visible, so
  // with the iOS keyboard up the card re-centres above it instead of sitting
  // behind it (iOS doesn't shrink the layout viewport). A visible height well
  // under the tallest seen this run means the keyboard's up: compact mode.
  function syncShootWizardViewport() {
    const wizard = document.getElementById('shootWizard');
    const vv = window.visualViewport;
    const height = vv ? vv.height : window.innerHeight;
    shootWizardViewportMaxH = Math.max(shootWizardViewportMaxH, height);
    if (vv) {
      wizard.style.setProperty('--wiz-vv-top', `${vv.offsetTop}px`);
      wizard.style.setProperty('--wiz-vv-h', `${vv.height}px`);
    }
    // Also compact outright on a short screen (an iPhone on its side), where
    // the full step line + hint + buttons alone would leave no room for fields.
    wizard.classList.toggle('shoot-wizard-compact', height < shootWizardViewportMaxH * 0.8 || height < 560);
  }

  // The covered page can't take focus while the wizard's up. The wizard is
  // last in the form, so every page field comes before a slide's fields in
  // document order: iOS's keyboard ^/v arrows (or Tab) from a slide's first
  // field would land in a field hidden behind the dim and type into it
  // unseen, or reach Save/Delete/Shoot mode/the tour. Every popup a slide
  // opens is a body-level overlay, so none of them is affected.
  function setShootPageInert(on) {
    const modalEl = shootModalOverlay.querySelector('.modal');
    [...modalEl.children, ...shootForm.children].forEach(el => {
      if (el !== shootForm && el.id !== 'shootWizard') el.inert = on;
    });
  }

  function startShootWizard() {
    const first = SHOOT_WIZARD_STEPS.find(step => !step.when || step.when());
    if (!first) return;
    shootWizardActive = true;
    shootWizardStepKey = null;
    shootWizardViewportMaxH = 0;
    // Slide 1 explains the status button itself, so the one-time intro that
    // points at it "up top" is marked seen rather than stacking over the
    // wizard now, or turning up later to repeat it.
    try { localStorage.setItem(STATUS_SWATCH_INTRO_KEY, '1'); } catch (err) { /* storage unavailable — nothing to remember it in */ }
    // The covered page holds still: only the card scrolls. Doesn't clip the
    // fixed wizard (its containing block is the viewport), and code can
    // still set scrollTop.
    shootModalOverlay.querySelector('.modal').style.overflow = 'hidden';
    setShootPageInert(true);
    document.getElementById('shootWizard').hidden = false;
    syncShootWizardViewport();
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', syncShootWizardViewport);
      window.visualViewport.addEventListener('scroll', syncShootWizardViewport);
    }
    showShootWizardStep(first.key);
  }

  // The shoot modal slides up on a transform for its first 0.2s, and while
  // that runs it's the containing block for anything position:fixed inside
  // it — a wizard shown straight away would sit inside the moving sheet,
  // clipped, then jump to full screen. So it waits for the slide-in's own
  // animationend (wired below), with a timer as the fallback for when none
  // comes: the overlay was already open, or the tab is in the background
  // (rAF and CSS animations stall there, timers don't).
  function queueShootWizard() {
    shootWizardPendingId = currentShootId;
    clearTimeout(shootWizardStartTimer);
    shootWizardStartTimer = setTimeout(startQueuedShootWizard, 320);
  }

  function startQueuedShootWizard() {
    const pendingId = shootWizardPendingId;
    shootWizardPendingId = null;
    clearTimeout(shootWizardStartTimer);
    if (!pendingId || pendingId !== currentShootId || shootModalOverlay.hidden || shootWizardActive) return;
    startShootWizard();
  }

  // Every way out: Done, "Go to shoot page", the post-shoot prompt's Yes,
  // closeShootModal and openShootModal. Idempotent. `closing` skips the
  // landing-on-the-page work, since a close/reopen does its own next.
  function endShootWizard(opts) {
    const closing = !!(opts && opts.closing);
    shootWizardPendingId = null;
    clearTimeout(shootWizardStartTimer);
    if (!shootWizardActive) return;
    closeLeaveShootWizardPrompt();
    closeConceptHelper();
    blurShootWizardFocus();
    restoreShootWizardBlocks();
    shootWizardActive = false;
    shootWizardStepKey = null;
    const wizard = document.getElementById('shootWizard');
    wizard.hidden = true;
    wizard.classList.remove('shoot-wizard-compact');
    setShootPageInert(false);
    if (window.visualViewport) {
      window.visualViewport.removeEventListener('resize', syncShootWizardViewport);
      window.visualViewport.removeEventListener('scroll', syncShootWizardViewport);
    }
    const modalEl = shootModalOverlay.querySelector('.modal');
    modalEl.style.overflow = '';
    if (closing) return;
    // On a new shoot, Direction's fields wait behind "select a category to
    // continue" — but a slide lets them be filled with no category picked.
    // Left gated, what was just written would look lost.
    if (!document.getElementById('shootCategory').value) {
      const directionFilled = [...document.querySelectorAll('#formSection2 input, #formSection2 textarea')]
        .some(el => (el.type === 'checkbox' ? el.checked : hasText(el.value)));
      if (directionFilled) revealSection2();
    }
    // Everything was last measured at the card's width; the page is wider.
    // The fold state goes first so only open sections get measured.
    applyShootFormCollapseState();
    syncAllShootFormFields();
    autoSizeAllListTextareas();
    // Instant, not smooth: smooth scrolling doesn't run in a background tab.
    modalEl.scrollTop = 0;
    updateShootModalTitleFromScroll();
  }

  document.getElementById('shootWizardBackBtn').addEventListener('click', () => {
    if (!shootWizardActive) return;
    const prev = adjacentShootWizardStep(-1);
    if (prev) showShootWizardStep(prev.key);
  });

  document.getElementById('shootWizardNextBtn').addEventListener('click', () => {
    if (!shootWizardActive) return;
    const next = adjacentShootWizardStep(1);
    if (next) showShootWizardStep(next.key);
    // The last slide's button is Save: save and close, like the page's.
    else closeShootModal();
  });

  // Leaving early always asks first — from "Go to shoot page" or a tap on
  // the dim around the card. (Finishing on the last slide, or "Don't show
  // again", don't: those say what they do.)
  function askLeaveShootWizard() {
    if (!shootWizardActive) return;
    document.getElementById('shootWizardLeaveOverlay').hidden = false;
  }

  function closeLeaveShootWizardPrompt() {
    document.getElementById('shootWizardLeaveOverlay').hidden = true;
  }

  document.getElementById('shootWizardExitBtn').addEventListener('click', askLeaveShootWizard);

  // Only a tap that both starts and ends on the dim: with a mouse, a text
  // selection dragged out past the card's edge also "clicks" the backdrop.
  let shootWizardPressOnBackdrop = false;
  document.getElementById('shootWizard').addEventListener('pointerdown', (e) => {
    shootWizardPressOnBackdrop = e.target === e.currentTarget;
  });
  document.getElementById('shootWizard').addEventListener('click', (e) => {
    if (e.target === e.currentTarget && shootWizardPressOnBackdrop) askLeaveShootWizard();
    shootWizardPressOnBackdrop = false;
  });

  document.getElementById('shootWizardLeaveStayBtn').addEventListener('click', closeLeaveShootWizardPrompt);

  document.getElementById('shootWizardLeaveGoBtn').addEventListener('click', () => {
    closeLeaveShootWizardPrompt();
    endShootWizard();
  });

  document.getElementById('shootWizardLeaveOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeLeaveShootWizardPrompt();
  });

  // On/off for the whole guide, remembered on this device. Turned off from
  // the first slide's "Don't show again", and back on (or off) from the app
  // menu's New shoot guide pane.
  const NEW_SHOOT_GUIDE_OFF_KEY = 'dailies_new_shoot_guide_off_v1';

  function isNewShootGuideOn() {
    try { return localStorage.getItem(NEW_SHOOT_GUIDE_OFF_KEY) !== '1'; } catch (err) { return true; }
  }

  function setNewShootGuideOn(on) {
    try {
      if (on) localStorage.removeItem(NEW_SHOOT_GUIDE_OFF_KEY);
      else localStorage.setItem(NEW_SHOOT_GUIDE_OFF_KEY, '1');
    } catch (err) { /* storage unavailable — nothing to remember it in */ }
  }

  // Lands on the shoot page with everything so far, then says where the
  // switch lives so the guide isn't gone for good by accident.
  // ---------- Concept helper ("Need to think it through?") ----------
  // From The idea slide: a short decision tree of yes/no and short-answer
  // questions, picked by the shoot's category (CONCEPT_FLOWS), whose answers
  // are dropped mad-lib style into a concept summary at the end — editable,
  // then either used as the Concept or left for the user to write their own.
  //
  // Flow format: { id, label, categories (keys; '' = no category yet),
  // start, nodes: [{ id, type: 'yesno'|'short', text, hint?, placeholder?,
  // key, yes/no (yesno: next id or 'END'), yesValue/noValue? (stored instead
  // of true/false), next (short), categoryText? ({category: text}) }],
  // summaries: [{ when: {key: value}, template }] } — the first summary whose
  // `when` all match is used. Templates: {key} inserts an answer, {category}
  // the shoot type, and [[ ... ]] is dropped whole if any {key} in it is blank.
  // The Concept box's own limit, so a compiled concept that won't fit is
  // caught here (see updateConceptHelperCount) rather than cut off by it.
  const conceptHelperMax = () => document.getElementById('shootPremise').maxLength || 300;
  let conceptHelper = null; // { flow, nodeId, history: [nodeId], answers: {nodeId: value}, ended }

  // The questions behind "Need to think it through?" — one flow per kind of
  // shoot (see the format notes above openConceptHelper), each leaning on
  // what that kind of shoot actually is: story vs vibe for narrative work,
  // the people and their relationship for engagements/family/maternity, a
  // theme rather than a plot for events (you don't control what happens),
  // message/audience/personality for brand work, and so on. '' in a flow's
  // categories = the one used before a category's been picked.
  const CONCEPT_FLOWS = [
    {
      "id": "editorial",
      "label": "Editorial: story or vibe",
      "categories": [
        "editorial"
      ],
      "start": "editorial_mode",
      "nodes": [
        {
          "id": "editorial_mode",
          "type": "yesno",
          "text": "Is this spread more of a vibe than a story with a beginning, middle and end?",
          "hint": "Either is great. Some of the best spreads are all vibe.",
          "key": "mode",
          "yes": "editorial_mood",
          "no": "editorial_who",
          "yesValue": "vibe",
          "noValue": "story"
        },
        {
          "id": "editorial_who",
          "type": "short",
          "text": "Who's the main character, in a few words?",
          "hint": "Who they're playing, not who's modeling.",
          "placeholder": "e.g. a runaway bride",
          "key": "character",
          "next": "editorial_doing"
        },
        {
          "id": "editorial_doing",
          "type": "short",
          "text": "What do we catch them doing?",
          "hint": "One action, like a film still.",
          "placeholder": "e.g. smoking in her gown",
          "key": "action",
          "next": "editorial_after"
        },
        {
          "id": "editorial_after",
          "type": "yesno",
          "text": "Are we meeting them just after something big happened?",
          "hint": "Say no if the big thing is still coming.",
          "key": "timing",
          "yes": "editorial_moment",
          "no": "editorial_moment",
          "yesValue": "just after",
          "noValue": "just before"
        },
        {
          "id": "editorial_moment",
          "type": "short",
          "text": "What's the big moment, in a few words?",
          "hint": "It can be tiny: a phone call, a slammed door.",
          "placeholder": "e.g. leaving the church",
          "key": "moment",
          "next": "editorial_world"
        },
        {
          "id": "editorial_world",
          "type": "short",
          "text": "Where and when does it take place?",
          "hint": "A place, an era, or both.",
          "placeholder": "e.g. a '70s desert motel",
          "key": "world",
          "next": "editorial_feel"
        },
        {
          "id": "editorial_feel",
          "type": "short",
          "text": "In a few words, how should it feel?",
          "placeholder": "e.g. lonely but hopeful",
          "key": "feeling",
          "next": "editorial_styling"
        },
        {
          "id": "editorial_mood",
          "type": "short",
          "text": "In a few words, how should it feel?",
          "placeholder": "e.g. dreamy but lonely",
          "key": "mood",
          "next": "editorial_light"
        },
        {
          "id": "editorial_light",
          "type": "short",
          "text": "What's the light and color like?",
          "hint": "Think palette and light, not gear.",
          "placeholder": "e.g. hazy, faded pastels",
          "key": "light",
          "next": "editorial_place"
        },
        {
          "id": "editorial_place",
          "type": "short",
          "text": "Where's it set?",
          "hint": "A real spot or just the kind of place.",
          "placeholder": "e.g. an empty ballroom",
          "key": "place",
          "next": "editorial_refs"
        },
        {
          "id": "editorial_refs",
          "type": "short",
          "text": "Any era, movie or reference it's borrowing from?",
          "hint": "A decade, a film, a painter, a photographer.",
          "placeholder": "e.g. '90s fashion mags",
          "key": "refs",
          "next": "editorial_leave"
        },
        {
          "id": "editorial_leave",
          "type": "short",
          "text": "Finish this: it should leave you…",
          "placeholder": "e.g. a little homesick",
          "key": "takeaway",
          "next": "editorial_styling"
        },
        {
          "id": "editorial_styling",
          "type": "yesno",
          "text": "Last one: are wardrobe and styling a big part of this?",
          "hint": "Say no if it's stripped-back and real.",
          "key": "styling",
          "yes": "END",
          "no": "END",
          "yesValue": "fashion-forward",
          "noValue": "stripped-back"
        }
      ],
      "summaries": [
        {
          "when": {
            "mode": "story"
          },
          "template": "An editorial[[ about {character}]][[, caught {action}]][[ {timing} {moment}]][[, set in {world}]][[, with {styling} styling]].[[ It should feel {feeling}.]]"
        },
        {
          "when": {
            "mode": "vibe"
          },
          "template": "[[{mood}: ]]a mood piece[[ set in {place}]][[, bathed in {light}]][[, with {styling} styling]].[[ Think {refs}.]][[ It should leave you {takeaway}.]]"
        },
        {
          "when": {},
          "template": "An editorial[[ with {styling} styling]].[[ It should feel {feeling}.]][[ It should feel {mood}.]]"
        }
      ]
    },
    {
      "id": "portfolio",
      "label": "Portfolio: story or vibe",
      "categories": [
        "portfolio_building"
      ],
      "start": "portfolio_mode",
      "nodes": [
        {
          "id": "portfolio_mode",
          "type": "yesno",
          "text": "Is this portfolio piece more of a vibe than a story with a beginning, middle and end?",
          "hint": "Either works. Go with whatever's closest to what's in your head.",
          "key": "mode",
          "yes": "portfolio_mood",
          "no": "portfolio_who",
          "yesValue": "vibe",
          "noValue": "story"
        },
        {
          "id": "portfolio_who",
          "type": "short",
          "text": "Who's the main character, in a few words?",
          "hint": "Who they're playing, not who's modeling.",
          "placeholder": "e.g. a retired magician",
          "key": "character",
          "next": "portfolio_doing"
        },
        {
          "id": "portfolio_doing",
          "type": "short",
          "text": "What do we catch them doing?",
          "hint": "One action, like a film still.",
          "placeholder": "e.g. packing up his props",
          "key": "action",
          "next": "portfolio_after"
        },
        {
          "id": "portfolio_after",
          "type": "yesno",
          "text": "Are we meeting them just after something big happened?",
          "hint": "Say no if the big thing is still coming.",
          "key": "timing",
          "yes": "portfolio_moment",
          "no": "portfolio_moment",
          "yesValue": "just after",
          "noValue": "just before"
        },
        {
          "id": "portfolio_moment",
          "type": "short",
          "text": "What's the big moment, in a few words?",
          "hint": "It can be tiny: a phone call, a slammed door.",
          "placeholder": "e.g. his last show",
          "key": "moment",
          "next": "portfolio_world"
        },
        {
          "id": "portfolio_world",
          "type": "short",
          "text": "Where and when does it take place?",
          "hint": "A place, an era, or both.",
          "placeholder": "e.g. an empty '50s theater",
          "key": "world",
          "next": "portfolio_feel"
        },
        {
          "id": "portfolio_feel",
          "type": "short",
          "text": "In a few words, how should it feel?",
          "placeholder": "e.g. bittersweet",
          "key": "feeling",
          "next": "portfolio_showoff"
        },
        {
          "id": "portfolio_mood",
          "type": "short",
          "text": "In a few words, how should it feel?",
          "placeholder": "e.g. quiet and eerie",
          "key": "mood",
          "next": "portfolio_light"
        },
        {
          "id": "portfolio_light",
          "type": "short",
          "text": "What's the light and color like?",
          "hint": "Think palette and light, not gear.",
          "placeholder": "e.g. cold fluorescents",
          "key": "light",
          "next": "portfolio_place"
        },
        {
          "id": "portfolio_place",
          "type": "short",
          "text": "Where's it set?",
          "hint": "A real spot or just the kind of place.",
          "placeholder": "e.g. a laundromat at 2am",
          "key": "place",
          "next": "portfolio_refs"
        },
        {
          "id": "portfolio_refs",
          "type": "short",
          "text": "Any era, movie or reference it's borrowing from?",
          "hint": "A decade, a film, a painter, a photographer.",
          "placeholder": "e.g. Edward Hopper",
          "key": "refs",
          "next": "portfolio_leave"
        },
        {
          "id": "portfolio_leave",
          "type": "short",
          "text": "Finish this: it should leave you…",
          "placeholder": "e.g. a little uneasy",
          "key": "takeaway",
          "next": "portfolio_showoff"
        },
        {
          "id": "portfolio_showoff",
          "type": "short",
          "text": "Last one: what skill or style should this show off?",
          "hint": "Whatever you want future clients to see more of.",
          "placeholder": "e.g. cinematic color",
          "key": "showoff",
          "next": "END"
        }
      ],
      "summaries": [
        {
          "when": {
            "mode": "story"
          },
          "template": "A story[[ about {character}]][[, caught {action}]][[ {timing} {moment}]][[, set in {world}]].[[ It should feel {feeling}.]][[ Made to show off {showoff}.]]"
        },
        {
          "when": {
            "mode": "vibe"
          },
          "template": "[[{mood}: ]]a mood piece[[ set in {place}]][[, bathed in {light}]].[[ Think {refs}.]][[ It should leave you {takeaway}.]][[ Made to show off {showoff}.]]"
        },
        {
          "when": {},
          "template": "A portfolio piece[[ made to show off {showoff}]].[[ It should feel {feeling}.]][[ It should feel {mood}.]]"
        }
      ]
    },
    {
      "id": "testshoot",
      "label": "Test shoot: story or vibe",
      "categories": [
        "test_shoot"
      ],
      "start": "testshoot_mode",
      "nodes": [
        {
          "id": "testshoot_mode",
          "type": "yesno",
          "text": "Is this {category} more of a vibe than a story with a beginning, middle and end?",
          "hint": "Tests are a great place to chase a pure vibe. No wrong answer.",
          "key": "mode",
          "yes": "testshoot_mood",
          "no": "testshoot_who",
          "yesValue": "vibe",
          "noValue": "story"
        },
        {
          "id": "testshoot_who",
          "type": "short",
          "text": "Who's the main character, in a few words?",
          "hint": "Who they're playing, not who's modeling.",
          "placeholder": "e.g. a pageant queen",
          "key": "character",
          "next": "testshoot_doing"
        },
        {
          "id": "testshoot_doing",
          "type": "short",
          "text": "What do we catch them doing?",
          "hint": "One action, like a film still.",
          "placeholder": "e.g. eating cake alone",
          "key": "action",
          "next": "testshoot_after"
        },
        {
          "id": "testshoot_after",
          "type": "yesno",
          "text": "Are we meeting them just after something big happened?",
          "hint": "Say no if the big thing is still coming.",
          "key": "timing",
          "yes": "testshoot_moment",
          "no": "testshoot_moment",
          "yesValue": "just after",
          "noValue": "just before"
        },
        {
          "id": "testshoot_moment",
          "type": "short",
          "text": "What's the big moment, in a few words?",
          "hint": "It can be tiny: a phone call, a slammed door.",
          "placeholder": "e.g. losing the crown",
          "key": "moment",
          "next": "testshoot_world"
        },
        {
          "id": "testshoot_world",
          "type": "short",
          "text": "Where and when does it take place?",
          "hint": "A place, an era, or both.",
          "placeholder": "e.g. a '90s rec center",
          "key": "world",
          "next": "testshoot_feel"
        },
        {
          "id": "testshoot_feel",
          "type": "short",
          "text": "In a few words, how should it feel?",
          "placeholder": "e.g. funny but sad",
          "key": "feeling",
          "next": "testshoot_testing"
        },
        {
          "id": "testshoot_mood",
          "type": "short",
          "text": "In a few words, how should it feel?",
          "placeholder": "e.g. warm and sleepy",
          "key": "mood",
          "next": "testshoot_light"
        },
        {
          "id": "testshoot_light",
          "type": "short",
          "text": "What's the light and color like?",
          "hint": "Think palette and light, not gear.",
          "placeholder": "e.g. golden, grainy light",
          "key": "light",
          "next": "testshoot_place"
        },
        {
          "id": "testshoot_place",
          "type": "short",
          "text": "Where's it set?",
          "hint": "A real spot or just the kind of place.",
          "placeholder": "e.g. a sunlit greenhouse",
          "key": "place",
          "next": "testshoot_refs"
        },
        {
          "id": "testshoot_refs",
          "type": "short",
          "text": "Any era, movie or reference it's borrowing from?",
          "hint": "A decade, a film, a painter, a photographer.",
          "placeholder": "e.g. Sofia Coppola",
          "key": "refs",
          "next": "testshoot_leave"
        },
        {
          "id": "testshoot_leave",
          "type": "short",
          "text": "Finish this: it should leave you…",
          "placeholder": "e.g. wanting to slow down",
          "key": "takeaway",
          "next": "testshoot_testing"
        },
        {
          "id": "testshoot_testing",
          "type": "short",
          "text": "Last one: what are you testing or trying for the first time?",
          "hint": "A look, a technique, new gear, a new face or team.",
          "placeholder": "e.g. a new film stock",
          "key": "testing",
          "next": "END"
        }
      ],
      "summaries": [
        {
          "when": {
            "mode": "story"
          },
          "template": "A story[[ about {character}]][[, caught {action}]][[ {timing} {moment}]][[, set in {world}]].[[ It should feel {feeling}.]][[ Trying out {testing}.]]"
        },
        {
          "when": {
            "mode": "vibe"
          },
          "template": "[[{mood}: ]]a mood piece[[ set in {place}]][[, bathed in {light}]].[[ Think {refs}.]][[ It should leave you {takeaway}.]][[ Trying out {testing}.]]"
        },
        {
          "when": {},
          "template": "A test shoot[[ to try out {testing}]].[[ It should feel {feeling}.]][[ It should feel {mood}.]]"
        }
      ]
    },
    {
      "id": "story",
      "label": "Story or vibe",
      "categories": [
        "other",
        ""
      ],
      "start": "story_mode",
      "nodes": [
        {
          "id": "story_mode",
          "type": "yesno",
          "text": "Is the idea more of a vibe than a story with a beginning, middle and end?",
          "hint": "No wrong answer. Some ideas are a whole plot, some are just a feeling.",
          "key": "mode",
          "yes": "story_mood",
          "no": "story_who",
          "yesValue": "vibe",
          "noValue": "story"
        },
        {
          "id": "story_who",
          "type": "short",
          "text": "Who's the main character, in a few words?",
          "hint": "Who they're playing, not who's modeling.",
          "placeholder": "e.g. an astronaut's wife",
          "key": "character",
          "next": "story_doing"
        },
        {
          "id": "story_doing",
          "type": "short",
          "text": "What do we catch them doing?",
          "hint": "One action, like a film still.",
          "placeholder": "e.g. setting the table",
          "key": "action",
          "next": "story_after"
        },
        {
          "id": "story_after",
          "type": "yesno",
          "text": "Are we meeting them just after something big happened?",
          "hint": "Say no if the big thing is still coming.",
          "key": "timing",
          "yes": "story_moment",
          "no": "story_moment",
          "yesValue": "just after",
          "noValue": "just before"
        },
        {
          "id": "story_moment",
          "type": "short",
          "text": "What's the big moment, in a few words?",
          "hint": "It can be tiny: a phone call, a slammed door.",
          "placeholder": "e.g. the launch",
          "key": "moment",
          "next": "story_world"
        },
        {
          "id": "story_world",
          "type": "short",
          "text": "Where and when does it take place?",
          "hint": "A place, an era, or both.",
          "placeholder": "e.g. a '60s suburban kitchen",
          "key": "world",
          "next": "story_feel"
        },
        {
          "id": "story_feel",
          "type": "short",
          "text": "In a few words, how should it feel?",
          "placeholder": "e.g. tender and strange",
          "key": "feeling",
          "next": "story_frames"
        },
        {
          "id": "story_frames",
          "type": "yesno",
          "text": "Last one: does the whole story live in a single frame?",
          "hint": "Say no if it plays out across a few frames.",
          "key": "storyFormat",
          "yes": "END",
          "no": "END",
          "yesValue": "told in a single frame",
          "noValue": "told across a few frames"
        },
        {
          "id": "story_mood",
          "type": "short",
          "text": "In a few words, how should it feel?",
          "placeholder": "e.g. hazy and nostalgic",
          "key": "mood",
          "next": "story_light"
        },
        {
          "id": "story_light",
          "type": "short",
          "text": "What's the light and color like?",
          "hint": "Think palette and light, not gear.",
          "placeholder": "e.g. warm tungsten glow",
          "key": "light",
          "next": "story_place"
        },
        {
          "id": "story_place",
          "type": "short",
          "text": "Where's it set?",
          "hint": "A real spot or just the kind of place.",
          "placeholder": "e.g. a roller rink",
          "key": "place",
          "next": "story_refs"
        },
        {
          "id": "story_refs",
          "type": "short",
          "text": "Any era, movie or reference it's borrowing from?",
          "hint": "A decade, a film, a painter, a photographer.",
          "placeholder": "e.g. '80s home videos",
          "key": "refs",
          "next": "story_leave"
        },
        {
          "id": "story_leave",
          "type": "short",
          "text": "Finish this: it should leave you…",
          "placeholder": "e.g. missing someone",
          "key": "takeaway",
          "next": "story_vibe_frames"
        },
        {
          "id": "story_vibe_frames",
          "type": "yesno",
          "text": "Last one: does the whole vibe live in a single image?",
          "hint": "Say no if it's a set or a series.",
          "key": "vibeFormat",
          "yes": "END",
          "no": "END",
          "yesValue": "captured in a single image",
          "noValue": "built as a series"
        }
      ],
      "summaries": [
        {
          "when": {
            "mode": "story"
          },
          "template": "A story[[ about {character}]][[, caught {action}]][[ {timing} {moment}]][[, set in {world}]][[, {storyFormat}]].[[ It should feel {feeling}.]]"
        },
        {
          "when": {
            "mode": "vibe"
          },
          "template": "[[{mood}: ]]a mood piece[[ set in {place}]][[, bathed in {light}]][[, {vibeFormat}]].[[ Think {refs}.]][[ It should leave you {takeaway}.]]"
        },
        {
          "when": {},
          "template": "A narrative portrait shoot[[, {storyFormat}]][[, {vibeFormat}]].[[ It should feel {feeling}.]][[ It should feel {mood}.]]"
        }
      ]
    },
    {
      "id": "people",
      "label": "Couples, families & maternity",
      "categories": [
        "engagement",
        "family",
        "maternity"
      ],
      "start": "people_q1",
      "nodes": [
        {
          "id": "people_q1",
          "type": "yesno",
          "text": "Do you want to catch them as they really are, more candid than posed?",
          "hint": "Say no if you're picturing a styled idea, a theme or a little story.",
          "key": "style",
          "yes": "people_them",
          "no": "people_story",
          "categoryText": {
            "engagement": "Do you want to catch the two of them as they really are, more candid than posed?",
            "family": "Do you want to catch this family as they really are, chaos and all?",
            "maternity": "Do you want to catch this season as it really is, more candid than posed?"
          }
        },
        {
          "id": "people_them",
          "type": "short",
          "text": "How would you describe them, in a few words?",
          "hint": "Whatever makes them them.",
          "placeholder": "e.g. goofy and always teasing",
          "key": "them",
          "next": "people_has_ritual",
          "categoryText": {
            "engagement": "How would you describe these two together, in a few words?",
            "family": "How would you describe this family, in a few words?",
            "maternity": "How would you describe the parents-to-be right now, in a few words?"
          }
        },
        {
          "id": "people_has_ritual",
          "type": "yesno",
          "text": "Is there something they always do together we could build it around?",
          "hint": "Think cooking dinner, walking the dog, bedtime, painting the nursery.",
          "key": "hasRitual",
          "yes": "people_ritual",
          "no": "people_has_place",
          "categoryText": {
            "engagement": "Is there something the two of them always do together we could build it around?",
            "family": "Is there a family ritual or routine we could build it around?",
            "maternity": "Is there something they're doing to get ready that we could build it around?"
          }
        },
        {
          "id": "people_ritual",
          "type": "short",
          "text": "What is it, in a few words?",
          "placeholder": "e.g. sunday pancakes",
          "key": "ritual",
          "next": "people_has_place"
        },
        {
          "id": "people_has_place",
          "type": "yesno",
          "text": "Is there a place that means something to them?",
          "hint": "Home totally counts.",
          "key": "hasPlace",
          "yes": "people_place",
          "no": "people_moment",
          "categoryText": {
            "engagement": "Is there a place that means something to the two of them?",
            "family": "Is there a place that means something to this family?",
            "maternity": "Is there a place that means something to them right now?"
          }
        },
        {
          "id": "people_place",
          "type": "short",
          "text": "Where is it, in a few words?",
          "placeholder": "e.g. the diner where they met",
          "key": "place",
          "next": "people_moment"
        },
        {
          "id": "people_moment",
          "type": "short",
          "text": "What's one little thing between them you'd hate to miss?",
          "placeholder": "e.g. the way they crack up",
          "key": "moment",
          "next": "people_feel",
          "categoryText": {
            "engagement": "What's one little thing between the two of them you'd hate to miss?",
            "family": "What's one little thing in this family you'd hate to miss?",
            "maternity": "What's one little moment or detail you'd hate to miss?"
          }
        },
        {
          "id": "people_story",
          "type": "yesno",
          "text": "Is there a little story to it, with a beginning, middle and end?",
          "hint": "No is totally fine. A theme or a look counts as an idea too.",
          "key": "story",
          "yes": "people_plot",
          "no": "people_theme"
        },
        {
          "id": "people_plot",
          "type": "short",
          "text": "In a few words, what's the story about?",
          "placeholder": "e.g. a road trip gone sideways",
          "key": "plot",
          "next": "people_real"
        },
        {
          "id": "people_real",
          "type": "yesno",
          "text": "Is it pulled from their real life?",
          "key": "real",
          "yes": "people_setting",
          "no": "people_setting",
          "yesValue": "taken from real life",
          "noValue": "made up just for them",
          "categoryText": {
            "engagement": "Is it pulled from their real story, like how they met?",
            "family": "Is it pulled from real family life, like a story they always tell?",
            "maternity": "Is it pulled from their real life, like how they found out?"
          }
        },
        {
          "id": "people_theme",
          "type": "short",
          "text": "What's the theme or idea, in a few words?",
          "hint": "Think of it like a title for the session.",
          "placeholder": "e.g. a '50s sunday picnic",
          "key": "theme",
          "next": "people_has_link"
        },
        {
          "id": "people_has_link",
          "type": "yesno",
          "text": "Does the theme tie back to something real about them?",
          "key": "hasLink",
          "yes": "people_link",
          "no": "people_setting",
          "categoryText": {
            "engagement": "Does the theme tie back to something real about the two of them?",
            "family": "Does the theme tie back to something real about this family?",
            "maternity": "Does the theme tie back to something real about them or this baby?"
          }
        },
        {
          "id": "people_link",
          "type": "short",
          "text": "What's the connection, in a few words?",
          "placeholder": "e.g. how her parents met",
          "key": "link",
          "next": "people_setting"
        },
        {
          "id": "people_setting",
          "type": "short",
          "text": "Where does it play out, in a few words?",
          "hint": "Bonus points if the place means something to them.",
          "placeholder": "e.g. a roadside diner",
          "key": "setting",
          "next": "people_look"
        },
        {
          "id": "people_look",
          "type": "short",
          "text": "Any era, movie or reference it's borrowing from?",
          "hint": "A decade, a film, a painter, a photographer.",
          "placeholder": "e.g. '70s family snapshots",
          "key": "look",
          "next": "people_feel"
        },
        {
          "id": "people_feel",
          "type": "short",
          "text": "Last one: in a few words, how should it feel?",
          "placeholder": "e.g. warm and a little messy",
          "key": "feel",
          "next": "END"
        }
      ],
      "summaries": [
        {
          "when": {
            "style": true
          },
          "template": "A candid session[[ of them being {them}]][[, built around {ritual}]][[ at {place}]].[[ Don't miss {moment}.]][[ It should feel {feel}.]]"
        },
        {
          "when": {
            "style": false,
            "story": true
          },
          "template": "A styled little story[[ about {plot}]][[, {real}]][[, set at {setting}]][[, with the look of {look}]].[[ It should feel {feel}.]]"
        },
        {
          "when": {
            "style": false,
            "story": false
          },
          "template": "A styled session[[ built around {theme}]][[, a nod to {link}]][[, set at {setting}]][[, with the look of {look}]].[[ It should feel {feel}.]]"
        },
        {
          "when": {},
          "template": "A session that's true to who they are[[, set at {setting}]][[ at {place}]].[[ It should feel {feel}.]]"
        }
      ]
    },
    {
      "id": "wedding",
      "label": "Wedding",
      "categories": [
        "wedding"
      ],
      "start": "wedding_q1",
      "nodes": [
        {
          "id": "wedding_q1",
          "type": "yesno",
          "text": "Is this a real wedding day, not a styled shoot?",
          "hint": "Real days aren't yours to direct, so we'll find a theme to follow, not a plot.",
          "key": "real",
          "yes": "wedding_approach",
          "no": "wedding_story"
        },
        {
          "id": "wedding_approach",
          "type": "yesno",
          "text": "Do you want to lean more candid and documentary than posed?",
          "hint": "Either way you're following the day. This is just how much you step in.",
          "key": "approach",
          "yes": "wedding_thread",
          "no": "wedding_thread",
          "yesValue": "documentary-style",
          "noValue": "polished, editorial"
        },
        {
          "id": "wedding_thread",
          "type": "short",
          "text": "What thread do you want to follow through the day?",
          "hint": "You can't script the day, but you can pick what to notice.",
          "placeholder": "e.g. two families becoming one",
          "key": "thread",
          "next": "wedding_moment"
        },
        {
          "id": "wedding_moment",
          "type": "short",
          "text": "Which part of the day matters most to the two of them?",
          "placeholder": "e.g. the first look",
          "key": "moment",
          "next": "wedding_has_ritual"
        },
        {
          "id": "wedding_has_ritual",
          "type": "yesno",
          "text": "Are there any traditions or rituals you'll want to honor?",
          "hint": "Cultural, religious, or just a family thing.",
          "key": "hasRitual",
          "yes": "wedding_ritual",
          "no": "wedding_feel"
        },
        {
          "id": "wedding_ritual",
          "type": "short",
          "text": "Which ones, in a few words?",
          "placeholder": "e.g. the tea ceremony",
          "key": "ritual",
          "next": "wedding_feel"
        },
        {
          "id": "wedding_story",
          "type": "yesno",
          "text": "Is there a little story to it, with a beginning, middle and end?",
          "hint": "No is totally fine. A theme or a look counts as an idea too.",
          "key": "story",
          "yes": "wedding_plot",
          "no": "wedding_theme"
        },
        {
          "id": "wedding_plot",
          "type": "short",
          "text": "In a few words, what's the story about?",
          "placeholder": "e.g. a runaway bride at dawn",
          "key": "plot",
          "next": "wedding_setting"
        },
        {
          "id": "wedding_theme",
          "type": "short",
          "text": "What's the theme or idea, in a few words?",
          "hint": "Think of it like a title for the shoot.",
          "placeholder": "e.g. a '20s speakeasy elopement",
          "key": "theme",
          "next": "wedding_setting"
        },
        {
          "id": "wedding_setting",
          "type": "short",
          "text": "Where does it play out, in a few words?",
          "placeholder": "e.g. a roadside chapel",
          "key": "setting",
          "next": "wedding_look"
        },
        {
          "id": "wedding_look",
          "type": "short",
          "text": "Any era, movie or reference it's borrowing from?",
          "hint": "A decade, a film, a painter, a photographer.",
          "placeholder": "e.g. a '90s bridal magazine",
          "key": "look",
          "next": "wedding_feel"
        },
        {
          "id": "wedding_feel",
          "type": "short",
          "text": "Last one: in a few words, how should it feel?",
          "placeholder": "e.g. romantic and a little wild",
          "key": "feel",
          "next": "END"
        }
      ],
      "summaries": [
        {
          "when": {
            "real": true
          },
          "template": "A[[ {approach}]] take on their wedding day[[, centered on {thread}]][[, honoring {ritual}]].[[ Don't miss {moment}.]][[ It should feel {feel}.]]"
        },
        {
          "when": {
            "real": false,
            "story": true
          },
          "template": "A styled wedding story[[ about {plot}]][[, set at {setting}]][[, with the look of {look}]].[[ It should feel {feel}.]]"
        },
        {
          "when": {
            "real": false,
            "story": false
          },
          "template": "A styled wedding shoot[[ built around {theme}]][[, set at {setting}]][[, with the look of {look}]].[[ It should feel {feel}.]]"
        },
        {
          "when": {},
          "template": "A wedding shoot that's true to the couple[[, centered on {thread}]][[, built around {theme}]].[[ It should feel {feel}.]]"
        }
      ]
    },
    {
      "id": "event",
      "label": "Event: find the theme",
      "categories": [
        "event"
      ],
      "start": "event_q1",
      "nodes": [
        {
          "id": "event_q1",
          "type": "yesno",
          "text": "Is this {category} centered on a stage, with performers or speakers everyone's watching?",
          "hint": "Yes for gigs, shows, talks and recitals. No for parties, openings and mixers.",
          "key": "stage",
          "yes": "event_show",
          "no": "event_occasion"
        },
        {
          "id": "event_show",
          "type": "short",
          "text": "What's the show, in a few words?",
          "hint": "A gig, a keynote, a recital, a comedy night…",
          "placeholder": "e.g. a sold-out punk show",
          "key": "what",
          "next": "event_show_theme"
        },
        {
          "id": "event_show_theme",
          "type": "short",
          "text": "In a few words, what's the theme or energy you want to bottle up?",
          "hint": "You can't script it, so pick the thread you'll follow.",
          "placeholder": "e.g. electric, sweaty joy",
          "key": "theme",
          "next": "event_side"
        },
        {
          "id": "event_side",
          "type": "yesno",
          "text": "Are you telling it from the crowd's side, rather than the stage's?",
          "hint": "Say no if you'll be with the performers: on stage, in the wings, backstage.",
          "key": "crowd",
          "yes": "event_crowd_motif",
          "no": "event_stage_motif"
        },
        {
          "id": "event_crowd_motif",
          "type": "short",
          "text": "What will you keep hunting for in the crowd?",
          "hint": "A recurring detail that ties the whole set together.",
          "placeholder": "e.g. hands in the air",
          "key": "motif",
          "next": "event_show_moment"
        },
        {
          "id": "event_stage_motif",
          "type": "short",
          "text": "What will you keep hunting for on stage and behind it?",
          "hint": "A recurring detail that ties the whole set together.",
          "placeholder": "e.g. sweat under hot lights",
          "key": "motif",
          "next": "event_show_moment"
        },
        {
          "id": "event_show_moment",
          "type": "short",
          "text": "Which moment can't you miss?",
          "hint": "Know when it's coming so you're already in position.",
          "placeholder": "e.g. the encore",
          "key": "moment",
          "next": "event_candid"
        },
        {
          "id": "event_occasion",
          "type": "short",
          "text": "What's the occasion, in a few words?",
          "hint": "A party, a gala, a launch, an opening…",
          "placeholder": "e.g. a rooftop 40th",
          "key": "what",
          "next": "event_eyes"
        },
        {
          "id": "event_eyes",
          "type": "short",
          "text": "Whose eyes are you telling it through?",
          "hint": "The host, the guest of honor, the guests, even the staff.",
          "placeholder": "e.g. the birthday girl",
          "key": "who",
          "next": "event_theme"
        },
        {
          "id": "event_theme",
          "type": "short",
          "text": "In a few words, what's the theme or energy you want to bottle up?",
          "hint": "You can't script it, so pick the thread you'll follow.",
          "placeholder": "e.g. glamour with a wink",
          "key": "theme",
          "next": "event_planned"
        },
        {
          "id": "event_planned",
          "type": "yesno",
          "text": "Is there a big planned moment, like a toast, a reveal or a cake cutting?",
          "hint": "Say no if it's more of a hang with no real run-of-show.",
          "key": "planned",
          "yes": "event_moment",
          "no": "event_inbetween"
        },
        {
          "id": "event_moment",
          "type": "short",
          "text": "Which moment can't you miss?",
          "hint": "Know when it's coming so you're already in position.",
          "placeholder": "e.g. the surprise toast",
          "key": "moment",
          "next": "event_motif"
        },
        {
          "id": "event_inbetween",
          "type": "short",
          "text": "Then it lives in the in-between. What should you watch for?",
          "placeholder": "e.g. old friends catching up",
          "key": "inbetween",
          "next": "event_motif"
        },
        {
          "id": "event_motif",
          "type": "short",
          "text": "What small detail will you keep coming back to?",
          "hint": "A recurring detail that ties the whole set together.",
          "placeholder": "e.g. string lights",
          "key": "motif",
          "next": "event_candid"
        },
        {
          "id": "event_candid",
          "type": "yesno",
          "text": "Last one: will you stay fly-on-the-wall, with no posing or directing?",
          "hint": "Say no if you'll also grab group shots or quick portraits.",
          "key": "candid",
          "yes": "END",
          "no": "END",
          "yesValue": "fly-on-the-wall",
          "noValue": "mostly candid"
        }
      ],
      "summaries": [
        {
          "when": {
            "stage": true,
            "crowd": true
          },
          "template": "[[{theme}: ]]a[[ {candid}]] look[[ at {what}]], told from the crowd.[[ Keep coming back to {motif}.]][[ Don't miss {moment}.]]"
        },
        {
          "when": {
            "stage": true,
            "crowd": false
          },
          "template": "[[{theme}: ]]a[[ {candid}]] look[[ at {what}]], told from the stage and the wings.[[ Keep coming back to {motif}.]][[ Don't miss {moment}.]]"
        },
        {
          "when": {
            "stage": false,
            "planned": true
          },
          "template": "[[{theme}: ]]a[[ {candid}]] look[[ at {what}]][[, through the eyes of {who}]].[[ Keep coming back to {motif}.]][[ Don't miss {moment}.]]"
        },
        {
          "when": {
            "stage": false,
            "planned": false
          },
          "template": "[[{theme}: ]]a[[ {candid}]] look[[ at {what}]][[, through the eyes of {who}]].[[ Keep coming back to {motif}.]][[ Watch the in-between: {inbetween}.]]"
        },
        {
          "when": {},
          "template": "[[{theme}: ]]event coverage[[ of {what}]][[, through the eyes of {who}]][[, shot {candid}]].[[ Keep coming back to {motif}.]][[ Don't miss {moment}.]][[ Watch the in-between: {inbetween}.]]"
        }
      ]
    },
    {
      "id": "brand",
      "label": "Brand, commercial & content",
      "categories": [
        "branding",
        "commercial",
        "content_shoot"
      ],
      "start": "brand_q1",
      "nodes": [
        {
          "id": "brand_q1",
          "type": "yesno",
          "text": "Should it feel like real life, more than clean shots with one clear star?",
          "hint": "Say no for clean, front-and-center shots.",
          "key": "lifestyle",
          "yes": "brand_scene",
          "no": "brand_hero",
          "categoryText": {
            "branding": "Should it show the brand in real-life moments, not just clean portraits or product shots?",
            "commercial": "Should we see the product in use in real life, not just shot on its own?",
            "content_shoot": "Should the content feel like real life in motion, not clean, posed setups?"
          }
        },
        {
          "id": "brand_scene",
          "type": "short",
          "text": "What everyday moment are we showing?",
          "placeholder": "e.g. lazy sunday mornings",
          "key": "scene",
          "next": "brand_subject",
          "categoryText": {
            "branding": "What real-life moment shows what the brand is about?",
            "commercial": "What moment is the product being used in?",
            "content_shoot": "What everyday moment should the content live in?"
          }
        },
        {
          "id": "brand_hero",
          "type": "short",
          "text": "What should be front and center?",
          "placeholder": "e.g. the new cold brew",
          "key": "hero",
          "next": "brand_subject",
          "categoryText": {
            "branding": "Who or what should be front and center? The founder, the product?",
            "commercial": "Which product, or which detail of it, should be the star?",
            "content_shoot": "What should be front and center in every frame?"
          }
        },
        {
          "id": "brand_subject",
          "type": "short",
          "text": "Who's the client, in a few words?",
          "placeholder": "e.g. a coffee roaster",
          "key": "subject",
          "next": "brand_takeaway",
          "categoryText": {
            "branding": "Whose brand is this, in a few words?",
            "commercial": "Who's the client or product, in a few words?",
            "content_shoot": "Whose feed is this for, in a few words?"
          }
        },
        {
          "id": "brand_takeaway",
          "type": "short",
          "text": "What's the one thing people should take away?",
          "hint": "One idea beats five.",
          "placeholder": "e.g. it's made with care",
          "key": "takeaway",
          "next": "brand_audience",
          "categoryText": {
            "branding": "What's the one thing people should know about the brand after seeing these?",
            "commercial": "What's the one thing a viewer should take away about the product?",
            "content_shoot": "What's the one thing a scroller should get in a second?"
          }
        },
        {
          "id": "brand_audience",
          "type": "short",
          "text": "Who should see it, and where?",
          "hint": "Who they are, plus where they'll see it.",
          "placeholder": "e.g. new moms on Instagram",
          "key": "audience",
          "next": "brand_words",
          "categoryText": {
            "branding": "Who's the dream customer, and where will they see these?",
            "commercial": "Who's the buyer, and where will the ads reach them?",
            "content_shoot": "Who should stop scrolling, and on which app?"
          }
        },
        {
          "id": "brand_words",
          "type": "short",
          "text": "Three words for its personality?",
          "hint": "Adjectives work best.",
          "placeholder": "e.g. warm, bold, honest",
          "key": "words",
          "next": "brand_polish",
          "categoryText": {
            "branding": "Three words for the brand's personality?",
            "commercial": "Three words for how the product should come across?",
            "content_shoot": "Three words for the account's personality?"
          }
        },
        {
          "id": "brand_polish",
          "type": "yesno",
          "text": "Last one: should it look polished and high-end, rather than raw and real?",
          "key": "polish",
          "yes": "END",
          "no": "END",
          "yesValue": "polished",
          "noValue": "raw, natural",
          "categoryText": {
            "commercial": "Last one: should it look glossy and high-end, rather than raw and real?",
            "content_shoot": "Last one: should it look polished, rather than raw and shot-on-a-phone?"
          }
        }
      ],
      "summaries": [
        {
          "when": {
            "lifestyle": true
          },
          "template": "A[[ {polish}]] lifestyle shoot[[ for {subject}]][[, built around {scene}]][[, aimed at {audience}]].[[ It should feel {words}.]][[ The message: {takeaway}.]]"
        },
        {
          "when": {
            "lifestyle": false
          },
          "template": "A[[ {polish}]] shoot[[ for {subject}]][[, with {hero} front and center]][[, aimed at {audience}]].[[ It should feel {words}.]][[ The message: {takeaway}.]]"
        },
        {
          "when": {},
          "template": "A[[ {polish}]] shoot[[ for {subject}]][[, aimed at {audience}]].[[ It should feel {words}.]][[ The message: {takeaway}.]]"
        }
      ]
    },
    {
      "id": "headshot",
      "label": "Headshot",
      "categories": [
        "headshot"
      ],
      "start": "headshot_q1",
      "nodes": [
        {
          "id": "headshot_q1",
          "type": "yesno",
          "text": "Is this for acting or modeling, like casting and agent submissions?",
          "hint": "Say no for work, business or personal-brand headshots.",
          "key": "acting",
          "yes": "headshot_actor",
          "no": "headshot_who"
        },
        {
          "id": "headshot_actor",
          "type": "short",
          "text": "Who's in front of the camera, in a few words?",
          "placeholder": "e.g. a stage actor in her 20s",
          "key": "who",
          "next": "headshot_roles"
        },
        {
          "id": "headshot_roles",
          "type": "short",
          "text": "What kinds of roles should these get them called in for?",
          "placeholder": "e.g. quirky best-friend roles",
          "key": "roles",
          "next": "headshot_looks"
        },
        {
          "id": "headshot_looks",
          "type": "yesno",
          "text": "Want two looks, a bright commercial one and a moodier theatrical one?",
          "key": "looks",
          "yes": "headshot_words",
          "no": "headshot_words",
          "yesValue": "Two looks: bright commercial and moody theatrical",
          "noValue": "One strong, consistent look"
        },
        {
          "id": "headshot_who",
          "type": "short",
          "text": "What do they do, in a few words?",
          "placeholder": "e.g. a family law attorney",
          "key": "who",
          "next": "headshot_takeaway"
        },
        {
          "id": "headshot_takeaway",
          "type": "short",
          "text": "What should it say about how they work?",
          "hint": "The one thing a client should pick up at a glance.",
          "placeholder": "e.g. they really listen",
          "key": "takeaway",
          "next": "headshot_where"
        },
        {
          "id": "headshot_where",
          "type": "short",
          "text": "Where will it be used?",
          "placeholder": "e.g. LinkedIn and their site",
          "key": "where",
          "next": "headshot_setting"
        },
        {
          "id": "headshot_setting",
          "type": "yesno",
          "text": "Should it be on a clean backdrop, rather than in their own space?",
          "hint": "Their own space means their office, studio, shop, wherever they work.",
          "key": "setting",
          "yes": "headshot_polish",
          "no": "headshot_polish",
          "yesValue": "on a clean backdrop",
          "noValue": "in their own space"
        },
        {
          "id": "headshot_polish",
          "type": "yesno",
          "text": "Should it feel classic and polished, rather than relaxed and natural?",
          "key": "polish",
          "yes": "headshot_words",
          "no": "headshot_words",
          "yesValue": "classic, polished",
          "noValue": "relaxed, natural"
        },
        {
          "id": "headshot_words",
          "type": "short",
          "text": "Last one: three words for how they should come across?",
          "placeholder": "e.g. warm, sharp, wry",
          "key": "words",
          "next": "END"
        }
      ],
      "summaries": [
        {
          "when": {
            "acting": true
          },
          "template": "Casting headshots[[ for {who}]][[, to land {roles}]].[[ {looks}.]][[ They should come across {words}.]]"
        },
        {
          "when": {
            "acting": false
          },
          "template": "A[[ {polish}]] headshot[[ for {who}]][[, {setting}]].[[ It should say {takeaway}.]][[ They should come across {words}.]][[ Made for {where}.]]"
        },
        {
          "when": {},
          "template": "A[[ {polish}]] headshot[[ for {who}]].[[ They should come across {words}.]]"
        }
      ]
    },
    {
      "id": "publicity",
      "label": "Publicity",
      "categories": [
        "publicity"
      ],
      "start": "publicity_q1",
      "nodes": [
        {
          "id": "publicity_q1",
          "type": "yesno",
          "text": "Is this for a specific release or announcement?",
          "hint": "Like an album, a book, a film, a tour or an opening.",
          "key": "release",
          "yes": "publicity_news",
          "no": "publicity_who"
        },
        {
          "id": "publicity_news",
          "type": "short",
          "text": "What's being announced, in a few words?",
          "placeholder": "e.g. her debut album",
          "key": "news",
          "next": "publicity_who"
        },
        {
          "id": "publicity_who",
          "type": "short",
          "text": "Who's in the spotlight, in a few words?",
          "placeholder": "e.g. an indie folk singer",
          "key": "who",
          "next": "publicity_scene"
        },
        {
          "id": "publicity_scene",
          "type": "yesno",
          "text": "Should we put them in a scene, rather than on a simple backdrop?",
          "hint": "A scene builds a world around them. A backdrop keeps it all about them.",
          "key": "scene",
          "yes": "publicity_world",
          "no": "publicity_takeaway"
        },
        {
          "id": "publicity_world",
          "type": "short",
          "text": "Where are we, in a few words?",
          "hint": "A place, a time, a world.",
          "placeholder": "e.g. a smoky jazz club",
          "key": "world",
          "next": "publicity_takeaway"
        },
        {
          "id": "publicity_takeaway",
          "type": "short",
          "text": "At a glance, what should these photos say?",
          "placeholder": "e.g. this era is darker",
          "key": "takeaway",
          "next": "publicity_words"
        },
        {
          "id": "publicity_words",
          "type": "short",
          "text": "Three words for their public persona?",
          "placeholder": "e.g. witty, magnetic, strange",
          "key": "words",
          "next": "publicity_polish"
        },
        {
          "id": "publicity_polish",
          "type": "yesno",
          "text": "Last one: should it look glossy and polished, rather than raw and lived-in?",
          "key": "polish",
          "yes": "END",
          "no": "END",
          "yesValue": "polished",
          "noValue": "raw, lived-in"
        }
      ],
      "summaries": [
        {
          "when": {
            "scene": true
          },
          "template": "[[{polish} ]]press photos[[ of {who}]][[ for {news}]][[, set in {world}]].[[ At a glance: {takeaway}.]][[ Their persona: {words}.]]"
        },
        {
          "when": {
            "scene": false
          },
          "template": "[[{polish} ]]press portraits[[ of {who}]][[ for {news}]], on a simple backdrop.[[ At a glance: {takeaway}.]][[ Their persona: {words}.]]"
        },
        {
          "when": {},
          "template": "[[{polish} ]]press photos[[ of {who}]][[ for {news}]].[[ At a glance: {takeaway}.]][[ Their persona: {words}.]]"
        }
      ]
    },
    {
      "id": "video",
      "label": "Video",
      "categories": [
        "video"
      ],
      "start": "video_q1",
      "nodes": [
        {
          "id": "video_q1",
          "type": "yesno",
          "text": "Is this video telling a story, with a character and something happening to them?",
          "hint": "Narrative music videos count. Say no for promos, recaps or behind-the-scenes.",
          "key": "narrative",
          "yes": "video_who",
          "no": "video_promo"
        },
        {
          "id": "video_who",
          "type": "short",
          "text": "Who's the story about, in a few words?",
          "placeholder": "e.g. a retired boxer",
          "key": "character",
          "next": "video_doing"
        },
        {
          "id": "video_doing",
          "type": "short",
          "text": "What are they doing when we first meet them?",
          "placeholder": "e.g. closing up his old gym",
          "key": "situation",
          "next": "video_arc"
        },
        {
          "id": "video_arc",
          "type": "yesno",
          "text": "Does something happen that changes things by the end?",
          "hint": "Say no if it's more of a vibe that lives in one moment.",
          "key": "arc",
          "yes": "video_turn",
          "no": "video_image"
        },
        {
          "id": "video_turn",
          "type": "short",
          "text": "What changes things? Finish this: “until…”",
          "placeholder": "e.g. a kid asks for lessons",
          "key": "turn",
          "next": "video_setting"
        },
        {
          "id": "video_image",
          "type": "short",
          "text": "What's the one image that sums up the whole vibe?",
          "placeholder": "e.g. gloves hanging on a nail",
          "key": "image",
          "next": "video_setting"
        },
        {
          "id": "video_setting",
          "type": "short",
          "text": "Where's it set?",
          "hint": "A real spot or just the kind of place.",
          "placeholder": "e.g. a small rust-belt town",
          "key": "setting",
          "next": "video_feel"
        },
        {
          "id": "video_feel",
          "type": "short",
          "text": "In a few words, how should it feel?",
          "placeholder": "e.g. bittersweet and hopeful",
          "key": "feeling",
          "next": "video_words"
        },
        {
          "id": "video_words",
          "type": "yesno",
          "text": "Last one: will it be mostly wordless, carried by visuals, music and sound?",
          "hint": "Say no if people talk it through on camera.",
          "key": "dialogue",
          "yes": "END",
          "no": "END",
          "yesValue": "mostly wordless",
          "noValue": "dialogue-driven"
        },
        {
          "id": "video_promo",
          "type": "yesno",
          "text": "Is it promoting something, like a brand, product, song or event?",
          "hint": "Say no if it's more of a mini-doc, recap or behind-the-scenes piece.",
          "key": "promo",
          "yes": "video_product",
          "no": "video_subject"
        },
        {
          "id": "video_product",
          "type": "short",
          "text": "What's it promoting, in a few words?",
          "placeholder": "e.g. a local coffee roaster",
          "key": "product",
          "next": "video_audience"
        },
        {
          "id": "video_audience",
          "type": "short",
          "text": "Who needs to see it?",
          "placeholder": "e.g. young creatives",
          "key": "audience",
          "next": "video_message"
        },
        {
          "id": "video_message",
          "type": "short",
          "text": "If they only remember one thing, what is it?",
          "placeholder": "e.g. it's roasted fresh daily",
          "key": "message",
          "next": "video_tone"
        },
        {
          "id": "video_tone",
          "type": "short",
          "text": "In a few words, what's the tone?",
          "placeholder": "e.g. warm and cheeky",
          "key": "tone",
          "next": "video_platform"
        },
        {
          "id": "video_platform",
          "type": "short",
          "text": "Where will it mostly play?",
          "hint": "This decides the shape: vertical, square or wide.",
          "placeholder": "e.g. Instagram reels",
          "key": "platform",
          "next": "video_hook"
        },
        {
          "id": "video_hook",
          "type": "short",
          "text": "Last one: what's the opening shot that hooks people in the first seconds?",
          "placeholder": "e.g. a slow-mo espresso pour",
          "key": "hook",
          "next": "END"
        },
        {
          "id": "video_subject",
          "type": "short",
          "text": "What's it capturing, in a few words?",
          "placeholder": "e.g. a day in a family bakery",
          "key": "subject",
          "next": "video_style"
        },
        {
          "id": "video_style",
          "type": "yesno",
          "text": "Will you mostly follow along as things happen, without directing?",
          "hint": "Say no if you'll stage or re-create some scenes.",
          "key": "style",
          "yes": "video_focus",
          "no": "video_focus",
          "yesValue": "shot fly-on-the-wall",
          "noValue": "lightly directed"
        },
        {
          "id": "video_focus",
          "type": "short",
          "text": "What should it keep coming back to?",
          "hint": "The thread or theme that ties it all together.",
          "placeholder": "e.g. three generations at work",
          "key": "focus",
          "next": "video_doc_moment"
        },
        {
          "id": "video_doc_moment",
          "type": "short",
          "text": "What's one moment you can't miss?",
          "placeholder": "e.g. the first loaf of the day",
          "key": "moment",
          "next": "video_doc_feel"
        },
        {
          "id": "video_doc_feel",
          "type": "short",
          "text": "Last one: in a few words, how should it feel?",
          "placeholder": "e.g. cozy and unhurried",
          "key": "feeling",
          "next": "END"
        }
      ],
      "summaries": [
        {
          "when": {
            "narrative": true,
            "arc": true
          },
          "template": "A[[ {dialogue}]] short film[[ about {character}]][[, caught {situation}]][[, until {turn}]][[, set in {setting}]].[[ It should feel {feeling}.]]"
        },
        {
          "when": {
            "narrative": true,
            "arc": false
          },
          "template": "A[[ {dialogue}]] mood piece[[ about {character}]][[, caught {situation}]][[, set in {setting}]].[[ It lingers on {image}.]][[ It should feel {feeling}.]]"
        },
        {
          "when": {
            "narrative": false,
            "promo": true
          },
          "template": "[[{tone}: ]]a promo[[ for {product}]][[, aimed at {audience}]][[ on {platform}]].[[ It opens on {hook}.]][[ The message: {message}.]]"
        },
        {
          "when": {
            "narrative": false,
            "promo": false
          },
          "template": "[[{feeling}: ]]a mini-doc[[ capturing {subject}]][[, {style}]].[[ It keeps coming back to {focus}.]][[ Don't miss {moment}.]]"
        },
        {
          "when": {},
          "template": "A video[[ about {character}]][[ for {product}]][[ capturing {subject}]].[[ It should feel {feeling}.]][[ It should feel {tone}.]]"
        }
      ]
    },
    {
      "id": "lighting",
      "label": "Lighting test",
      "categories": [
        "lighting_test"
      ],
      "start": "lighting_q1",
      "nodes": [
        {
          "id": "lighting_q1",
          "type": "yesno",
          "text": "Are you comparing a few lighting setups side by side?",
          "hint": "Say no if you're dialing in one specific look.",
          "key": "multi",
          "yes": "lighting_compare",
          "no": "lighting_look"
        },
        {
          "id": "lighting_look",
          "type": "short",
          "text": "What's the look you're testing?",
          "placeholder": "e.g. hard window light",
          "key": "look",
          "next": "lighting_learn"
        },
        {
          "id": "lighting_learn",
          "type": "short",
          "text": "Finish this: I want to figure out…",
          "placeholder": "e.g. how deep the shadows can go",
          "key": "learn",
          "next": "lighting_mood"
        },
        {
          "id": "lighting_compare",
          "type": "short",
          "text": "Which setups are you comparing?",
          "placeholder": "e.g. softbox vs. bare bulb",
          "key": "compare",
          "next": "lighting_learn_compare"
        },
        {
          "id": "lighting_learn_compare",
          "type": "short",
          "text": "Finish this: I want to figure out…",
          "placeholder": "e.g. which one flatters skin",
          "key": "learn",
          "next": "lighting_mood"
        },
        {
          "id": "lighting_mood",
          "type": "short",
          "text": "In a few words, what mood should the light create?",
          "placeholder": "e.g. gritty and noir",
          "key": "mood",
          "next": "lighting_has_ref"
        },
        {
          "id": "lighting_has_ref",
          "type": "yesno",
          "text": "Do you have a reference image or photographer in mind?",
          "key": "hasRef",
          "yes": "lighting_ref",
          "no": "lighting_sitter"
        },
        {
          "id": "lighting_ref",
          "type": "short",
          "text": "Who or what's the reference?",
          "placeholder": "e.g. Peter Lindbergh portraits",
          "key": "ref",
          "next": "lighting_sitter"
        },
        {
          "id": "lighting_sitter",
          "type": "yesno",
          "text": "Last one: will a real person be sitting in for it?",
          "hint": "Say no if you're using a stand-in or a mannequin.",
          "key": "sitter",
          "yes": "END",
          "no": "END",
          "yesValue": "on a live model",
          "noValue": "on a stand-in"
        }
      ],
      "summaries": [
        {
          "when": {
            "multi": true
          },
          "template": "A side-by-side lighting test[[ of {compare}]][[, shot {sitter}]].[[ It should feel {mood}.]][[ The goal: figure out {learn}.]][[ Think {ref}.]]"
        },
        {
          "when": {
            "multi": false
          },
          "template": "A lighting test[[ of {look}]][[, shot {sitter}]].[[ It should feel {mood}.]][[ The goal: figure out {learn}.]][[ Think {ref}.]]"
        },
        {
          "when": {},
          "template": "A lighting test[[ of {look}]][[ of {compare}]][[, shot {sitter}]].[[ It should feel {mood}.]][[ The goal: figure out {learn}.]]"
        }
      ]
    }
  ];


  function conceptHelperCategory() {
    return document.getElementById('shootCategory').value || '';
  }

  function conceptHelperCategoryLabel() {
    const cat = conceptHelperCategory();
    if (!cat || !CATEGORY_LABELS[cat]) return 'shoot';
    // "editorial shoot", but "test shoot" rather than "test shoot shoot".
    const label = CATEGORY_LABELS[cat].toLowerCase();
    return /\bshoot$/.test(label) ? label : `${label} shoot`;
  }

  function conceptFlowFor(category) {
    return CONCEPT_FLOWS.find(f => f.categories.includes(category))
      || CONCEPT_FLOWS.find(f => f.categories.includes(''))
      || CONCEPT_FLOWS[0];
  }

  function conceptHelperNode(id) {
    return conceptHelper.flow.nodes.find(n => n.id === id) || null;
  }

  // Answers along the path actually taken (history + current), by key — so
  // an answer from a branch the user backed out of never leaks into the
  // summary.
  function conceptHelperAnswers() {
    const out = {};
    [...conceptHelper.history, conceptHelper.nodeId].forEach(id => {
      const node = id && conceptHelperNode(id);
      if (node && Object.prototype.hasOwnProperty.call(conceptHelper.answers, id)) out[node.key] = conceptHelper.answers[id];
    });
    return out;
  }

  function conceptHelperFill(template, answers) {
    const value = (key) => {
      if (key === 'category') return conceptHelperCategoryLabel();
      const v = answers[key];
      if (typeof v !== 'string') return '';
      return v.trim().replace(/[.!?…]+$/, '');
    };
    let text = template.replace(/\[\[([\s\S]*?)\]\]/g, (_, inner) => {
      const keys = [...inner.matchAll(/\{(\w+)\}/g)].map(m => m[1]);
      return keys.every(k => value(k)) ? inner : '';
    });
    text = text.replace(/\{(\w+)\}/g, (_, k) => value(k));
    text = text.replace(/\s+/g, ' ').replace(/\s+([,.;:!?])/g, '$1').replace(/([,;:])\1+/g, '$1')
      .replace(/,\s*\./g, '.').replace(/…\./g, '.').replace(/\.{2,}/g, '.').trim();
    if (!text) return '';
    text = text.charAt(0).toUpperCase() + text.slice(1);
    if (!/[.!?]$/.test(text)) text += '.';
    return text;
  }

  function conceptHelperSummaryText() {
    const answers = conceptHelperAnswers();
    const match = conceptHelper.flow.summaries.find(sum => Object.entries(sum.when || {})
      .every(([key, val]) => answers[key] === val));
    return match ? conceptHelperFill(match.template, answers) : '';
  }

  function updateConceptHelperCount() {
    const len = document.getElementById('conceptHelperSummary').value.trim().length;
    const count = document.getElementById('conceptHelperCount');
    const over = len > conceptHelperMax();
    count.textContent = over
      ? `${len}/${conceptHelperMax()} — trim a little to fit the Concept box`
      : `${len}/${conceptHelperMax()}`;
    count.classList.toggle('over', over);
    document.getElementById('conceptHelperUseBtn').disabled = over || len === 0;
  }

  function renderConceptHelper() {
    const h = conceptHelper;
    const show = (id, on) => { document.getElementById(id).hidden = !on; };
    const input = document.getElementById('conceptHelperInput');
    if (h.ended) {
      document.getElementById('conceptHelperStep').textContent = '';
      document.getElementById('conceptHelperTitle').textContent = "Here's your concept";
      document.getElementById('conceptHelperText').textContent = 'Change anything you like, then use it as your concept or write your own.';
      show('conceptHelperHint', false);
      show('conceptHelperInput', false);
      show('conceptHelperSummary', true);
      show('conceptHelperCount', true);
      show('conceptHelperYesNo', false);
      show('conceptHelperNextRow', false);
      show('conceptHelperEndRow', true);
      show('conceptHelperBackBtn', true);
      show('conceptHelperRestartBtn', true);
      updateConceptHelperCount();
      return;
    }
    const node = conceptHelperNode(h.nodeId);
    const cat = conceptHelperCategory();
    const text = (node.categoryText && node.categoryText[cat]) || node.text;
    document.getElementById('conceptHelperStep').textContent = `Question ${h.history.length + 1}`;
    document.getElementById('conceptHelperTitle').textContent = "Let's think it through";
    document.getElementById('conceptHelperText').textContent = text.replace(/\{category\}/g, conceptHelperCategoryLabel());
    const hint = document.getElementById('conceptHelperHint');
    hint.textContent = node.hint || '';
    show('conceptHelperHint', !!node.hint);
    const isShort = node.type === 'short';
    show('conceptHelperInput', isShort);
    show('conceptHelperSummary', false);
    show('conceptHelperCount', false);
    show('conceptHelperYesNo', !isShort);
    show('conceptHelperNextRow', isShort);
    show('conceptHelperEndRow', false);
    show('conceptHelperBackBtn', h.history.length > 0);
    show('conceptHelperRestartBtn', false);
    if (isShort) {
      input.placeholder = node.placeholder || '';
      const prev = h.answers[h.nodeId];
      input.value = typeof prev === 'string' ? prev : '';
    }
  }

  function goConceptHelper(nextId) {
    const h = conceptHelper;
    h.history.push(h.nodeId);
    if (!nextId || nextId === 'END' || !conceptHelperNode(nextId)) {
      h.ended = true;
      document.getElementById('conceptHelperSummary').value = conceptHelperSummaryText();
    } else {
      h.nodeId = nextId;
    }
    renderConceptHelper();
  }

  function openConceptHelper() {
    if (!CONCEPT_FLOWS.length) return;
    const flow = conceptFlowFor(conceptHelperCategory());
    conceptHelper = { flow, nodeId: flow.start, history: [], answers: {}, ended: false };
    renderConceptHelper();
    document.getElementById('conceptHelperOverlay').hidden = false;
  }

  function closeConceptHelper() {
    document.getElementById('conceptHelperOverlay').hidden = true;
    conceptHelper = null;
  }

  document.getElementById('conceptHelperBtn').addEventListener('click', openConceptHelper);

  document.getElementById('conceptHelperYesBtn').addEventListener('click', () => {
    if (!conceptHelper || conceptHelper.ended) return;
    const node = conceptHelperNode(conceptHelper.nodeId);
    conceptHelper.answers[node.id] = node.yesValue !== undefined ? node.yesValue : true;
    goConceptHelper(node.yes);
  });

  document.getElementById('conceptHelperNoBtn').addEventListener('click', () => {
    if (!conceptHelper || conceptHelper.ended) return;
    const node = conceptHelperNode(conceptHelper.nodeId);
    conceptHelper.answers[node.id] = node.noValue !== undefined ? node.noValue : false;
    goConceptHelper(node.no);
  });

  function nextConceptHelperShort() {
    if (!conceptHelper || conceptHelper.ended) return;
    const node = conceptHelperNode(conceptHelper.nodeId);
    if (node.type !== 'short') return;
    // Blank is fine — that part of the summary is simply left out.
    conceptHelper.answers[node.id] = document.getElementById('conceptHelperInput').value.trim();
    goConceptHelper(node.next);
  }

  document.getElementById('conceptHelperNextBtn').addEventListener('click', nextConceptHelperShort);

  document.getElementById('conceptHelperInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); nextConceptHelperShort(); }
  });

  document.getElementById('conceptHelperBackBtn').addEventListener('click', () => {
    const h = conceptHelper;
    if (!h || !h.history.length) return;
    h.nodeId = h.history.pop();
    h.ended = false;
    renderConceptHelper();
  });

  document.getElementById('conceptHelperRestartBtn').addEventListener('click', () => {
    if (!conceptHelper) return;
    const flow = conceptHelper.flow;
    conceptHelper = { flow, nodeId: flow.start, history: [], answers: {}, ended: false };
    renderConceptHelper();
  });

  document.getElementById('conceptHelperSummary').addEventListener('input', updateConceptHelperCount);

  // Fills the Concept field (the real one — on the wizard slide it's typed
  // into directly) and lets the form's own input listener save it.
  document.getElementById('conceptHelperUseBtn').addEventListener('click', () => {
    const text = document.getElementById('conceptHelperSummary').value.trim();
    if (!text || text.length > conceptHelperMax()) return;
    const premise = document.getElementById('shootPremise');
    if (hasText(premise.value) && premise.value.trim() !== text
      && !confirm('Replace what\'s already in Concept with this?')) return;
    premise.value = text;
    premise.dispatchEvent(new Event('input', { bubbles: true }));
    syncFieldFilledState(premise);
    closeConceptHelper();
  });

  // "Now that you've got it": back to the slide with the Concept box ready.
  document.getElementById('conceptHelperWriteBtn').addEventListener('click', () => {
    closeConceptHelper();
    const premise = document.getElementById('shootPremise');
    if (!premise.readOnly) premise.focus();
  });

  document.getElementById('conceptHelperCloseBtn').addEventListener('click', closeConceptHelper);

  document.getElementById('shootWizardDontShowBtn').addEventListener('click', () => {
    setNewShootGuideOn(false);
    endShootWizard();
    document.getElementById('shootWizardOffOverlay').hidden = false;
  });

  document.getElementById('shootWizardOffOkBtn').addEventListener('click', () => {
    document.getElementById('shootWizardOffOverlay').hidden = true;
  });

  // See queueShootWizard. animationend bubbles up from animated things inside
  // the modal too, so only the modal's own slide-in counts.
  shootModalOverlay.querySelector('.modal').addEventListener('animationend', (e) => {
    if (e.target === e.currentTarget && shootWizardPendingId) startQueuedShootWizard();
  });

  // iOS scrolls a focused field into view before the keyboard has finished
  // shrinking the visible area (and the card with it, see
  // syncShootWizardViewport), which can leave it under the keyboard — so
  // once more after that resize. Same pattern as renderShotList's.
  document.getElementById('shootWizardBody').addEventListener('focusin', (e) => {
    const field = e.target;
    if (!window.visualViewport) return;
    if (!field.matches('textarea, input:not([type="checkbox"]):not([type="radio"]):not([type="file"])')) return;
    window.visualViewport.addEventListener('resize', () => {
      if (shootWizardActive && document.activeElement === field) field.scrollIntoView({ block: 'nearest' });
    }, { once: true });
  });

  // Updates the sticky title to name whichever section has scrolled past
  // the header, so it always reads as "where am I" rather than a static
  // label — falls back to the original Edit/Log-a-Shoot title at the very
  // top, before any section has passed underneath the header yet.
  function updateShootModalTitleFromScroll() {
    const modalEl = shootModalOverlay.querySelector('.modal');
    const containerRect = modalEl.getBoundingClientRect();
    const header = document.querySelector('.shoot-modal-header');
    const headerOffset = header ? header.getBoundingClientRect().bottom - containerRect.top : 0;
    let active = null;
    SHOOT_MODAL_SECTIONS.forEach(sec => {
      const el = document.getElementById(sec.id);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return;
      if (rect.top - containerRect.top <= headerOffset + 2) active = sec;
    });
    document.getElementById('shootModalTitle').textContent = active ? active.label : shootModalBaseTitle;
  }

  shootModalOverlay.querySelector('.modal').addEventListener('scroll', updateShootModalTitleFromScroll, { passive: true });

  function openShootModal(id) {
    // Hands back any fields a wizard still has borrowed — only possible after
    // a path that hid the overlay without closeShootModal (Delete, Complete,
    // Unarchive) — before anything below repopulates or measures them.
    endShootWizard({ closing: true });
    closeStatsDetail();
    editingShootId = id;
    const s = id ? state.shoots.find(x => x.id === id) : null;
    currentShootId = id || uid();
    pendingProjectPhoto = s ? (s.projectPhoto || null) : null;
    // s.projectPhoto is only set once hydratePhotos()'s IndexedDB reads
    // resolve, which happens once at boot — opening a shoot before its own
    // read lands here leaves this seeded empty even though it has a saved
    // photo. Double-checked directly (bypassing the boot-time hydration
    // race entirely) so a talent added in the same session doesn't get
    // auto-claimed as the cover over an existing one it just hasn't seen
    // yet. Guarded against a since-closed/reopened modal.
    if (s && !s.projectPhoto) {
      const shootId = s.id;
      idbGetImages(projectPhotoKey(shootId)).then(entries => {
        const src = photoFromEntries(entries);
        if (!src || currentShootId !== shootId) return;
        // By id, not the captured `s` — an autosave since opening replaces
        // the shoot object, which would leave `s` an orphan.
        const live = state.shoots.find(x => x.id === shootId);
        if (live && !live.projectPhoto) live.projectPhoto = src;
        pendingProjectPhoto = src;
      }).catch(() => {});
    }
    shootHasImages = false;

    shootModalBaseTitle = s ? 'Edit Shoot' : randomNewShootTitle();
    document.getElementById('shootModalTitle').textContent = shootModalBaseTitle;
    closeShootModalJumpMenu();
    document.getElementById('deleteShootBtn').hidden = !s;
    document.getElementById('shareShootBtn').hidden = !s;
    const isArchived = s ? !!s.archived : false;
    document.getElementById('saveShootBtn').hidden = isArchived;
    document.getElementById('saveShootBtn').textContent = pickRandomSaveMessage();
    document.getElementById('unarchiveShootBtn').hidden = !isArchived;
    document.getElementById('completeShootBtn').hidden = !s || isArchived || s.status !== 'delivered';

    document.getElementById('shootTitle').value = s ? (s.title || '') : '';
    // Options depend on category (video swaps in its own edit steps), and the
    // category select isn't populated until further down, so the category is
    // read straight off the shoot here.
    renderShootStatusSelectOptions(s ? (s.category || '') : '', s ? (s.status || 'prospect') : 'prospect');
    previousStatusValue = document.getElementById('shootStatus').value;
    categoryRemap = null;
    updateStatusSwatchDisplay();
    updateEnterShootModeBtnVisibility();
    document.getElementById('shootDate').value = s ? (s.date || '') : '';
    document.getElementById('shootDeadline').value = s ? (s.deadline || '') : '';
    document.getElementById('shootStartTime').value = s ? (s.startTime || '') : '';
    document.getElementById('shootEndTime').value = s ? (s.endTime || '') : '';
    document.getElementById('shootCrewCallTime').value = s ? (s.crewCallTime || '') : '';
    document.getElementById('shootTalentCallTime').value = s ? (s.talentCallTime || '') : '';
    // Built from saved project membership (never from form data), so it has
    // to come after currentShootId is set above; a brand-new draft just gets
    // a fresh unticked row with Last day hidden.
    updateMultiDayRow();
    currentShootLocation = s ? normalizeLocation(s.location) : { name: '', street: '', city: '', state: '', zip: '', country: state.defaultCountry || '' };
    updateLocationBtnDisplay();
    // Talents saved before they had ids get one assigned on load — needed as
    // a stable IndexedDB key for their photo (see talentPhotoKey).
    currentTalents = s && Array.isArray(s.talents)
      ? s.talents.map(t => ({ id: t.id || uid(), name: t.name || '', socialHandles: (t.socialHandles || []).map(sh => ({ ...sh })), photo: t.photo || '' }))
      : [];
    // Same safety net as the cover above: a talent whose photo hasn't reached
    // memory yet would show a blank card here and then have that blank saved
    // back over the in-memory talent on the next autosave. Only talents that
    // already had a saved id can have a stored photo to find.
    if (s) {
      const shootId = s.id;
      const savedTalentIds = new Set((s.talents || []).filter(t => t.id).map(t => t.id));
      currentTalents.forEach(ct => {
        if (ct.photo || !savedTalentIds.has(ct.id)) return;
        idbGetImages(talentPhotoKey(shootId, ct.id)).then(entries => {
          const src = photoFromEntries(entries);
          if (!src || currentShootId !== shootId) return;
          const cur = currentTalents.find(x => x.id === ct.id);
          if (cur && !cur.photo) { cur.photo = src; renderTalents(); }
        }).catch(() => {});
      });
    }
    renderTalents();
    document.getElementById('shootCategory').value = s ? (s.category || '') : '';
    updateCategoryTierUI();
    document.getElementById('shootPremise').value = s ? (s.premise || '') : '';
    document.getElementById('shootCharacter').value = s ? (s.character || '') : '';
    document.getElementById('shootWorldNotes').value = s ? (s.worldNotes || '') : '';
    document.getElementById('shootGoals').value = s ? (s.shootGoals || '') : '';
    document.getElementById('shootElevatorPitch').value = s ? (s.elevatorPitch || '') : '';
    document.getElementById('shootDeliverables').value = s ? (s.deliverables || '') : '';
    document.getElementById('shootDeliverableDestinations').value = s ? (s.deliverableDestinations || '') : '';
    const savedAspectRatios = s ? normalizeAspectRatios(s.aspectRatios) : [];
    document.querySelectorAll('#shootAspectRatios input[type="checkbox"]').forEach(cb => {
      cb.checked = savedAspectRatios.includes(cb.value);
    });
    initProgressiveReveal(s);
    document.getElementById('shootMoodboardComplete').checked = s ? !!s.moodboardComplete : false;
    // Also sets the Mood board/Storyboard wording (incl. the complete
    // checkbox label) and hides Final images for video.
    updateVideoCategoryUI();
    updateMoodboardCompleteVisibility();
    currentReferences = s && Array.isArray(s.references) ? [...s.references] : [];
    renderReferences();
    document.getElementById('shootWentRight').value = s ? (s.whatWentRight || '') : '';
    document.getElementById('shootCouldBeBetter').value = s ? (s.couldBeBetter || '') : '';
    document.getElementById('shootLessonsLearned').value = s ? (s.lessonsLearned || '') : '';
    document.getElementById('shootTalentDirections').value = s ? (s.talentDirections || '') : '';
    document.getElementById('shootTeamDirections').value = s ? (s.teamDirections || '') : '';
    document.getElementById('shootShootingNotes').value = s ? (s.shootingNotes || '') : '';
    document.getElementById('shootLocationDirections').value = s ? (s.locationDirections || '') : '';
    currentShotList = s && Array.isArray(s.shotList) ? s.shotList.map(item => ({ ...item })) : [];
    renderShotList();
    // Old-shaped setups (a single free-text checklist row, pre-redesign) map
    // their text into the new description field rather than losing it — name
    // and characteristics start blank since neither existed before.
    currentLightingSetups = s && Array.isArray(s.lightingSetups)
      ? s.lightingSetups.map(item => ({
          id: item.id || uid(),
          name: item.name || '',
          characteristics: item.characteristics || '',
          description: item.description !== undefined ? item.description : (item.text || ''),
        }))
      : [];
    renderLightingSetups();

    const teamRequired = s ? (s.teamRequired || '') : '';
    document.getElementById('teamRequiredYes').checked = teamRequired === 'yes';
    document.getElementById('teamRequiredNo').checked = teamRequired === 'no';
    document.getElementById('shootTeamFinalized').checked = s ? !!s.teamFinalized : false;
    updateTeamFinalizedLabel();
    updateTeamRequiredUI();
    currentTeamMembers = s && s.teamMembers ? s.teamMembers.map(tm => ({ ...tm })) : [];
    renderTeamMembers();

    renderShootFrameworkTags(s);
    applyShootFormCollapseState();

    document.getElementById('postShootContent').hidden = !isPostCaptureStatus(previousStatusValue);
    document.getElementById('postShootPromptOverlay').hidden = true;
    updateShootModalJumpMenuVisibility();

    renderMoodboard();
    renderFinalImages();
    // Everything above is populated by now — a saved field should read as
    // written the instant the modal opens, not only after it's touched again.
    syncAllShootFormFields();
    // Without this, a swipe that starts anywhere in the modal that isn't
    // itself a scrollable element (e.g. the header, or blank space around a
    // short pane) can fall through and scroll the page underneath, which is
    // still there and still scrollable behind the fixed overlay.
    if (shootModalOverlay.hidden) lockBodyScroll();
    shootModalOverlay.hidden = false;
    // Only a brand-new shoot (the "+ New Shoot" buttons pass null) gets the
    // planning wizard. Its first slide covers the status button, so it takes
    // over from the one-time status intro there; an id that no longer
    // resolves to a shoot keeps the intro, as before.
    // Turned off (first slide's "Don't show again", or the app menu), a new
    // shoot opens straight to the page, with the status intro as before.
    if (!id && isNewShootGuideOn()) queueShootWizard();
    else if (!s) maybeShowStatusSwatchIntro();

    const modalEl = shootModalOverlay.querySelector('.modal');
    const savedScroll = (id && shootScrollPositions[id]) || 0;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        modalEl.scrollTop = snapScrollTarget(savedScroll, modalEl);
        updateShootModalTitleFromScroll();
        // renderShotList() ran further up, while the overlay was still hidden,
        // so every row measured zero and kept its one-line default — a saved
        // multi-line shot would open clipped. This is the first frame where the
        // rows actually have layout, so it's the first chance to size them.
        autoSizeAllListTextareas();
        // syncAllShootFormFields() ran earlier too, for the exact same reason
        // — every readonly notes field (Location directions, Character,
        // reflection fields, etc.) that had real content measured zero height
        // and was left at its bare rows="N" size, silently clipping whatever
        // didn't fit. autoSizeTextarea itself is idempotent, so re-running the
        // whole sync here is cheap and catches every field at once rather
        // than needing a bespoke re-measure per field.
        syncAllShootFormFields();
      });
    });
  }

  function renderMoodboard() {
    const grid = document.getElementById('moodboardGrid');
    grid.innerHTML = '';
    idbGetImages(currentShootId).then(images => {
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
        btn.addEventListener('click', () => {
          if (!confirm("Delete this photo? This can't be undone.")) return;
          const shootId = currentShootId;
          idbGetImages(shootId).then(imgs => {
            imgs.splice(Number(btn.dataset.idx), 1);
            return idbSetImages(shootId, imgs);
          }).then(() => {
            renderMoodboard();
            onShootImagesChanged(shootId, { board: true });
          });
        });
      });
      grid.querySelectorAll('.moodboard-thumb img').forEach(imgEl => {
        imgEl.addEventListener('click', () => {
          openImageViewer(images, Number(imgEl.dataset.idx), currentShootId, renderMoodboard);
        });
      });
    }).catch(() => { grid.innerHTML = ''; });
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
    const uploadShootId = currentShootId;
    const stillOpen = () => currentShootId === uploadShootId && !shootModalOverlay.hidden;
    let coverSet = false;
    Promise.all(files.map(f => resizeImageFile(f, 1280, 0.72)))
      .then(newImages => {
        // A never-saved draft that was closed in the meantime is gone (its
        // rows were cleared on close) — don't leave orphaned photos behind.
        if (!stillOpen() && !state.shoots.some(x => x.id === uploadShootId)) return null;
        return idbGetImages(uploadShootId).then(existing => {
          const savedShoot = state.shoots.find(x => x.id === uploadShootId);
          const hasCover = stillOpen() ? !!pendingProjectPhoto : !!(savedShoot && savedShoot.projectPhoto);
          const shouldAutoSetProjectPhoto = existing.length === 0 && !hasCover && newImages.length > 0;
          const combined = existing.concat(newImages.map(src => ({ src, caption: '' })));
          return idbSetImages(uploadShootId, combined).then(() => {
            if (shouldAutoSetProjectPhoto) {
              return resizeDataUrlThumb(newImages[0], 200, 0.6).then(thumb => {
                coverSet = true;
                if (stillOpen()) pendingProjectPhoto = thumb;
                else {
                  const live = state.shoots.find(x => x.id === uploadShootId);
                  if (live) live.projectPhoto = thumb;
                }
                return savePhotoToIdb(projectPhotoKey(uploadShootId), thumb);
              });
            }
          }).then(() => true);
        });
      })
      .then((uploaded) => {
        if (!uploaded) return;
        if (stillOpen()) {
          shootHasImages = true;
          scheduleShootAutosave();
          renderMoodboard();
        } else {
          renderAll();
        }
        onShootImagesChanged(uploadShootId, { board: true, cover: coverSet });
      })
      .catch(() => {});
  });

  // ---------- Image viewer (full-size view, shared by mood board + final images + journal photos) ----------
  const imageViewerOverlay = document.getElementById('imageViewerOverlay');
  const imageViewerImg = document.getElementById('imageViewerImg');
  const imageViewerMenu = document.getElementById('imageViewerMenu');
  const imageViewerMenuBtn = document.getElementById('imageViewerMenuBtn');
  const imageViewerStage = document.getElementById('imageViewerStage');
  const imageViewerCaptionOverlay = document.getElementById('imageViewerCaptionOverlay');
  const imageViewerCaptionText = document.getElementById('imageViewerCaptionText');
  const imageViewerAddCaptionBtn = document.getElementById('imageViewerAddCaptionBtn');
  const imageViewerCaptionInput = document.getElementById('imageViewerCaptionInput');
  let viewerImages = [];
  let viewerIndex = null;
  let viewerStorageKey = null;
  let viewerOnUpdate = null;

  function renderViewerCaption() {
    const img = viewerImages[viewerIndex];
    const caption = (img && img.caption) || '';
    imageViewerCaptionOverlay.hidden = !caption;
    imageViewerCaptionOverlay.classList.remove('caption-faded');
    imageViewerCaptionText.textContent = caption;
    imageViewerAddCaptionBtn.textContent = caption ? 'Edit caption' : '+ Add caption';
    // Captions live in the IndexedDB collection the viewer was opened from, so
    // an image with no collection behind it (a talent photo, stored on the
    // talent object) can't offer them.
    imageViewerAddCaptionBtn.hidden = !viewerStorageKey;
    imageViewerCaptionInput.hidden = true;
  }

  // onUpdate re-renders whichever grid opened the viewer after a caption
  // edit; allowProjectPhoto hides the shoot-only "set as project photo"
  // menu when the viewer is opened from a context with no project photo
  // (e.g. journal entry photos).
  function openImageViewer(images, idx, storageKey, onUpdate, allowProjectPhoto) {
    viewerImages = images;
    viewerIndex = idx;
    viewerStorageKey = storageKey;
    viewerOnUpdate = onUpdate || null;
    imageViewerImg.src = images[idx].src;
    imageViewerMenu.hidden = true;
    imageViewerMenuBtn.hidden = allowProjectPhoto === false;
    renderViewerCaption();
    imageViewerOverlay.hidden = false;
    allowViewportZoom(true);
  }

  // The page's own viewport meta pins maximum-scale=1 (no pinch-zoom
  // anywhere) so an accidental double-tap doesn't zoom the whole app while
  // filling out a form — but that blocks pinch-zoom on a full-screen photo
  // too, e.g. a mood board image in Shoot Mode, where it's exactly what
  // you'd want. Relaxed only while the image viewer is open, restored the
  // moment it closes, so the rest of the app keeps its normal no-zoom feel.
  function allowViewportZoom(allow) {
    const meta = document.querySelector('meta[name="viewport"]');
    if (!meta) return;
    meta.setAttribute(
      'content',
      allow
        ? 'width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=5, interactive-widget=resizes-content'
        : 'width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1, interactive-widget=resizes-content'
    );
  }

  function showViewerImage(idx) {
    if (idx < 0 || idx >= viewerImages.length || idx === viewerIndex) return;
    if (!imageViewerCaptionInput.hidden) saveViewerCaption(imageViewerCaptionInput.value.trim());
    viewerIndex = idx;
    imageViewerImg.src = viewerImages[idx].src;
    renderViewerCaption();
  }

  function saveViewerCaption(newCaption) {
    // No collection key means nothing to write back to (see renderViewerCaption).
    if (!viewerStorageKey) return;
    const key = viewerStorageKey;
    const index = viewerIndex;
    idbGetImages(key).then(imgs => {
      // Opening the caption box and leaving it as it was isn't an edit —
      // nothing to write, and (for a multi-day project) nothing to mirror.
      if (!imgs[index] || (imgs[index].caption || '') === newCaption) {
        renderViewerCaption();
        return;
      }
      imgs[index].caption = newCaption;
      viewerImages = imgs;
      return idbSetImages(key, imgs).then(() => {
        renderViewerCaption();
        if (viewerOnUpdate) viewerOnUpdate();
        // A mood board's key is its shoot id (final images and journal
        // photos use other keys, which onShootImagesChanged ignores).
        onShootImagesChanged(key, { board: true });
      });
    });
  }

  function closeImageViewer() {
    if (!imageViewerCaptionInput.hidden) saveViewerCaption(imageViewerCaptionInput.value.trim());
    imageViewerOverlay.hidden = true;
    imageViewerMenu.hidden = true;
    allowViewportZoom(false);
  }

  document.getElementById('closeImageViewer').addEventListener('click', closeImageViewer);

  document.getElementById('imageViewerMenuBtn').addEventListener('click', () => {
    imageViewerMenu.hidden = !imageViewerMenu.hidden;
  });

  document.getElementById('setProjectPhotoFromViewer').addEventListener('click', () => {
    const img = viewerImages[viewerIndex];
    if (!img) return;
    imageViewerMenu.hidden = true;
    openProjectPhotoCrop(img.src);
  });

  document.getElementById('deleteImageFromViewer').addEventListener('click', () => {
    imageViewerMenu.hidden = true;
    if (!viewerImages[viewerIndex]) return;
    if (!confirm("Delete this image? This can't be undone.")) return;
    const deletedIndex = viewerIndex;
    const key = viewerStorageKey;
    idbGetImages(key).then(imgs => {
      imgs.splice(deletedIndex, 1);
      return idbSetImages(key, imgs).then(() => imgs);
    }).then(imgs => {
      viewerImages = imgs;
      if (viewerOnUpdate) viewerOnUpdate();
      onShootImagesChanged(key, { board: true });
      if (!imgs.length) {
        closeImageViewer();
        return;
      }
      viewerIndex = Math.min(deletedIndex, imgs.length - 1);
      imageViewerImg.src = imgs[viewerIndex].src;
      renderViewerCaption();
    });
  });

  // ---------- Project photo crop (drag to reposition, slider to zoom) ----------
  const cropOverlay = document.getElementById('projectPhotoCropOverlay');
  const cropStage = document.getElementById('cropStage');
  const cropImg = document.getElementById('cropImg');
  const cropZoomSlider = document.getElementById('cropZoomSlider');
  let cropBaseScale = 1;
  let cropZoom = 1;
  let cropOffsetX = 0;
  let cropOffsetY = 0;
  let cropStageWidth = 0;
  let cropStageHeight = 0;
  let cropDragging = false;
  let cropDragStartX = 0;
  let cropDragStartY = 0;
  let cropDragOffsetStartX = 0;
  let cropDragOffsetStartY = 0;
  const cropActivePointers = new Map();
  let cropPinchPrevDist = 0;
  // Set when the crop is opened from the shoot options kebab menu's project
  // photo picker (no shoot form open to autosave through) — confirming the
  // crop then writes straight to state.shoots by id instead of going through
  // pendingProjectPhoto/scheduleShootAutosave.
  let cropTargetShootId = null;

  // Keeps the image covering the full crop rectangle at all times — the
  // user can zoom in and reposition, but never past an edge into empty space.
  function clampCropOffsets() {
    const dispW = cropImg.naturalWidth * cropBaseScale * cropZoom;
    const dispH = cropImg.naturalHeight * cropBaseScale * cropZoom;
    const minX = Math.min(0, cropStageWidth - dispW);
    const minY = Math.min(0, cropStageHeight - dispH);
    cropOffsetX = Math.min(0, Math.max(minX, cropOffsetX));
    cropOffsetY = Math.min(0, Math.max(minY, cropOffsetY));
  }

  function applyCropTransform() {
    clampCropOffsets();
    cropImg.style.transform = `translate(${cropOffsetX}px, ${cropOffsetY}px) scale(${cropBaseScale * cropZoom})`;
  }

  // 'project' crops to the shoot bubble's thumbnail (96x120, a 4:5 ratio);
  // 'talent' crops to the 4:5 talent card photo box — same ratio, different
  // absolute size. The stage's own ratio comes from CSS, and the base-scale
  // math below measures the live box, so switching modes is just a class
  // swap plus the matching output canvas size.
  let cropMode = 'project';
  const CROP_OUTPUT = {
    project: { width: 192, height: 240 },
    talent: { width: 240, height: 300 },
  };

  function openProjectPhotoCrop(src, mode) {
    cropMode = mode === 'talent' ? 'talent' : 'project';
    cropStage.classList.toggle('crop-stage-talent', cropMode === 'talent');
    document.getElementById('cropModalTitle').textContent =
      cropMode === 'talent' ? 'Crop talent photo' : 'Set cover photo';
    cropZoom = 1;
    cropZoomSlider.value = '1';
    cropActivePointers.clear();
    cropDragging = false;
    cropImg.onload = () => {
      const stageRect = cropStage.getBoundingClientRect();
      cropStageWidth = stageRect.width;
      cropStageHeight = stageRect.height;
      // Base scale matches object-fit:cover — the shorter side fills the rectangle.
      cropBaseScale = Math.max(cropStageWidth / cropImg.naturalWidth, cropStageHeight / cropImg.naturalHeight);
      const dispW = cropImg.naturalWidth * cropBaseScale;
      const dispH = cropImg.naturalHeight * cropBaseScale;
      cropOffsetX = (cropStageWidth - dispW) / 2;
      cropOffsetY = (cropStageHeight - dispH) / 2;
      applyCropTransform();
    };
    cropImg.src = src;
    cropOverlay.hidden = false;
  }

  function closeProjectPhotoCrop() {
    cropOverlay.hidden = true;
    cropTargetShootId = null;
  }

  cropZoomSlider.addEventListener('input', () => {
    cropZoom = Number(cropZoomSlider.value);
    applyCropTransform();
  });

  // Single finger pans; a second finger switches to pinch-to-zoom, anchored
  // on the midpoint between the two touches each frame so the point under
  // your fingers stays put as you zoom (rather than fighting the single-
  // pointer drag math, which is what caused the jitter on a second touch).
  cropStage.addEventListener('pointerdown', (e) => {
    cropActivePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try { cropStage.setPointerCapture(e.pointerId); } catch (err) { /* capture is a nice-to-have, not required */ }

    if (cropActivePointers.size === 1) {
      cropDragging = true;
      cropDragStartX = e.clientX;
      cropDragStartY = e.clientY;
      cropDragOffsetStartX = cropOffsetX;
      cropDragOffsetStartY = cropOffsetY;
    } else if (cropActivePointers.size === 2) {
      cropDragging = false;
      const [p1, p2] = [...cropActivePointers.values()];
      cropPinchPrevDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    }
  });

  cropStage.addEventListener('pointermove', (e) => {
    if (!cropActivePointers.has(e.pointerId)) return;
    cropActivePointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (cropActivePointers.size >= 2) {
      const [p1, p2] = [...cropActivePointers.values()];
      const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      if (cropPinchPrevDist > 0) {
        const rect = cropStage.getBoundingClientRect();
        const midX = (p1.x + p2.x) / 2 - rect.left;
        const midY = (p1.y + p2.y) / 2 - rect.top;
        const scale = cropBaseScale * cropZoom;
        const px = (midX - cropOffsetX) / scale;
        const py = (midY - cropOffsetY) / scale;
        const newZoom = Math.min(3, Math.max(1, cropZoom * (dist / cropPinchPrevDist)));
        cropOffsetX = midX - px * (cropBaseScale * newZoom);
        cropOffsetY = midY - py * (cropBaseScale * newZoom);
        cropZoom = newZoom;
        cropZoomSlider.value = String(cropZoom);
        applyCropTransform();
      }
      cropPinchPrevDist = dist;
    } else if (cropDragging) {
      cropOffsetX = cropDragOffsetStartX + (e.clientX - cropDragStartX);
      cropOffsetY = cropDragOffsetStartY + (e.clientY - cropDragStartY);
      applyCropTransform();
    }
  });

  function endCropPointer(e) {
    cropActivePointers.delete(e.pointerId);
    if (cropActivePointers.size === 1) {
      const [remaining] = [...cropActivePointers.values()];
      cropDragging = true;
      cropDragStartX = remaining.x;
      cropDragStartY = remaining.y;
      cropDragOffsetStartX = cropOffsetX;
      cropDragOffsetStartY = cropOffsetY;
    } else {
      cropDragging = false;
    }
  }
  cropStage.addEventListener('pointerup', endCropPointer);
  cropStage.addEventListener('pointercancel', endCropPointer);

  document.getElementById('cropCloseBtn').addEventListener('click', closeProjectPhotoCrop);

  cropOverlay.addEventListener('click', (e) => {
    if (e.target === cropOverlay) closeProjectPhotoCrop();
  });

  document.getElementById('cropConfirmBtn').addEventListener('click', () => {
    const scale = cropBaseScale * cropZoom;
    const sWidth = cropStageWidth / scale;
    const sHeight = cropStageHeight / scale;
    const sx = -cropOffsetX / scale;
    const sy = -cropOffsetY / scale;
    // Output at the same ratio as the crop stage for the current mode, just at
    // a higher resolution than the on-screen box.
    const { width: outputWidth, height: outputHeight } = CROP_OUTPUT[cropMode];
    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    canvas.getContext('2d').drawImage(cropImg, sx, sy, sWidth, sHeight, 0, 0, outputWidth, outputHeight);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    const targetId = cropTargetShootId;
    if (cropMode === 'talent') {
      // Held on the draft only — nothing persists (IndexedDB write, cover-
      // photo claim) until the talent popup's own Save commits it, same as
      // every other field in that popup.
      if (talentModalDraft) {
        talentModalDraft.photo = dataUrl;
        renderTalentModalPhoto();
      }
      closeProjectPhotoCrop();
    } else if (targetId) {
      const idx = state.shoots.findIndex(x => x.id === targetId);
      if (idx !== -1) {
        state.shoots[idx] = { ...state.shoots[idx], projectPhoto: dataUrl };
        saveState();
        savePhotoToIdb(projectPhotoKey(targetId), dataUrl).catch(() => {})
          .then(() => onShootImagesChanged(targetId, { cover: true }));
        renderAll();
      }
      closeProjectPhotoCrop();
      closeShootOptions();
    } else {
      pendingProjectPhoto = dataUrl;
      scheduleShootAutosave();
      const coverShootId = currentShootId;
      if (coverShootId) {
        savePhotoToIdb(projectPhotoKey(coverShootId), dataUrl).catch(() => {})
          .then(() => onShootImagesChanged(coverShootId, { cover: true }));
      }
      closeProjectPhotoCrop();
      closeImageViewer();
    }
  });

  // Tapping the photo itself fades the caption band in/out so it doesn't
  // permanently block the image; the "add/edit caption" control stays put.
  imageViewerStage.addEventListener('click', () => {
    if (imageViewerCaptionOverlay.hidden) return;
    imageViewerCaptionOverlay.classList.toggle('caption-faded');
  });

  // Swipe left/right to move between images without leaving the viewer.
  let viewerTouchStartX = null;
  let viewerTouchStartY = null;

  imageViewerStage.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1) { viewerTouchStartX = null; return; }
    viewerTouchStartX = e.touches[0].clientX;
    viewerTouchStartY = e.touches[0].clientY;
  }, { passive: true });

  imageViewerStage.addEventListener('touchend', (e) => {
    if (viewerTouchStartX === null) return;
    const endX = e.changedTouches[0].clientX;
    const endY = e.changedTouches[0].clientY;
    const dx = endX - viewerTouchStartX;
    const dy = endY - viewerTouchStartY;
    viewerTouchStartX = null;
    viewerTouchStartY = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    showViewerImage(viewerIndex + (dx < 0 ? 1 : -1));
  }, { passive: true });

  imageViewerAddCaptionBtn.addEventListener('click', () => {
    const img = viewerImages[viewerIndex];
    imageViewerCaptionInput.value = (img && img.caption) || '';
    imageViewerAddCaptionBtn.hidden = true;
    imageViewerCaptionInput.hidden = false;
    imageViewerCaptionInput.focus();
  });

  imageViewerCaptionInput.addEventListener('change', () => {
    saveViewerCaption(imageViewerCaptionInput.value.trim());
  });

  function renderFinalImages() {
    const grid = document.getElementById('finalImagesGrid');
    grid.innerHTML = '';
    idbGetImages(finalImagesKey(currentShootId)).then(images => {
      grid.innerHTML = images.length ? '' : '<p class="empty-hint">No final images yet.</p>';
      images.forEach((img, idx) => {
        const thumb = document.createElement('div');
        thumb.className = 'moodboard-thumb';
        thumb.innerHTML = `<img src="${img.src}" alt="" data-idx="${idx}" /><button type="button" class="final-thumb-delete" data-idx="${idx}"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>`;
        grid.appendChild(thumb);
      });
      grid.querySelectorAll('.final-thumb-delete').forEach(btn => {
        btn.addEventListener('click', () => {
          if (!confirm("Delete this photo? This can't be undone.")) return;
          idbGetImages(finalImagesKey(currentShootId)).then(imgs => {
            imgs.splice(Number(btn.dataset.idx), 1);
            return idbSetImages(finalImagesKey(currentShootId), imgs);
          }).then(renderFinalImages);
        });
      });
      grid.querySelectorAll('.moodboard-thumb img').forEach(imgEl => {
        imgEl.addEventListener('click', () => {
          openImageViewer(images, Number(imgEl.dataset.idx), finalImagesKey(currentShootId), renderFinalImages);
        });
      });
    }).catch(() => { grid.innerHTML = ''; });
  }

  document.getElementById('addFinalPhotos').addEventListener('click', () => {
    document.getElementById('finalImagesFileInput').click();
  });

  document.getElementById('finalImagesFileInput').addEventListener('change', (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    if (!files.length) return;
    // Belt-and-braces: the section is hidden for video, but a picker opened
    // just before a category flip could still land here.
    if (isVideoCategory(document.getElementById('shootCategory').value)) return;
    Promise.all(files.map(f => resizeImageFile(f, 1280, 0.72)))
      .then(newImages => idbGetImages(finalImagesKey(currentShootId)).then(existing => {
        const shouldSetCover = existing.length === 0 && newImages.length > 0;
        const combined = existing.concat(newImages.map(src => ({ src, caption: '' })));
        return idbSetImages(finalImagesKey(currentShootId), combined).then(() => {
          if (shouldSetCover) {
            return resizeDataUrlThumb(newImages[0], 200, 0.6).then(thumb => {
              pendingProjectPhoto = thumb;
              return savePhotoToIdb(projectPhotoKey(currentShootId), thumb);
            });
          }
        });
      }))
      .then(() => {
        shootHasImages = true;
        scheduleShootAutosave();
        renderFinalImages();
      })
      .catch(() => {});
  });

  function gatherShootFormData() {
    const frameworkTags = [...document.querySelectorAll(FRAMEWORK_TAG_CHECKED_SELECTOR)]
      .map(cb => ({ frameworkId: cb.dataset.fw, tag: cb.value }));

    const teamRequired = document.getElementById('teamRequiredYes').checked
      ? 'yes'
      : (document.getElementById('teamRequiredNo').checked ? 'no' : '');

    return {
      title: document.getElementById('shootTitle').value.trim(),
      status: document.getElementById('shootStatus').value,
      date: document.getElementById('shootDate').value,
      deadline: document.getElementById('shootDeadline').value,
      startTime: document.getElementById('shootStartTime').value,
      endTime: document.getElementById('shootEndTime').value,
      crewCallTime: document.getElementById('shootCrewCallTime').value,
      talentCallTime: document.getElementById('shootTalentCallTime').value,
      location: { ...currentShootLocation },
      talents: currentTalents.map(t => ({ id: t.id, name: t.name.trim(), socialHandles: [...t.socialHandles], photo: t.photo || '' })),
      category: document.getElementById('shootCategory').value,
      premise: document.getElementById('shootPremise').value.trim(),
      character: document.getElementById('shootCharacter').value.trim(),
      shootGoals: document.getElementById('shootGoals').value.trim(),
      elevatorPitch: document.getElementById('shootElevatorPitch').value.trim(),
      // Video-only, but kept (not cleared) while hidden for other categories
      // so a flip away from Video and back doesn't lose them.
      deliverables: document.getElementById('shootDeliverables').value.trim(),
      aspectRatios: normalizeAspectRatios([...document.querySelectorAll('#shootAspectRatios input[type="checkbox"]:checked')].map(cb => cb.value)),
      deliverableDestinations: document.getElementById('shootDeliverableDestinations').value.trim(),
      worldNotes: document.getElementById('shootWorldNotes').value.trim(),
      moodboardComplete: document.getElementById('shootMoodboardComplete').checked,
      teamRequired,
      teamFinalized: document.getElementById('shootTeamFinalized').checked,
      teamMembers: teamRequired === 'yes' ? [...currentTeamMembers] : [],
      references: currentReferences.map(r => r.trim()).filter(r => r),
      frameworkTags,
      whatWentRight: document.getElementById('shootWentRight').value.trim(),
      couldBeBetter: document.getElementById('shootCouldBeBetter').value.trim(),
      lessonsLearned: document.getElementById('shootLessonsLearned').value.trim(),
      talentDirections: document.getElementById('shootTalentDirections').value.trim(),
      teamDirections: document.getElementById('shootTeamDirections').value.trim(),
      shootingNotes: document.getElementById('shootShootingNotes').value.trim(),
      locationDirections: document.getElementById('shootLocationDirections').value.trim(),
      shotList: [...currentShotList],
      lightingSetups: [...currentLightingSetups],
      // Omitted rather than set to null when there's nothing pending: there's
      // no "remove cover photo" action anywhere, so pendingProjectPhoto only
      // legitimately goes from empty to a real photo, never back down. If it
      // reads empty here it's because this shoot's photo hadn't finished
      // loading from IndexedDB yet when the modal opened (that's async, and
      // runs once at boot) — spreading an explicit null over the shoot's
      // existing photo on every autosave/blur was silently wiping the
      // thumbnail. Leaving the key out lets the {...oldShoot, ...data} spread
      // in autosaveShoot() keep whatever the shoot already had.
      ...(pendingProjectPhoto ? { projectPhoto: pendingProjectPhoto } : {}),
    };
  }

  // A brand-new, never-touched shoot draft shouldn't get written to state
  // just because the modal was opened — only once it actually has content.
  function isShootDataBlank(data) {
    // The country field pre-fills itself from state.defaultCountry on every
    // brand-new shoot draft, so it can't count as "the user entered
    // something" here or every untouched New Shoot would silently save.
    const loc = data.location;
    const locationEffectivelyBlank = !hasText(loc.name) && !hasText(loc.street) && !hasText(loc.city) && !hasText(loc.zip) && !hasText(loc.state);
    return !hasText(data.title) && locationEffectivelyBlank && !hasText(data.startTime) && !hasText(data.endTime)
      && !hasText(data.crewCallTime) && !hasText(data.talentCallTime)
      && !hasText(data.deliverables) && data.aspectRatios.length === 0 && !hasText(data.deliverableDestinations)
      && data.talents.every(t => !hasText(t.name) && t.socialHandles.length === 0 && !hasText(t.photo)) && !hasText(data.premise) && !hasText(data.character) && !hasText(data.shootGoals) && !hasText(data.elevatorPitch)
      && !hasText(data.worldNotes) && !hasText(data.deadline)
      && !hasText(data.whatWentRight) && !hasText(data.couldBeBetter) && !hasText(data.lessonsLearned)
      && !hasText(data.talentDirections) && !hasText(data.teamDirections) && !hasText(data.locationDirections)
      && !hasText(data.shootingNotes) && data.shotList.length === 0
      && data.lightingSetups.length === 0
      && data.frameworkTags.length === 0 && data.references.length === 0
      && data.teamMembers.length === 0 && !data.moodboardComplete && !data.teamRequired && !data.teamFinalized
      && !data.projectPhoto;
  }

  // Records the first time a shoot reaches "captured" and the edit (Editing
  // for photo shoots; Rough cut/Client review/Revisions for video) so the
  // daily report can compute "N days since capture" / "N days since editing".
  // Never overwrites an already-set timestamp, even if status bounces back
  // and forth, so it always reflects the first time each milestone was hit.
  function applyStatusTimestamps(shoot, oldStatus, newStatus) {
    if (oldStatus === newStatus) return;
    if (isPostCaptureStatus(newStatus) && !shoot.capturedAt) {
      shoot.capturedAt = new Date().toISOString();
    }
    if (isInTheEditStatus(newStatus) && !shoot.editingAt) {
      shoot.editingAt = new Date().toISOString();
    }
  }

  // `force` is only ever passed (as exactly true) by the Multi-day "Create
  // days" flow: Day 1 has to exist as a real saved shoot before a project can
  // link to it or days can be copied from it, even when the date is the only
  // thing filled in so far — and isShootDataBlank deliberately ignores the
  // date. Checked with === true so the timer/listener paths that call this
  // with no argument can never trip it by accident. Returns the saved shoot,
  // or undefined when a blank draft was skipped.
  function autosaveShoot(force) {
    const data = gatherShootFormData();
    const idx = state.shoots.findIndex(x => x.id === currentShootId);
    let shoot;
    if (idx === -1) {
      if (force !== true && isShootDataBlank(data) && !shootHasImages) return;
      shoot = { id: currentShootId, ...data };
      applyStatusTimestamps(shoot, null, shoot.status);
      state.shoots.push(shoot);
      document.getElementById('deleteShootBtn').hidden = false;
    } else {
      const oldStatus = state.shoots[idx].status;
      shoot = { ...state.shoots[idx], ...data };
      applyStatusTimestamps(shoot, oldStatus, shoot.status);
      state.shoots[idx] = shoot;
    }
    saveState();
    return shoot;
  }

  function scheduleShootAutosave() {
    clearTimeout(shootSaveTimer);
    // Only a backstop for text still being typed — leaving the field and
    // backgrounding the app both save immediately (see below), so this doesn't
    // need to be eager. It used to be 500ms, which meant a save on every
    // natural pause mid-sentence.
    shootSaveTimer = setTimeout(autosaveShoot, 2000);
    // Every change made on a wizard slide passes through here — typed and
    // picked fields via the form listeners below, and the popup saves and
    // list edits (talent, location, team, deadline, shots, setups, links,
    // photos) that fire no form event — so it's the one hook the wizard's
    // step count and filled-in field looks need.
    if (shootWizardActive) refreshShootWizard();
  }

  function saveShootNow() {
    if (shootModalOverlay.hidden || !currentShootId) return;
    clearTimeout(shootSaveTimer);
    autosaveShoot();
  }

  shootForm.addEventListener('input', scheduleShootAutosave);
  // Delegated at the form level rather than per-field, so it covers inputs
  // rendered later by the talent/team/references list renderers without
  // needing its own listener wired up at every render site.
  shootForm.addEventListener('input', (e) => syncFieldFilledState(e.target));
  shootForm.addEventListener('change', scheduleShootAutosave);
  shootForm.addEventListener('submit', (e) => e.preventDefault());
  // Commit as soon as focus leaves a field, so the pending-debounce window is
  // only ever open while you're actually still in a field typing.
  shootForm.addEventListener('focusout', saveShootNow);

  // ---------- Multi-day shoot (Logistics) ----------
  // A checkbox under Shoot date that turns this shoot into Day 1 of a new
  // project, with one copied shoot per following day (see
  // copyShootForProject). Never part of the shoot's own data: nothing here is
  // read by gatherShootFormData, and both controls stop their input/change
  // events at the source so they never schedule an autosave of their own.
  // Membership only changes through the explicit actions below (Create days,
  // or unticking a member), and the row is always rebuilt from saved state by
  // updateMultiDayRow().
  const MULTI_DAY_MAX_DAYS = 14;
  let multiDayPromptDates = null;
  let multiDayCreating = false;

  // 'YYYY-MM-DD' shifted by n calendar days. Done on a local Date's day field
  // rather than by adding n * 86400000ms, so a DST change in between can
  // never land it a day off.
  function addDaysToDateStr(dateStr, n) {
    const d = parseShootDate(dateStr);
    d.setDate(d.getDate() + n);
    return formatDate(d);
  }

  // Every date from start to end, inclusive. Stops one past the limit —
  // enough for the caller to tell "too long" apart without walking a
  // mis-picked year-long range a day at a time.
  function multiDayDateRange(startStr, endStr) {
    const dates = [];
    let d = startStr;
    while (d <= endStr && dates.length <= MULTI_DAY_MAX_DAYS) {
      dates.push(d);
      d = addDaysToDateStr(d, 1);
    }
    return dates;
  }

  // "Oct 14, 15 and 16" — the month is only repeated when it changes
  // ("Oct 31 and Nov 1"). Past 4 days a full list stops being readable, so
  // it collapses to "Oct 14 – Oct 20 (7 days)".
  function multiDayDatesText(dates) {
    const monthDay = (ds) => parseShootDate(ds).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    if (dates.length > 4) {
      return `${monthDay(dates[0])} – ${monthDay(dates[dates.length - 1])} (${dates.length} days)`;
    }
    return joinWithAnd(dates.map((ds, i) => (
      i > 0 && ds.slice(0, 7) === dates[i - 1].slice(0, 7)
        ? String(parseShootDate(ds).getDate())
        : monthDay(ds)
    )));
  }

  // The open shoot's saved project membership as { shoot, project }, or null.
  // Read by id from saved state, never the form, so a never-saved draft is
  // always "not a member". A projectId pointing at a missing project counts
  // as no project, same as collapseProjects.
  function multiDayMembership() {
    const shoot = state.shoots.find(x => x.id === currentShootId);
    const project = shoot && shoot.projectId ? findProject(shoot.projectId) : null;
    return project ? { shoot, project } : null;
  }

  // Back to a plain unticked row with the Last day picker hidden and empty.
  function resetMultiDayDraft() {
    document.getElementById('shootMultiDay').checked = false;
    const lastDayInput = document.getElementById('shootLastDay');
    lastDayInput.value = '';
    lastDayInput.removeAttribute('min');
    lastDayInput.removeAttribute('max');
    document.getElementById('multiDayLastDayLabel').hidden = true;
  }

  // Rebuilds the row from saved membership: a member reads as a ticked
  // "Part of <project> · Day N of M" (the day suffix only when projectDayInfo
  // has one — dated, not postponed/canceled, 2+ live dates in the project);
  // anything else is a fresh unticked "Multi-day shoot". Called from
  // openShootModal and after every membership change made while the shoot
  // modal is open.
  function updateMultiDayRow() {
    resetMultiDayDraft();
    const label = document.getElementById('multiDayLabel');
    const membership = multiDayMembership();
    if (!membership) {
      label.textContent = 'Multi-day shoot';
      return;
    }
    const info = projectDayInfo(membership.shoot);
    document.getElementById('shootMultiDay').checked = true;
    // Says how this day relates to its project's lead day, when it has one:
    // the lead, a day mirroring it, or a day that's been made its own.
    const lead = projectLeadOf(membership.project);
    let mirrorText = '';
    if (lead && lead.id === membership.shoot.id) {
      mirrorText = ' · mirrored to the other days';
    } else if (lead) {
      const leadInfo = projectDayInfo(lead);
      mirrorText = membership.shoot.followsLead
        ? ` · mirrors ${leadInfo ? `Day ${leadInfo.day}` : 'the first day'}`
        : ' · has its own changes';
    }
    label.textContent = `Part of ${membership.project.name}${info ? ` · Day ${info.day} of ${info.total}` : ''}${mirrorText}`;
  }

  // Keeps the Last day picker's allowed range anchored to the shoot date:
  // from the day after it up to 13 days after it (14 days in all).
  function setLastDayRange(startDate) {
    const lastDayInput = document.getElementById('shootLastDay');
    lastDayInput.min = addDaysToDateStr(startDate, 1);
    lastDayInput.max = addDaysToDateStr(startDate, MULTI_DAY_MAX_DAYS - 1);
  }

  // A brand-new draft that Create days just force-saved is a real saved shoot
  // now — so the modal switches to behaving like Edit Shoot for it, showing
  // the same edit-only controls openShootModal(id) would have (Share, Delete,
  // Shoot mode, Complete). No-op for a shoot that was already open for editing.
  function markShootModalAsSaved() {
    if (editingShootId === currentShootId) return;
    editingShootId = currentShootId;
    document.getElementById('deleteShootBtn').hidden = false;
    document.getElementById('shareShootBtn').hidden = false;
    const isArchived = !document.getElementById('unarchiveShootBtn').hidden;
    document.getElementById('completeShootBtn').hidden = isArchived || document.getElementById('shootStatus').value !== 'delivered';
    updateEnterShootModeBtnVisibility();
  }

  // Neither control is shoot data, so neither may reach the form-level
  // input/change listeners (scheduleShootAutosave, syncFieldFilledState).
  ['shootMultiDay', 'shootLastDay'].forEach(id => {
    document.getElementById(id).addEventListener('input', (e) => e.stopPropagation());
  });

  document.getElementById('shootMultiDay').addEventListener('change', (e) => {
    e.stopPropagation();
    const checkbox = e.target;
    const membership = multiDayMembership();
    if (membership) {
      // A member's box only ever goes from ticked to unticked by hand —
      // that's the "take it out of the project" gesture.
      if (checkbox.checked) return;
      if (!confirm(`Take this shoot out of ${membership.project.name}? It stays as its own shoot.`)) {
        checkbox.checked = true;
        return;
      }
      // Commit any edit still sitting in the debounce first, so the lists
      // re-rendered below already show it.
      saveShootNow();
      setShootProject(membership.shoot.id, '');
      saveState();
      renderAll();
      refreshOpenStatBoxDetail();
      updateMultiDayRow();
      return;
    }
    if (!checkbox.checked) {
      resetMultiDayDraft();
      return;
    }
    const startDate = document.getElementById('shootDate').value;
    if (!startDate) {
      checkbox.checked = false;
      showToast('Set the shoot date first');
      return;
    }
    document.getElementById('shootLastDay').value = '';
    setLastDayRange(startDate);
    document.getElementById('multiDayLastDayLabel').hidden = false;
    maybeShowMultiDayNotice();
  });

  // A heads-up the moment Multi-day is ticked — on the shoot page or in the
  // new-shoot guide — that each day gets a shoot page of its own, before the
  // Last day picker and the confirm popup. "Don't show again" is remembered
  // on this device.
  const MULTI_DAY_NOTICE_HIDDEN_KEY = 'dailies_multi_day_notice_hidden_v1';

  function maybeShowMultiDayNotice() {
    let hidden;
    try { hidden = localStorage.getItem(MULTI_DAY_NOTICE_HIDDEN_KEY) === '1'; } catch (err) { hidden = false; }
    if (!hidden) document.getElementById('multiDayNoticeOverlay').hidden = false;
  }

  document.getElementById('multiDayNoticeOkBtn').addEventListener('click', () => {
    document.getElementById('multiDayNoticeOverlay').hidden = true;
  });

  document.getElementById('multiDayNoticeHideBtn').addEventListener('click', () => {
    try { localStorage.setItem(MULTI_DAY_NOTICE_HIDDEN_KEY, '1'); } catch (err) { /* storage unavailable — nothing to remember it in */ }
    document.getElementById('multiDayNoticeOverlay').hidden = true;
  });

  document.getElementById('shootLastDay').addEventListener('change', (e) => {
    e.stopPropagation();
    const lastDayInput = e.target;
    const lastDay = lastDayInput.value;
    if (!lastDay || multiDayMembership()) return;
    // Desktop keyboards fire change mid-typing ("0002-10-16" after the first
    // year digit) — wait for a real four-digit year before checking it.
    if (lastDay.slice(0, 4) < '1000') return;
    const startDate = document.getElementById('shootDate').value;
    if (!startDate) {
      resetMultiDayDraft();
      showToast('Set the shoot date first');
      return;
    }
    if (lastDay <= startDate) {
      lastDayInput.value = '';
      showToast('Pick a last day after the shoot date');
      return;
    }
    const dates = multiDayDateRange(startDate, lastDay);
    if (dates.length > MULTI_DAY_MAX_DAYS) {
      lastDayInput.value = '';
      showToast(`Multi-day shoots can be up to ${MULTI_DAY_MAX_DAYS} days`);
      return;
    }
    // Dismisses the native date picker so it isn't left floating over the
    // prompt (the focusout this fires runs the usual saveShootNow — harmless).
    lastDayInput.blur();
    openMultiDayPrompt(dates);
  });

  // The shoot date moving — or being cleared: Postponed/Canceled wipe it
  // from code, which fires no change event of its own, hence the status hook
  // too — changes what the row should say. A member's "Day N of M" is worked
  // out from saved dates, so the edit is committed first; a non-member's
  // in-progress pick has its Last day range re-anchored, or is dropped
  // entirely if there's no date left to anchor it to.
  function syncMultiDayRowToShootDate() {
    if (multiDayMembership()) {
      saveShootNow();
      updateMultiDayRow();
      return;
    }
    if (!document.getElementById('shootMultiDay').checked) return;
    const startDate = document.getElementById('shootDate').value;
    if (!startDate) {
      resetMultiDayDraft();
      return;
    }
    document.getElementById('shootLastDay').value = '';
    setLastDayRange(startDate);
  }

  document.getElementById('shootDate').addEventListener('change', syncMultiDayRowToShootDate);
  // Registered after the main status handler above, so it sees the date that
  // handler may have just cleared.
  document.getElementById('shootStatus').addEventListener('change', syncMultiDayRowToShootDate);

  function openMultiDayPrompt(dates) {
    multiDayPromptDates = dates;
    const term = moodboardTerm(document.getElementById('shootCategory').value).toLowerCase();
    document.getElementById('multiDayPromptText').textContent =
      `This makes a separate shoot for each day — ${multiDayDatesText(dates)}. Everything on Day 1 (talent, team, location, concept, notes, ${term} and lighting setups) is mirrored to the other days, including any changes you make to Day 1 later. Each day keeps its own date, times, status, shot list and reflection. Note: if you change anything on another day yourself, that day keeps its own version and won't pick up later changes to Day 1.`;
    // Read off the form rather than saved state — a brand-new draft has
    // nothing saved yet, and an existing shoot may have unsaved edits.
    const talent = currentTalents.find(t => hasText(t.name));
    document.getElementById('multiDayProjectNameInput').value =
      document.getElementById('shootTitle').value.trim() || (talent ? talent.name.trim() : '') || UNTITLED_PROJECT_NAME;
    document.getElementById('multiDayPromptOverlay').hidden = false;
  }

  function closeMultiDayPrompt() {
    document.getElementById('multiDayPromptOverlay').hidden = true;
    multiDayPromptDates = null;
  }

  document.getElementById('multiDayPromptCancelBtn').addEventListener('click', () => {
    if (multiDayCreating) return;
    closeMultiDayPrompt();
    resetMultiDayDraft();
  });

  document.getElementById('multiDayProjectNameInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('multiDayPromptCreateBtn').click();
  });

  document.getElementById('multiDayPromptCreateBtn').addEventListener('click', async () => {
    if (multiDayCreating) return;
    const dates = multiDayPromptDates;
    if (!dates || dates.length < 2 || shootModalOverlay.hidden || multiDayMembership()) {
      closeMultiDayPrompt();
      updateMultiDayRow();
      return;
    }
    multiDayCreating = true;
    const createBtn = document.getElementById('multiDayPromptCreateBtn');
    createBtn.textContent = 'Creating…';
    let project = null;
    let sourceId = null;
    try {
      const name = document.getElementById('multiDayProjectNameInput').value.trim() || UNTITLED_PROJECT_NAME;
      // Day 1 must be a real saved shoot before a project can point at it or
      // anything can be copied from it. Forced: a draft whose only content so
      // far is its date reads as blank to isShootDataBlank (the date is
      // deliberately not counted), so a normal autosave would skip it — and
      // closeShootModal would then wipe it as an abandoned draft.
      clearTimeout(shootSaveTimer);
      const day1 = autosaveShoot(true);
      sourceId = day1.id;
      markShootModalAsSaved();
      project = createProject(name);
      setShootProject(sourceId, project.id);
      // Saved straight away so the link survives even if the app is
      // backgrounded and discarded while the days below are still copying.
      saveState();
      // setShootProject spread-writes a new object — copy from the live one.
      const source = state.shoots.find(x => x.id === sourceId);
      try {
        // One at a time, in date order, so the new shoots land in
        // state.shoots (and their IndexedDB rows) in the same order as
        // their days.
        for (const date of dates.slice(1)) {
          const day = await copyShootForProject(source, 'day', { date, projectId: project.id });
          // Each new day follows Day 1 (see syncProjectMirrors).
          if (day && day.projectId === project.id) {
            day.followsLead = true;
            day.mirrorSig = mirrorSignature(day);
          }
        }
      } catch (err) {
        // An IndexedDB write failing part-way (e.g. storage full) keeps the
        // days that did get made; the toast below says how many that was.
      }
      // Day 1 becomes the lead the other days mirror; its current details
      // are what they were just copied from.
      const liveProject = findProject(project.id);
      const lead = state.shoots.find(x => x.id === sourceId);
      if (liveProject && lead) {
        liveProject.leadShootId = sourceId;
        liveProject.mirrorSig = mirrorSignature(lead);
      }
      saveState();
    } finally {
      multiDayCreating = false;
      createBtn.textContent = 'Create days';
    }
    closeMultiDayPrompt();
    renderAll();
    refreshOpenStatBoxDetail();
    if (!shootModalOverlay.hidden && currentShootId === sourceId) updateMultiDayRow();
    const total = projectMembers(project.id).length;
    showToast(total === dates.length
      ? `${total} days created in ${project.name}`
      : `Only ${total} of ${dates.length} days could be created in ${project.name}`);
  });

  function closeShootModal() {
    // First: every borrowed field goes home (with its readonly back) before
    // the scroll position is recorded and the draft saved or discarded.
    endShootWizard({ closing: true });
    if (currentShootId) {
      shootScrollPositions[currentShootId] = shootModalOverlay.querySelector('.modal').scrollTop;
    }
    clearTimeout(shootSaveTimer);
    autosaveShoot();
    if (!state.shoots.some(x => x.id === currentShootId)) {
      idbDeleteImages(currentShootId).catch(() => {});
      idbDeleteImages(finalImagesKey(currentShootId)).catch(() => {});
      // Abandoned blank shoot — drop any photo rows it managed to create too.
      idbDeleteImages(projectPhotoKey(currentShootId)).catch(() => {});
      currentTalents.forEach(t => {
        if (t.id) idbDeleteImages(talentPhotoKey(currentShootId, t.id)).catch(() => {});
      });
    }
    if (!shootModalOverlay.hidden) unlockBodyScroll();
    shootModalOverlay.hidden = true;
    editingShootId = null;
    renderAll();
    refreshOpenStatBoxDetail();
  }

  document.getElementById('saveShootBtn').addEventListener('click', closeShootModal);

  // ---------- Swipe down from the header to dismiss the shoot modal ----------
  // Scoped to the sticky header (not the scrollable body) so it never fights
  // with normal scrolling — a tap still works fine since it's ~0px of
  // vertical movement. closeShootModal() already autosaves, same as Save/X.
  (function setupShootModalSwipeDismiss() {
    const header = document.querySelector('.shoot-modal-header');
    const modalEl = shootModalOverlay.querySelector('.modal');
    const DISMISS_THRESHOLD = 90;
    let startY = null;

    header.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      startY = e.touches[0].clientY;
      modalEl.style.transition = 'none';
    }, { passive: true });

    header.addEventListener('touchmove', (e) => {
      if (startY === null) return;
      const deltaY = e.touches[0].clientY - startY;
      modalEl.style.transform = deltaY > 0 ? `translateY(${deltaY}px)` : '';
    }, { passive: true });

    header.addEventListener('touchend', (e) => {
      if (startY === null) return;
      const deltaY = e.changedTouches[0].clientY - startY;
      startY = null;
      if (deltaY > DISMISS_THRESHOLD) {
        modalEl.style.transition = '';
        modalEl.style.transform = '';
        closeShootModal();
        return;
      }
      modalEl.style.transition = 'transform 0.2s ease';
      modalEl.style.transform = '';
    });
  })();

  function deleteShootById(id) {
    const doomed = state.shoots.find(x => x.id === id);
    state.shoots = state.shoots.filter(x => x.id !== id);
    state.journalEntries = state.journalEntries.filter(e => e.sourceShootId !== id);
    // A project is only its shoots, so one whose last shoot this was goes too.
    pruneEmptyProjects();
    idbDeleteImages(id).catch(() => {});
    idbDeleteImages(finalImagesKey(id)).catch(() => {});
    // Cover + per-talent photos live under their own keys, so they need
    // explicit cleanup or they'd linger as orphaned rows.
    if (doomed) shootPhotoKeys(doomed).forEach(k => idbDeleteImages(k).catch(() => {}));
    saveState();
  }

  document.getElementById('deleteShootBtn').addEventListener('click', () => {
    if (!confirm('Delete this shoot? This can\'t be undone.')) return;
    clearTimeout(shootSaveTimer);
    deleteShootById(currentShootId);
    if (!shootModalOverlay.hidden) unlockBodyScroll();
    shootModalOverlay.hidden = true;
    editingShootId = null;
    renderAll();
    refreshOpenStatBoxDetail();
  });

  document.getElementById('shareShootBtn').addEventListener('click', () => {
    // buildShootPdf reads from state.shoots, not the live form fields — so
    // an edit still sitting in the 2s autosave debounce (e.g. just closed
    // the expand-field editor for Directions for talent/team, then tapped
    // Share right away) would otherwise get left out of the PDF.
    saveShootNow();
    if (editingShootId) openPdfSectionsModal(editingShootId);
  });

  // A pane track (kebab-menu slide-over, app menu) is a horizontal row of
  // same-width panes moved via transform, one shown at a time — as a flex
  // row its own height still auto-sizes to the TALLEST pane regardless of
  // which one is actually showing, so switching to a shorter pane (e.g. the
  // theme picker vs the full app menu list) left blank space below its
  // content, same underlying issue as the Stats carousel. Call this after
  // every classList change that shows a different pane.
  function syncPaneTrackHeight(track) {
    const panes = [...track.children].filter(el => el.classList.contains('options-pane'));
    let idx = 0;
    if (track.classList.contains('show-fifth')) idx = 4;
    else if (track.classList.contains('show-fourth')) idx = 3;
    else if (track.classList.contains('show-third')) idx = 2;
    else if (track.classList.contains('show-second')) idx = 1;
    const active = panes[idx];
    if (active) track.style.height = active.offsetHeight + 'px';
  }

  // ---------- Shoot options (row/card kebab menu) ----------
  const shootOptionsOverlay = document.getElementById('shootOptionsOverlay');
  const shootOptionsPaneTrack = document.getElementById('shootOptionsPaneTrack');
  let optionsShootId = null;

  function openShootOptions(id) {
    optionsShootId = id;
    const s = state.shoots.find(x => x.id === id);
    document.getElementById('archiveShootOptionBtn').textContent = (s && s.archived) ? 'Unarchive shoot' : 'Archive shoot';
    // Same idea as Archive/Unarchive just above: the item keeps its slot and
    // says which project a member is already in, so the sheet it opens
    // reads as "manage" for a member rather than "add".
    const optionsProject = (s && s.projectId) ? findProject(s.projectId) : null;
    document.getElementById('projectShootOptionBtn').textContent = optionsProject ? `Project: ${optionsProject.name}` : 'Add to project';
    // The pane track slides via CSS transform, not native scrolling — reset
    // any stray scroll position (e.g. from a focused input the browser tried
    // to "reveal") so it can't stack with the transform and misalign panes.
    shootOptionsOverlay.querySelector('.modal').scrollLeft = 0;
    shootOptionsOverlay.hidden = false;
    syncPaneTrackHeight(shootOptionsPaneTrack);
  }

  function closeShootOptions() {
    shootOptionsOverlay.hidden = true;
    optionsShootId = null;
    shootOptionsPaneTrack.classList.remove('show-second');
    shootOptionsPaneTrack.classList.remove('show-third');
    shootOptionsPaneTrack.classList.remove('show-fourth');
    shootOptionsPaneTrack.classList.remove('show-fifth');
  }

  // Focusing an input inside a pane that's off its untransformed (layout)
  // position — every pane past the first is, since the track slides via
  // CSS transform rather than scrolling — can make the browser auto-scroll
  // the modal to "reveal" it, even with preventScroll set (unreliable on
  // some engines). That scroll then stacks with the transform and shoves
  // every pane out of view, so force it back to 0 right after focusing.
  function focusPaneInput(input) {
    input.focus({ preventScroll: true });
    shootOptionsOverlay.querySelector('.modal').scrollLeft = 0;
  }

  // ---------- Change shoot title (kebab menu slide-over) ----------
  document.getElementById('changeTitleOptionBtn').addEventListener('click', () => {
    const s = state.shoots.find(x => x.id === optionsShootId);
    const input = document.getElementById('shootTitleRenameInput');
    input.value = s ? (s.title || '') : '';
    shootOptionsPaneTrack.classList.add('show-third');
    syncPaneTrackHeight(shootOptionsPaneTrack);
    focusPaneInput(input);
  });

  document.getElementById('titleOptionsBackBtn').addEventListener('click', () => {
    shootOptionsPaneTrack.classList.remove('show-third');
    syncPaneTrackHeight(shootOptionsPaneTrack);
  });

  function saveTitleOption() {
    const id = optionsShootId;
    const newTitle = document.getElementById('shootTitleRenameInput').value.trim();
    closeShootOptions();
    if (!id) return;
    const idx = state.shoots.findIndex(x => x.id === id);
    if (idx === -1) return;
    state.shoots[idx] = { ...state.shoots[idx], title: newTitle };
    saveState();
    renderAll();
  }

  document.getElementById('saveTitleOptionBtn').addEventListener('click', saveTitleOption);

  document.getElementById('shootTitleRenameInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveTitleOption();
  });

  // ---------- Change project photo (kebab menu slide-over) ----------
  document.getElementById('changeProjectPhotoOptionBtn').addEventListener('click', () => {
    const id = optionsShootId;
    const grid = document.getElementById('projectPhotoPickerGrid');
    grid.innerHTML = '';
    shootOptionsPaneTrack.classList.add('show-fourth');
    syncPaneTrackHeight(shootOptionsPaneTrack);
    if (!id) return;
    // Video has no final images (any left from before a switch to video
    // stay hidden), so only its storyboard is offered.
    const pickerShoot = state.shoots.find(x => x.id === id);
    const finalImagesPromise = isVideoShoot(pickerShoot) ? Promise.resolve([]) : idbGetImages(finalImagesKey(id));
    Promise.all([idbGetImages(id), finalImagesPromise]).then(([moodboardImages, finalImages]) => {
      const allImages = moodboardImages.concat(finalImages);
      grid.innerHTML = allImages.length ? '' : '<p class="empty-hint">No photos yet.</p>';
      allImages.forEach(img => {
        const thumb = document.createElement('div');
        thumb.className = 'moodboard-thumb';
        thumb.innerHTML = `<img src="${img.src}" alt="" />`;
        thumb.querySelector('img').addEventListener('click', () => {
          cropTargetShootId = id;
          openProjectPhotoCrop(img.src);
        });
        grid.appendChild(thumb);
      });
      // The grid's own contents load async, and its height can change once
      // photos land (the grid scrolls internally past a cap, but "no photos
      // yet" vs a full row is still a real height difference).
      syncPaneTrackHeight(shootOptionsPaneTrack);
    }).catch(() => { grid.innerHTML = ''; });
  });

  document.getElementById('projectPhotoBackBtn').addEventListener('click', () => {
    shootOptionsPaneTrack.classList.remove('show-fourth');
    syncPaneTrackHeight(shootOptionsPaneTrack);
  });

  document.getElementById('addProjectPhotoFromDeviceBtn').addEventListener('click', () => {
    document.getElementById('projectPhotoFileInput').click();
  });

  document.getElementById('projectPhotoFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const id = optionsShootId;
    if (!id) return;
    resizeImageFile(file, 1280, 0.72).then(dataUrl => {
      cropTargetShootId = id;
      openProjectPhotoCrop(dataUrl);
    }).catch(() => {});
  });

  // ---------- Change deadline (kebab menu slide-over) ----------
  document.getElementById('changeDeadlineOptionBtn').addEventListener('click', () => {
    const s = state.shoots.find(x => x.id === optionsShootId);
    const input = document.getElementById('shootDeadlineRenameInput');
    input.value = s ? (s.deadline || '') : '';
    shootOptionsPaneTrack.classList.add('show-fifth');
    syncPaneTrackHeight(shootOptionsPaneTrack);
    focusPaneInput(input);
  });

  document.getElementById('deadlineOptionsBackBtn').addEventListener('click', () => {
    shootOptionsPaneTrack.classList.remove('show-fifth');
    syncPaneTrackHeight(shootOptionsPaneTrack);
  });

  function saveDeadlineOption() {
    const id = optionsShootId;
    const newDeadline = document.getElementById('shootDeadlineRenameInput').value;
    closeShootOptions();
    if (!id) return;
    const idx = state.shoots.findIndex(x => x.id === id);
    if (idx === -1) return;
    state.shoots[idx] = { ...state.shoots[idx], deadline: newDeadline };
    saveState();
    renderAll();
  }

  document.getElementById('saveDeadlineOptionBtn').addEventListener('click', saveDeadlineOption);

  // ---------- Change status (kebab menu slide-over) ----------
  // Filtered by the shoot's category — video swaps Waiting for selects/
  // Editing for Rough cut/Client review/Revisions.
  function renderStatusOptionsList(s) {
    const currentStatus = s ? (s.status || 'prospect') : 'prospect';
    const list = document.getElementById('statusOptionsList');
    list.innerHTML = statusOptionKeys(s ? s.category : '', currentStatus).map(key => `
      <button type="button" class="options-item choice-item${key === currentStatus ? ' active' : ''}" data-status="${escapeHtml(key)}">${escapeHtml(STATUS_LABELS[key] || key)}</button>
    `).join('');
  }

  function applyStatusChange(shootId, newStatus) {
    const idx = state.shoots.findIndex(x => x.id === shootId);
    if (idx === -1) return;
    const shoot = { ...state.shoots[idx] };
    const oldStatus = shoot.status || 'prospect';
    const wasPostCapture = isPostCaptureStatus(oldStatus);
    const willBePostCapture = isPostCaptureStatus(newStatus);
    const hasReflection = hasText(shoot.whatWentRight) || hasText(shoot.couldBeBetter) || hasText(shoot.lessonsLearned);
    if (wasPostCapture && !willBePostCapture && hasReflection) {
      if (!confirm("Reverting to an earlier status will clear any post-shoot reflection responses you've filled out. Continue?")) return;
      shoot.whatWentRight = '';
      shoot.couldBeBetter = '';
      shoot.lessonsLearned = '';
    }
    shoot.status = newStatus;
    applyStatusTimestamps(shoot, oldStatus, newStatus);
    if (newStatus === 'rescheduled' || newStatus === 'canceled') {
      shoot.date = '';
      shoot.startTime = '';
      shoot.endTime = '';
      shoot.crewCallTime = '';
      shoot.talentCallTime = '';
    }
    state.shoots[idx] = shoot;
    saveState();
    renderAll();
    // A stat box popup left open underneath would otherwise keep listing a
    // shoot that no longer belongs in it.
    refreshOpenStatBoxDetail();
  }

  document.getElementById('changeStatusOptionBtn').addEventListener('click', () => {
    const s = state.shoots.find(x => x.id === optionsShootId);
    renderStatusOptionsList(s);
    shootOptionsPaneTrack.classList.add('show-second');
    syncPaneTrackHeight(shootOptionsPaneTrack);
  });

  document.getElementById('statusOptionsBackBtn').addEventListener('click', () => {
    shootOptionsPaneTrack.classList.remove('show-second');
    syncPaneTrackHeight(shootOptionsPaneTrack);
  });

  document.getElementById('statusOptionsList').addEventListener('click', (e) => {
    const btn = e.target.closest('.options-item');
    if (!btn) return;
    const id = optionsShootId;
    const newStatus = btn.dataset.status;
    closeShootOptions();
    if (id) applyStatusChange(id, newStatus);
  });

  document.getElementById('shareShootOptionBtn').addEventListener('click', () => {
    const id = optionsShootId;
    closeShootOptions();
    if (id) openPdfSectionsModal(id);
  });

  document.getElementById('archiveShootOptionBtn').addEventListener('click', () => {
    const id = optionsShootId;
    closeShootOptions();
    if (!id) return;
    const idx = state.shoots.findIndex(x => x.id === id);
    if (idx === -1) return;
    state.shoots[idx] = { ...state.shoots[idx], archived: !state.shoots[idx].archived };
    saveState();
    renderAll();
    refreshOpenStatBoxDetail();
  });

  document.getElementById('deleteShootOptionBtn').addEventListener('click', () => {
    const id = optionsShootId;
    closeShootOptions();
    if (!id) return;
    if (!confirm('Delete this shoot? This can\'t be undone.')) return;
    if (id === currentShootId && !shootModalOverlay.hidden) {
      clearTimeout(shootSaveTimer);
      unlockBodyScroll();
      shootModalOverlay.hidden = true;
      editingShootId = null;
    }
    deleteShootById(id);
    renderAll();
    refreshOpenStatBoxDetail();
  });

  // ---------- Add to project (kebab item → its own small sheet) ----------
  // A standalone sheet (built like the journal entry options) rather than a
  // sixth pane on the shoot options slider, whose track is sized for
  // exactly five panes. The kebab closes before this opens, so the two
  // never coexist.
  const projectPickerOverlay = document.getElementById('projectPickerOverlay');
  let projectPickerShootId = null;

  function openProjectPicker(shootId) {
    const s = state.shoots.find(x => x.id === shootId);
    if (!s) return;
    projectPickerShootId = shootId;
    const current = s.projectId ? findProject(s.projectId) : null;
    const openBtn = document.getElementById('projectPickerOpenBtn');
    openBtn.textContent = current ? `Open ${current.name}` : '';
    openBtn.hidden = !current;
    document.getElementById('projectPickerRemoveBtn').hidden = !current;
    // A shoot that isn't in a project yet is usually about to become the
    // first of one, so its own name is the likeliest project name; a
    // member opening this is more likely moving somewhere new, so it
    // starts blank.
    document.getElementById('projectPickerNameInput').value = current ? '' : (s.title || primaryTalentName(s) || '');
    // Alphabetical, like every other options list here.
    const projects = projectsList().slice()
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
    const list = document.getElementById('projectPickerList');
    list.innerHTML = projects.map(p => `
      <button type="button" class="options-item choice-item${current && p.id === current.id ? ' active' : ''}" data-project-id="${escapeHtml(p.id)}">${escapeHtml(p.name)}</button>
    `).join('');
    list.hidden = !projects.length;
    document.getElementById('projectPickerDivider').hidden = !projects.length;
    projectPickerOverlay.hidden = false;
  }

  function closeProjectPicker() {
    projectPickerOverlay.hidden = true;
    projectPickerShootId = null;
  }

  // Every membership change lands the same way: persist, repaint the lists
  // (which also repaints an open project popup, see renderAll), refresh a
  // stat box popup left open underneath, and say what happened — the
  // shoot's own row can vanish into a project box, so the toast is the
  // only confirmation it went where you meant.
  function finishProjectMembershipChange(message) {
    saveState();
    renderAll();
    refreshOpenStatBoxDetail();
    showToast(message);
  }

  document.getElementById('projectShootOptionBtn').addEventListener('click', () => {
    const id = optionsShootId;
    closeShootOptions();
    if (id) openProjectPicker(id);
  });

  document.getElementById('projectPickerOpenBtn').addEventListener('click', () => {
    const s = state.shoots.find(x => x.id === projectPickerShootId);
    closeProjectPicker();
    if (s && s.projectId) openProjectPopup(s.projectId);
  });

  function createProjectFromPicker() {
    const shootId = projectPickerShootId;
    const name = document.getElementById('projectPickerNameInput').value.trim() || UNTITLED_PROJECT_NAME;
    closeProjectPicker();
    if (!shootId || !state.shoots.some(x => x.id === shootId)) return;
    const project = createProject(name);
    // Moves a member out of its old project too; setShootProject prunes
    // the old one if this was its last shoot.
    setShootProject(shootId, project.id);
    finishProjectMembershipChange(`Added to ${project.name}`);
  }

  document.getElementById('projectPickerCreateBtn').addEventListener('click', createProjectFromPicker);

  document.getElementById('projectPickerNameInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') createProjectFromPicker();
  });

  document.getElementById('projectPickerList').addEventListener('click', (e) => {
    const btn = e.target.closest('.options-item');
    if (!btn) return;
    const shootId = projectPickerShootId;
    const project = findProject(btn.dataset.projectId);
    closeProjectPicker();
    const s = state.shoots.find(x => x.id === shootId);
    // Tapping the project it's already in is just a way out.
    if (!s || !project || s.projectId === project.id) return;
    const wasInOne = !!(s.projectId && findProject(s.projectId));
    setShootProject(shootId, project.id);
    finishProjectMembershipChange(`${wasInOne ? 'Moved' : 'Added'} to ${project.name}`);
  });

  document.getElementById('projectPickerRemoveBtn').addEventListener('click', () => {
    const s = state.shoots.find(x => x.id === projectPickerShootId);
    closeProjectPicker();
    if (!s || !s.projectId) return;
    const project = findProject(s.projectId);
    setShootProject(s.id, '');
    finishProjectMembershipChange(project ? `Removed from ${project.name}` : 'Removed from project');
  });

  document.getElementById('projectPickerCancelBtn').addEventListener('click', closeProjectPicker);

  projectPickerOverlay.addEventListener('click', (e) => {
    if (e.target === projectPickerOverlay) closeProjectPicker();
  });

  document.getElementById('shootOptionsCancelBtn').addEventListener('click', closeShootOptions);

  shootOptionsOverlay.addEventListener('click', (e) => {
    if (e.target === shootOptionsOverlay) closeShootOptions();
  });

  // ---------- Toast ----------
  let toastTimer = null;
  function showToast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.hidden = true; }, 3200);
  }

  // ---------- Share shoot as PDF ----------
  let cachedLogoDataUrl = null;
  function loadLogoDataUrl() {
    if (cachedLogoDataUrl) return Promise.resolve(cachedLogoDataUrl);
    return fetch('logo.png')
      .then(res => res.blob())
      .then(blob => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => { cachedLogoDataUrl = reader.result; resolve(cachedLogoDataUrl); };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      }));
  }

  function getImageDims(src) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
      img.onerror = () => resolve({ w: 1, h: 1 });
      img.src = src;
    });
  }

  function fitContain(w, h, boxW, boxH) {
    const scale = Math.min(boxW / w, boxH / h);
    return { w: w * scale, h: h * scale };
  }

  function shootTimeRange(s) {
    const start = prettyTime(s.startTime);
    const end = prettyTime(s.endTime);
    if (start && end) return `${start} – ${end}`;
    return start || end || '';
  }

  async function buildShootPdf(s, chosenSections) {
    const sections = chosenSections || { talent: true, logistics: true, deliverables: true, direction: false, references: false, team: true, moodboard: true };
    const isVideo = isVideoShoot(s);
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 44;
    const navy = [49, 61, 69];
    const yellow = [255, 209, 3];
    const logoSize = 36;
    const logoGap = 14;
    const titleX = margin + logoSize + logoGap;
    const titleFontSize = 26;
    const titleLineHeight = titleFontSize * 1.15;

    doc.setFont('courier', 'bold');
    doc.setFontSize(titleFontSize);
    const titleLines = doc.splitTextToSize((s.title || primaryTalentName(s) || 'Shoot').toUpperCase(), pageWidth - titleX - margin);
    const titleBlockHeight = titleLines.length * titleLineHeight;
    const headerHeight = Math.max(64, titleBlockHeight + 28);

    doc.setFillColor(...navy);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');

    const logoDataUrl = await loadLogoDataUrl();
    doc.addImage(logoDataUrl, 'PNG', margin, (headerHeight - logoSize) / 2, logoSize, logoSize);

    doc.setTextColor(...yellow);
    doc.setFont('courier', 'bold');
    doc.setFontSize(titleFontSize);
    const titleTopPad = (headerHeight - titleBlockHeight) / 2;
    titleLines.forEach((line, i) => {
      doc.text(line, titleX, titleTopPad + i * titleLineHeight + titleLineHeight * 0.83);
    });

    doc.setTextColor(...navy);
    let y = headerHeight + 34;

    // Every section below calls this before drawing. Without it a block that
    // starts near the bottom just draws past the page edge and disappears
    // instead of continuing overleaf.
    function ensureSpace(needed) {
      if (y + needed > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    }

    // Draws a "Label: value" line, wrapping the value and letting it flow across
    // a page break rather than treating the whole block as one unit. Reserving
    // the full wrapped height up front meant a long value that didn't quite fit
    // jumped to the next page wholesale — leaving most of a page blank when
    // there was room for all but the last line or two. Only the label and its
    // first line are kept together; everything after breaks wherever it lands.
    function drawLabeledLine(label, value, lineHeight) {
      const maxWidth = pageWidth - margin * 2;
      doc.setFont('courier', 'bold');
      const labelWidth = doc.getTextWidth(label);
      doc.setFont('courier', 'normal');
      const lines = doc.splitTextToSize(String(value), Math.max(10, maxWidth - labelWidth));
      if (!lines.length) return;
      ensureSpace(lineHeight * 2);
      doc.setFont('courier', 'bold');
      doc.text(label, margin, y);
      doc.setFont('courier', 'normal');
      doc.text(lines[0], margin + labelWidth, y);
      y += lineHeight;
      for (let i = 1; i < lines.length; i++) {
        ensureSpace(lineHeight);
        doc.text(lines[i], margin, y);
        y += lineHeight;
      }
    }

    // firstChunk is how much of the section's own content must fit alongside the
    // heading, so a heading never lands as the last thing on a page with its
    // content orphaned overleaf. Grid sections measure their first row and pass
    // that in; text sections take the default couple of lines.
    function sectionHeading(text, firstChunk = 34) {
      ensureSpace(24 + firstChunk);
      doc.setTextColor(...navy);
      doc.setFont('courier', 'bold');
      doc.setFontSize(18);
      doc.text(text, margin, y);
      y += 24;
    }

    // Two columns, shared by the talent grid and the mood board grid.
    const colGap = 14;
    const colW = (pageWidth - margin * 2 - colGap) / 2;

    // A talent counts as worth printing if they have a name OR a photo — an
    // unnamed talent with a portrait used to drop out of the PDF entirely. The
    // label then falls back to their position, matching the "Talent N" the
    // editor's own card bar shows. Numbering comes from the index in the full
    // list so it lines up with the app even when earlier talents are skipped.
    const talentsForPdf = (s.talents || [])
      .map((talent, idx) => ({ talent, label: hasText(talent.name) ? talent.name.trim() : `Talent ${idx + 1}` }))
      .filter(({ talent }) => hasText(talent.name) || hasText(talent.photo));
    if (talentsForPdf.length && sections.talent) {
      // One "Talent:" heading for the section, then each person laid out two per
      // row — name, handles, photo — so a three- or four-talent shoot doesn't
      // run down the page repeating the word "Talent".
      const NAME_SIZE = 13;
      const NAME_LINE = NAME_SIZE + 4;
      const HANDLE_SIZE = 10;
      const HANDLE_LINE = HANDLE_SIZE + 4;
      const PHOTO_MAX_H = 150;
      const PHOTO_GAP = 6;

      // Measured up front: a row's height is its taller column, and that has to
      // be known before anything is drawn so the row can page-break as a unit.
      const blocks = [];
      for (const { talent, label } of talentsForPdf) {
        doc.setFont('courier', 'bold');
        doc.setFontSize(NAME_SIZE);
        const nameLines = doc.splitTextToSize(label, colW);
        const handleTexts = (talent.socialHandles || [])
          .filter(sh => hasText(sh.handle))
          .map(sh => {
            const entry = SOCIAL_PLATFORM_OPTIONS.find(([val]) => val === sh.platform);
            return `${entry ? entry[1] : 'Other'}: ${sh.handle}`;
          });
        doc.setFont('courier', 'normal');
        doc.setFontSize(HANDLE_SIZE);
        const handleLines = handleTexts.reduce((acc, t) => acc.concat(doc.splitTextToSize(t, colW)), []);
        let photo = null;
        if (hasText(talent.photo)) {
          const dims = await getImageDims(talent.photo);
          photo = fitContain(dims.w, dims.h, colW, PHOTO_MAX_H);
        }
        const height = nameLines.length * NAME_LINE
          + handleLines.length * HANDLE_LINE
          + (photo ? photo.h + PHOTO_GAP : 0);
        blocks.push({ nameLines, handleLines, photo, src: talent.photo, height });
      }

      sectionHeading('Talent:', Math.max(...blocks.slice(0, 2).map(b => b.height)));

      for (let i = 0; i < blocks.length; i += 2) {
        const row = blocks.slice(i, i + 2);
        const rowH = Math.max(...row.map(b => b.height));
        ensureSpace(rowH);
        row.forEach((b, c) => {
          const x = margin + c * (colW + colGap);
          let by = y;
          doc.setTextColor(...navy);
          doc.setFont('courier', 'bold');
          doc.setFontSize(NAME_SIZE);
          b.nameLines.forEach(line => { by += NAME_SIZE; doc.text(line, x, by); by += 4; });
          doc.setFont('courier', 'normal');
          doc.setFontSize(HANDLE_SIZE);
          b.handleLines.forEach(line => { by += HANDLE_SIZE; doc.text(line, x, by); by += 4; });
          if (b.photo) {
            by += PHOTO_GAP;
            doc.addImage(b.src, 'JPEG', x, by, b.photo.w, b.photo.h);
          }
        });
        y += rowH + 16;
      }
      y += 4;
    }

    const timeRange = shootTimeRange(s);
    const locationDisplay = formatLocationDisplayNoCountry(s.location);
    // Video call sheets also carry separate crew and talent call times.
    const crewCall = isVideo ? prettyTime(s.crewCallTime) : '';
    const talentCall = isVideo ? prettyTime(s.talentCallTime) : '';
    if ((s.date || timeRange || crewCall || talentCall || locationDisplay || hasText(s.locationDirections) || hasText(s.talentDirections) || hasText(s.teamDirections)) && sections.logistics) {
      sectionHeading('Logistics:');
      doc.setFontSize(11);
      if (s.date) drawLabeledLine('Date: ', prettyDate(s.date), 16);
      if (timeRange) drawLabeledLine('Time: ', timeRange, 16);
      if (crewCall) drawLabeledLine('Crew call: ', crewCall, 16);
      if (talentCall) drawLabeledLine('Talent call: ', talentCall, 16);
      if (locationDisplay) { drawLabeledLine('Location: ', locationDisplay, 14); y += 2; }
      if (hasText(s.locationDirections)) { drawLabeledLine('Location instructions: ', s.locationDirections, 14); y += 2; }
      if (hasText(s.talentDirections)) { drawLabeledLine('Directions for talent: ', s.talentDirections, 14); y += 2; }
      if (hasText(s.teamDirections)) { drawLabeledLine('Directions for team: ', s.teamDirections, 14); y += 2; }
      y += 8;
    }

    // Video only: what's being made and where it's going. On by default in
    // the sections popup (unlike Direction): crew frame a 9:16 Reel
    // differently from a 16:9 film, so the call sheet is where they need it.
    const deliverableFields = videoDeliverableFields(s);
    if (deliverableFields.length && sections.deliverables) {
      sectionHeading('Deliverables:');
      doc.setFontSize(11);
      deliverableFields.forEach(([label, value]) => {
        drawLabeledLine(`${label}: `, value, 14);
        y += 6;
      });
      y += 8;
    }

    // Direction is opt-in (unchecked by default in the sections popup) — it's
    // internal creative planning, so it only goes out when deliberately chosen.
    const directionFields = [
      ['Concept: ', s.premise],
      ['Elevator pitch: ', s.elevatorPitch],
      ['Character/Personality: ', s.character],
      ['World-building notes: ', s.worldNotes],
      ['Shoot goals: ', s.shootGoals],
    ].filter(([, value]) => hasText(value));
    if (directionFields.length && sections.direction) {
      sectionHeading('Direction:');
      doc.setFontSize(11);
      directionFields.forEach(([label, value]) => {
        drawLabeledLine(label, value.trim(), 14);
        y += 6;
      });
      y += 8;
    }

    const refs = (s.references || []).map(r => r.trim()).filter(Boolean);
    if (refs.length && sections.references) {
      sectionHeading('References:');
      doc.setFont('courier', 'normal');
      doc.setFontSize(11);
      refs.forEach(r => {
        ensureSpace(15);
        doc.text(`• ${r}`, margin, y, { maxWidth: pageWidth - margin * 2 });
        y += 15;
      });
      y += 10;
    }

    const team = s.teamRequired === 'yes' ? (s.teamMembers || []) : [];
    const photographer = normalizePhotographer(state.photographer);
    const showPhotographer = photographerHasInfo(photographer);
    // The photographer leads the crew list — whoever gets this call sheet should
    // see who's shooting it and how to reach them before the rest of the team.
    // The section shows even with no team members, as long as there's an entry.
    if ((team.length || showPhotographer) && sections.team) {
      sectionHeading('Team:');
      doc.setFont('courier', 'normal');
      doc.setFontSize(11);
      if (showPhotographer) {
        const who = hasText(photographer.name) ? photographer.name : (photographer.businessName || 'Photographer');
        const business = hasText(photographer.name) && hasText(photographer.businessName) ? ` (${photographer.businessName})` : '';
        ensureSpace(15);
        doc.text(`• ${who}${business} — Photographer`, margin, y);
        y += 15;
        if (hasText(photographer.socialHandle)) {
          const entry = SOCIAL_PLATFORM_OPTIONS.find(([val]) => val === photographer.socialPlatform);
          ensureSpace(15);
          doc.text(`   ${entry ? entry[1] : 'Other'}: ${photographer.socialHandle}`, margin, y);
          y += 15;
        }
        if (hasText(photographer.phone)) {
          ensureSpace(15);
          doc.text(`   Phone: ${photographer.phone}`, margin, y);
          y += 15;
        }
      }
      team.forEach(tm => {
        ensureSpace(hasText(tm.socialHandle) ? 30 : 15);
        const roleEntry = TEAM_ROLE_OPTIONS.find(([val]) => val === tm.role);
        const roleLabel = roleEntry ? roleEntry[1] : 'Other';
        doc.text(`• ${tm.name ? tm.name : 'Unnamed'} — ${roleLabel}`, margin, y);
        y += 15;
        if (hasText(tm.socialHandle)) {
          const platformEntry = SOCIAL_PLATFORM_OPTIONS.find(([val]) => val === tm.socialPlatform);
          const platformLabel = platformEntry ? platformEntry[1] : 'Other';
          doc.text(`   ${platformLabel}: ${tm.socialHandle}`, margin, y);
          y += 15;
        }
      });
      y += 10;
    }

    // General direction notes are deliberately left off the shared PDF —
    // they're internal visual-direction planning, not something meant to
    // go out to a client or talent.

    const images = sections.moodboard ? await idbGetImages(s.id) : [];
    if (images.length) {
      // Paginated by the space actually left on the page, one row at a time.
      // The previous version batched by a fixed count (2 on the first page, 4
      // after) and forced a new page once the batch was placed — so a page
      // would take its two images and then break, leaving the whole lower half
      // blank while the rest of the set carried on overleaf.
      const cellH = colW * 1.3;

      // Measured into rows first, so the heading can reserve its first row and
      // the loop can page-break on real heights. Rows are as tall as their
      // tallest image (capped), so a row of wide shots stays tight rather than
      // being letterboxed inside a full-height cell.
      const rows = [];
      for (let idx = 0; idx < images.length; idx += 2) {
        const items = [];
        for (let c = 0; c < 2 && idx + c < images.length; c++) {
          const img = images[idx + c];
          const dims = await getImageDims(img.src);
          items.push({ src: img.src, ...fitContain(dims.w, dims.h, colW, cellH) });
        }
        rows.push({ items, height: Math.max(...items.map(it => it.h)) });
      }

      sectionHeading(`${moodboardTerm(s.category)}:`, rows[0].height);

      rows.forEach(row => {
        ensureSpace(row.height);
        row.items.forEach((it, c) => {
          const x = margin + c * (colW + colGap);
          doc.addImage(it.src, 'JPEG', x + (colW - it.w) / 2, y, it.w, it.h);
        });
        y += row.height + colGap;
      });
    }

    return doc;
  }

  // ---------- PDF sections choice (shown before building, so the user can
  // opt out of sections they don't want in this particular share). Direction
  // and References default to OFF — Direction is internal creative planning
  // and References are inspiration links, neither of which usually belongs in
  // the copy that goes out to a client or talent, so they're opt-in.
  // Deliverables only shows for video shoots, and defaults ON. ----------
  let pdfSectionsShootId = null;

  function openPdfSectionsModal(id) {
    pdfSectionsShootId = id;
    const s = state.shoots.find(x => x.id === id);
    document.getElementById('pdfSectionTalent').checked = true;
    document.getElementById('pdfSectionLogistics').checked = true;
    document.getElementById('pdfSectionDeliverables').checked = true;
    document.getElementById('pdfSectionDeliverablesRow').hidden = !isVideoShoot(s);
    document.getElementById('pdfSectionDirection').checked = false;
    document.getElementById('pdfSectionReferences').checked = false;
    document.getElementById('pdfSectionTeam').checked = true;
    document.getElementById('pdfSectionMoodboard').checked = true;
    document.getElementById('pdfSectionMoodboardLabel').textContent = moodboardTerm(s && s.category);
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
    if (id) openPdfPreview(id, chosenSections);
  });

  // ---------- PDF preview (shows the built PDF before offering to share it) ----------
  let pdfPreviewBlob = null;
  let pdfPreviewFilename = '';
  let pdfPreviewTitle = '';

  // The last call sheet built, kept so reopening it with everything unchanged
  // skips rebuilding (the slow part: laying out the pages and embedding every
  // photo). The key covers everything that goes into the PDF — the chosen
  // sections, the shoot's own fields (talent photos included), the photographer
  // info, and the mood board images — so changing ANY of them, e.g. switching
  // the mood board off, always builds a fresh one rather than showing the
  // previous version. Only the most recent build is kept.
  let callSheetCache = null;

  function hashString(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return h >>> 0;
  }

  async function callSheetCacheKey(s, sections) {
    const parts = [
      s.id,
      JSON.stringify(sections),
      JSON.stringify(s),
      JSON.stringify(normalizePhotographer(state.photographer)),
    ];
    // Mood board photos live in IndexedDB rather than on the shoot, so they
    // need their own read — skipped entirely when the section is off, since
    // they don't affect the PDF then.
    if (sections.moodboard) {
      const imgs = await idbGetImages(s.id);
      parts.push(imgs.map(img => `${(img.src || '').length}:${hashString(img.src || '')}:${img.caption || ''}`).join('|'));
    }
    return parts.map(part => `${part.length}:${hashString(part)}`).join('/');
  }

  // Always lands on this app's own preview (with Close and Share) rather than
  // handing straight off to the phone's share sheet — you look it over first,
  // then Share sends it on with the right filename.
  async function openPdfPreview(id, chosenSections) {
    const s = state.shoots.find(x => x.id === id);
    if (!s) return;
    try {
      const key = await callSheetCacheKey(s, chosenSections);
      if (!callSheetCache || callSheetCache.key !== key) {
        showToast('Building call sheet…');
        const doc = await buildShootPdf(s, chosenSections);
        const dateLabel = formatDateDots(s.date);
        const nameOrTalent = s.title || primaryTalentName(s) || 'Shoot';
        const title = dateLabel ? `${dateLabel} — ${nameOrTalent} call sheet` : `${nameOrTalent} call sheet`;
        // Filename allows dots (the date format needs them) but swaps the em
        // dash for a plain hyphen rather than dropping it, since the sanitizer
        // strips anything that isn't word/hyphen/space/dot.
        const safeName = title.replace(/—/g, '-').replace(/[^\w\- .]+/g, '').trim() || 'call sheet';
        callSheetCache = { key, blob: doc.output('blob'), title, filename: `${safeName}.pdf` };
      }
      pdfPreviewBlob = callSheetCache.blob;
      pdfPreviewTitle = callSheetCache.title;
      pdfPreviewFilename = callSheetCache.filename;
      showPdfPreview(pdfPreviewBlob);
    } catch (err) {
      console.error('Failed to build shoot PDF', err);
      showToast('Could not create PDF');
    }
  }

  // ---------- PDF preview viewer ----------
  // Draws the built PDF with pdf.js instead of an <iframe>, so it looks the
  // same everywhere: page 1 is sized to fit the whole screen (nothing cut off
  // to scroll to), further pages sit below it, and it zooms in where you need
  // to — pinch, double-tap, or the +/- buttons. The viewport scrolls natively
  // (real momentum, pans in both directions once zoomed); zoom just widens the
  // pages and re-anchors the scroll position so the spot you're pinching on
  // stays put. pdf.js loads the first time a preview opens, not at launch.
  const PDF_ZOOM_MAX = 5;
  const PDF_DOUBLE_TAP_ZOOM = 2.5;
  const PDF_MAX_CANVAS_PX = 2600;
  const pdfViewer = { doc: null, pages: [], zoom: 1, fitW: 0, token: 0, sharpenTimer: null };
  let pdfjsLoadPromise = null;

  function loadPdfJs() {
    if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
    if (!pdfjsLoadPromise) {
      pdfjsLoadPromise = new Promise((resolve, reject) => {
        const el = document.createElement('script');
        el.src = 'lib/pdf.min.js';
        el.onload = () => {
          window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'lib/pdf.worker.min.js';
          resolve(window.pdfjsLib);
        };
        el.onerror = () => { pdfjsLoadPromise = null; reject(new Error('pdf.js failed to load')); };
        document.head.appendChild(el);
      });
    }
    return pdfjsLoadPromise;
  }

  const pdfViewportEl = document.getElementById('pdfPreviewViewport');
  const pdfPagesEl = document.getElementById('pdfPreviewPages');
  const pdfStatusEl = document.getElementById('pdfPreviewStatus');
  const pdfPageIndicatorEl = document.getElementById('pdfPageIndicator');

  // One whole page fits inside the viewport, whichever way it's limited —
  // width on a phone, height on a wide screen.
  function pdfFitWidth() {
    const first = pdfViewer.pages[0];
    if (!first) return 0;
    const availW = pdfViewportEl.clientWidth - 16;
    const availH = pdfViewportEl.clientHeight - 16;
    return Math.max(80, Math.min(availW, availH * (first.w / first.h)));
  }

  async function renderPdfPage(p, pixelW) {
    if (p.task) { try { p.task.cancel(); } catch (e) { /* already finished */ } }
    const vp = p.page.getViewport({ scale: pixelW / p.w });
    const off = document.createElement('canvas');
    off.width = Math.round(vp.width);
    off.height = Math.round(vp.height);
    const task = p.page.render({ canvasContext: off.getContext('2d'), viewport: vp });
    p.task = task;
    try {
      await task.promise;
    } catch (err) {
      if (err && err.name === 'RenderingCancelledException') return;
      throw err;
    }
    p.canvas.width = off.width;
    p.canvas.height = off.height;
    p.canvas.getContext('2d').drawImage(off, 0, 0);
    p.renderedW = off.width;
    p.task = null;
  }

  // Pages start at a resolution good for about 1.5x zoom; once zoom settles,
  // the pages actually in view are redrawn sharp for the size they're
  // displayed at (capped, so a big zoom can't exhaust memory), and pages that
  // have scrolled away drop back down.
  function refreshPdfResolution() {
    const dpr = window.devicePixelRatio || 1;
    const vpRect = pdfViewportEl.getBoundingClientRect();
    pdfViewer.pages.forEach(p => {
      const r = p.wrap.getBoundingClientRect();
      const visible = r.bottom > vpRect.top && r.top < vpRect.bottom;
      const base = Math.min(PDF_MAX_CANVAS_PX, Math.max(700, Math.round(pdfViewer.fitW * dpr * 1.5)));
      const want = visible ? Math.min(PDF_MAX_CANVAS_PX, Math.max(base, Math.round(r.width * dpr))) : base;
      if (!p.renderedW || Math.abs(want - p.renderedW) / p.renderedW > 0.25) {
        renderPdfPage(p, want).catch(() => {});
      }
    });
  }

  function schedulePdfSharpen() {
    clearTimeout(pdfViewer.sharpenTimer);
    pdfViewer.sharpenTimer = setTimeout(refreshPdfResolution, 220);
  }

  // Sets the zoom (1 = whole page fits) and keeps the point at (ax, ay) —
  // viewport-relative pixels — under the same spot of the page.
  function setPdfZoom(z, ax, ay) {
    if (!pdfViewer.pages.length) return;
    const zoom = Math.max(1, Math.min(PDF_ZOOM_MAX, z));
    if (ax === undefined) ax = pdfViewportEl.clientWidth / 2;
    if (ay === undefined) ay = pdfViewportEl.clientHeight / 2;
    const w0 = pdfPagesEl.offsetWidth;
    const h0 = pdfPagesEl.offsetHeight;
    const fracX = w0 ? (pdfViewportEl.scrollLeft + ax - pdfPagesEl.offsetLeft) / w0 : 0.5;
    const fracY = h0 ? (pdfViewportEl.scrollTop + ay - pdfPagesEl.offsetTop) / h0 : 0;
    pdfViewer.zoom = zoom;
    pdfPagesEl.style.width = `${pdfViewer.fitW * zoom}px`;
    pdfViewportEl.scrollLeft = fracX * pdfPagesEl.offsetWidth + pdfPagesEl.offsetLeft - ax;
    pdfViewportEl.scrollTop = fracY * pdfPagesEl.offsetHeight + pdfPagesEl.offsetTop - ay;
    schedulePdfSharpen();
    updatePdfPageIndicator();
  }

  function updatePdfPageIndicator() {
    const n = pdfViewer.pages.length;
    pdfPageIndicatorEl.hidden = n < 2;
    if (n < 2) return;
    const mid = pdfViewportEl.scrollTop + pdfViewportEl.clientHeight / 2;
    let current = n;
    for (let i = 0; i < n; i++) {
      const w = pdfViewer.pages[i].wrap;
      if (mid < w.offsetTop + w.offsetHeight + 5) { current = i + 1; break; }
    }
    pdfPageIndicatorEl.textContent = `Page ${current} of ${n}`;
  }

  function teardownPdfViewer() {
    pdfViewer.token++;
    clearTimeout(pdfViewer.sharpenTimer);
    pdfViewer.pages.forEach(p => { if (p.task) { try { p.task.cancel(); } catch (e) { /* already finished */ } } });
    if (pdfViewer.doc) { try { pdfViewer.doc.destroy(); } catch (e) { /* already gone */ } }
    pdfViewer.doc = null;
    pdfViewer.pages = [];
    pdfViewer.zoom = 1;
    pdfPagesEl.innerHTML = '';
    pdfPagesEl.style.width = '';
    pdfPageIndicatorEl.hidden = true;
  }

  async function showPdfPreview(blob) {
    teardownPdfViewer();
    const token = pdfViewer.token;
    pdfStatusEl.textContent = 'Loading preview…';
    pdfStatusEl.hidden = false;
    document.getElementById('pdfPreviewOverlay').hidden = false;
    try {
      const pdfjs = await loadPdfJs();
      const data = new Uint8Array(await blob.arrayBuffer());
      const doc = await pdfjs.getDocument({ data }).promise;
      if (token !== pdfViewer.token) { doc.destroy(); return; }
      pdfViewer.doc = doc;
      for (let i = 1; i <= doc.numPages; i++) {
        const page = await doc.getPage(i);
        if (token !== pdfViewer.token) return;
        const v = page.getViewport({ scale: 1 });
        const wrap = document.createElement('div');
        wrap.className = 'pdf-page';
        wrap.style.aspectRatio = `${v.width} / ${v.height}`;
        const canvas = document.createElement('canvas');
        wrap.appendChild(canvas);
        pdfPagesEl.appendChild(wrap);
        pdfViewer.pages.push({ page, wrap, canvas, w: v.width, h: v.height, renderedW: 0, task: null });
      }
      pdfViewer.fitW = pdfFitWidth();
      pdfPagesEl.style.width = `${pdfViewer.fitW}px`;
      pdfViewportEl.scrollTop = 0;
      pdfViewportEl.scrollLeft = 0;
      pdfStatusEl.hidden = true;
      updatePdfPageIndicator();
      refreshPdfResolution();
    } catch (err) {
      if (token !== pdfViewer.token) return;
      console.error('Failed to display PDF preview', err);
      pdfStatusEl.textContent = "Couldn't show the preview here — you can still Share the PDF.";
    }
  }

  function closePdfPreview() {
    document.getElementById('pdfPreviewOverlay').hidden = true;
    teardownPdfViewer();
    pdfPreviewBlob = null;
  }

  pdfViewportEl.addEventListener('scroll', updatePdfPageIndicator, { passive: true });

  window.addEventListener('resize', () => {
    if (document.getElementById('pdfPreviewOverlay').hidden || !pdfViewer.pages.length) return;
    pdfViewer.fitW = pdfFitWidth();
    pdfPagesEl.style.width = `${pdfViewer.fitW * pdfViewer.zoom}px`;
    schedulePdfSharpen();
  });

  document.getElementById('pdfZoomInBtn').addEventListener('click', () => setPdfZoom(pdfViewer.zoom * 1.5));
  document.getElementById('pdfZoomOutBtn').addEventListener('click', () => setPdfZoom(pdfViewer.zoom / 1.5));

  // Pinch and double-tap. Panning is left to native scrolling; a second finger
  // takes over the gesture and turns it into zoom around the fingers' midpoint.
  (function setupPdfPinchZoom() {
    let pinch = null;
    let lastTap = null;
    let tapStart = null;

    const touchPoint = (t) => {
      const r = pdfViewportEl.getBoundingClientRect();
      return { x: t.clientX - r.left, y: t.clientY - r.top };
    };
    const dist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

    pdfViewportEl.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) {
        pinch = { d0: dist(e.touches[0], e.touches[1]) || 1, z0: pdfViewer.zoom };
        tapStart = null;
      } else if (e.touches.length === 1) {
        tapStart = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() };
      }
    }, { passive: true });

    pdfViewportEl.addEventListener('touchmove', (e) => {
      if (!pinch || e.touches.length !== 2) return;
      if (e.cancelable) e.preventDefault();
      const a = touchPoint(e.touches[0]);
      const b = touchPoint(e.touches[1]);
      setPdfZoom(pinch.z0 * dist(e.touches[0], e.touches[1]) / pinch.d0, (a.x + b.x) / 2, (a.y + b.y) / 2);
    }, { passive: false });

    pdfViewportEl.addEventListener('touchend', (e) => {
      if (pinch) {
        if (e.touches.length < 2) pinch = null;
        lastTap = null;
        return;
      }
      if (!tapStart || e.changedTouches.length !== 1) return;
      const t = e.changedTouches[0];
      const moved = Math.hypot(t.clientX - tapStart.x, t.clientY - tapStart.y);
      const now = Date.now();
      if (moved < 12 && now - tapStart.t < 300) {
        if (lastTap && now - lastTap.t < 300 && Math.hypot(t.clientX - lastTap.x, t.clientY - lastTap.y) < 40) {
          const p = touchPoint(t);
          setPdfZoom(pdfViewer.zoom > 1.05 ? 1 : PDF_DOUBLE_TAP_ZOOM, p.x, p.y);
          lastTap = null;
        } else {
          lastTap = { x: t.clientX, y: t.clientY, t: now };
        }
      } else {
        lastTap = null;
      }
      tapStart = null;
    }, { passive: true });

    pdfViewportEl.addEventListener('touchcancel', () => { pinch = null; tapStart = null; lastTap = null; }, { passive: true });
  })();

  document.getElementById('pdfPreviewCloseBtn').addEventListener('click', closePdfPreview);

  document.getElementById('pdfPreviewOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('pdfPreviewOverlay')) closePdfPreview();
  });

  document.getElementById('pdfPreviewShareBtn').addEventListener('click', async () => {
    if (!pdfPreviewBlob) return;
    try {
      const file = new File([pdfPreviewBlob], pdfPreviewFilename, { type: 'application/pdf' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: pdfPreviewTitle });
      } else {
        const url = URL.createObjectURL(pdfPreviewBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = pdfPreviewFilename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 4000);
      }
    } catch (err) {
      if (err && err.name !== 'AbortError') {
        console.error('Failed to share shoot PDF', err);
        showToast('Could not create PDF');
      }
    }
  });

  // ---------- Journal entry PDF (share a single reflection) ----------
  // Same header/body drawing conventions as buildShootPdf (title banner,
  // ensureSpace, courier body text) — no sections to choose here since a
  // journal entry is just title/date/tags/body/photos, one flat page.
  async function buildJournalEntryPdf(entry) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 44;
    const navy = [49, 61, 69];
    const yellow = [255, 209, 3];
    const logoSize = 36;
    const logoGap = 14;
    const titleX = margin + logoSize + logoGap;
    const titleFontSize = 26;
    const titleLineHeight = titleFontSize * 1.15;

    doc.setFont('courier', 'bold');
    doc.setFontSize(titleFontSize);
    const titleLines = doc.splitTextToSize((entry.title || 'Untitled entry').toUpperCase(), pageWidth - titleX - margin);
    const titleBlockHeight = titleLines.length * titleLineHeight;
    const headerHeight = Math.max(64, titleBlockHeight + 28);

    doc.setFillColor(...navy);
    doc.rect(0, 0, pageWidth, headerHeight, 'F');

    const logoDataUrl = await loadLogoDataUrl();
    doc.addImage(logoDataUrl, 'PNG', margin, (headerHeight - logoSize) / 2, logoSize, logoSize);

    doc.setTextColor(...yellow);
    doc.setFont('courier', 'bold');
    doc.setFontSize(titleFontSize);
    const titleTopPad = (headerHeight - titleBlockHeight) / 2;
    titleLines.forEach((line, i) => {
      doc.text(line, titleX, titleTopPad + i * titleLineHeight + titleLineHeight * 0.83);
    });

    doc.setTextColor(...navy);
    let y = headerHeight + 34;

    function ensureSpace(needed) {
      if (y + needed > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    }

    doc.setFont('courier', 'bold');
    doc.setFontSize(11);
    doc.text(prettyDate(entry.createdAt), margin, y);
    y += 24;

    if ((entry.tags || []).length) {
      doc.setFont('courier', 'normal');
      doc.setFontSize(11);
      const tagsLine = entry.tags.map(t => `#${t}`).join('   ');
      doc.splitTextToSize(tagsLine, pageWidth - margin * 2).forEach(line => {
        ensureSpace(16);
        doc.text(line, margin, y);
        y += 16;
      });
      y += 8;
    }

    if (hasText(entry.body)) {
      doc.setFont('courier', 'normal');
      doc.setFontSize(12);
      entry.body.split('\n').forEach(paragraph => {
        const wrapped = doc.splitTextToSize(paragraph, pageWidth - margin * 2);
        (wrapped.length ? wrapped : ['']).forEach(line => {
          ensureSpace(17);
          doc.text(line, margin, y);
          y += 17;
        });
      });
      y += 10;
    }

    const images = await idbGetImages(journalEntryImagesKey(entry));
    if (images.length) {
      const maxImgW = pageWidth - margin * 2;
      const maxImgH = 320;
      for (const img of images) {
        const dims = await getImageDims(img.src);
        const fitted = fitContain(dims.w, dims.h, maxImgW, maxImgH);
        ensureSpace(fitted.h + 20);
        doc.addImage(img.src, 'JPEG', margin, y, fitted.w, fitted.h);
        y += fitted.h + 10;
        if (hasText(img.caption)) {
          doc.setFont('courier', 'normal');
          doc.setFontSize(10);
          doc.splitTextToSize(img.caption, maxImgW).forEach(line => {
            ensureSpace(14);
            doc.text(line, margin, y);
            y += 14;
          });
          y += 6;
        }
      }
    }

    return doc;
  }

  async function openJournalEntryPdfPreview(id) {
    const entry = state.journalEntries.find(e => e.id === id);
    if (!entry) return;
    // Web Share, tried first, is the only thing that reliably hands off a
    // correctly-named file (Mail/Messages/etc respect the name on a File
    // shared this way, unlike a blob: URL opened in a new tab), and skips both
    // the new tab and this app's own preview modal when it's available.
    // Probed with a throwaway file since the real PDF doesn't exist yet and
    // this has to be decided before the popup below, which needs the same
    // still-fresh user gesture either way.
    const canWebShare = !!(navigator.canShare && navigator.share
      && navigator.canShare({ files: [new File([''], 'probe.pdf', { type: 'application/pdf' })] }));
    const previewWindow = canWebShare ? null : window.open('', '_blank');
    try {
      const doc = await buildJournalEntryPdf(entry);
      pdfPreviewBlob = doc.output('blob');
      const dateLabel = prettyDate(entry.createdAt);
      const titleOrUntitled = entry.title || 'Untitled entry';
      pdfPreviewTitle = dateLabel ? `${dateLabel} — ${titleOrUntitled}` : titleOrUntitled;
      const safeName = pdfPreviewTitle.replace(/—/g, '-').replace(/[^\w\- .]+/g, '').trim() || 'journal entry';
      pdfPreviewFilename = `${safeName}.pdf`;
      if (canWebShare) {
        const file = new File([pdfPreviewBlob], pdfPreviewFilename, { type: 'application/pdf' });
        await navigator.share({ files: [file], title: pdfPreviewTitle });
        return;
      }
      if (previewWindow) previewWindow.location.href = URL.createObjectURL(pdfPreviewBlob);
      showPdfPreview(pdfPreviewBlob);
      if (previewWindow) showToast('Opened for viewing — use Share below to send it with the right filename');
    } catch (err) {
      if (previewWindow) previewWindow.close();
      if (err && err.name === 'AbortError') return;
      console.error('Failed to build journal entry PDF', err);
      showToast('Could not create PDF');
    }
  }

  document.getElementById('shareJournalOptionBtn').addEventListener('click', () => {
    const id = optionsJournalEntryId;
    closeJournalOptions();
    if (id) openJournalEntryPdfPreview(id);
  });

  // ---------- Export previous shoots (archive PDF + optional bulk cleanup) ----------
  // A separate, much bigger export than the single-shoot call sheet above: one
  // PDF containing every text section AND every photo (cover, talent, mood
  // board, final images) for a whole batch of shoots at once, picked by
  // year/month rather than shoot-by-shoot, meant to be the last stop before
  // the user deletes those shoots to free up storage.
  const EXPORT_PREVIOUS_INTRO_KEY = 'dailies_seen_export_previous_intro_v1';

  function shootYearMonth(shoot) {
    const d = shoot.date;
    return { year: d ? d.slice(0, 4) : 'Undated', month: d ? d.slice(5, 7) : '00' };
  }

  function groupShootsByYearMonth(shoots) {
    const years = new Map();
    shoots.forEach(shoot => {
      const { year, month } = shootYearMonth(shoot);
      if (!years.has(year)) years.set(year, new Map());
      const months = years.get(year);
      if (!months.has(month)) months.set(month, []);
      months.get(month).push(shoot);
    });
    return years;
  }

  function renderExportPreviousPicker() {
    const list = document.getElementById('exportPreviousPickerList');
    list.innerHTML = '';
    document.getElementById('exportPreviousPickerEmpty').hidden = state.shoots.length > 0;

    const years = groupShootsByYearMonth(state.shoots);
    const sortedYears = [...years.keys()].sort((a, b) => {
      if (a === 'Undated') return 1;
      if (b === 'Undated') return -1;
      return b.localeCompare(a);
    });

    let visibleYearIndex = 0;
    sortedYears.forEach(year => {
      const months = years.get(year);
      const sortedMonths = [...months.keys()].sort((a, b) => b.localeCompare(a));

      const yearGroupEl = document.createElement('div');
      yearGroupEl.className = 'shoot-status-group';

      const yearCollapseKey = `exportPicker:${year}`;
      const yearCollapsed = isSectionCollapsed(yearCollapseKey);
      const yearHeading = document.createElement('h2');
      yearHeading.className = `status-group-heading export-picker-year-heading ${visibleYearIndex % 2 === 0 ? 'heading-yellow' : 'heading-navy'}${yearCollapsed ? ' collapsed' : ''}`;
      yearHeading.innerHTML = `
        <input type="checkbox" class="export-picker-year-check" data-year="${escapeHtml(year)}" />
        <span class="export-picker-heading-label">${escapeHtml(year)}</span>
        ${COLLAPSE_ARROW_SVG}
      `;

      const monthsWrap = document.createElement('div');
      monthsWrap.className = 'shoot-status-rows';
      monthsWrap.hidden = yearCollapsed;

      sortedMonths.forEach(month => {
        const monthShoots = months.get(month);
        const row = document.createElement('label');
        row.className = 'export-picker-month-row';
        row.innerHTML = `
          <input type="checkbox" class="export-picker-month-check" data-year="${escapeHtml(year)}" data-month="${escapeHtml(month)}" />
          <span>${escapeHtml(monthLabel(month))}</span>
          <span class="export-picker-count">${monthShoots.length} shoot${monthShoots.length === 1 ? '' : 's'}</span>
        `;
        monthsWrap.appendChild(row);
      });

      yearHeading.addEventListener('click', (e) => {
        if (e.target.classList.contains('export-picker-year-check')) return;
        const nowHidden = !monthsWrap.hidden;
        monthsWrap.hidden = nowHidden;
        yearHeading.classList.toggle('collapsed', nowHidden);
        setSectionCollapsed(yearCollapseKey, nowHidden);
      });

      yearGroupEl.appendChild(yearHeading);
      yearGroupEl.appendChild(monthsWrap);
      list.appendChild(yearGroupEl);
      visibleYearIndex++;
    });
  }

  // One delegated listener, wired once (not re-attached on every render):
  // checking a year checks/unchecks every month underneath it; checking or
  // unchecking a month updates its year's checked/indeterminate state to
  // match — the only parent/child checkbox cascade anywhere in this app.
  document.getElementById('exportPreviousPickerList').addEventListener('change', (e) => {
    const list = document.getElementById('exportPreviousPickerList');
    if (e.target.classList.contains('export-picker-year-check')) {
      const year = e.target.dataset.year;
      const checked = e.target.checked;
      list.querySelectorAll(`.export-picker-month-check[data-year="${year}"]`).forEach(cb => { cb.checked = checked; });
      e.target.indeterminate = false;
    } else if (e.target.classList.contains('export-picker-month-check')) {
      const year = e.target.dataset.year;
      const monthChecks = [...list.querySelectorAll(`.export-picker-month-check[data-year="${year}"]`)];
      const yearCheck = list.querySelector(`.export-picker-year-check[data-year="${year}"]`);
      const checkedCount = monthChecks.filter(cb => cb.checked).length;
      yearCheck.checked = checkedCount === monthChecks.length;
      yearCheck.indeterminate = checkedCount > 0 && checkedCount < monthChecks.length;
    }
  });

  function selectedExportPreviousShoots() {
    const checkedMonths = [...document.querySelectorAll('.export-picker-month-check:checked')]
      .map(cb => ({ year: cb.dataset.year, month: cb.dataset.month }));
    if (!checkedMonths.length) return [];
    return state.shoots.filter(shoot => {
      const { year, month } = shootYearMonth(shoot);
      return checkedMonths.some(m => m.year === year && m.month === month);
    });
  }

  function openExportPreviousPicker() {
    renderExportPreviousPicker();
    document.getElementById('exportPreviousPickerOverlay').hidden = false;
  }

  function closeExportPreviousPicker() {
    document.getElementById('exportPreviousPickerOverlay').hidden = true;
  }

  document.getElementById('exportPreviousShootsBtn').addEventListener('click', () => {
    closeAppMenu();
    if (localStorage.getItem(EXPORT_PREVIOUS_INTRO_KEY)) {
      openExportPreviousPicker();
    } else {
      document.getElementById('exportPreviousIntroOverlay').hidden = false;
    }
  });

  document.getElementById('exportPreviousIntroCloseBtn').addEventListener('click', () => {
    localStorage.setItem(EXPORT_PREVIOUS_INTRO_KEY, '1');
    document.getElementById('exportPreviousIntroOverlay').hidden = true;
    openExportPreviousPicker();
  });

  document.getElementById('exportPreviousIntroOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('exportPreviousIntroOverlay')) e.currentTarget.hidden = true;
  });

  document.getElementById('exportPreviousPickerCloseBtn').addEventListener('click', closeExportPreviousPicker);

  document.getElementById('exportPreviousPickerOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('exportPreviousPickerOverlay')) closeExportPreviousPicker();
  });

  // Calling openExportArchivePreview synchronously (not after an await) here
  // matters for the same reason as the single-shoot build button: its own
  // window.open('', '_blank') call needs to stay inside this click handler's
  // user-gesture context, or mobile browsers block it.
  document.getElementById('exportPreviousPickerBuildBtn').addEventListener('click', () => {
    const shoots = selectedExportPreviousShoots();
    if (!shoots.length) { showToast('Select at least one month to export.'); return; }
    closeExportPreviousPicker();
    openExportArchivePreview(shoots);
  });

  function archiveExportLabel(shoots) {
    const count = shoots.length;
    const dated = shoots.map(s => s.date).filter(Boolean).sort();
    if (!dated.length) return `Shoot archive (${count} shoot${count === 1 ? '' : 's'})`;
    const first = formatDateDots(dated[0]);
    const last = formatDateDots(dated[dated.length - 1]);
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
      idbGetImages(projectPhotoKey(shoot.id)),
      idbGetImages(shoot.id),
      idbGetImages(finalImagesKey(shoot.id)),
      Promise.all((shoot.talents || []).map(async (t, idx) => {
        if (!t.id) return null;
        const src = photoFromEntries(await idbGetImages(talentPhotoKey(shoot.id, t.id)));
        if (!src) return null;
        return { src, label: hasText(t.name) ? t.name.trim() : `Talent ${idx + 1}` };
      })),
    ]);
    return {
      cover: photoFromEntries(coverEntries),
      moodboard,
      finalImages,
      talentPhotos: talentPhotos.filter(Boolean),
    };
  }

  async function buildArchivePdf(shoots) {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 44;
    const navy = [49, 61, 69];
    const yellow = [255, 209, 3];
    const logoSize = 30;
    const logoGap = 12;
    const colGap = 14;
    const colW = (pageWidth - margin * 2 - colGap) / 2;
    const logoDataUrl = await loadLogoDataUrl();
    let y = margin;

    function ensureSpace(needed) {
      if (y + needed > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    }

    function drawLabeledLine(label, value, lineHeight) {
      const maxWidth = pageWidth - margin * 2;
      doc.setFont('courier', 'bold');
      const labelWidth = doc.getTextWidth(label);
      doc.setFont('courier', 'normal');
      const lines = doc.splitTextToSize(String(value), Math.max(10, maxWidth - labelWidth));
      if (!lines.length) return;
      ensureSpace(lineHeight * 2);
      doc.setFont('courier', 'bold');
      doc.text(label, margin, y);
      doc.setFont('courier', 'normal');
      doc.text(lines[0], margin + labelWidth, y);
      y += lineHeight;
      for (let i = 1; i < lines.length; i++) {
        ensureSpace(lineHeight);
        doc.text(lines[i], margin, y);
        y += lineHeight;
      }
    }

    function sectionHeading(text, firstChunk = 30) {
      ensureSpace(22 + firstChunk);
      doc.setTextColor(...navy);
      doc.setFont('courier', 'bold');
      doc.setFontSize(14);
      doc.text(text, margin, y);
      y += 19;
    }

    async function drawImageGrid(label, images) {
      if (!images.length) return;
      const cellH = colW * 1.3;
      const rows = [];
      for (let idx = 0; idx < images.length; idx += 2) {
        const items = [];
        for (let c = 0; c < 2 && idx + c < images.length; c++) {
          const img = images[idx + c];
          const dims = await getImageDims(img.src);
          items.push({ src: img.src, ...fitContain(dims.w, dims.h, colW, cellH) });
        }
        rows.push({ items, height: Math.max(...items.map(it => it.h)) });
      }
      sectionHeading(label, rows[0].height);
      rows.forEach(row => {
        ensureSpace(row.height);
        row.items.forEach((it, c) => {
          const x = margin + c * (colW + colGap);
          doc.addImage(it.src, 'JPEG', x + (colW - it.w) / 2, y, it.w, it.h);
        });
        y += row.height + colGap;
      });
      y += 4;
    }

    const orderedShoots = [...shoots].sort(compareShootsForArchive);
    for (let s_i = 0; s_i < orderedShoots.length; s_i++) {
      const s = orderedShoots[s_i];
      if (s_i > 0) { doc.addPage(); y = margin; }

      // Per-shoot header banner — the same navy/yellow band as the
      // single-shoot call sheet, just smaller (14pt), since this is one
      // entry in a running archive rather than a stand-alone document.
      const titleFontSize = 16;
      const titleLineHeight = titleFontSize * 1.15;
      const titleX = margin + logoSize + logoGap;
      doc.setFont('courier', 'bold');
      doc.setFontSize(titleFontSize);
      const headerLabel = (s.title || primaryTalentName(s) || 'Shoot').toUpperCase();
      const titleLines = doc.splitTextToSize(headerLabel, pageWidth - titleX - margin);
      const titleBlockHeight = titleLines.length * titleLineHeight;
      const headerHeight = Math.max(46, titleBlockHeight + 18);

      doc.setFillColor(...navy);
      doc.rect(0, 0, pageWidth, headerHeight, 'F');
      doc.addImage(logoDataUrl, 'PNG', margin, (headerHeight - logoSize) / 2, logoSize, logoSize);
      doc.setTextColor(...yellow);
      const titleTopPad = (headerHeight - titleBlockHeight) / 2;
      titleLines.forEach((line, i) => {
        doc.text(line, titleX, titleTopPad + i * titleLineHeight + titleLineHeight * 0.83);
      });

      doc.setTextColor(...navy);
      doc.setFont('courier', 'normal');
      doc.setFontSize(10);
      const subLabel = [prettyDate(s.date) || 'Date TBD', CATEGORY_LABELS[s.category] || null, STATUS_LABELS[s.status] || null]
        .filter(Boolean).join('   •   ');
      doc.text(subLabel, margin, headerHeight + 16);
      y = headerHeight + 32;
      doc.setFontSize(11);

      // ---- Talent ----
      const talentsForPdf = (s.talents || [])
        .map((talent, idx) => ({ talent, label: hasText(talent.name) ? talent.name.trim() : `Talent ${idx + 1}` }))
        .filter(({ talent }) => hasText(talent.name) || hasText(talent.photo));
      if (talentsForPdf.length) {
        sectionHeading('Talent:');
        doc.setFont('courier', 'normal');
        doc.setFontSize(11);
        talentsForPdf.forEach(({ talent, label }) => {
          ensureSpace(14);
          doc.text(`• ${label}`, margin, y);
          y += 14;
          (talent.socialHandles || []).filter(sh => hasText(sh.handle)).forEach(sh => {
            const entry = SOCIAL_PLATFORM_OPTIONS.find(([val]) => val === sh.platform);
            ensureSpace(14);
            doc.text(`   ${entry ? entry[1] : 'Other'}: ${sh.handle}`, margin, y);
            y += 14;
          });
        });
        y += 6;
      }

      // ---- Logistics ----
      const timeRange = shootTimeRange(s);
      const locationDisplay = formatLocationDisplayNoCountry(s.location);
      const isVideo = isVideoShoot(s);
      const crewCall = isVideo ? prettyTime(s.crewCallTime) : '';
      const talentCall = isVideo ? prettyTime(s.talentCallTime) : '';
      if (timeRange || crewCall || talentCall || locationDisplay || hasText(s.locationDirections) || hasText(s.talentDirections) || hasText(s.teamDirections)) {
        sectionHeading('Logistics:');
        doc.setFontSize(11);
        if (timeRange) drawLabeledLine('Time: ', timeRange, 14);
        if (crewCall) drawLabeledLine('Crew call: ', crewCall, 14);
        if (talentCall) drawLabeledLine('Talent call: ', talentCall, 14);
        if (locationDisplay) { drawLabeledLine('Location: ', locationDisplay, 14); y += 2; }
        if (hasText(s.locationDirections)) { drawLabeledLine('Location instructions: ', s.locationDirections, 14); y += 2; }
        if (hasText(s.talentDirections)) { drawLabeledLine('Directions for talent: ', s.talentDirections, 14); y += 2; }
        if (hasText(s.teamDirections)) { drawLabeledLine('Directions for team: ', s.teamDirections, 14); y += 2; }
        y += 6;
      }

      // ---- Deliverables (video only) ----
      const deliverableFields = videoDeliverableFields(s);
      if (deliverableFields.length) {
        sectionHeading('Deliverables:');
        doc.setFontSize(11);
        deliverableFields.forEach(([label, value]) => { drawLabeledLine(`${label}: `, value, 14); y += 4; });
        y += 6;
      }

      // ---- Direction ----
      const directionFields = [
        ['Concept: ', s.premise],
        ['Elevator pitch: ', s.elevatorPitch],
        ['Character/Personality: ', s.character],
        ['World-building notes: ', s.worldNotes],
        ['Shoot goals: ', s.shootGoals],
      ].filter(([, value]) => hasText(value));
      if (directionFields.length) {
        sectionHeading('Direction:');
        doc.setFontSize(11);
        directionFields.forEach(([label, value]) => { drawLabeledLine(label, value.trim(), 14); y += 4; });
        y += 6;
      }

      // ---- Visuals: framework tags (Visual Language, etc.) + lighting setups ----
      const tagsByFramework = new Map();
      (s.frameworkTags || []).forEach(t => {
        const fw = state.frameworks.find(f => f.id === t.frameworkId);
        const name = fw ? fw.name : 'Visual language';
        if (!tagsByFramework.has(name)) tagsByFramework.set(name, []);
        tagsByFramework.get(name).push(t.tag);
      });
      const lightingSetups = (s.lightingSetups || [])
        .filter(item => hasText(item.name) || hasText(item.characteristics) || hasText(item.description));
      if (tagsByFramework.size || lightingSetups.length) {
        sectionHeading('Visuals:');
        doc.setFontSize(11);
        tagsByFramework.forEach((tags, name) => { drawLabeledLine(`${name}: `, tags.join(', '), 14); y += 2; });
        lightingSetups.forEach((item, idx) => {
          ensureSpace(14);
          doc.setFont('courier', 'bold');
          doc.text(`• ${hasText(item.name) ? item.name.trim() : `Lighting setup ${idx + 1}`}`, margin, y);
          y += 14;
          doc.setFont('courier', 'normal');
          if (hasText(item.characteristics)) drawLabeledLine('   Characteristics: ', item.characteristics, 14);
          if (hasText(item.description)) drawLabeledLine('   Description: ', item.description, 14);
        });
        y += 6;
      }

      // ---- Shot list ----
      const shots = (s.shotList || []).filter(item => hasText(item.text));
      if (shots.length) {
        sectionHeading('Shot list:');
        doc.setFont('courier', 'normal');
        doc.setFontSize(11);
        const maxWidth = pageWidth - margin * 2 - 16;
        shots.forEach(item => {
          const lines = doc.splitTextToSize(item.text.trim(), maxWidth);
          ensureSpace(14 * lines.length);
          lines.forEach((line, i) => {
            doc.text(i === 0 ? `${item.checked ? '[x] ' : '[ ] '}${line}` : `      ${line}`, margin, y);
            y += 14;
          });
        });
        y += 6;
      }

      // ---- Team ----
      const team = s.teamRequired === 'yes' ? (s.teamMembers || []) : [];
      if (team.length) {
        sectionHeading('Team:');
        doc.setFont('courier', 'normal');
        doc.setFontSize(11);
        team.forEach(tm => {
          ensureSpace(14);
          const roleEntry = TEAM_ROLE_OPTIONS.find(([val]) => val === tm.role);
          doc.text(`• ${tm.name ? tm.name : 'Unnamed'} — ${roleEntry ? roleEntry[1] : 'Other'}`, margin, y);
          y += 14;
          if (hasText(tm.socialHandle)) {
            const platformEntry = SOCIAL_PLATFORM_OPTIONS.find(([val]) => val === tm.socialPlatform);
            ensureSpace(14);
            doc.text(`   ${platformEntry ? platformEntry[1] : 'Other'}: ${tm.socialHandle}`, margin, y);
            y += 14;
          }
        });
        y += 6;
      }

      // ---- References ----
      const refs = (s.references || []).map(r => r.trim()).filter(Boolean);
      if (refs.length) {
        sectionHeading('References:');
        doc.setFont('courier', 'normal');
        doc.setFontSize(11);
        refs.forEach(r => {
          ensureSpace(14);
          doc.text(`• ${r}`, margin, y, { maxWidth: pageWidth - margin * 2 });
          y += 14;
        });
        y += 6;
      }

      // ---- Post-shoot reflection ----
      const reflectionFields = [
        ['What went right: ', s.whatWentRight],
        ["What could've gone better: ", s.couldBeBetter],
        ['Lessons for next time: ', s.lessonsLearned],
      ].filter(([, value]) => hasText(value));
      if (reflectionFields.length) {
        sectionHeading('Post-shoot reflection:');
        doc.setFontSize(11);
        reflectionFields.forEach(([label, value]) => { drawLabeledLine(label, value.trim(), 14); y += 4; });
        y += 6;
      }

      // ---- Photos: cover, talent, mood board/storyboard, final/delivered ----
      // Final images stay ungated even for video: a shoot switched to video
      // can still hold images from before, and this export may be followed
      // by deleting the shoot's photos — skipping them here would lose them.
      const images = await gatherArchiveImages(s);
      if (images.cover) await drawImageGrid('Cover photo:', [{ src: images.cover }]);
      if (images.talentPhotos.length) await drawImageGrid('Talent photos:', images.talentPhotos);
      if (images.moodboard.length) await drawImageGrid(`${moodboardTerm(s.category)}:`, images.moodboard);
      if (images.finalImages.length) await drawImageGrid('Final images:', images.finalImages);
    }

    return doc;
  }

  async function openExportArchivePreview(shoots) {
    // Web Share, tried first, is the only thing that reliably hands off a
    // correctly-named file, and skips both the new tab and this app's own
    // preview modal entirely when it's available — so closing out of the OS's
    // own share sheet lands straight back on whatever was showing before,
    // nothing else to close. Probed with a throwaway file since the real PDF
    // doesn't exist yet and this has to be decided before the popup below,
    // which needs the same still-fresh user gesture either way.
    const canWebShare = !!(navigator.canShare && navigator.share
      && navigator.canShare({ files: [new File([''], 'probe.pdf', { type: 'application/pdf' })] }));
    const previewWindow = canWebShare ? null : window.open('', '_blank');
    try {
      const doc = await buildArchivePdf(shoots);
      pdfPreviewBlob = doc.output('blob');
      const label = archiveExportLabel(shoots);
      pdfPreviewTitle = label;
      const safeName = label.replace(/[^\w\- .]+/g, '').trim() || 'shoot archive';
      pdfPreviewFilename = `${safeName}.pdf`;
      if (canWebShare) {
        const file = new File([pdfPreviewBlob], pdfPreviewFilename, { type: 'application/pdf' });
        await navigator.share({ files: [file], title: pdfPreviewTitle });
      } else {
        // Shown only when Web Share isn't available — separate object URLs
        // so closing the modal's revoke doesn't pull the PDF out from
        // under a still-open tab.
        if (previewWindow) previewWindow.location.href = URL.createObjectURL(pdfPreviewBlob);
        showPdfPreview(pdfPreviewBlob);
        if (previewWindow) showToast('Opened for viewing — use Share below to send it with the right filename');
      }
      // The delete-prompt is offered right away rather than gated on the
      // share/save actually completing — the OS share sheet and the new-tab
      // PDF viewer both finish outside any event this app can observe, so
      // "the save screen was presented" is the one reliable moment to hook.
      openExportDeleteAsk(shoots);
    } catch (err) {
      if (previewWindow) previewWindow.close();
      if (err && err.name === 'AbortError') { openExportDeleteAsk(shoots); return; }
      console.error('Failed to build archive PDF', err);
      showToast('Could not create PDF archive');
    }
  }

  // ---- Post-export delete flow: ask, then double-confirm, then delete ----
  let exportPendingDeleteShoots = [];

  function openExportDeleteAsk(shoots) {
    exportPendingDeleteShoots = shoots;
    document.getElementById('exportDeleteAskCount').textContent = `${shoots.length} shoot${shoots.length === 1 ? '' : 's'}`;
    document.getElementById('exportDeleteAskOverlay').hidden = false;
  }

  document.getElementById('exportDeleteAskNoBtn').addEventListener('click', () => {
    document.getElementById('exportDeleteAskOverlay').hidden = true;
    exportPendingDeleteShoots = [];
  });

  document.getElementById('exportDeleteAskOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('exportDeleteAskOverlay')) {
      document.getElementById('exportDeleteAskOverlay').hidden = true;
      exportPendingDeleteShoots = [];
    }
  });

  const exportDeleteConfirmModal = document.getElementById('exportDeleteConfirmModal');
  const exportDeleteConfirmTitle = document.getElementById('exportDeleteConfirmTitle');
  const exportDeleteConfirmText = document.getElementById('exportDeleteConfirmText');
  const exportDeleteConfirmActions = document.getElementById('exportDeleteConfirmActions');
  const exportDeleteConfirmOkBtn = document.getElementById('exportDeleteConfirmOkBtn');

  document.getElementById('exportDeleteAskYesBtn').addEventListener('click', () => {
    document.getElementById('exportDeleteAskOverlay').hidden = true;
    const n = exportPendingDeleteShoots.length;
    exportDeleteConfirmModal.classList.add('danger-state');
    exportDeleteConfirmTitle.textContent = 'Delete these shoots for good?';
    exportDeleteConfirmText.textContent = `This permanently removes ${n} shoot${n === 1 ? '' : 's'} and every photo attached to ${n === 1 ? 'it' : 'them'} — cover photos, talent photos, mood boards, and final images. They're already saved in the PDF you just exported, but this app copy of them can't be recovered once deleted.`;
    exportDeleteConfirmActions.hidden = false;
    exportDeleteConfirmOkBtn.hidden = true;
    document.getElementById('exportDeleteConfirmOverlay').hidden = false;
  });

  document.getElementById('exportDeleteConfirmCancelBtn').addEventListener('click', () => {
    document.getElementById('exportDeleteConfirmOverlay').hidden = true;
    exportPendingDeleteShoots = [];
  });

  document.getElementById('exportDeleteConfirmYesBtn').addEventListener('click', () => {
    const shoots = exportPendingDeleteShoots;
    shoots.forEach(s => deleteShootById(s.id));
    renderAll();
    exportDeleteConfirmModal.classList.remove('danger-state');
    exportDeleteConfirmTitle.textContent = 'Shoots deleted.';
    exportDeleteConfirmText.textContent = 'Your archive PDF still has everything — good luck out there!';
    exportDeleteConfirmActions.hidden = true;
    exportDeleteConfirmOkBtn.hidden = false;
    exportPendingDeleteShoots = [];
  });

  exportDeleteConfirmOkBtn.addEventListener('click', () => {
    document.getElementById('exportDeleteConfirmOverlay').hidden = true;
  });

  document.getElementById('completeShootBtn').addEventListener('click', () => {
    document.getElementById('completeShootPromptOverlay').hidden = false;
  });

  document.getElementById('completeShootPromptCancelBtn').addEventListener('click', () => {
    document.getElementById('completeShootPromptOverlay').hidden = true;
  });

  document.getElementById('completeShootPromptConfirmBtn').addEventListener('click', () => {
    document.getElementById('completeShootPromptOverlay').hidden = true;
    clearTimeout(shootSaveTimer);
    const data = gatherShootFormData();
    data.archived = true;
    const idx = state.shoots.findIndex(x => x.id === currentShootId);
    let shoot;
    if (idx === -1) {
      shoot = { id: currentShootId, ...data };
      state.shoots.push(shoot);
    } else {
      shoot = { ...state.shoots[idx], ...data };
      state.shoots[idx] = shoot;
    }
    saveState();
    if (!shootModalOverlay.hidden) unlockBodyScroll();
    shootModalOverlay.hidden = true;
    editingShootId = null;
    renderAll();
    refreshOpenStatBoxDetail();
    showToast('You did it! Revisit this shoot in your archive.');
  });

  document.getElementById('unarchiveShootBtn').addEventListener('click', () => {
    clearTimeout(shootSaveTimer);
    const data = gatherShootFormData();
    data.archived = false;
    const idx = state.shoots.findIndex(x => x.id === currentShootId);
    if (idx !== -1) state.shoots[idx] = { ...state.shoots[idx], ...data };
    saveState();
    if (!shootModalOverlay.hidden) unlockBodyScroll();
    shootModalOverlay.hidden = true;
    editingShootId = null;
    renderAll();
    refreshOpenStatBoxDetail();
  });

  document.getElementById('addShootBtn').addEventListener('click', () => openShootModal(null));

  // ---------- Manage Frameworks modal ----------
  const frameworksModalOverlay = document.getElementById('frameworksModalOverlay');
  const frameworksBody = document.getElementById('frameworksBody');

  function renderFrameworksList() {
    frameworksBody.innerHTML = state.frameworks.map(fw => `
      <div class="framework-block" data-id="${fw.id}">
        <div class="relationship-row">
          <input type="text" class="relationship-name-input framework-name-input" data-id="${fw.id}" value="${escapeHtml(fw.name)}" />
          <button type="button" class="delete-relationship delete-framework" data-id="${fw.id}"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
        </div>
        <div class="framework-tags-list">
          ${fw.tags.map((tag, idx) => `
            <div class="relationship-row">
              <input type="text" class="relationship-name-input framework-tag-input" data-fw="${fw.id}" data-idx="${idx}" value="${escapeHtml(tag)}" />
              <button type="button" class="delete-relationship delete-framework-tag" data-fw="${fw.id}" data-idx="${idx}"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
            </div>
          `).join('')}
        </div>
        <form class="quick-add-relationship quick-add-framework-tag" data-fw="${fw.id}">
          <input type="text" placeholder="New tag" />
          <button type="submit" class="secondary small-btn">Add tag</button>
        </form>
      </div>
    `).join('');

    frameworksBody.querySelectorAll('.framework-name-input').forEach(input => {
      input.addEventListener('change', () => {
        const fw = state.frameworks.find(f => f.id === input.dataset.id);
        if (fw) {
          fw.name = input.value.trim() || fw.name;
          input.value = fw.name;
          saveState();
          syncShootFrameworkTags();
        }
      });
    });

    frameworksBody.querySelectorAll('.delete-framework').forEach(btn => {
      btn.addEventListener('click', () => {
        const fw = state.frameworks.find(f => f.id === btn.dataset.id);
        const name = fw && hasText(fw.name) ? fw.name : 'this framework';
        if (!confirm(`Delete ${name}? This removes every one of its tags from every shoot that used them, and can't be undone.`)) return;
        state.frameworks = state.frameworks.filter(f => f.id !== btn.dataset.id);
        saveState();
        renderFrameworksList();
        syncShootFrameworkTags();
      });
    });

    frameworksBody.querySelectorAll('.framework-tag-input').forEach(input => {
      input.addEventListener('change', () => {
        const fw = state.frameworks.find(f => f.id === input.dataset.fw);
        if (fw) {
          fw.tags[Number(input.dataset.idx)] = input.value.trim();
          saveState();
          syncShootFrameworkTags();
        }
      });
    });

    frameworksBody.querySelectorAll('.delete-framework-tag').forEach(btn => {
      btn.addEventListener('click', () => {
        const fw = state.frameworks.find(f => f.id === btn.dataset.fw);
        if (fw) {
          const tag = fw.tags[Number(btn.dataset.idx)];
          const label = hasText(tag) ? `"${tag}"` : 'this tag';
          if (!confirm(`Delete ${label}? This removes it from every shoot that used it, and can't be undone.`)) return;
          fw.tags.splice(Number(btn.dataset.idx), 1);
          saveState();
          renderFrameworksList();
          syncShootFrameworkTags();
        }
      });
    });

    frameworksBody.querySelectorAll('.quick-add-framework-tag').forEach(form => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = form.querySelector('input');
        const val = input.value.trim();
        if (!val) return;
        const fw = state.frameworks.find(f => f.id === form.dataset.fw);
        if (fw) {
          fw.tags.push(val);
          saveState();
          renderFrameworksList();
          syncShootFrameworkTags();
        }
      });
    });
  }

  function openFrameworksModal() {
    renderFrameworksList();
    frameworksModalOverlay.hidden = false;
  }

  function closeFrameworksModal() {
    frameworksModalOverlay.hidden = true;
  }

  document.getElementById('manageFrameworksBtn').addEventListener('click', openFrameworksModal);

  // ---------- Category filter chip visibility ----------
  const categoryVisibilityOverlay = document.getElementById('categoryVisibilityOverlay');

  function renderCategoryVisibilityList() {
    document.getElementById('categoryVisibilityList').innerHTML = CATEGORY_FILTER_ORDER.map(cat => `
      <label class="tag-check"><input type="checkbox" data-cat="${cat}" ${isCategoryVisible(cat) ? 'checked' : ''} /> ${CATEGORY_LABELS[cat]}</label>
    `).join('');
  }

  function openCategoryVisibilityModal() {
    renderCategoryVisibilityList();
    categoryVisibilityOverlay.hidden = false;
  }

  function closeCategoryVisibilityModal() {
    categoryVisibilityOverlay.hidden = true;
  }

  document.getElementById('categoryVisibilityList').addEventListener('change', (e) => {
    if (e.target.type !== 'checkbox') return;
    categoryVisibility[e.target.dataset.cat] = e.target.checked;
    saveCategoryVisibility();
    if (archiveFilter !== 'all' && !isCategoryVisible(archiveFilter)) archiveFilter = 'all';
    renderShoots();
    renderArchive();
  });

  document.getElementById('newFrameworkForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const input = document.getElementById('newFrameworkName');
    const name = input.value.trim();
    if (!name) return;
    state.frameworks.push({ id: uid(), name, tags: [] });
    saveState();
    input.value = '';
    renderFrameworksList();
    syncShootFrameworkTags();
  });

  // ---------- shared modal close handlers ----------
  document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.close === 'shoot') closeShootModal();
      if (btn.dataset.close === 'frameworks') closeFrameworksModal();
      if (btn.dataset.close === 'journal') closeJournalModal();
      if (btn.dataset.close === 'location') document.getElementById('locationModalOverlay').hidden = true;
      if (btn.dataset.close === 'talent') document.getElementById('talentModalOverlay').hidden = true;
      if (btn.dataset.close === 'teamMember') document.getElementById('teamMemberModalOverlay').hidden = true;
      if (btn.dataset.close === 'journalToc') document.getElementById('journalTocOverlay').hidden = true;
      if (btn.dataset.close === 'categoryVisibility') closeCategoryVisibilityModal();
      if (btn.dataset.close === 'manageLocations') document.getElementById('manageLocationsOverlay').hidden = true;
      if (btn.dataset.close === 'manageTeamMembers') document.getElementById('manageTeamMembersOverlay').hidden = true;
      if (btn.dataset.close === 'manageTalents') document.getElementById('manageTalentsOverlay').hidden = true;
      if (btn.dataset.close === 'manageLightingSetups') document.getElementById('manageLightingSetupsOverlay').hidden = true;
      if (btn.dataset.close === 'regionCountryPopup') document.getElementById('regionCountryPopupOverlay').hidden = true;
    });
  });

  shootModalOverlay.addEventListener('click', (e) => {
    if (e.target === shootModalOverlay) closeShootModal();
  });
  [frameworksModalOverlay, document.getElementById('locationModalOverlay'), document.getElementById('talentModalOverlay'), document.getElementById('teamMemberModalOverlay'), document.getElementById('journalTocOverlay'), document.getElementById('tabIntroOverlay'), categoryVisibilityOverlay, document.getElementById('manageLocationsOverlay'), document.getElementById('manageTeamMembersOverlay'), document.getElementById('manageTalentsOverlay'), document.getElementById('manageLightingSetupsOverlay'), document.getElementById('regionCountryPopupOverlay')].forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.hidden = true;
    });
  });

  // ---------- App menu (hamburger) ----------
  const appMenuOverlay = document.getElementById('appMenuOverlay');
  const appMenuPaneTrack = document.getElementById('appMenuPaneTrack');

  function closeAppMenu() {
    appMenuOverlay.hidden = true;
    appMenuPaneTrack.classList.remove('show-second');
    appMenuPaneTrack.classList.remove('show-third');
    appMenuPaneTrack.classList.remove('show-fourth');
  }

  document.getElementById('appMenuBtn').addEventListener('click', () => {
    appMenuOverlay.hidden = false;
    syncPaneTrackHeight(appMenuPaneTrack);
  });

  document.getElementById('notificationBellBtn').addEventListener('click', () => {
    openNotificationsBell();
  });

  document.getElementById('appMenuCancelBtn').addEventListener('click', closeAppMenu);

  appMenuOverlay.addEventListener('click', (e) => {
    if (e.target === appMenuOverlay) closeAppMenu();
  });

  // ---------- Shoot display options (app-wide talent/title preference) ----------
  function updateDisplayChoiceHighlight() {
    const isTitleMode = state.titleDisplayMode === 'title';
    document.getElementById('displayModeTalentBtn').classList.toggle('active', !isTitleMode);
    document.getElementById('displayModeTitleBtn').classList.toggle('active', isTitleMode);
  }

  document.getElementById('shootDisplayOptionsBtn').addEventListener('click', () => {
    updateDisplayChoiceHighlight();
    appMenuPaneTrack.classList.remove('show-third');
    appMenuPaneTrack.classList.add('show-second');
    syncPaneTrackHeight(appMenuPaneTrack);
  });

  document.getElementById('displayOptionsBackBtn').addEventListener('click', () => {
    appMenuPaneTrack.classList.remove('show-second');
    syncPaneTrackHeight(appMenuPaneTrack);
  });

  document.getElementById('displayModeTalentBtn').addEventListener('click', () => {
    state.titleDisplayMode = 'talent';
    saveState();
    renderAll();
    updateDisplayChoiceHighlight();
  });

  document.getElementById('displayModeTitleBtn').addEventListener('click', () => {
    state.titleDisplayMode = 'title';
    saveState();
    renderAll();
    updateDisplayChoiceHighlight();
  });

  // ---------- New shoot guide (on/off for the new-shoot wizard) ----------
  function updateNewShootGuideChoice() {
    const on = isNewShootGuideOn();
    document.getElementById('newShootGuideOnBtn').classList.toggle('active', on);
    document.getElementById('newShootGuideOffBtn').classList.toggle('active', !on);
  }

  document.getElementById('newShootGuideBtn').addEventListener('click', () => {
    updateNewShootGuideChoice();
    appMenuPaneTrack.classList.remove('show-second');
    appMenuPaneTrack.classList.remove('show-third');
    appMenuPaneTrack.classList.add('show-fourth');
    syncPaneTrackHeight(appMenuPaneTrack);
  });

  document.getElementById('newShootGuideBackBtn').addEventListener('click', () => {
    appMenuPaneTrack.classList.remove('show-fourth');
    syncPaneTrackHeight(appMenuPaneTrack);
  });

  document.getElementById('newShootGuideOnBtn').addEventListener('click', () => {
    setNewShootGuideOn(true);
    updateNewShootGuideChoice();
  });

  document.getElementById('newShootGuideOffBtn').addEventListener('click', () => {
    setNewShootGuideOn(false);
    updateNewShootGuideChoice();
  });

  // ---------- Color theme (restyles background/border/fill chrome only —
  // actual text color never changes, see --ink vs --text in style.css) ----------
  function applyColorTheme(theme) {
    if (theme && theme !== 'default') {
      document.documentElement.setAttribute('data-theme', theme);
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  function updateThemeChoiceHighlight() {
    THEME_KEYS.forEach(key => {
      const btn = document.getElementById(`theme${key[0].toUpperCase()}${key.slice(1)}Btn`);
      if (btn) btn.classList.toggle('active', state.colorTheme === key);
    });
  }

  document.getElementById('changeThemeBtn').addEventListener('click', () => {
    updateThemeChoiceHighlight();
    appMenuPaneTrack.classList.remove('show-second');
    appMenuPaneTrack.classList.add('show-third');
    syncPaneTrackHeight(appMenuPaneTrack);
  });

  document.getElementById('themeOptionsBackBtn').addEventListener('click', () => {
    appMenuPaneTrack.classList.remove('show-third');
    syncPaneTrackHeight(appMenuPaneTrack);
  });

  // The theme is already saved and applied the moment it's tapped, so this just
  // dismisses the menu — there's nothing left to commit.
  document.getElementById('themeOkayBtn').addEventListener('click', closeAppMenu);

  document.querySelectorAll('#appMenuPaneTrack .choice-item[data-theme]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.colorTheme = btn.dataset.theme;
      saveState();
      applyColorTheme(state.colorTheme);
      updateThemeChoiceHighlight();
    });
  });

  function idbClearAllImages() {
    return idbOpen().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    }));
  }

  const deleteAllConfirmOverlay = document.getElementById('deleteAllConfirmOverlay');
  const deleteAllConfirmModal = document.getElementById('deleteAllConfirmModal');
  const deleteAllConfirmTitle = document.getElementById('deleteAllConfirmTitle');
  const deleteAllConfirmText = document.getElementById('deleteAllConfirmText');
  const deleteAllConfirmActions = document.getElementById('deleteAllConfirmActions');
  const deleteAllConfirmOkBtn = document.getElementById('deleteAllConfirmOkBtn');

  document.getElementById('deleteAllShootDataBtn').addEventListener('click', () => {
    closeAppMenu();
    const confirmed = confirm('Delete ALL shoot data? This permanently removes every shoot, mood board photo, and reference. This can\'t be undone.');
    if (!confirmed) return;
    deleteAllConfirmModal.classList.add('danger-state');
    deleteAllConfirmTitle.textContent = 'Are you SURE sure, my guy?';
    deleteAllConfirmText.textContent = 'This permanently removes every shoot, mood board photo, and reference. This can\'t be undone.';
    deleteAllConfirmActions.hidden = false;
    deleteAllConfirmOkBtn.hidden = true;
    deleteAllConfirmOverlay.hidden = false;
  });

  document.getElementById('deleteAllConfirmCancelBtn').addEventListener('click', () => {
    deleteAllConfirmOverlay.hidden = true;
  });

  document.getElementById('deleteAllConfirmYesBtn').addEventListener('click', () => {
    state.shoots = [];
    // Projects are only groups of shoots, so none outlive them.
    state.projects = [];
    saveState();
    idbClearAllImages().catch(() => {});
    renderAll();
    deleteAllConfirmModal.classList.remove('danger-state');
    deleteAllConfirmTitle.textContent = 'All shoot data deleted.';
    deleteAllConfirmText.textContent = 'Good luck on your next shoots!';
    deleteAllConfirmActions.hidden = true;
    deleteAllConfirmOkBtn.hidden = false;
  });

  deleteAllConfirmOkBtn.addEventListener('click', () => {
    deleteAllConfirmOverlay.hidden = true;
  });

  // ---------- Export / Import (backup) ----------
  function exportAllData() {
    const keys = [];
    state.shoots.forEach(s => {
      keys.push(s.id);
      keys.push(finalImagesKey(s.id));
      // Cover and talent photos are IDB rows like any other image collection,
      // so they ride out in the same images map.
      shootPhotoKeys(s).forEach(k => keys.push(k));
    });
    state.journalEntries.forEach(e => {
      if (!e.sourceShootId) keys.push(journalImagesKey(e.id));
    });
    const images = {};
    Promise.all(keys.map(k => idbGetImages(k).then(imgs => { images[k] = imgs; })))
      .then(() => {
        const payload = {
          version: 1,
          exportedAt: new Date().toISOString(),
          state,
          images,
        };
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `starky-backup-${todayStr()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      });
  }

  document.getElementById('exportDataBtn').addEventListener('click', () => {
    closeAppMenu();
    exportAllData();
  });

  document.getElementById('importDataBtn').addEventListener('click', () => {
    closeAppMenu();
    document.getElementById('importFileInput').click();
  });

  let pendingImportPayload = null;
  const importConfirmOverlay = document.getElementById('importConfirmOverlay');

  document.getElementById('importFileInput').addEventListener('change', (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const payload = JSON.parse(reader.result);
        if (!payload || !payload.state || !Array.isArray(payload.state.shoots)) throw new Error('bad shape');
        pendingImportPayload = payload;
        importConfirmOverlay.hidden = false;
      } catch (err) {
        alert('That file could not be read as a Starky backup.');
      }
    };
    reader.readAsText(file);
  });

  document.getElementById('cancelImportBtn').addEventListener('click', () => {
    pendingImportPayload = null;
    importConfirmOverlay.hidden = true;
  });

  document.getElementById('confirmImportBtn').addEventListener('click', () => {
    const payload = pendingImportPayload;
    importConfirmOverlay.hidden = true;
    pendingImportPayload = null;
    if (!payload) return;
    const imageWrites = Object.entries(payload.images || {}).map(([key, imgs]) => idbSetImages(key, imgs));
    Promise.all(imageWrites).then(() => {
      const importedShoots = Array.isArray(payload.state.shoots) ? payload.state.shoots : [];
      // Import bypasses loadState's migrations, so the status-level fixes run
      // here too. Otherwise an old backup's video shoot in "Editing" (or a
      // retired idea_phase) sits in a status its category doesn't offer until
      // the next reload.
      migrateIdeaPhaseStatus(importedShoots);
      normalizeShootStatuses(importedShoots);
      // Same project clean-up as loadState. A backup from before projects
      // existed has neither records nor projectIds, so this is just [].
      const importedProjects = normalizeProjects(payload.state.projects, importedShoots);
      state = {
        shoots: importedShoots,
        projects: importedProjects,
        frameworks: (Array.isArray(payload.state.frameworks) && payload.state.frameworks.length) ? payload.state.frameworks : seedFrameworks(),
        journalEntries: Array.isArray(payload.state.journalEntries) ? payload.state.journalEntries : [],
        titleDisplayMode: payload.state.titleDisplayMode === 'title' ? 'title' : 'talent',
        colorTheme: THEME_KEYS.includes(payload.state.colorTheme) ? payload.state.colorTheme : 'default',
        defaultCountry: typeof payload.state.defaultCountry === 'string' ? payload.state.defaultCountry : '',
        dismissedLocationKeys: Array.isArray(payload.state.dismissedLocationKeys) ? payload.state.dismissedLocationKeys : [],
        dismissedTeamMemberKeys: Array.isArray(payload.state.dismissedTeamMemberKeys) ? payload.state.dismissedTeamMemberKeys : [],
        dismissedTalentKeys: Array.isArray(payload.state.dismissedTalentKeys) ? payload.state.dismissedTalentKeys : [],
        dismissedLightingSetupKeys: Array.isArray(payload.state.dismissedLightingSetupKeys) ? payload.state.dismissedLightingSetupKeys : [],
        photographer: normalizePhotographer(payload.state.photographer),
      };
      saveState();
      applyColorTheme(state.colorTheme);
      renderAll();
      // Backups made before photos moved to IDB still carry them inline on the
      // shoots, so run the same migration boot does; then pull every photo back
      // onto the in-memory state so thumbnails appear without a reload.
      migrateInlinePhotos()
        .then(hydratePhotos)
        .then(() => renderAll())
        .catch(() => {});
    });
  });

  // ---------- Stats tab ----------
  function polarToCartesian(cx, cy, r, angleDeg) {
    const rad = (angleDeg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function describeArc(cx, cy, r, startAngle, endAngle) {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y} Z`;
  }

  const PIE_CX = 100, PIE_CY = 100, PIE_R = 90;

  // Builds slice paths (a lone 100% slice is drawn as a near-full arc rather
  // than a <circle> so it can grow in with the same sweep animation as
  // everything else) plus legend rows with percentages, cycling through
  // PIE_COLORS in data order. Paths are emitted at their zero-angle
  // (invisible) starting position — animatePieSlices() sweeps them out to
  // startAngle/endAngle afterward.
  function buildPieSVG(data) {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    let angle = 0;
    const slices = data.map((d, i) => {
      const color = PIE_COLORS[i % PIE_COLORS.length];
      const pct = total > 0 ? d.value / total : 0;
      const startAngle = angle;
      const endAngle = data.length === 1 ? 359.99 : angle + pct * 360;
      angle = endAngle;
      return { ...d, color, startAngle, endAngle, pct: Math.round(pct * 100) };
    });
    const pathsHtml = slices.map(s => `<path class="pie-slice" data-key="${escapeHtml(String(s.key))}" d="${describeArc(PIE_CX, PIE_CY, PIE_R, 0, 0)}" fill="${s.color}" />`).join('');
    return { pathsHtml, slices };
  }

  // Animates a page's slices from a closed sliver at 12 o'clock out to their
  // final angular spans in lockstep, so the whole pie reads as fanning open
  // rather than each wedge growing independently.
  function animatePieSlices(pathEls, slices) {
    const duration = 650;
    const startTime = performance.now();
    function tick(now) {
      const raw = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - raw, 3);
      pathEls.forEach((el, i) => {
        const s = slices[i];
        el.setAttribute('d', describeArc(PIE_CX, PIE_CY, PIE_R, s.startAngle * eased, s.endAngle * eased));
      });
      if (raw < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  let statsSliceFilters = {};
  let statsYearFilter = String(new Date().getFullYear());

  function getStatsShoots() {
    return statsYearFilter === 'all'
      ? state.shoots
      : state.shoots.filter(s => s.date && s.date.slice(0, 4) === statsYearFilter);
  }

  function buildVisualLanguageStats() {
    const vl = state.frameworks.find(f => f.name === 'Visual Language');
    const counts = {};
    getStatsShoots().forEach(s => {
      (s.frameworkTags || []).forEach(t => {
        if (vl && t.frameworkId === vl.id) counts[t.tag] = (counts[t.tag] || 0) + 1;
      });
    });
    const data = Object.entries(counts)
      .map(([tag, value]) => ({ key: tag, label: tag, value }))
      .sort((a, b) => b.value - a.value);
    statsSliceFilters.visualLanguage = {};
    data.forEach(d => {
      statsSliceFilters.visualLanguage[d.key] = (s) => (s.frameworkTags || []).some(t => vl && t.frameworkId === vl.id && t.tag === d.key);
    });
    return data;
  }

  function buildCategoryStats() {
    const counts = {};
    getStatsShoots().forEach(s => {
      const key = s.category || 'uncategorized';
      counts[key] = (counts[key] || 0) + 1;
    });
    const data = Object.entries(counts)
      .map(([key, value]) => ({ key, label: CATEGORY_LABELS[key] || 'Uncategorized', value }))
      .sort((a, b) => b.value - a.value);
    statsSliceFilters.shootCategory = {};
    data.forEach(d => {
      statsSliceFilters.shootCategory[d.key] = (s) => (s.category || 'uncategorized') === d.key;
    });
    return data;
  }

  function buildTeamStats() {
    let noneCount = 0;
    const roleCounts = {};
    getStatsShoots().forEach(s => {
      const members = s.teamRequired === 'yes' ? (s.teamMembers || []) : [];
      if (members.length === 0) {
        noneCount++;
      } else {
        members.forEach(tm => {
          const role = tm.role || 'other';
          roleCounts[role] = (roleCounts[role] || 0) + 1;
        });
      }
    });
    const data = [];
    if (noneCount > 0) data.push({ key: '__none__', label: 'None', value: noneCount });
    TEAM_ROLE_OPTIONS.forEach(([val, label]) => {
      if (roleCounts[val]) data.push({ key: val, label, value: roleCounts[val] });
    });
    data.sort((a, b) => b.value - a.value);
    statsSliceFilters.teamMembers = {};
    data.forEach(d => {
      statsSliceFilters.teamMembers[d.key] = d.key === '__none__'
        ? (s) => (s.teamRequired === 'yes' ? (s.teamMembers || []) : []).length === 0
        : (s) => s.teamRequired === 'yes' && (s.teamMembers || []).some(tm => (tm.role || 'other') === d.key);
    });
    return data;
  }

  function buildStatusStats() {
    const counts = {};
    getStatsShoots().forEach(s => {
      const key = s.status || 'prospect';
      counts[key] = (counts[key] || 0) + 1;
    });
    const data = Object.keys(STATUS_LABELS)
      .filter(key => counts[key])
      .map(key => ({ key, label: STATUS_LABELS[key], value: counts[key] }))
      .sort((a, b) => b.value - a.value);
    statsSliceFilters.status = {};
    data.forEach(d => {
      statsSliceFilters.status[d.key] = (s) => (s.status || 'prospect') === d.key;
    });
    return data;
  }

  function statsLocationKey(s) {
    return isLocationBlank(s.location) ? 'No location set' : locationKey(s.location);
  }

  function buildLocationStats() {
    const counts = {};
    const labels = {};
    getStatsShoots().forEach(s => {
      const key = statsLocationKey(s);
      counts[key] = (counts[key] || 0) + 1;
      if (key !== 'No location set') labels[key] = hasText(s.location.name) ? s.location.name.trim() : 'Unnamed location';
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const TOP_N = 6;
    const top = sorted.slice(0, TOP_N);
    const rest = sorted.slice(TOP_N);
    const data = top.map(([key, value]) => ({ key, label: labels[key] || 'No location set', value }));
    statsSliceFilters.location = {};
    data.forEach(d => {
      statsSliceFilters.location[d.key] = (s) => statsLocationKey(s) === d.key;
    });
    if (rest.length) {
      const otherKeys = new Set(rest.map(([k]) => k));
      const otherValue = rest.reduce((sum, [, v]) => sum + v, 0);
      data.push({ key: '__other_locations__', label: 'Other', value: otherValue });
      statsSliceFilters.location.__other_locations__ = (s) => otherKeys.has(statsLocationKey(s));
    }
    return data;
  }

  const STATS_PAGES = [
    { key: 'status', title: 'Status', build: buildStatusStats },
    { key: 'visualLanguage', title: 'Visual Languages', build: buildVisualLanguageStats },
    { key: 'shootCategory', title: 'Shoot Categories', build: buildCategoryStats },
    { key: 'teamMembers', title: 'Team Members', build: buildTeamStats },
    { key: 'location', title: 'Locations', build: buildLocationStats },
    { key: 'regions', title: 'Regions', custom: true },
  ];

  // ---------- Regions map (world-map.svg, fetched once and cached) ----------
  let worldMapSvgEl = null;
  let worldMapFetchPromise = null;
  let regionsSliceColors = {};
  let regionsDataByCountry = {};
  let mapZoomLevel = 1;
  const MAP_ZOOM_MIN = 1;
  const MAP_ZOOM_MAX = 4;
  const MAP_ZOOM_STEP = 0.5;
  const MAP_BASE_WIDTH = 900;

  function buildRegionsStats() {
    const countryGroups = {};
    getStatsShoots().forEach(s => {
      const code = s.location && s.location.country;
      if (!code) return;
      if (!countryGroups[code]) countryGroups[code] = { count: 0, cities: {} };
      countryGroups[code].count++;
      const cityLabel = (s.location.city || '').trim() || 'No city set';
      const cityKey = cityLabel.toLowerCase();
      if (!countryGroups[code].cities[cityKey]) countryGroups[code].cities[cityKey] = { label: cityLabel, count: 0 };
      countryGroups[code].cities[cityKey].count++;
    });

    statsSliceFilters.regions = {};
    const data = Object.entries(countryGroups)
      .map(([code, group]) => {
        statsSliceFilters.regions[code] = (s) => !!(s.location && s.location.country === code);
        const cities = Object.entries(group.cities)
          .map(([cityKey, c]) => {
            const compositeKey = `${code}__${cityKey}`;
            statsSliceFilters.regions[compositeKey] = (s) => {
              if (!s.location || s.location.country !== code) return false;
              const label = (s.location.city || '').trim() || 'No city set';
              return label.toLowerCase() === cityKey;
            };
            return { key: compositeKey, label: c.label, value: c.count, pct: Math.round((c.count / group.count) * 100) };
          })
          .sort((a, b) => b.value - a.value);
        return { key: code, label: REGION_LABELS[code] || code, value: group.count, cities };
      })
      .sort((a, b) => b.value - a.value);
    return data;
  }

  function regionsPageHtml(data) {
    regionsDataByCountry = Object.fromEntries(data.map(d => [d.key, d]));
    if (!data.length) {
      regionsSliceColors = {};
      return {
        html: `
          <div class="stats-page stats-page-regions" data-key="regions">
            <h2 class="stats-page-title">Regions</h2>
            <p class="empty-hint">Not enough data yet.</p>
          </div>
        `,
        slices: null,
      };
    }
    const { slices } = buildPieSVG(data);
    regionsSliceColors = Object.fromEntries(slices.map(s => [s.key, s.color]));
    const groupsHtml = data.map((d, i) => {
      const collapseKey = `stats:regions:${d.key}`;
      const collapsed = isSectionCollapsed(collapseKey);
      const cityRowsHtml = d.cities.map(c => `
        <button type="button" class="stats-legend-row stats-legend-row-nested" data-key="${escapeHtml(c.key)}">
          <span class="legend-swatch legend-swatch-blank"></span>
          <span class="legend-label">${escapeHtml(c.label)}</span>
          <span class="legend-pct">${c.pct}%</span>
        </button>
      `).join('');
      return `
        <div class="stats-region-group">
          <button type="button" class="stats-legend-row stats-region-heading${collapsed ? ' collapsed' : ''}" data-key="${escapeHtml(d.key)}">
            <span class="legend-swatch" style="background:${slices[i].color}"></span>
            <span class="legend-label">${escapeHtml(d.label)}</span>
            <span class="legend-pct">${slices[i].pct}%</span>
            ${COLLAPSE_ARROW_SVG}
          </button>
          <div class="stats-region-cities"${collapsed ? ' hidden' : ''}>${cityRowsHtml}</div>
        </div>
      `;
    }).join('');
    return {
      html: `
        <div class="stats-page stats-page-regions" data-key="regions">
          <h2 class="stats-page-title">Regions</h2>
          <div class="world-map-toolbar">
            <button type="button" class="map-zoom-btn" id="worldMapZoomOutBtn" aria-label="Zoom out">&minus;</button>
            <button type="button" class="map-zoom-btn" id="worldMapZoomInBtn" aria-label="Zoom in">+</button>
          </div>
          <div class="world-map-scroll" id="worldMapScroll">
            <div id="worldMapContainer"><p class="empty-hint">Loading map…</p></div>
          </div>
          <div class="stats-legend">${groupsHtml}</div>
        </div>
      `,
      slices,
    };
  }

  function applyRegionsHighlight() {
    const container = document.getElementById('worldMapContainer');
    if (!container) return;
    const svg = container.querySelector('svg');
    if (!svg) return;
    svg.querySelectorAll('.region-shot').forEach(el => {
      el.classList.remove('region-shot');
      el.style.removeProperty('--region-color');
    });
    Object.entries(regionsSliceColors).forEach(([code, color]) => {
      const el = svg.getElementById ? svg.getElementById(code) : null;
      const target = el || svg.querySelector(`#${CSS.escape(code)}`);
      if (target) {
        target.classList.add('region-shot');
        target.style.setProperty('--region-color', color);
      }
    });
  }

  function setMapZoom(level) {
    mapZoomLevel = Math.min(MAP_ZOOM_MAX, Math.max(MAP_ZOOM_MIN, level));
    const svg = document.querySelector('#worldMapContainer svg');
    if (svg) svg.style.width = `${MAP_BASE_WIDTH * mapZoomLevel}px`;
  }

  // Zooms in a touch and scrolls/pulses a specific region into view — tapping
  // a legend row shouldn't just open the shoot list, it should also help the
  // reader actually find that country on the map.
  // A country's shape can be dozens of separate <path>s (each state/province
  // plus outlying territories like Puerto Rico or Guam, all under one <g>) —
  // a plain bounding box over the whole group gets dragged toward whichever
  // territory sits farthest out, landing nowhere near the country's actual
  // landmass (e.g. the US: a naive box centers somewhere in the Atlantic).
  // Weighting each path's center by its own area instead lets the large,
  // contiguous mainland dominate over small, far-flung outliers.
  function regionCenterPoint(target) {
    const paths = target.tagName.toLowerCase() === 'g' ? [...target.querySelectorAll('path')] : [target];
    let totalArea = 0, sumX = 0, sumY = 0;
    paths.forEach(p => {
      const r = p.getBoundingClientRect();
      const area = r.width * r.height;
      totalArea += area;
      sumX += (r.left + r.width / 2) * area;
      sumY += (r.top + r.height / 2) * area;
    });
    if (!totalArea) {
      const r = target.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
    return { x: sumX / totalArea, y: sumY / totalArea };
  }

  function focusRegionOnMap(code) {
    const container = document.getElementById('worldMapContainer');
    const scrollWrap = document.getElementById('worldMapScroll');
    if (!container || !scrollWrap) return;
    const svg = container.querySelector('svg');
    if (!svg) return;
    const el = svg.getElementById ? svg.getElementById(code) : null;
    const target = el || svg.querySelector(`#${CSS.escape(code)}`);
    if (!target) return;
    setMapZoom(Math.max(mapZoomLevel, 2));
    // scrollIntoView on an SVG child is unreliable across engines, so the
    // scroll position is computed by hand from getBoundingClientRect once
    // the zoom's width transition has settled (matches its 0.2s duration).
    setTimeout(() => {
      const point = regionCenterPoint(target);
      const wrapRect = scrollWrap.getBoundingClientRect();
      const centerX = point.x - wrapRect.left + scrollWrap.scrollLeft;
      const centerY = point.y - wrapRect.top + scrollWrap.scrollTop;
      scrollWrap.scrollTo({
        left: Math.max(0, centerX - scrollWrap.clientWidth / 2),
        top: Math.max(0, centerY - scrollWrap.clientHeight / 2),
        behavior: 'smooth',
      });
    }, 220);
    target.classList.remove('region-focus-pulse');
    void target.offsetWidth;
    target.classList.add('region-focus-pulse');
    setTimeout(() => target.classList.remove('region-focus-pulse'), 1200);
  }

  // Tapping a country shape directly on the map shows its city breakdown in
  // a small popup, without needing to scroll down to the legend for it.
  function openRegionCountryPopup(code) {
    const entry = regionsDataByCountry[code];
    if (!entry) return;
    document.getElementById('regionCountryPopupTitle').textContent = entry.label;
    const list = document.getElementById('regionCountryPopupList');
    list.innerHTML = entry.cities.map(c => `
      <button type="button" class="stats-legend-row stats-legend-row-nested" data-key="${escapeHtml(c.key)}">
        <span class="legend-swatch legend-swatch-blank"></span>
        <span class="legend-label">${escapeHtml(c.label)}</span>
        <span class="legend-pct">${c.pct}%</span>
      </button>
    `).join('');
    list.querySelectorAll('.stats-legend-row').forEach(btn => {
      btn.addEventListener('click', () => {
        document.getElementById('regionCountryPopupOverlay').hidden = true;
        openStatsDetail('regions', btn.dataset.key);
      });
    });
    document.getElementById('regionCountryPopupOverlay').hidden = false;
  }

  // Parses the map exactly once and then reuses that same <svg> node forever.
  // renderStats() rebuilds the whole carousel's innerHTML, which throws away
  // the container this lives in, so this used to re-run innerHTML with ~900KB
  // of SVG text on every render — reparsing 2,000+ <path> elements each time
  // any bit of state changed. Moving the already-parsed node into the fresh
  // container costs nothing by comparison. Being detached from the document in
  // between is fine; it keeps its children either way.
  function mountWorldMap(container) {
    // The node carries over whatever zoom width and pulse class it had last
    // time, so reset both to match the zoom level being reset above.
    worldMapSvgEl.style.width = `${MAP_BASE_WIDTH}px`;
    worldMapSvgEl.querySelectorAll('.region-focus-pulse').forEach(el => el.classList.remove('region-focus-pulse'));
    container.replaceChildren(worldMapSvgEl);
    applyRegionsHighlight();
  }

  function renderRegionsMap() {
    const container = document.getElementById('worldMapContainer');
    if (!container) return;
    mapZoomLevel = 1;
    if (worldMapSvgEl) {
      mountWorldMap(container);
      return;
    }
    if (!worldMapFetchPromise) {
      worldMapFetchPromise = fetch('world-map.svg').then(r => r.text());
    }
    worldMapFetchPromise.then(svgText => {
      const el = document.getElementById('worldMapContainer');
      if (!el) return;
      if (!worldMapSvgEl) {
        const holder = document.createElement('div');
        holder.innerHTML = svgText;
        worldMapSvgEl = holder.querySelector('svg');
        if (!worldMapSvgEl) throw new Error('no svg root');
      }
      mountWorldMap(el);
    }).catch(() => {
      const el = document.getElementById('worldMapContainer');
      if (el) el.innerHTML = '<p class="empty-hint">Couldn\'t load the map.</p>';
    });
  }

  function renderStatsPage(page, data) {
    const total = data.reduce((sum, d) => sum + d.value, 0);
    if (total === 0) {
      return {
        html: `
          <div class="stats-page" data-key="${page.key}">
            <h2 class="stats-page-title">${escapeHtml(page.title)}</h2>
            <p class="empty-hint">Not enough data yet.</p>
          </div>
        `,
        slices: null,
      };
    }
    const { pathsHtml, slices } = buildPieSVG(data);
    const legendHtml = slices.map(s => `
      <button type="button" class="stats-legend-row" data-key="${escapeHtml(String(s.key))}">
        <span class="legend-swatch" style="background:${s.color}"></span>
        <span class="legend-label">${escapeHtml(s.label)}</span>
        <span class="legend-pct">${s.pct}%</span>
      </button>
    `).join('');
    return {
      html: `
        <div class="stats-page" data-key="${page.key}">
          <h2 class="stats-page-title">${escapeHtml(page.title)}</h2>
          <svg class="pie-chart" viewBox="0 0 200 200">${pathsHtml}</svg>
          <div class="stats-legend">${legendHtml}</div>
        </div>
      `,
      slices,
    };
  }

  const statsCarousel = document.getElementById('statsCarousel');
  const statsDotsEl = document.getElementById('statsDots');
  const statsYearFiltersEl = document.getElementById('statsYearFilters');

  // Which page is showing. Tracked directly rather than read back off a
  // scroll position, since the carousel never scrolls — pages slide by whole
  // steps via the track's transform.
  let statsPageIdx = 0;
  let statsSlideLocked = false;

  function renderStatsDots() {
    statsDotsEl.innerHTML = STATS_PAGES.map((p, i) => `<span class="stats-dot ${i === statsPageIdx ? 'active' : ''}"></span>`).join('');
  }

  // A horizontal flex row's own height, left to auto, always matches its
  // TALLEST child regardless of which one is actually in view — the track's
  // align-items:flex-start stops a shorter page from being stretched to fill
  // that height, but the carousel itself still needs this to shrink/grow with
  // whichever page is showing, or a short page would sit above blank space
  // sized to the tallest one.
  function updateStatsCarouselHeight() {
    const activeEl = statsCarousel.querySelectorAll('.stats-page')[statsPageIdx];
    if (activeEl) statsCarousel.style.height = activeEl.offsetHeight + 'px';
  }

  function positionStatsTrack() {
    const track = statsCarousel.querySelector('.stats-track');
    if (track) track.style.transform = `translateX(${-statsPageIdx * 100}%)`;
  }

  function goToStatsPage(idx) {
    const clamped = Math.max(0, Math.min(STATS_PAGES.length - 1, idx));
    if (clamped === statsPageIdx) return;
    statsPageIdx = clamped;
    // One page per swipe: further swipes are ignored until this slide has
    // landed, so a quick series of flicks can't run through several pages.
    statsSlideLocked = true;
    setTimeout(() => { statsSlideLocked = false; }, 350);
    positionStatsTrack();
    renderStatsDots();
    updateStatsCarouselHeight();
  }

  // A page only changes on a clear, mostly-horizontal swipe, judged when the
  // finger lifts — the page never follows the finger sideways, so nothing
  // from the next page slides partway into view. Same thresholds as the
  // tab-to-tab swipe. The world map scrolls sideways on its own, so a swipe
  // that starts on it only turns the page once the map is already at its
  // edge in that direction (mirroring how a scroll would chain).
  (function setupStatsSwipe() {
    let startX = null;
    let startY = null;
    let mapEdges = null;

    statsCarousel.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) { startX = null; return; }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      const map = e.target.closest('.world-map-scroll');
      mapEdges = map
        ? { atLeft: map.scrollLeft <= 1, atRight: map.scrollLeft + map.clientWidth >= map.scrollWidth - 1 }
        : null;
    }, { passive: true });

    statsCarousel.addEventListener('touchend', (e) => {
      if (startX === null) return;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      startX = null;
      if (statsSlideLocked) return;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      const dir = dx < 0 ? 1 : -1;
      if (mapEdges && !(dir === 1 ? mapEdges.atRight : mapEdges.atLeft)) return;
      goToStatsPage(statsPageIdx + dir);
    }, { passive: true });

    statsCarousel.addEventListener('touchcancel', () => { startX = null; }, { passive: true });
  })();

  // Delegated (survives renderStats() rebuilding the carousel's innerHTML on
  // every year-filter change, which destroys and recreates the zoom buttons)
  // so they don't need re-binding per render.
  statsCarousel.addEventListener('click', (e) => {
    if (e.target.closest('#worldMapZoomInBtn')) setMapZoom(mapZoomLevel + MAP_ZOOM_STEP);
    else if (e.target.closest('#worldMapZoomOutBtn')) setMapZoom(mapZoomLevel - MAP_ZOOM_STEP);
  });

  // Tapping a country shape directly on the map (as opposed to its legend
  // row below) shows which cities within that country were shot in, without
  // needing to scroll down to the legend to find out.
  statsCarousel.addEventListener('click', (e) => {
    const shotEl = e.target.closest('.region-shot');
    if (shotEl) openRegionCountryPopup(shotEl.id);
  });

  function renderStatsYearFilters() {
    const currentYear = String(new Date().getFullYear());
    const years = new Set([currentYear]);
    state.shoots.forEach(s => { if (s.date) years.add(s.date.slice(0, 4)); });
    const sortedYears = [...years].sort((a, b) => b.localeCompare(a));
    const chips = [...sortedYears.map(y => ({ key: y, label: y })), { key: 'all', label: 'All time' }];
    statsYearFiltersEl.innerHTML = chips.map(c => `<button type="button" class="chip ${c.key === statsYearFilter ? 'active' : ''}" data-year="${c.key}">${escapeHtml(c.label)}</button>`).join('');
    const activeChip = chips.find(c => c.key === statsYearFilter);
    document.getElementById('statsYearFilterToggle').textContent = `Filter: ${activeChip ? activeChip.label : statsYearFilter}`;
  }

  document.getElementById('statsYearFilterToggle').addEventListener('click', () => {
    statsYearFiltersEl.hidden = !statsYearFiltersEl.hidden;
  });

  statsYearFiltersEl.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    statsYearFilter = chip.dataset.year;
    statsYearFiltersEl.hidden = true;
    renderStats();
  });

  function renderStats() {
    // Nothing here is observable while the tab is hidden, and it's the most
    // expensive render in the app (pie geometry for every page, plus the world
    // map). Switching to Stats always calls renderAll() after un-hiding the
    // view, so skipping it here just defers the work to the moment it matters.
    if (views.stats.hidden) return;
    statsSliceFilters = {};
    renderStatsYearFilters();
    const funFactEl = document.getElementById('statsFunFact');
    const fact = pickRandomFunFact();
    funFactEl.textContent = fact ? `Fun fact: ${fact}` : '';
    funFactEl.hidden = !fact;
    const pages = STATS_PAGES.map(page => page.custom
      ? regionsPageHtml(buildRegionsStats())
      : renderStatsPage(page, page.build()));
    // The track's transform is set inline on the fresh element, so a re-render
    // (year filter, data change) keeps the page you're on without animating.
    statsCarousel.innerHTML = `<div class="stats-track" style="transform:translateX(${-statsPageIdx * 100}%)">${pages.map(p => p.html).join('')}</div>`;
    statsCarousel.querySelectorAll('.pie-slice, .stats-legend-row').forEach(el => {
      el.addEventListener('click', () => {
        const pageKey = el.closest('.stats-page').dataset.key;
        if (el.classList.contains('stats-region-heading')) {
          const citiesWrap = el.parentElement.querySelector('.stats-region-cities');
          const nowCollapsed = !citiesWrap.hidden;
          citiesWrap.hidden = nowCollapsed;
          el.classList.toggle('collapsed', nowCollapsed);
          setSectionCollapsed(`stats:regions:${el.dataset.key}`, nowCollapsed);
          focusRegionOnMap(el.dataset.key);
          return;
        }
        openStatsDetail(pageKey, el.dataset.key);
      });
    });
    statsCarousel.querySelectorAll('.stats-page').forEach((pageEl, i) => {
      const slices = pages[i].slices;
      if (!slices) return;
      animatePieSlices([...pageEl.querySelectorAll('.pie-slice')], slices);
    });
    if (STATS_PAGES.some(p => p.custom)) renderRegionsMap();
    renderStatsDots();
    updateStatsCarouselHeight();
  }

  function openStatsDetail(pageKey, sliceKey) {
    const filter = statsSliceFilters[pageKey] && statsSliceFilters[pageKey][sliceKey];
    const shoots = filter ? getStatsShoots().filter(filter) : [];
    const legendRow = statsCarousel.querySelector(`.stats-page[data-key="${pageKey}"] .stats-legend-row[data-key="${CSS.escape(sliceKey)}"] .legend-label`);
    document.getElementById('statsDetailTitle').textContent = legendRow ? legendRow.textContent : '';
    const list = document.getElementById('statsDetailList');
    list.innerHTML = '';
    shoots
      .sort((a, b) => dateTimeSortKey(b).localeCompare(dateTimeSortKey(a)))
      .forEach(s => renderShootRow(list, s, { showStatus: true }));
    document.getElementById('statsDetailEmpty').hidden = shoots.length > 0;
    const overlay = document.getElementById('statsDetailOverlay');
    overlay.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('open')));
  }

  function closeStatsDetail() {
    const overlay = document.getElementById('statsDetailOverlay');
    overlay.classList.remove('open');
    setTimeout(() => { overlay.hidden = true; }, 300);
  }

  document.getElementById('statsDetailCloseBtn').addEventListener('click', closeStatsDetail);
  document.getElementById('statsDetailOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeStatsDetail();
  });

  // ---------- render all ----------
  function renderAll() {
    renderOverview();
    renderShoots();
    renderArchive();
    renderJournal();
    renderStats();
    // The project popup stacks under the shoot modal/kebab like the stat
    // box popup, so every change that repaints the lists repaints it too
    // (or closes it once its project is gone). All seven
    // refreshOpenStatBoxDetail() call sites come straight after a
    // renderAll(), so this one hook covers them as well.
    refreshOpenProjectPopup();
  }

  // ---------- Day-after shoot check-in ----------
  const DAY_AFTER_PROMPT_KEY = 'dailies_day_after_prompt_shown_v1';

  // The once-per-day popups (day-after check-in, daily report) treat the
  // "day" as not rolling over until 5am, not midnight — a user still awake
  // at 1am is still mentally in the previous day, and shouldn't get a new
  // day's check-in (or have last night's shoot already counted as
  // "yesterday") just because the clock ticked past 12.
  function effectiveReportDateStr() {
    const d = new Date();
    if (d.getHours() < 5) d.setDate(d.getDate() - 1);
    return formatDate(d);
  }

  function joinWithAnd(names) {
    if (names.length === 1) return names[0];
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  }

  // ---------- Shoot mode ----------
  // A stripped-back working view for the day of: just the shot list to tick off
  // and the mood board to glance at, with none of the planner around it. It's a
  // mode rather than a screen — once switched on it survives closing the app and
  // comes straight back on the next launch, until it's explicitly ended.
  const SHOOT_MODE_KEY = 'dailies_shoot_mode_shoot_v1';
  const SHOOT_MODE_ASKED_KEY = 'dailies_shoot_mode_asked_v1';
  const shootModeOverlay = document.getElementById('shootModeOverlay');

  function getShootModeShootId() {
    try { return localStorage.getItem(SHOOT_MODE_KEY); } catch (e) { return null; }
  }

  function setShootModeShootId(id) {
    try {
      if (id) localStorage.setItem(SHOOT_MODE_KEY, id);
      else localStorage.removeItem(SHOOT_MODE_KEY);
    } catch (e) { /* ignore */ }
  }

  // Ticking, editing, or reordering a shot here writes straight to state
  // rather than through the edit form's working copy — shoot mode is the
  // only thing open, and the point is that any change survives whatever
  // happens to the phone next. Same row shape as the edit form's shot list
  // (drag handle, checkbox, auto-sized textarea, delete) so shoot mode isn't
  // a different interaction to relearn mid-shoot — just without the
  // checked-to-bottom sort, since watching the active list you're working
  // through reshuffle itself would be more disorienting than helpful here.
  function renderShootModeShots(shoot, focusIdx) {
    const list = document.getElementById('shootModeShotList');
    const shots = shoot.shotList || [];
    list.innerHTML = shots.map((item, idx) => `
      <div class="shoot-mode-shot-row${item.checked ? ' shot-checked' : ''}" data-idx="${idx}">
        <button type="button" class="shot-drag-handle" aria-label="Drag to reorder shot" tabindex="-1">&#8942;</button>
        <input type="checkbox" class="shoot-mode-shot-check" data-idx="${idx}" ${item.checked ? 'checked' : ''} />
        <textarea class="shot-text" data-idx="${idx}" rows="1" placeholder="Describe the shot">${escapeHtml(item.text || '')}</textarea>
        <button type="button" class="delete-shot" data-idx="${idx}"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
      </div>
    `).join('');
    document.getElementById('shootModeShotsEmpty').hidden = shots.length !== 0;

    list.querySelectorAll('.shoot-mode-shot-check').forEach(cb => {
      cb.addEventListener('change', () => {
        const idx = Number(cb.dataset.idx);
        shoot.shotList[idx].checked = cb.checked;
        saveState();
        cb.closest('.shoot-mode-shot-row').classList.toggle('shot-checked', cb.checked);
        renderAll();
      });
    });
    list.querySelectorAll('.shot-text').forEach(textarea => {
      autoSizeTextarea(textarea);
      textarea.addEventListener('input', () => {
        shoot.shotList[Number(textarea.dataset.idx)].text = textarea.value;
        autoSizeTextarea(textarea);
        saveState();
      });
      textarea.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const idx = Number(textarea.dataset.idx);
        shoot.shotList[idx].text = textarea.value;
        // If the row right after is already a blank one — e.g. it was just
        // created by an earlier Enter, and the user tapped back up to fix
        // something above it rather than typing into it — reuse that one
        // instead of stacking a second blank row on top of it.
        const next = shoot.shotList[idx + 1];
        if (!next || hasText(next.text)) {
          shoot.shotList.splice(idx + 1, 0, { text: '', checked: false });
        }
        saveState();
        renderShootModeShots(shoot, idx + 1);
        renderAll();
      });
    });
    list.querySelectorAll('.delete-shot').forEach(btn => {
      btn.addEventListener('click', () => {
        shoot.shotList.splice(Number(btn.dataset.idx), 1);
        saveState();
        renderShootModeShots(shoot);
        renderAll();
      });
    });
    list.querySelectorAll('.shot-drag-handle').forEach(handle => {
      wireShootModeShotDragHandle(handle, list, shoot);
    });

    if (focusIdx !== undefined) {
      const focusInput = list.querySelector(`.shot-text[data-idx="${focusIdx}"]`);
      if (focusInput) {
        focusInput.focus();
        // A row added via Enter can land low enough in this scrolling list
        // to come up right against the Done button fixed below it (or the
        // iOS keyboard) — the browser's own scroll-into-view-on-focus
        // doesn't know that button is there and won't leave it any
        // clearance. Centering it ourselves guarantees a clear look at
        // what's being typed instead of a sliver hidden behind either one.
        focusInput.scrollIntoView({ block: 'center' });
        // The on-screen keyboard opens AFTER focus, animating the visible
        // area shorter well after the call above already ran — without
        // re-centering once that settles, the row can end up freshly
        // covered by the keyboard on a real phone even though the call
        // above looked correct against the keyboard-less layout it had to
        // work with at the time.
        if (window.visualViewport) {
          window.visualViewport.addEventListener(
            'resize',
            () => focusInput.scrollIntoView({ block: 'center' }),
            { once: true }
          );
        }
      }
    }
  }

  // Same press-and-hold reorder as the edit form's shot list
  // (wireShotDragHandle), minus the checked/unchecked bucket split — shoot
  // mode doesn't sort checked shots to the bottom, so the whole list is one
  // bucket and a drag can land anywhere in it.
  function wireShootModeShotDragHandle(handle, container, shoot) {
    handle.addEventListener('pointerdown', (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      e.preventDefault();
      const row = handle.closest('.shoot-mode-shot-row');
      if (!row) return;
      const pointerId = e.pointerId;

      const rowRects = Array.from(container.querySelectorAll('.shoot-mode-shot-row')).map(r => r.getBoundingClientRect());
      const bucketTop = Math.min(...rowRects.map(r => r.top));
      const bucketBottom = Math.max(...rowRects.map(r => r.bottom));

      let baseClientY = e.clientY;
      let baseTranslateY = 0;
      let appliedTransform = 0;
      row.classList.add('shot-dragging');
      if (navigator.vibrate) navigator.vibrate(15);
      handle.classList.add('shot-drag-pulse');
      handle.addEventListener('animationend', () => {
        handle.classList.remove('shot-drag-pulse');
      }, { once: true });
      try { handle.setPointerCapture(e.pointerId); } catch (err) { /* capture is a nice-to-have, not required */ }

      function onMove(ev) {
        if (ev.pointerId !== pointerId) return;
        const rawRect = row.getBoundingClientRect();
        const layoutTop = rawRect.top - appliedTransform;
        const rowHeight = rawRect.height;
        const minDy = bucketTop - layoutTop;
        const maxDy = (bucketBottom - rowHeight) - layoutTop;
        const proposedDy = baseTranslateY + (ev.clientY - baseClientY);
        const dy = Math.min(maxDy, Math.max(minDy, proposedDy));

        row.style.transform = `translateY(${dy}px)`;
        appliedTransform = dy;

        // See wireShotDragHandle: a fast flick can cross more than one
        // neighbor between events, so this loops until the DOM order
        // catches up with wherever the transform already moved the row.
        const before = row.getBoundingClientRect();
        let swapped = false;
        while (true) {
          const rows = Array.from(container.querySelectorAll('.shoot-mode-shot-row'));
          const idx = rows.indexOf(row);
          const rowRect = row.getBoundingClientRect();
          const rowCenter = rowRect.top + rowRect.height / 2;
          const next = rows[idx + 1];
          const prev = rows[idx - 1];

          let neighbor = null;
          let insertBeforeRow = false;
          if (next) {
            const nextRect = next.getBoundingClientRect();
            if (rowCenter >= nextRect.top + nextRect.height / 2) neighbor = next;
          }
          if (!neighbor && prev) {
            const prevRect = prev.getBoundingClientRect();
            if (rowCenter <= prevRect.top + prevRect.height / 2) { neighbor = prev; insertBeforeRow = true; }
          }
          if (!neighbor) break;

          if (insertBeforeRow) container.insertBefore(row, neighbor);
          else container.insertBefore(neighbor, row);
          swapped = true;
        }
        if (!swapped) return;

        row.style.transform = 'none';
        const after = row.getBoundingClientRect();
        baseTranslateY = before.top - after.top;
        baseClientY = ev.clientY;
        row.style.transform = `translateY(${baseTranslateY}px)`;
        appliedTransform = baseTranslateY;
      }

      function onEnd(ev) {
        if (ev && ev.pointerId !== undefined && ev.pointerId !== pointerId) return;
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onEnd);
        window.removeEventListener('pointercancel', onEnd);
        row.classList.remove('shot-dragging');
        row.style.transform = '';
        const rows = Array.from(container.querySelectorAll('.shoot-mode-shot-row'));
        shoot.shotList = rows.map(r => shoot.shotList[Number(r.dataset.idx)]);
        saveState();
        renderShootModeShots(shoot);
        renderAll();
      }

      // See wireShotDragHandle for why this listens on window rather than
      // the handle itself.
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onEnd);
      window.addEventListener('pointercancel', onEnd);
    });
  }

  function renderShootModeMoodboard(shoot) {
    const term = moodboardTerm(shoot.category);
    document.getElementById('shootModeMoodboardHeading').textContent = term;
    document.getElementById('shootModeMoodEmpty').textContent = `No ${term.toLowerCase()} images for this shoot.`;
    const grid = document.getElementById('shootModeMoodboard');
    grid.innerHTML = '';
    idbGetImages(shoot.id).then(images => {
      document.getElementById('shootModeMoodEmpty').hidden = images.length !== 0;
      images.forEach((img, idx) => {
        const thumb = document.createElement('div');
        thumb.className = 'moodboard-thumb';
        thumb.innerHTML = `<img src="${img.src}" alt="" />`;
        thumb.querySelector('img').addEventListener('click', () => {
          openImageViewer(images, idx, shoot.id, () => renderShootModeMoodboard(shoot), false);
        });
        grid.appendChild(thumb);
      });
    }).catch(() => { document.getElementById('shootModeMoodEmpty').hidden = false; });
  }

  function openShootMode(shootId) {
    // Close (and thus autosave) the edit form BEFORE looking the shoot up —
    // autosaveShoot() replaces state.shoots[idx] with a new merged object
    // rather than mutating it in place, so a reference grabbed beforehand
    // would be left pointing at a detached, stale copy. Every edit made in
    // shoot mode writes straight through this reference, so it has to be
    // the live one or ticks/edits made here would silently not persist.
    if (!shootModalOverlay.hidden) closeShootModal();
    const shoot = state.shoots.find(s => s.id === shootId);
    if (!shoot) { setShootModeShootId(null); return false; }
    setShootModeShootId(shootId);
    document.getElementById('shootModeTitle').textContent = shootDisplayName(shoot);
    renderShootModeShots(shoot);
    renderShootModeMoodboard(shoot);
    document.getElementById('shootModeShootingNotes').value = shoot.shootingNotes || '';
    shootModeOverlay.hidden = false;
    // renderShootModeShots() ran while shootModeOverlay was still hidden, so
    // every row measured zero height and kept its one-line default — same
    // trap as openShootModal, same fix: re-size once there's real layout.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        autoSizeAllListTextareas();
      });
    });
    return true;
  }

  function exitShootMode() {
    setShootModeShootId(null);
    shootModeOverlay.hidden = true;
  }

  document.getElementById('shootModeExitBtn').addEventListener('click', exitShootMode);

  // Same field as the main edit form's Shot list section (#shootShootingNotes)
  // — writes straight to the shoot, same as every other Shoot Mode field.
  document.getElementById('shootModeShootingNotes').addEventListener('input', (e) => {
    const shoot = state.shoots.find(s => s.id === getShootModeShootId());
    if (!shoot) return;
    shoot.shootingNotes = e.target.value;
    autoSizeTextarea(e.target);
    saveState();
  });

  // Writes straight to state and re-renders just the shot list, same as
  // ticking a checkbox or editing a shot above — no working copy, so a shot
  // added mid-shoot survives whatever happens to the phone next.
  document.getElementById('shootModeAddShotBtn').addEventListener('click', () => {
    const shoot = state.shoots.find(s => s.id === getShootModeShootId());
    if (!shoot) return;
    if (!Array.isArray(shoot.shotList)) shoot.shotList = [];
    shoot.shotList.push({ text: '', checked: false });
    saveState();
    renderShootModeShots(shoot, shoot.shotList.length - 1);
    renderAll();
  });

  // "Done shooting" is a wrap-up action, not just an escape hatch — the next
  // thing you want after finishing a shoot is almost always that shoot's own
  // page (to jot a reflection, check something off), not whatever screen
  // happened to be underneath. Same tab-then-modal sequence the post-shoot
  // journal prompt uses, for the same reason: openShootModal needs the right
  // tab active first, or it opens behind it.
  document.getElementById('shootModeDoneBtn').addEventListener('click', () => {
    const shootId = getShootModeShootId();
    exitShootMode();
    if (!shootId) return;
    const s = state.shoots.find(x => x.id === shootId);
    if (!s) return;
    document.querySelector(`.tab[data-view="${s.archived ? 'archive' : 'shoots'}"]`).click();
    openShootModal(shootId);
  });

  document.getElementById('enterShootModeBtn').addEventListener('click', () => {
    if (currentShootId) openShootMode(currentShootId);
  });

  // ---------- Archive mode ----------
  // A read-only counterpart to Shoot mode for a shoot that's already done —
  // a condensed report (Basic info, a trimmed Logistics/Team, the reflection
  // in full, final images) instead of a working view, since there's nothing
  // left to plan or shoot. No persisted "survives a restart" id like Shoot
  // mode's — this is a quick look, not a mode you'd want to still be in after
  // relaunching the app.
  const archiveModeOverlay = document.getElementById('archiveModeOverlay');
  let archiveModeShootId = null;

  // One label-over-value block, styled like Shoot Mode's Quick review fields
  // but a plain div rather than a button — nothing here is tappable.
  function archiveModeField(label, value) {
    const div = document.createElement('div');
    div.className = 'archive-mode-field';
    div.innerHTML = `
      <p class="shoot-mode-review-label">${escapeHtml(label)}</p>
      <p class="shoot-mode-review-value">${escapeHtml(value)}</p>
    `;
    return div;
  }

  function archiveModeSectionHeading(text, colorClass) {
    const h3 = document.createElement('h3');
    h3.className = `shoot-mode-section-heading ${colorClass}`;
    h3.textContent = text;
    return h3;
  }

  function renderArchiveModeBody(shoot) {
    const body = document.getElementById('archiveModeBody');
    body.innerHTML = '';

    // Whichever of Title/Talent the header's shootDisplayName actually drew
    // from is skipped below so it isn't said twice — titleDisplayMode picks
    // talent-first by default, so that's normally Talent, but flips to Title
    // when the app's set to show titles first. The other one, if present,
    // still adds information the header alone doesn't carry (e.g. a title
    // distinct from whoever's in it, or extra talents beyond the first).
    const displayName = shootDisplayName(shoot);
    const talentNames = (shoot.talents || []).map(t => t.name).filter(hasText);
    const basicInfoFields = [];
    basicInfoFields.push(['Category', CATEGORY_LABELS[shoot.category] || 'Uncategorized']);
    if (hasText(shoot.title) && shoot.title !== displayName) basicInfoFields.push(['Title', shoot.title]);
    if (talentNames.length && !(talentNames.length === 1 && talentNames[0] === displayName)) {
      basicInfoFields.push(['Talent', talentNames.join(', ')]);
    }
    if (basicInfoFields.length) {
      body.appendChild(archiveModeSectionHeading('Basic info', 'heading-yellow'));
      basicInfoFields.forEach(([label, value]) => body.appendChild(archiveModeField(label, value)));
    }

    const logisticsFields = [];
    if (hasText(shoot.date)) logisticsFields.push(['Shoot date', prettyDate(shoot.date)]);
    const locationText = formatLocationDisplay(shoot.location);
    if (hasText(locationText)) logisticsFields.push(['Location', locationText]);
    if (logisticsFields.length) {
      body.appendChild(archiveModeSectionHeading('Logistics', 'heading-navy'));
      logisticsFields.forEach(([label, value]) => body.appendChild(archiveModeField(label, value)));
    }

    const teamMembers = (shoot.teamMembers || []).filter(tm => hasText(tm.name));
    if (teamMembers.length) {
      body.appendChild(archiveModeSectionHeading('Team', 'heading-yellow'));
      teamMembers.forEach(tm => {
        const roleLabel = (TEAM_ROLE_OPTIONS.find(([val]) => val === tm.role) || [null, 'Other'])[1];
        body.appendChild(archiveModeField(roleLabel, tm.name));
      });
    }

    const reflectionFields = [];
    if (hasText(shoot.whatWentRight)) reflectionFields.push(['What went right', shoot.whatWentRight]);
    if (hasText(shoot.couldBeBetter)) reflectionFields.push(["What could've gone better", shoot.couldBeBetter]);
    if (hasText(shoot.lessonsLearned)) reflectionFields.push(['Lessons for next time', shoot.lessonsLearned]);
    if (reflectionFields.length) {
      body.appendChild(archiveModeSectionHeading('Reflection', 'heading-navy'));
      reflectionFields.forEach(([label, value]) => body.appendChild(archiveModeField(label, value)));
    }

    // Video's counterpart to final images in this report: what was made and
    // where it went, in the same label-over-value fields as above. Video has
    // no final images — any stored from before the shoot was switched to
    // video stay in IndexedDB, just aren't shown.
    const deliverableFields = videoDeliverableFields(shoot);
    if (deliverableFields.length) {
      body.appendChild(archiveModeSectionHeading('Deliverables', 'heading-yellow'));
      deliverableFields.forEach(([label, value]) => body.appendChild(archiveModeField(label, value)));
    }
    if (isVideoShoot(shoot)) return;

    const finalImagesGrid = document.createElement('div');
    finalImagesGrid.className = 'moodboard-grid archive-mode-final-images';
    idbGetImages(finalImagesKey(shoot.id)).then(images => {
      if (!images.length) return;
      if (!reflectionFields.length) body.appendChild(archiveModeSectionHeading('Reflection', 'heading-navy'));
      body.appendChild(finalImagesGrid);
      images.forEach((img, idx) => {
        const thumb = document.createElement('div');
        thumb.className = 'moodboard-thumb';
        thumb.innerHTML = `<img src="${img.src}" alt="" />`;
        thumb.querySelector('img').addEventListener('click', () => {
          openImageViewer(images, idx, finalImagesKey(shoot.id), null, false);
        });
        finalImagesGrid.appendChild(thumb);
      });
    }).catch(() => {});
  }

  function openArchiveMode(shootId) {
    if (!shootModalOverlay.hidden) closeShootModal();
    const shoot = state.shoots.find(s => s.id === shootId);
    if (!shoot) return;
    archiveModeShootId = shootId;
    document.getElementById('archiveModeTitle').textContent = shootDisplayName(shoot);
    document.getElementById('archiveModeDoneBtn').textContent = pickRandomSaveMessage();
    renderArchiveModeBody(shoot);
    archiveModeOverlay.hidden = false;
  }

  function exitArchiveMode() {
    archiveModeShootId = null;
    archiveModeOverlay.hidden = true;
  }

  document.getElementById('archiveModeExitBtn').addEventListener('click', exitArchiveMode);
  document.getElementById('archiveModeDoneBtn').addEventListener('click', exitArchiveMode);

  // "Shoot details" swaps to the full edit view for the same shoot — the
  // mirror image of Archive mode's own button on that page (see
  // updateEnterShootModeBtnVisibility), so the two stay switchable back and
  // forth without ever landing on the main tab underneath.
  document.getElementById('archiveModeShootDetailsBtn').addEventListener('click', () => {
    const shootId = archiveModeShootId;
    exitArchiveMode();
    if (!shootId) return;
    document.querySelector('.tab[data-view="archive"]').click();
    openShootModal(shootId);
  });

  document.getElementById('enterArchiveModeBtn').addEventListener('click', () => {
    if (currentShootId) openArchiveMode(currentShootId);
  });

  // ---------- Shoot mode: Quick review (editable Direction / Lighting setups) ----------
  const SHOOT_MODE_DIRECTION_FIELDS = [
    // Concept's limit comes from the field itself (raised to 300 so the
    // concept helper's summaries fit), so the two can't drift apart.
    ['premise', 'Concept', () => document.getElementById('shootPremise').maxLength || 300],
    ['character', 'Character/Personality', 1000],
    ['worldNotes', 'World-building notes', 1000],
    ['shootGoals', 'Shoot goals', 1000],
    ['elevatorPitch', 'Elevator pitch', 150],
    ['talentDirections', 'Directions for talent', 1000],
    ['teamDirections', 'Directions for team', 1000],
  ];

  // Every field is its own tap target — opens the shared expand-field editor
  // (see openExpandField's config-object form) to change what's there, or
  // fill in a field that's still blank, which is why this shows ALL fields
  // rather than filtering to ones already written (the old read-only
  // version's whole-field-blank empty state doesn't apply here for the
  // same reason). onSave is the caller's own write-back — this function
  // doesn't know or care whether it's writing a Direction field or a
  // lighting setup's.
  function renderShootModeReviewField(label, value, maxLength, onSave) {
    const filled = hasText(value);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'shoot-mode-review-field';
    btn.innerHTML = `
      <p class="shoot-mode-review-label">${escapeHtml(label)}</p>
      <p class="shoot-mode-review-value${filled ? '' : ' shoot-mode-review-empty'}">${filled ? escapeHtml(value) : 'Tap to add'}</p>
    `;
    btn.addEventListener('click', () => {
      openExpandField({ title: label, value: value || '', maxLength, onSave });
    });
    return btn;
  }

  function openShootModeReview(kind) {
    const shootId = getShootModeShootId();
    const shoot = shootId ? state.shoots.find(s => s.id === shootId) : null;
    if (!shoot) return;
    const body = document.getElementById('shootModeReviewBody');
    body.innerHTML = '';

    // Re-opens on the same kind, so editing one field doesn't lose your
    // place among the rest of the list.
    const refresh = () => openShootModeReview(kind);
    const commit = () => {
      saveState();
      refresh();
      renderAll();
    };

    if (kind === 'direction') {
      document.getElementById('shootModeReviewTitle').textContent = 'Direction';
      SHOOT_MODE_DIRECTION_FIELDS.forEach(([key, label, maxLength]) => {
        const limit = typeof maxLength === 'function' ? maxLength() : maxLength;
        body.appendChild(renderShootModeReviewField(label, shoot[key] || '', limit, (newValue) => {
          shoot[key] = newValue;
          commit();
        }));
      });
    } else {
      document.getElementById('shootModeReviewTitle').textContent = 'Lighting setups';
      const setups = (shoot.lightingSetups || [])
        .filter(item => hasText(item.name) || hasText(item.characteristics) || hasText(item.description));
      if (!setups.length) {
        body.innerHTML = '<p class="shoot-mode-empty">No lighting setups logged for this shoot.</p>';
      } else {
        setups.forEach((item, idx) => {
          const group = document.createElement('div');
          group.className = 'shoot-mode-review-setup';
          const name = document.createElement('p');
          name.className = 'shoot-mode-review-setup-name';
          name.textContent = hasText(item.name) ? item.name : `Setup ${idx + 1}`;
          name.addEventListener('click', () => {
            openExpandField({
              title: 'Setup name', value: item.name || '', maxLength: 200,
              onSave: (newValue) => { item.name = newValue; commit(); },
            });
          });
          group.appendChild(name);
          group.appendChild(renderShootModeReviewField('Characteristics', item.characteristics || '', 1000, (newValue) => {
            item.characteristics = newValue;
            commit();
          }));
          group.appendChild(renderShootModeReviewField('Description', item.description || '', 1000, (newValue) => {
            item.description = newValue;
            commit();
          }));
          body.appendChild(group);
        });
      }
    }
    document.getElementById('shootModeReviewOverlay').hidden = false;
  }

  document.getElementById('shootModeReviewDirectionBtn').addEventListener('click', () => openShootModeReview('direction'));
  document.getElementById('shootModeReviewLightingBtn').addEventListener('click', () => openShootModeReview('lighting'));
  document.getElementById('shootModeReviewCloseBtn').addEventListener('click', () => {
    document.getElementById('shootModeReviewOverlay').hidden = true;
  });
  document.getElementById('shootModeReviewOkBtn').addEventListener('click', () => {
    document.getElementById('shootModeReviewOverlay').hidden = true;
  });

  // Deliberately no backdrop-click dismiss: this is a mode you're working in
  // with a camera in your other hand, not a popup to swipe away by accident.

  function resumeShootModeIfActive() {
    const id = getShootModeShootId();
    if (!id) return false;
    const shoot = state.shoots.find(s => s.id === id);
    // Left on into a new day — closed the app mid-shoot and didn't come
    // back until later — shouldn't keep reopening yesterday's working view.
    // Once the shoot's own day has passed, close out of it automatically
    // so the app boots into the regular flow for today instead. Same 5am
    // day boundary as the rest of the once-a-day logic, so shooting late
    // into the night doesn't get kicked out mid-shoot at midnight.
    if (shoot && shoot.date && shoot.date < effectiveReportDateStr()) {
      setShootModeShootId(null);
      return false;
    }
    return openShootMode(id);
  }

  document.getElementById('shootModeStartBtn').addEventListener('click', () => {
    const id = document.getElementById('shootModePromptOverlay').dataset.shootId;
    document.getElementById('shootModePromptOverlay').hidden = true;
    if (id) openShootMode(id);
  });

  document.getElementById('shootModeSkipBtn').addEventListener('click', () => {
    document.getElementById('shootModePromptOverlay').hidden = true;
    // Answers the obvious follow-up — "so where did that go?" — once, rather
    // than re-asking on every shoot day forever.
    showTabIntro('shootmode:where');
  });

  function maybeShowShootModePrompt() {
    if (!shootModeOverlay.hidden) return;
    // Not before 5am: a shoot dated today isn't "today" yet at 1am, so this
    // uses the same 5am-rollover day as the other once-a-day prompts. A
    // late-night open the evening before, or a 2am open on the day itself,
    // stays quiet until the day really starts.
    const today = effectiveReportDateStr();
    let asked;
    try { asked = localStorage.getItem(SHOOT_MODE_ASKED_KEY); } catch (e) { asked = null; }
    if (asked === today) return;

    const shoot = state.shoots.find(x => !x.archived && !POST_CAPTURE_STATUSES.includes(x.status) && x.status !== 'rescheduled' && x.status !== 'canceled' && x.date === today);
    if (!shoot) return;
    try { localStorage.setItem(SHOOT_MODE_ASKED_KEY, today); } catch (e) { /* ignore */ }

    const overlay = document.getElementById('shootModePromptOverlay');
    overlay.dataset.shootId = shoot.id;
    document.getElementById('shootModePromptText').textContent =
      `you're shooting ${shootDisplayName(shoot)} today. Shoot mode strips the app back to just your shot list and your ${moodboardTerm(shoot.category).toLowerCase()}, so you can tick shots off as you go without digging through the planner. It stays on until you end it.`;
    overlay.hidden = false;
  }

  function checkDayAfterPrompt() {
    const today = effectiveReportDateStr();
    let lastShown;
    try { lastShown = localStorage.getItem(DAY_AFTER_PROMPT_KEY); } catch (e) { lastShown = null; }
    if (lastShown === today) return;

    // Any shoot whose date has passed and hasn't been marked post-capture
    // yet — not just ones from exactly yesterday, so skipping a day (or
    // several) of opening the app doesn't silently drop the check-in for
    // good. It still only asks once a day (the lastShown guard above), so
    // whichever day you next open the app is the day it catches up.
    const pendingShoots = state.shoots.filter(s => !s.archived && !POST_CAPTURE_STATUSES.includes(s.status) && s.date && s.date < today);
    if (!pendingShoots.length) return;

    try { localStorage.setItem(DAY_AFTER_PROMPT_KEY, today); } catch (e) { /* ignore */ }

    const names = pendingShoots.map(shootDisplayName);
    const plural = pendingShoots.length > 1;
    document.getElementById('dayAfterPromptText').textContent = `Did ${plural ? 'these shoots' : 'this shoot'} happen: ${joinWithAnd(names)}?`;
    document.getElementById('dayAfterPromptActions').hidden = false;
    document.getElementById('dayAfterOkBtn').hidden = true;
    document.getElementById('dayAfterPromptOverlay').hidden = false;
  }

  document.getElementById('dayAfterYesBtn').addEventListener('click', () => {
    document.getElementById('dayAfterPromptText').textContent = "Don't forget to update each shoot's status to reflect where it's at now!";
    document.getElementById('dayAfterPromptActions').hidden = true;
    document.getElementById('dayAfterOkBtn').hidden = false;
  });

  document.getElementById('dayAfterNoBtn').addEventListener('click', () => {
    document.getElementById('dayAfterPromptOverlay').hidden = true;
  });

  document.getElementById('dayAfterOkBtn').addEventListener('click', () => {
    document.getElementById('dayAfterPromptOverlay').hidden = true;
    document.querySelector('.tab[data-view="shoots"]').click();
  });

  // ---------- Daily report (in-app "notifications" shown once per day on open) ----------
  // No backend exists to fire real background push, so this checks on open
  // instead: once per day (the first time the app is opened that day), it
  // looks at every shoot for shoots that actually need something — 7 days
  // out with something still pending, a post-shoot reflection that's gone
  // 3+ days unanswered, and an editing check-in once a week — and surfaces
  // whatever applies in one popup, plus a random fun fact about the user's
  // own shoot history. Tapping an item jumps straight to that shoot.
  const DAILY_REPORT_SHOWN_KEY = 'dailies_daily_report_shown_v1';

  function parseShootDate(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  // "X's shoot is in N days — pending: Team, Moodboard", or null when it
  // doesn't apply (out of the 7-day window, or nothing's pending any more).
  // Shared by the one-time build in computeDailyReportItems and the
  // same-day refresh of the cached report, so both agree on what's pending.
  function sevenDayReminderText(s, today) {
    if (!s.date) return null;
    const daysUntil = Math.round((parseShootDate(s.date) - today) / 86400000);
    const pending = shootPendingLabels(s);
    if (daysUntil < 0 || daysUntil > 7 || !pending.length) return null;
    const when = daysUntil === 0 ? 'today' : `in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`;
    return `${shootDisplayName(s)}'s shoot is ${when} — pending: ${pending.join(', ')}`;
  }

  function computeDailyReportItems() {
    const items = [];
    // Collected across the loop and emitted as a single line at the end —
    // four shoots owing reflections used to mean four near-identical rows,
    // which reads as a wall rather than one thing to go do.
    const reflectionMissing = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    state.shoots.forEach(s => {
      if (s.archived) return;

      // 7 days out and still missing team/moodboard — one-time per shoot.
      if (s.date && !POST_CAPTURE_STATUSES.includes(s.status) && !s.sevenDayReminderShown) {
        const text = sevenDayReminderText(s, today);
        if (text) {
          items.push({ shootId: s.id, kind: 'sevenDay', text });
          s.sevenDayReminderShown = true;
        }
      }

      // Post-shoot reflection still blank — repeats every 3 days until filled in.
      if (s.capturedAt && !hasText(s.whatWentRight) && !hasText(s.couldBeBetter) && !hasText(s.lessonsLearned)) {
        const daysSinceCaptured = Math.floor((Date.now() - new Date(s.capturedAt).getTime()) / 86400000);
        const daysSinceLastReminder = s.lastReflectionReminderAt
          ? Math.floor((Date.now() - new Date(s.lastReflectionReminderAt).getTime()) / 86400000)
          : Infinity;
        if (daysSinceCaptured >= 3 && daysSinceLastReminder >= 3) {
          reflectionMissing.push(s);
          s.lastReflectionReminderAt = new Date().toISOString();
        }
      }

      // Editing check-in — repeats weekly for as long as the shoot stays in the
      // edit (Editing, or a video's Rough cut/Client review/Revisions).
      if (isInTheEditStatus(s.status) && s.editingAt) {
        const daysSinceEditing = Math.floor((Date.now() - new Date(s.editingAt).getTime()) / 86400000);
        const daysSinceLastReminder = s.lastEditingReminderAt
          ? Math.floor((Date.now() - new Date(s.lastEditingReminderAt).getTime()) / 86400000)
          : daysSinceEditing;
        if (daysSinceEditing >= 7 && daysSinceLastReminder >= 7) {
          items.push({ shootId: s.id, text: `How's editing going for ${shootDisplayName(s)}'s shoot?` });
          s.lastEditingReminderAt = new Date().toISOString();
        }
      }
    });

    // Only carries a shootId when there's exactly one to open — with several
    // named in the line there's no single sensible destination, so that row is
    // informational and renderDailyReportOverlay leaves it unclickable.
    if (reflectionMissing.length) {
      items.push({
        shootId: reflectionMissing.length === 1 ? reflectionMissing[0].id : null,
        text: 'Post-shoot reflection still missing for:',
        list: reflectionMissing.map(shootDisplayName),
      });
    }

    return items;
  }

  // Builds every fun fact that's actually TRUE for this user's real data
  // right now (never a fabricated stat) — category comparisons, talent and
  // location repeats, and tag/role frequencies all expand into many possible
  // strings on their own, so the realistic pool of variations this can
  // produce runs well past a hundred as a user's history grows.
  function computeFunFacts() {
    const facts = [];
    const shoots = state.shoots;
    const now = new Date();
    const count = (pred) => shoots.filter(pred).length;

    const totalCount = shoots.length;
    if (totalCount > 0) facts.push(`You've logged ${totalCount} shoot${totalCount === 1 ? '' : 's'} total.`);

    const thisYearCount = count(s => s.date && parseShootDate(s.date).getFullYear() === now.getFullYear());
    if (thisYearCount > 0) facts.push(`You've planned ${thisYearCount} shoot${thisYearCount === 1 ? '' : 's'} so far this year.`);

    // Only counts shoots that actually happened (captured or later) — a
    // shoot merely dated/scheduled for this month but still in planning
    // shouldn't count toward "shoots this month".
    const thisMonthCount = count(s => s.date && POST_CAPTURE_STATUSES.includes(s.status) && parseShootDate(s.date).getFullYear() === now.getFullYear() && parseShootDate(s.date).getMonth() === now.getMonth());
    if (thisMonthCount > 0) facts.push(`You've had ${thisMonthCount} shoot${thisMonthCount === 1 ? '' : 's'} this month.`);

    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthCount = count(s => s.date && POST_CAPTURE_STATUSES.includes(s.status) && parseShootDate(s.date).getFullYear() === lastMonthDate.getFullYear() && parseShootDate(s.date).getMonth() === lastMonthDate.getMonth());
    if (thisMonthCount > lastMonthCount && lastMonthCount > 0) facts.push(`You've shot ${thisMonthCount - lastMonthCount} more time${(thisMonthCount - lastMonthCount) === 1 ? '' : 's'} this month than last.`);
    if (lastMonthCount > thisMonthCount && lastMonthCount > 0) facts.push(`Last month you had ${lastMonthCount} shoot${lastMonthCount === 1 ? '' : 's'} — busier than this month so far.`);

    const deliveredCount = count(s => s.status === 'delivered');
    if (deliveredCount > 0) facts.push(`You've delivered ${deliveredCount} shoot${deliveredCount === 1 ? '' : 's'}.`);

    const archivedCount = count(s => s.archived);
    if (archivedCount > 0) facts.push(`You've archived ${archivedCount} completed shoot${archivedCount === 1 ? '' : 's'}.`);

    const activeCount = count(s => !s.archived);
    if (activeCount > 0) facts.push(`You currently have ${activeCount} active shoot${activeCount === 1 ? '' : 's'} in the pipeline.`);

    // Streaks: shot every day this past week, and the longest run ever.
    const shotDates = new Set(shoots.filter(s => s.date && POST_CAPTURE_STATUSES.includes(s.status)).map(s => s.date));
    let allLast7 = shotDates.size > 0;
    for (let i = 0; i < 7 && allLast7; i++) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      if (!shotDates.has(formatDate(d))) allLast7 = false;
    }
    if (allLast7) facts.push("You shot every day this past week!");

    if (shotDates.size > 0) {
      const sortedDates = [...shotDates].sort();
      let longest = 1, current = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const diff = Math.round((parseShootDate(sortedDates[i]) - parseShootDate(sortedDates[i - 1])) / 86400000);
        current = diff === 1 ? current + 1 : 1;
        longest = Math.max(longest, current);
      }
      if (longest >= 3) facts.push(`Your longest shooting streak is ${longest} days in a row.`);
    }

    const pastDates = shoots.filter(s => s.date && s.date <= todayStr()).map(s => s.date).sort();
    if (pastDates.length) {
      const daysSince = Math.round((now - parseShootDate(pastDates[pastDates.length - 1])) / 86400000);
      if (daysSince > 0) facts.push(`It's been ${daysSince} day${daysSince === 1 ? '' : 's'} since your last shoot.`);
      facts.push(`Your very first logged shoot was on ${prettyDate(pastDates[0])}.`);
    }

    // Category comparisons — every pair where one category outnumbers another.
    // Only categories with a known plural label qualify: this naturally
    // excludes shoots with no category set, and guards against stale
    // category keys left over from a since-renamed/removed option, either of
    // which would otherwise render as literal "undefined" in the sentence.
    const catCounts = {};
    shoots.forEach(s => { if (s.category) catCounts[s.category] = (catCounts[s.category] || 0) + 1; });
    const catEntries = Object.entries(catCounts).filter(([cat]) => CATEGORY_PLURAL_LABELS[cat]);
    catEntries.forEach(([catA, nA]) => {
      catEntries.forEach(([catB, nB]) => {
        if (catA !== catB && nA > nB) {
          facts.push(`You've shot more ${CATEGORY_PLURAL_LABELS[catA]} than ${CATEGORY_PLURAL_LABELS[catB]} — ${nA} vs ${nB}.`);
        }
      });
    });
    if (catEntries.length) {
      const [topCat, topN] = catEntries.sort((a, b) => b[1] - a[1])[0];
      facts.push(`${CATEGORY_LABELS[topCat]} is your most-photographed category, with ${topN} shoot${topN === 1 ? '' : 's'}.`);
    }

    const teamCount = count(s => s.teamRequired === 'yes');
    if (teamCount > 0) facts.push(`${teamCount} of your shoots have needed a team.`);

    const roleCounts = {};
    shoots.forEach(s => (s.teamMembers || []).forEach(tm => { if (tm.role) roleCounts[tm.role] = (roleCounts[tm.role] || 0) + 1; }));
    const roleEntries = Object.entries(roleCounts);
    if (roleEntries.length) {
      const [topRole] = roleEntries.sort((a, b) => b[1] - a[1])[0];
      const roleLabel = (TEAM_ROLE_OPTIONS.find(([v]) => v === topRole) || [])[1] || topRole;
      facts.push(`${roleLabel} is the team role you book most often.`);
    }

    const moodboardDone = count(s => s.moodboardComplete && !isVideoShoot(s));
    if (moodboardDone > 0) facts.push(`${moodboardDone} of your shoots have a finished mood board.`);
    const storyboardDone = count(s => s.moodboardComplete && isVideoShoot(s));
    if (storyboardDone > 0) facts.push(`${storyboardDone} of your video shoots have a finished storyboard.`);

    const talentCounts = {};
    shoots.forEach(s => (s.talents || []).forEach(talent => {
      const t = (talent.name || '').trim();
      if (t) talentCounts[t] = (talentCounts[t] || 0) + 1;
    }));
    const talentEntries = Object.entries(talentCounts);
    if (talentEntries.length) {
      facts.push(`You've photographed ${talentEntries.length} different talent${talentEntries.length === 1 ? '' : 's'}.`);
      const [topTalent, topTalentN] = talentEntries.sort((a, b) => b[1] - a[1])[0];
      if (topTalentN > 1) facts.push(`${topTalent} is your most-photographed collaborator, with ${topTalentN} shoots together.`);
    }

    const tagCounts = {};
    shoots.forEach(s => (s.frameworkTags || []).forEach(t => { tagCounts[t.tag] = (tagCounts[t.tag] || 0) + 1; }));
    const tagEntries = Object.entries(tagCounts);
    if (tagEntries.length) {
      const [topTag, topTagN] = tagEntries.sort((a, b) => b[1] - a[1])[0];
      facts.push(`"${topTag}" is your most-used descriptor, tagged on ${topTagN} shoot${topTagN === 1 ? '' : 's'}.`);
    }

    const refTotal = shoots.reduce((sum, s) => sum + (s.references || []).length, 0);
    if (refTotal > 0) facts.push(`You've saved ${refTotal} reference link${refTotal === 1 ? '' : 's'} across your shoots.`);

    const DOW_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dowCounts = new Array(7).fill(0);
    shoots.forEach(s => { if (s.date) dowCounts[parseShootDate(s.date).getDay()]++; });
    const maxDow = dowCounts.indexOf(Math.max(...dowCounts));
    if (dowCounts[maxDow] > 0) facts.push(`${DOW_NAMES[maxDow]} is your most common shoot day.`);

    const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthCounts = new Array(12).fill(0);
    shoots.forEach(s => { if (s.date) monthCounts[parseShootDate(s.date).getMonth()]++; });
    const maxMonth = monthCounts.indexOf(Math.max(...monthCounts));
    if (monthCounts[maxMonth] > 0) facts.push(`${MONTH_NAMES[maxMonth]} is historically your busiest shoot month.`);

    const capturedShoots = shoots.filter(s => s.capturedAt);
    if (capturedShoots.length > 0) {
      const reflectedCount = capturedShoots.filter(s => hasText(s.whatWentRight) || hasText(s.couldBeBetter) || hasText(s.lessonsLearned)).length;
      facts.push(`You've completed post-shoot reflections for ${Math.round((reflectedCount / capturedShoots.length) * 100)}% of your captured shoots.`);
    }

    const journalCount = state.journalEntries.length;
    if (journalCount > 0) facts.push(`You've written ${journalCount} journal entr${journalCount === 1 ? 'y' : 'ies'}.`);

    const journalTagCounts = {};
    state.journalEntries.forEach(e => (e.tags || []).forEach(t => { journalTagCounts[t] = (journalTagCounts[t] || 0) + 1; }));
    const journalTagEntries = Object.entries(journalTagCounts);
    if (journalTagEntries.length) {
      const [topJTag] = journalTagEntries.sort((a, b) => b[1] - a[1])[0];
      facts.push(`#${topJTag} is your most-used journal tag.`);
    }

    const locCounts = {};
    const locLabels = {};
    shoots.forEach(s => {
      if (isLocationBlank(s.location)) return;
      const key = locationKey(s.location);
      locCounts[key] = (locCounts[key] || 0) + 1;
      locLabels[key] = formatLocationDisplay(s.location);
    });
    const locEntries = Object.entries(locCounts);
    if (locEntries.length) {
      facts.push(`You've shot in ${locEntries.length} different location${locEntries.length === 1 ? '' : 's'}.`);
      const [topLocKey, topLocN] = locEntries.sort((a, b) => b[1] - a[1])[0];
      if (topLocN > 1) facts.push(`${locLabels[topLocKey]} is your most-used location, shot there ${topLocN} times.`);
    }

    const totalShots = shoots.reduce((sum, s) => sum + (s.shotList || []).length, 0);
    if (totalShots > 0) {
      facts.push(`You've planned ${totalShots} individual shot${totalShots === 1 ? '' : 's'} across your shot lists.`);
      const checkedShots = shoots.reduce((sum, s) => sum + (s.shotList || []).filter(x => x.checked).length, 0);
      facts.push(`You've checked off ${Math.round((checkedShots / totalShots) * 100)}% of your planned shots.`);
    }

    const editingCount = count(s => isInTheEditStatus(s.status));
    if (editingCount > 0) facts.push(`${editingCount} shoot${editingCount === 1 ? ' is' : 's are'} currently in post.`);
    const selectsCount = count(s => s.status === 'waiting_for_selects');
    if (selectsCount > 0) facts.push(`${selectsCount} shoot${selectsCount === 1 ? '' : 's'} waiting on selects.`);

    return facts;
  }

  function pickRandomFunFact() {
    const facts = computeFunFacts();
    if (!facts.length) return null;
    return facts[Math.floor(Math.random() * facts.length)];
  }

  // A general nudge about outstanding pending items — separate from the
  // scheduled, once-per-shoot items in computeDailyReportItems() above.
  // Recomputed fresh every time the report shows (like the fun fact), so it
  // always reflects today's real pending state rather than a one-time flag.
  function computeDailyReportNudges(finalImagesMissingCount) {
    const nudges = [];
    const activeShoots = state.shoots.filter(s => !s.archived);

    const moodboardPendingShoots = activeShoots.filter(moodboardPending);
    const moodboardPendingCount = moodboardPendingShoots.length;
    const videoBoardCount = moodboardPendingShoots.filter(isVideoShoot).length;
    // All photo shoots -> the original wording (so an already-cached nudge
    // still matches in refreshCachedDailyReportContent); all video ->
    // storyboard; a mix -> both.
    const allVideo = videoBoardCount > 0 && videoBoardCount === moodboardPendingCount;
    const boardNoun = videoBoardCount === 0 ? 'mood board' : (allVideo ? 'storyboard' : 'mood board or storyboard');
    const boardNounPlural = videoBoardCount === 0 ? 'mood boards' : (allVideo ? 'storyboards' : 'mood boards or storyboards');
    if (moodboardPendingCount === 1) nudges.push(`A shoot still needs a ${boardNoun}!`);
    else if (moodboardPendingCount === 2) nudges.push(`A couple of shoots still need ${boardNounPlural}!`);
    else if (moodboardPendingCount > 2) nudges.push(`${moodboardPendingCount} shoots still need ${boardNounPlural}!`);

    const teamPendingCount = activeShoots.filter(teamPending).length;
    if (teamPendingCount === 1) nudges.push("There's teams yet to be assembled!");
    else if (teamPendingCount > 1) nudges.push('Are all your teams set?');

    if (finalImagesMissingCount === 1) nudges.push('A delivered shoot is still missing its final images!');
    else if (finalImagesMissingCount > 1) nudges.push(`${finalImagesMissingCount} delivered shoots are still missing final images!`);

    return nudges;
  }

  function pickDailyReportNudge(finalImagesMissingCount) {
    const nudges = computeDailyReportNudges(finalImagesMissingCount);
    if (!nudges.length) return null;
    return nudges[Math.floor(Math.random() * nudges.length)];
  }

  // Counts active (not-yet-archived) delivered shoots with no final images
  // uploaded yet — the one piece of Daily report content that needs an
  // IndexedDB lookup, so it's resolved async and awaited before the report
  // gets assembled.
  function countActiveDeliveredShootsMissingFinalImages() {
    // Video has no final images, so a delivered video never counts here.
    const deliveredShoots = state.shoots.filter(s => !s.archived && s.status === 'delivered' && !isVideoShoot(s));
    if (!deliveredShoots.length) return Promise.resolve(0);
    return Promise.all(deliveredShoots.map(s => idbGetImages(finalImagesKey(s.id)).then(images => images.length === 0)))
      .then(flags => flags.filter(Boolean).length);
  }

  // The Daily report's content (items/nudge/fact) is built at most once a
  // day and cached — computeDailyReportItems() mutates one-time reminder
  // flags on each shoot as a side effect, so recomputing it a second time
  // the same day (e.g. reopening via the notifications bell after the
  // automatic popup already showed) would silently lose items whose flags
  // just got set. Both the automatic popup and the on-demand bell read
  // through this same cache.
  const DAILY_REPORT_CONTENT_KEY = 'dailies_daily_report_content_v2';

  function loadCachedDailyReportContent() {
    try {
      const raw = localStorage.getItem(DAILY_REPORT_CONTENT_KEY);
      const parsed = raw ? JSON.parse(raw) : null;
      return (parsed && parsed.date === effectiveReportDateStr()) ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function buildTodaysDailyReportContent() {
    const items = computeDailyReportItems();
    const fact = pickRandomFunFact();
    return countActiveDeliveredShootsMissingFinalImages().then(finalImagesMissingCount => {
      const nudge = pickDailyReportNudge(finalImagesMissingCount);
      const content = { date: effectiveReportDateStr(), items, nudge, fact };
      try { localStorage.setItem(DAILY_REPORT_CONTENT_KEY, JSON.stringify(content)); } catch (e) { /* ignore */ }
      saveState();
      return content;
    });
  }

  // The cache keeps today's report from re-rolling or re-firing one-time
  // reminders, but everything in it describes the moment it was built — a
  // shoot moved past planning since then (captured, delivered, postponed…)
  // would otherwise keep its "needs a mood board" line until tomorrow. So on
  // every read, the pending-based lines are checked against the data as it is
  // now: a seven-day reminder is dropped or reworded to what's still
  // pending, and the nudge is kept only if it's still true (otherwise a
  // fresh one is picked, or none if nothing's left). Everything else —
  // the fun fact, the editing check-in, the reflection list — stays as built.
  function refreshCachedDailyReportContent(cached) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const items = [];
    cached.items.forEach(item => {
      if (item.kind !== 'sevenDay') { items.push(item); return; }
      const s = state.shoots.find(x => x.id === item.shootId);
      if (!s || s.archived || POST_CAPTURE_STATUSES.includes(s.status)) return;
      const text = sevenDayReminderText(s, today);
      if (text) items.push({ ...item, text });
    });
    return countActiveDeliveredShootsMissingFinalImages().then(finalImagesMissingCount => {
      const current = computeDailyReportNudges(finalImagesMissingCount);
      const nudge = cached.nudge && current.includes(cached.nudge)
        ? cached.nudge
        : (current.length ? current[Math.floor(Math.random() * current.length)] : null);
      const content = { ...cached, items, nudge };
      try { localStorage.setItem(DAILY_REPORT_CONTENT_KEY, JSON.stringify(content)); } catch (e) { /* ignore */ }
      return content;
    });
  }

  function getTodaysDailyReportContent() {
    const cached = loadCachedDailyReportContent();
    return cached ? refreshCachedDailyReportContent(cached) : buildTodaysDailyReportContent();
  }

  function renderDailyReportOverlay(content) {
    const { items, nudge, fact } = content;
    const list = document.getElementById('dailyReportList');
    list.innerHTML = '';
    items.forEach(item => {
      const row = document.createElement('div');
      // daily-report-fact is the app's existing "this row isn't a link" marker
      // (it's what the nudge and stat lines use), so a grouped item that names
      // several shoots reuses it rather than inventing a second flavour.
      row.className = item.shootId ? 'daily-report-item' : 'daily-report-item daily-report-fact';
      row.textContent = item.text;
      if (item.list && item.list.length) {
        const ul = document.createElement('ul');
        ul.className = 'daily-report-item-list';
        item.list.forEach(name => {
          const li = document.createElement('li');
          li.textContent = name;
          ul.appendChild(li);
        });
        row.appendChild(ul);
      }
      if (item.shootId) {
        row.addEventListener('click', () => {
          document.getElementById('dailyReportOverlay').hidden = true;
          document.querySelector('.tab[data-view="shoots"]').click();
          openShootModal(item.shootId);
        });
      }
      list.appendChild(row);
    });

    if (nudge) {
      const row = document.createElement('div');
      row.className = 'daily-report-item daily-report-fact';
      row.textContent = nudge;
      list.appendChild(row);
    }

    if (fact) {
      const row = document.createElement('div');
      row.className = 'daily-report-item daily-report-fact';
      row.textContent = `Stat of the day: ${fact}`;
      list.appendChild(row);
    }

    // Only reachable via the on-demand bell — the automatic popup never
    // calls this when everything's empty (see checkDailyReportPrompt).
    if (!items.length && !nudge && !fact) {
      const row = document.createElement('div');
      row.className = 'daily-report-item daily-report-fact';
      row.textContent = 'Nothing to report today.';
      list.appendChild(row);
    }

    document.getElementById('dailyReportOverlay').hidden = false;
  }

  // Distinguishes the once-a-day automatic popup from an explicit bell tap, so
  // the follow-up "here's where to find this again" hint only fires for the
  // former (see the close handler).
  let dailyReportWasAutomatic = false;

  function checkDailyReportPrompt() {
    const today = effectiveReportDateStr();
    let lastShown;
    try { lastShown = localStorage.getItem(DAILY_REPORT_SHOWN_KEY); } catch (e) { lastShown = null; }
    if (lastShown === today) return;

    getTodaysDailyReportContent().then(content => {
      // Always show once a day — if nothing is pending, it's just the fact.
      // Only truly skip if there's none of the three (a brand-new, empty app).
      if (!content.items.length && !content.nudge && !content.fact) return;
      try { localStorage.setItem(DAILY_REPORT_SHOWN_KEY, today); } catch (e) { /* ignore */ }
      dailyReportWasAutomatic = true;
      renderDailyReportOverlay(content);
    });
  }

  // Notifications bell — same content as the Daily report, shown on demand
  // instead of gated to once a day. Unlike the automatic popup, this always
  // shows something (a "nothing to report" line if today's report is
  // genuinely empty), since it's an explicit tap rather than a background check.
  function openNotificationsBell() {
    dailyReportWasAutomatic = false;
    getTodaysDailyReportContent().then(renderDailyReportOverlay);
  }

  document.getElementById('dailyReportCloseBtn').addEventListener('click', () => {
    document.getElementById('dailyReportOverlay').hidden = true;
    // Only after the report showed up on its own. Pointing out the bell to
    // someone who just tapped the bell would be telling them what they know.
    if (dailyReportWasAutomatic) showTabIntro('report:bell');
  });

  // Nothing used to flush pending edits when the app went away, so anything
  // typed inside the debounce window was lost if iOS discarded the backgrounded
  // tab — which it does aggressively. visibilitychange is the reliable signal on
  // mobile Safari (pagehide/beforeunload often never fire when an app is
  // swiped away), and it doubles as the cue to park the Archive rotation so it
  // isn't animating photos for a screen nobody's looking at.
  function flushPendingEdits() {
    saveShootNow();
    saveJournalNow();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      flushPendingEdits();
      stopArchiveSlideshow();
    } else if (!views.archive.hidden) {
      startArchiveSlideshow();
    }
  });
  window.addEventListener('pagehide', flushPendingEdits);

  renderAll();
  // Photos come from IndexedDB, which is async, so the first paint above lands
  // without thumbnails and this fills them in a moment later. Everything after
  // boot reads them straight off the in-memory state, so this is the only
  // moment it's visible.
  migrateInlinePhotos()
    .then(hydratePhotos)
    .then(() => renderAll())
    .catch(() => {});
  // Introductions first: on a genuinely first run this is the welcome step, and
  // the rest of the launch popups defer so they don't stack on top of it.
  maybeShowPhotographerPrompt();
  if (document.getElementById('photographerModalOverlay').hidden) {
    // Shoot mode outranks every launch popup. If it's still switched on you're
    // mid-shoot and want the working view, not a report; and on a shoot day the
    // offer to enter it is the most time-sensitive thing the app can say, so it
    // goes ahead of the daily report rather than queueing behind it.
    if (!resumeShootModeIfActive()) {
      maybeShowShootModePrompt();
      if (document.getElementById('shootModePromptOverlay').hidden) {
        showTabIntro('overview');
        if (document.getElementById('tabIntroOverlay').hidden) {
          checkDayAfterPrompt();
          if (document.getElementById('dayAfterPromptOverlay').hidden) {
            checkDailyReportPrompt();
          }
        }
      }
    }
  }

  // ---------- restore an in-progress journal entry across restarts ----------
  function restoreOpenJournalEntry() {
    let id;
    try { id = localStorage.getItem(OPEN_JOURNAL_KEY); } catch (e) { return; }
    if (!id) return;
    if (!state.journalEntries.some(x => x.id === id)) { clearOpenJournalMarker(); return; }
    document.querySelector('.tab[data-view="journal"]').click();
    // Edit mode: the marker only exists because the app went away mid-write, so
    // this puts you back where you were. It also has to match the list, which
    // now opens straight into the editor — an entry restored read-only would be
    // a view you can no longer reach any other way.
    openJournalModal(id, 'edit');
  }
  restoreOpenJournalEntry();

  // ---------- fixed bottom bar spacing ----------
  function updateTabbarHeightVar() {
    const tabbar = document.querySelector('.tabbar');
    document.documentElement.style.setProperty('--tabbar-height', tabbar.offsetHeight + 'px');
  }
  updateTabbarHeightVar();
  window.addEventListener('resize', updateTabbarHeightVar);

  // iOS Safari has a known quirk where position:fixed elements (like the
  // bottom tab bar) can visually drift or leave a stale frame on screen
  // after the on-screen keyboard or Safari's own collapsing toolbar resizes
  // the visual viewport, since that resize doesn't always trigger a full
  // reflow. Re-running the tabbar height recalculation on every
  // visualViewport change forces exactly that reflow as a lightweight fix.
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateTabbarHeightVar);
    window.visualViewport.addEventListener('scroll', updateTabbarHeightVar);
  }

  // ---------- service worker (offline caching) ----------
  // Skipped inside a native wrapper (Capacitor injects window.Capacitor) —
  // a native build already bundles every file locally, so the service
  // worker's own caching layer is redundant there and can conflict with how
  // the native shell serves local assets. No-op today since window.Capacitor
  // doesn't exist in a plain browser/PWA context.
  if (!window.Capacitor && 'serviceWorker' in navigator) {
    // Without this, an installed (Add to Home Screen) PWA can sit on a
    // stale service worker far longer than "close and reopen the app"
    // would suggest — WKWebView doesn't reliably check for a new sw.js on
    // its own timeline, and even once it does, the new worker installing
    // in the background doesn't do anything for the tab/app instance
    // that's already open until that instance is reloaded. This forces an
    // eager check on every load, and reloads once (guarded so it can't
    // loop) the instant a new worker actually takes over — so a fresh
    // deploy shows up on the very next load instead of an unpredictable
    // number of relaunches later.
    let refreshingForNewWorker = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshingForNewWorker) return;
      refreshingForNewWorker = true;
      window.location.reload();
    });
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then((registration) => {
        registration.update();
      }).catch(() => {});
    });
  }

  // ---------- pull to refresh ----------
  (function setupPullToRefresh() {
    const indicator = document.getElementById('pullToRefreshIndicator');
    const THRESHOLD = 70;
    const MAX_PULL = 90;
    const HIDDEN_Y = -60;
    const MIN_VISIBLE_MS = 650;
    let startX = null;
    let startY = null;
    let pullDistance = 0;
    let active = false;
    let refreshing = false;

    function setTransform(y) {
      indicator.style.transform = `translateX(-50%) translateY(${y}px)`;
    }

    function anyModalOpen() {
      return !!document.querySelector('.modal-overlay:not([hidden]), .stat-box-detail-overlay:not([hidden])');
    }

    document.addEventListener('touchstart', (e) => {
      if (refreshing || window.scrollY > 0 || anyModalOpen() || e.touches.length !== 1) {
        active = false;
        return;
      }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      active = true;
      pullDistance = 0;
      indicator.style.transition = 'none';
    }, { passive: true });

    document.addEventListener('touchmove', (e) => {
      if (!active || startY === null || refreshing) return;
      const dy = e.touches[0].clientY - startY;
      const dx = e.touches[0].clientX - startX;
      // Only a mostly-vertical drag counts as a pull — a diagonal or
      // horizontal one is the tab-swipe gesture's territory instead.
      if (dy <= 0 || window.scrollY > 0 || Math.abs(dx) > Math.abs(dy)) { pullDistance = 0; return; }
      pullDistance = Math.min(MAX_PULL, dy * 0.5);
      indicator.hidden = false;
      setTransform(HIDDEN_Y + pullDistance);
      if (e.cancelable) e.preventDefault();
    }, { passive: false });

    document.addEventListener('touchend', () => {
      if (!active) return;
      active = false;
      indicator.style.transition = 'transform 0.2s ease';
      if (pullDistance >= THRESHOLD) {
        triggerRefresh();
      } else {
        setTransform(HIDDEN_Y);
        setTimeout(() => { if (!refreshing) indicator.hidden = true; }, 200);
      }
      pullDistance = 0;
    });

    // A real touchcancel (incoming call/notification, Control Center swipe,
    // app switch) should never trigger a refresh — just reset the visuals,
    // same as an under-threshold touchend. Without this, an interrupted
    // gesture could leave the indicator's inline transform/transition stuck.
    document.addEventListener('touchcancel', () => {
      if (!active) return;
      active = false;
      indicator.style.transition = 'transform 0.2s ease';
      setTransform(HIDDEN_Y);
      setTimeout(() => { if (!refreshing) indicator.hidden = true; }, 200);
      pullDistance = 0;
    });

    function triggerRefresh() {
      refreshing = true;
      setTransform(14);
      const minDelay = new Promise(resolve => setTimeout(resolve, MIN_VISIBLE_MS));
      const previousState = state;
      state = loadState();
      // loadState() rebuilds every shoot from the saved blob, which has no
      // photos in it (they live in IndexedDB) — without this every thumbnail
      // went blank on a refresh and stayed that way until the app was
      // relaunched. Carrying them across means the repaint below already has
      // them; the re-read after is only a backstop for anything not in memory
      // yet (e.g. a pull while the launch-time read is still running).
      carryPhotosOver(previousState, state);
      renderAll();
      hydratePhotos().then(filled => { if (filled) renderAll(); }).catch(() => {});
      minDelay.then(() => {
        refreshing = false;
        indicator.style.transition = 'transform 0.2s ease';
        setTransform(HIDDEN_Y);
        setTimeout(() => { indicator.hidden = true; }, 200);
      });
    }
  })();

  // ---------- swipe between tabs ----------
  (function setupTabSwipe() {
    const TAB_ORDER = ['overview', 'shoots', 'archive', 'journal', 'stats'];
    let startX = null;
    let startY = null;
    let tracking = false;

    function anyModalOpen() {
      return !!document.querySelector('.modal-overlay:not([hidden]), .stat-box-detail-overlay:not([hidden])');
    }

    document.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1 || anyModalOpen()) { tracking = false; return; }
      // The stats carousel and the image viewer already own horizontal
      // swipes for their own paging — don't hijack those.
      if (e.target.closest('#statsCarousel') || e.target.closest('.image-viewer-stage')) {
        tracking = false;
        return;
      }
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      tracking = true;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
      if (!tracking || startX === null) return;
      tracking = false;
      const dx = e.changedTouches[0].clientX - startX;
      const dy = e.changedTouches[0].clientY - startY;
      startX = null;
      startY = null;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;

      const activeTab = document.querySelector('.tab.active');
      if (!activeTab) return;

      const currentIndex = TAB_ORDER.indexOf(activeTab.dataset.view);
      if (currentIndex === -1) return;
      const nextIndex = currentIndex + (dx < 0 ? 1 : -1);
      if (nextIndex < 0 || nextIndex >= TAB_ORDER.length) return;
      const nextTabBtn = document.querySelector(`.tab[data-view="${TAB_ORDER[nextIndex]}"]`);
      if (nextTabBtn) nextTabBtn.click();
    }, { passive: true });
  })();
})();
