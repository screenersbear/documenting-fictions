// contact-sheet/js/model.js: formats, starter templates and the geometry of a
// project (one long strip of 1080-wide slides).
import { describe, it, expect } from 'vitest';
import * as M from '../../../contact-sheet/js/model.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const proj = (over = {}) => ({ ratio: '3:4', slides: 3, padding: 0, seamsOpen: false, frames: [], ...over });
const fr = (x, y, w, h, extra = {}) => ({ x, y, w, h, ...extra });
const crop = (over = {}) => ({ zoom: 1, cx: 0.5, cy: 0.5, rot: 0, ...over });

// ---------- Formats ----------

describe('constants', () => {
  it('has the fixed slide width, slide limit and smallest frame', () => {
    expect(M.SLIDE_W).toBe(1080);
    expect(M.MAX_SLIDES).toBe(20);
    expect(M.MIN_FRAME).toBe(60);
  });
  it('keeps Instagram’s Story safe zones and the default colours', () => {
    expect(M.SAFE_TOP).toBe(250);
    expect(M.SAFE_BOTTOM).toBe(340);
    expect(M.DEFAULT_BG).toBe('#ffffff');
    expect(M.DEFAULT_RATIO).toBe('3:4');
  });
  it('lists the layout keys a template keeps', () => {
    expect(M.LAYOUT_KEYS).toEqual(['ratio', 'slides', 'background', 'padding', 'seamsOpen', 'borderWidth', 'borderColor']);
  });
});

describe('RATIOS', () => {
  it('describes every format exactly as the picker shows it', () => {
    expect(M.RATIOS).toEqual({
      '3:4': { h: 1440, story: false, label: 'Feed post 3:4', size: '1080 × 1440', detail: 'Tall. Matches the profile grid.' },
      '4:5': { h: 1350, story: false, label: 'Feed post 4:5', size: '1080 × 1350', detail: 'The classic portrait size.' },
      '1:1': { h: 1080, story: false, label: 'Feed post 1:1', size: '1080 × 1080', detail: 'Square.' },
      '9:16': { h: 1920, story: true, label: 'Story 9:16', size: '1080 × 1920', detail: 'Full screen. One or a series.' },
      '2:3': { h: 1620, story: false, print: true, scale: 1, label: 'Photo 4 × 6', size: '4 × 6 in', detail: 'The usual photo print.' },
      '5:7': { h: 1512, story: false, print: true, scale: 1.5, label: 'Photo 5 × 7', size: '5 × 7 in', detail: 'A framed print.' },
      '8:10': { h: 1350, story: false, print: true, scale: 2, label: 'Print 8 × 10', size: '8 × 10 in', detail: 'A larger print.' },
      letter: { h: 1398, story: false, print: true, scale: 2, label: 'US Letter', size: '8.5 × 11 in', detail: 'A full sheet of paper.' },
      a4: { h: 1527, story: false, print: true, scale: 2, label: 'A4', size: '210 × 297 mm', detail: 'A full sheet of paper.' },
      '3:2': { h: 720, story: false, print: true, scale: 2, label: 'Landscape 3:2', size: '6 × 4 in', detail: 'A photo print on its side.' },
      '4:3': { h: 810, story: false, print: true, scale: 2, label: 'Landscape 4:3', size: '2160 × 1620', detail: 'Wide, for slides and screens.' },
      '16:9': { h: 608, story: false, print: true, scale: 2, label: 'Widescreen 16:9', size: '2160 × 1216', detail: 'Wider, for video and presentations.' },
    });
  });
  it('orders the posting formats first and the print formats after', () => {
    expect(M.RATIO_ORDER).toEqual(['3:4', '4:5', '1:1', '9:16']);
    expect(M.MORE_RATIOS).toEqual(['2:3', '5:7', '8:10', 'letter', 'a4', '3:2', '4:3', '16:9']);
  });
  it('lists every format exactly once between the two lists', () => {
    const all = [...M.RATIO_ORDER, ...M.MORE_RATIOS];
    expect(new Set(all).size).toBe(all.length);
    expect(all.sort()).toEqual(Object.keys(M.RATIOS).sort());
    expect(M.RATIO_ORDER.every((k) => !M.RATIOS[k].print)).toBe(true);
    expect(M.MORE_RATIOS.every((k) => M.RATIOS[k].print)).toBe(true);
  });
});

describe('slideH', () => {
  it('reads a feed slide height from the ratio', () => {
    expect(M.slideH({ ratio: '3:4' })).toBe(1440);
    expect(M.slideH({ ratio: '1:1' })).toBe(1080);
  });
  it('reads the tallest (Story) and shortest (16:9) heights', () => {
    expect(M.slideH({ ratio: '9:16' })).toBe(1920);
    expect(M.slideH({ ratio: '16:9' })).toBe(608);
  });
  it('fails on an unknown ratio', () => {
    expect(() => M.slideH({ ratio: 'nope' })).toThrow(TypeError);
  });
});

describe('isStory', () => {
  it('knows a Story', () => {
    expect(M.isStory({ ratio: '9:16' })).toBe(true);
  });
  it('says no for feed posts and prints', () => {
    expect(M.isStory({ ratio: '3:4' })).toBe(false);
    expect(M.isStory({ ratio: 'a4' })).toBe(false);
  });
  it('fails without a ratio', () => {
    expect(() => M.isStory({})).toThrow(TypeError);
  });
});

describe('isPrint', () => {
  it('knows a print format, as a real boolean', () => {
    expect(M.isPrint({ ratio: 'a4' })).toBe(true);
    expect(M.isPrint({ ratio: '2:3' })).toBe(true);
  });
  it('says false, not undefined, for feed posts and Stories', () => {
    expect(M.isPrint({ ratio: '3:4' })).toBe(false);
    expect(M.isPrint({ ratio: '9:16' })).toBe(false);
  });
  it('fails on an unknown ratio', () => {
    expect(() => M.isPrint({ ratio: '7:7' })).toThrow(TypeError);
  });
});

describe('stripW', () => {
  it('measures the strip as slides side by side', () => {
    expect(M.stripW({ slides: 1 })).toBe(1080);
    expect(M.stripW({ slides: 3 })).toBe(3240);
  });
  it('handles no slides and the most slides', () => {
    expect(M.stripW({ slides: 0 })).toBe(0);
    expect(M.stripW({ slides: M.MAX_SLIDES })).toBe(21600);
  });
  it('gives NaN for a missing slide count', () => {
    expect(M.stripW({})).toBeNaN();
  });
});

describe('pageWord / pageTitle', () => {
  it('calls a feed page a slide', () => {
    expect(M.pageWord({ ratio: '3:4' })).toBe('slide');
    expect(M.pageWord({ ratio: '1:1' }, true)).toBe('slides');
    expect(M.pageTitle({ ratio: '4:5' })).toBe('Slide');
    expect(M.pageTitle({ ratio: '4:5' }, true)).toBe('Slides');
  });
  it('calls a Story page a story', () => {
    expect(M.pageWord({ ratio: '9:16' })).toBe('story');
    expect(M.pageWord({ ratio: '9:16' }, true)).toBe('stories');
    expect(M.pageTitle({ ratio: '9:16' })).toBe('Story');
    expect(M.pageTitle({ ratio: '9:16' }, true)).toBe('Stories');
  });
  it('calls a print page a page', () => {
    expect(M.pageWord({ ratio: 'letter' })).toBe('page');
    expect(M.pageWord({ ratio: 'letter' }, true)).toBe('pages');
    expect(M.pageTitle({ ratio: '16:9' })).toBe('Page');
    expect(M.pageTitle({ ratio: '16:9' }, true)).toBe('Pages');
  });
  it('treats a falsy plural as singular', () => {
    expect(M.pageWord({ ratio: '3:4' }, 0)).toBe('slide');
    expect(M.pageTitle({ ratio: '9:16' }, '')).toBe('Story');
  });
  it('fails on an unknown ratio', () => {
    expect(() => M.pageWord({ ratio: 'x' })).toThrow(TypeError);
    expect(() => M.pageTitle({})).toThrow(TypeError);
  });
});

