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

  const STATUS_LABELS = {
    idea_phase: 'Early idea',
    planning: 'Active planning',
    waiting_to_shoot: 'Shoot ready',
    captured: 'Captured',
    waiting_for_selects: 'Waiting for selects',
    editing: 'Editing',
    delivered: 'Delivered',
    rescheduled: 'Rescheduled',
    canceled: 'Canceled',
  };

  // Keeps the visible "Status: X" swatch button in sync with the real
  // (invisible) #shootStatus select underneath it — call after anything
  // changes that select's value.
  function updateStatusSwatchDisplay() {
    const value = document.getElementById('shootStatus').value;
    document.getElementById('statusSwatchDisplay').textContent = `Status: ${STATUS_LABELS[value] || ''}`;
  }

  // Shared by the upcoming/today filters (exclude), the in-edit bucket
  // (include, minus delivered), and the day-after check-in (exclude) — a
  // single list so a new post-capture status only has to be added once.
  const POST_CAPTURE_STATUSES = ['captured', 'waiting_for_selects', 'editing', 'delivered'];

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
        zip: loc.zip || '',
        country: loc.country || legacyRegion || '',
      };
    }
    return { name: loc || '', street: '', city: '', zip: '', country: legacyRegion || '' };
  }

  function isLocationBlank(loc) {
    return !loc || (!hasText(loc.name) && !hasText(loc.street) && !hasText(loc.city) && !hasText(loc.zip) && !hasText(loc.country));
  }

  // Composes a location into one display line: "name — street, city, zip, Country".
  function formatLocationDisplay(loc) {
    if (!loc) return '';
    const parts = [];
    if (hasText(loc.name)) parts.push(loc.name.trim());
    const addressLine = [loc.street, loc.city, loc.zip].filter(hasText).map(v => v.trim()).join(', ');
    if (addressLine) parts.push(addressLine);
    if (loc.country) parts.push(REGION_LABELS[loc.country] || loc.country);
    return parts.join(' — ');
  }

  // Case/whitespace-insensitive identity key for deduping/matching locations
  // (e.g. recognizing a past location was picked again for directions reuse).
  function locationKey(loc) {
    return ['name', 'street', 'city', 'zip', 'country'].map(k => ((loc && loc[k]) || '').trim().toLowerCase()).join('|');
  }

  const CATEGORY_LABELS = {
    commercial: 'Commercial',
    video: 'Video',
    editorial: 'Editorial',
    lighting_test: 'Lighting test',
    portfolio_building: 'Portfolio building',
    test_shoot: 'Test shoot',
    event: 'Event',
    wedding: 'Wedding',
    family: 'Family',
    headshot: 'Headshot',
    branding: 'Branding',
    publicity: 'Publicity',
    maternity: 'Maternity',
    boudoir: 'Boudoir',
    other: 'Other',
    uncategorized: 'Uncategorized',
  };

  const CATEGORY_FILTER_ORDER = ['commercial', 'video', 'editorial', 'lighting_test', 'portfolio_building', 'test_shoot', 'event', 'wedding', 'family', 'headshot', 'branding', 'publicity', 'maternity', 'boudoir', 'other'];

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
    family: 'family shoots',
    headshot: 'headshot shoots',
    branding: 'branding shoots',
    publicity: 'publicity shoots',
    maternity: 'maternity shoots',
    boudoir: 'boudoir shoots',
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
    "I guess that's good for now", 'yup, yup', "that's good", 'okay', 'yes',
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

  const LIGHTING_TAGS = ['Natural light', 'Golden hour', 'Overcast/diffused', 'Hard flash', 'Studio lighting', 'Softbox', 'Ring light', 'Bounced light', 'Backlighting', 'Backlit', 'Silhouette', 'Low key', 'High key', 'Practical lights', 'Colored gels', 'Other'];
  const VISUAL_LANGUAGE_TAGS = ['Lifestyle', 'Documentary', 'Magic realism', 'Surrealism', 'Portrait', 'Fashion', 'Fitness', 'Cinematic', 'Commercial', 'Headshot', 'Beauty', 'Other'];

  function seedFrameworks() {
    return [
      {
        id: uid(),
        name: 'Visual Language',
        tags: [...VISUAL_LANGUAGE_TAGS],
      },
      {
        id: uid(),
        name: 'Lighting',
        tags: [...LIGHTING_TAGS],
      },
    ];
  }

  const THEME_KEYS = ['default', 'pink', 'purple', 'red', 'blue', 'green'];

  function defaultState() {
    return {
      shoots: [],
      frameworks: seedFrameworks(),
      journalEntries: [],
      titleDisplayMode: 'talent',
      colorTheme: 'default',
      defaultCountry: '',
    };
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
  // Principles framework entirely (this app is meant to be shareable, not
  // tied to one photographer's vocabulary), and upgrades Visual Language's
  // tags forward through each past default set, but only while they still
  // exactly match a known-old default (so a user's own edits are never
  // clobbered).
  function migrateFrameworks(frameworks) {
    let result = frameworks.filter(f => f.name !== 'Documenting Fictions Principles');
    const oldestVisualTags = ['Narrative Realism', 'Expressive Performance', 'Editorial Aesthetic', 'Cinematic Atmosphere'];
    const midVisualTags = ['Realism', 'Lifestyle', 'Documentary', 'Magic realism', 'Surreal', 'Other'];
    const priorVisualTags = ['Realism', 'Lifestyle', 'Documentary', 'Magic realism', 'Surreal', 'Portrait', 'Other'];
    const laterVisualTags = ['Realism', 'Lifestyle', 'Documentary', 'Magic realism', 'Surrealism', 'Portrait', 'Other'];
    const newVisualTags = ['Lifestyle', 'Documentary', 'Magic realism', 'Surrealism', 'Portrait', 'Fashion', 'Fitness', 'Cinematic', 'Other'];
    const newerVisualTags = ['Lifestyle', 'Documentary', 'Magic realism', 'Surrealism', 'Portrait', 'Fashion', 'Fitness', 'Cinematic', 'Commercial', 'Headshot', 'Test shoot', 'Other'];
    const priorNewestVisualTags = ['Lifestyle', 'Documentary', 'Magic realism', 'Surrealism', 'Portrait', 'Fashion', 'Fitness', 'Cinematic', 'Commercial', 'Headshot', 'Other'];
    const vl = result.find(f => f.name === 'Visual Language');
    if (vl) {
      const current = JSON.stringify(vl.tags);
      if (current === JSON.stringify(oldestVisualTags) || current === JSON.stringify(midVisualTags) || current === JSON.stringify(priorVisualTags) || current === JSON.stringify(laterVisualTags) || current === JSON.stringify(newVisualTags) || current === JSON.stringify(newerVisualTags) || current === JSON.stringify(priorNewestVisualTags)) {
        vl.tags = [...VISUAL_LANGUAGE_TAGS];
      }
    }
    // Lighting replaced the old free-text field with checkboxes — add it
    // for anyone whose saved frameworks predate that change, and bump an
    // existing one forward if it still has the pre-expansion tag set.
    const lighting = result.find(f => f.name === 'Lighting');
    if (!lighting) {
      result.push({ id: uid(), name: 'Lighting', tags: [...LIGHTING_TAGS] });
    } else {
      const priorLightingTags = ['Natural light', 'Golden hour', 'Overcast/diffused', 'Hard flash', 'Softbox', 'Ring light', 'Backlighting', 'Silhouette', 'Low key', 'High key', 'Practical lights', 'Colored gels', 'Other'];
      if (JSON.stringify(lighting.tags) === JSON.stringify(priorLightingTags)) {
        lighting.tags = [...LIGHTING_TAGS];
      }
    }
    return result.length ? result : seedFrameworks();
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
    const status = s.status !== undefined ? s.status : (hasText(s.deliveryStatus) ? 'delivered' : 'idea_phase');
    const lessonsLearned = s.lessonsLearned !== undefined ? s.lessonsLearned : (s.reflection || '');
    return {
      ...s,
      title: s.title || '',
      status,
      location: normalizeLocation(s.location, s.region),
      startTime: s.startTime || s.time || '',
      endTime: s.endTime || '',
      premise: s.premise !== undefined ? s.premise : (s.concept || ''),
      character: s.character || '',
      shootGoals: s.shootGoals || '',
      elevatorPitch: s.elevatorPitch || '',
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

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      const frameworks = migrateFrameworks((Array.isArray(parsed.frameworks) && parsed.frameworks.length) ? parsed.frameworks : seedFrameworks());
      const shoots = (parsed.shoots || []).map(s => migrateShoot(s, frameworks));
      renameFrameworkTag(shoots, frameworks, 'Visual Language', 'Surreal', 'Surrealism');
      const journalEntries = (Array.isArray(parsed.journalEntries) ? parsed.journalEntries : []).map(migrateJournalEntry);
      return {
        shoots,
        frameworks,
        journalEntries,
        titleDisplayMode: parsed.titleDisplayMode === 'title' ? 'title' : 'talent',
        colorTheme: THEME_KEYS.includes(parsed.colorTheme) ? parsed.colorTheme : 'default',
        defaultCountry: typeof parsed.defaultCountry === 'string' ? parsed.defaultCountry : '',
      };
    } catch (e) {
      console.error('Failed to load state, starting fresh', e);
      return defaultState();
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
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

  // A nested level of collapsing inside an already-collapsible Overview
  // section: each week-bucket subheading (This week / Next week / Later)
  // toggles just its own rows, independent of its sibling buckets and of
  // the outer section — same isSectionCollapsed persistence, one key per
  // bucket (e.g. "overview:upcoming:this_week").
  function renderBucketedShoots(container, shoots, buckets, dateField, collapsePrefix, rowOpts) {
    buckets.forEach(bucketKey => {
      const bucketShoots = shoots.filter(s => weekBucket(s[dateField]) === bucketKey);
      if (!bucketShoots.length) return;

      const collapseKey = `${collapsePrefix}:${bucketKey}`;
      const collapsed = isSectionCollapsed(collapseKey);

      const heading = document.createElement('p');
      heading.className = `upcoming-subheading${collapsed ? ' collapsed' : ''}`;
      heading.innerHTML = `${escapeHtml(WEEK_BUCKET_LABELS[bucketKey])}${COLLAPSE_ARROW_SVG}`;
      container.appendChild(heading);

      const rowsWrap = document.createElement('div');
      rowsWrap.className = 'upcoming-subheading-rows';
      rowsWrap.hidden = collapsed;
      bucketShoots.forEach(s => renderShootRow(rowsWrap, s, rowOpts));
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

  function shootPendingLabels(s) {
    const labels = [];
    if (s.teamRequired === 'yes' && !s.teamFinalized) labels.push('Team');
    // Once a shoot has moved past capture, the mood board no longer matters —
    // don't keep flagging it as pending (the underlying value is left alone
    // so it's exactly right again if the status ever moves back earlier).
    if (!isPostCaptureStatus(s.status) && !s.moodboardComplete) labels.push('Moodboard');
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

  // Same thumbnail treatment as a shoot bubble, for a journal entry's cover
  // photo — src is resolved separately since it isn't a plain stored field
  // the way a shoot's projectPhoto is (see journalEntryImagesKey() below).
  function journalThumbHtml(src) {
    return src
      ? `<div class="shoot-thumb"><img src="${src}" alt="" /></div>`
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
    const checkFinalImages = !!(showBadge && opts && opts.checkFinalImages && s.status === 'delivered');
    const statusLabel = (showBadge && opts && opts.showStatus && !checkFinalImages) ? (STATUS_LABELS[s.status] || '') : '';
    const pendingLabels = (showBadge && opts && opts.showPending) ? shootPendingLabels(s) : [];
    const pendingText = pendingLabels.length ? `Pending: ${escapeHtml(pendingLabels.join(', '))}` : '';
    // Proofs are only "pending" for the captured step itself — once a shoot
    // moves to waiting_for_selects, proofs have already gone out.
    const proofsPendingText = (showBadge && s.status === 'captured') ? 'Pending: Proofs' : '';
    // Once a shoot's captured there's a reflection worth writing eventually —
    // flag it if that's never happened yet, same idea as missing final images.
    // Applies on the Shoots page too, not just Archive, now that reflections
    // are expected any time from captured onward rather than only once archived.
    const hasReflection = hasText(s.whatWentRight) || hasText(s.couldBeBetter) || hasText(s.lessonsLearned);
    const reflectionPendingText = (showBadge && POST_CAPTURE_STATUSES.includes(s.status) && !hasReflection) ? 'Pending: Reflection' : '';
    const badgeParts = [statusLabel, pendingText, proofsPendingText, reflectionPendingText].filter(Boolean);
    const badgeHtml = badgeParts.join('<br>');
    // Once archived there's nothing left to deliver, so the deadline no
    // longer means anything — don't show it. Otherwise, an overdue deadline
    // still shows (until the shoot's delivered or archived), just in red.
    const isOverdue = !!s.deadline && s.deadline < todayStr();
    const dueHtml = (s.deadline && !s.archived)
      ? `<span class="shoot-row-due${isOverdue ? ' overdue' : ''}">Due: ${prettyDateShort(s.deadline)}</span>`
      : '';
    const div = document.createElement('div');
    div.className = 'shoot-row';
    div.innerHTML = `
      ${shootThumbHtml(s)}
      <div class="shoot-row-body">
        <div class="shoot-row-top">
          <span class="shoot-row-title"><strong>${escapeHtml(shootDisplayName(s))}</strong></span>
          <div class="shoot-row-dates">
            <span class="mi-sub">${shootDateLabel(s, prettyDateShort)}</span>
            ${dueHtml}
          </div>
        </div>
        <span class="badge"${badgeHtml ? '' : ' hidden'}>${badgeHtml}</span>
      </div>
      <button type="button" class="row-options-btn" aria-label="Options">&#8942;</button>
    `;
    div.addEventListener('click', () => {
      if (opts && opts.switchToShootsTab) document.querySelector('.tab[data-view="shoots"]').click();
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
  function renderCompactShootRow(container, s) {
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
    div.addEventListener('click', () => openShootModal(s.id));
    div.querySelector('.row-options-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      openShootOptions(s.id);
    });
    container.appendChild(div);
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
      window.scrollTo(0, 0);
      renderAll();
      if (view === 'journal') showJournalView('select');
      showTabIntro(view);
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
    journal: {
      title: 'Journal',
      text: "a freeform space for notes that aren't tied to any single shoot. track reflections, ideas, or whatever's on your mind. tag entries with hashtags so you can find them again later.",
    },
    stats: {
      title: 'Stats',
      text: 'swipe between breakdowns of your visual languages, categories, team members, statuses, and locations. tap any slice to see exactly which shoots are behind it.',
    },
    'journal:log': {
      title: 'Log',
      text: "this notebook fills itself in automatically — no writing required. Each week you actually shoot something gets its own entry listing which shoots happened, their categories, and your lessons learned pulled straight from each shoot's reflection.",
    },
    'journal:reflections': {
      title: 'Reflections',
      text: "this is your freeform journal. Every shoot's post-shoot reflection is automatically logged here too, right alongside anything you write yourself. Tap '+' to add your own entry, or tap any entry to reopen and edit it.",
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
    ideas: s => !s.archived && (s.status === 'idea_phase' || s.status === 'planning'),
    ready: s => !s.archived && s.status === 'waiting_to_shoot',
    pending: s => !s.archived && shootPendingLabels(s).length > 0,
  };

  const STAT_BOX_TITLES = {
    ideas: 'Ideas + Planning',
    ready: 'Ready to shoot',
    pending: 'Teams + mood boards pending',
  };

  document.getElementById('statsRow').addEventListener('click', (e) => {
    const box = e.target.closest('.stat-box');
    if (!box) return;
    const key = box.dataset.stat;
    openStatBoxDetail(STAT_BOX_FILTERS[key], STAT_BOX_TITLES[key]);
  });

  let statBoxScrollLockY = 0;
  function lockBodyScroll() {
    statBoxScrollLockY = window.scrollY;
    document.body.style.position = 'fixed';
    document.body.style.top = `-${statBoxScrollLockY}px`;
    document.body.style.left = '0';
    document.body.style.right = '0';
  }
  function unlockBodyScroll() {
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.left = '';
    document.body.style.right = '';
    window.scrollTo(0, statBoxScrollLockY);
  }

  function openStatBoxDetail(filterFn, title) {
    const shoots = state.shoots.filter(filterFn)
      .sort((a, b) => dateTimeSortKey(a).localeCompare(dateTimeSortKey(b)));
    document.getElementById('statBoxDetailTitle').textContent = title;
    const list = document.getElementById('statBoxDetailList');
    list.innerHTML = '';
    shoots.forEach(s => renderCompactShootRow(list, s));
    document.getElementById('statBoxDetailEmpty').hidden = shoots.length > 0;
    const overlay = document.getElementById('statBoxDetailOverlay');
    overlay.hidden = false;
    lockBodyScroll();
    requestAnimationFrame(() => requestAnimationFrame(() => overlay.classList.add('open')));
  }

  function closeStatBoxDetail() {
    const overlay = document.getElementById('statBoxDetailOverlay');
    overlay.classList.remove('open');
    unlockBodyScroll();
    setTimeout(() => { overlay.hidden = true; }, 200);
  }

  document.getElementById('statBoxDetailCloseBtn').addEventListener('click', closeStatBoxDetail);
  document.getElementById('statBoxDetailOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeStatBoxDetail();
  });

  function renderOverview() {
    const todayShoots = state.shoots.filter(isToday)
      .sort((a, b) => dateTimeSortKey(a).localeCompare(dateTimeSortKey(b)));
    const upcomingShoots = state.shoots.filter(isUpcoming)
      .sort((a, b) => dateTimeSortKey(a).localeCompare(dateTimeSortKey(b)));
    const deadlineShoots = state.shoots.filter(isUpcomingDeadline)
      .filter(s => weekBucket(s.deadline) === 'this_week' || weekBucket(s.deadline) === 'next_week')
      .sort((a, b) => dateSortKey(a.deadline).localeCompare(dateSortKey(b.deadline)));
    const proofsPendingShoots = state.shoots.filter(s => !s.archived && s.status === 'captured')
      .sort((a, b) => dateSortKey(a.date).localeCompare(dateSortKey(b.date)));

    const ideasCount = state.shoots.filter(STAT_BOX_FILTERS.ideas).length;
    const readyToShootCount = state.shoots.filter(STAT_BOX_FILTERS.ready).length;
    const pendingTeamMoodboardCount = state.shoots.filter(STAT_BOX_FILTERS.pending).length;

    document.getElementById('statsRow').innerHTML = `
      <div class="stat-box" data-stat="ideas">
        <span class="stat-num">${ideasCount}</span>
        <span class="stat-label">Ideas + Planning</span>
      </div>
      <div class="stat-box" data-stat="pending">
        <span class="stat-num">${pendingTeamMoodboardCount}</span>
        <span class="stat-label">Teams + mood boards pending</span>
      </div>
      <div class="stat-box" data-stat="ready">
        <span class="stat-num">${readyToShootCount}</span>
        <span class="stat-label">Ready to shoot</span>
      </div>
    `;

    document.getElementById('todaySection').hidden = todayShoots.length === 0;
    document.getElementById('todayCount').textContent = `[${todayShoots.length}]`;
    const todayList = document.getElementById('todayShootsList');
    todayList.innerHTML = '';
    todayShoots.forEach(s => renderShootRow(todayList, s, { showStatus: true }));

    // Always visible, even at zero — same reasoning as Upcoming deadlines
    // below: a reliable place to glance at what's coming, empty or not.
    document.getElementById('upcomingCount').textContent = `[${upcomingShoots.length}]`;
    const upList = document.getElementById('upcomingShootsList');
    upList.innerHTML = '';
    if (!upcomingShoots.length) {
      upList.innerHTML = '<p class="empty-hint upcoming-empty-hint">Upcoming shoots go here, brometheus.</p>';
    } else {
      renderBucketedShoots(upList, upcomingShoots, ['this_week', 'next_week', 'later'], 'date', 'overview:upcoming', { showStatus: true });
    }

    // Always visible, same reasoning as Upcoming deadlines below — a
    // reliable place to check, empty or not, rather than something that
    // pops in and out of the page.
    document.getElementById('proofsPendingCount').textContent = `[${proofsPendingShoots.length}]`;
    const proofsList = document.getElementById('proofsPendingShootsList');
    proofsList.innerHTML = '';
    if (!proofsPendingShoots.length) {
      proofsList.innerHTML = '<p class="empty-hint">No shoots waiting on proofs.</p>';
    } else {
      proofsPendingShoots.forEach(s => renderShootRow(proofsList, s, { showBadge: false }));
    }

    // Always visible, even at zero — unlike Today/Upcoming, this section
    // isn't about whether anything's due right now so much as being a
    // reliable place to glance at what's coming, empty or not.
    document.getElementById('upcomingDeadlinesCount').textContent = `[${deadlineShoots.length}]`;
    const deadlineList = document.getElementById('upcomingDeadlinesShootsList');
    deadlineList.innerHTML = '';
    if (!deadlineShoots.length) {
      deadlineList.innerHTML = '<p class="empty-hint">No deadlines on the horizon.</p>';
    } else {
      renderBucketedShoots(deadlineList, deadlineShoots, ['this_week', 'next_week'], 'deadline', 'overview:upcomingDeadlines', { showBadge: false });
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
  let shootSort = 'status';

  const SHOOT_SORT_LABELS = { status: 'Status', shoot_date: 'Shoot date', category: 'Category' };

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
  // regardless of which sort mode built the group.
  function renderShootGroup(list, groupKey, label, shoots, visibleIndex) {
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
    shoots.forEach(s => renderShootRow(rowsWrap, s, { showPending: true }));

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
  // shoot date except Editing, which orders by deadline since that's the
  // date that actually matters once a shoot's already been captured.
  function renderShootsByStatus(list, items) {
    let visibleIndex = 0;
    Object.keys(STATUS_LABELS).forEach(statusKey => {
      const group = items.filter(s => (s.status || 'idea_phase') === statusKey)
        .sort((a, b) => statusKey === 'editing'
          ? dateSortKey(a.deadline).localeCompare(dateSortKey(b.deadline))
          : dateTimeSortKey(a).localeCompare(dateTimeSortKey(b)));
      if (!group.length) return;
      renderShootGroup(list, statusKey, STATUS_LABELS[statusKey], group, visibleIndex);
      visibleIndex++;
    });
  }

  // Ignores status entirely — every shoot lands in one bucket by how soon
  // (or how long ago) its shoot date is.
  function renderShootsByDate(list, items) {
    const buckets = new Map();
    items.forEach(s => {
      const bucket = shootDateBucket(s.date);
      if (!buckets.has(bucket)) buckets.set(bucket, []);
      buckets.get(bucket).push(s);
    });
    let visibleIndex = 0;
    SHOOT_DATE_BUCKET_ORDER.forEach(bucketKey => {
      const group = buckets.get(bucketKey);
      if (!group || !group.length) return;
      group.sort((a, b) => dateTimeSortKey(a).localeCompare(dateTimeSortKey(b)));
      renderShootGroup(list, `date:${bucketKey}`, SHOOT_DATE_BUCKET_LABELS[bucketKey], group, visibleIndex);
      visibleIndex++;
    });
  }

  // Grouped by category — only categories with at least one shoot show up,
  // in the app's usual category order (not alphabetical; that's just for
  // the Edit Shoot category dropdown).
  function renderShootsByCategory(list, items) {
    const buckets = new Map();
    items.forEach(s => {
      const cat = s.category || 'other';
      if (!buckets.has(cat)) buckets.set(cat, []);
      buckets.get(cat).push(s);
    });
    let visibleIndex = 0;
    CATEGORY_FILTER_ORDER.forEach(cat => {
      const group = buckets.get(cat);
      if (!group || !group.length) return;
      group.sort((a, b) => dateTimeSortKey(a).localeCompare(dateTimeSortKey(b)));
      renderShootGroup(list, `cat:${cat}`, CATEGORY_LABELS[cat] || 'Other', group, visibleIndex);
      visibleIndex++;
    });
  }

  function renderShoots() {
    renderShootSortOptions();
    const list = document.getElementById('shootList');
    const items = state.shoots.filter(s => !s.archived);

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

  // Pulls final images across every shoot (any status) and cycles through
  // them; skips a rebuild if the image set hasn't actually changed so the
  // animation doesn't restart every time renderAll() runs.
  function renderArchiveSlideshow() {
    const shoots = state.shoots;
    Promise.all(shoots.map(s => idbGetImages(finalImagesKey(s.id)))).then(results => {
      const images = [];
      results.forEach((imgs, i) => {
        imgs.forEach(img => { if (img.src) images.push({ src: img.src, shootId: shoots[i].id }); });
      });
      const signature = images.map(img => img.src).join('|');
      if (signature === archiveSlideshowSignature) return;
      archiveSlideshowSignature = signature;
      shuffleArray(images);

      clearInterval(archiveSlideshowTimer);
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

      if (images.length > 1) {
        let idx = 0;
        archiveSlideshowTimer = setInterval(() => {
          const imgs = container.querySelectorAll('img');
          imgs[idx].classList.remove('active');
          idx = (idx + 1) % imgs.length;
          imgs[idx].classList.add('active');
        }, 4200);
      }
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
    let items = state.shoots.filter(s => s.archived).sort((a, b) => dateSortKey(b.date).localeCompare(dateSortKey(a.date)));
    if (archiveFilter !== 'all') items = items.filter(s => s.category === archiveFilter);

    list.innerHTML = '';
    document.getElementById('archiveEmpty').hidden = items.length !== 0;

    const years = new Map();
    items.forEach(s => {
      const year = s.date ? s.date.slice(0, 4) : 'Undated';
      const month = s.date ? s.date.slice(5, 7) : '00';
      if (!years.has(year)) years.set(year, new Map());
      const months = years.get(year);
      if (!months.has(month)) months.set(month, []);
      months.get(month).push(s);
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
          months.get(month).forEach(s => renderShootRow(yearRowsWrap, s, { showStatus: true, checkFinalImages: true }));
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
          months.get(month).forEach(s => renderShootRow(monthRowsWrap, s, { showStatus: true, checkFinalImages: true }));

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
  let journalTagFilter = 'all';
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

  // Which of the two Journal "notebooks" is open: 'select' (the cover
  // picker), 'reflections' (the existing freeform entries, unchanged), or
  // 'log' (the new read-only, auto-generated weekly recap).
  let journalView = 'select';

  function showJournalView(view) {
    journalView = view;
    document.getElementById('journalNotebookSelect').hidden = view !== 'select';
    document.getElementById('journalReflectionsView').hidden = view !== 'reflections';
    document.getElementById('journalLogView').hidden = view !== 'log';
    document.getElementById('journalBackBtn').hidden = view === 'select';
    document.getElementById('addJournalBtn').hidden = view !== 'reflections';
    document.getElementById('journalTitle').textContent =
      view === 'reflections' ? 'Reflections' : view === 'log' ? 'Log' : 'Journal';
    if (view === 'reflections') renderJournal();
    if (view === 'log') renderJournalLog();
    if (view === 'reflections' || view === 'log') showTabIntro(`journal:${view}`);
  }

  document.getElementById('openReflectionsNotebookBtn').addEventListener('click', () => showJournalView('reflections'));
  document.getElementById('openLogNotebookBtn').addEventListener('click', () => showJournalView('log'));
  document.getElementById('journalBackBtn').addEventListener('click', () => showJournalView('select'));

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
          (editable ? `<button type="button" class="final-thumb-delete" data-idx="${idx}">&times;</button>` : '');
        grid.appendChild(thumb);
      });
      if (editable) {
        grid.querySelectorAll('.final-thumb-delete').forEach(btn => {
          btn.addEventListener('click', () => {
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

  // Keeps a journal entry (linked via sourceShootId) in sync with a shoot's
  // post-shoot reflection fields — created on first content, updated on
  // every later edit, removed if all three fields get cleared out.
  function syncPostShootJournalEntry(shoot) {
    const parts = [shoot.whatWentRight, shoot.couldBeBetter, shoot.lessonsLearned]
      .map(t => (t || '').trim())
      .filter(t => t);
    const existingIdx = state.journalEntries.findIndex(e => e.sourceShootId === shoot.id);

    if (!parts.length) {
      if (existingIdx !== -1) state.journalEntries.splice(existingIdx, 1);
      return;
    }

    const body = parts.join('\n\n');
    const title = shoot.title || primaryTalentName(shoot) || 'Untitled shoot';
    // Tagged with the shoot's category — a linked entry has no hashtag input
    // of its own (editing always routes back to the shoot), so this is the
    // only source of its tags and can just stay fully in sync with it.
    const tags = CATEGORY_LABELS[shoot.category] ? [CATEGORY_LABELS[shoot.category]] : [];

    if (existingIdx !== -1) {
      state.journalEntries[existingIdx] = { ...state.journalEntries[existingIdx], title, body, tags };
    } else {
      state.journalEntries.push({
        id: uid(),
        title,
        body,
        tags,
        createdAt: todayStr(),
        sourceShootId: shoot.id,
      });
    }
  }

  // Same row style as a shoot bubble (Overview/Shoots/Archive) — the cover
  // photo fills the left side of the frame instead of sitting in a small
  // square thumb.
  function renderJournalEntryRow(container, e) {
    const row = document.createElement('div');
    row.className = 'shoot-row';
    // A linked entry's cover photo is the shoot's own project photo — same
    // picture you'd see on that shoot's bubble. Otherwise, fall back to
    // this entry's own uploaded photos, fetched async since IDB has no
    // synchronous read.
    const linkedShoot = e.sourceShootId ? state.shoots.find(s => s.id === e.sourceShootId) : null;
    const initialThumbSrc = (linkedShoot && linkedShoot.projectPhoto) || null;
    const tagsText = (e.tags && e.tags.length) ? e.tags.map(t => `#${escapeHtml(t)}`).join(' ') : '';
    row.innerHTML = `
      ${journalThumbHtml(initialThumbSrc)}
      <div class="shoot-row-body">
        <div class="shoot-row-top">
          <span class="shoot-row-title"><strong>${escapeHtml(e.title || 'Untitled entry')}</strong></span>
          <div class="shoot-row-dates">
            <span class="mi-sub">${prettyDate(e.createdAt)}</span>
          </div>
        </div>
        <span class="badge"${tagsText ? '' : ' hidden'}>${tagsText}</span>
      </div>
      <button type="button" class="row-options-btn" aria-label="Options">&#8942;</button>
    `;
    row.addEventListener('click', () => openJournalModal(e.id));
    row.querySelector('.row-options-btn').addEventListener('click', (ev) => {
      ev.stopPropagation();
      openJournalOptions(e.id);
    });
    container.appendChild(row);
    if (!initialThumbSrc) {
      idbGetImages(journalEntryImagesKey(e)).then(images => {
        if (!images.length) return;
        const thumb = row.querySelector('.shoot-thumb');
        if (thumb) thumb.outerHTML = journalThumbHtml(images[0].src);
      }).catch(() => {});
    }
  }

  // Nested by year > month of each entry's own createdAt (when it was
  // actually written) — same grouping structure Archive uses for shoots,
  // just keyed off the journal entry's date rather than a shoot's date.
  function renderJournal() {
    const tags = getAllUsedJournalTags();
    if (journalTagFilter !== 'all' && !tags.includes(journalTagFilter)) journalTagFilter = 'all';

    const filtersEl = document.getElementById('journalFilters');
    filtersEl.innerHTML = `<button class="chip${journalTagFilter === 'all' ? ' active' : ''}" data-tag="all">All</button>` +
      tags.map(t => `<button class="chip${journalTagFilter === t ? ' active' : ''}" data-tag="${escapeHtml(t)}">#${escapeHtml(t)}</button>`).join('');
    document.getElementById('journalFilterToggle').textContent = `Filter: ${journalTagFilter === 'all' ? 'All' : '#' + journalTagFilter}`;

    let items = [...state.journalEntries];
    if (journalTagFilter !== 'all') items = items.filter(e => (e.tags || []).includes(journalTagFilter));

    const list = document.getElementById('journalList');
    list.innerHTML = '';
    document.getElementById('journalEmpty').hidden = items.length !== 0;

    const years = new Map();
    items.forEach(e => {
      const year = e.createdAt ? e.createdAt.slice(0, 4) : 'Undated';
      const month = e.createdAt ? e.createdAt.slice(5, 7) : '00';
      if (!years.has(year)) years.set(year, new Map());
      const months = years.get(year);
      if (!months.has(month)) months.set(month, []);
      months.get(month).push(e);
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

      const yearCollapseKey = `journal:${year}`;
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
        // is pure redundancy, so just list the entries directly.
        sortedMonths.forEach(month => {
          months.get(month)
            .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
            .forEach(e => renderJournalEntryRow(yearRowsWrap, e));
        });
      } else {
        let visibleMonthIndex = 0;
        sortedMonths.forEach(month => {
          const monthGroupEl = document.createElement('div');
          monthGroupEl.className = 'archive-month-group';

          const monthCollapseKey = `journal:${year}:${month}`;
          const monthCollapsed = isSectionCollapsed(monthCollapseKey);
          const monthHeading = document.createElement('h3');
          monthHeading.className = `status-group-heading archive-month-heading ${visibleMonthIndex % 2 === 0 ? 'heading-yellow' : 'heading-navy'}${monthCollapsed ? ' collapsed' : ''}`;
          monthHeading.innerHTML = `${escapeHtml(monthLabel(month))}${COLLAPSE_ARROW_SVG}`;

          const monthRowsWrap = document.createElement('div');
          monthRowsWrap.className = 'shoot-status-rows';
          monthRowsWrap.hidden = monthCollapsed;
          months.get(month)
            .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
            .forEach(e => renderJournalEntryRow(monthRowsWrap, e));

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

  // ---------- Journal "Log" notebook (auto-generated weekly recap) ----------
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
        label: weekRangeLabel(w.start, w.end),
        shoots: w.shoots.slice().sort((a, b) => a.date.localeCompare(b.date)),
        // Keeps each takeaway tied to the shoot it came from (rather than a
        // flat list of strings) so tapping one can open that same shoot.
        takeaways: w.shoots.flatMap(s => (s.lessonsLearned || '').split('\n').map(t => t.trim()).filter(Boolean).map(text => ({ text, shootId: s.id }))),
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
  });

  document.getElementById('logShootRefOverlay').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) e.currentTarget.hidden = true;
  });

  function renderJournalLog() {
    const weeks = computeWeeklyLog();
    const list = document.getElementById('journalLogList');
    list.innerHTML = '';
    document.getElementById('journalLogEmpty').hidden = weeks.length !== 0;

    weeks.forEach((w, idx) => {
      const card = document.createElement('div');
      card.className = 'card log-card';
      const headingColorClass = idx % 2 === 0 ? 'heading-yellow' : 'heading-navy';
      const shootsHtml = w.shoots.map(s => `
        <li data-shoot-id="${s.id}">${escapeHtml(shootDisplayName(s))} <span class="log-shoot-category">(${escapeHtml(CATEGORY_LABELS[s.category] || 'Uncategorized')})</span></li>
      `).join('');
      const takeawaysHtml = w.takeaways.length
        ? `<ul class="log-takeaways">${w.takeaways.map(t => `<li data-shoot-id="${t.shootId}">${escapeHtml(t.text)}</li>`).join('')}</ul>`
        : `<p class="log-no-takeaways">No takeaways logged this week.</p>`;
      card.innerHTML = `
        <div class="card-body">
          <p class="log-week-heading ${headingColorClass}">${escapeHtml(w.label)}</p>
          <p class="log-section-label">Shoots this week</p>
          <ul class="log-shoots">${shootsHtml}</ul>
          <p class="log-section-label">Takeaways</p>
          ${takeawaysHtml}
        </div>
      `;
      card.querySelectorAll('.log-shoots li[data-shoot-id], .log-takeaways li[data-shoot-id]').forEach(li => {
        li.addEventListener('click', () => showLogShootRef(li.dataset.shootId));
      });
      list.appendChild(card);
    });
  }

  document.getElementById('journalFilterToggle').addEventListener('click', () => {
    const filters = document.getElementById('journalFilters');
    filters.hidden = !filters.hidden;
  });

  document.getElementById('journalFilters').addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (!chip) return;
    journalTagFilter = chip.dataset.tag;
    document.getElementById('journalFilters').hidden = true;
    renderJournal();
  });

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
    journalSaveTimer = setTimeout(autosaveJournal, 500);
  }

  document.getElementById('journalSubject').addEventListener('input', scheduleJournalAutosave);
  document.getElementById('journalBody').addEventListener('input', scheduleJournalAutosave);

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

  function openJournalModal(id) {
    const existing = id ? state.journalEntries.find(x => x.id === id) : null;
    journalIsNew = !existing;
    currentJournalEntry = existing || { id: uid(), title: '', body: '', tags: [], createdAt: todayStr() };
    setOpenJournalMarker(currentJournalEntry.id);
    journalHasImages = false;

    // A brand-new entry starts in edit mode (nothing to view yet); anything
    // already saved — including auto-compiled shoot reflections, which never
    // get their own edit mode here — opens read-only.
    if (journalIsNew) showJournalEditMode();
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
  // Visual Language and Lighting render as their own smaller, collapsible
  // subsections nested under Visuals (same visual language as Shot list).
  // Lighting setups (a static block, wired once below) isn't part of this
  // template — it's re-parented into the Lighting subsection's body after
  // every render instead, so its own listeners never need rewiring.
  function renderShootFrameworkTags(shoot) {
    const container = document.getElementById('frameworkTagsContainer');
    const lightingSetupsSection = document.getElementById('lightingSetupsSection');
    // Detach before wiping the container's contents below — innerHTML= would
    // otherwise discard this node for good once it's nested inside.
    if (lightingSetupsSection.parentNode) lightingSetupsSection.parentNode.removeChild(lightingSetupsSection);

    const selectedTags = shoot ? (shoot.frameworkTags || []) : [];
    container.innerHTML = state.frameworks.map(fw => {
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

    const lightingFw = state.frameworks.find(fw => fw.name === 'Lighting');
    const lightingBody = lightingFw ? container.querySelector(`.framework-subsection-body[data-fw-body="${lightingFw.id}"]`) : null;
    if (lightingBody) lightingBody.appendChild(lightingSetupsSection);
  }

  function syncShootFrameworkTags() {
    if (!shootModalOverlay.hidden) {
      const s = editingShootId ? state.shoots.find(x => x.id === editingShootId) : null;
      renderShootFrameworkTags(s);
    }
  }

  // Checking a tag auto-advances focus to the next checkbox so a run of
  // taps can march down the list without re-aiming each time.
  document.getElementById('frameworkTagsContainer').addEventListener('change', (e) => {
    if (e.target.type !== 'checkbox' || !e.target.checked) return;
    const all = [...document.querySelectorAll('#frameworkTagsContainer input[type="checkbox"]')];
    const next = all[all.indexOf(e.target) + 1];
    if (next) next.focus();
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

  // ---------- Talents (dynamic list of talent cards, right under Title) ----------
  // Each talent is its own outlined card (mirrors .team-member-card) with a
  // name field and its own nested social-handles sub-list, so a shoot with
  // multiple people in front of the camera can track each one separately.
  let currentTalents = [];

  function renderTalents() {
    const container = document.getElementById('talentsList');
    container.innerHTML = currentTalents.map((talent, idx) => `
      <div class="team-member-card">
        <button type="button" class="delete-talent" data-idx="${idx}">&times;</button>
        <input type="text" class="talent-name" data-idx="${idx}" placeholder="Talent name" value="${escapeHtml(talent.name || '')}" />
        <div class="talent-social-section">
          <p class="team-question talent-social-heading">Social media handle(s)</p>
          <div class="social-handles-list">
            ${(talent.socialHandles || []).map((sh, shIdx) => `
              <div class="social-handle-row">
                <select class="social-handle-platform" data-talent-idx="${idx}" data-handle-idx="${shIdx}">
                  ${SOCIAL_PLATFORM_OPTIONS.map(([val, label]) => `<option value="${val}" ${sh.platform === val ? 'selected' : ''}>${label}</option>`).join('')}
                </select>
                <input type="text" class="social-handle-input" data-talent-idx="${idx}" data-handle-idx="${shIdx}" placeholder="@handle" value="${escapeHtml(sh.handle || '')}" />
                <button type="button" class="delete-social-handle" data-talent-idx="${idx}" data-handle-idx="${shIdx}">&times;</button>
              </div>
            `).join('')}
          </div>
          <button type="button" class="primary small-btn add-talent-handle-btn" data-talent-idx="${idx}">+ Add handle</button>
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.delete-talent').forEach(btn => {
      btn.addEventListener('click', () => {
        currentTalents.splice(Number(btn.dataset.idx), 1);
        renderTalents();
        scheduleShootAutosave();
      });
    });
    container.querySelectorAll('.talent-name').forEach(input => {
      input.addEventListener('input', () => {
        currentTalents[Number(input.dataset.idx)].name = input.value;
      });
      input.addEventListener('blur', () => {
        const talent = currentTalents[Number(input.dataset.idx)];
        if (!talent || (talent.socialHandles || []).some(sh => hasText(sh.handle))) return;
        const matches = lookupContactHandles(talent.name);
        if (!matches.length) return;
        talent.socialHandles = matches;
        renderTalents();
        scheduleShootAutosave();
      });
    });
    container.querySelectorAll('.add-talent-handle-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        currentTalents[Number(btn.dataset.talentIdx)].socialHandles.push({ platform: 'instagram', handle: '' });
        renderTalents();
        scheduleShootAutosave();
      });
    });
    container.querySelectorAll('.social-handle-platform').forEach(sel => {
      sel.addEventListener('change', () => {
        currentTalents[Number(sel.dataset.talentIdx)].socialHandles[Number(sel.dataset.handleIdx)].platform = sel.value;
      });
    });
    container.querySelectorAll('.social-handle-input').forEach(input => {
      input.addEventListener('input', () => {
        currentTalents[Number(input.dataset.talentIdx)].socialHandles[Number(input.dataset.handleIdx)].handle = input.value;
      });
    });
    container.querySelectorAll('.delete-social-handle').forEach(btn => {
      btn.addEventListener('click', () => {
        currentTalents[Number(btn.dataset.talentIdx)].socialHandles.splice(Number(btn.dataset.handleIdx), 1);
        renderTalents();
        scheduleShootAutosave();
      });
    });
  }

  document.getElementById('addTalentBtn').addEventListener('click', () => {
    currentTalents.push({ name: '', socialHandles: [] });
    renderTalents();
    scheduleShootAutosave();
  });

  // ---------- Team members (dynamic list inside the shoot modal) ----------
  // Each member renders as its own outlined card — position, name, and
  // social handle stacked on their own line — rather than a single packed
  // row, so none of the three fields end up squeezed.
  let currentTeamMembers = [];

  function renderTeamMembers() {
    const container = document.getElementById('teamMembersList');
    container.innerHTML = currentTeamMembers.map((tm, idx) => `
      <div class="team-member-card">
        <button type="button" class="delete-team-member" data-idx="${idx}">&times;</button>
        <select class="team-member-role" data-idx="${idx}">
          ${TEAM_ROLE_OPTIONS.map(([val, label]) => `<option value="${val}" ${tm.role === val ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
        <input type="text" class="team-member-name" data-idx="${idx}" placeholder="Name" value="${escapeHtml(tm.name || '')}" />
        <div class="social-handle-row">
          <select class="social-handle-platform team-member-social-platform" data-idx="${idx}">
            ${SOCIAL_PLATFORM_OPTIONS.map(([val, label]) => `<option value="${val}" ${(tm.socialPlatform || 'instagram') === val ? 'selected' : ''}>${label}</option>`).join('')}
          </select>
          <input type="text" class="social-handle-input team-member-social" data-idx="${idx}" placeholder="Social media handle" value="${escapeHtml(tm.socialHandle || '')}" />
        </div>
      </div>
    `).join('');

    container.querySelectorAll('.team-member-role').forEach(sel => {
      sel.addEventListener('change', () => {
        currentTeamMembers[Number(sel.dataset.idx)].role = sel.value;
      });
    });
    container.querySelectorAll('.team-member-name').forEach(input => {
      input.addEventListener('input', () => {
        currentTeamMembers[Number(input.dataset.idx)].name = input.value;
      });
      input.addEventListener('blur', () => {
        const tm = currentTeamMembers[Number(input.dataset.idx)];
        if (!tm || hasText(tm.socialHandle)) return;
        const match = lookupBestContactHandle(tm.name);
        if (!match) return;
        tm.socialPlatform = match.platform;
        tm.socialHandle = match.handle;
        renderTeamMembers();
        scheduleShootAutosave();
      });
    });
    container.querySelectorAll('.team-member-social-platform').forEach(sel => {
      sel.addEventListener('change', () => {
        currentTeamMembers[Number(sel.dataset.idx)].socialPlatform = sel.value;
      });
    });
    container.querySelectorAll('.team-member-social').forEach(input => {
      input.addEventListener('input', () => {
        currentTeamMembers[Number(input.dataset.idx)].socialHandle = input.value;
      });
    });
    container.querySelectorAll('.delete-team-member').forEach(btn => {
      btn.addEventListener('click', () => {
        currentTeamMembers.splice(Number(btn.dataset.idx), 1);
        renderTeamMembers();
        scheduleShootAutosave();
      });
    });
  }

  document.getElementById('addTeamMemberBtn').addEventListener('click', () => {
    currentTeamMembers.push({ role: 'makeup_artist', name: '', socialPlatform: 'instagram', socialHandle: '' });
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

  function renderShotList(focusIdx) {
    const container = document.getElementById('shotListItems');
    const indexed = currentShotList.map((item, idx) => ({ ...item, idx }));
    const ordered = indexed.filter(i => !i.checked).concat(indexed.filter(i => i.checked));
    container.innerHTML = ordered.map(item => `
      <div class="shot-list-row${item.checked ? ' shot-checked' : ''}" data-idx="${item.idx}">
        <button type="button" class="shot-drag-handle" aria-label="Drag to reorder shot" tabindex="-1">&#8942;</button>
        <input type="checkbox" class="shot-check" data-idx="${item.idx}" ${item.checked ? 'checked' : ''} />
        <textarea class="shot-text" data-idx="${item.idx}" rows="2" placeholder="Describe the shot">${escapeHtml(item.text || '')}</textarea>
        <button type="button" class="delete-shot" data-idx="${item.idx}">&times;</button>
      </div>
    `).join('');

    container.querySelectorAll('.shot-check').forEach(cb => {
      cb.addEventListener('change', () => {
        currentShotList[Number(cb.dataset.idx)].checked = cb.checked;
        renderShotList();
        scheduleShootAutosave();
      });
    });
    container.querySelectorAll('.shot-text').forEach(textarea => {
      textarea.addEventListener('input', () => {
        currentShotList[Number(textarea.dataset.idx)].text = textarea.value;
        scheduleShootAutosave();
      });
      textarea.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        currentShotList[Number(textarea.dataset.idx)].text = textarea.value;
        currentShotList.push({ text: '', checked: false });
        renderShotList(currentShotList.length - 1);
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
      if (focusInput) focusInput.focus();
    }
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
        const rawRect = row.getBoundingClientRect();
        const layoutTop = rawRect.top - appliedTransform;
        const rowHeight = rawRect.height;
        const minDy = bucketTop - layoutTop;
        const maxDy = (bucketBottom - rowHeight) - layoutTop;
        const proposedDy = baseTranslateY + (ev.clientY - baseClientY);
        const dy = Math.min(maxDy, Math.max(minDy, proposedDy));

        row.style.transform = `translateY(${dy}px)`;
        appliedTransform = dy;

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
        if (!neighbor) return;

        const before = row.getBoundingClientRect();
        if (insertBeforeRow) container.insertBefore(row, neighbor);
        else container.insertBefore(neighbor, row);
        row.style.transform = 'none';
        const after = row.getBoundingClientRect();
        baseTranslateY = before.top - after.top;
        baseClientY = ev.clientY;
        row.style.transform = `translateY(${baseTranslateY}px)`;
        appliedTransform = baseTranslateY;
      }

      function onEnd() {
        handle.removeEventListener('pointermove', onMove);
        handle.removeEventListener('pointerup', onEnd);
        handle.removeEventListener('pointercancel', onEnd);
        row.classList.remove('shot-dragging');
        row.style.transform = '';
        const rows = Array.from(container.querySelectorAll('.shot-list-row'));
        currentShotList = rows.map(r => currentShotList[Number(r.dataset.idx)]);
        renderShotList();
        scheduleShootAutosave();
      }

      handle.addEventListener('pointermove', onMove);
      handle.addEventListener('pointerup', onEnd);
      handle.addEventListener('pointercancel', onEnd);
    });
  }

  document.getElementById('addShotBtn').addEventListener('click', () => {
    currentShotList.push({ text: '', checked: false });
    renderShotList(currentShotList.length - 1);
    scheduleShootAutosave();
  });

  // ---------- Lighting setups (checklist nested under Lighting, in Visuals) ----------
  // Same structure and behavior as the Shot list above, just its own array
  // and container so the two lists don't interfere with each other.
  let currentLightingSetups = [];

  function renderLightingSetups(focusIdx) {
    const container = document.getElementById('lightingSetupsItems');
    const indexed = currentLightingSetups.map((item, idx) => ({ ...item, idx }));
    const ordered = indexed.filter(i => !i.checked).concat(indexed.filter(i => i.checked));
    container.innerHTML = ordered.map(item => `
      <div class="shot-list-row${item.checked ? ' shot-checked' : ''}">
        <input type="checkbox" class="shot-check" data-idx="${item.idx}" ${item.checked ? 'checked' : ''} />
        <textarea class="shot-text" data-idx="${item.idx}" rows="2" placeholder="Describe the lighting setup">${escapeHtml(item.text || '')}</textarea>
        <button type="button" class="delete-shot" data-idx="${item.idx}">&times;</button>
      </div>
    `).join('');

    container.querySelectorAll('.shot-check').forEach(cb => {
      cb.addEventListener('change', () => {
        currentLightingSetups[Number(cb.dataset.idx)].checked = cb.checked;
        renderLightingSetups();
        scheduleShootAutosave();
      });
    });
    container.querySelectorAll('.shot-text').forEach(textarea => {
      textarea.addEventListener('input', () => {
        currentLightingSetups[Number(textarea.dataset.idx)].text = textarea.value;
        scheduleShootAutosave();
      });
      textarea.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        currentLightingSetups[Number(textarea.dataset.idx)].text = textarea.value;
        currentLightingSetups.push({ text: '', checked: false });
        renderLightingSetups(currentLightingSetups.length - 1);
        scheduleShootAutosave();
      });
    });
    container.querySelectorAll('.delete-shot').forEach(btn => {
      btn.addEventListener('click', () => {
        currentLightingSetups.splice(Number(btn.dataset.idx), 1);
        renderLightingSetups();
        scheduleShootAutosave();
      });
    });

    if (focusIdx !== undefined) {
      const focusInput = container.querySelector(`.shot-text[data-idx="${focusIdx}"]`);
      if (focusInput) focusInput.focus();
    }
  }

  document.getElementById('addLightingSetupBtn').addEventListener('click', () => {
    currentLightingSetups.push({ text: '', checked: false });
    renderLightingSetups(currentLightingSetups.length - 1);
    scheduleShootAutosave();
  });

  // ---------- Location (popup with name/street/city/zip/country + past locations) ----------
  let currentShootLocation = { name: '', street: '', city: '', zip: '', country: '' };
  let pastLocationSamples = [];

  function updateLocationBtnDisplay() {
    const btn = document.getElementById('shootLocationBtn');
    const display = formatLocationDisplay(currentShootLocation);
    btn.textContent = display || 'Tap to add location';
    btn.classList.toggle('has-value', !!display);
  }

  // Most-selected locations first (a repeatedly-booked studio should surface
  // above somewhere you've only shot once) — ties broken alphabetically so
  // the order stays stable rather than reflecting shoot-creation order.
  function getAllPastLocations() {
    const counts = {};
    const samples = {};
    state.shoots.forEach(s => {
      if (isLocationBlank(s.location)) return;
      const key = locationKey(s.location);
      counts[key] = (counts[key] || 0) + 1;
      samples[key] = s.location;
    });
    return Object.keys(counts)
      .sort((a, b) => counts[b] - counts[a] || formatLocationDisplay(samples[a]).localeCompare(formatLocationDisplay(samples[b])))
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
    document.getElementById('locationZipInput').value = loc.zip || '';
    document.getElementById('locationCountryInput').value = loc.country || '';
  }

  function openLocationModal() {
    fillLocationForm(currentShootLocation);
    pastLocationSamples = getAllPastLocations();
    const select = document.getElementById('pastLocationsSelect');
    select.innerHTML = '<option value="">Select a past location…</option>'
      + pastLocationSamples.map((loc, i) => `<option value="${i}">${escapeHtml(formatLocationDisplay(loc))}</option>`).join('');
    document.getElementById('locationModalOverlay').hidden = false;
  }

  document.getElementById('shootLocationBtn').addEventListener('click', openLocationModal);

  document.getElementById('pastLocationsSelect').addEventListener('change', (e) => {
    if (e.target.value === '') return;
    const loc = pastLocationSamples[Number(e.target.value)];
    if (loc) fillLocationForm(loc);
  });

  document.getElementById('saveLocationBtn').addEventListener('click', () => {
    const newLocation = {
      name: document.getElementById('locationNameInput').value.trim(),
      street: document.getElementById('locationStreetInput').value.trim(),
      city: document.getElementById('locationCityInput').value.trim(),
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

  // ---------- References (dynamic list of external links) ----------
  let currentReferences = [];

  function renderReferences() {
    const container = document.getElementById('referencesList');
    container.innerHTML = currentReferences.map((url, idx) => `
      <div class="reference-row">
        <input type="text" class="reference-input" data-idx="${idx}" value="${escapeHtml(url)}" placeholder="https://…" />
        <button type="button" class="reference-open" data-idx="${idx}" aria-label="Open link">&#8599;</button>
        <button type="button" class="delete-reference" data-idx="${idx}">&times;</button>
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
  }

  document.getElementById('addReferenceBtn').addEventListener('click', () => {
    currentReferences.push('');
    renderReferences();
    scheduleShootAutosave();
  });

  // ---------- Time range (default end time to 2h after start) ----------
  document.getElementById('shootStartTime').addEventListener('change', () => {
    const startInput = document.getElementById('shootStartTime');
    const endInput = document.getElementById('shootEndTime');
    if (!startInput.value) return;
    const [h, m] = startInput.value.split(':').map(Number);
    const endH = (h + 2) % 24;
    endInput.value = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  });

  // ---------- Tiered concept fields (narrative vs commercial categories) ----------
  const COMMERCIAL_TIER_CATEGORIES = ['commercial', 'video', 'lighting_test', 'headshot', 'event'];

  function updateCategoryTierUI() {
    const isCommercialTier = COMMERCIAL_TIER_CATEGORIES.includes(document.getElementById('shootCategory').value);
    document.getElementById('narrativeFieldsBlock').hidden = isCommercialTier;
    document.getElementById('commercialFieldsBlock').hidden = !isCommercialTier;
    document.getElementById('shootPremiseLabelText').textContent = isCommercialTier ? 'Concept (if applicable)' : 'Concept';
  }

  document.getElementById('shootCategory').addEventListener('change', updateCategoryTierUI);

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
    ['shoot:direction', '#directionHeading', 'directionBody'],
    ['shoot:visuals', '#visualsHeading', 'visualsBody'],
    ['shoot:lightingSetups', '#lightingSetupsHeading', 'lightingSetupsBody'],
    ['shoot:team', '#teamHeading', 'teamBody'],
    ['shoot:shootDayNotes', '#shootDayNotesHeading', 'shootDayNotesBody'],
    ['shoot:shotList', '#shotListHeading', 'shotListBody'],
    ['shoot:postShoot', '#postShootHeading', 'postShootBody'],
  ];

  function applyShootFormCollapseState() {
    SHOOT_FORM_COLLAPSE_SECTIONS.forEach(([key, headingSelector, bodyId]) => {
      const heading = document.querySelector(headingSelector);
      const body = document.getElementById(bodyId);
      const collapsed = isSectionCollapsed(key);
      body.hidden = collapsed;
      heading.classList.toggle('collapsed', collapsed);
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
    });
  });

  // ---------- Expand field (every notes-style textarea in the shoot form) ----------
  // These fields are readonly on the small form; tapping one opens a bigger
  // writing surface in a modal instead of typing directly in the compressed box.
  const EXPAND_FIELD_LABELS = {
    shootCharacter: 'Character/Personality',
    shootWorldNotes: 'World-building notes',
    shootGoals: 'Shoot goals',
    shootGeneralNotes: 'General direction notes',
    shootElevatorPitch: 'Elevator pitch',
    shootWentRight: 'What went right',
    shootCouldBeBetter: "What could've gone better",
    shootLessonsLearned: 'Lessons for next time',
    shootTalentDirections: 'Directions for talent',
    shootTeamDirections: 'Directions for team',
    shootLocationDirections: 'Location directions',
  };
  let expandFieldTargetId = null;

  function expandFieldLabel(fieldId) {
    if (fieldId === 'shootPremise') return document.getElementById('shootPremiseLabelText').textContent;
    return EXPAND_FIELD_LABELS[fieldId] || '';
  }

  function openExpandField(fieldId) {
    const field = document.getElementById(fieldId);
    expandFieldTargetId = fieldId;
    document.getElementById('expandFieldTitle').textContent = expandFieldLabel(fieldId);
    const textarea = document.getElementById('expandFieldTextarea');
    textarea.value = field.value;
    textarea.maxLength = field.maxLength;
    textarea.placeholder = field.placeholder;
    document.getElementById('expandFieldOverlay').hidden = false;
    textarea.focus();
  }

  function closeExpandField() {
    document.getElementById('expandFieldOverlay').hidden = true;
    expandFieldTargetId = null;
  }

  document.getElementById('expandFieldTextarea').addEventListener('input', () => {
    if (!expandFieldTargetId) return;
    const field = document.getElementById(expandFieldTargetId);
    field.value = document.getElementById('expandFieldTextarea').value;
    field.dispatchEvent(new Event('input', { bubbles: true }));
  });

  document.getElementById('expandFieldCloseBtn').addEventListener('click', closeExpandField);
  document.getElementById('expandFieldOkBtn').addEventListener('click', closeExpandField);
  document.getElementById('expandFieldOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('expandFieldOverlay')) closeExpandField();
  });

  [
    'shootPremise', 'shootCharacter', 'shootWorldNotes', 'shootGoals',
    'shootGeneralNotes', 'shootElevatorPitch',
    'shootWentRight', 'shootCouldBeBetter', 'shootLessonsLearned',
    'shootTalentDirections', 'shootTeamDirections', 'shootLocationDirections',
  ].forEach(fieldId => {
    document.getElementById(fieldId).addEventListener('click', () => openExpandField(fieldId));
  });

  // ---------- Post-shoot reflection (gated behind captured-or-later status) ----------
  let previousStatusValue = 'idea_phase';

  function isPostCaptureStatus(status) {
    // Rescheduled/canceled are an off-track branch, not a step further along
    // the capture pipeline, regardless of where they sit in STATUS_LABELS.
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

  // ---------- Add deadline prompt (shown once a shoot moves into "editing"
  // without a deadline set yet — chained after the post-shoot reflection
  // prompt when both apply, e.g. a shoot logged retroactively straight into
  // "editing", so the two never show stacked on top of each other). ----------
  function openDeadlinePrompt() {
    document.getElementById('deadlinePromptDateInput').value = '';
    document.getElementById('deadlinePromptOverlay').hidden = false;
  }

  function maybeOpenDeadlinePrompt() {
    if (document.getElementById('shootStatus').value === 'editing' && !hasText(document.getElementById('shootDeadline').value)) {
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

  document.getElementById('shootStatus').addEventListener('change', (e) => {
    const newValue = e.target.value;

    // Rescheduled/canceled shoots no longer have a date to keep — clear it
    // in the form itself so the very next autosave doesn't resurrect it.
    if (newValue === 'rescheduled' || newValue === 'canceled') {
      document.getElementById('shootDate').value = '';
      document.getElementById('shootStartTime').value = '';
      document.getElementById('shootEndTime').value = '';
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
      previousStatusValue = newValue;
      if (newValue === 'editing') maybeOpenDeadlinePrompt();
    }

    const isArchived = !document.getElementById('unarchiveShootBtn').hidden;
    document.getElementById('completeShootBtn').hidden = !editingShootId || isArchived || document.getElementById('shootStatus').value !== 'delivered';
    updateMoodboardCompleteVisibility();
    updateStatusSwatchDisplay();
  });

  function updateMoodboardCompleteLabel() {
    const checked = document.getElementById('shootMoodboardComplete').checked;
    document.getElementById('moodboardCompleteLabel').textContent = checked ? 'Mood board complete' : 'Mood board complete?';
  }

  // Past capture, the mood board is moot — hide the checkbox entirely rather
  // than let it keep tracking a value nobody's looking at anymore. The value
  // itself is never touched here, so reverting to an earlier status brings
  // the row (and whatever it was actually set to) right back.
  function updateMoodboardCompleteVisibility() {
    document.getElementById('moodboardCompleteRow').hidden = isPostCaptureStatus(document.getElementById('shootStatus').value);
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

  // Shared by the scroll-position-restore anchors below, the jump menu, and
  // the scrollspy title — the one canonical list of top-level sections in
  // the form, in on-page order.
  const SHOOT_MODAL_SECTIONS = [
    { id: 'basicInfoHeading', label: 'Basic Info' },
    { id: 'logisticsHeading', label: 'Logistics' },
    { id: 'directionHeading', label: 'Direction' },
    { id: 'visualsHeading', label: 'Visuals' },
    { id: 'teamHeading', label: 'Team' },
    { id: 'shootDayNotesHeading', label: 'Shoot day' },
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
    const target = document.getElementById(item.dataset.jump);
    closeShootModalJumpMenu();
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
    { id: 'directionHeading', title: 'Direction', text: "Concept, character, and creative direction — the story you're telling." },
    { id: 'visualsHeading', title: 'Visuals', text: 'Mood board, references, and frameworks — the visual language for the shoot.', nestedIds: ['lightingSetupsHeading'] },
    { id: 'teamHeading', title: 'Team', text: "Who's on the shoot and how to reach them." },
    { id: 'shootDayNotesHeading', title: 'Shoot day', text: 'Shot list, lighting setups, and any day-of notes.', nestedIds: ['shotListHeading'] },
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
  }

  function renderShootTourStep() {
    const step = SHOOT_TOUR_STEPS[shootTourStepIndex];
    document.getElementById('shootTourStep').textContent = `Step ${shootTourStepIndex + 1} of ${SHOOT_TOUR_STEPS.length}`;
    document.getElementById('shootTourTitle').textContent = step.title;
    document.getElementById('shootTourText').textContent = step.text;
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
    closeStatsDetail();
    editingShootId = id;
    const s = id ? state.shoots.find(x => x.id === id) : null;
    currentShootId = id || uid();
    pendingProjectPhoto = s ? (s.projectPhoto || null) : null;
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
    document.getElementById('shootStatus').value = s ? (s.status || 'idea_phase') : 'idea_phase';
    previousStatusValue = document.getElementById('shootStatus').value;
    updateStatusSwatchDisplay();
    document.getElementById('shootDate').value = s ? (s.date || '') : '';
    document.getElementById('shootDeadline').value = s ? (s.deadline || '') : '';
    document.getElementById('shootStartTime').value = s ? (s.startTime || '') : '';
    document.getElementById('shootEndTime').value = s ? (s.endTime || '') : '';
    currentShootLocation = s ? normalizeLocation(s.location) : { name: '', street: '', city: '', zip: '', country: state.defaultCountry || '' };
    updateLocationBtnDisplay();
    currentTalents = s && Array.isArray(s.talents)
      ? s.talents.map(t => ({ name: t.name || '', socialHandles: (t.socialHandles || []).map(sh => ({ ...sh })) }))
      : [];
    renderTalents();
    document.getElementById('shootCategory').value = s ? (s.category || '') : '';
    updateCategoryTierUI();
    document.getElementById('shootPremise').value = s ? (s.premise || '') : '';
    document.getElementById('shootCharacter').value = s ? (s.character || '') : '';
    document.getElementById('shootWorldNotes').value = s ? (s.worldNotes || '') : '';
    document.getElementById('shootGoals').value = s ? (s.shootGoals || '') : '';
    document.getElementById('shootElevatorPitch').value = s ? (s.elevatorPitch || '') : '';
    initProgressiveReveal(s);
    document.getElementById('shootMoodboardComplete').checked = s ? !!s.moodboardComplete : false;
    updateMoodboardCompleteLabel();
    updateMoodboardCompleteVisibility();
    currentReferences = s && Array.isArray(s.references) ? [...s.references] : [];
    renderReferences();
    document.getElementById('shootGeneralNotes').value = s ? (s.generalNotes || '') : '';
    document.getElementById('shootWentRight').value = s ? (s.whatWentRight || '') : '';
    document.getElementById('shootCouldBeBetter').value = s ? (s.couldBeBetter || '') : '';
    document.getElementById('shootLessonsLearned').value = s ? (s.lessonsLearned || '') : '';
    document.getElementById('shootTalentDirections').value = s ? (s.talentDirections || '') : '';
    document.getElementById('shootTeamDirections').value = s ? (s.teamDirections || '') : '';
    document.getElementById('shootLocationDirections').value = s ? (s.locationDirections || '') : '';
    currentShotList = s && Array.isArray(s.shotList) ? s.shotList.map(item => ({ ...item })) : [];
    renderShotList();
    currentLightingSetups = s && Array.isArray(s.lightingSetups) ? s.lightingSetups.map(item => ({ ...item })) : [];
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
    shootModalOverlay.hidden = false;
    if (!s) maybeShowStatusSwatchIntro();

    const modalEl = shootModalOverlay.querySelector('.modal');
    const savedScroll = (id && shootScrollPositions[id]) || 0;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        modalEl.scrollTop = snapScrollTarget(savedScroll, modalEl);
        updateShootModalTitleFromScroll();
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
            <button type="button" class="moodboard-thumb-delete" data-idx="${idx}">&times;</button>
          </div>
        `;
        grid.appendChild(item);
      });
      grid.querySelectorAll('.moodboard-thumb-delete').forEach(btn => {
        btn.addEventListener('click', () => {
          idbGetImages(currentShootId).then(imgs => {
            imgs.splice(Number(btn.dataset.idx), 1);
            return idbSetImages(currentShootId, imgs);
          }).then(renderMoodboard);
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
    Promise.all(files.map(f => resizeImageFile(f, 1280, 0.72)))
      .then(newImages => idbGetImages(currentShootId).then(existing => {
        const shouldAutoSetProjectPhoto = existing.length === 0 && !pendingProjectPhoto && newImages.length > 0;
        const combined = existing.concat(newImages.map(src => ({ src, caption: '' })));
        return idbSetImages(currentShootId, combined).then(() => {
          if (shouldAutoSetProjectPhoto) {
            return resizeDataUrlThumb(newImages[0], 200, 0.6).then(thumb => {
              pendingProjectPhoto = thumb;
            });
          }
        });
      }))
      .then(() => {
        shootHasImages = true;
        scheduleShootAutosave();
        renderMoodboard();
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
    imageViewerAddCaptionBtn.hidden = false;
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
  }

  function showViewerImage(idx) {
    if (idx < 0 || idx >= viewerImages.length || idx === viewerIndex) return;
    if (!imageViewerCaptionInput.hidden) saveViewerCaption(imageViewerCaptionInput.value.trim());
    viewerIndex = idx;
    imageViewerImg.src = viewerImages[idx].src;
    renderViewerCaption();
  }

  function saveViewerCaption(newCaption) {
    idbGetImages(viewerStorageKey).then(imgs => {
      if (imgs[viewerIndex]) imgs[viewerIndex].caption = newCaption;
      viewerImages = imgs;
      return idbSetImages(viewerStorageKey, imgs);
    }).then(() => {
      renderViewerCaption();
      if (viewerOnUpdate) viewerOnUpdate();
    });
  }

  function closeImageViewer() {
    if (!imageViewerCaptionInput.hidden) saveViewerCaption(imageViewerCaptionInput.value.trim());
    imageViewerOverlay.hidden = true;
    imageViewerMenu.hidden = true;
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
    idbGetImages(viewerStorageKey).then(imgs => {
      imgs.splice(deletedIndex, 1);
      return idbSetImages(viewerStorageKey, imgs).then(() => imgs);
    }).then(imgs => {
      viewerImages = imgs;
      if (viewerOnUpdate) viewerOnUpdate();
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

  function openProjectPhotoCrop(src) {
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
    // Output at the same 31:44 ratio as the crop stage (and the shoot
    // bubble thumbnail), just at a higher resolution than the on-screen box.
    const outputWidth = 124;
    const outputHeight = 176;
    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    canvas.getContext('2d').drawImage(cropImg, sx, sy, sWidth, sHeight, 0, 0, outputWidth, outputHeight);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
    const targetId = cropTargetShootId;
    if (targetId) {
      const idx = state.shoots.findIndex(x => x.id === targetId);
      if (idx !== -1) {
        state.shoots[idx] = { ...state.shoots[idx], projectPhoto: dataUrl };
        saveState();
        renderAll();
      }
      closeProjectPhotoCrop();
      closeShootOptions();
    } else {
      pendingProjectPhoto = dataUrl;
      scheduleShootAutosave();
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
        thumb.innerHTML = `<img src="${img.src}" alt="" data-idx="${idx}" /><button type="button" class="final-thumb-delete" data-idx="${idx}">&times;</button>`;
        grid.appendChild(thumb);
      });
      grid.querySelectorAll('.final-thumb-delete').forEach(btn => {
        btn.addEventListener('click', () => {
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
    Promise.all(files.map(f => resizeImageFile(f, 1280, 0.72)))
      .then(newImages => idbGetImages(finalImagesKey(currentShootId)).then(existing => {
        const shouldSetCover = existing.length === 0 && newImages.length > 0;
        const combined = existing.concat(newImages.map(src => ({ src, caption: '' })));
        return idbSetImages(finalImagesKey(currentShootId), combined).then(() => {
          if (shouldSetCover) {
            return resizeDataUrlThumb(newImages[0], 200, 0.6).then(thumb => {
              pendingProjectPhoto = thumb;
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
    const frameworkTags = [...document.querySelectorAll('#frameworkTagsContainer input[type="checkbox"]:checked')]
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
      location: { ...currentShootLocation },
      talents: currentTalents.map(t => ({ name: t.name.trim(), socialHandles: [...t.socialHandles] })),
      category: document.getElementById('shootCategory').value,
      premise: document.getElementById('shootPremise').value.trim(),
      character: document.getElementById('shootCharacter').value.trim(),
      shootGoals: document.getElementById('shootGoals').value.trim(),
      elevatorPitch: document.getElementById('shootElevatorPitch').value.trim(),
      worldNotes: document.getElementById('shootWorldNotes').value.trim(),
      moodboardComplete: document.getElementById('shootMoodboardComplete').checked,
      teamRequired,
      teamFinalized: document.getElementById('shootTeamFinalized').checked,
      teamMembers: teamRequired === 'yes' ? [...currentTeamMembers] : [],
      references: currentReferences.map(r => r.trim()).filter(r => r),
      frameworkTags,
      generalNotes: document.getElementById('shootGeneralNotes').value.trim(),
      whatWentRight: document.getElementById('shootWentRight').value.trim(),
      couldBeBetter: document.getElementById('shootCouldBeBetter').value.trim(),
      lessonsLearned: document.getElementById('shootLessonsLearned').value.trim(),
      talentDirections: document.getElementById('shootTalentDirections').value.trim(),
      teamDirections: document.getElementById('shootTeamDirections').value.trim(),
      locationDirections: document.getElementById('shootLocationDirections').value.trim(),
      shotList: [...currentShotList],
      lightingSetups: [...currentLightingSetups],
      projectPhoto: pendingProjectPhoto,
    };
  }

  // A brand-new, never-touched shoot draft shouldn't get written to state
  // just because the modal was opened — only once it actually has content.
  function isShootDataBlank(data) {
    // The country field pre-fills itself from state.defaultCountry on every
    // brand-new shoot draft, so it can't count as "the user entered
    // something" here or every untouched New Shoot would silently save.
    const loc = data.location;
    const locationEffectivelyBlank = !hasText(loc.name) && !hasText(loc.street) && !hasText(loc.city) && !hasText(loc.zip);
    return !hasText(data.title) && locationEffectivelyBlank && !hasText(data.startTime) && !hasText(data.endTime) && data.talents.every(t => !hasText(t.name) && t.socialHandles.length === 0) && !hasText(data.premise) && !hasText(data.character) && !hasText(data.shootGoals) && !hasText(data.elevatorPitch)
      && !hasText(data.worldNotes) && !hasText(data.generalNotes) && !hasText(data.deadline)
      && !hasText(data.whatWentRight) && !hasText(data.couldBeBetter) && !hasText(data.lessonsLearned)
      && !hasText(data.talentDirections) && !hasText(data.teamDirections) && !hasText(data.locationDirections) && data.shotList.length === 0
      && data.lightingSetups.length === 0
      && data.frameworkTags.length === 0 && data.references.length === 0
      && data.teamMembers.length === 0 && !data.moodboardComplete && !data.teamRequired && !data.teamFinalized
      && !data.projectPhoto;
  }

  // Records the first time a shoot reaches "captured" and "editing" so the
  // daily report can compute "N days since capture" / "N days since editing".
  // Never overwrites an already-set timestamp, even if status bounces back
  // and forth, so it always reflects the first time each milestone was hit.
  function applyStatusTimestamps(shoot, oldStatus, newStatus) {
    if (oldStatus === newStatus) return;
    if (isPostCaptureStatus(newStatus) && !shoot.capturedAt) {
      shoot.capturedAt = new Date().toISOString();
    }
    if (newStatus === 'editing' && !shoot.editingAt) {
      shoot.editingAt = new Date().toISOString();
    }
  }

  function autosaveShoot() {
    const data = gatherShootFormData();
    const idx = state.shoots.findIndex(x => x.id === currentShootId);
    let shoot;
    if (idx === -1) {
      if (isShootDataBlank(data) && !shootHasImages) return;
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
    syncPostShootJournalEntry(shoot);
    saveState();
  }

  function scheduleShootAutosave() {
    clearTimeout(shootSaveTimer);
    shootSaveTimer = setTimeout(autosaveShoot, 500);
  }

  shootForm.addEventListener('input', scheduleShootAutosave);
  shootForm.addEventListener('change', scheduleShootAutosave);
  shootForm.addEventListener('submit', (e) => e.preventDefault());

  function closeShootModal() {
    if (currentShootId) {
      shootScrollPositions[currentShootId] = shootModalOverlay.querySelector('.modal').scrollTop;
    }
    clearTimeout(shootSaveTimer);
    autosaveShoot();
    if (!state.shoots.some(x => x.id === currentShootId)) {
      idbDeleteImages(currentShootId).catch(() => {});
      idbDeleteImages(finalImagesKey(currentShootId)).catch(() => {});
    }
    shootModalOverlay.hidden = true;
    editingShootId = null;
    renderAll();
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
    state.shoots = state.shoots.filter(x => x.id !== id);
    state.journalEntries = state.journalEntries.filter(e => e.sourceShootId !== id);
    idbDeleteImages(id).catch(() => {});
    idbDeleteImages(finalImagesKey(id)).catch(() => {});
    saveState();
  }

  document.getElementById('deleteShootBtn').addEventListener('click', () => {
    if (!confirm('Delete this shoot? This can\'t be undone.')) return;
    clearTimeout(shootSaveTimer);
    deleteShootById(currentShootId);
    shootModalOverlay.hidden = true;
    editingShootId = null;
    renderAll();
  });

  document.getElementById('shareShootBtn').addEventListener('click', () => {
    if (editingShootId) openPdfSectionsModal(editingShootId);
  });

  // ---------- Shoot options (row/card kebab menu) ----------
  const shootOptionsOverlay = document.getElementById('shootOptionsOverlay');
  const shootOptionsPaneTrack = document.getElementById('shootOptionsPaneTrack');
  let optionsShootId = null;

  function openShootOptions(id) {
    optionsShootId = id;
    const s = state.shoots.find(x => x.id === id);
    document.getElementById('archiveShootOptionBtn').textContent = (s && s.archived) ? 'Unarchive shoot' : 'Archive shoot';
    // The pane track slides via CSS transform, not native scrolling — reset
    // any stray scroll position (e.g. from a focused input the browser tried
    // to "reveal") so it can't stack with the transform and misalign panes.
    shootOptionsOverlay.querySelector('.modal').scrollLeft = 0;
    shootOptionsOverlay.hidden = false;
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
    focusPaneInput(input);
  });

  document.getElementById('titleOptionsBackBtn').addEventListener('click', () => {
    shootOptionsPaneTrack.classList.remove('show-third');
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
    if (!id) return;
    Promise.all([idbGetImages(id), idbGetImages(finalImagesKey(id))]).then(([moodboardImages, finalImages]) => {
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
    }).catch(() => { grid.innerHTML = ''; });
  });

  document.getElementById('projectPhotoBackBtn').addEventListener('click', () => {
    shootOptionsPaneTrack.classList.remove('show-fourth');
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
    focusPaneInput(input);
  });

  document.getElementById('deadlineOptionsBackBtn').addEventListener('click', () => {
    shootOptionsPaneTrack.classList.remove('show-fifth');
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
  function renderStatusOptionsList(currentStatus) {
    const list = document.getElementById('statusOptionsList');
    list.innerHTML = Object.entries(STATUS_LABELS).map(([key, label]) => `
      <button type="button" class="options-item choice-item${key === currentStatus ? ' active' : ''}" data-status="${key}">${escapeHtml(label)}</button>
    `).join('');
  }

  function applyStatusChange(shootId, newStatus) {
    const idx = state.shoots.findIndex(x => x.id === shootId);
    if (idx === -1) return;
    const shoot = { ...state.shoots[idx] };
    const oldStatus = shoot.status || 'idea_phase';
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
    }
    state.shoots[idx] = shoot;
    syncPostShootJournalEntry(shoot);
    saveState();
    renderAll();
  }

  document.getElementById('changeStatusOptionBtn').addEventListener('click', () => {
    const s = state.shoots.find(x => x.id === optionsShootId);
    renderStatusOptionsList(s ? (s.status || 'idea_phase') : 'idea_phase');
    shootOptionsPaneTrack.classList.add('show-second');
  });

  document.getElementById('statusOptionsBackBtn').addEventListener('click', () => {
    shootOptionsPaneTrack.classList.remove('show-second');
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
  });

  document.getElementById('deleteShootOptionBtn').addEventListener('click', () => {
    const id = optionsShootId;
    closeShootOptions();
    if (!id) return;
    if (!confirm('Delete this shoot? This can\'t be undone.')) return;
    if (id === currentShootId && !shootModalOverlay.hidden) {
      clearTimeout(shootSaveTimer);
      shootModalOverlay.hidden = true;
      editingShootId = null;
    }
    deleteShootById(id);
    renderAll();
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

  // Draws "label" in bold immediately followed by "value" in normal weight
  // on the same line, wrapping the value across further lines (flush left,
  // normal weight) if it's too long to fit next to the label. Returns the y
  // position just past whatever it drew, for the caller to continue from.
  function drawLabeledPdfLine(doc, label, value, x, y, maxWidth, lineHeight) {
    doc.setFont('courier', 'bold');
    doc.text(label, x, y);
    const labelWidth = doc.getTextWidth(label);
    doc.setFont('courier', 'normal');
    const lines = doc.splitTextToSize(value, Math.max(10, maxWidth - labelWidth));
    if (!lines.length) return y;
    doc.text(lines[0], x + labelWidth, y);
    for (let i = 1; i < lines.length; i++) {
      doc.text(lines[i], x, y + lineHeight * i);
    }
    return y + lineHeight * lines.length;
  }

  async function buildShootPdf(s, chosenSections) {
    const sections = chosenSections || { talent: true, details: true, references: true, team: true, moodboard: true };
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

    const talentsWithContent = (s.talents || []).filter(t => hasText(t.name));
    if (talentsWithContent.length && sections.talent) {
      talentsWithContent.forEach(talent => {
        doc.setTextColor(...navy);
        doc.setFont('courier', 'bold');
        doc.setFontSize(18);
        doc.text(`Talent: ${talent.name}`, margin, y);
        y += 24;
        const handles = (talent.socialHandles || []).filter(sh => hasText(sh.handle));
        if (handles.length) {
          doc.setFont('courier', 'normal');
          doc.setFontSize(11);
          handles.forEach(sh => {
            const platformEntry = SOCIAL_PLATFORM_OPTIONS.find(([val]) => val === sh.platform);
            const platformLabel = platformEntry ? platformEntry[1] : 'Other';
            doc.text(`${platformLabel}: ${sh.handle}`, margin, y);
            y += 15;
          });
        }
        y += 10;
      });
    }

    const timeRange = shootTimeRange(s);
    const locationDisplay = formatLocationDisplay(s.location);
    if ((s.date || timeRange || locationDisplay) && sections.details) {
      doc.setTextColor(...navy);
      doc.setFont('courier', 'bold');
      doc.setFontSize(18);
      doc.text('Details:', margin, y);
      y += 24;
      doc.setFontSize(11);
      const detailsMaxWidth = pageWidth - margin * 2;
      if (s.date) { y = drawLabeledPdfLine(doc, 'Date: ', prettyDate(s.date), margin, y, detailsMaxWidth, 16); }
      if (timeRange) { y = drawLabeledPdfLine(doc, 'Time: ', timeRange, margin, y, detailsMaxWidth, 16); }
      if (locationDisplay) { y = drawLabeledPdfLine(doc, 'Location: ', locationDisplay, margin, y, detailsMaxWidth, 14) + 2; }
      if (hasText(s.locationDirections)) { y = drawLabeledPdfLine(doc, 'Location instructions: ', s.locationDirections, margin, y, detailsMaxWidth, 14) + 2; }
      y += 8;
    }

    const refs = (s.references || []).map(r => r.trim()).filter(Boolean);
    if (refs.length && sections.references) {
      doc.setFont('courier', 'bold');
      doc.setFontSize(18);
      doc.text('References:', margin, y);
      y += 24;
      doc.setFont('courier', 'normal');
      doc.setFontSize(11);
      refs.forEach(r => {
        doc.text(`• ${r}`, margin, y, { maxWidth: pageWidth - margin * 2 });
        y += 15;
      });
      y += 10;
    }

    const team = s.teamRequired === 'yes' ? (s.teamMembers || []) : [];
    if (team.length && sections.team) {
      doc.setFont('courier', 'bold');
      doc.setFontSize(18);
      doc.text('Team:', margin, y);
      y += 24;
      doc.setFont('courier', 'normal');
      doc.setFontSize(11);
      team.forEach(tm => {
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
      if (y > pageHeight - margin - 220) { doc.addPage(); y = margin; }
      doc.setFont('courier', 'bold');
      doc.setFontSize(18);
      doc.text('Mood board:', margin, y);
      y += 24;

      const cols = 2;
      const gap = 12;
      const cellW = (pageWidth - margin * 2 - gap) / cols;

      let idx = 0;
      let firstPage = true;
      while (idx < images.length) {
        const maxOnThisPage = firstPage ? 2 : 4;
        const countOnThisPage = Math.min(maxOnThisPage, images.length - idx);
        const rows = Math.ceil(countOnThisPage / cols);
        const availableHeight = pageHeight - margin - y;
        const cellH = (availableHeight - gap * (rows - 1)) / rows;

        let col = 0;
        let rowY = y;
        for (let i = 0; i < countOnThisPage; i++) {
          const img = images[idx + i];
          const x = margin + col * (cellW + gap);
          const dims = await getImageDims(img.src);
          const fitted = fitContain(dims.w, dims.h, cellW, cellH);
          const offsetX = x + (cellW - fitted.w) / 2;
          const offsetY = rowY + (cellH - fitted.h) / 2;
          doc.addImage(img.src, 'JPEG', offsetX, offsetY, fitted.w, fitted.h);
          col++;
          if (col >= cols) { col = 0; rowY += cellH + gap; }
        }

        idx += countOnThisPage;
        firstPage = false;
        if (idx < images.length) {
          doc.addPage();
          y = margin;
        }
      }
    }

    return doc;
  }

  // ---------- PDF sections choice (shown before building, so the user can
  // opt out of sections they don't want in this particular share — every
  // section that's currently always included stays checked by default). ----------
  let pdfSectionsShootId = null;

  function openPdfSectionsModal(id) {
    pdfSectionsShootId = id;
    document.getElementById('pdfSectionTalent').checked = true;
    document.getElementById('pdfSectionDetails').checked = true;
    document.getElementById('pdfSectionReferences').checked = true;
    document.getElementById('pdfSectionTeam').checked = true;
    document.getElementById('pdfSectionMoodboard').checked = true;
    document.getElementById('pdfSectionsOverlay').hidden = false;
  }

  function closePdfSectionsModal() {
    document.getElementById('pdfSectionsOverlay').hidden = true;
  }

  document.getElementById('pdfSectionsCloseBtn').addEventListener('click', closePdfSectionsModal);

  document.getElementById('pdfSectionsOverlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('pdfSectionsOverlay')) closePdfSectionsModal();
  });

  // Calling openPdfPreview synchronously (not after an await) here matters —
  // its own window.open('', '_blank') call needs to happen inside this
  // click handler's user-gesture context, or mobile browsers block it.
  document.getElementById('pdfSectionsBuildBtn').addEventListener('click', () => {
    const id = pdfSectionsShootId;
    const chosenSections = {
      talent: document.getElementById('pdfSectionTalent').checked,
      details: document.getElementById('pdfSectionDetails').checked,
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

  async function openPdfPreview(id, chosenSections) {
    const s = state.shoots.find(x => x.id === id);
    if (!s) return;
    // A PDF embedded in an iframe doesn't reliably support scrolling past
    // page 1 on mobile browsers — their own full PDF viewer (opened as its
    // own tab) handles multi-page scrolling and pinch-zoom properly, and
    // usually has its own share icon too. Opening the tab has to happen
    // synchronously, before the "await" below, or it loses the user-gesture
    // context and gets popup-blocked — so open it blank first, then point
    // it at the PDF once it's built.
    const previewWindow = window.open('', '_blank');
    try {
      const doc = await buildShootPdf(s, chosenSections);
      pdfPreviewBlob = doc.output('blob');
      const safeName = (s.title || primaryTalentName(s) || 'shoot').replace(/[^\w\- ]+/g, '').trim() || 'shoot';
      pdfPreviewFilename = `${safeName}.pdf`;
      pdfPreviewTitle = s.title || primaryTalentName(s) || 'Shoot';
      const url = URL.createObjectURL(pdfPreviewBlob);
      if (previewWindow) {
        previewWindow.location.href = url;
      } else {
        // Popup blocked (or unsupported, e.g. some installed-PWA contexts)
        // — fall back to the in-app preview modal instead.
        document.getElementById('pdfPreviewFrame').src = url;
        document.getElementById('pdfPreviewOverlay').hidden = false;
      }
    } catch (err) {
      if (previewWindow) previewWindow.close();
      console.error('Failed to build shoot PDF', err);
      showToast('Could not create PDF');
    }
  }

  function closePdfPreview() {
    document.getElementById('pdfPreviewOverlay').hidden = true;
    const frame = document.getElementById('pdfPreviewFrame');
    if (frame.src) URL.revokeObjectURL(frame.src);
    frame.src = '';
    pdfPreviewBlob = null;
  }

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
    syncPostShootJournalEntry(shoot);
    saveState();
    shootModalOverlay.hidden = true;
    editingShootId = null;
    renderAll();
    showToast('You did it! Revisit this shoot in your archive.');
  });

  document.getElementById('unarchiveShootBtn').addEventListener('click', () => {
    clearTimeout(shootSaveTimer);
    const data = gatherShootFormData();
    data.archived = false;
    const idx = state.shoots.findIndex(x => x.id === currentShootId);
    if (idx !== -1) state.shoots[idx] = { ...state.shoots[idx], ...data };
    saveState();
    shootModalOverlay.hidden = true;
    editingShootId = null;
    renderAll();
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
          <button type="button" class="delete-relationship delete-framework" data-id="${fw.id}">&times;</button>
        </div>
        <div class="framework-tags-list">
          ${fw.tags.map((tag, idx) => `
            <div class="relationship-row">
              <input type="text" class="relationship-name-input framework-tag-input" data-fw="${fw.id}" data-idx="${idx}" value="${escapeHtml(tag)}" />
              <button type="button" class="delete-relationship delete-framework-tag" data-fw="${fw.id}" data-idx="${idx}">&times;</button>
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
      if (btn.dataset.close === 'categoryVisibility') closeCategoryVisibilityModal();
    });
  });

  shootModalOverlay.addEventListener('click', (e) => {
    if (e.target === shootModalOverlay) closeShootModal();
  });
  [frameworksModalOverlay, document.getElementById('locationModalOverlay'), document.getElementById('tabIntroOverlay'), categoryVisibilityOverlay].forEach(overlay => {
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
  }

  document.getElementById('appMenuBtn').addEventListener('click', () => {
    appMenuOverlay.hidden = false;
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
  });

  document.getElementById('displayOptionsBackBtn').addEventListener('click', () => {
    appMenuPaneTrack.classList.remove('show-second');
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
  });

  document.getElementById('themeOptionsBackBtn').addEventListener('click', () => {
    appMenuPaneTrack.classList.remove('show-third');
  });

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
      state = {
        shoots: payload.state.shoots || [],
        frameworks: (Array.isArray(payload.state.frameworks) && payload.state.frameworks.length) ? payload.state.frameworks : seedFrameworks(),
        journalEntries: Array.isArray(payload.state.journalEntries) ? payload.state.journalEntries : [],
        titleDisplayMode: payload.state.titleDisplayMode === 'title' ? 'title' : 'talent',
        colorTheme: THEME_KEYS.includes(payload.state.colorTheme) ? payload.state.colorTheme : 'default',
        defaultCountry: typeof payload.state.defaultCountry === 'string' ? payload.state.defaultCountry : '',
      };
      saveState();
      applyColorTheme(state.colorTheme);
      renderAll();
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
      const key = s.status || 'idea_phase';
      counts[key] = (counts[key] || 0) + 1;
    });
    const data = Object.keys(STATUS_LABELS)
      .filter(key => counts[key])
      .map(key => ({ key, label: STATUS_LABELS[key], value: counts[key] }));
    statsSliceFilters.status = {};
    data.forEach(d => {
      statsSliceFilters.status[d.key] = (s) => (s.status || 'idea_phase') === d.key;
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
      if (key !== 'No location set') labels[key] = formatLocationDisplay(s.location);
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
    { key: 'visualLanguage', title: 'Visual Languages', build: buildVisualLanguageStats },
    { key: 'shootCategory', title: 'Shoot Categories', build: buildCategoryStats },
    { key: 'teamMembers', title: 'Team Members', build: buildTeamStats },
    { key: 'status', title: 'Status', build: buildStatusStats },
    { key: 'location', title: 'Locations', build: buildLocationStats },
    { key: 'regions', title: 'Regions', custom: true },
  ];

  // ---------- Regions map (world-map.svg, fetched once and cached) ----------
  let worldMapSvgText = null;
  let worldMapFetchPromise = null;
  let regionsSliceColors = {};
  let mapZoomLevel = 1;
  const MAP_ZOOM_MIN = 1;
  const MAP_ZOOM_MAX = 4;
  const MAP_ZOOM_STEP = 0.5;
  const MAP_BASE_WIDTH = 900;

  function buildRegionsStats() {
    const counts = {};
    getStatsShoots().forEach(s => {
      const code = s.location && s.location.country;
      if (code) counts[code] = (counts[code] || 0) + 1;
    });
    const data = Object.entries(counts)
      .map(([key, value]) => ({ key, label: REGION_LABELS[key] || key, value }))
      .sort((a, b) => b.value - a.value);
    statsSliceFilters.regions = {};
    data.forEach(d => {
      statsSliceFilters.regions[d.key] = (s) => !!(s.location && s.location.country === d.key);
    });
    return data;
  }

  function regionsPageHtml(data) {
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
    const legendHtml = slices.map(s => `
      <button type="button" class="stats-legend-row" data-key="${escapeHtml(String(s.key))}">
        <span class="legend-swatch" style="background:${s.color}"></span>
        <span class="legend-label">${escapeHtml(s.label)}</span>
        <span class="legend-pct">${s.pct}%</span>
      </button>
    `).join('');
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
          <div class="stats-legend">${legendHtml}</div>
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
      const targetRect = target.getBoundingClientRect();
      const wrapRect = scrollWrap.getBoundingClientRect();
      const centerX = targetRect.left + targetRect.width / 2 - wrapRect.left + scrollWrap.scrollLeft;
      const centerY = targetRect.top + targetRect.height / 2 - wrapRect.top + scrollWrap.scrollTop;
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

  function renderRegionsMap() {
    const container = document.getElementById('worldMapContainer');
    if (!container) return;
    mapZoomLevel = 1;
    if (worldMapSvgText) {
      container.innerHTML = worldMapSvgText;
      applyRegionsHighlight();
      return;
    }
    if (!worldMapFetchPromise) {
      worldMapFetchPromise = fetch('world-map.svg').then(r => r.text());
    }
    worldMapFetchPromise.then(svgText => {
      worldMapSvgText = svgText;
      const el = document.getElementById('worldMapContainer');
      if (!el) return;
      el.innerHTML = svgText;
      applyRegionsHighlight();
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

  function renderStatsDots() {
    const idx = statsCarousel.clientWidth ? Math.round(statsCarousel.scrollLeft / statsCarousel.clientWidth) : 0;
    statsDotsEl.innerHTML = STATS_PAGES.map((p, i) => `<span class="stats-dot ${i === idx ? 'active' : ''}"></span>`).join('');
  }

  statsCarousel.addEventListener('scroll', () => renderStatsDots(), { passive: true });

  // Delegated (survives renderStats() rebuilding the carousel's innerHTML on
  // every year-filter change) so it doesn't need re-binding per render.
  statsCarousel.addEventListener('click', (e) => {
    if (e.target.closest('#worldMapZoomInBtn')) setMapZoom(mapZoomLevel + MAP_ZOOM_STEP);
    else if (e.target.closest('#worldMapZoomOutBtn')) setMapZoom(mapZoomLevel - MAP_ZOOM_STEP);
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
    const prevScrollLeft = statsCarousel.scrollLeft;
    statsSliceFilters = {};
    renderStatsYearFilters();
    const funFactEl = document.getElementById('statsFunFact');
    const fact = pickRandomFunFact();
    funFactEl.textContent = fact || '';
    funFactEl.hidden = !fact;
    const pages = STATS_PAGES.map(page => page.custom
      ? regionsPageHtml(buildRegionsStats())
      : renderStatsPage(page, page.build()));
    statsCarousel.innerHTML = pages.map(p => p.html).join('');
    statsCarousel.scrollLeft = prevScrollLeft;
    statsCarousel.querySelectorAll('.pie-slice, .stats-legend-row').forEach(el => {
      el.addEventListener('click', () => {
        const pageKey = el.closest('.stats-page').dataset.key;
        if (pageKey === 'regions') focusRegionOnMap(el.dataset.key);
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
    renderJournalLog();
    renderStats();
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

  function effectiveYesterdayStr() {
    const d = new Date();
    if (d.getHours() < 5) d.setDate(d.getDate() - 1);
    d.setDate(d.getDate() - 1);
    return formatDate(d);
  }

  function joinWithAnd(names) {
    if (names.length === 1) return names[0];
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  }

  function checkDayAfterPrompt() {
    const today = effectiveReportDateStr();
    let lastShown;
    try { lastShown = localStorage.getItem(DAY_AFTER_PROMPT_KEY); } catch (e) { lastShown = null; }
    if (lastShown === today) return;

    const yStr = effectiveYesterdayStr();
    const pendingShoots = state.shoots.filter(s => !s.archived && !POST_CAPTURE_STATUSES.includes(s.status) && s.date === yStr);
    if (!pendingShoots.length) return;

    try { localStorage.setItem(DAY_AFTER_PROMPT_KEY, today); } catch (e) { /* ignore */ }

    const names = pendingShoots.map(shootDisplayName);
    const plural = pendingShoots.length > 1;
    document.getElementById('dayAfterPromptText').textContent = `Did ${plural ? 'these shoots' : 'this shoot'} happen yesterday: ${joinWithAnd(names)}?`;
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

  function computeDailyReportItems() {
    const items = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    state.shoots.forEach(s => {
      if (s.archived) return;

      // 7 days out and still missing team/moodboard — one-time per shoot.
      if (s.date && !POST_CAPTURE_STATUSES.includes(s.status) && !s.sevenDayReminderShown) {
        const daysUntil = Math.round((parseShootDate(s.date) - today) / 86400000);
        const pending = shootPendingLabels(s);
        if (daysUntil >= 0 && daysUntil <= 7 && pending.length > 0) {
          const when = daysUntil === 0 ? 'today' : `in ${daysUntil} day${daysUntil === 1 ? '' : 's'}`;
          items.push({ shootId: s.id, text: `${shootDisplayName(s)}'s shoot is ${when} — pending: ${pending.join(', ')}` });
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
          items.push({ shootId: s.id, text: `Post-shoot reflection still missing for ${shootDisplayName(s)}'s shoot` });
          s.lastReflectionReminderAt = new Date().toISOString();
        }
      }

      // Editing check-in — repeats weekly for as long as status stays "editing".
      if (s.status === 'editing' && s.editingAt) {
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

    const moodboardDone = count(s => s.moodboardComplete);
    if (moodboardDone > 0) facts.push(`${moodboardDone} of your shoots have a finished mood board.`);

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

    const editingCount = count(s => s.status === 'editing');
    if (editingCount > 0) facts.push(`${editingCount} shoot${editingCount === 1 ? ' is' : 's are'} currently in post.`);
    const selectsCount = count(s => s.status === 'waiting_for_selects');
    if (selectsCount > 0) facts.push(`${selectsCount} shoot${selectsCount === 1 ? '' : 's'} waiting on selects.`);
    const ideaCount = count(s => s.status === 'idea_phase');
    if (ideaCount > 0) facts.push(`You've got ${ideaCount} shoot idea${ideaCount === 1 ? '' : 's'} waiting to become real.`);

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

    const moodboardPendingCount = activeShoots.filter(s => !s.moodboardComplete).length;
    if (moodboardPendingCount === 1) nudges.push('A shoot still needs a mood board!');
    else if (moodboardPendingCount === 2) nudges.push('A couple of shoots still need mood boards!');
    else if (moodboardPendingCount > 2) nudges.push(`${moodboardPendingCount} shoots still need mood boards!`);

    const teamPendingCount = activeShoots.filter(s => s.teamRequired === 'yes' && !s.teamFinalized).length;
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
    const deliveredShoots = state.shoots.filter(s => !s.archived && s.status === 'delivered');
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

  function getTodaysDailyReportContent() {
    const cached = loadCachedDailyReportContent();
    return cached ? Promise.resolve(cached) : buildTodaysDailyReportContent();
  }

  function renderDailyReportOverlay(content) {
    const { items, nudge, fact } = content;
    const list = document.getElementById('dailyReportList');
    list.innerHTML = '';
    items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'daily-report-item';
      row.textContent = item.text;
      row.addEventListener('click', () => {
        document.getElementById('dailyReportOverlay').hidden = true;
        document.querySelector('.tab[data-view="shoots"]').click();
        openShootModal(item.shootId);
      });
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
      renderDailyReportOverlay(content);
    });
  }

  // Notifications bell — same content as the Daily report, shown on demand
  // instead of gated to once a day. Unlike the automatic popup, this always
  // shows something (a "nothing to report" line if today's report is
  // genuinely empty), since it's an explicit tap rather than a background check.
  function openNotificationsBell() {
    getTodaysDailyReportContent().then(renderDailyReportOverlay);
  }

  document.getElementById('dailyReportCloseBtn').addEventListener('click', () => {
    document.getElementById('dailyReportOverlay').hidden = true;
  });

  renderAll();
  showTabIntro('overview');
  if (document.getElementById('tabIntroOverlay').hidden) {
    checkDayAfterPrompt();
    if (document.getElementById('dayAfterPromptOverlay').hidden) {
      checkDailyReportPrompt();
    }
  }

  // ---------- restore an in-progress journal entry across restarts ----------
  function restoreOpenJournalEntry() {
    let id;
    try { id = localStorage.getItem(OPEN_JOURNAL_KEY); } catch (e) { return; }
    if (!id) return;
    if (!state.journalEntries.some(x => x.id === id)) { clearOpenJournalMarker(); return; }
    document.querySelector('.tab[data-view="journal"]').click();
    openJournalModal(id);
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
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => {});
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
      state = loadState();
      renderAll();
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
