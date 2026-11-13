// A blank shoot, and copying a shoot for another day of its project.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addShootCopies = function addShootCopies(ed) {
  Object.assign(ed, { copyShootForProject });
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
      location: ed.normalizeLocation({ country: ed.state.defaultCountry || '' }),
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
    const source = (src && ed.state.shoots.find(x => x.id === src.id)) || src;
    if (!source) return null;
    let id = ed.uid();
    while (ed.state.shoots.some(x => x.id === id)) id = ed.uid();
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
    shoot.aspectRatios = ed.normalizeAspectRatios(source.aspectRatios);
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
      shoot.location = ed.normalizeLocation(source.location);
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
        id: ed.uid(),
        name: item.name || '',
        characteristics: item.characteristics || '',
        description: item.description !== undefined ? item.description : (item.text || ''),
      }));
      // Blank rows are dropped too — they'd only be empty lines to delete.
      // A must-have still not got stays one.
      shoot.shotList = ed.isPostCaptureStatus(source.status)
        ? (source.shotList || [])
          .filter(item => item && !item.checked && typeof item.text === 'string' && ed.hasText(item.text))
          .map(item => ({ ...(item.id ? { id: ed.uid() } : {}), text: item.text, checked: false, ...(item.starred ? { starred: true } : {}) }))
        : [];

      const sourceTalents = source.talents || [];
      const readRows = key => ed.idbGetImages(key).catch(() => []);
      const [moodboardImages, coverRows, talentRows] = await Promise.all([
        readRows(source.id),
        readRows(ed.projectPhotoKey(source.id)),
        // A talent without an id can't have a row (the key needs one), so its
        // photo, if any, can only be the in-memory one.
        Promise.all(sourceTalents.map(t => (t.id ? readRows(ed.talentPhotoKey(source.id, t.id)) : Promise.resolve([])))),
      ]);
      // Same talent ids — the photo keys include the shoot id, so they can't
      // collide — so the same person stays recognisable across days.
      shoot.talents = sourceTalents.map((t, i) => ({
        id: t.id || ed.uid(),
        name: t.name || '',
        socialHandles: (t.socialHandles || []).map(sh => ({ ...sh })),
        photo: ed.photoFromEntries(talentRows[i]) || t.photo || '',
      }));
      shoot.projectPhoto = ed.photoFromEntries(coverRows) || source.projectPhoto || null;

      const writes = [];
      if (moodboardImages.length) writes.push(ed.idbSetImages(id, moodboardImages.map(img => ({ ...img }))));
      if (shoot.projectPhoto) writes.push(ed.savePhotoToIdb(ed.projectPhotoKey(id), shoot.projectPhoto));
      shoot.talents.forEach(t => {
        if (t.photo) writes.push(ed.savePhotoToIdb(ed.talentPhotoKey(id, t.id), t.photo));
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
    if (shoot.projectId && !ed.findProject(shoot.projectId)) shoot.projectId = '';

    // Same bookkeeping as a shoot created through the form (autosaveShoot).
    ed.applyStatusTimestamps(shoot, null, shoot.status);
    ed.state.shoots.push(shoot);
    return shoot;
  }
};