// ---------- Frames and templates ----------

describe('defaultCrop / newFrame', () => {
  it('starts a crop centred, unzoomed and upright', () => {
    expect(M.defaultCrop()).toEqual({ zoom: 1, cx: 0.5, cy: 0.5, rot: 0 });
  });
  it('is the crop every new frame starts with', () => {
    expect(M.newFrame(0, 0, 1, 1).crop).toEqual(M.defaultCrop());
  });
  it('gives a fresh crop object each time', () => {
    const a = M.defaultCrop();
    a.zoom = 3;
    expect(M.defaultCrop().zoom).toBe(1);
  });
  it('makes an empty frame with an id and a default crop', () => {
    const f = M.newFrame(10, 20, 300, 400);
    expect(f).toEqual({ id: expect.stringMatching(UUID), x: 10, y: 20, w: 300, h: 400, photoId: null, crop: { zoom: 1, cx: 0.5, cy: 0.5, rot: 0 } });
  });
  it('keeps a given photo and gives every frame its own id and crop', () => {
    const a = M.newFrame(0, 0, 1, 1, 'photo-1');
    const b = M.newFrame(0, 0, 1, 1);
    expect(a.photoId).toBe('photo-1');
    expect(a.id).not.toBe(b.id);
    expect(a.crop).not.toBe(b.crop);
  });
  it('stores whatever numbers it is given, even missing ones', () => {
    expect(M.newFrame()).toMatchObject({ x: undefined, y: undefined, w: undefined, h: undefined, photoId: null });
  });
});

describe('blankLayout', () => {
  it('makes a one-slide 3:4 project with one full-slide frame by default', () => {
    const p = M.blankLayout();
    expect(p).toEqual({
      ratio: '3:4', slides: 1, background: '#ffffff', padding: 0, seamsOpen: false, borderWidth: 0, borderColor: '#ffffff',
      frames: [{ id: expect.stringMatching(UUID), x: 0, y: 0, w: 1080, h: 1440, photoId: null, crop: M.defaultCrop() }],
    });
  });
  it('sizes the frame to the chosen ratio', () => {
    expect(M.blankLayout('9:16').frames[0]).toMatchObject({ w: 1080, h: 1920 });
    expect(M.blankLayout('16:9')).toMatchObject({ ratio: '16:9', frames: [{ h: 608 }] });
  });
  it('fails on an unknown ratio', () => {
    expect(() => M.blankLayout('2:1')).toThrow(TypeError);
  });
});

describe('layoutFromTemplate', () => {
  const t = {
    id: 't1', name: 'Mine', starter: true, sortOrder: 4, ratio: '4:5', slides: 2, background: '#000000', padding: 30,
    seamsOpen: true, borderWidth: 2, borderColor: '#ff0000',
    frames: [fr(1, 2, 3, 4, { photoId: 'p', id: 'old' }), fr(1080, 0, 1080, 1350)],
  };
  it('keeps only the layout and makes fresh, empty frames', () => {
    const p = M.layoutFromTemplate(t);
    expect(Object.keys(p)).toEqual([...M.LAYOUT_KEYS, 'frames']);
    expect(p).toEqual({
      ratio: '4:5', slides: 2, background: '#000000', padding: 30, seamsOpen: true, borderWidth: 2, borderColor: '#ff0000',
      frames: [
        { id: expect.stringMatching(UUID), x: 1, y: 2, w: 3, h: 4, photoId: null, crop: M.defaultCrop() },
        { id: expect.stringMatching(UUID), x: 1080, y: 0, w: 1080, h: 1350, photoId: null, crop: M.defaultCrop() },
      ],
    });
    expect(p.frames[0].id).not.toBe('old');
  });
  it('gives a template with no frames an empty frame list', () => {
    expect(M.layoutFromTemplate({ ratio: '1:1', slides: 1 }).frames).toEqual([]);
  });
  it('leaves missing layout keys undefined', () => {
    const p = M.layoutFromTemplate({ frames: [] });
    expect(p.ratio).toBeUndefined();
    expect('padding' in p).toBe(true);
  });
  it('fails without a template', () => {
    expect(() => M.layoutFromTemplate(undefined)).toThrow(TypeError);
  });
});

describe('templateFromProject', () => {
  it('keeps the layout and frame places but never photos, ids or crops', () => {
    const p = {
      id: 'p1', name: 'Beach', photoIds: ['a'], thumb: 'blob', ratio: '3:4', slides: 1, background: '#fff', padding: 0,
      seamsOpen: false, borderWidth: 0, borderColor: '#fff',
      frames: [{ id: 'f', x: 5, y: 6, w: 7, h: 8, photoId: 'a', crop: crop({ zoom: 2 }) }],
    };
    expect(M.templateFromProject(p)).toEqual({
      ratio: '3:4', slides: 1, background: '#fff', padding: 0, seamsOpen: false, borderWidth: 0, borderColor: '#fff',
      frames: [{ x: 5, y: 6, w: 7, h: 8 }],
    });
  });
  it('round-trips with layoutFromTemplate', () => {
    const t = M.templateFromProject(M.blankLayout('1:1'));
    expect(M.templateFromProject(M.layoutFromTemplate(t))).toEqual(t);
  });
  it('keeps an empty frame list', () => {
    expect(M.templateFromProject(proj()).frames).toEqual([]);
  });
  it('fails for a project with no frames list', () => {
    expect(() => M.templateFromProject({ ratio: '3:4' })).toThrow(TypeError);
  });
});

describe('starterTemplates', () => {
  const base = { background: '#ffffff', padding: 0, seamsOpen: false, borderWidth: 0, borderColor: '#ffffff', starter: true };
  it('returns the four starters, labelled and in order', () => {
    expect(M.starterTemplates()).toEqual([
      {
        ...base, padding: 60, starterKey: 'white-border', name: 'White border', ratio: '3:4', slides: 3, sortOrder: 0,
        frames: [fr(60, 60, 960, 1320), fr(1140, 60, 960, 1320), fr(2220, 60, 960, 1320)],
      },
      { ...base, starterKey: 'panorama', name: 'Two-slide panorama', ratio: '3:4', slides: 2, sortOrder: 1, frames: [fr(0, 0, 2160, 1440)] },
      {
        ...base, starterKey: 'panorama-singles', name: 'Panorama plus singles', ratio: '3:4', slides: 4, sortOrder: 2,
        frames: [fr(0, 0, 2160, 1440), fr(2160, 0, 1080, 1440), fr(3240, 0, 1080, 1440)],
      },
      { ...base, starterKey: 'story', name: 'Story full bleed', ratio: '9:16', slides: 1, sortOrder: 3, frames: [fr(0, 0, 1080, 1920)] },
    ]);
  });
  it('fits every frame inside its strip', () => {
    for (const t of M.starterTemplates()) {
      for (const f of t.frames) {
        expect(f.x).toBeGreaterThanOrEqual(0);
        expect(f.x + f.w).toBeLessThanOrEqual(t.slides * 1080);
        expect(f.y + f.h).toBeLessThanOrEqual(M.RATIOS[t.ratio].h);
      }
    }
  });
  it('makes fresh copies each call', () => {
    const a = M.starterTemplates();
    a[0].frames[0].x = 999;
    a[1].name = 'changed';
    const b = M.starterTemplates();
    expect(b[0].frames[0].x).toBe(60);
    expect(b[1].name).toBe('Two-slide panorama');
  });
});

