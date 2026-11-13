// Old saves brought up to date: journal entries, frameworks, statuses, shoots and projects.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addMigrate = function addMigrate(ed) {
  Object.assign(ed, { migrateJournalEntry, migrateFrameworks, migrateIdeaPhaseStatus, removeFramework, removeFrameworkTags, renameFrameworkTag, migrateShoot, projectsWithMembers, normalizeProjects });
  function migrateJournalEntry(e) {
    const entry = {
      id: e.id || ed.uid(),
      title: e.title || '',
      body: e.body || '',
      tags: Array.isArray(e.tags) ? e.tags : [],
      createdAt: e.createdAt || ed.todayStr(),
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
        vl.tags = [...ed.VISUAL_LANGUAGE_TAGS];
      }
    }
    return result.length ? result : ed.seedFrameworks();
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
    const status = s.status !== undefined ? s.status : (ed.hasText(s.deliveryStatus) ? 'delivered' : 'prospect');
    const lessonsLearned = s.lessonsLearned !== undefined ? s.lessonsLearned : (s.reflection || '');
    return {
      ...s,
      title: s.title || '',
      status,
      location: ed.normalizeLocation(s.location, s.region),
      startTime: s.startTime || s.time || '',
      endTime: s.endTime || '',
      crewCallTime: s.crewCallTime || '',
      talentCallTime: s.talentCallTime || '',
      premise: s.premise !== undefined ? s.premise : (s.concept || ''),
      character: s.character || '',
      shootGoals: s.shootGoals || '',
      elevatorPitch: s.elevatorPitch || '',
      deliverables: s.deliverables || '',
      aspectRatios: ed.normalizeAspectRatios(s.aspectRatios),
      deliverableDestinations: s.deliverableDestinations || '',
      emotionalBeats: s.emotionalBeats || [],
      worldNotes: s.worldNotes || '',
      lightingNotes: s.lightingNotes || '',
      wardrobeNotes: s.wardrobeNotes || '',
      references: Array.isArray(s.references) ? s.references : (ed.hasText(s.references) ? [s.references] : []),
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
      talents: Array.isArray(s.talents) ? s.talents : (ed.hasText(s.talentName) || (s.socialHandles || []).some(sh => ed.hasText(sh.handle)) ? [{ name: s.talentName || '', socialHandles: s.socialHandles || [] }] : []),
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
        name: (typeof p.name === 'string' && p.name.trim()) || ed.UNTITLED_PROJECT_NAME,
        createdAt: (typeof p.createdAt === 'string' && p.createdAt) || ed.todayStr(),
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
        .sort((a, b) => ed.dateTimeSortKey(a).localeCompare(ed.dateTimeSortKey(b)))
        .find(s => typeof s.title === 'string' && s.title.trim());
      byId.set(id, { id, name: named ? named.title.trim() : ed.UNTITLED_PROJECT_NAME, createdAt: ed.todayStr() });
    });
    return projectsWithMembers([...byId.values()], shoots);
  }
};
