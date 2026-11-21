// contact-sheet's Story templates (data/story-templates.js) and how far a box
// can stretch (data/spreads.js resizeRoom): Stories get story versions of the
// post layouts and never a panorama.
import { describe, it, expect } from 'vitest';
import { hasPanorama, storyTemplates, templateChoices, STORY_GRIDS } from '../../../contact-sheet/data/story-templates.js';
import { resizeRoom } from '../../../contact-sheet/data/spreads.js';
import { starterTemplates, layoutFromTemplate } from '../../../contact-sheet/data/templates.js';
import { SLIDE_LAYOUTS } from '../../../contact-sheet/data/slide-layouts.js';

const fr = (x, y, w, h) => ({ x, y, w, h });
const byId = (id) => storyTemplates().find((t) => t.id === id);
const within = (t) => t.frames.every((f) => f.x >= 0 && f.y >= 0 && f.x + f.w <= t.slides * 1080 && f.y + f.h <= 1920);

describe('hasPanorama', () => {
  it('is false for boxes that each sit on one slide', () => {
    expect(hasPanorama({ frames: [fr(0, 0, 1080, 1440), fr(1080, 0, 1080, 1440), fr(2200, 10, 500, 500)] })).toBe(false);
  });
  it('is true for a box running across a seam', () => {
    expect(hasPanorama({ frames: [fr(0, 0, 1080, 100), fr(500, 0, 1000, 100)] })).toBe(true);
    expect(hasPanorama({ frames: [fr(1079, 0, 3, 3)] })).toBe(true);
  });
  it('lets a box end exactly on a seam, or be off by under half a unit', () => {
    expect(hasPanorama({ frames: [fr(1080, 0, 1080, 5)] })).toBe(false);
    expect(hasPanorama({ frames: [fr(1079.6, 0, 1080.6, 5)] })).toBe(false);
  });
  it('is false with no boxes or no frames list', () => {
    expect(hasPanorama({ frames: [] })).toBe(false);
    expect(hasPanorama({})).toBe(false);
  });
  it('finds the starter panoramas and not White border', () => {
    const by = Object.fromEntries(starterTemplates().map((t) => [t.starterKey, hasPanorama(t)]));
    expect(by).toEqual({ 'white-border': false, panorama: true, 'panorama-singles': true, story: false });
  });
  it('fails without a template', () => {
    expect(() => hasPanorama(undefined)).toThrow(TypeError);
  });
});

describe('STORY_GRIDS', () => {
  it('names post grids that exist', () => {
    const keys = SLIDE_LAYOUTS.map((l) => l.key);
    expect(STORY_GRIDS.every((k) => keys.includes(k))).toBe(true);
  });
  it('leaves out the thin side-by-side grids and Blank', () => {
    expect(STORY_GRIDS).toEqual(['two-stacked', 'three-stacked', 'big-top', 'grid-4', 'grid-6', 'centred']);
    for (const k of ['three-across', 'side-by-side', 'big-left', 'blank', 'full']) expect(STORY_GRIDS).not.toContain(k);
  });
});

describe('storyTemplates', () => {
  it('lists the Story set in order', () => {
    expect(storyTemplates().map((t) => [t.id, t.name, t.slides])).toEqual([
      ['story-full', 'Full bleed', 1],
      ['story-series', 'Series of 3', 3],
      ['story-white-border', 'White border', 3],
      ['story-two-stacked', 'Two stacked', 1],
      ['story-three-stacked', 'Three stacked', 1],
      ['story-big-top', 'Big top, two below', 1],
      ['story-grid-4', 'Grid of 4', 1],
      ['story-grid-6', 'Grid of 6', 1],
      ['story-centred', 'Small, centred', 1],
    ]);
  });
  it('makes every one a built-in 9:16 Story with white and closed seams', () => {
    for (const t of storyTemplates()) {
      expect(t).toMatchObject({ ratio: '9:16', builtIn: true, background: '#ffffff', seamsOpen: false, borderWidth: 0, borderColor: '#ffffff' });
      expect(t.starter).toBeUndefined();
    }
  });
  it('never has a panorama, and every box sits inside its stories', () => {
    for (const t of storyTemplates()) {
      expect(hasPanorama(t)).toBe(false);
      expect(within(t)).toBe(true);
      expect(t.frames.length).toBeGreaterThan(0);
    }
  });
  it('fills each story edge to edge in Full bleed and Series of 3', () => {
    expect(byId('story-full')).toMatchObject({ padding: 0, frames: [fr(0, 0, 1080, 1920)] });
    expect(byId('story-series')).toMatchObject({ padding: 0, frames: [fr(0, 0, 1080, 1920), fr(1080, 0, 1080, 1920), fr(2160, 0, 1080, 1920)] });
  });
  it('gives White border a 60 border on each of three stories, like the post one', () => {
    expect(byId('story-white-border')).toMatchObject({ padding: 60, frames: [fr(60, 60, 960, 1800), fr(1140, 60, 960, 1800), fr(2220, 60, 960, 1800)] });
    expect(starterTemplates().find((t) => t.starterKey === 'white-border').padding).toBe(60);
  });
  it('puts the grids inside the same border, with the border between the photos', () => {
    expect(byId('story-two-stacked')).toMatchObject({ padding: 60, frames: [fr(60, 60, 960, 870), fr(60, 990, 960, 870)] });
    expect(byId('story-grid-4').frames).toEqual([fr(60, 60, 450, 870), fr(570, 60, 450, 870), fr(60, 990, 450, 870), fr(570, 990, 450, 870)]);
    expect(byId('story-three-stacked').frames).toHaveLength(3);
    expect(byId('story-big-top').frames).toHaveLength(3);
    expect(byId('story-grid-6').frames).toHaveLength(6);
    expect(byId('story-centred').frames).toEqual([fr(234, 450, 612, 1020)]);
  });
  it('keeps only the place of each box, never a photo or an id', () => {
    for (const t of storyTemplates()) for (const f of t.frames) expect(Object.keys(f).sort()).toEqual(['h', 'w', 'x', 'y']);
  });
  it('makes a fresh copy each time', () => {
    const a = storyTemplates();
    a[0].frames[0].w = 1;
    a[0].name = 'changed';
    expect(storyTemplates()[0]).toMatchObject({ name: 'Full bleed', frames: [fr(0, 0, 1080, 1920)] });
  });
  it('turns into a layout to edit', () => {
    const p = layoutFromTemplate(byId('story-grid-4'));
    expect(p).toMatchObject({ ratio: '9:16', slides: 1, padding: 60, seamsOpen: false });
    expect(p.frames).toHaveLength(4);
    expect(p.frames.every((f) => f.photoId === null && typeof f.id === 'string')).toBe(true);
  });
});