// ---------- Photo placement ----------

describe('placement', () => {
  const wide = { width: 2000, height: 1000 };
  const square = (c) => ({ x: 0, y: 0, w: 1000, h: 1000, crop: crop(c) });

  it('covers the frame with a centred photo at zoom 1', () => {
    expect(M.placement(square(), wide)).toEqual({ s: 1, rw: 2000, rh: 1000, cx: 0.5, cy: 0.5, rot: 0, px: 0, py: 0 });
  });
  it('pulls a centre past the left or right edge back inside the photo', () => {
    expect(M.placement(square({ cx: 0 }), wide)).toMatchObject({ cx: 0.25, px: -500 });
    expect(M.placement(square({ cx: 1 }), wide)).toMatchObject({ cx: 0.75, px: 500 });
    expect(M.placement(square({ cx: 0.3 }), wide)).toMatchObject({ cx: 0.3 });
  });
  it('fits on the long side of a non-square frame', () => {
    const f = { x: 0, y: 0, w: 600, h: 300, crop: crop({ cy: 0, cx: 0.9 }) };
    expect(M.placement(f, { width: 1000, height: 1000 })).toEqual({ s: 0.6, rw: 1000, rh: 1000, cx: 0.5, cy: 0.25, rot: 0, px: 0, py: -250 });
  });
  it('swaps width and height for a quarter turn', () => {
    expect(M.placement(square({ rot: 90, cx: 0.9, cy: 0.9 }), wide)).toEqual({ s: 1, rw: 1000, rh: 2000, cx: 0.5, cy: 0.75, rot: 90, px: 0, py: 500 });
    expect(M.placement(square({ rot: 270 }), wide)).toMatchObject({ rw: 1000, rh: 2000 });
    expect(M.placement(square({ rot: -90 }), wide)).toMatchObject({ rw: 1000, rh: 2000, rot: -90 });
  });
  it('keeps width and height for a half or full turn', () => {
    expect(M.placement(square({ rot: 180 }), wide)).toMatchObject({ rw: 2000, rh: 1000, rot: 180 });
    expect(M.placement(square({ rot: 360 }), wide)).toMatchObject({ rw: 2000, rh: 1000 });
  });
  it('scales by the zoom and lets the centre travel further', () => {
    expect(M.placement(square({ zoom: 2, cx: 0, cy: 0 }), wide)).toEqual({ s: 2, rw: 2000, rh: 1000, cx: 0.125, cy: 0.25, rot: 0, px: -750, py: -250 });
  });
  it('never zooms out below covering the frame', () => {
    expect(M.placement(square({ zoom: 0.5 }), wide).s).toBe(1);
    expect(M.placement(square({ zoom: 0 }), wide).s).toBe(1);
    expect(M.placement(square({ zoom: undefined }), wide).s).toBe(1);
  });
  it('treats a missing turn as upright', () => {
    const f = { x: 0, y: 0, w: 1000, h: 1000, crop: { zoom: 1, cx: 0.5, cy: 0.5 } };
    expect(M.placement(f, wide)).toMatchObject({ rot: 0, rw: 2000, rh: 1000 });
  });
  it('fails without a photo or a crop', () => {
    expect(() => M.placement(square(), undefined)).toThrow(TypeError);
    expect(() => M.placement({ w: 1, h: 1 }, wide)).toThrow(TypeError);
  });
});

describe('clampedCrop', () => {
  const f = (c) => ({ x: 0, y: 0, w: 1000, h: 1000, crop: crop(c) });
  it('pulls the centre back inside and keeps the rest of the crop', () => {
    const frame = f({ cx: 1, cy: 0, zoom: 1, rot: 0, extra: 'k' });
    expect(M.clampedCrop(frame, { width: 2000, height: 1000 })).toEqual({ zoom: 1, cx: 0.75, cy: 0.5, rot: 0, extra: 'k' });
    expect(frame.crop.cx).toBe(1);
  });
  it('leaves a crop that is already inside as it was', () => {
    expect(M.clampedCrop(f({ cx: 0.6, zoom: 2, rot: 90 }), { width: 1000, height: 3000 })).toEqual({ zoom: 2, cx: 0.6, cy: 0.5, rot: 90 });
  });
  it('fails without a crop', () => {
    expect(() => M.clampedCrop({ w: 1, h: 1 }, { width: 1, height: 1 })).toThrow(TypeError);
  });
});

describe('drawPhoto', () => {
  const recorder = () => {
    const log = [];
    const ctx = {};
    for (const m of ['translate', 'scale', 'rotate', 'drawImage']) ctx[m] = (...a) => log.push([m, ...a]);
    return { ctx, log };
  };
  it('moves to the frame centre, scales, shifts, turns and draws the photo centred', () => {
    const { ctx, log } = recorder();
    const src = { tag: 'img' };
    const frame = { x: 100, y: 50, w: 1000, h: 1000, crop: crop({ rot: 90, zoom: 2, cx: 0, cy: 1 }) };
    M.drawPhoto(ctx, frame, { width: 2000, height: 1000 }, src);
    expect(log).toEqual([
      ['translate', 600, 550],
      ['scale', 2, 2],
      ['translate', 250, -750],
      ['rotate', Math.PI / 2],
      ['drawImage', src, -1000, -500, 2000, 1000],
    ]);
  });
  it('draws a smaller copy at the original photo size', () => {
    const { ctx, log } = recorder();
    const frame = { x: 0, y: 0, w: 500, h: 250, crop: crop({ cx: 0, cy: 1 }) };
    M.drawPhoto(ctx, frame, { width: 1000, height: 1000 }, 'thumb');
    // s = 0.5; hx = 0.5, hy = 0.25 -> centre (0.5, 0.75), shift (0, 250)
    expect(log).toEqual([
      ['translate', 250, 125],
      ['scale', 0.5, 0.5],
      ['translate', -0, -250],
      ['rotate', 0],
      ['drawImage', 'thumb', -500, -500, 1000, 1000],
    ]);
  });
  it('fails without a canvas', () => {
    expect(() => M.drawPhoto(undefined, { x: 0, y: 0, w: 1, h: 1, crop: crop() }, { width: 1, height: 1 }, null)).toThrow(TypeError);
  });
});

