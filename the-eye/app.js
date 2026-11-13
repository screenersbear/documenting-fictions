// The Eye starts here. Each part of the app is a file in pages/, components/
// or data/ (files.txt joins them in before this one); this sets them up, in order.
(() => {
  const ed = {}; // what the app's parts share (each part's file adds its own)
  Object.assign(ed, { lookTagsOn, applyLookTags });
  // Needed from the start (only functions and fixed values, so they can run first):
  window.EyeParts.addDates(ed);
  window.EyeParts.addRowWords(ed);
  window.EyeParts.addShootStage(ed);
  window.EyeParts.addHelpers(ed);
  // iOS Safari only computes :active styles on elements it thinks have a
  // touch listener — this no-op unlocks tap-flash feedback app-wide.
  document.body.addEventListener('touchstart', () => {}, false);

  // Visual language and framework tags (App options): hidden on the shoot
  // page, and left out of Stats, unless turned on (since 11-12). The tags
  // already on a shoot are kept either way.
  const LOOK_TAGS_ON_KEY = 'dailies_look_tags_on_v1'; ed.LOOK_TAGS_ON_KEY = LOOK_TAGS_ON_KEY;
  function lookTagsOn() {
    try { return localStorage.getItem(LOOK_TAGS_ON_KEY) === '1'; } catch (e) { return false; }
  }
  function applyLookTags() {
    document.documentElement.classList.toggle('no-look-tags', !lookTagsOn());
  }
  applyLookTags();
  window.EyeParts.addHeldUpright(ed);
  window.EyeParts.addShootKinds(ed);
  window.EyeParts.addRegions(ed);
  window.EyeParts.addLocations(ed);
  window.EyeParts.addCategories(ed);
  window.EyeParts.addDefaultState(ed);
  window.EyeParts.addMigrate(ed);
  window.EyeParts.addLoad(ed);
  window.EyeParts.addSave(ed);

  ed.refreshStickers = () => {}; // set up with the sun menu
  ed.relayStickers = () => {}; // the same: the folds are worked out in pixels
  ed.state = ed.loadState();
  ed.applyAppColor(ed.state.presentation.color);
  window.EyeParts.addShootRow(ed);
  window.EyeParts.addProjectGroups(ed);
  window.EyeParts.addImageStore(ed);
  window.EyeParts.addPhotoStore(ed);
  window.EyeParts.addAppMenuStorageUsage(ed);
  window.EyeParts.addProjects(ed);
  window.EyeParts.addMultiDayMirroring(ed);
  window.EyeParts.addShootCopies(ed);
  window.EyeParts.addImageResize(ed);
  window.EyeParts.addPageTurn(ed);
  window.EyeParts.addLastPlace(ed);
  window.EyeParts.addScreenSize(ed);
  window.EyeParts.addScreenPages(ed);
  window.EyeParts.addPagePan(ed);
  window.EyeParts.addFirstTimeIntros(ed);
  window.EyeParts.addAppMenuPhotographer(ed);
  window.EyeParts.addSwatchIntro(ed);
  window.EyeParts.addOverview(ed);
  window.EyeParts.addProjectsProjectPopup(ed);
  window.EyeParts.addOverviewDrawOverview(ed);
  window.EyeParts.addOverviewTodayCard(ed);
  window.EyeParts.addOverviewNextShoot(ed);
  window.EyeParts.addShootsShootLog(ed);
  window.EyeParts.addArchive(ed);
  window.EyeParts.addArchiveList(ed);
  window.EyeParts.addJournal(ed);
  window.EyeParts.addJournalCards(ed);
  window.EyeParts.addJournalList(ed);
  window.EyeParts.addJournalContents(ed);
  window.EyeParts.addJournalWeeklyLog(ed);
  window.EyeParts.addJournalEntryOptions(ed);
  window.EyeParts.addJournalEntryPage(ed);
  window.EyeParts.addJournalStartingPrompt(ed);
  window.EyeParts.addShootFrameworkTags(ed);
  window.EyeParts.addShootKnownContacts(ed);
  window.EyeParts.addShootTalents(ed);
  window.EyeParts.addShootOverthoughtsNotes(ed);
  window.EyeParts.addShootPastTalents(ed);
  window.EyeParts.addShootTalentPopup(ed);
  window.EyeParts.addShootTeam(ed);
  window.EyeParts.addShootTeamMemberPopup(ed);
  window.EyeParts.addShootFields(ed);
  window.EyeParts.addShootShotList(ed);
  window.EyeParts.addDragReorder(ed);
  window.EyeParts.addShootLightingSuggestions(ed);
  window.EyeParts.addShootLighting(ed);
  window.EyeParts.addShootLocation(ed);
  window.EyeParts.addShootReferences(ed);
  window.EyeParts.addShootTimeRange(ed);
  window.EyeParts.addShootConceptFields(ed);
  window.EyeParts.addShootExpandField(ed);
  window.EyeParts.addShootAfterStatus(ed);
  window.EyeParts.addShootDeadlinePrompt(ed);
  window.EyeParts.addShootStatusOptions(ed);
  window.EyeParts.addShootPage(ed);
  window.EyeParts.addShootTitleJump(ed);
  window.EyeParts.addShootChapterPages(ed);
  window.EyeParts.addShootChapter(ed);
  window.EyeParts.addNewShootWizardSteps(ed);
  window.EyeParts.addNewShootGuideChapters(ed);
  window.EyeParts.addNewShootWizard(ed);
  window.EyeParts.addNewShootWizardEnd(ed);
  window.EyeParts.addConceptHelperHelper(ed);
  window.EyeParts.addConceptHelperHelperSteps(ed);
  window.EyeParts.addConceptHelperHelperOutput(ed);
  window.EyeParts.addReflectionHelperHelper(ed);
  window.EyeParts.addShootOpen(ed);
  window.EyeParts.addShootMoodboard(ed);
  window.EyeParts.addImageViewer(ed);
  window.EyeParts.addProjectsPhotoCrop(ed);
  window.EyeParts.addImageViewerTouch(ed);
  window.EyeParts.addShootFinalImages(ed);
  window.EyeParts.addShootSave(ed);
  window.EyeParts.addShootNotSure(ed);
  window.EyeParts.addShootMultiDay(ed);
  window.EyeParts.addShootMultiDayPrompt(ed);
  window.EyeParts.addShootClose(ed);
  window.EyeParts.addShootOptions(ed);
  window.EyeParts.addShootOptionsChangeTitle(ed);
  window.EyeParts.addShootOptionsChangePhoto(ed);
  window.EyeParts.addShootOptionsChangeDeadline(ed);
  window.EyeParts.addShootOptionsChangeStatus(ed);
  window.EyeParts.addShootOptionsAddToProject(ed);
  // The shoot's page in the round 2 look: front page, cards, next step, status.
  window.EyeParts.addShootFront(ed);
  window.EyeParts.addShootFrontCards(ed);
  window.EyeParts.addShootStageCards(ed);
  window.EyeParts.addShootReportCards(ed);
  window.EyeParts.addShootNextStep(ed);
  window.EyeParts.addShootStatusSheet(ed);
  window.EyeParts.addToast(ed);
  window.EyeParts.addConfirm(ed);
  window.EyeParts.addLoadLib(ed);
  window.EyeParts.addPdfHelpers(ed);
  window.EyeParts.addPdfShootPdf(ed);
  window.EyeParts.addPdfSections(ed);
  window.EyeParts.addPdfPreview(ed);
  window.EyeParts.addPdfViewer(ed);
  window.EyeParts.addPdfViewerOpen(ed);
  window.EyeParts.addJournalEntryPdf(ed);
  window.EyeParts.addPdfExportPicker(ed);
  window.EyeParts.addPdfArchiveImages(ed);
  window.EyeParts.addPdfArchivePdf(ed);
  window.EyeParts.addPdfArchiveExport(ed);
  window.EyeParts.addPdfAfterExport(ed);
  window.EyeParts.addAppMenuFrameworks(ed);
  window.EyeParts.addAppMenuCategoryVisibility(ed);
  window.EyeParts.addModalClose(ed);
  window.EyeParts.addAppMenuLookChoices(ed);
  window.EyeParts.addAppMenu(ed);
  window.EyeParts.addAppMenuSavedLists(ed);
  window.EyeParts.addTour(ed);
  window.EyeParts.addAppMenuOptions(ed);
  window.EyeParts.addAppMenuDeleteAll(ed);
  window.EyeParts.addAppMenuBackup(ed);
  window.EyeParts.addAppMenuRestore(ed);
  window.EyeParts.addStatsWords(ed);
  window.EyeParts.addStatsTab(ed);
  window.EyeParts.addStatsRegionsMap(ed);
  window.EyeParts.addStatsPages(ed);
  window.EyeParts.addRenderAll(ed);
  window.EyeParts.addNoticesReportDay(ed);
  window.EyeParts.addShootModeShotList(ed);
  window.EyeParts.addShootMode(ed);
  window.EyeParts.addShootModePages(ed);
  window.EyeParts.addShootModeClock(ed);
  window.EyeParts.addShootModeGoldenHour(ed);
  window.EyeParts.addShootModeLastTime(ed);
  window.EyeParts.addNewShootLastTimeNotes(ed);
  window.EyeParts.addShootModeQuickReview(ed);
  window.EyeParts.addShootModeWildCard(ed);
  window.EyeParts.addNoticesShootDay(ed);
  window.EyeParts.addNoticesDailyReport(ed);
  window.EyeParts.addNoticesFunFacts(ed);
  window.EyeParts.addNoticesDailyReportShow(ed);
  window.EyeParts.addNoticesMondayBrief(ed);
  window.EyeParts.addJournalRestoreDraft(ed);
  window.EyeParts.addBottomBar(ed);
  window.EyeParts.addNotebook(ed);
  window.EyeParts.addSunMenu(ed);
  window.EyeParts.addOffline(ed);
  window.EyeParts.addPullToRefresh(ed);
  window.EyeParts.addSwipeTabs(ed);
  window.EyeParts.addNavigator(ed);
  window.EyeParts.addBand(ed);
})();
