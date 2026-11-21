// The templates the New layout guide offers for a size. Stories get their own
// set, story versions of the post layouts, and never a panorama: a Story is
// seen one at a time, so a photo can't carry on into the next one.
import { SLIDE_W, RATIOS } from './formats.js';
import { SLIDE_LAYOUTS, layoutRects } from './slide-layouts.js';
import { changeRatio } from './slides.js';

const STORY = '9:16';
const BORDER = 60; // the same white border as the post template White border
const base = { background: '#ffffff', seamsOpen: false, borderWidth: 0, borderColor: '#ffffff', ratio: STORY, builtIn: true };

// The post grids that still work standing tall (Three across and the side by
// side ones would be thin strips in a Story).
export const STORY_GRIDS = ['two-stacked', 'three-stacked', 'big-top', 'grid-4', 'grid-6', 'centred'];

// True when any box runs across the edge of a slide onto the next one.
export function hasPanorama(t) {
  return (t.frames || []).some((f) => Math.floor((f.x + 0.5) / SLIDE_W) !== Math.floor((f.x + f.w - 0.5) / SLIDE_W));
}

// One story with a post grid on it, inside the white border.
function gridStory(layout) {
  const p = { ...base, slides: 1, padding: BORDER };
  return { ...p, id: `story-${layout.key}`, name: layout.name, frames: layoutRects(p, 0, layout).map(({ x, y, w, h }) => ({ x, y, w, h })) };
}

// The Story set, made fresh each time (never saved, so never out of date).
export function storyTemplates() {
  const H = RATIOS[STORY].h;
  const full = (i) => ({ x: i * SLIDE_W, y: 0, w: SLIDE_W, h: H });
  const bordered = (i) => ({ x: i * SLIDE_W + BORDER, y: BORDER, w: SLIDE_W - 2 * BORDER, h: H - 2 * BORDER });
  return [
    { ...base, id: 'story-full', name: 'Full bleed', slides: 1, padding: 0, frames: [full(0)] },
    { ...base, id: 'story-series', name: 'Series of 3', slides: 3, padding: 0, frames: [0, 1, 2].map(full) },
    { ...base, id: 'story-white-border', name: 'White border', slides: 3, padding: BORDER, frames: [0, 1, 2].map(bordered) },
    ...STORY_GRIDS.map((key) => gridStory(SLIDE_LAYOUTS.find((l) => l.key === key))),
  ];
}

// What the Template step lists for `ratio`, each already in that size. Posts
// and prints: the saved templates (not the old story starters). Stories: the
// Story set, then the ones you saved yourself that have no panorama.
export function templateChoices(saved, ratio) {
  const fit = (t) => (t.ratio === ratio ? t : changeRatio(t, ratio));
  const list = saved || [];
  if (!RATIOS[ratio].story) return list.filter((t) => t.starterKey !== 'story' && t.starterKey !== 'full-bleed').map(fit);
  return [...storyTemplates(), ...list.filter((t) => !t.starter && !hasPanorama(t)).map(fit)];
}