describe('cssTransform', () => {
  it('writes the placement as a CSS transform for a screen image', () => {
    const frame = { x: 0, y: 0, w: 1000, h: 800, crop: crop({ cx: 0 }) };
    expect(M.cssTransform(frame, { width: 2000, height: 1000 }, 1000, 0.5)).toBe(
      'translate(250px,200px) scale(0.4) translate(375px,0px) rotate(0deg) translate(-1000px,-500px) scale(2)',
    );
  });
  it('includes the turn and the zoom', () => {
    const frame = { x: 50, y: 50, w: 1000, h: 1000, crop: crop({ rot: 90, zoom: 2, cx: 0, cy: 1 }) };
    expect(M.cssTransform(frame, { width: 2000, height: 1000 }, 500, 1)).toBe(
      'translate(500px,500px) scale(2) translate(250px,-750px) rotate(90deg) translate(-1000px,-500px) scale(4)',
    );
  });
  it('writes Infinity for a zero-width screen image', () => {
    const frame = { x: 0, y: 0, w: 10, h: 10, crop: crop() };
    expect(M.cssTransform(frame, { width: 10, height: 10 }, 0, 1)).toMatch(/scale\(Infinity\)$/);
  });
  it('fails without a photo', () => {
    expect(() => M.cssTransform({ w: 1, h: 1, crop: crop() }, undefined, 1, 1)).toThrow(TypeError);
  });
});

describe('rotatedCrop', () => {
  it('turns a quarter clockwise, keeping the same point centred', () => {
    expect(M.rotatedCrop({ zoom: 2, cx: 0.2, cy: 0.75, rot: 0 })).toEqual({ zoom: 2, cx: 0.25, cy: 0.2, rot: 90 });
  });
  it('wraps from 270 back to 0', () => {
    expect(M.rotatedCrop(crop({ rot: 270 })).rot).toBe(0);
    expect(M.rotatedCrop(crop({ rot: 450 })).rot).toBe(180);
  });
  it('treats a missing turn as 0', () => {
    expect(M.rotatedCrop({ cx: 0.5, cy: 0.5 }).rot).toBe(90);
  });
  it('comes back to the start after four turns, without changing its input', () => {
    const start = { zoom: 1, cx: 0.25, cy: 0.75, rot: 0 };
    let c = start;
    const seen = [];
    for (let i = 0; i < 4; i++) {
      c = M.rotatedCrop(c);
      seen.push([c.cx, c.cy, c.rot]);
    }
    expect(seen).toEqual([[0.25, 0.25, 90], [0.75, 0.25, 180], [0.75, 0.75, 270], [0.25, 0.75, 0]]);
    expect(start).toEqual({ zoom: 1, cx: 0.25, cy: 0.75, rot: 0 });
  });
  it('fails without a crop', () => {
    expect(() => M.rotatedCrop(undefined)).toThrow(TypeError);
  });
});

// ---------- Slides ----------

describe('anchorSlide', () => {
  it('finds the slide a frame starts on', () => {
    expect(M.anchorSlide({ x: 0 }, 3)).toBe(0);
    expect(M.anchorSlide({ x: 1200 }, 3)).toBe(1);
    expect(M.anchorSlide({ x: 1080 }, 3)).toBe(1);
  });
  it('rounds a left edge within half a pixel of a seam onto the next slide', () => {
    expect(M.anchorSlide({ x: 1079.5 }, 3)).toBe(1);
    expect(M.anchorSlide({ x: 1079.4 }, 3)).toBe(0);
  });
  it('keeps frames off either end on the first or last slide', () => {
    expect(M.anchorSlide({ x: -100 }, 3)).toBe(0);
    expect(M.anchorSlide({ x: 5000 }, 3)).toBe(2);
    expect(M.anchorSlide({ x: 5000 }, 1)).toBe(0);
  });
  it('gives NaN for a frame with no x', () => {
    expect(M.anchorSlide({}, 3)).toBeNaN();
  });
});

describe('framesOnSlide', () => {
  const frames = [
    fr(1200, 100, 500, 500, { id: 'inside' }),
    fr(580, 100, 500, 500, { id: 'ends-at-seam' }),
    fr(580, 100, 501, 500, { id: 'crosses-in' }),
    fr(2160, 100, 10, 10, { id: 'starts-at-next' }),
    fr(2159, 100, 10, 10, { id: 'starts-before-next' }),
    fr(1200, 1440, 10, 10, { id: 'below' }),
    fr(1200, 1439, 10, 10, { id: 'bottom-edge' }),
    fr(1200, -100, 10, 100, { id: 'above' }),
    fr(1200, -50, 10, 100, { id: 'over-top' }),
  ];
  it('returns the frames touching a slide, in order', () => {
    expect(M.framesOnSlide(proj({ frames }), 1).map((f) => f.id)).toEqual(['inside', 'crosses-in', 'starts-before-next', 'bottom-edge', 'over-top']);
  });
  it('uses the slide height of the ratio', () => {
    const f = fr(0, 1500, 10, 10, { id: 'low' });
    expect(M.framesOnSlide(proj({ frames: [f] }), 0)).toEqual([]);
    expect(M.framesOnSlide(proj({ ratio: '9:16', frames: [f] }), 0)).toEqual([f]);
  });
  it('returns nothing for an empty project or a slide past the end', () => {
    expect(M.framesOnSlide(proj(), 0)).toEqual([]);
    expect(M.framesOnSlide(proj({ frames }), 9)).toEqual([]);
  });
  it('fails on an unknown ratio', () => {
    expect(() => M.framesOnSlide({ ratio: '?', frames: [] }, 0)).toThrow(TypeError);
  });
});

describe('insertSlide', () => {
  it('adds a slide and moves later frames along, leaving crossing frames put', () => {
    const p = proj({
      name: 'keep me',
      frames: [fr(0, 0, 500, 10, { id: 'a' }), fr(1079.5, 0, 10, 10, { id: 'b' }), fr(1079.4, 0, 10, 10, { id: 'c' }), fr(500, 0, 1000, 10, { id: 'd' }), fr(2000, 0, 10, 10, { id: 'e' })],
    });
    const out = M.insertSlide(p, 1);
    expect(out.slides).toBe(4);
    expect(out.name).toBe('keep me');
    expect(out.frames.map((f) => [f.id, f.x])).toEqual([['a', 0], ['b', 2159.5], ['c', 1079.4], ['d', 500], ['e', 3080]]);
    expect(p.slides).toBe(3);
    expect(p.frames[1].x).toBe(1079.5);
  });
  it('moves every frame when inserting at the start', () => {
    const out = M.insertSlide(proj({ frames: [fr(0, 0, 10, 10), fr(1500, 0, 10, 10)] }), 0);
    expect(out.frames.map((f) => f.x)).toEqual([1080, 2580]);
  });
  it('moves nothing when adding at the end', () => {
    const out = M.insertSlide(proj({ frames: [fr(2200, 0, 10, 10)] }), 3);
    expect(out.frames.map((f) => f.x)).toEqual([2200]);
    expect(out.slides).toBe(4);
  });
  it('fails without a frames list', () => {
    expect(() => M.insertSlide({ slides: 1 }, 0)).toThrow(TypeError);
  });
});

