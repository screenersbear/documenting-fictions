// Kinds of shoot: their names, which show in the lists, the pie colours, new shoots' titles and the look tags.
// (Loaded before app.js, which runs it in its turn.)
window.EyeParts = window.EyeParts || {};
window.EyeParts.addCategories = function addCategories(ed) {
  Object.assign(ed, { pickRandomSaveMessage, isCategoryVisible, saveCategoryVisibility, randomNewShootTitle });
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
  }; ed.CATEGORY_LABELS = CATEGORY_LABELS;

  const CATEGORY_FILTER_ORDER = ['commercial', 'content_shoot', 'video', 'editorial', 'lighting_test', 'portfolio_building', 'test_shoot', 'event', 'wedding', 'engagement', 'family', 'headshot', 'branding', 'publicity', 'maternity', 'other']; ed.CATEGORY_FILTER_ORDER = CATEGORY_FILTER_ORDER;

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
  }; ed.CATEGORY_PLURAL_LABELS = CATEGORY_PLURAL_LABELS;

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

  let categoryVisibility = loadCategoryVisibility(); ed.categoryVisibility = categoryVisibility;

  function isCategoryVisible(cat) {
    return categoryVisibility[cat] !== false;
  }

  function saveCategoryVisibility() {
    localStorage.setItem(CATEGORY_VISIBILITY_KEY, JSON.stringify(categoryVisibility));
  }

  // The chart slices, in this order (DESIGN.md 4.3, the mark colours): the
  // app's navy and mango first, then the board's brights.
  const PIE_COLORS = [
    '#313d45', // navy (text)
    '#ffd103', // mango yellow (accent)
    '#0596ff', // sky
    '#2c5e3c', // forest
    '#f7a52b', // amber
    '#a1062a', // crimson
    '#e2e600', // chartreuse
    '#7d8a92', // slate
  ]; ed.PIE_COLORS = PIE_COLORS;

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

  const VISUAL_LANGUAGE_TAGS = ['Lifestyle', 'Documentary', 'Surrealism', 'Portrait', 'Fashion', 'Fitness', 'Cinematic', 'Commercial', 'Headshot', 'Beauty', 'Couples', 'Other']; ed.VISUAL_LANGUAGE_TAGS = VISUAL_LANGUAGE_TAGS;
  // Tags dropped from VISUAL_LANGUAGE_TAGS. Kept as a named list because the
  // framework lives in saved state, not in the constant above — an existing
  // install has its own copy, so retiring a tag takes a migration (see
  // removeFrameworkTags).
  const RETIRED_VISUAL_LANGUAGE_TAGS = ['Magic realism']; ed.RETIRED_VISUAL_LANGUAGE_TAGS = RETIRED_VISUAL_LANGUAGE_TAGS;
};
