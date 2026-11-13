// Projects: groups of shoots (the days of a multi-day shoot, or the shoots of one video).
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addProjects = function addProjects(ed) {
  Object.assign(ed, { projectsList, findProject, projectMembers, isProjectLiveShoot, projectDayInfo, projectShotProgressLabel, projectStatusLabel, projectGroupStatusKey, collapseProjects, createProject, pruneEmptyProjects, setShootProject });
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
    if (!Array.isArray(ed.state.projects)) ed.state.projects = [];
    return ed.state.projects;
  }

  function findProject(id) {
    if (!id) return undefined;
    return projectsList().find(p => p.id === id);
  }

  // Every shoot in the project, archived ones included, in shoot-date order
  // (date TBD last, same as every other date-sorted list).
  function projectMembers(projectId) {
    if (!projectId) return [];
    return ed.state.shoots
      .filter(s => s.projectId === projectId)
      .sort((a, b) => ed.dateTimeSortKey(a).localeCompare(ed.dateTimeSortKey(b)));
  }

  // Postponed (key: rescheduled) and Canceled shoots are off the schedule —
  // the date they keep is only the original plan (see isOffScheduleShoot) —
  // so they don't count as a day of the project or toward its progress.
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
    const order = Object.keys(ed.STATUS_LABELS);
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
    const shotCount = live.filter(s => ed.isPostCaptureStatus(s.status)).length;
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
    if (!live.length) return list.every(s => s.status === 'canceled') ? ed.STATUS_LABELS.canceled : ed.STATUS_LABELS.rescheduled;
    return projectShotProgressLabel(live) || ed.STATUS_LABELS[projectLeastAdvancedStatus(live)] || '';
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
  // the earliest-dated one, else simply the first one given. A postponed or
  // canceled day's kept date doesn't count (scheduledShootDate).
  function projectRepresentative(members) {
    if (!members || !members.length) return null;
    const today = ed.todayStr();
    const dated = members
      .filter(s => ed.scheduledShootDate(s))
      .sort((a, b) => ed.dateTimeSortKey(a).localeCompare(ed.dateTimeSortKey(b)));
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
      id: ed.uid(),
      name: (typeof name === 'string' && name.trim()) || ed.UNTITLED_PROJECT_NAME,
      createdAt: ed.todayStr(),
    };
    projectsList().push(project);
    return project;
  }

  // Doesn't save. Run after anything that can take a project's last shoot
  // away (deleting a shoot, taking one out, moving one to another project).
  function pruneEmptyProjects() {
    ed.state.projects = ed.projectsWithMembers(projectsList(), ed.state.shoots);
  }

  // Puts a shoot in a project ('' takes it out), replacing the shoot object
  // the same way every other shoot edit does. Every later save keeps it:
  // autosaveShoot spreads the old shoot under the form's data, and the form
  // never gathers projectId. Then drops any project this left empty. Doesn't
  // save or render. Returns the updated shoot, or null (and changes nothing)
  // when the shoot isn't in state.shoots yet or the project doesn't exist.
  function setShootProject(shootId, projectId) {
    const idx = ed.state.shoots.findIndex(x => x.id === shootId);
    if (idx === -1) return null;
    if (projectId && !findProject(projectId)) return null;
    const prev = ed.state.shoots[idx];
    // A shoot that changes projects (or leaves one) is no longer one of a
    // multi-day project's following days — it never follows another lead.
    const moving = (prev.projectId || '') !== (projectId || '');
    ed.state.shoots[idx] = { ...prev, projectId: projectId || '', ...(moving ? { followsLead: false } : {}) };
    pruneEmptyProjects();
    return ed.state.shoots[idx];
  }
};