describe('removeSlide', () => {
  const frames = [
    fr(0, 0, 500, 10, { id: 'before' }),
    fr(1100, 0, 500, 10, { id: 'on' }),
    fr(2200, 0, 500, 10, { id: 'after' }),
    fr(800, 0, 500, 10, { id: 'cross-left' }),
    fr(1900, 0, 500, 10, { id: 'cross-right' }),
    fr(500, 0, 2000, 10, { id: 'span' }),
    fr(980, 0, 100.5, 10, { id: 'end-half-over' }),
    fr(2159.5, 0, 100, 10, { id: 'start-half-under' }),
    fr(1079.5, 0, 1080.5, 10, { id: 'almost-whole' }),
    fr(1079.1, 0, 50, 10, { id: 'sliver' }),
    fr(1079, 0, 50, 10, { id: 'one-px-left' }),
    fr(1080, 0, 1500, 10, { id: 'from-seam' }),
    fr(2159.5, 0, 1, 10, { id: 'px-at-right-seam' }),
    fr(1079.5, 0, 1, 10, { id: 'px-at-left-seam' }),
  ];
  it('drops frames on the slide, moves later ones back and trims crossing ones', () => {
    const out = M.removeSlide(proj({ frames }), 1);
    expect(out.slides).toBe(2);
    expect(out.frames.map((f) => [f.id, f.x, f.w])).toEqual([
      ['before', 0, 500],
      ['after', 1120, 500],
      ['cross-left', 800, 280],
      ['cross-right', 1080, 240],
      ['span', 500, 920],
      ['end-half-over', 980, 100.5],
      ['start-half-under', 1079.5, 100],
      ['one-px-left', 1079, 1],
      ['from-seam', 1080, 420],
    ]);
  });
  it('leaves the input project as it was', () => {
    const p = proj({ frames: [fr(2200, 0, 500, 10)] });
    M.removeSlide(p, 1);
    expect(p.slides).toBe(3);
    expect(p.frames[0].x).toBe(2200);
  });
  it('removes the only slide and all its frames', () => {
    expect(M.removeSlide(proj({ slides: 1, frames: [fr(0, 0, 1080, 1440)] }), 0)).toMatchObject({ slides: 0, frames: [] });
  });
  it('removes the last slide, trimming a frame that ran onto it', () => {
    const out = M.removeSlide(proj({ frames: [fr(2000, 0, 500, 10)] }), 2);
    expect(out.frames).toEqual([fr(2000, 0, 160, 10)]);
  });
  it('fails without a frames list', () => {
    expect(() => M.removeSlide({ slides: 2 }, 0)).toThrow(TypeError);
  });
});

describe('moveSlide', () => {
  const frames = [
    fr(100, 0, 10, 10, { id: 'a', photoId: 'pa' }),
    fr(1200, 0, 10, 10, { id: 'b' }),
    fr(2200, 0, 10, 10, { id: 'c' }),
    fr(0, 0, 2160, 10, { id: 'pano' }),
  ];
  it('moves the first slide to the end, with a panorama travelling from where it starts', () => {
    const out = M.moveSlide(proj({ frames }), 0, 2);
    expect(out.frames.map((f) => [f.id, f.x])).toEqual([['a', 2260], ['b', 120], ['c', 1120], ['pano', 2160]]);
    expect(out.frames[0]).toMatchObject({ photoId: 'pa', w: 10 });
    expect(out.slides).toBe(3);
  });
  it('moves the last slide to the start', () => {
    const out = M.moveSlide(proj({ frames }), 2, 0);
    expect(out.frames.map((f) => [f.id, f.x])).toEqual([['a', 1180], ['b', 2280], ['c', 40], ['pano', 1080]]);
  });
  it('swaps two neighbouring slides', () => {
    const out = M.moveSlide(proj({ frames }), 1, 2);
    expect(out.frames.map((f) => [f.id, f.x])).toEqual([['a', 100], ['b', 2280], ['c', 1120], ['pano', 0]]);
  });
  it('changes nothing when a slide stays where it is, and leaves the input alone', () => {
    const p = proj({ frames });
    expect(M.moveSlide(p, 1, 1).frames.map((f) => f.x)).toEqual([100, 1200, 2200, 0]);
    expect(M.moveSlide(proj({ slides: 1, frames: [fr(5, 0, 1, 1)] }), 0, 0).frames[0].x).toBe(5);
    M.moveSlide(p, 0, 2);
    expect(p.frames[0].x).toBe(100);
  });
  it('fails without a frames list', () => {
    expect(() => M.moveSlide({ slides: 2 }, 0, 1)).toThrow(TypeError);
  });
});

describe('copySlideLayout', () => {
  const frames = [
    fr(60, 60, 960, 600, { id: 'A', photoId: 'p1', crop: crop({ zoom: 3 }) }),
    fr(500, 0, 1080.5, 10, { id: 'cross' }),
    fr(1100, 0, 100, 100, { id: 'next' }),
    fr(-0.5, 5, 500, 6, { id: 'left-edge' }),
    fr(600, 7, 480.5, 8, { id: 'right-edge' }),
    fr(-0.6, 0, 100, 10, { id: 'off-left' }),
    fr(1000, 0, 80.6, 10, { id: 'off-right' }),
  ];
  it('adds a slide after with empty copies of the frames wholly on it', () => {
    const out = M.copySlideLayout(proj({ slides: 2, frames }), 0);
    expect(out.slides).toBe(3);
    expect(out.frames.slice(0, 7).map((f) => [f.id, f.x])).toEqual([
      ['A', 60], ['cross', 500], ['next', 2180], ['left-edge', -0.5], ['right-edge', 600], ['off-left', -0.6], ['off-right', 1000],
    ]);
    const copies = out.frames.slice(7);
    expect(copies).toEqual([
      { id: expect.stringMatching(UUID), x: 1140, y: 60, w: 960, h: 600, photoId: null, crop: M.defaultCrop() },
      { id: expect.stringMatching(UUID), x: 1079.5, y: 5, w: 500, h: 6, photoId: null, crop: M.defaultCrop() },
      { id: expect.stringMatching(UUID), x: 1680, y: 7, w: 480.5, h: 8, photoId: null, crop: M.defaultCrop() },
    ]);
  });
  it('copies the last slide to a new last slide', () => {
    const out = M.copySlideLayout(proj({ slides: 2, frames: [fr(1100, 0, 100, 100, { id: 'n' })] }), 1);
    expect(out.slides).toBe(3);
    expect(out.frames.map((f) => f.x)).toEqual([1100, 2180]);
  });
  it('adds an empty slide when the slide has no frames of its own', () => {
    const out = M.copySlideLayout(proj({ slides: 1 }), 0);
    expect(out).toMatchObject({ slides: 2, frames: [] });
  });
  it('fails without a frames list', () => {
    expect(() => M.copySlideLayout({ slides: 1 }, 0)).toThrow(TypeError);
  });
});

describe('changeRatio', () => {
  const p = proj({ padding: 60, frames: [fr(10, 0, 1080, 1440, { id: 'full' }), fr(20, 100, 300, 70, { id: 'small' }), fr(0, 1, 5, 100, { id: 'tiny' })] });
  it('shrinks frames and the border to a shorter ratio, never below the smallest frame', () => {
    const out = M.changeRatio(p, '1:1');
    expect(out.ratio).toBe('1:1');
    expect(out.padding).toBe(45);
    expect(out.frames.map((f) => [f.id, f.x, f.y, f.w, f.h])).toEqual([['full', 10, 0, 1080, 1080], ['small', 20, 75, 300, 60], ['tiny', 0, 1, 5, 75]]);
  });
  it('stretches frames to a taller ratio but keeps the border', () => {
    const out = M.changeRatio(p, '9:16');
    expect(out.padding).toBe(60);
    expect(out.frames.map((f) => [f.y, f.h])).toEqual([[0, 1920], [133, 93], [1, 133]]);
  });
  it('changes nothing but rounding for the same height', () => {
    const out = M.changeRatio(p, '4:5');
    expect(M.changeRatio(proj({ ratio: '4:5', padding: 7, frames: [fr(0, 3, 1, 99)] }), '8:10')).toMatchObject({ ratio: '8:10', padding: 7, frames: [{ y: 3, h: 99 }] });
    expect(out.frames[0].h).toBe(1350);
    expect(p.ratio).toBe('3:4');
    expect(p.frames[0].h).toBe(1440);
  });
  it('fails on an unknown ratio', () => {
    expect(() => M.changeRatio(p, 'huge')).toThrow(TypeError);
  });
});

