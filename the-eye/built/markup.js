// Made by tools/join.mjs from the files listed in files.txt. Never edit it: change those files, then run node tools/join.mjs.
(function () {
  var here = document.currentScript;
  here.insertAdjacentHTML('beforebegin', `<div id="app">

  <!-- ============ OVERVIEW ============ -->
  <section id="view-overview" class="view">
    <!-- The band (styles/header-band.css): the title, its buttons (the notebooks button only in the suite), the rising mark and the label line (components/band.js writes the date). -->
    <header class="band">
      <h1 class="band-title">The Eye</h1>
      <div class="band-btns"><button type="button" class="ring-btn band-books" id="shutBookBtn" aria-label="Back to your notebooks"><span><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="4.5" height="14" rx="1"/><rect x="9.5" y="3" width="4.5" height="16" rx="1"/><path d="M16 6.2l3.6-1 3 12.6-3.6 1z"/></svg></span></button><button type="button" class="ring-btn" id="appMenuBtn" aria-label="Options"><span><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg></span></button></div>
      <svg class="band-mark" viewBox="0 0 80 40" aria-hidden="true"><circle cx="40" cy="40" r="35" fill="none" stroke-width="10"/><circle cx="40" cy="40" r="13.3"/></svg>
      <p class="band-line"><b>Overview</b><span class="band-rule"></span><span class="band-date"></span></p>
    </header>

    <!-- The Today card (pages/overview/today-card.js): only what needs you now, in place of the pop-ups that opened on launch: the two most urgent, then N MORE IN TODAY'S REPORT with how many in all at the top; with two or fewer, FULL REPORT at the top instead (the band's bell went on 14 Nov). Hidden when there's nothing. -->
    <div class="today-card" id="todayCard" hidden>
      <div class="today-card-head"><h2>Today</h2><span class="today-count" id="todayCount"></span><button type="button" class="today-report" id="todayReportBtn" hidden>Full report<svg viewBox="0 0 24 24" width="11" height="11" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg></button></div>
      <div id="todayCardItems"></div>
      <button type="button" class="today-more" id="todayMoreBtn" hidden><span id="todayMoreWords"></span><span class="today-more-dots" id="todayMoreDots" aria-hidden="true"></span></button>
    </div>

    <!-- The next shoot coming up, as a card (pages/overview/next-shoot.js). -->
    <div class="section-block" id="nextShootSection" hidden>
      <h2>Next shoot</h2>
      <div id="nextShootCard"></div>
    </div>

    <div class="section-block" id="upcomingSection">
      <h2>Upcoming shoots <span id="upcomingCount"></span></h2>
      <div id="upcomingShootsList" class="mini-list"></div>
    </div>

    <div class="section-block" id="proofsPendingSection">
      <h2>Proofs pending <span id="proofsPendingCount"></span></h2>
      <div id="proofsPendingShootsList" class="mini-list"></div>
    </div>

    <div class="section-block" id="upcomingDeadlinesSection">
      <h2>Upcoming deadlines <span id="upcomingDeadlinesCount"></span></h2>
      <div id="upcomingDeadlinesShootsList" class="mini-list"></div>
    </div>
  </section>

  <!-- ============ SHOOT LOG ============ -->
  <section id="view-shoots" class="view" hidden>
    <!-- The band (styles/header-band.css): the title, its buttons (the notebooks button only in the suite), the rising mark and the label line (components/band.js writes the date). -->
    <header class="band">
      <h1 class="band-title">Shoots</h1>
      <div class="band-btns"><button type="button" class="ring-btn band-books" aria-label="Back to your notebooks"><span><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="4.5" height="14" rx="1"/><rect x="9.5" y="3" width="4.5" height="16" rx="1"/><path d="M16 6.2l3.6-1 3 12.6-3.6 1z"/></svg></span></button><button type="button" class="ring-btn band-options" aria-label="Options"><span><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg></span></button></div>
      <svg class="band-mark" viewBox="0 0 80 40" aria-hidden="true"><circle cx="40" cy="40" r="35" fill="none" stroke-width="10"/><circle cx="40" cy="40" r="13.3"/></svg>
      <p class="band-line"><b>The Eye</b><span class="band-rule"></span><span class="band-date"></span></p>
    </header>
    <!-- The list's head: the sort (a text button that opens its choices), how many shoots there are and NEW SHOOT beside it (14 Nov: adding sits beside its list, not in the band). -->
    <div class="list-head">
      <button type="button" class="list-sort-btn" id="shootSortToggle">Sort: Status</button>
      <span class="list-head-end"><span class="list-count" id="shootCount"></span><button type="button" class="list-add-btn" id="addShootBtn"><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>New shoot</button></span>
    </div>
    <div class="filters" id="shootSortOptions" hidden>
      <button type="button" class="chip active" data-sort="status">Status</button>
      <button type="button" class="chip" data-sort="shoot_date">Shoot date</button>
      <button type="button" class="chip" data-sort="category">Category</button>
    </div>
    <div id="shootList" class="mini-list"></div>
    <p class="empty-state" id="shootEmpty" hidden>No shoots logged yet.</p>
  </section>

  <!-- ============ ARCHIVE ============ -->
  <section id="view-archive" class="view" hidden>
    <!-- The band (styles/header-band.css): the title, its buttons (the notebooks button only in the suite), the rising mark and the label line (components/band.js writes the date). -->
    <header class="band">
      <h1 class="band-title">Archive</h1>
      <div class="band-btns"><button type="button" class="ring-btn band-books" aria-label="Back to your notebooks"><span><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="4.5" height="14" rx="1"/><rect x="9.5" y="3" width="4.5" height="16" rx="1"/><path d="M16 6.2l3.6-1 3 12.6-3.6 1z"/></svg></span></button><button type="button" class="ring-btn band-options" aria-label="Options"><span><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg></span></button></div>
      <svg class="band-mark" viewBox="0 0 80 40" aria-hidden="true"><circle cx="40" cy="40" r="35" fill="none" stroke-width="10"/><circle cx="40" cy="40" r="13.3"/></svg>
      <p class="band-line"><b>The Eye</b><span class="band-rule"></span><span class="band-date"></span></p>
    </header>
    <div class="archive-slideshow" id="archiveSlideshow">
      <p class="archive-slideshow-empty" id="archiveSlideshowEmpty" hidden>final images shown here</p>
    </div>
    <!-- Under the photo: the shoot it's from (pages/archive/archive.js). -->
    <p class="archive-caption" id="archiveCaption" hidden><span id="archiveCaptionLabel"></span><span id="archiveCaptionName"></span></p>
    <!-- Kept for the filter code; the chips under it are always out now, so it isn't shown (styles/archive-list.css). -->
    <button type="button" class="filter-toggle" id="archiveFilterToggle" hidden>Filter: All</button>
    <div class="filters" id="archiveFilters"></div>
    <div id="archiveList" class="card-list"></div>
    <p class="empty-state" id="archiveEmpty" hidden>No completed shoots yet.</p>
  </section>

  <!-- ============ JOURNAL ============ -->
  <section id="view-journal" class="view" hidden>
    <!-- The band (styles/header-band.css): the title, its buttons (the notebooks button only in the suite), the rising mark and the label line (components/band.js writes the date). -->
    <header class="band">
      <h1 class="band-title" id="journalTitle">Reflections</h1>
      <div class="band-btns"><button type="button" class="ring-btn band-books" aria-label="Back to your notebooks"><span><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="4.5" height="14" rx="1"/><rect x="9.5" y="3" width="4.5" height="16" rx="1"/><path d="M16 6.2l3.6-1 3 12.6-3.6 1z"/></svg></span></button><button type="button" class="ring-btn band-options" aria-label="Options"><span><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg></span></button></div>
      <svg class="band-mark" viewBox="0 0 80 40" aria-hidden="true"><circle cx="40" cy="40" r="35" fill="none" stroke-width="10"/><circle cx="40" cy="40" r="13.3"/></svg>
      <p class="band-line"><b>The Eye</b><span class="band-rule"></span><span class="band-date"></span></p>
    </header>

    <p class="list-intro">Fills in on its own. Each week collects the lessons from the shoots you reflected on.</p>
    <div class="journal-toolbar">
      <button type="button" class="filter-toggle" id="journalTocBtn">Table of contents</button>
      <button type="button" class="filter-toggle" id="journalFilterToggle">Filter: All</button>
      <button class="icon-btn" id="addJournalBtn" aria-label="Add entry">+</button>
    </div>
    <div class="filters" id="journalFilters" hidden></div>
    <div id="journalList" class="card-list"></div>
    <p class="empty-state" id="journalEmpty" hidden></p>

    <button type="button" class="scroll-top-btn" id="journalScrollTopBtn" aria-label="Scroll to top" hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>
    </button>
  </section>

  <!-- ============ STATS ============ -->
  <section id="view-stats" class="view" hidden>
    <!-- The band (styles/header-band.css): the title, its buttons (the notebooks button only in the suite), the rising mark and the label line (components/band.js writes the date). -->
    <header class="band">
      <h1 class="band-title">Stats</h1>
      <div class="band-btns"><button type="button" class="ring-btn band-books" aria-label="Back to your notebooks"><span><svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="4.5" height="14" rx="1"/><rect x="9.5" y="3" width="4.5" height="16" rx="1"/><path d="M16 6.2l3.6-1 3 12.6-3.6 1z"/></svg></span></button><button type="button" class="ring-btn band-options" aria-label="Options"><span><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg></span></button></div>
      <svg class="band-mark" viewBox="0 0 80 40" aria-hidden="true"><circle cx="40" cy="40" r="35" fill="none" stroke-width="10"/><circle cx="40" cy="40" r="13.3"/></svg>
      <p class="band-line"><b>The Eye</b><span class="band-rule"></span><span class="band-date"></span></p>
    </header>
    <!-- One chart per page (pages/stats/stats-pages.js): the year at the
         left, which chart this is at the right; a swipe inside changes it. -->
    <div class="stats-head">
      <button type="button" class="stats-year-btn" id="statsYearFilterToggle">2026</button>
      <p class="stats-count"><span id="statsPageCount"></span><span class="stats-dots" id="statsDots" aria-hidden="true"></span></p>
    </div>
    <div class="filters" id="statsYearFilters" hidden></div>
    <div class="stats-carousel" id="statsCarousel"></div>
    <p class="stats-swipe-hint" id="statsSwipeHint" hidden></p>
    <div id="statsFunFact" class="stats-fun-fact" hidden></div>
  </section>

  <!-- ============ THE SECTION BAR (styles/tab-bar.css): a mark and a name for each section ============ -->
  <nav class="tabbar">
    <button class="tab active" data-view="overview">
      <span class="tab-icon">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle class="mk-line" cx="12" cy="12" r="10.5" fill="none" stroke-width="3"/><circle class="mk-b" cx="12" cy="12" r="4"/></svg>
      </span><span>Overview</span>
    </button>
    <button class="tab" data-view="shoots">
      <span class="tab-icon">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path class="mk-a" d="M0 12A12 12 0 0 1 24 12Z"/><path class="mk-b" d="M0 12A12 12 0 0 0 24 12Z"/></svg>
      </span><span>Shoots</span>
    </button>
    <button class="tab" data-view="journal">
      <span class="tab-icon">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle class="mk-a" cx="12" cy="12" r="12"/><path class="mk-b" d="M12 12L12 0A12 12 0 0 1 24 12Z"/></svg>
      </span><span>Reflections</span>
    </button>
    <button class="tab" data-view="archive">
      <span class="tab-icon">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle class="mk-line" cx="12" cy="12" r="9" fill="none" stroke-width="6"/><circle class="mk-b" cx="12" cy="12" r="3"/></svg>
      </span><span>Archive</span>
    </button>
    <button class="tab" data-view="stats">
      <span class="tab-icon">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle class="mk-b" cx="12" cy="12" r="12"/><path class="mk-a" d="M12 0H12A12 12 0 0 1 22.39 6H1.61A12 12 0 0 1 12 0ZM0.06 10.8H23.94A12 12 0 0 1 23.71 14.64H0.29A12 12 0 0 1 0.06 10.8ZM1.45 17.71H22.55A12 12 0 0 1 20.79 20.17H3.21A12 12 0 0 1 1.45 17.71ZM5.58 22.14H18.42A12 12 0 0 1 12 24H12A12 12 0 0 1 5.58 22.14Z"/></svg>
      </span><span>Stats</span>
    </button>
  </nav>

  <!-- The page's card edge. Fixed over the scrolling view: the hole in the
       middle is the page, so the window itself still does the scrolling. -->
  <div class="nb-board"><div class="nb-board-page" aria-hidden="true"></div><div class="nb-screen-foot"><button type="button" class="nb-page-step" id="nbScreenPrev" aria-label="Previous page"></button><span id="nbScreenNum"></span><button type="button" class="nb-page-step" id="nbScreenNext" aria-label="Next page"></button></div></div>
  <nav class="nb-screen-tabs" aria-label="Sections of the notebook"><button type="button" class="y" data-view="overview"><span>Overview</span></button><button type="button" class="n" data-view="shoots"><span>Shoots</span></button><button type="button" class="y" data-view="journal"><span>Reflections</span></button><button type="button" class="n" data-view="archive"><span>Archive</span></button><button type="button" class="y" data-view="stats"><span>Stats</span></button></nav>
</div>

<!-- ============ THE NOTEBOOK ============ -->
<!-- First of the popups, so every other popup (App options above all) opens
     over it. Its sheets and side tabs are drawn by setupNotebook in app.js. -->
<div id="bookOverlay" class="modal-overlay book-overlay" hidden>
  <div class="nb closed no-anim" id="book">
    <div class="nb-ground"></div>
    <div class="nb-float">
      <div class="nb-spin" id="bookSpin">
      <div class="nb-book">
        <div class="nb-stack" id="bookStack"></div>
        <div class="nb-sides" aria-hidden="true"><i class="nb-side-spine"></i><i class="nb-side-top"></i><i class="nb-side-bottom"></i></div>
        <div class="nb-side-tabs" id="bookSideTabs"></div>
        <div class="nb-block"></div>
        <div class="nb-leaf">
          <div class="nb-front"><div class="nb-stickers" id="bookStickers"></div></div>
          <div class="nb-wraps" id="bookWraps" aria-hidden="true"></div>
          <div class="nb-inside"><div class="nb-words"><span class="nb-word">Overview</span></div></div>
        </div>
        <div class="nb-right-page" id="bookRightPage"></div>
        <div class="nb-divider">
          <div class="nb-divider-face" id="bookDividerFace"><div class="nb-words"><span class="nb-word" id="bookDividerTitle"></span></div></div>
        </div>
      </div>
      </div>
    </div>
    <button type="button" class="nb-hit nb-hit-book" id="bookOpenHit" aria-label="Open the notebook"></button>
    <div id="bookTabHits"></div>
    <button type="button" class="nb-sun" id="bookSunBtn" aria-label="App options"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/></svg></button>
    <div class="nb-sticker-stage" id="stickerStage" hidden>
      <button type="button" class="nb-sticker-ok" id="stickerOkBtn">Okay</button>
    </div>
    <div class="nb-crop" id="stickerCrop" hidden>
      <img class="nb-crop-photo" id="stickerCropPhoto" alt="" draggable="false" />
      <div class="nb-crop-window" id="stickerCropWindow"></div>
      <p class="nb-crop-hint">Move and pinch to fit</p>
      <div class="nb-crop-actions">
        <button type="button" class="nb-crop-back" id="stickerCropBack">Back</button>
        <button type="button" class="nb-crop-ok" id="stickerCropOk">Okay</button>
      </div>
    </div>
  </div>
</div>

<!-- ============ SHOOT MODAL ============ -->
<div id="shootModalOverlay" class="modal-overlay" hidden>
  <div class="nb-chapter-board" aria-hidden="true"></div>
  <div class="modal">
    <p class="nb-run" id="nbShootRun"></p>
    <div class="modal-header shoot-modal-header">
      <h2 class="modal-title-jump-wrap">
        <button type="button" class="modal-title-jump-btn" id="shootModalTitleBtn">
          <span id="shootModalTitle">Log a Shoot</span>
          <svg class="modal-title-jump-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
        <div class="modal-title-jump-menu" id="shootModalJumpMenu" hidden>
          <button type="button" class="modal-title-jump-item" data-jump="basicInfoHeading">Basic Info</button>
          <button type="button" class="modal-title-jump-item" data-jump="logisticsHeading">Logistics</button>
          <button type="button" class="modal-title-jump-item" data-jump="teamHeading">Team</button>
          <button type="button" class="modal-title-jump-item" data-jump="directionHeading">Direction</button>
          <button type="button" class="modal-title-jump-item" data-jump="visualsHeading">Visuals</button>
          <button type="button" class="modal-title-jump-item" data-jump="shotListHeading">Shot list</button>
          <button type="button" class="modal-title-jump-item" data-jump="postShootHeading" id="jumpToPostShootItem">Reflection</button>
        </div>
      </h2>
      <div class="modal-header-actions">
        <button type="button" class="icon-btn" id="shootTourBtn" aria-label="Guide me through this shoot">?</button>
        <button type="button" class="icon-btn share-shoot-btn" id="shareShootBtn" aria-label="Share as PDF" hidden>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V4"/><path d="M7.5 8.5 12 4l4.5 4.5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>
        </button>
        <button class="icon-btn close-btn" data-close="shoot"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
      </div>
    </div>
    <button type="button" class="enter-shoot-mode-btn shine-sweep" id="enterShootModeBtn" hidden>shoot mode</button>
    <!-- The shoot's page in the round 2 look (styles/shoot-band.css, shoot-front.css). The compact band: Back, where it was opened from (or, on a part of the page, the shoot's name) and More. Then the front page (pages/shoot/shoot-front.js): the name, when and where, the status as a card that opens Change status (pages/shoot/status-card.js), the cards for what this stage needs, and The details: a row for each part of the form below, which opens that part on a page of its own. -->
    <header class="band shoot-band">
      <button type="button" class="ring-btn" id="shootBandBack" aria-label="Back"><span><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg></span></button>
      <p class="band-line shoot-band-line"><b id="shootBandPlace">Shoots</b><span class="band-rule"></span></p>
      <button type="button" class="ring-btn" id="shootBandMore" aria-label="More"><span><svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg></span></button>
    </header>
    <div class="shoot-front" id="shootFront">
      <h1 class="shoot-front-title" id="shootFrontTitle"></h1>
      <div class="shoot-front-when" id="shootFrontWhen"></div>
      <button type="button" class="status-card" id="shootStatusTag" aria-haspopup="dialog">
        <span class="status-card-top"><span class="status-card-label">Status</span><span class="status-card-change">Change <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg></span></span>
        <span class="status-card-name"><span id="shootStatusTagText">Prospect</span><span class="status-card-count" id="shootStatusCount"></span></span>
        <span class="status-card-bars" id="shootStatusBars" aria-hidden="true"></span>
        <span class="status-card-ends" id="shootStatusEnds" aria-hidden="true"></span>
        <span class="status-card-off" id="shootStatusOff" hidden></span>
      </button>
      <div class="shoot-front-cards" id="shootFrontCards"></div>
      <h2 class="front-title">The details</h2>
      <div class="detail-rows" id="shootDetailRows"></div>
    </div>
    <form id="shootForm">
      <svg class="folder-tab-deco tab-fill-yellow" viewBox="0 -90 400 120" preserveAspectRatio="none" aria-hidden="true"><path class="folder-tab-fill" d="M0,4 L192,4 L208,26 L400,26 L400,-90 L0,-90 Z"/><path class="folder-tab-line" d="M0,4 L192,4 L208,26 L400,26"/></svg>
      <h3 class="shoot-section-heading status-group-heading heading-yellow" id="basicInfoHeading">Basic Info</h3>
      <div id="basicInfoBody">
        <div class="status-swatch-wrap">
          <!-- In the new-shoot guide only (styles/new-shoot-guide-type.css): a "Status" heading over the select itself, like Title and Category. -->
          <span class="status-swatch-label" aria-hidden="true">Status</span>
          <span class="status-swatch-display shine-sweep" id="statusSwatchDisplay" aria-hidden="true">Status: Prospect</span>
          <select id="shootStatus" class="status-swatch-select" aria-label="Status">
            <option value="prospect">Prospect</option>
            <option value="planning">Active planning</option>
            <option value="waiting_to_shoot">Shoot ready</option>
            <option value="captured">Captured</option>
            <option value="waiting_for_selects">Waiting for selects</option>
            <option value="editing">Editing</option>
            <option value="delivered">Delivered</option>
            <option value="rescheduled">Postponed</option>
            <option value="canceled">Canceled</option>
          </select>
        </div>
        <!-- In the new-shoot guide's Basics only (pages/new-shoot/guide-progress.js, styles/guide-progress.css, round 5): how far along the shoot is, so one already done can start as Captured. On the page, the status card does this. -->
        <div class="guide-progress" id="guideProgress">
          <p class="guide-progress-title" id="guideProgressTitle">Shoot progress</p>
          <div class="guide-progress-chips" role="radiogroup" aria-labelledby="guideProgressTitle"><button type="button" role="radio" data-progress="prospect" aria-checked="false"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><polyline points="5 12.5 10 17 19 7"/></svg>Prospect</button><button type="button" role="radio" data-progress="planning" aria-checked="false"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><polyline points="5 12.5 10 17 19 7"/></svg>Active planning</button><button type="button" role="radio" data-progress="waiting_to_shoot" aria-checked="false"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><polyline points="5 12.5 10 17 19 7"/></svg>Shoot ready</button><button type="button" role="radio" data-progress="captured" aria-checked="false"><svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><polyline points="5 12.5 10 17 19 7"/></svg>Captured</button></div>
          <p class="guide-progress-hint">Pick Captured for a shoot you've already done. The later stages are on the shoot page.</p>
        </div>
        <label>Title
          <input type="text" id="shootTitle" maxlength="120" placeholder="Name for the shoot if applicable" />
        </label>
        <label>Category
          <select id="shootCategory" class="bold-select" required>
            <option value="" disabled>Tap here to select</option>
            <option value="branding">Branding</option>
            <option value="commercial">Commercial</option>
            <option value="content_shoot">Content shoot</option>
            <option value="editorial">Editorial</option>
            <option value="engagement">Engagement</option>
            <option value="event">Event</option>
            <option value="family">Family</option>
            <option value="headshot">Headshot</option>
            <option value="lighting_test">Lighting test</option>
            <option value="maternity">Maternity</option>
            <option value="other">Other</option>
            <option value="portfolio_building">Portfolio building</option>
            <option value="publicity">Publicity</option>
            <option value="test_shoot">Test shoot</option>
            <option value="video">Video</option>
            <option value="wedding">Wedding</option>
          </select>
        </label>
        <div class="talents-section">
          <p class="team-question">Talent name(s)</p>
          <button type="button" id="addTalentBtn" class="primary small-btn">+ Add talent</button>
          <input type="file" id="talentPhotoFileInput" accept="image/*" hidden />
          <div id="talentsList" class="team-members-list"></div>
          <!-- Lessons from past shoots with the same talent, and notes about this shoot from Overthoughts (app.js). -->
          <div id="pastLessons" class="past-lessons" hidden></div>
          <div id="shootNotes" class="past-lessons" hidden></div>
        </div>
      </div>
      <svg class="folder-tab-deco" viewBox="0 0 400 30" preserveAspectRatio="none" aria-hidden="true"><path class="folder-tab-fill" d="M0,4 L192,4 L208,26 L400,26 L400,0 L0,0 Z"/><path class="folder-tab-line" d="M0,4 L192,4 L208,26 L400,26"/></svg>
      <h3 class="shoot-section-heading status-group-heading heading-navy" id="logisticsHeading">Logistics</h3>
      <div id="logisticsBody">
        <label>Shoot date
          <input type="date" id="shootDate" />
        </label>
        <!-- Honest answers (pages/shoot/not-sure.js): shown while the date or
             the place is empty, and counted as answered. -->
        <button type="button" class="chip not-sure-chip" id="dateNotSetBtn" aria-pressed="false">Date not set</button>
        <label class="checkbox-row" id="multiDayRow"><input type="checkbox" id="shootMultiDay" /> <span id="multiDayLabel">Multi-day shoot</span></label>
        <label id="multiDayLastDayLabel" hidden>Last day
          <input type="date" id="shootLastDay" />
        </label>
        <label>Deadline
          <input type="date" id="shootDeadline" />
        </label>
        <div class="time-range-row">
          <label>Start time
            <input type="time" id="shootStartTime" step="1800" />
          </label>
          <label>End time
            <input type="time" id="shootEndTime" step="1800" />
          </label>
        </div>
        <div class="time-range-row" id="videoCallTimesRow" hidden>
          <label>Crew call
            <input type="time" id="shootCrewCallTime" step="1800" />
          </label>
          <label>Talent call
            <input type="time" id="shootTalentCallTime" step="1800" />
          </label>
        </div>
        <label>Location
          <button type="button" id="shootLocationBtn" class="location-field-btn">Tap to add location</button>
        </label>
        <button type="button" class="chip not-sure-chip" id="locationNotSetBtn" aria-pressed="false">Location to be decided</button>
        <label>Location directions
          <textarea id="shootLocationDirections" rows="3" maxlength="1000" placeholder="What floor the studio is on, where to park, etc." readonly></textarea>
        </label>
      </div>

      <svg class="folder-tab-deco" viewBox="0 0 400 30" preserveAspectRatio="none" aria-hidden="true"><path class="folder-tab-fill" d="M0,4 L192,4 L208,26 L400,26 L400,0 L0,0 Z"/><path class="folder-tab-line" d="M0,4 L192,4 L208,26 L400,26"/></svg>
      <h3 class="shoot-section-heading status-group-heading heading-yellow" id="teamHeading">Team</h3>
      <div id="teamBody">
        <p class="team-question">Requires team?</p>
        <!-- Named choices in the app's chip look (the picked one filled);
             saved as teamRequired 'no'/'yes' (see setTeamRequiredChoice), or
             "Not sure yet" in notSure (pages/shoot/not-sure.js). In the guide
             they're cards, with the line under each name. -->
        <div class="team-yesno-row">
          <button type="button" class="chip" id="teamRequiredNoBtn" aria-pressed="false"><span class="choice-name">Just me</span><span class="choice-sub">No team for this shoot.</span></button>
          <button type="button" class="chip" id="teamRequiredYesBtn" aria-pressed="false"><span class="choice-name">With a team</span><span class="choice-sub">Add people now or later.</span></button>
          <button type="button" class="chip" id="teamNotSureBtn" aria-pressed="false"><span class="choice-name">Not sure yet</span><span class="choice-sub">Counts as answered. It stays on Getting ready.</span></button>
        </div>
        <p class="field-hint team-finalized-note" id="teamFinalizedNote" hidden>Team finalized</p>
        <div id="teamDetailsBlock" hidden>
          <button type="button" id="addTeamMemberBtn" class="primary small-btn">+ Add team member</button>
          <div id="teamMembersList" class="team-members-list"></div>
          <label class="checkbox-row"><input type="checkbox" id="shootTeamFinalized" /> <span id="teamFinalizedLabel">Team finalized</span></label>
        </div>
      </div>

      <svg class="folder-tab-deco" viewBox="0 0 400 30" preserveAspectRatio="none" aria-hidden="true"><path class="folder-tab-fill" d="M0,4 L192,4 L208,26 L400,26 L400,0 L0,0 Z"/><path class="folder-tab-line" d="M0,4 L192,4 L208,26 L400,26"/></svg>
      <h3 class="shoot-section-heading status-group-heading heading-navy" id="directionHeading">Direction</h3>
      <div id="directionBody">
        <div id="formSection2">
          <label>Shoot goals
            <textarea id="shootGoals" rows="6" maxlength="1000" placeholder="What this shoot needs to accomplish" readonly></textarea>
          </label>

          <div id="videoDeliverablesBlock" hidden>
            <label>Deliverables
              <textarea id="shootDeliverables" rows="3" maxlength="1000" placeholder="How many videos and how long each runs, e.g. 1 x 60s brand film, 3 x 15s cutdowns" readonly></textarea>
            </label>
            <div class="aspect-ratio-field">
              <span class="aspect-ratio-field-label">Aspect ratios</span>
              <div class="tag-group" id="shootAspectRatios">
                <label class="tag-check"><input type="checkbox" value="16:9" /> 16:9</label>
                <label class="tag-check"><input type="checkbox" value="9:16" /> 9:16</label>
                <label class="tag-check"><input type="checkbox" value="1:1" /> 1:1</label>
                <label class="tag-check"><input type="checkbox" value="4:5" /> 4:5</label>
              </div>
            </div>
            <label>Where it's going
              <input type="text" id="shootDeliverableDestinations" maxlength="200" placeholder="Reels, YouTube, client website..." />
            </label>
          </div>

          <!-- The concept helper (see CONCEPT_FLOWS in app.js); The idea
               slide of the new-shoot guide borrows it from here. -->
          <button type="button" class="primary small-btn" id="conceptHelperBtn">Need to think it through?</button>

          <label id="shootPremiseField"><span id="shootPremiseLabelText">Concept</span>
            <textarea id="shootPremise" rows="6" maxlength="300" placeholder="visual narrative or message" readonly></textarea>
          </label>

          <div id="narrativeFieldsBlock">
            <label>Character/<wbr>Personality
              <textarea id="shootCharacter" rows="6" maxlength="1000" placeholder="Who the talent is being, even loosely" readonly></textarea>
            </label>

            <label>World-building notes
              <textarea id="shootWorldNotes" rows="6" maxlength="1000" placeholder="Setting, implied time or backstory, what's just happened or about to" readonly></textarea>
            </label>
          </div>

          <label id="shootElevatorPitchField">Elevator pitch
            <textarea id="shootElevatorPitch" rows="2" maxlength="150" placeholder="One line description of your story." readonly></textarea>
          </label>
        </div>
      </div>

      <svg class="folder-tab-deco" viewBox="0 0 400 30" preserveAspectRatio="none" aria-hidden="true"><path class="folder-tab-fill" d="M0,4 L192,4 L208,26 L400,26 L400,0 L0,0 Z"/><path class="folder-tab-line" d="M0,4 L192,4 L208,26 L400,26"/></svg>
      <h3 class="shoot-section-heading status-group-heading heading-yellow" id="visualsHeading">Visuals</h3>
      <div id="visualsBody">
        <div class="form-section-label-row">
          <button type="button" class="manage-link inline-manage-link" id="manageFrameworksBtn">Manage</button>
        </div>
        <div id="frameworkTagsContainerEarly"></div>

        <div class="references-block">
          <label class="beats-label">References</label>
          <p class="field-hint">Links to webpages, articles, YouTube videos, other inspiration</p>
          <div id="referencesList" class="references-list"></div>
          <button type="button" id="addReferenceBtn" class="primary small-btn">+ Add link</button>
        </div>

        <div class="moodboard-section">
          <span class="moodboard-label" id="moodboardSectionLabel">Mood board</span>
          <button type="button" id="addMoodboardPhotos" class="primary small-btn">+ Add photos</button>
          <button type="button" id="importRefBoardBtn" class="primary small-btn">+ Import board</button>
          <input type="file" id="moodboardFileInput" accept="image/*" multiple hidden />
          <div id="refBoards" class="ref-boards" hidden></div>
          <div id="moodboardGrid" class="moodboard-grid"></div>
          <label class="checkbox-row" id="moodboardCompleteRow"><input type="checkbox" id="shootMoodboardComplete" /> <span id="moodboardCompleteLabel">Mood board complete or not required?</span></label>
        </div>

        <div id="frameworkTagsContainer"></div>
        <div class="lighting-setups-section" id="lightingSetupsSection">
          <h4 class="subsection-heading" id="lightingSetupsHeading">Lighting setups</h4>
          <div id="lightingSetupsBody">
            <p class="field-hint">Log your specific setups for reference on the day of, as well as to review what worked in each image.</p>
            <div id="lightingSetupsItems" class="lighting-setups-list"></div>
            <button type="button" id="addLightingSetupBtn" class="primary small-btn">+ Add lighting setup</button>
          </div>
        </div>
      </div>

      <svg class="folder-tab-deco" viewBox="0 0 400 30" preserveAspectRatio="none" aria-hidden="true"><path class="folder-tab-fill" d="M0,4 L192,4 L208,26 L400,26 L400,0 L0,0 Z"/><path class="folder-tab-line" d="M0,4 L192,4 L208,26 L400,26"/></svg>
      <h3 class="shoot-section-heading status-group-heading heading-navy" id="shotListHeading">Shot list</h3>
      <div id="shotListBody">
        <div id="shotListItems" class="shot-list-items"></div>
        <button type="button" id="addShotBtn" class="primary small-btn">+ Add shot</button>
        <label>Shooting notes
          <textarea id="shootShootingNotes" rows="6" maxlength="6000" placeholder="Anything to remember on the day: settings, timings, things to try" readonly></textarea>
        </label>
        <label>Directions for talent
          <textarea id="shootTalentDirections" rows="6" maxlength="1000" placeholder="notes, reminders, directions for the day of the shoot..." readonly></textarea>
        </label>
        <label id="shootTeamDirectionsField">Directions for team
          <textarea id="shootTeamDirections" rows="6" maxlength="1000" placeholder="notes, reminders, directions for the day of the shoot..." readonly></textarea>
        </label>
      </div>

      <div id="postShootContent" hidden>
        <svg class="folder-tab-deco" viewBox="0 0 400 30" preserveAspectRatio="none" aria-hidden="true"><path class="folder-tab-fill" d="M0,4 L192,4 L208,26 L400,26 L400,0 L0,0 Z"/><path class="folder-tab-line" d="M0,4 L192,4 L208,26 L400,26"/></svg>
        <h3 class="shoot-section-heading status-group-heading heading-yellow" id="postShootHeading">Reflection</h3>
        <div id="postShootBody">
          <!-- The reflection helper (see REFLECTION_FLOWS in app.js). -->
          <button type="button" class="primary small-btn" id="reflectHelperBtn">Need help reflecting?</button>
          <label>What went right
            <textarea id="shootWentRight" rows="3" maxlength="4000" readonly></textarea>
          </label>
          <label>What could've gone better
            <textarea id="shootCouldBeBetter" rows="3" maxlength="4000" readonly></textarea>
          </label>
          <label>Lessons for next time
            <textarea id="shootLessonsLearned" rows="3" maxlength="4000" readonly></textarea>
          </label>

          <div class="moodboard-section" id="finalImagesSection">
            <span class="moodboard-label">Final images</span>
            <button type="button" id="addFinalPhotos" class="primary small-btn">+ Add photos</button>
            <input type="file" id="finalImagesFileInput" accept="image/*" multiple hidden />
            <div id="finalImagesGrid" class="moodboard-grid"></div>
          </div>
        </div>
      </div>

      <button type="button" class="plain-delete-btn pre-save-divider" id="deleteShootBtn" hidden>Delete shoot</button>
      <div class="modal-actions post-shoot-divider">
        <button type="button" class="primary" id="unarchiveShootBtn" hidden>Unarchive</button>
        <button type="button" class="primary" id="saveShootBtn">Save</button>
        <button type="button" class="complete-shoot-btn" id="completeShootBtn" hidden>Complete Shoot</button>
      </div>

      <!-- The new shoot guide, a page of its own over the shoot: seven
           chapters, the same as the shoot's parts (pages/new-shoot/
           guide-chapters.js). Inside the form on purpose: each chapter
           borrows the real field blocks from the page above, so the form's
           autosave listeners and #shootForm field styles keep working on
           them. Last in the form so first-match lookups still find the
           page's own elements first. Every button is type="button": a
           submit-type one would be "clicked" by Enter in any text field. -->
      <div id="shootWizard" hidden>
        <div id="shootWizardCard" role="dialog" aria-modal="true" aria-labelledby="shootWizardTitle" tabindex="-1">
          <header class="band shoot-band guide-band">
            <button type="button" class="ring-btn" id="shootWizardBackBtn" aria-label="Back"><span><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg></span></button>
            <p class="band-line shoot-band-line"><b id="shootWizardPlace">New shoot</b><span class="band-rule"></span></p>
            <button type="button" class="guide-skip" id="shootWizardSkipBtn">Skip</button>
          </header>
          <div class="guide-scroll" id="shootWizardScroll">
            <div class="guide-marks" id="shootWizardMarks" aria-hidden="true"></div>
            <div class="shoot-wizard-head guide-chrome">
              <p class="guide-chapter" id="shootWizardStep"></p>
              <h2 id="shootWizardTitle"></h2>
              <p id="shootWizardHint"></p>
            </div>
            <div id="shootWizardBody"></div>
            <!-- A new shoot's first chapter only (see renderShootWizardChrome). -->
            <button type="button" class="manage-link" id="shootWizardDontShowBtn" hidden>Don't show the guide again</button>
          </div>
          <div class="shoot-wizard-actions guide-bar guide-chrome">
            <button type="button" class="outline-btn" id="shootWizardExitBtn">Done for now</button>
            <button type="button" class="guide-next" id="shootWizardNextBtn">Next</button>
          </div>
        </div>
      </div>
    </form>
  </div>
  <div class="nb-turn-layer" aria-hidden="true"></div>
  <div class="nb-page-foot">
    <button type="button" class="nb-page-step" id="nbPagePrev" aria-label="Previous page"></button>
    <span id="nbPageFoot"></span>
    <button type="button" class="nb-page-step" id="nbPageNext" aria-label="Next page"></button>
  </div>
  <div class="nb-screen-tabs nb-screen-tabs-shoot"><button type="button" class="y" data-view="overview"><span>Overview</span></button><button type="button" class="n" data-view="shoots"><span>Shoots</span></button><button type="button" class="y" data-view="journal"><span>Reflections</span></button><button type="button" class="n" data-view="archive"><span>Archive</span></button><button type="button" class="y" data-view="stats"><span>Stats</span></button></div>
  <!-- The next step (pages/shoot/next-step.js): always the next thing this shoot needs at its stage, with a line above it when that helps. -->
  <div class="nb-shoot-bar shoot-next" id="shootNext">
    <p class="shoot-next-hint" id="shootNextHint" hidden></p>
    <button type="button" class="shoot-next-btn" id="shootNextBtn"></button>
  </div>
</div>

<!-- What a shoot's More button offers. -->
<div id="shootMoreOverlay" class="modal-overlay options-overlay" hidden>
  <div class="modal options-modal">
    <button type="button" class="options-item" id="shootMoreGuideBtn">Guide me through this shoot</button>
    <div class="menu-divider" aria-hidden="true"></div>
    <button type="button" class="options-item" id="shootMoreShareBtn">Share as PDF</button>
    <div class="menu-divider" aria-hidden="true" id="shootMoreShareDivider"></div>
    <button type="button" class="options-item options-delete" id="shootMoreDeleteBtn">Delete shoot</button>
    <div class="menu-divider" aria-hidden="true" id="shootMoreDeleteDivider"></div>
    <button type="button" class="options-item options-cancel" id="shootMoreCancelBtn">Go back</button>
  </div>
</div>

<!-- ============ EXPAND FIELD MODAL ============ -->
<div id="expandFieldOverlay" class="modal-overlay" hidden>
  <div class="modal rounded-modal">
    <div class="modal-header">
      <h2 id="expandFieldTitle"></h2>
      <button class="icon-btn close-btn" id="expandFieldCloseBtn"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
    </div>
    <textarea id="expandFieldTextarea" rows="12"></textarea>
    <button type="button" class="primary" id="expandFieldOkBtn">Okay</button>
  </div>
</div>

<div id="shootStatusSheetOverlay" class="modal-overlay options-overlay" hidden>
  <div class="modal options-modal rounded-modal" role="dialog" aria-modal="true" aria-labelledby="shootStatusSheetTitle">
    <h2 class="sheet-title" id="shootStatusSheetTitle">Change status</h2>
    <div id="shootStatusSheetList"></div>
    <button type="button" class="options-item options-cancel" id="shootStatusSheetCancelBtn">Cancel</button>
  </div>
</div>
<!-- ============ LOCATION MODAL ============ -->
<!-- ============ PHOTOGRAPHER INFORMATION ============ -->
<!-- One editor serving two entry points: the first-run prompt (which shows the
     intro line explaining what it's for) and the app menu's "Photographer
     information" (which doesn't). Every field is optional. -->
<div id="photographerModalOverlay" class="modal-overlay" hidden>
  <div class="modal rounded-modal">
    <div class="modal-header">
      <h2 id="photographerModalTitle">Photographer information</h2>
      <button type="button" class="icon-btn close-btn" id="photographerCloseBtn"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
    </div>
    <p class="field-hint" id="photographerIntroText" hidden>
      This gets referenced on your call sheets. Leave anything blank if you'd
      rather not add it. You can change all of it later from the menu.
    </p>
    <div id="photographerForm">
      <label>Your name
        <input type="text" id="photographerNameInput" maxlength="120" placeholder="e.g. Starky Morillo" />
      </label>
      <label>Business name
        <input type="text" id="photographerBusinessInput" maxlength="120" placeholder="Optional" />
      </label>
      <label>Key social media
        <div class="social-handle-row">
          <select id="photographerPlatformSelect" class="social-handle-platform">
            <option value="instagram">Instagram</option>
            <option value="tiktok">TikTok</option>
            <option value="youtube">YouTube</option>
            <option value="other">Other</option>
          </select>
          <input type="text" id="photographerHandleInput" class="social-handle-input" maxlength="80" placeholder="@handle" />
        </div>
      </label>
      <label>Phone number
        <input type="tel" id="photographerPhoneInput" maxlength="40" placeholder="Optional" />
      </label>
      <button type="button" class="primary modal-cta" id="photographerSaveBtn">Save</button>
    </div>
  </div>
</div>

<!-- ============ STORAGE USAGE ============ -->
<div id="storageUsageOverlay" class="modal-overlay" hidden>
  <div class="modal rounded-modal">
    <div class="modal-header">
      <h2>Storage usage</h2>
      <button type="button" class="icon-btn close-btn" id="storageUsageCloseBtn"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
    </div>
    <p class="field-hint">Roughly how much space this app and everything you've added to it (photos especially) are taking up on your phone.</p>
    <div id="storageUsageBody"></div>
  </div>
</div>

<div id="talentModalOverlay" class="modal-overlay" hidden>
  <div class="modal rounded-modal">
    <div class="modal-header">
      <h2>Talent</h2>
      <button class="icon-btn close-btn" data-close="talent"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
    </div>
    <div id="talentForm">
      <label>Returning talent
        <select id="pastTalentsSelect">
          <option value="">Select a past talent…</option>
        </select>
      </label>
      <label>Name
        <input type="text" id="talentModalNameInput" maxlength="120" placeholder="Talent name" />
      </label>
      <div class="talent-social-section">
        <p class="team-question talent-social-heading">Social media handle(s)</p>
        <div id="talentModalHandlesList" class="social-handles-list"></div>
        <button type="button" id="talentModalAddHandleBtn" class="secondary small-btn">+ Add handle</button>
      </div>
      <button type="button" id="talentModalPhotoBtn" class="secondary small-btn">+ Add talent photo</button>
      <div id="talentModalPhotoWrap"></div>
    </div>
    <button type="button" class="primary modal-cta" id="saveTalentModalBtn">Save</button>
  </div>
</div>

<div id="teamMemberModalOverlay" class="modal-overlay team-member-overlay" hidden>
  <div class="modal rounded-modal team-member-modal">
    <div class="modal-header">
      <h2>Team Member</h2>
      <button class="icon-btn close-btn" data-close="teamMember"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
    </div>
    <div id="teamMemberForm">
      <label>Returning team member
        <select id="pastTeamMembersSelect">
          <option value="">Select a past team member…</option>
        </select>
      </label>
      <label>Role
        <select id="teamMemberModalRoleSelect"></select>
      </label>
      <label>Name
        <input type="text" id="teamMemberModalNameInput" maxlength="120" placeholder="Name" />
      </label>
      <p class="team-question talent-social-heading">Social media handle</p>
      <div class="social-handle-row">
        <select id="teamMemberModalSocialPlatform" class="social-handle-platform"></select>
        <input type="text" id="teamMemberModalSocialInput" class="social-handle-input" placeholder="@handle" />
      </div>
    </div>
    <button type="button" class="primary modal-cta" id="saveTeamMemberModalBtn">Save</button>
  </div>
</div>

<div id="locationModalOverlay" class="modal-overlay" hidden>
  <div class="modal rounded-modal">
    <div class="modal-header">
      <h2>Location</h2>
      <button class="icon-btn close-btn" data-close="location"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
    </div>
    <div id="locationForm">
      <label>Past locations
        <select id="pastLocationsSelect">
          <option value="">Select a past location…</option>
        </select>
      </label>
      <label>Location name
        <input type="text" id="locationNameInput" maxlength="120" placeholder="e.g. Studio A" />
      </label>
      <label>Street
        <input type="text" id="locationStreetInput" maxlength="150" placeholder="123 Main St" />
      </label>
      <label>City
        <input type="text" id="locationCityInput" maxlength="100" placeholder="City" />
      </label>
      <label>State / region
        <input type="text" id="locationStateInput" maxlength="100" placeholder="State / region" />
      </label>
      <label>Zip code
        <input type="text" id="locationZipInput" maxlength="20" placeholder="Zip / postal code" />
      </label>
      <label>Country
        <select id="locationCountryInput" class="bold-select">
            <option value="">Select a country…</option>
            <option value="xa">Abkhazia</option>
            <option value="af">Afghanistan</option>
            <option value="al">Albania</option>
            <option value="dz">Algeria</option>
            <option value="as">American Samoa</option>
            <option value="ad">Andorra</option>
            <option value="ao">Angola</option>
            <option value="ai">Anguilla</option>
            <option value="ag">Antigua and Barbuda</option>
            <option value="ar">Argentina</option>
            <option value="am">Armenia</option>
            <option value="aw">Aruba</option>
            <option value="au">Australia</option>
            <option value="at">Austria</option>
            <option value="qm">Azad Kashmir</option>
            <option value="az">Azerbaijan</option>
            <option value="bs">Bahamas</option>
            <option value="bh">Bahrain</option>
            <option value="bd">Bangladesh</option>
            <option value="bb">Barbados</option>
            <option value="by">Belarus</option>
            <option value="be">Belgium</option>
            <option value="bz">Belize</option>
            <option value="bj">Benin</option>
            <option value="bm">Bermuda</option>
            <option value="bt">Bhutan</option>
            <option value="bo">Bolivia</option>
            <option value="bq">Bonaire, Sint Eustatius and Saba</option>
            <option value="ba">Bosnia and Herzegovina</option>
            <option value="bw">Botswana</option>
            <option value="br">Brazil</option>
            <option value="bn">Brunei</option>
            <option value="bg">Bulgaria</option>
            <option value="bf">Burkina Faso</option>
            <option value="bi">Burundi</option>
            <option value="kh">Cambodia</option>
            <option value="cm">Cameroon</option>
            <option value="ca">Canada</option>
            <option value="cv">Cape Verde</option>
            <option value="ky">Cayman Islands</option>
            <option value="cf">Central African Republic</option>
            <option value="td">Chad</option>
            <option value="cl">Chile</option>
            <option value="cn">China</option>
            <option value="co">Colombia</option>
            <option value="km">Comoros</option>
            <option value="cg">Congo</option>
            <option value="ck">Cook Islands</option>
            <option value="cr">Costa Rica</option>
            <option value="ci">Cote d&#x27;Ivoire</option>
            <option value="qr">Crimea</option>
            <option value="hr">Croatia</option>
            <option value="cu">Cuba</option>
            <option value="cw">Curacao</option>
            <option value="cy">Cyprus</option>
            <option value="cz">Czech Republic</option>
            <option value="cd">DR Congo</option>
            <option value="dk">Denmark</option>
            <option value="dj">Djibouti</option>
            <option value="dm">Dominica</option>
            <option value="do">Dominican Republic</option>
            <option value="xd">Donetsk People&#x27;s Republic</option>
            <option value="ec">Ecuador</option>
            <option value="eg">Egypt</option>
            <option value="sv">El Salvador</option>
            <option value="gq">Equatorial Guinea</option>
            <option value="er">Eritrea</option>
            <option value="ee">Estonia</option>
            <option value="sz">Eswatini</option>
            <option value="et">Ethiopia</option>
            <option value="fk">Falkland Islands (Malvinas)</option>
            <option value="fo">Faroe Islands</option>
            <option value="fj">Fiji</option>
            <option value="fi">Finland</option>
            <option value="fr">France</option>
            <option value="gf">French Guiana</option>
            <option value="pf">French Polynesia</option>
            <option value="tf">French Southern Territories</option>
            <option value="ga">Gabon</option>
            <option value="gm">Gambia</option>
            <option value="gaza_strip">Gaza Strip (State of Palestine)</option>
            <option value="ge">Georgia</option>
            <option value="de">Germany</option>
            <option value="gh">Ghana</option>
            <option value="gi">Gibraltar</option>
            <option value="gr">Greece</option>
            <option value="gl">Greenland</option>
            <option value="gd">Grenada</option>
            <option value="gp">Guadeloupe</option>
            <option value="gu">Guam</option>
            <option value="gt">Guatemala</option>
            <option value="gg">Guernsey</option>
            <option value="gn">Guinea</option>
            <option value="gw">Guinea-Bissau</option>
            <option value="gy">Guyana</option>
            <option value="ht">Haiti</option>
            <option value="hn">Honduras</option>
            <option value="hk">Hong Kong</option>
            <option value="hu">Hungary</option>
            <option value="is">Iceland</option>
            <option value="in">India</option>
            <option value="id">Indonesia</option>
            <option value="ir">Iran</option>
            <option value="iq">Iraq</option>
            <option value="ie">Ireland</option>
            <option value="im">Isle of Man</option>
            <option value="il">Israel</option>
            <option value="it">Italy</option>
            <option value="jm">Jamaica</option>
            <option value="jp">Japan</option>
            <option value="je">Jersey</option>
            <option value="jo">Jordan</option>
            <option value="kz">Kazakhstan</option>
            <option value="ke">Kenya</option>
            <option value="ki">Kiribati</option>
            <option value="xk">Kosovo</option>
            <option value="kw">Kuwait</option>
            <option value="kg">Kyrgyzstan</option>
            <option value="la">Laos</option>
            <option value="lv">Latvia</option>
            <option value="lb">Lebanon</option>
            <option value="ls">Lesotho</option>
            <option value="lr">Liberia</option>
            <option value="ly">Libya</option>
            <option value="li">Liechtenstein</option>
            <option value="lt">Lithuania</option>
            <option value="xl">Luhansk People&#x27;s Republic</option>
            <option value="lu">Luxembourg</option>
            <option value="mo">Macao</option>
            <option value="mg">Madagascar</option>
            <option value="mw">Malawi</option>
            <option value="my">Malaysia</option>
            <option value="mv">Maldives</option>
            <option value="ml">Mali</option>
            <option value="mt">Malta</option>
            <option value="mh">Marshall Islands</option>
            <option value="mq">Martinique</option>
            <option value="mr">Mauritania</option>
            <option value="mu">Mauritius</option>
            <option value="yt">Mayotte</option>
            <option value="mx">Mexico</option>
            <option value="fm">Micronesia</option>
            <option value="md">Moldova</option>
            <option value="mc">Monaco</option>
            <option value="mn">Mongolia</option>
            <option value="me">Montenegro</option>
            <option value="ms">Montserrat</option>
            <option value="ma-">Morocco</option>
            <option value="mz">Mozambique</option>
            <option value="mm">Myanmar</option>
            <option value="na">Namibia</option>
            <option value="nr">Nauru</option>
            <option value="np">Nepal</option>
            <option value="nl">Netherlands</option>
            <option value="nc">New Caledonia</option>
            <option value="nz">New Zealand</option>
            <option value="ni">Nicaragua</option>
            <option value="ne">Niger</option>
            <option value="ng">Nigeria</option>
            <option value="nu">Niue</option>
            <option value="nf">Norfolk Island</option>
            <option value="kp">North Korea</option>
            <option value="mk">North Macedonia</option>
            <option value="xc">Northern Cyprus</option>
            <option value="mp">Northern Mariana Islands</option>
            <option value="no">Norway</option>
            <option value="om">Oman</option>
            <option value="pk">Pakistan</option>
            <option value="pw">Palau</option>
            <option value="pa">Panama</option>
            <option value="pg">Papua New Guinea</option>
            <option value="py">Paraguay</option>
            <option value="pe">Peru</option>
            <option value="ph">Philippines</option>
            <option value="pn">Pitcairn</option>
            <option value="pl">Poland</option>
            <option value="pt">Portugal</option>
            <option value="pr">Puerto Rico</option>
            <option value="qa">Qatar</option>
            <option value="re">Reunion</option>
            <option value="ro">Romania</option>
            <option value="ru">Russia</option>
            <option value="rw">Rwanda</option>
            <option value="xz">Sahrawi Arab Democratic Republic (Free Zone)</option>
            <option value="bl">Saint Barthelemy</option>
            <option value="sh">Saint Helena, Ascension and Tristan Da Cunha</option>
            <option value="kn">Saint Kitts and Nevis</option>
            <option value="lc">Saint Lucia</option>
            <option value="mf">Saint Martin (French Part)</option>
            <option value="pm">Saint Pierre and Miquelon</option>
            <option value="vc">Saint Vincent and the Grenadines</option>
            <option value="ws">Samoa</option>
            <option value="sm">San Marino</option>
            <option value="st">Sao Tome and Principe</option>
            <option value="sa">Saudi Arabia</option>
            <option value="sn">Senegal</option>
            <option value="rs">Serbia</option>
            <option value="sc">Seychelles</option>
            <option value="sl">Sierra Leone</option>
            <option value="sg">Singapore</option>
            <option value="sx">Sint Maarten (Dutch Part)</option>
            <option value="sk">Slovakia</option>
            <option value="si">Slovenia</option>
            <option value="sb">Solomon Islands</option>
            <option value="so">Somalia</option>
            <option value="xs">Somaliland</option>
            <option value="za">South Africa</option>
            <option value="gs">South Georgia and the South Sandwich Islands</option>
            <option value="kr">South Korea</option>
            <option value="xo">South Ossetia</option>
            <option value="ss">South Sudan</option>
            <option value="es">Spain</option>
            <option value="lk">Sri Lanka</option>
            <option value="sd">Sudan</option>
            <option value="sr">Suriname</option>
            <option value="se">Sweden</option>
            <option value="ch">Switzerland</option>
            <option value="sy">Syria</option>
            <option value="tw">Taiwan</option>
            <option value="tj">Tajikistan</option>
            <option value="tz">Tanzania</option>
            <option value="th">Thailand</option>
            <option value="tl">Timor-Leste</option>
            <option value="tg">Togo</option>
            <option value="tk">Tokelau</option>
            <option value="to">Tonga</option>
            <option value="xp">Transnistria</option>
            <option value="tt">Trinidad and Tobago</option>
            <option value="tn">Tunisia</option>
            <option value="tr">Turkey</option>
            <option value="tm">Turkmenistan</option>
            <option value="tc">Turks and Caicos Islands</option>
            <option value="tv">Tuvalu</option>
            <option value="ug">Uganda</option>
            <option value="ua">Ukraine</option>
            <option value="ae">United Arab Emirates</option>
            <option value="gb">United Kingdom</option>
            <option value="us">United States of America</option>
            <option value="uy">Uruguay</option>
            <option value="uz">Uzbekistan</option>
            <option value="vu">Vanuatu</option>
            <option value="va">Vatican City</option>
            <option value="ve">Venezuela</option>
            <option value="vn">Vietnam</option>
            <option value="vg">Virgin Islands, British</option>
            <option value="vi">Virgin Islands, U.S.</option>
            <option value="wf">Wallis and Futuna</option>
            <option value="west_bank">West Bank (State of Palestine)</option>
            <option value="eh-">Western Sahara</option>
            <option value="ye">Yemen</option>
            <option value="zm">Zambia</option>
            <option value="zw">Zimbabwe</option>
        </select>
      </label>
      <button type="button" class="primary" id="saveLocationBtn">Save</button>
    </div>
  </div>
</div>

<!-- ============ MANAGE LOCATIONS MODAL ============ -->
<div id="manageLocationsOverlay" class="modal-overlay" hidden>
  <div class="modal rounded-modal">
    <div class="modal-header">
      <h2>Manage Locations</h2>
      <button class="icon-btn close-btn" data-close="manageLocations"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
    </div>
    <p class="field-hint">Remove a location to stop it from showing up as a quick pick. It won't change any shoot that already used it.</p>
    <div id="manageLocationsList"></div>
  </div>
</div>

<!-- ============ MANAGE TEAM MEMBERS MODAL ============ -->
<div id="manageTeamMembersOverlay" class="modal-overlay" hidden>
  <div class="modal rounded-modal">
    <div class="modal-header">
      <h2>Manage Team Members</h2>
      <button class="icon-btn close-btn" data-close="manageTeamMembers"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
    </div>
    <p class="field-hint">Remove a name to stop it from showing up as a quick pick. It won't change any shoot that already used it.</p>
    <div id="manageTeamMembersList"></div>
  </div>
</div>

<!-- ============ MANAGE TALENTS MODAL ============ -->
<div id="manageTalentsOverlay" class="modal-overlay" hidden>
  <div class="modal rounded-modal">
    <div class="modal-header">
      <h2>Manage Talents</h2>
      <button class="icon-btn close-btn" data-close="manageTalents"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
    </div>
    <p class="field-hint">Remove a name to stop it from showing up as a quick pick. It won't change any shoot that already used it.</p>
    <div id="manageTalentsList"></div>
  </div>
</div>

<!-- ============ MANAGE LIGHTING SETUPS MODAL ============ -->
<div id="manageLightingSetupsOverlay" class="modal-overlay" hidden>
  <div class="modal rounded-modal">
    <div class="modal-header">
      <h2>Manage Lighting Setups</h2>
      <button class="icon-btn close-btn" data-close="manageLightingSetups"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
    </div>
    <p class="field-hint">Remove a setup to stop it from showing up as a quick pick. It won't change any shoot that already used it.</p>
    <div id="manageLightingSetupsList"></div>
  </div>
</div>

<!-- ============ REGION COUNTRY POPUP (tap a country on the map) ============ -->
<div id="regionCountryPopupOverlay" class="modal-overlay intro-overlay" hidden>
  <div class="modal region-country-popup-modal">
    <div class="modal-header">
      <h2 id="regionCountryPopupTitle">Country</h2>
      <button class="icon-btn close-btn" data-close="regionCountryPopup"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
    </div>
    <div class="stats-legend" id="regionCountryPopupList"></div>
  </div>
</div>

<!-- ============ MANAGE FRAMEWORKS MODAL ============ -->
<div id="frameworksModalOverlay" class="modal-overlay" hidden>
  <div class="modal rounded-modal">
    <div class="modal-header">
      <h2>Frameworks</h2>
      <button class="icon-btn close-btn" data-close="frameworks"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
    </div>
    <div id="frameworksBody"></div>
    <form id="newFrameworkForm" class="quick-add-relationship">
      <input type="text" id="newFrameworkName" placeholder="New framework name" maxlength="60" />
      <button type="submit" class="primary">Add</button>
    </form>
  </div>
</div>

<!-- ============ EDIT CATEGORY FILTERS ============ -->
<div id="categoryVisibilityOverlay" class="modal-overlay" hidden>
  <div class="modal rounded-modal">
    <div class="modal-header">
      <h2>Shoot Categories</h2>
      <button class="icon-btn close-btn" data-close="categoryVisibility"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
    </div>
    <p class="field-hint">Choose which categories show up as filters on the Shoots and Archive tabs.</p>
    <div class="tag-group" id="categoryVisibilityList"></div>
  </div>
</div>

<!-- ============ IMAGE VIEWER (mood board full view) ============ -->
<div id="imageViewerOverlay" class="image-viewer-overlay" hidden>
  <div class="image-viewer-top">
    <button type="button" class="image-viewer-close" id="closeImageViewer"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
  </div>
  <div class="image-viewer-stage" id="imageViewerStage">
    <img id="imageViewerImg" src="" alt="" class="image-viewer-img" />
    <div class="image-viewer-caption-overlay" id="imageViewerCaptionOverlay" hidden>
      <span id="imageViewerCaptionText"></span>
    </div>
  </div>
  <div class="image-viewer-caption-bar">
    <button type="button" id="imageViewerAddCaptionBtn">+ Add caption</button>
    <input type="text" id="imageViewerCaptionInput" placeholder="Add a caption" maxlength="140" hidden />
    <button type="button" class="image-viewer-menu-btn" id="imageViewerMenuBtn">&#8226;&#8226;&#8226;</button>
    <div id="imageViewerMenu" class="image-viewer-menu" hidden>
      <button type="button" id="setProjectPhotoFromViewer">Set as cover photo</button>
      <button type="button" id="deleteImageFromViewer" class="options-delete">Delete this image</button>
    </div>
  </div>
</div>

<!-- ============ PROJECT PHOTO CROP ============ -->
<div id="projectPhotoCropOverlay" class="modal-overlay crop-overlay" hidden>
  <div class="modal crop-modal">
    <div class="modal-header">
      <h2 id="cropModalTitle">Set cover photo</h2>
      <button type="button" class="icon-btn close-btn" id="cropCloseBtn"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
    </div>
    <p class="field-hint">Drag to reposition, pinch or use the slider to zoom</p>
    <div class="crop-stage" id="cropStage">
      <img id="cropImg" src="" alt="" draggable="false" />
    </div>
    <div class="crop-zoom-row">
      <span class="crop-zoom-icon">&minus;</span>
      <input type="range" id="cropZoomSlider" min="1" max="3" step="0.01" value="1" />
      <span class="crop-zoom-icon">&plus;</span>
    </div>
    <button type="button" class="primary" id="cropConfirmBtn">Set crop</button>
  </div>
</div>

<!-- ============ PDF SECTIONS CHOICE ============ -->
<div id="pdfSectionsOverlay" class="modal-overlay" hidden>
  <div class="modal rounded-modal">
    <div class="modal-header">
      <h2>Share as PDF</h2>
      <button type="button" class="icon-btn close-btn" id="pdfSectionsCloseBtn"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
    </div>
    <p class="field-hint">Choose which sections to include.</p>
    <div class="pdf-sections-list">
      <label class="checkbox-row"><input type="checkbox" id="pdfSectionTalent" checked /> Talent</label>
      <label class="checkbox-row"><input type="checkbox" id="pdfSectionLogistics" checked /> Logistics</label>
      <label class="checkbox-row" id="pdfSectionDeliverablesRow" hidden><input type="checkbox" id="pdfSectionDeliverables" checked /> Deliverables</label>
      <label class="checkbox-row"><input type="checkbox" id="pdfSectionDirection" /> Direction</label>
      <label class="checkbox-row"><input type="checkbox" id="pdfSectionReferences" /> References</label>
      <label class="checkbox-row"><input type="checkbox" id="pdfSectionTeam" checked /> Team</label>
      <label class="checkbox-row"><input type="checkbox" id="pdfSectionMoodboard" checked /> <span id="pdfSectionMoodboardLabel">Mood board</span></label>
    </div>
    <button type="button" class="primary modal-cta" id="pdfSectionsBuildBtn">Build PDF</button>
  </div>
</div>

<!-- ============ PDF PREVIEW ============ -->
<div id="pdfPreviewOverlay" class="modal-overlay pdf-preview-overlay" hidden>
  <div class="modal pdf-preview-modal">
    <div class="modal-header">
      <h2>Shoot PDF</h2>
      <button type="button" class="icon-btn close-btn" id="pdfPreviewCloseBtn"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
    </div>
    <div class="pdf-preview-stage">
      <div class="pdf-preview-viewport" id="pdfPreviewViewport">
        <div class="pdf-preview-pages" id="pdfPreviewPages"></div>
      </div>
      <p class="pdf-preview-status" id="pdfPreviewStatus">Loading preview…</p>
      <span class="pdf-page-indicator" id="pdfPageIndicator" hidden></span>
      <div class="pdf-zoom-controls">
        <button type="button" class="map-zoom-btn" id="pdfZoomOutBtn" aria-label="Zoom out">&minus;</button>
        <button type="button" class="map-zoom-btn" id="pdfZoomInBtn" aria-label="Zoom in">+</button>
      </div>
    </div>
    <button type="button" class="primary" id="pdfPreviewShareBtn">Share</button>
  </div>
</div>

<!-- ============ SHOOT OPTIONS ============ -->
<div id="shootOptionsOverlay" class="modal-overlay options-overlay" hidden>
  <div class="modal options-modal options-modal-slider rounded-modal">
    <div class="options-pane-track" id="shootOptionsPaneTrack">
      <div class="options-pane">
        <!-- Alphabetical, with Delete and Cancel pinned last (see the app
             menu's pane for the same reasoning). -->
        <!-- "Add to project" keeps its slot when it relabels to "Project:
             <name>" for a shoot that's already in one, same as Archive/
             Unarchive keeps its slot. -->
        <button type="button" class="options-item" id="projectShootOptionBtn">Add to project</button>
        <button type="button" class="options-item" id="archiveShootOptionBtn">Archive shoot</button>
        <button type="button" class="options-item" id="changeDeadlineOptionBtn">Change deadline</button>
        <button type="button" class="options-item" id="changeProjectPhotoOptionBtn">Change cover photo</button>
        <button type="button" class="options-item" id="changeTitleOptionBtn">Change shoot title</button>
        <button type="button" class="options-item" id="changeStatusOptionBtn">Change status</button>
        <button type="button" class="options-item" id="shareShootOptionBtn">Share as PDF</button>
        <button type="button" class="options-item options-delete" id="deleteShootOptionBtn">Delete</button>
        <button type="button" class="options-item options-cancel" id="shootOptionsCancelBtn">Cancel</button>
      </div>
      <div class="options-pane">
        <button type="button" class="options-item options-back" id="statusOptionsBackBtn">&larr; Back</button>
        <div id="statusOptionsList"></div>
      </div>
      <div class="options-pane">
        <button type="button" class="options-item options-back" id="titleOptionsBackBtn">&larr; Back</button>
        <input type="text" id="shootTitleRenameInput" class="options-rename-input" maxlength="120" placeholder="Name for the shoot" />
        <button type="button" class="options-item primary" id="saveTitleOptionBtn">Save</button>
      </div>
      <div class="options-pane">
        <button type="button" class="options-item options-back" id="projectPhotoBackBtn">&larr; Back</button>
        <button type="button" id="addProjectPhotoFromDeviceBtn" class="primary small-btn">+ Add from phone</button>
        <input type="file" id="projectPhotoFileInput" accept="image/*" hidden />
        <div id="projectPhotoPickerGrid" class="moodboard-grid project-photo-picker-grid"></div>
      </div>
      <div class="options-pane">
        <button type="button" class="options-item options-back" id="deadlineOptionsBackBtn">&larr; Back</button>
        <input type="date" id="shootDeadlineRenameInput" class="options-rename-input" />
        <button type="button" class="options-item primary" id="saveDeadlineOptionBtn">Save</button>
      </div>
    </div>
  </div>
</div>

<!-- ============ JOURNAL ENTRY OPTIONS ============ -->
<div id="journalOptionsOverlay" class="modal-overlay options-overlay" hidden>
  <div class="modal options-modal rounded-modal">
    <button type="button" class="options-item" id="shareJournalOptionBtn">Share as PDF</button>
    <button type="button" class="options-item options-delete" id="deleteJournalOptionBtn">Delete entry</button>
    <button type="button" class="options-item options-cancel" id="journalOptionsCancelBtn">Cancel</button>
  </div>
</div>
<!-- ============ ADD TO PROJECT (opened from the shoot options kebab) ============ -->
<!-- Its own small sheet, built like the journal entry options above, rather
     than a sixth pane on the shoot options slider — that track's widths and
     translate steps are sized for exactly five panes. -->
<div id="projectPickerOverlay" class="modal-overlay options-overlay" hidden>
  <div class="modal options-modal rounded-modal">
    <button type="button" class="options-item" id="projectPickerOpenBtn" hidden></button>
    <input type="text" id="projectPickerNameInput" class="options-rename-input" maxlength="120" placeholder="New project name" />
    <button type="button" class="options-item primary" id="projectPickerCreateBtn">Create project</button>
    <div class="menu-divider" id="projectPickerDivider" aria-hidden="true" hidden></div>
    <div id="projectPickerList" hidden></div>
    <button type="button" class="options-item" id="projectPickerRemoveBtn" hidden>Remove from project</button>
    <button type="button" class="options-item options-cancel" id="projectPickerCancelBtn">Cancel</button>
  </div>
</div>

<!-- ============ APP MENU ============ -->
<!-- The sun's Options, laid out like ref's (user, 11-11): the same sheet as
     App options. Its parts (Options, Stickers, Remove sticker) are drawn by
     setupSunMenu in app.js; on Stickers and Remove sticker the X steps back. -->
<div id="sunMenuOverlay" class="modal-overlay options-overlay app-menu-overlay" hidden>
  <div class="modal app-menu-modal opt-sheet" role="dialog" aria-modal="true" aria-labelledby="sunMenuTitle">
    <header class="opt-sheet-head">
      <h2 class="app-menu-header" id="sunMenuTitle">Options</h2>
      <button type="button" class="icon-btn close-btn opt-close" id="sunMenuCloseBtn" aria-label="Close"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
    </header>
    <div class="opt-sheet-body" id="sunMenuBody"></div>
    <input type="file" id="stickerFileInput" accept="image/*" hidden />
  </div>
</div>

<!-- Options (round 2, 08-options): a sheet with its name and an X, then
     the notebook's colour and where it starts (look-choices.js), the
     choices as two-way switches, and the rest as rows: You, Backups, Help.
     The ids are the ones the app has always wired. -->
<div id="appMenuOverlay" class="modal-overlay options-overlay app-menu-overlay" hidden>
  <div class="modal app-menu-modal opt-sheet" role="dialog" aria-modal="true" aria-labelledby="appMenuTitle">
    <header class="opt-sheet-head">
      <h2 class="app-menu-header" id="appMenuTitle">Options</h2>
      <button type="button" class="icon-btn close-btn opt-close" id="appMenuCancelBtn" aria-label="Close"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
    </header>
    <div class="opt-sheet-body">
      <span class="opt-label">Notebook color</span>
      <div id="appColorChoices"></div>
      <span class="opt-label opt-gap">Start in</span>
      <div id="appStartChoices"></div>
      <span class="opt-label opt-gap">Show shoots by</span>
      <div class="opt-seg">
        <button type="button" id="displayModeTalentBtn">Talent name</button>
        <button type="button" id="displayModeTitleBtn">Shoot title</button>
      </div>
      <span class="opt-label opt-gap">New shoot guide</span>
      <div class="opt-seg">
        <button type="button" id="newShootGuideOnBtn">In the guide</button>
        <button type="button" id="newShootGuideOffBtn">On the page</button>
      </div>
      <span class="opt-label opt-gap">Daily report</span>
      <div class="opt-seg">
        <button type="button" id="dailyReportSoonBtn">Before a shoot</button>
        <button type="button" id="dailyReportAllBtn">Everything</button>
      </div>
      <span class="opt-label opt-gap">Visual language and frameworks</span>
      <div class="opt-seg">
        <button type="button" id="lookTagsOffBtn">Hidden</button>
        <button type="button" id="lookTagsOnBtn">On the shoot page</button>
      </div>
      <span class="opt-label opt-gap">You</span>
      <div class="opt-rows">
        <button type="button" class="opt-row" id="photographerInfoBtn"><span class="opt-row-words"><span class="opt-row-name">Photographer information</span><span class="opt-row-sub">Prints first on every PDF</span></span><svg class="opt-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg></button>
        <button type="button" class="opt-row" id="savedListsBtn"><span class="opt-row-words"><span class="opt-row-name">Saved lists</span><span class="opt-row-sub">Talent, team, locations, lighting, categories, frameworks</span></span><svg class="opt-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg></button>
      </div>
      <span class="opt-label opt-gap">Backups</span>
      <!-- "Last backup: ..." is kept current by renderLastBackupHint (backup.js);
           the storage used is read when the sheet opens (app-menu.js). -->
      <div class="opt-rows">
        <button type="button" class="opt-row" id="exportDataBtn"><span class="opt-row-words"><span class="opt-row-name">Save a backup</span><span class="opt-row-sub" id="lastBackupHint">Last backup: never</span></span><svg class="opt-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg></button>
        <button type="button" class="opt-row" id="importDataBtn"><span class="opt-row-words"><span class="opt-row-name">Restore a backup</span></span><svg class="opt-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg></button>
        <button type="button" class="opt-row" id="exportPreviousShootsBtn"><span class="opt-row-words"><span class="opt-row-name">Export previous shoots</span><span class="opt-row-sub">One PDF of archived months</span></span><svg class="opt-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg></button>
        <button type="button" class="opt-row" id="storageUsageBtn"><span class="opt-row-words"><span class="opt-row-name">Storage usage</span><span class="opt-row-sub" id="storageUsageHint"></span></span><svg class="opt-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg></button>
      </div>
      <span class="opt-label opt-gap">Help</span>
      <div class="opt-rows">
        <button type="button" class="opt-row" id="appTourBtn"><span class="opt-row-words"><span class="opt-row-name">How it works</span></span><svg class="opt-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg></button>
      </div>
      <!-- The one that can't be undone stays last, away from the rest. -->
      <div class="opt-rows opt-rows-apart">
        <button type="button" class="opt-row opt-danger" id="deleteAllShootDataBtn"><span class="opt-row-words"><span class="opt-row-name">Delete all shoot data</span></span><svg class="opt-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg></button>
      </div>
    </div>
  </div>
</div>
<div id="savedListsOverlay" class="modal-overlay options-overlay app-menu-overlay" hidden>
  <div class="modal app-menu-modal opt-sheet" role="dialog" aria-modal="true" aria-labelledby="savedListsTitle">
    <header class="opt-sheet-head">
      <h2 class="app-menu-header" id="savedListsTitle">Saved lists</h2>
      <button type="button" class="icon-btn close-btn opt-close" id="savedListsCloseBtn" aria-label="Back"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
    </header>
    <div class="opt-sheet-body">
      <div class="opt-rows" id="savedListsRows">
        <button type="button" class="opt-row" data-list="talent"><span class="opt-row-words"><span class="opt-row-name">Talent</span><span class="opt-row-sub">Who you've photographed</span></span><svg class="opt-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg></button>
        <button type="button" class="opt-row" data-list="team"><span class="opt-row-words"><span class="opt-row-name">Team</span><span class="opt-row-sub">Who you've worked with</span></span><svg class="opt-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg></button>
        <button type="button" class="opt-row" data-list="locations"><span class="opt-row-words"><span class="opt-row-name">Locations</span><span class="opt-row-sub">Places you've shot</span></span><svg class="opt-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg></button>
        <button type="button" class="opt-row" data-list="lighting"><span class="opt-row-words"><span class="opt-row-name">Lighting</span><span class="opt-row-sub">Setups you've used</span></span><svg class="opt-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg></button>
        <button type="button" class="opt-row" data-list="categories"><span class="opt-row-words"><span class="opt-row-name">Categories</span><span class="opt-row-sub">Which kinds of shoot show as filters</span></span><svg class="opt-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg></button>
        <button type="button" class="opt-row" data-list="frameworks"><span class="opt-row-words"><span class="opt-row-name">Frameworks</span><span class="opt-row-sub">Your own sets of tags</span></span><svg class="opt-chevron" viewBox="0 0 24 24" aria-hidden="true"><polyline points="9 5 16 12 9 19"/></svg></button>
      </div>
    </div>
  </div>
</div>
<!-- ============ DELETE ALL SHOOT DATA CONFIRM ============ -->
<div id="deleteAllConfirmOverlay" class="modal-overlay intro-overlay" hidden>
  <div class="modal intro-modal delete-all-confirm-modal" id="deleteAllConfirmModal">
    <h2 id="deleteAllConfirmTitle">Are you SURE sure, my guy?</h2>
    <p id="deleteAllConfirmText">This permanently removes every shoot and its photos: mood boards, final images, cover and talent photos. Any journal entries you wrote and their photos are kept. This can't be undone.</p>
    <div class="modal-actions" id="deleteAllConfirmActions">
      <button type="button" class="secondary" id="deleteAllConfirmCancelBtn">Cancel</button>
      <button type="button" class="danger" id="deleteAllConfirmYesBtn">Yes, delete all shoots</button>
    </div>
    <button type="button" class="primary" id="deleteAllConfirmOkBtn" hidden>OK</button>
  </div>
</div>

<!-- ============ CONCEPT HELPER ("Need to think it through?") ============ -->
<!-- A short decision tree of yes/no and short-answer questions (see
     CONCEPT_FLOWS in app.js), compiled at the end into a concept, an
     elevator pitch and — when asked for — Character/World notes. -->
<div id="conceptHelperOverlay" class="modal-overlay intro-overlay" hidden>
  <div class="modal intro-modal concept-helper-modal">
    <p class="mi-sub" id="conceptHelperStep"></p>
    <h2 id="conceptHelperTitle"></h2>
    <p id="conceptHelperText"></p>
    <p class="field-hint concept-helper-hint" id="conceptHelperHint"></p>
    <input type="text" id="conceptHelperInput" class="deadline-prompt-input" maxlength="40" autocomplete="off" autocapitalize="none" />
    <!-- One box per page field it fills (CONCEPT_HELPER_OUTPUTS). -->
    <div id="conceptHelperOutputs">
      <div class="concept-helper-output">
        <label class="concept-helper-label" for="conceptHelperSummary">Concept</label>
        <textarea id="conceptHelperSummary" class="deadline-prompt-input" rows="5"></textarea>
        <p class="concept-helper-keep" hidden>Already filled in on the page. You'll be asked before it's replaced.</p>
        <p class="mi-sub concept-helper-count" id="conceptHelperCount"></p>
      </div>
      <div class="concept-helper-output">
        <label class="concept-helper-label" for="conceptHelperCharacter">Character/Personality</label>
        <textarea id="conceptHelperCharacter" class="deadline-prompt-input" rows="5"></textarea>
        <p class="concept-helper-keep" hidden>Already filled in on the page. You'll be asked before it's replaced.</p>
        <p class="mi-sub concept-helper-count" id="conceptHelperCharacterCount"></p>
      </div>
      <div class="concept-helper-output">
        <label class="concept-helper-label" for="conceptHelperWorld">World-building notes</label>
        <textarea id="conceptHelperWorld" class="deadline-prompt-input" rows="5"></textarea>
        <p class="concept-helper-keep" hidden>Already filled in on the page. You'll be asked before it's replaced.</p>
        <p class="mi-sub concept-helper-count" id="conceptHelperWorldCount"></p>
      </div>
      <div class="concept-helper-output">
        <label class="concept-helper-label" for="conceptHelperPitch">Elevator pitch</label>
        <textarea id="conceptHelperPitch" class="deadline-prompt-input" rows="2"></textarea>
        <p class="concept-helper-keep" hidden>Already filled in on the page. You'll be asked before it's replaced.</p>
        <p class="mi-sub concept-helper-count" id="conceptHelperPitchCount"></p>
      </div>
    </div>
    <div class="modal-actions" id="conceptHelperYesNo">
      <button type="button" class="secondary" id="conceptHelperNoBtn">No</button>
      <button type="button" class="primary" id="conceptHelperYesBtn">Yes</button>
    </div>
    <div class="modal-actions" id="conceptHelperNextRow">
      <button type="button" class="primary" id="conceptHelperNextBtn">Next</button>
    </div>
    <div class="modal-actions" id="conceptHelperEndRow">
      <button type="button" class="primary" id="conceptHelperUseBtn">Use this</button>
      <button type="button" class="secondary" id="conceptHelperWriteBtn">I'll write it myself</button>
    </div>
    <!-- End screen only: side by side, together as wide as one button above. -->
    <div class="modal-actions" id="conceptHelperEndNavRow" hidden>
      <button type="button" class="secondary" id="conceptHelperEndBackBtn">Back</button>
      <button type="button" class="secondary" id="conceptHelperRestartBtn">Start over</button>
    </div>
    <!-- Leaving with questions unanswered (see askConceptHelperLeave). -->
    <div class="modal-actions" id="conceptHelperLeaveRow" hidden>
      <button type="button" class="primary" id="conceptHelperLeaveFirstBtn">Go to the first one</button>
      <button type="button" class="secondary" id="conceptHelperLeaveAnywayBtn">Leave anyway</button>
    </div>
    <button type="button" class="manage-link concept-helper-link" id="conceptHelperBackBtn">Back</button>
    <div class="shoot-tour-skip-row" id="conceptHelperCloseRow">
      <button type="button" class="secondary journal-block-btn" id="conceptHelperCloseBtn">Close</button>
    </div>
  </div>
</div>

<!-- ============ REFLECTION HELPER ("Need help reflecting?") ============ -->
<!-- A few questions per Reflection field (see REFLECTION_FLOWS in app.js),
     written straight into the fields on Finish or Close. -->
<div id="reflectHelperOverlay" class="modal-overlay intro-overlay" hidden>
  <div class="modal intro-modal reflect-helper-modal">
    <p class="mi-sub" id="reflectHelperStep"></p>
    <h2 id="reflectHelperTitle"></h2>
    <p id="reflectHelperText"></p>
    <p class="field-hint concept-helper-hint" id="reflectHelperHint"></p>
    <textarea id="reflectHelperInput" class="deadline-prompt-input" rows="3" maxlength="1000"></textarea>
    <div class="modal-actions" id="reflectHelperNav">
      <button type="button" class="secondary" id="reflectHelperBackBtn">Back</button>
      <button type="button" class="primary" id="reflectHelperNextBtn">Next</button>
    </div>
    <div class="shoot-tour-skip-row">
      <button type="button" class="secondary journal-block-btn" id="reflectHelperCloseBtn">Close</button>
    </div>
  </div>
</div>

<!-- ============ MULTI-DAY SHOOT NOTICE ============ -->
<div id="multiDayNoticeOverlay" class="modal-overlay intro-overlay" hidden>
  <div class="modal intro-modal">
    <h2>Multi-day shoot</h2>
    <p>A shoot page will be set up for each day of the shoot. Pick the last day next, and you'll get to confirm before the days are made.</p>
    <button type="button" class="primary" id="multiDayNoticeOkBtn">got it!</button>
    <!-- Same small link as the new-shoot guide's "Don't show again". -->
    <button type="button" class="manage-link" id="multiDayNoticeHideBtn">Don't show again</button>
  </div>
</div>

<!-- ============ NEW SHOOT GUIDE TURNED OFF ============ -->
<div id="shootWizardOffOverlay" class="modal-overlay intro-overlay" hidden>
  <div class="modal intro-modal">
    <h2>Guide turned off</h2>
    <p>New shoots will open straight to the shoot page. You can turn the guide back on anytime: tap the menu button on the Overview page, then under New shoot guide pick In the guide.</p>
    <button type="button" class="primary" id="shootWizardOffOkBtn">got it!</button>
  </div>
</div>

<!-- ============ EXPORT PREVIOUS SHOOTS ============ -->
<div id="exportPreviousIntroOverlay" class="modal-overlay intro-overlay" hidden>
  <div class="modal intro-modal">
    <h2>Export previous shoots</h2>
    <p>This builds one PDF that compiles everything from the shoot page: direction, location, team, visuals, shot list, lighting setups, reflections, and all your photos and mood board images, for whichever archived shoots you pick. Once it's saved, you'll have the option to remove those shoots (and their photos) from the app to free up storage.</p>
    <button type="button" class="primary" id="exportPreviousIntroCloseBtn">got it!</button>
  </div>
</div>

<div id="exportPreviousPickerOverlay" class="modal-overlay" hidden>
  <div class="modal rounded-modal">
    <div class="modal-header">
      <h2>Select shoots to export</h2>
      <button type="button" class="icon-btn close-btn" id="exportPreviousPickerCloseBtn"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
    </div>
    <p class="field-hint">Only archived shoots are listed. Choose which months to include. Every archived shoot from a checked month goes into the PDF.</p>
    <div id="exportPreviousPickerList" class="export-picker-list"></div>
    <p class="empty-state" id="exportPreviousPickerEmpty" hidden>No archived shoots yet.</p>
    <button type="button" class="primary modal-cta" id="exportPreviousPickerBuildBtn">Build PDF archive</button>
  </div>
</div>

<div id="exportDeleteAskOverlay" class="modal-overlay intro-overlay" hidden>
  <div class="modal intro-modal">
    <h2>Delete the exported shoots?</h2>
    <p>If the PDF archive is saved somewhere safe, like Files, you can also remove <span id="exportDeleteAskCount"></span> from the app now, to free up storage.</p>
    <div class="modal-actions">
      <button type="button" class="secondary" id="exportDeleteAskNoBtn">Not now</button>
      <button type="button" class="danger" id="exportDeleteAskYesBtn">Yes, delete them</button>
    </div>
  </div>
</div>

<div id="exportDeleteConfirmOverlay" class="modal-overlay intro-overlay" hidden>
  <div class="modal intro-modal export-delete-confirm-modal" id="exportDeleteConfirmModal">
    <h2 id="exportDeleteConfirmTitle">Delete these shoots for good?</h2>
    <p id="exportDeleteConfirmText"></p>
    <div class="modal-actions" id="exportDeleteConfirmActions">
      <button type="button" class="secondary" id="exportDeleteConfirmCancelBtn">Cancel</button>
      <button type="button" class="danger" id="exportDeleteConfirmYesBtn">Yes, delete them</button>
    </div>
    <button type="button" class="primary" id="exportDeleteConfirmOkBtn" hidden>OK</button>
  </div>
</div>


<!-- ============ STATS DETAIL PANEL ============ -->
<div id="statsDetailOverlay" class="stats-detail-overlay" hidden>
  <div class="stats-detail-panel">
    <div class="stats-detail-header">
      <h2 id="statsDetailTitle"></h2>
      <button type="button" class="icon-btn close-btn" id="statsDetailCloseBtn"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
    </div>
    <div id="statsDetailList" class="mini-list"></div>
    <p class="empty-state" id="statsDetailEmpty" hidden>No shoots in this category.</p>
  </div>
</div>

<!-- ============ STAT BOX DETAIL (Overview counters, centered) ============ -->
<div id="statBoxDetailOverlay" class="stat-box-detail-overlay" hidden>
  <div class="stat-box-detail-modal">
    <div class="modal-header">
      <h2 id="statBoxDetailTitle"></h2>
      <button type="button" class="icon-btn close-btn" id="statBoxDetailCloseBtn"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
    </div>
    <div id="statBoxDetailList" class="mini-list"></div>
    <p class="empty-state" id="statBoxDetailEmpty" hidden>No shoots here yet.</p>
  </div>
</div>
<!-- ============ PROJECT DETAIL (a project's shoots, same centered popup as the stat boxes) ============ -->
<!-- Reuses .stat-box-detail-overlay/.stat-box-detail-modal wholesale, so it
     inherits that popup's look, its z-index (under the shoot modal and the
     kebab sheet, so a row's shoot or ⋮ opened from here stacks on top), its
     [hidden] rule and both anyModalOpen() checks. Must stay AFTER
     #statBoxDetailOverlay: they share z-index 5, so a project opened from a
     stat box list sits above that list purely by source order. -->
<div id="projectDetailOverlay" class="stat-box-detail-overlay" hidden>
  <div class="stat-box-detail-modal">
    <div class="modal-header">
      <h2 id="projectDetailTitle"></h2>
      <button type="button" class="icon-btn close-btn" id="projectDetailCloseBtn"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
    </div>
    <p class="field-hint" id="projectDetailSummary"></p>
    <div id="projectDetailList" class="mini-list"></div>
    <div class="project-detail-actions">
      <button type="button" class="primary small-btn" id="projectAddDayBtn">+ Add a day</button>
      <div class="project-rename-row" id="projectRenameRow" hidden>
        <input type="text" id="projectRenameInput" class="options-rename-input" maxlength="120" placeholder="Name for the project" />
        <button type="button" class="options-item primary" id="saveProjectRenameBtn">Save</button>
      </div>
      <button type="button" class="secondary small-btn" id="projectRenameBtn">Rename</button>
      <button type="button" class="secondary small-btn" id="projectArchiveBtn">Archive project</button>
      <button type="button" class="secondary small-btn" id="projectUngroupBtn">Ungroup</button>
    </div>
  </div>
</div>

<!-- ============ TAB INTRO ============ -->
<!-- Shoot mode: a stripped-back, full-screen working view for the day of -->
<div id="shootModeOverlay" class="modal-overlay shoot-mode-overlay sm-dark" hidden>
  <!-- A page of the notebook, like Archive mode's, with the notebook around it
       dimmed so it reads as a page of its own (see breakShootModePages in
       app.js), in three parts that each start a fresh page: last time's
       lesson, the quick review buttons and the shot list (running on over
       as many pages as it takes); the mood board, its photos sized to fill
       its page; then the shooting notes. -->
  <div class="nb-chapter-board" aria-hidden="true"></div>
  <div class="modal shoot-mode-modal">
    <div class="shoot-mode-sheet" id="shootModeSheet" data-part="main">
    <div class="shoot-mode-header">
      <div class="shoot-mode-heading-wrap">
        <div class="shoot-mode-top">
          <p class="shoot-mode-eyebrow">Shoot mode</p>
          <button type="button" class="shoot-mode-exit" id="shootModeExitBtn" aria-label="Exit shoot mode">Exit</button>
        </div>
        <h2 id="shootModeTitle"></h2>
        <!-- The shoot's clock (pages/shoot-mode/clock.js): how long is left
             as the big figure, the wrap time at the right. The time input
             lies invisibly over the wrap time, so a tap opens the phone's
             own time picker to move the wrap when the shoot runs long.
             Under it, golden hour when it falls in the shoot, and the
             must-haves still to get once time's short. -->
        <div class="shoot-mode-clock">
          <p class="shoot-mode-left" id="shootModeLeft" hidden><span class="shoot-mode-left-figure" id="shootModeTimeLeft"></span><span class="shoot-mode-clock-label" id="shootModeLeftLabel"></span></p>
          <span class="shoot-mode-wrap">
            <span class="shoot-mode-wrap-pill" id="shootModeWrapPill"></span>
            <span class="shoot-mode-clock-label" id="shootModeWrapLabel"></span>
            <input type="time" class="shoot-mode-wrap-input" id="shootModeWrapInput" aria-label="Wrap time" />
          </span>
        </div>
        <div class="shoot-mode-chips">
          <p class="shoot-mode-chip shoot-mode-clock-line" id="shootModeGoldenHour" hidden></p>
          <p class="shoot-mode-chip shoot-mode-clock-line shoot-mode-must-haves" id="shootModeMustHaves" hidden></p>
        </div>
        <!-- Which of the three pages this is (pages/shoot-mode/pages.js). -->
        <div class="shoot-mode-dots" id="shootModeDots" aria-hidden="true"></div>
      </div>
    </div>
    <div class="shoot-mode-body shoot-mode-page-main" id="shootModeMain">
      <!-- What last time's shoot of this kind taught (see
           showShootModeLastTime in app.js), the same "Last time" line the
           shoot page's guide shows. -->
      <p class="field-hint shoot-mode-last-time" id="shootModeLastTime" hidden></p>
      <h3 class="shoot-mode-section-heading">Quick review</h3>
      <div class="shoot-mode-quick-review">
        <button type="button" class="shoot-mode-quick-review-btn" id="shootModeReviewDirectionBtn">Direction</button>
        <button type="button" class="shoot-mode-quick-review-btn" id="shootModeReviewLightingBtn">Lighting</button>
        <!-- Not a review like the two beside it: a random "try this" card
             (see Wild card in app.js). Same pill, so the row reads as one
             set of quick taps. -->
        <button type="button" class="shoot-mode-quick-review-btn" id="shootModeWildCardBtn">Wild card</button>
      </div>
      <h3 class="shoot-mode-section-heading shoot-mode-list-head" id="shootModeShotListHeading">Shot list <span id="shootModeShotCount"></span></h3>
      <div id="shootModeShotList" class="shoot-mode-shots"></div>
      <p class="shoot-mode-empty" id="shootModeShotsEmpty" hidden>No shots on the list for this shoot.</p>
      <button type="button" id="shootModeAddShotBtn" class="primary small-btn shoot-mode-add-shot-btn">+ Add shot</button>
    </div>
    <div class="shoot-mode-body shoot-mode-page-board" id="shootModeBoardPage">
      <div class="shoot-mode-moodboard-block" id="shootModeMoodboardBlock">
      <h3 class="shoot-mode-section-heading" id="shootModeMoodboardHeading">Mood board</h3>
      <div id="shootModeMoodboard" class="moodboard-grid"></div>
      <p class="shoot-mode-empty" id="shootModeMoodEmpty" hidden>No mood board images for this shoot.</p>
      <!-- Same as the shoot page's own "+ Add photos", and the same look as
           "+ Add shot" (see the Shoot mode code in app.js). -->
      <button type="button" id="shootModeAddMoodboardBtn" class="primary small-btn shoot-mode-add-shot-btn">+ Add photos</button>
      <input type="file" id="shootModeMoodboardFileInput" accept="image/*" multiple hidden />
      </div>
    </div>
    <div class="shoot-mode-body shoot-mode-page-more" id="shootModeMore">
      <label class="shoot-mode-shooting-notes-label">Shooting notes
        <textarea id="shootModeShootingNotes" rows="1" maxlength="6000" placeholder="Anything to remember on the day: settings, timings, things to try"></textarea>
      </label>
    </div>
    </div>
  </div>
  <div class="nb-turn-layer" aria-hidden="true"></div>
  <div class="nb-page-foot">
    <button type="button" class="nb-page-step" id="shootModePrev" aria-label="Previous page"></button>
    <span id="shootModeFoot"></span>
    <button type="button" class="nb-page-step" id="shootModeNext" aria-label="Next page"></button>
  </div>
    <!-- A wild card (the same as Quick review's), and "Done shooting",
         which wraps up the shoot. One bar, split in two. Exit is up top. -->
    <div class="shoot-mode-bottom-bar">
      <button type="button" class="shoot-mode-bottom-cta shoot-mode-bottom-cta-secondary" id="shootModeWildCardBarBtn"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3a9 9 0 0 0 0 18z" fill="currentColor"/></svg>Wild card</button>
      <button type="button" class="primary shoot-mode-bottom-cta" id="shootModeDoneBtn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>Done shooting</button>
    </div>
</div>

<!-- Editable popup shared by both Quick review buttons — same rounded,
     ink-outlined treatment as Shoot mode itself, since it's reached from
     there. Every field is tap-to-edit (see openExpandField's config-object
     form), writing straight to the shoot, same as everything else in
     Shoot Mode. -->
<div id="shootModeReviewOverlay" class="modal-overlay shoot-mode-overlay sm-dark" hidden>
  <div class="modal shoot-mode-modal shoot-mode-review-modal">
    <div class="shoot-mode-header">
      <div class="shoot-mode-heading-wrap">
        <p class="shoot-mode-eyebrow">Quick review</p>
        <h2 id="shootModeReviewTitle"></h2>
      </div>
      <button type="button" class="icon-btn close-btn" id="shootModeReviewCloseBtn" aria-label="Close"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
    </div>
    <div class="shoot-mode-body" id="shootModeReviewBody"></div>
    <button type="button" class="primary shoot-mode-bottom-cta" id="shootModeReviewOkBtn">OK</button>
  </div>
</div>

<!-- Wild card: one card from a shuffled deck. The Quick review popup's
     rounded, ink-outlined card (and its yellow eyebrow), but only as tall as
     the card itself, with Shoot mode's own split bar: "Another" draws the
     next one in place, OK puts it away. -->
<div id="shootModeWildCardOverlay" class="modal-overlay shoot-mode-overlay sm-dark" hidden>
  <div class="modal shoot-mode-modal shoot-mode-review-modal shoot-mode-wild-card-modal">
    <div class="shoot-mode-header shoot-mode-wild-card-header">
      <div class="shoot-mode-heading-wrap">
        <p class="shoot-mode-eyebrow">Wild card</p>
      </div>
      <button type="button" class="icon-btn close-btn" id="shootModeWildCardCloseBtn" aria-label="Close"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
    </div>
    <div class="shoot-mode-body">
      <p class="shoot-mode-wild-card-text" id="shootModeWildCardText" aria-live="polite"></p>
      <!-- "Tried it" keeps the card with this shoot, for its reflection to
           ask about (see Wild card in app.js). White, like the "+ Add to
           shooting notes" sub-action, under the yellow OK. -->
      <div class="shoot-mode-wild-card-tried">
        <button type="button" class="secondary small-btn" id="shootModeWildCardTriedBtn">Tried it</button>
        <p class="field-hint" id="shootModeWildCardSaved" hidden>Saved. Your reflection will ask how it went.</p>
      </div>
    </div>
    <div class="shoot-mode-bottom-bar">
      <button type="button" class="shoot-mode-bottom-cta shoot-mode-bottom-cta-secondary" id="shootModeWildCardAnotherBtn">Another</button>
      <button type="button" class="primary shoot-mode-bottom-cta" id="shootModeWildCardOkBtn">OK</button>
    </div>
  </div>
</div>


<div id="tabIntroOverlay" class="modal-overlay intro-overlay" hidden>
  <div class="modal intro-modal">
    <h2 id="tabIntroTitle"></h2>
    <p id="tabIntroText"></p>
    <button type="button" class="primary" id="tabIntroCloseBtn">got it!</button>
  </div>
</div>

<!-- ============ NEW SHOOT STATUS BUTTON INTRO ============ -->
<div id="statusSwatchIntroOverlay" class="modal-overlay intro-overlay" hidden>
  <div class="modal intro-modal">
    <h2>Status button</h2>
    <p>Use the status button up top to track your shoot progress from early idea to delivery.</p>
    <button type="button" class="primary" id="statusSwatchIntroCloseBtn">got it!</button>
  </div>
</div>

<!-- ============ POST-SHOOT REFLECTION PROMPT ============ -->
<div id="postShootPromptOverlay" class="modal-overlay intro-overlay" hidden>
  <div class="modal intro-modal">
    <h2>Reflection</h2>
    <p id="postShootPromptText">Complete post shoot reflection?</p>
    <div class="modal-actions fit-pair" id="postShootPromptActions">
      <button type="button" class="secondary" id="postShootPromptLaterBtn">Later</button>
      <button type="button" class="primary" id="postShootPromptYesBtn">Reflect now</button>
    </div>
    <!-- Opens the shoot at Reflection with the reflection helper's questions. -->
    <button type="button" class="manage-link" id="postShootPromptWalkBtn">Walk me through it</button>
    <button type="button" class="primary" id="postShootPromptDismissBtn" hidden>got it!</button>
  </div>
</div>

<!-- ============ COMPLETE SHOOT CONFIRM ============ -->
<div id="completeShootPromptOverlay" class="modal-overlay intro-overlay" hidden>
  <div class="modal intro-modal">
    <h2>Complete shoot?</h2>
    <p>This archives the shoot. It moves out of your active Shoots list and into the Archive tab. You can still reopen, edit, or unarchive it anytime from there.</p>
    <div class="modal-actions">
      <button type="button" class="secondary" id="completeShootPromptCancelBtn">Cancel</button>
      <button type="button" class="primary" id="completeShootPromptConfirmBtn">Complete shoot</button>
    </div>
  </div>
</div>

<!-- ============ DAILY REPORT ============ -->
<div id="dailyReportOverlay" class="modal-overlay intro-overlay" hidden>
  <div class="modal intro-modal daily-report-modal">
    <h2>Daily report</h2>
    <div id="dailyReportList" class="mini-list"></div>
    <button type="button" class="primary" id="dailyReportCloseBtn">got it!</button>
  </div>
</div>

<!-- Monday brief: last week at a glance, once a week (see Monday brief in
     app.js). Quick review's card (its yellow eyebrow, a title, the X, a
     scrolling body and one OK across the bottom), only as tall as what it
     has to say, like Wild card. The body is filled in from app.js. -->
<div id="mondayBriefOverlay" class="modal-overlay shoot-mode-overlay" hidden>
  <div class="modal shoot-mode-modal shoot-mode-review-modal monday-brief-modal">
    <div class="shoot-mode-header">
      <div class="shoot-mode-heading-wrap">
        <p class="shoot-mode-eyebrow">Monday brief</p>
        <h2 id="mondayBriefTitle"></h2>
      </div>
      <button type="button" class="icon-btn close-btn" id="mondayBriefCloseBtn" aria-label="Close"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
    </div>
    <div class="shoot-mode-body" id="mondayBriefBody"></div>
    <button type="button" class="primary shoot-mode-bottom-cta" id="mondayBriefOkBtn">OK</button>
  </div>
</div>

<!-- ============ ADD DEADLINE PROMPT ============ -->
<div id="deadlinePromptOverlay" class="modal-overlay intro-overlay" hidden>
  <div class="modal intro-modal daily-report-modal">
    <h2>Add deadline?</h2>
    <p>Set a due date for this shoot now, or add one later from Basic Info.</p>
    <input type="date" id="deadlinePromptDateInput" class="deadline-prompt-input" />
    <div class="modal-actions fit-pair" id="deadlinePromptActions">
      <button type="button" class="secondary" id="deadlinePromptNotNowBtn">Not now</button>
      <button type="button" class="primary" id="deadlinePromptOkBtn" disabled>Set deadline</button>
    </div>
  </div>
</div>

<!-- ============ MULTI-DAY SHOOT PROMPT ============ -->
<div id="multiDayPromptOverlay" class="modal-overlay intro-overlay" hidden>
  <div class="modal intro-modal daily-report-modal">
    <h2>Multi-day shoot</h2>
    <p id="multiDayPromptText"></p>
    <input type="text" id="multiDayProjectNameInput" class="deadline-prompt-input" maxlength="120" placeholder="Project name" aria-label="Project name" />
    <div class="modal-actions">
      <button type="button" class="secondary" id="multiDayPromptCancelBtn">Cancel</button>
      <button type="button" class="primary" id="multiDayPromptCreateBtn">Create days</button>
    </div>
  </div>
</div>

<!-- ============ RESTORE FROM BACKUP CONFIRMATION ============ -->
<!-- The titled card the app's other prompts use. "Back up first" sits under
     the pair, like the guide's Skip row: it runs a backup of what's here now
     and leaves this popup open, so Restore is still one tap away after. -->
<div id="importConfirmOverlay" class="modal-overlay intro-overlay" hidden>
  <div class="modal intro-modal">
    <h2>Restore a backup?</h2>
    <p>Restoring replaces everything in the app (every shoot, journal entry, framework and photo) with what's in the backup file. Anything that isn't in the backup is lost, and this can't be undone.</p>
    <div class="modal-actions">
      <button type="button" class="secondary" id="cancelImportBtn">Cancel</button>
      <button type="button" class="primary" id="confirmImportBtn">Restore</button>
    </div>
    <div class="shoot-tour-skip-row">
      <button type="button" class="secondary journal-block-btn" id="importBackupFirstBtn">Back up first</button>
    </div>
  </div>
</div>

<!-- ============ JOURNAL ENTRY MODAL ============ -->
<div id="journalModalOverlay" class="modal-overlay" hidden>
  <div class="modal">
    <div class="modal-header">
      <h2>Journal Entry</h2>
      <button class="icon-btn close-btn" data-close="journal"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
    </div>

    <div id="journalViewMode" hidden>
      <div class="journal-view-header">
        <h3 class="journal-view-title" id="journalViewTitle"></h3>
        <button type="button" class="primary small-btn" id="editJournalBtn">Edit</button>
      </div>
      <p class="mi-sub" id="journalViewDate"></p>
      <p class="field-hint" id="journalViewLinkedHint" hidden>Tap the text below to revisit and edit this shoot's reflection.</p>
      <div class="journal-paper" id="journalViewBody"></div>
      <div id="journalViewImagesGrid" class="moodboard-grid"></div>
      <div class="beats-chips journal-view-tags" id="journalViewTags"></div>
      <button type="button" class="plain-delete-btn pre-save-divider" id="deleteJournalViewBtn" hidden>Delete</button>
      <div class="modal-actions">
        <button type="button" class="primary journal-block-btn" id="journalViewDoneBtn"></button>
      </div>
    </div>

    <div id="journalForm" hidden>
      <label>Subject
        <input type="text" id="journalSubject" maxlength="120" placeholder="What's this entry about" />
      </label>
      <label>Entry
        <textarea id="journalBody" rows="12" placeholder="Write freely…"></textarea>
      </label>
      <button type="button" class="primary journal-block-btn" id="journalPromptBtn">Need a starting prompt?</button>
      <div class="moodboard-section">
        <span class="moodboard-label">Photos</span>
        <button type="button" id="addJournalPhotos" class="primary small-btn">+ Add photos</button>
        <input type="file" id="journalImagesFileInput" accept="image/*" multiple hidden />
        <div id="journalImagesGrid" class="moodboard-grid"></div>
      </div>
      <div class="beats-block">
        <label class="beats-label">Hashtags</label>
        <div class="beats-chips" id="journalTagsChips"></div>
        <input type="text" id="journalTagsInput" placeholder="Type a hashtag, press Enter" />
        <div class="beats-suggestions" id="journalTagsSuggestions"></div>
      </div>
      <button type="button" class="plain-delete-btn pre-save-divider" id="deleteJournalBtn" hidden>Delete</button>
      <div class="modal-actions">
        <button type="button" class="primary" id="saveJournalBtn">Save</button>
      </div>
    </div>
  </div>
</div>

<!-- ============ JOURNAL PROMPT PICKER ============ -->
<div id="journalPromptOverlay" class="modal-overlay intro-overlay" hidden>
  <div class="modal intro-modal daily-report-modal">
    <h2>Need a starting prompt?</h2>
    <p id="journalPromptText"></p>
    <div class="modal-actions">
      <button type="button" class="secondary" id="journalPromptAnotherBtn">Try another one</button>
      <button type="button" class="primary" id="journalPromptAcceptBtn">Accept</button>
    </div>
  </div>
</div>

<!-- ============ LOG SHOOT REFERENCE ============ -->
<div id="logShootRefOverlay" class="modal-overlay intro-overlay" hidden>
  <div class="modal intro-modal daily-report-modal">
    <h2>Referring to</h2>
    <p id="logShootRefName"></p>
    <div class="modal-actions">
      <button type="button" class="secondary" id="logShootRefCancelBtn">Close</button>
      <button type="button" class="primary" id="logShootRefViewBtn">View shoot</button>
    </div>
  </div>
</div>

<!-- ============ REFLECTIONS TABLE OF CONTENTS ============ -->
<div id="journalTocOverlay" class="modal-overlay" hidden>
  <div class="modal rounded-modal journal-toc-modal">
    <div class="modal-header">
      <h2>Table of contents</h2>
      <button class="icon-btn close-btn" data-close="journalToc"><svg class="x-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/></svg></button>
    </div>
    <div class="journal-toc-scroll">
      <div id="journalTocList"></div>
      <p class="empty-state" id="journalTocEmpty" hidden>Nothing in the journal yet.</p>
    </div>
  </div>
</div>

<!-- ============ TOAST ============ -->
<!-- ============ CONFIRM (the app's own, in place of the browser's confirm()) ============ -->
<!-- askConfirm() in app.js: a title, an optional line of text and two buttons
     named for what they do. Last of the popups, and a notch above them (see
     .app-confirm-overlay), so it stacks over whichever one it was asked from. -->
<div id="appConfirmOverlay" class="modal-overlay intro-overlay app-confirm-overlay" hidden>
  <div class="modal intro-modal">
    <h2 id="appConfirmTitle"></h2>
    <p id="appConfirmText"></p>
    <div class="modal-actions fit-pair" id="appConfirmActions">
      <button type="button" class="secondary" id="appConfirmCancelBtn">Cancel</button>
      <button type="button" class="primary" id="appConfirmOkBtn">OK</button>
    </div>
  </div>
</div>

<!-- Save a backup: "Putting it together", then the file (or files) to save, a tap each. -->
<div id="backupOverlay" class="modal-overlay intro-overlay app-confirm-overlay" hidden>
  <div class="modal intro-modal">
    <h2>Save a backup</h2>
    <p id="backupText"></p>
    <div class="modal-actions fit-pair" id="backupActions">
      <button type="button" class="secondary" id="backupCancelBtn">Cancel</button>
      <button type="button" class="primary" id="backupSaveBtn" hidden>Save the backup</button>
    </div>
  </div>
</div>

`);
  here.remove();
})();