describe('templateChoices', () => {
  const mine = (over = {}) => ({ id: 'm', name: 'Mine', ratio: '3:4', slides: 1, padding: 0, seamsOpen: false, frames: [fr(0, 0, 1080, 1440)], ...over });
  const starters = () => starterTemplates().map((t, i) => ({ ...t, id: `s${i}` }));

  it('gives posts the saved templates, in the post size, without the old story starter', () => {
    const list = templateChoices([...starters(), mine()], '3:4');
    expect(list.map((t) => t.id)).toEqual(['s0', 's1', 's2', 'm']);
    expect(list.every((t) => t.ratio === '3:4')).toBe(true);
    expect(list.some((t) => t.builtIn)).toBe(false);
  });
  it('hands back a template already in the size as it is', () => {
    const t = mine();
    expect(templateChoices([t], '3:4')[0]).toBe(t);
    const tall = mine({ ratio: '9:16' });
    expect(templateChoices([tall], '9:16').at(-1)).toBe(tall);
  });
  it('fits templates to another post size, keeping boxes in place', () => {
    const [t] = templateChoices([mine()], '1:1');
    expect(t).toMatchObject({ id: 'm', ratio: '1:1', frames: [fr(0, 0, 1080, 1080)] });
  });
  it('leaves out a starter with the old full-bleed key', () => {
    expect(templateChoices([mine({ id: 'f', starterKey: 'full-bleed' }), mine()], '4:5').map((t) => t.id)).toEqual(['m']);
  });
  it('keeps panoramas for posts', () => {
    expect(templateChoices([mine({ id: 'p', slides: 2, frames: [fr(0, 0, 2160, 1440)] })], '3:4')).toHaveLength(1);
  });
  it('gives Stories the Story set first, then your own templates without panoramas', () => {
    const pano = mine({ id: 'pano', slides: 2, frames: [fr(0, 0, 2160, 1440)] });
    const list = templateChoices([...starters(), mine(), pano, mine({ id: 'tall', ratio: '9:16', frames: [fr(0, 0, 1080, 1920)] })], '9:16');
    const ids = list.map((t) => t.id);
    expect(ids).toEqual([...storyTemplates().map((t) => t.id), 'm', 'tall']);
    expect(list.every((t) => t.ratio === '9:16' && !hasPanorama(t))).toBe(true);
  });
  it('turns your post template into a story version', () => {
    const own = templateChoices([mine()], '9:16').at(-1);
    expect(own).toMatchObject({ id: 'm', ratio: '9:16', frames: [fr(0, 0, 1080, 1920)] });
  });
  it('gives the Story set alone with nothing saved', () => {
    expect(templateChoices([], '9:16')).toEqual(storyTemplates());
    expect(templateChoices(undefined, '9:16')).toHaveLength(9);
    expect(templateChoices(undefined, '3:4')).toEqual([]);
  });
  it('treats print sizes like posts', () => {
    expect(templateChoices([mine()], 'a4').map((t) => t.ratio)).toEqual(['a4']);
  });
  it('fails for a size that does not exist', () => {
    expect(() => templateChoices([], 'nope')).toThrow(TypeError);
  });
});

describe('resizeRoom', () => {
  const post = { ratio: '3:4', slides: 4 };
  const story = { ratio: '9:16', slides: 3 };
  it('lets a post box reach across the open spread', () => {
    expect(resizeRoom(post, 0, 100)).toEqual([0, 2160]);
    expect(resizeRoom(post, 1, 2200)).toEqual([2160, 4320]);
  });
  it('keeps a Story box on its own story', () => {
    expect(resizeRoom(story, 0, 0)).toEqual([0, 1080]);
    expect(resizeRoom(story, 0, 1500)).toEqual([1080, 2160]);
    expect(resizeRoom(story, 1, 2160)).toEqual([2160, 3240]);
  });
  it('counts a box half a unit before a seam as on the next story', () => {
    expect(resizeRoom(story, 0, 1079.5)).toEqual([1080, 2160]);
    expect(resizeRoom(story, 0, 1079.4)).toEqual([0, 1080]);
  });
  it('keeps a Story box that starts past either end on the nearest story', () => {
    expect(resizeRoom(story, 0, -50)).toEqual([0, 1080]);
    expect(resizeRoom(story, 1, 9999)).toEqual([2160, 3240]);
    expect(resizeRoom({ ratio: '9:16', slides: 0 }, 0, 500)).toEqual([0, 1080]);
  });
  it('fails for a size that does not exist', () => {
    expect(() => resizeRoom({ ratio: 'nope', slides: 1 }, 0, 0)).toThrow(TypeError);
  });
});