// ---------- Spreads ----------

describe('spreadOf', () => {
  it('puts slides two to a spread', () => {
    expect([0, 1, 2, 3, 4].map(M.spreadOf)).toEqual([0, 0, 1, 1, 2]);
  });
  it('puts the last of 20 slides on spread 9', () => {
    expect(M.spreadOf(19)).toBe(9);
  });
  it('gives a negative spread for a negative slide and NaN for no slide', () => {
    expect(M.spreadOf(-1)).toBe(-1);
    expect(M.spreadOf()).toBeNaN();
  });
});

describe('spreadCount', () => {
  it('counts a half spread for an odd slide count', () => {
    expect(M.spreadCount({ slides: 1 })).toBe(1);
    expect(M.spreadCount({ slides: 2 })).toBe(1);
    expect(M.spreadCount({ slides: 3 })).toBe(2);
    expect(M.spreadCount({ slides: 20 })).toBe(10);
  });
  it('counts no spreads for no slides', () => {
    expect(M.spreadCount({ slides: 0 })).toBe(0);
  });
  it('gives NaN for no slide count', () => {
    expect(M.spreadCount({})).toBeNaN();
  });
});

describe('keepInSpreads', () => {
  const run = (slides, frames) => {
    const p = proj({ slides, frames });
    const changed = M.keepInSpreads(p);
    return { changed, frames: p.frames.map((f) => [f.x, f.w]) };
  };
  it('trims a frame crossing a flip to the spread holding most of it', () => {
    expect(run(4, [fr(1500, 0, 1500, 10)])).toEqual({ changed: true, frames: [[2160, 840]] });
    expect(run(4, [fr(1000, 0, 1500, 10)])).toEqual({ changed: true, frames: [[1000, 1160]] });
  });
  it('leaves frames that end at the flip or stay in one spread', () => {
    expect(run(4, [fr(1080, 0, 1080, 10), fr(0, 0, 2160, 10), fr(2200, 0, 500, 10)])).toEqual({
      changed: false,
      frames: [[1080, 1080], [0, 2160], [2200, 500]],
    });
  });
  it('ignores a flip at or past the end of the strip', () => {
    expect(run(2, [fr(1000, 0, 1500, 10)])).toEqual({ changed: false, frames: [[1000, 1500]] });
    expect(run(3, [fr(1000, 0, 1500, 10)])).toEqual({ changed: true, frames: [[1000, 1160]] });
  });
  it('leaves a frame hanging off the left end alone', () => {
    expect(run(4, [fr(-100, 0, 300, 10)])).toEqual({ changed: false, frames: [[-100, 300]] });
  });
  it('keeps a trimmed frame at least the smallest frame wide', () => {
    expect(run(4, [fr(2130, 0, 60, 10)])).toEqual({ changed: true, frames: [[2160, 60]] });
  });
  it('cuts a frame longer than a spread to one spread', () => {
    expect(run(6, [fr(1000, 0, 4000, 10)])).toEqual({ changed: true, frames: [[2160, 2160]] });
  });
  it('reports a change when only some frames moved', () => {
    expect(run(4, [fr(0, 0, 100, 10), fr(1500, 0, 1500, 10)])).toEqual({ changed: true, frames: [[0, 100], [2160, 840]] });
  });
  it('reports no change for no frames', () => {
    expect(M.keepInSpreads(proj({ slides: 4 }))).toBe(false);
  });
  it('fails without a frames list', () => {
    expect(() => M.keepInSpreads({ slides: 2 })).toThrow(TypeError);
  });
});

// ---------- Layouts for one slide ----------

describe('SLIDE_LAYOUTS', () => {
  const byKey = Object.fromEntries(M.SLIDE_LAYOUTS.map((l) => [l.key, l]));
  it('lists the layouts by key and name, in order', () => {
    expect(M.SLIDE_LAYOUTS.map((l) => [l.key, l.name, l.cells.length])).toEqual([
      ['full', 'Full', 1], ['two-stacked', 'Two stacked', 2], ['side-by-side', 'Side by side', 2], ['grid-4', 'Grid of 4', 4],
      ['three-stacked', 'Three stacked', 3], ['three-across', 'Three across', 3], ['big-top', 'Big top, two below', 3],
      ['big-left', 'Big left, two right', 3], ['grid-6', 'Grid of 6', 6], ['centred', 'Small, centred', 1], ['blank', 'Blank', 0],
    ]);
  });
  it('gives every cell as fractions of the slide', () => {
    const t = 1 / 3;
    expect(byKey.full.cells).toEqual([[0, 0, 1, 1]]);
    expect(byKey['two-stacked'].cells).toEqual([[0, 0, 1, 0.5], [0, 0.5, 1, 0.5]]);
    expect(byKey['side-by-side'].cells).toEqual([[0, 0, 0.5, 1], [0.5, 0, 0.5, 1]]);
    expect(byKey['grid-4'].cells).toEqual([[0, 0, 0.5, 0.5], [0.5, 0, 0.5, 0.5], [0, 0.5, 0.5, 0.5], [0.5, 0.5, 0.5, 0.5]]);
    expect(byKey['three-stacked'].cells).toEqual([[0, 0, 1, t], [0, t, 1, t], [0, 2 * t, 1, t]]);
    expect(byKey['three-across'].cells).toEqual([[0, 0, t, 1], [t, 0, t, 1], [2 * t, 0, t, 1]]);
    expect(byKey['big-top'].cells).toEqual([[0, 0, 1, 0.6], [0, 0.6, 0.5, 0.4], [0.5, 0.6, 0.5, 0.4]]);
    expect(byKey['big-left'].cells).toEqual([[0, 0, 0.6, 1], [0.6, 0, 0.4, 0.5], [0.6, 0.5, 0.4, 0.5]]);
    expect(byKey['grid-6'].cells).toEqual([[0, 0, 0.5, t], [0.5, 0, 0.5, t], [0, t, 0.5, t], [0.5, t, 0.5, t], [0, 2 * t, 0.5, t], [0.5, 2 * t, 0.5, t]]);
    expect(byKey.centred.cells).toEqual([[0.15, 0.2, 0.7, 0.6]]);
    expect(byKey.blank.cells).toEqual([]);
  });
});

