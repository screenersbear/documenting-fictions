// The daily report's fun facts.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addNoticesFunFacts = function addNoticesFunFacts(ed) {
  Object.assign(ed, { pickRandomFunFact });
  // Builds every fun fact that's actually TRUE for this user's real data
  // right now (never a fabricated stat) — category comparisons, talent and
  // location repeats, and tag/role frequencies all expand into many possible
  // strings on their own, so the realistic pool of variations this can
  // produce runs well past a hundred as a user's history grows.
  function computeFunFacts() {
    const facts = [];
    const shoots = ed.state.shoots;
    const now = new Date();
    const count = (pred) => shoots.filter(pred).length;

    const totalCount = shoots.length;
    if (totalCount > 0) facts.push(`You've logged ${totalCount} shoot${totalCount === 1 ? '' : 's'} total.`);

    // Shoot days come from scheduledShootDate throughout: a postponed or
    // canceled shoot's kept date is only what was originally planned.
    const thisYearCount = count(s => ed.scheduledShootDate(s) && ed.parseShootDate(s.date).getFullYear() === now.getFullYear());
    if (thisYearCount > 0) facts.push(`You've planned ${thisYearCount} shoot${thisYearCount === 1 ? '' : 's'} so far this year.`);

    // Only counts shoots that actually happened (captured or later) — a
    // shoot merely dated/scheduled for this month but still in planning
    // shouldn't count toward "shoots this month".
    const thisMonthCount = count(s => s.date && ed.POST_CAPTURE_STATUSES.includes(s.status) && ed.parseShootDate(s.date).getFullYear() === now.getFullYear() && ed.parseShootDate(s.date).getMonth() === now.getMonth());
    if (thisMonthCount > 0) facts.push(`You've had ${thisMonthCount} shoot${thisMonthCount === 1 ? '' : 's'} this month.`);

    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthCount = count(s => s.date && ed.POST_CAPTURE_STATUSES.includes(s.status) && ed.parseShootDate(s.date).getFullYear() === lastMonthDate.getFullYear() && ed.parseShootDate(s.date).getMonth() === lastMonthDate.getMonth());
    if (thisMonthCount > lastMonthCount && lastMonthCount > 0) facts.push(`You've shot ${thisMonthCount - lastMonthCount} more time${(thisMonthCount - lastMonthCount) === 1 ? '' : 's'} this month than last.`);
    if (lastMonthCount > thisMonthCount && lastMonthCount > 0) facts.push(`Last month you had ${lastMonthCount} shoot${lastMonthCount === 1 ? '' : 's'}, busier than this month so far.`);

    const deliveredCount = count(s => s.status === 'delivered');
    if (deliveredCount > 0) facts.push(`You've delivered ${deliveredCount} shoot${deliveredCount === 1 ? '' : 's'}.`);

    const archivedCount = count(s => s.archived);
    if (archivedCount > 0) facts.push(`You've archived ${archivedCount} completed shoot${archivedCount === 1 ? '' : 's'}.`);

    const activeCount = count(s => !s.archived);
    if (activeCount > 0) facts.push(`You currently have ${activeCount} active shoot${activeCount === 1 ? '' : 's'} in the pipeline.`);

    // Streaks: shot every day this past week, and the longest run ever.
    const shotDates = new Set(shoots.filter(s => s.date && ed.POST_CAPTURE_STATUSES.includes(s.status)).map(s => s.date));
    let allLast7 = shotDates.size > 0;
    for (let i = 0; i < 7 && allLast7; i++) {
      const d = new Date(now); d.setDate(now.getDate() - i);
      if (!shotDates.has(ed.formatDate(d))) allLast7 = false;
    }
    if (allLast7) facts.push("You shot every day this past week!");

    if (shotDates.size > 0) {
      const sortedDates = [...shotDates].sort();
      let longest = 1, current = 1;
      for (let i = 1; i < sortedDates.length; i++) {
        const diff = Math.round((ed.parseShootDate(sortedDates[i]) - ed.parseShootDate(sortedDates[i - 1])) / 86400000);
        current = diff === 1 ? current + 1 : 1;
        longest = Math.max(longest, current);
      }
      if (longest >= 3) facts.push(`Your longest shooting streak is ${longest} days in a row.`);
    }

    const pastDates = shoots.filter(s => ed.scheduledShootDate(s) && s.date <= ed.todayStr()).map(s => s.date).sort();
    if (pastDates.length) {
      const daysSince = Math.round((now - ed.parseShootDate(pastDates[pastDates.length - 1])) / 86400000);
      if (daysSince > 0) facts.push(`It's been ${daysSince} day${daysSince === 1 ? '' : 's'} since your last shoot.`);
      facts.push(`Your very first logged shoot was on ${ed.prettyDate(pastDates[0])}.`);
    }

    // Category comparisons — every pair where one category outnumbers another.
    // Only categories with a known plural label qualify: this naturally
    // excludes shoots with no category set, and guards against stale
    // category keys left over from a since-renamed/removed option, either of
    // which would otherwise render as literal "undefined" in the sentence.
    const catCounts = {};
    shoots.forEach(s => { if (s.category) catCounts[s.category] = (catCounts[s.category] || 0) + 1; });
    const catEntries = Object.entries(catCounts).filter(([cat]) => ed.CATEGORY_PLURAL_LABELS[cat]);
    catEntries.forEach(([catA, nA]) => {
      catEntries.forEach(([catB, nB]) => {
        if (catA !== catB && nA > nB) {
          facts.push(`You've shot more ${ed.CATEGORY_PLURAL_LABELS[catA]} than ${ed.CATEGORY_PLURAL_LABELS[catB]}: ${nA} vs ${nB}.`);
        }
      });
    });
    if (catEntries.length) {
      const [topCat, topN] = catEntries.sort((a, b) => b[1] - a[1])[0];
      facts.push(`${ed.CATEGORY_LABELS[topCat]} is your most-photographed category, with ${topN} shoot${topN === 1 ? '' : 's'}.`);
    }

    const teamCount = count(s => s.teamRequired === 'yes');
    if (teamCount > 0) facts.push(`${teamCount} of your shoots have needed a team.`);

    const roleCounts = {};
    // A solo shoot's team list is kept but hidden, so it isn't counted.
    shoots.forEach(s => (s.teamRequired === 'yes' ? (s.teamMembers || []) : []).forEach(tm => { if (tm.role) roleCounts[tm.role] = (roleCounts[tm.role] || 0) + 1; }));
    const roleEntries = Object.entries(roleCounts);
    if (roleEntries.length) {
      const [topRole] = roleEntries.sort((a, b) => b[1] - a[1])[0];
      const roleLabel = (ed.TEAM_ROLE_OPTIONS.find(([v]) => v === topRole) || [])[1] || topRole;
      facts.push(`${roleLabel} is the team role you book most often.`);
    }

    const moodboardDone = count(s => s.moodboardComplete && !ed.isVideoShoot(s));
    if (moodboardDone > 0) facts.push(`${moodboardDone} of your shoots have a finished mood board.`);
    const storyboardDone = count(s => s.moodboardComplete && ed.isVideoShoot(s));
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
    shoots.forEach(s => { if (ed.scheduledShootDate(s)) dowCounts[ed.parseShootDate(s.date).getDay()]++; });
    const maxDow = dowCounts.indexOf(Math.max(...dowCounts));
    if (dowCounts[maxDow] > 0) facts.push(`${DOW_NAMES[maxDow]} is your most common shoot day.`);

    const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const monthCounts = new Array(12).fill(0);
    shoots.forEach(s => { if (ed.scheduledShootDate(s)) monthCounts[ed.parseShootDate(s.date).getMonth()]++; });
    const maxMonth = monthCounts.indexOf(Math.max(...monthCounts));
    if (monthCounts[maxMonth] > 0) facts.push(`${MONTH_NAMES[maxMonth]} is historically your busiest shoot month.`);

    // Captured as things stand: one stepped back a status keeps capturedAt,
    // but its (hidden) reflection isn't counted either way.
    const capturedShoots = shoots.filter(s => s.capturedAt && ed.isPostCaptureStatus(s.status));
    if (capturedShoots.length > 0) {
      const reflectedCount = capturedShoots.filter(s => ed.hasText(s.whatWentRight) || ed.hasText(s.couldBeBetter) || ed.hasText(s.lessonsLearned)).length;
      facts.push(`You've completed post-shoot reflections for ${Math.round((reflectedCount / capturedShoots.length) * 100)}% of your captured shoots.`);
    }

    // (No Journal facts: the Journal is the Weekly tab now, the weekly log.)

    const locCounts = {};
    const locLabels = {};
    shoots.forEach(s => {
      if (ed.isLocationBlank(s.location)) return;
      const key = ed.locationKey(s.location);
      locCounts[key] = (locCounts[key] || 0) + 1;
      locLabels[key] = ed.formatLocationDisplay(s.location);
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

    const editingCount = count(s => ed.isInTheEditStatus(s.status));
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
};
