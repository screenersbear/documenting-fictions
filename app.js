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

  const CATEGORY_LABELS = {
    commercial: 'Commercial',
    video: 'Video',
    editorial: 'Editorial',
    lighting_test: 'Lighting test',
    portfolio_building: 'Portfolio building',
    test_shoot: 'Test shoot',
    event: 'Event',
    headshot: 'Headshot',
    branding: 'Branding',
    other: 'Other',
    uncategorized: 'Uncategorized',
  };

  const CATEGORY_FILTER_ORDER = ['commercial', 'video', 'editorial', 'lighting_test', 'portfolio_building', 'test_shoot', 'event', 'headshot', 'branding', 'other'];

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
    headshot: 'headshot shoots',
    branding: 'branding shoots',
    other: 'other shoots',
  };

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

  function defaultState() {
    return {
      shoots: [],
      frameworks: seedFrameworks(),
      journalEntries: [],
      titleDisplayMode: 'talent',
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
    if (s.frameworkTags && s.category && s.status !== undefined && s.moodboardComplete !== undefined && Array.isArray(s.references) && s.teamRequired !== undefined) return s;
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
      location: s.location || '',
      startTime: s.startTime || s.time || '',
      endTime: s.endTime || '',
      premise: s.premise !== undefined ? s.premise : (s.concept || ''),
      character: s.character || '',
      shootGoals: s.shootGoals || '',
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
      teamMembers: s.teamMembers || [],
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

  // Defaults to talent name first (falling back to the shoot title, then a
  // placeholder); the app-wide display setting (state.titleDisplayMode) flips
  // the priority for every shoot at once.
  function shootDisplayName(s) {
    return state.titleDisplayMode === 'title'
      ? (s.title || s.talentName || 'Untitled shoot')
      : (s.talentName || s.title || 'Untitled shoot');
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
    const statusLabel = (showBadge && opts && opts.showStatus) ? (STATUS_LABELS[s.status] || '') : '';
    const pendingLabels = (showBadge && opts && opts.showPending) ? shootPendingLabels(s) : [];
    const pendingText = pendingLabels.length ? `Pending: ${escapeHtml(pendingLabels.join(', '))}` : '';
    // Proofs are only "pending" for the captured step itself — once a shoot
    // moves to waiting_for_selects, proofs have already gone out.
    const proofsPendingText = (showBadge && s.status === 'captured') ? 'Pending: Proofs' : '';
    const badgeHtml = [statusLabel, pendingText, proofsPendingText].filter(Boolean).join('<br>');
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
        ${badgeHtml ? `<span class="badge">${badgeHtml}</span>` : ''}
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

  // ---------- Overview (home) ----------
  document.getElementById('newShootBtn').addEventListener('click', () => openShootModal(null));

  const STAT_BOX_FILTERS = {
    ready: s => !s.archived && s.status === 'waiting_to_shoot',
    planning: s => !s.archived && (s.status === 'idea_phase' || s.status === 'planning'),
    pending: s => !s.archived && shootPendingLabels(s).length > 0,
  };

  const STAT_BOX_TITLES = {
    ready: 'Ready to shoot',
    planning: 'Still planning',
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

    const readyToShootCount = state.shoots.filter(STAT_BOX_FILTERS.ready).length;
    const stillPlanningCount = state.shoots.filter(STAT_BOX_FILTERS.planning).length;
    const pendingTeamMoodboardCount = state.shoots.filter(STAT_BOX_FILTERS.pending).length;

    document.getElementById('statsRow').innerHTML = `
      <div class="stat-box" data-stat="ready">
        <span class="stat-num">${readyToShootCount}</span>
        <span class="stat-label">Ready to shoot</span>
      </div>
      <div class="stat-box" data-stat="planning">
        <span class="stat-num">${stillPlanningCount}</span>
        <span class="stat-label">Still planning</span>
      </div>
      <div class="stat-box" data-stat="pending">
        <span class="stat-num">${pendingTeamMoodboardCount}</span>
        <span class="stat-label">Teams + mood boards pending</span>
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
  let shootFilter = 'all';

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

  document.getElementById('shootFilterToggle').addEventListener('click', () => {
    const filters = document.getElementById('shootFilters');
    filters.hidden = !filters.hidden;
  });

  document.getElementById('shootFilters').addEventListener('click', (e) => {
    if (e.target.closest('.chip-manage')) {
      document.getElementById('shootFilters').hidden = true;
      openCategoryVisibilityModal();
      return;
    }
    const chip = e.target.closest('.chip');
    if (!chip || !chip.dataset.filter) return;
    shootFilter = chip.dataset.filter;
    document.getElementById('shootFilters').hidden = true;
    renderShoots();
  });

  function renderShoots() {
    renderCategoryFilterChips('shootFilters', 'shootFilterToggle', shootFilter);
    const list = document.getElementById('shootList');
    let items = state.shoots.filter(s => !s.archived);
    if (shootFilter !== 'all') items = items.filter(s => s.category === shootFilter);

    list.innerHTML = '';
    document.getElementById('shootEmpty').hidden = items.length !== 0;

    let visibleGroupIndex = 0;
    Object.keys(STATUS_LABELS).forEach(statusKey => {
      // The Editing group orders by deadline instead of shoot date — that's
      // the date that actually matters once a shoot's already been captured.
      const group = items.filter(s => (s.status || 'idea_phase') === statusKey)
        .sort((a, b) => statusKey === 'editing'
          ? dateSortKey(a.deadline).localeCompare(dateSortKey(b.deadline))
          : dateTimeSortKey(a).localeCompare(dateTimeSortKey(b)));
      if (!group.length) return;

      const groupEl = document.createElement('div');
      groupEl.className = 'shoot-status-group';

      const collapseKey = `shoots:${statusKey}`;
      const collapsed = isSectionCollapsed(collapseKey);
      const heading = document.createElement('h2');
      heading.className = `status-group-heading ${visibleGroupIndex % 2 === 0 ? 'heading-yellow' : 'heading-navy'}${collapsed ? ' collapsed' : ''}`;
      heading.innerHTML = `${escapeHtml(STATUS_LABELS[statusKey])}${COLLAPSE_ARROW_SVG}`;

      const rowsWrap = document.createElement('div');
      rowsWrap.className = 'shoot-status-rows';
      rowsWrap.hidden = collapsed;
      group.forEach(s => renderShootRow(rowsWrap, s, { showPending: true }));

      heading.addEventListener('click', () => {
        const nowHidden = !rowsWrap.hidden;
        rowsWrap.hidden = nowHidden;
        heading.classList.toggle('collapsed', nowHidden);
        setSectionCollapsed(collapseKey, nowHidden);
      });

      groupEl.appendChild(heading);
      groupEl.appendChild(rowsWrap);
      list.appendChild(groupEl);
      visibleGroupIndex++;
    });
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

  function renderArchive() {
    renderArchiveSlideshow();
    renderCategoryFilterChips('archiveFilters', 'archiveFilterToggle', archiveFilter);
    const list = document.getElementById('archiveList');
    let items = state.shoots.filter(s => s.archived).sort((a, b) => dateSortKey(b.date).localeCompare(dateSortKey(a.date)));
    if (archiveFilter !== 'all') items = items.filter(s => s.category === archiveFilter);

    list.innerHTML = '';
    document.getElementById('archiveEmpty').hidden = items.length !== 0;
    items.forEach(s => renderShootRow(list, s, { showStatus: true }));
  }

  // ---------- Journal ----------
  let journalTagFilter = 'all';
  let currentJournalEntry = null;
  let journalIsNew = false;
  let currentJournalTags = [];
  let journalSaveTimer = null;
  let journalHasImages = false;

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

  function renderJournalImages() {
    const grid = document.getElementById('journalImagesGrid');
    const key = currentJournalImagesKey();
    grid.innerHTML = '';
    if (!key) return;
    idbGetImages(key).then(images => {
      journalHasImages = images.length > 0;
      grid.innerHTML = images.length ? '' : '<p class="empty-hint">No photos yet.</p>';
      images.forEach((img, idx) => {
        const thumb = document.createElement('div');
        thumb.className = 'moodboard-thumb';
        thumb.innerHTML = `<img src="${img.src}" alt="" data-idx="${idx}" /><button type="button" class="final-thumb-delete" data-idx="${idx}">&times;</button>`;
        grid.appendChild(thumb);
      });
      grid.querySelectorAll('.final-thumb-delete').forEach(btn => {
        btn.addEventListener('click', () => {
          idbGetImages(key).then(imgs => {
            imgs.splice(Number(btn.dataset.idx), 1);
            return idbSetImages(key, imgs);
          }).then(() => {
            renderJournalImages();
            scheduleJournalAutosave();
          });
        });
      });
      grid.querySelectorAll('.moodboard-thumb img').forEach(imgEl => {
        imgEl.addEventListener('click', () => {
          openImageViewer(images, Number(imgEl.dataset.idx), key, renderJournalImages, false);
        });
      });
    }).catch(() => { grid.innerHTML = ''; });
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
    const title = `Post-shoot reflection: ${shootDisplayName(shoot)}`;

    if (existingIdx !== -1) {
      state.journalEntries[existingIdx] = { ...state.journalEntries[existingIdx], title, body };
    } else {
      state.journalEntries.push({
        id: uid(),
        title,
        body,
        tags: [],
        createdAt: todayStr(),
        sourceShootId: shoot.id,
      });
    }
  }

  function renderJournal() {
    const tags = getAllUsedJournalTags();
    if (journalTagFilter !== 'all' && !tags.includes(journalTagFilter)) journalTagFilter = 'all';

    const filtersEl = document.getElementById('journalFilters');
    filtersEl.innerHTML = `<button class="chip${journalTagFilter === 'all' ? ' active' : ''}" data-tag="all">All</button>` +
      tags.map(t => `<button class="chip${journalTagFilter === t ? ' active' : ''}" data-tag="${escapeHtml(t)}">#${escapeHtml(t)}</button>`).join('');
    document.getElementById('journalFilterToggle').textContent = `Filter: ${journalTagFilter === 'all' ? 'All' : '#' + journalTagFilter}`;

    let items = [...state.journalEntries];
    if (journalTagFilter !== 'all') items = items.filter(e => (e.tags || []).includes(journalTagFilter));
    items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

    const list = document.getElementById('journalList');
    list.innerHTML = '';
    document.getElementById('journalEmpty').hidden = items.length !== 0;

    items.forEach(e => {
      const card = document.createElement('div');
      card.className = 'card';
      // A linked entry's cover photo is the shoot's own project photo — same
      // picture you'd see on that shoot's bubble. Otherwise, fall back to
      // this entry's own uploaded photos, fetched async since IDB has no
      // synchronous read.
      const linkedShoot = e.sourceShootId ? state.shoots.find(s => s.id === e.sourceShootId) : null;
      const initialThumbSrc = (linkedShoot && linkedShoot.projectPhoto) || null;
      card.innerHTML = `
        ${journalThumbHtml(initialThumbSrc)}
        <div class="card-body">
          <p class="card-title">${escapeHtml(e.title || 'Untitled entry')}</p>
          <div class="card-meta">
            <span class="badge">${prettyDate(e.createdAt)}</span>
          </div>
          ${(e.tags && e.tags.length) ? `<div class="card-beats">${e.tags.map(t => `<span class="beat-badge">#${escapeHtml(t)}</span>`).join('')}</div>` : ''}
        </div>
        <button type="button" class="card-options-btn" aria-label="Options">&#8942;</button>
      `;
      card.addEventListener('click', () => openJournalModal(e.id));
      card.querySelector('.card-options-btn').addEventListener('click', (ev) => {
        ev.stopPropagation();
        openJournalOptions(e.id);
      });
      list.appendChild(card);
      if (!initialThumbSrc) {
        idbGetImages(journalEntryImagesKey(e)).then(images => {
          if (!images.length) return;
          const thumb = card.querySelector('.shoot-thumb');
          if (thumb) thumb.outerHTML = journalThumbHtml(images[0].src);
        }).catch(() => {});
      }
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
    currentJournalEntry.title = document.getElementById('journalSubject').value;
    currentJournalEntry.body = document.getElementById('journalBody').value;
    currentJournalEntry.tags = [...currentJournalTags];

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

  function openJournalModal(id) {
    const existing = id ? state.journalEntries.find(x => x.id === id) : null;
    journalIsNew = !existing;
    currentJournalEntry = existing || { id: uid(), title: '', body: '', tags: [], createdAt: todayStr() };
    setOpenJournalMarker(currentJournalEntry.id);

    document.getElementById('journalSubject').value = currentJournalEntry.title;
    document.getElementById('journalBody').value = currentJournalEntry.body;
    currentJournalTags = [...currentJournalEntry.tags];
    document.getElementById('deleteJournalBtn').hidden = journalIsNew;
    renderJournalTagsChips();
    renderJournalTagsSuggestions();
    journalTagsInput.value = '';

    const isLinked = !!currentJournalEntry.sourceShootId;
    document.getElementById('journalBody').readOnly = isLinked;
    document.getElementById('journalLinkedHint').hidden = !isLinked;

    journalHasImages = false;
    renderJournalImages();

    journalModalOverlay.hidden = false;
  }

  // Auto-compiled entries read normally, but tapping into the text hands
  // off to the shoot's own reflection fields instead of allowing edits here.
  document.getElementById('journalBody').addEventListener('click', () => {
    if (!currentJournalEntry || !currentJournalEntry.sourceShootId) return;
    const shootId = currentJournalEntry.sourceShootId;
    document.getElementById('journalBody').blur();
    if (!confirm('Do you want to revisit this shoot and modify the entry?')) return;
    closeJournalModal();
    openPostShootJournalPrompt(shootId);
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

  document.getElementById('saveJournalBtn').addEventListener('click', closeJournalModal);

  document.getElementById('deleteJournalBtn').addEventListener('click', () => {
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
  });

  journalModalOverlay.addEventListener('click', (e) => {
    if (e.target === journalModalOverlay) closeJournalModal();
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

  // ---------- Team members (dynamic list inside the shoot modal) ----------
  let currentTeamMembers = [];

  function renderTeamMembers() {
    const container = document.getElementById('teamMembersList');
    container.innerHTML = currentTeamMembers.map((tm, idx) => `
      <div class="team-member-row">
        <select class="team-member-role" data-idx="${idx}">
          ${TEAM_ROLE_OPTIONS.map(([val, label]) => `<option value="${val}" ${tm.role === val ? 'selected' : ''}>${label}</option>`).join('')}
        </select>
        <input type="text" class="team-member-name" data-idx="${idx}" placeholder="Name" value="${escapeHtml(tm.name || '')}" />
        <button type="button" class="delete-team-member" data-idx="${idx}">&times;</button>
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
    currentTeamMembers.push({ role: 'makeup_artist', name: '' });
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
      <div class="shot-list-row${item.checked ? ' shot-checked' : ''}">
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

    if (focusIdx !== undefined) {
      const focusInput = container.querySelector(`.shot-text[data-idx="${focusIdx}"]`);
      if (focusInput) focusInput.focus();
    }
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

  // ---------- Location (popup with free text + past locations) ----------
  function updateLocationBtnDisplay() {
    const value = document.getElementById('shootLocation').value;
    const btn = document.getElementById('shootLocationBtn');
    btn.textContent = value || 'Tap to add location';
    btn.classList.toggle('has-value', !!value);
  }

  function getAllPastLocations() {
    const set = new Set();
    state.shoots.forEach(s => { if (s.location && s.location.trim()) set.add(s.location.trim()); });
    return [...set].sort();
  }

  function openLocationModal() {
    document.getElementById('locationTextInput').value = document.getElementById('shootLocation').value;
    const select = document.getElementById('pastLocationsSelect');
    select.innerHTML = '<option value="">Select a past location…</option>'
      + getAllPastLocations().map(loc => `<option value="${escapeHtml(loc)}">${escapeHtml(loc)}</option>`).join('');
    document.getElementById('locationModalOverlay').hidden = false;
  }

  document.getElementById('shootLocationBtn').addEventListener('click', openLocationModal);

  document.getElementById('pastLocationsSelect').addEventListener('change', (e) => {
    if (e.target.value) document.getElementById('locationTextInput').value = e.target.value;
  });

  document.getElementById('saveLocationBtn').addEventListener('click', () => {
    document.getElementById('shootLocation').value = document.getElementById('locationTextInput').value.trim();
    updateLocationBtnDisplay();
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
    ['shoot:shootDayNotes', '#shootDayNotesHeading', 'shootDayNotesBody'],
    ['shoot:shotList', '#shotListHeading', 'shotListBody'],
    ['shoot:lightingSetups', '#lightingSetupsHeading', 'lightingSetupsBody'],
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
    shootWentRight: 'What went right',
    shootCouldBeBetter: "What could've gone better",
    shootLessonsLearned: 'Lessons for next time',
    shootTalentDirections: 'Directions for talent',
    shootTeamDirections: 'Directions for team',
    shootLocationDirections: 'Location directions for talent',
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
    'shootGeneralNotes',
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

  document.getElementById('postShootPromptYesBtn').addEventListener('click', () => {
    document.getElementById('postShootPromptOverlay').hidden = true;
    const content = document.getElementById('postShootContent');
    content.hidden = false;
    updateShootModalJumpMenuVisibility();
    content.scrollIntoView({ behavior: 'smooth', block: 'start' });
    maybeOpenDeadlinePrompt();
  });

  document.getElementById('postShootPromptLaterBtn').addEventListener('click', () => {
    document.getElementById('postShootContent').hidden = false;
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
    { id: 'visualsHeading', label: 'Visuals' },
    { id: 'directionHeading', label: 'Direction' },
    { id: 'shootDayNotesHeading', label: 'Shoot-day notes' },
    { id: 'postShootHeading', label: 'Post-shoot Reflection' },
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
    document.getElementById('unarchiveShootBtn').hidden = !isArchived;
    document.getElementById('completeShootBtn').hidden = !s || isArchived || s.status !== 'delivered';

    document.getElementById('shootTitle').value = s ? (s.title || '') : '';
    document.getElementById('shootStatus').value = s ? (s.status || 'idea_phase') : 'idea_phase';
    previousStatusValue = document.getElementById('shootStatus').value;
    document.getElementById('shootDate').value = s ? (s.date || '') : '';
    document.getElementById('shootDeadline').value = s ? (s.deadline || '') : '';
    document.getElementById('shootStartTime').value = s ? (s.startTime || '') : '';
    document.getElementById('shootEndTime').value = s ? (s.endTime || '') : '';
    document.getElementById('shootLocation').value = s ? (s.location || '') : '';
    updateLocationBtnDisplay();
    document.getElementById('shootTalent').value = s ? s.talentName : '';
    document.getElementById('shootCategory').value = s ? (s.category || '') : '';
    updateCategoryTierUI();
    document.getElementById('shootPremise').value = s ? (s.premise || '') : '';
    document.getElementById('shootCharacter').value = s ? (s.character || '') : '';
    document.getElementById('shootWorldNotes').value = s ? (s.worldNotes || '') : '';
    document.getElementById('shootGoals').value = s ? (s.shootGoals || '') : '';
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
      location: document.getElementById('shootLocation').value.trim(),
      talentName: document.getElementById('shootTalent').value.trim(),
      category: document.getElementById('shootCategory').value,
      premise: document.getElementById('shootPremise').value.trim(),
      character: document.getElementById('shootCharacter').value.trim(),
      shootGoals: document.getElementById('shootGoals').value.trim(),
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
    return !hasText(data.title) && !hasText(data.location) && !hasText(data.startTime) && !hasText(data.endTime) && !hasText(data.talentName) && !hasText(data.premise) && !hasText(data.character) && !hasText(data.shootGoals)
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
    if (editingShootId) shareShootPdf(editingShootId);
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
    if (id) shareShootPdf(id);
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

  async function buildShootPdf(s) {
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
    const titleLines = doc.splitTextToSize((s.title || s.talentName || 'Shoot').toUpperCase(), pageWidth - titleX - margin);
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

    if (s.talentName) {
      doc.setTextColor(...navy);
      doc.setFont('courier', 'bold');
      doc.setFontSize(15);
      doc.text(`Talent: ${s.talentName}`, margin, y);
      y += 26;
    }

    const timeRange = shootTimeRange(s);
    if (s.date || timeRange || s.location) {
      doc.setTextColor(...navy);
      doc.setFont('courier', 'bold');
      doc.setFontSize(18);
      doc.text('Details:', margin, y);
      y += 24;
      doc.setFont('courier', 'normal');
      doc.setFontSize(11);
      if (s.date) { doc.text(prettyDate(s.date), margin, y); y += 16; }
      if (timeRange) { doc.text(timeRange, margin, y); y += 16; }
      if (s.location) { doc.text(s.location, margin, y, { maxWidth: pageWidth - margin * 2 }); y += 16; }
      y += 8;
    }

    const refs = (s.references || []).map(r => r.trim()).filter(Boolean);
    if (refs.length) {
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
    if (team.length) {
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
      });
      y += 10;
    }

    const notes = (s.generalNotes || '').trim();
    if (notes) {
      doc.setFont('courier', 'bold');
      doc.setFontSize(18);
      doc.text('Notes:', margin, y);
      y += 24;
      doc.setFont('courier', 'normal');
      doc.setFontSize(11);
      const noteLines = doc.splitTextToSize(notes, pageWidth - margin * 2);
      doc.text(noteLines, margin, y);
      y += noteLines.length * 14 + 10;
    }

    const images = await idbGetImages(s.id);
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

  async function shareShootPdf(id) {
    const s = state.shoots.find(x => x.id === id);
    if (!s) return;
    try {
      const doc = await buildShootPdf(s);
      const blob = doc.output('blob');
      const safeName = (s.talentName || s.title || 'shoot').replace(/[^\w\- ]+/g, '').trim() || 'shoot';
      const filename = `${safeName}.pdf`;
      const file = new File([blob], filename, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: s.title || s.talentName || 'Shoot' });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
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
  }

  document.getElementById('completeShootBtn').addEventListener('click', () => {
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
    if (shootFilter !== 'all' && !isCategoryVisible(shootFilter)) shootFilter = 'all';
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
  }

  document.getElementById('appMenuBtn').addEventListener('click', () => {
    appMenuOverlay.hidden = false;
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

  function idbClearAllImages() {
    return idbOpen().then(db => new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    }));
  }

  document.getElementById('deleteAllShootDataBtn').addEventListener('click', () => {
    closeAppMenu();
    const confirmed = confirm('Delete ALL shoot data? This permanently removes every shoot, mood board photo, and reference. This can\'t be undone.');
    if (!confirmed) return;
    state.shoots = [];
    saveState();
    idbClearAllImages().catch(() => {});
    renderAll();
    showToast('All shoot data deleted.');
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
      };
      saveState();
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

  function buildLocationStats() {
    const counts = {};
    getStatsShoots().forEach(s => {
      const key = (s.location || '').trim() || 'No location set';
      counts[key] = (counts[key] || 0) + 1;
    });
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const TOP_N = 6;
    const top = sorted.slice(0, TOP_N);
    const rest = sorted.slice(TOP_N);
    const data = top.map(([key, value]) => ({ key, label: key, value }));
    statsSliceFilters.location = {};
    data.forEach(d => {
      statsSliceFilters.location[d.key] = (s) => ((s.location || '').trim() || 'No location set') === d.key;
    });
    if (rest.length) {
      const otherKeys = new Set(rest.map(([k]) => k));
      const otherValue = rest.reduce((sum, [, v]) => sum + v, 0);
      data.push({ key: '__other_locations__', label: 'Other', value: otherValue });
      statsSliceFilters.location.__other_locations__ = (s) => otherKeys.has((s.location || '').trim() || 'No location set');
    }
    return data;
  }

  const STATS_PAGES = [
    { key: 'visualLanguage', title: 'Visual Languages', build: buildVisualLanguageStats },
    { key: 'shootCategory', title: 'Shoot Categories', build: buildCategoryStats },
    { key: 'teamMembers', title: 'Team Members', build: buildTeamStats },
    { key: 'status', title: 'Status', build: buildStatusStats },
    { key: 'location', title: 'Locations', build: buildLocationStats },
  ];

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
    const pages = STATS_PAGES.map(page => renderStatsPage(page, page.build()));
    statsCarousel.innerHTML = pages.map(p => p.html).join('');
    statsCarousel.scrollLeft = prevScrollLeft;
    statsCarousel.querySelectorAll('.pie-slice, .stats-legend-row').forEach(el => {
      el.addEventListener('click', () => {
        const pageKey = el.closest('.stats-page').dataset.key;
        openStatsDetail(pageKey, el.dataset.key);
      });
    });
    statsCarousel.querySelectorAll('.stats-page').forEach((pageEl, i) => {
      const slices = pages[i].slices;
      if (!slices) return;
      animatePieSlices([...pageEl.querySelectorAll('.pie-slice')], slices);
    });
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
    shoots.forEach(s => { const t = (s.talentName || '').trim(); if (t) talentCounts[t] = (talentCounts[t] || 0) + 1; });
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
    shoots.forEach(s => { const l = (s.location || '').trim(); if (l) locCounts[l] = (locCounts[l] || 0) + 1; });
    const locEntries = Object.entries(locCounts);
    if (locEntries.length) {
      facts.push(`You've shot in ${locEntries.length} different location${locEntries.length === 1 ? '' : 's'}.`);
      const [topLoc, topLocN] = locEntries.sort((a, b) => b[1] - a[1])[0];
      if (topLocN > 1) facts.push(`${topLoc} is your most-used location, shot there ${topLocN} times.`);
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
  function computeDailyReportNudges() {
    const nudges = [];
    const activeShoots = state.shoots.filter(s => !s.archived);

    const moodboardPendingCount = activeShoots.filter(s => !s.moodboardComplete).length;
    if (moodboardPendingCount === 1) nudges.push('A shoot still needs a mood board!');
    else if (moodboardPendingCount === 2) nudges.push('A couple of shoots still need mood boards!');
    else if (moodboardPendingCount > 2) nudges.push(`${moodboardPendingCount} shoots still need mood boards!`);

    const teamPendingCount = activeShoots.filter(s => s.teamRequired === 'yes' && !s.teamFinalized).length;
    if (teamPendingCount === 1) nudges.push("Is your team set for that shoot?");
    else if (teamPendingCount > 1) nudges.push('Are all your teams set?');

    return nudges;
  }

  function pickDailyReportNudge() {
    const nudges = computeDailyReportNudges();
    if (!nudges.length) return null;
    return nudges[Math.floor(Math.random() * nudges.length)];
  }

  function checkDailyReportPrompt() {
    const today = effectiveReportDateStr();
    let lastShown;
    try { lastShown = localStorage.getItem(DAILY_REPORT_SHOWN_KEY); } catch (e) { lastShown = null; }
    if (lastShown === today) return;

    const items = computeDailyReportItems();
    const nudge = pickDailyReportNudge();
    const fact = pickRandomFunFact();
    // Always show once a day — if nothing is pending, it's just the fact.
    // Only truly skip if there's none of the three (a brand-new, empty app).
    if (!items.length && !nudge && !fact) return;

    try { localStorage.setItem(DAILY_REPORT_SHOWN_KEY, today); } catch (e) { /* ignore */ }
    saveState();

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

    document.getElementById('dailyReportOverlay').hidden = false;
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

  // ---------- service worker (offline caching) ----------
  if ('serviceWorker' in navigator) {
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