describe('layoutRects', () => {
  const L = Object.fromEntries(M.SLIDE_LAYOUTS.map((l) => [l.key, l]));
  const bordered = proj({ padding: 60 });
  it('fills the space inside the border for a full layout', () => {
    expect(M.layoutRects(bordered, 1, L.full)).toEqual([{ x: 1140, y: 60, w: 960, h: 1320 }]);
  });
  it('leaves one border width between photos side by side', () => {
    expect(M.layoutRects(bordered, 0, L['side-by-side'])).toEqual([{ x: 60, y: 60, w: 450, h: 1320 }, { x: 570, y: 60, w: 450, h: 1320 }]);
  });
  it('leaves one border width between photos stacked', () => {
    expect(M.layoutRects(bordered, 0, L['two-stacked'])).toEqual([{ x: 60, y: 60, w: 960, h: 630 }, { x: 60, y: 750, w: 960, h: 630 }]);
  });
  it('splits a borderless slide into exact thirds', () => {
    expect(M.layoutRects(proj(), 2, L['three-across'])).toEqual([
      { x: 2160, y: 0, w: 360, h: 1440 }, { x: 2520, y: 0, w: 360, h: 1440 }, { x: 2880, y: 0, w: 360, h: 1440 },
    ]);
  });
  it('treats a missing border as none', () => {
    expect(M.layoutRects(proj({ padding: undefined }), 0, L['two-stacked'])).toEqual([{ x: 0, y: 0, w: 1080, h: 720 }, { x: 0, y: 720, w: 1080, h: 720 }]);
  });
  it('rounds the centred layout to whole pixels', () => {
    expect(M.layoutRects(proj(), 0, L.centred)).toEqual([{ x: 162, y: 288, w: 756, h: 864 }]);
  });
  it('counts a cell edge at 0.001 or 0.999 as the slide edge', () => {
    const edge = { cells: [[0.001, 0.001, 0.998, 0.998]] };
    expect(M.layoutRects(bordered, 0, edge)).toEqual([{ x: 61, y: 61, w: 958, h: 1317 }]);
  });
  it('uses the open-seam space of a middle slide', () => {
    expect(M.layoutRects(proj({ padding: 60, seamsOpen: true }), 1, L.full)).toEqual([{ x: 1080, y: 60, w: 1080, h: 1320 }]);
  });
  it('places an exact layout on the slide, keeping its other fields', () => {
    expect(M.layoutRects(bordered, 2, { exact: [{ x: 10, y: 20, w: 30, h: 40, tag: 1 }] })).toEqual([{ x: 2170, y: 20, w: 30, h: 40, tag: 1 }]);
  });
  it('gives no frames for a blank layout', () => {
    expect(M.layoutRects(bordered, 0, L.blank)).toEqual([]);
  });
  it('fails for a layout with no cells', () => {
    expect(() => M.layoutRects(bordered, 0, {})).toThrow(TypeError);
  });
});

describe('framesWithinSlide', () => {
  const frames = [
    fr(1079.5, 0, 500, 10, { id: 'left-tolerance' }),
    fr(1079.4, 0, 500, 10, { id: 'left-out' }),
    fr(1500, 0, 660.5, 10, { id: 'right-tolerance' }),
    fr(1500, 0, 660.6, 10, { id: 'right-out' }),
    fr(500, 0, 1000, 10, { id: 'crossing' }),
    fr(1080, 0, 1080, 10, { id: 'whole' }),
  ];
  it('returns frames wholly on the slide, within half a pixel', () => {
    expect(M.framesWithinSlide(proj({ frames }), 1).map((f) => f.id)).toEqual(['left-tolerance', 'right-tolerance', 'whole']);
  });
  it('returns nothing for an empty slide', () => {
    expect(M.framesWithinSlide(proj({ frames }), 2)).toEqual([]);
    expect(M.framesWithinSlide(proj(), 0)).toEqual([]);
  });
  it('fails without a frames list', () => {
    expect(() => M.framesWithinSlide({}, 0)).toThrow(TypeError);
  });
});

describe('applySlideLayout', () => {
  const L = Object.fromEntries(M.SLIDE_LAYOUTS.map((l) => [l.key, l]));
  const make = () =>
    proj({
      slides: 2,
      photoIds: ['a', 'b', 'c', 'x', 's'],
      frames: [
        fr(0, 720, 540, 720, { id: 'F3', photoId: 'c' }),
        fr(540, 0, 540, 1440, { id: 'F1', photoId: 'b' }),
        fr(0, 0, 540, 720, { id: 'F2', photoId: 'a' }),
        fr(900, 0, 400, 100, { id: 'X', photoId: 'x' }),
        fr(1200, 0, 100, 100, { id: 'S', photoId: 's' }),
        fr(100, 100, 10, 10, { id: 'E', photoId: null }),
      ],
    });
  it('moves the slide’s photos into the new frames in reading order', () => {
    const p = make();
    const out = M.applySlideLayout(p, 0, L['three-across']);
    expect(out.frames.slice(0, 2).map((f) => f.id)).toEqual(['X', 'S']);
    expect(out.frames.slice(2).map((f) => [f.x, f.y, f.w, f.h, f.photoId])).toEqual([
      [0, 0, 360, 1440, 'a'], [360, 0, 360, 1440, 'b'], [720, 0, 360, 1440, 'c'],
    ]);
    expect(out.frames.slice(2).every((f) => UUID.test(f.id))).toBe(true);
    expect(out.photoIds).toEqual(['a', 'b', 'c', 'x', 's']);
    expect(p.frames).toHaveLength(6);
  });
  it('leaves new frames empty when there are fewer photos than frames', () => {
    const out = M.applySlideLayout(make(), 0, L['grid-4']);
    expect(out.frames.slice(2).map((f) => f.photoId)).toEqual(['a', 'b', 'c', null]);
  });
  it('drops photos that do not fit from the slide but keeps them in the tray', () => {
    const out = M.applySlideLayout(make(), 0, L.full);
    expect(out.frames.map((f) => f.photoId)).toEqual(['x', 's', 'a']);
    expect(out.photoIds).toContain('b');
  });
  it('empties the slide with the blank layout, keeping frames that cross into it', () => {
    const out = M.applySlideLayout(make(), 0, L.blank);
    expect(out.frames.map((f) => f.id)).toEqual(['X', 'S']);
  });
  it('fails for a layout with no cells', () => {
    expect(() => M.applySlideLayout(make(), 0, {})).toThrow(TypeError);
  });
});

describe('layoutOfSlide', () => {
  const p = proj({ frames: [fr(2220, 60, 400, 500, { id: 'f', photoId: 'p' }), fr(100, 0, 10, 10)] });
  it('makes a layout of the slide’s frames relative to the slide', () => {
    expect(M.layoutOfSlide(p, 2)).toEqual({ key: 'slide-2', name: 'Same as slide 3', exact: [{ x: 60, y: 60, w: 400, h: 500 }] });
  });
  it('names the page by the project’s own word', () => {
    expect(M.layoutOfSlide({ ...p, ratio: '9:16' }, 0).name).toBe('Same as story 1');
    expect(M.layoutOfSlide({ ...p, ratio: 'a4' }, 1).name).toBe('Same as page 2');
  });
  it('copies a slide’s arrangement onto another slide', () => {
    const out = M.applySlideLayout(p, 1, M.layoutOfSlide(p, 2));
    expect(out.frames.slice(-1).map((f) => [f.x, f.y, f.w, f.h, f.photoId])).toEqual([[1140, 60, 400, 500, null]]);
  });
  it('gives an empty layout for an empty slide', () => {
    expect(M.layoutOfSlide(p, 1).exact).toEqual([]);
  });
  it('fails on an unknown ratio', () => {
    expect(() => M.layoutOfSlide({ ratio: 'x', frames: [] }, 0)).toThrow(TypeError);
  });
});

describe('slideBox', () => {
  it('insets the slide by its border on every side', () => {
    expect(M.slideBox(proj({ padding: 60 }), 1)).toEqual({ x: 1140, y: 60, w: 960, h: 1320 });
  });
  it('opens the seams between slides only', () => {
    const p = proj({ padding: 60, seamsOpen: true });
    expect(M.slideBox(p, 0)).toEqual({ x: 60, y: 60, w: 1020, h: 1320 });
    expect(M.slideBox(p, 1)).toEqual({ x: 1080, y: 60, w: 1080, h: 1320 });
    expect(M.slideBox(p, 2)).toEqual({ x: 2160, y: 60, w: 1020, h: 1320 });
  });
  it('keeps both sides of a single open-seamed slide', () => {
    expect(M.slideBox(proj({ slides: 1, padding: 60, seamsOpen: true }), 0)).toEqual({ x: 60, y: 60, w: 960, h: 1320 });
  });
  it('uses the whole slide with no border', () => {
    expect(M.slideBox(proj({ padding: undefined, ratio: '9:16' }), 2)).toEqual({ x: 2160, y: 0, w: 1080, h: 1920 });
  });
  it('fails on an unknown ratio', () => {
    expect(() => M.slideBox({ ratio: 'x' }, 0)).toThrow(TypeError);
  });
});

describe('borderBands', () => {
  const top = (i) => ({ x: i * 1080, y: 0, w: 1080, h: 60 });
  const bottom = (i) => ({ x: i * 1080, y: 1380, w: 1080, h: 60 });
  const left = (i) => ({ x: i * 1080, y: 0, w: 60, h: 1440 });
  const right = (i) => ({ x: i * 1080 + 1020, y: 0, w: 60, h: 1440 });
  it('gives no bands without a border', () => {
    expect(M.borderBands(proj(), 0)).toEqual([]);
    expect(M.borderBands(proj({ padding: undefined }), 0)).toEqual([]);
  });
  it('gives all four sides with closed seams', () => {
    expect(M.borderBands(proj({ padding: 60 }), 1)).toEqual([top(1), bottom(1), left(1), right(1)]);
  });
  it('leaves out the seam sides with open seams', () => {
    const p = proj({ padding: 60, seamsOpen: true });
    expect(M.borderBands(p, 0)).toEqual([top(0), bottom(0), left(0)]);
    expect(M.borderBands(p, 1)).toEqual([top(1), bottom(1)]);
    expect(M.borderBands(p, 2)).toEqual([top(2), bottom(2), right(2)]);
  });
  it('keeps both sides of a single open-seamed slide', () => {
    expect(M.borderBands(proj({ slides: 1, padding: 60, seamsOpen: true }), 0)).toEqual([top(0), bottom(0), left(0), right(0)]);
  });
  it('fails on an unknown ratio with a border', () => {
    expect(() => M.borderBands({ ratio: 'x', padding: 5 }, 0)).toThrow(TypeError);
  });
});

// ---------- Snapping ----------

describe('snapTargets', () => {
  it('snaps to seams, slide centres and the top, bottom and middle', () => {
    expect(M.snapTargets(proj({ slides: 2 }))).toEqual({ xs: [0, 1080, 2160, 540, 1620], ys: [0, 1440, 720] });
  });
  it('adds the inside of the border', () => {
    expect(M.snapTargets(proj({ slides: 2, padding: 60 }), null)).toEqual({
      xs: [0, 1080, 2160, 540, 60, 1020, 1620, 1140, 2100],
      ys: [0, 1440, 720, 60, 1380],
    });
  });
  it('adds other frames’ edges and centres, skipping the one being moved', () => {
    const frames = [fr(100, 200, 300, 400, { id: 'a' }), fr(5, 5, 5, 5, { id: 'b' })];
    expect(M.snapTargets(proj({ slides: 1, frames }), 'b')).toEqual({ xs: [0, 1080, 540, 100, 400, 250], ys: [0, 1440, 720, 200, 600, 400] });
  });
  it('adds a border’s width around other frames so gaps match', () => {
    const frames = [fr(100, 200, 300, 400, { id: 'a' })];
    expect(M.snapTargets(proj({ slides: 1, padding: 60, frames }), 'zzz')).toEqual({
      xs: [0, 1080, 540, 60, 1020, 100, 400, 250, 40, 460],
      ys: [0, 1440, 720, 60, 1380, 200, 600, 400, 140, 660],
    });
  });
  it('adds a Story’s safe zone only when asked', () => {
    const story = proj({ ratio: '9:16', slides: 1 });
    expect(M.snapTargets(story, null, { safeZone: true }).ys).toEqual([0, 1920, 960, 250, 1580]);
    expect(M.snapTargets(story, null, { safeZone: false }).ys).toEqual([0, 1920, 960]);
    expect(M.snapTargets(story, null).ys).toEqual([0, 1920, 960]);
    expect(M.snapTargets(proj({ slides: 1 }), null, { safeZone: true }).ys).toEqual([0, 1440, 720]);
  });
  it('gives only the left edge for no slides', () => {
    expect(M.snapTargets(proj({ slides: 0 }))).toEqual({ xs: [0], ys: [0, 1440, 720] });
  });
  it('fails without a frames list', () => {
    expect(() => M.snapTargets({ ratio: '3:4', slides: 1 })).toThrow(TypeError);
  });
});

describe('nearest', () => {
  it('finds the closest target and the shift to it', () => {
    expect(M.nearest([100], [0, 105, 200], 10)).toEqual({ d: 5, line: 105 });
    expect(M.nearest([50], [45], 10)).toEqual({ d: -5, line: 45 });
  });
  it('keeps the first of two equally close targets', () => {
    expect(M.nearest([0], [-5, 5], 10)).toEqual({ d: -5, line: -5 });
  });
  it('picks the value whose target is closest', () => {
    expect(M.nearest([0, 100, 50], [52, 104], 10)).toEqual({ d: 2, line: 52 });
    expect(M.nearest([50, 100], [52, 104], 10)).toEqual({ d: 2, line: 52 });
  });
  it('includes a target exactly the tolerance away, in either direction', () => {
    expect(M.nearest([0], [10], 10)).toEqual({ d: 10, line: 10 });
    expect(M.nearest([0], [-10], 10)).toEqual({ d: -10, line: -10 });
    expect(M.nearest([0], [10.0001], 10)).toBeNull();
  });
  it('returns null when nothing is close', () => {
    expect(M.nearest([100], [0], 10)).toBeNull();
    expect(M.nearest([0], [100], 10)).toBeNull();
  });
  it('returns null for no values or no targets', () => {
    expect(M.nearest([], [1, 2], 10)).toBeNull();
    expect(M.nearest([1], [], 10)).toBeNull();
  });
  it('matches only an exact hit at zero tolerance, and nothing at negative tolerance', () => {
    expect(M.nearest([7], [7, 8], 0)).toEqual({ d: 0, line: 7 });
    expect(M.nearest([7], [7], -1)).toBeNull();
  });
  it('fails without a values list', () => {
    expect(() => M.nearest(undefined, [1], 1)).toThrow(TypeError);
  });
});
