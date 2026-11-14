// the-eye/components/slide-steps.js: the sums for turning sections as a
// plain slide (14 Nov): which section is that way, where the pages sit under
// the finger, and whether letting go goes on or comes back.
import { describe, it, expect } from 'vitest';

delete window.EyeParts;
await import('../../../the-eye/components/slide-steps.js');

const ed = {};
window.EyeParts.addSlideSteps(ed);
const ORDER = ['overview', 'shoots', 'journal', 'archive', 'stats'];

describe('addSlideSteps', () => {
  it('adds the three sums and the timing, and nothing else', () => {
    expect(Object.keys(ed).sort()).toEqual(['SLIDE', 'slideCommits', 'slideOffset', 'slideTarget']);
  });
  it('settles in 240ms on the curve (.4, 0, .2, 1); with Reduce Motion a 150ms crossfade', () => {
    expect(ed.SLIDE).toEqual({ ms: 240, ease: 'cubic-bezier(.4, 0, .2, 1)', fadeMs: 150 });
  });
  it('keeps the parts already on window.EyeParts', async () => {
    window.EyeParts.other = 1;
    await import('../../../the-eye/components/slide-steps.js?again');
    expect(window.EyeParts.other).toBe(1);
    expect(typeof window.EyeParts.addSlideSteps).toBe('function');
  });
});

describe('slideTarget', () => {
  it('gives the next section going on, the one before going back', () => {
    expect(ed.slideTarget(ORDER, 'shoots', 1)).toBe('journal');
    expect(ed.slideTarget(ORDER, 'shoots', -1)).toBe('overview');
  });
  it('gives null past either end', () => {
    expect(ed.slideTarget(ORDER, 'overview', -1)).toBeNull();
    expect(ed.slideTarget(ORDER, 'stats', 1)).toBeNull();
  });
  it('takes any size of step as one section that way', () => {
    expect(ed.slideTarget(ORDER, 'overview', 3)).toBe('shoots');
    expect(ed.slideTarget(ORDER, 'stats', -0.5)).toBe('archive');
  });
  it('gives null for no direction, a section not in the list, or no list', () => {
    expect(ed.slideTarget(ORDER, 'shoots', 0)).toBeNull();
    expect(ed.slideTarget(ORDER, 'nowhere', 1)).toBeNull();
    expect(ed.slideTarget([], 'shoots', 1)).toBeNull();
  });
});

describe('slideOffset', () => {
  it('follows the finger toward the section that is there', () => {
    expect(ed.slideOffset(-120, 1, 390)).toBe(-120);
    expect(ed.slideOffset(80, -1, 390)).toBe(80);
  });
  it('stops at the start when the finger goes back the other way', () => {
    expect(ed.slideOffset(40, 1, 390)).toBe(0);
    expect(ed.slideOffset(-40, -1, 390)).toBe(0);
  });
  it('never goes past a whole page', () => {
    expect(ed.slideOffset(-900, 1, 390)).toBe(-390);
    expect(ed.slideOffset(900, -1, 390)).toBe(390);
    expect(ed.slideOffset(-390, 1, 390)).toBe(-390);
  });
  it('sits at 0 with the finger where it started', () => {
    expect(ed.slideOffset(0, 1, 390)).toBe(0);
    expect(ed.slideOffset(0, -1, 390)).toBe(0);
  });
});

describe('slideCommits', () => {
  it('goes on once the finger has taken the page far enough: 60px, or 15% of a narrow page', () => {
    // A page 500 wide: 60px (15% would be 75).
    expect(ed.slideCommits(-61, 1, 500)).toBe(true);
    expect(ed.slideCommits(-60, 1, 500)).toBe(false);
    expect(ed.slideCommits(61, -1, 500)).toBe(true);
    expect(ed.slideCommits(60, -1, 500)).toBe(false);
    // A phone 390 wide: 15% is 58.5.
    expect(ed.slideCommits(-59, 1, 390)).toBe(true);
    expect(ed.slideCommits(-58, 1, 390)).toBe(false);
    // A page 200 wide: 15% is 30.
    expect(ed.slideCommits(-31, 1, 200)).toBe(true);
    expect(ed.slideCommits(-30, 1, 200)).toBe(false);
  });
  it('goes on with a flick that way, even a short one', () => {
    expect(ed.slideCommits(-20, 1, 390, -0.5)).toBe(true);
    expect(ed.slideCommits(20, -1, 390, 0.36)).toBe(true);
    expect(ed.slideCommits(-20, 1, 390, -0.35)).toBe(false);
  });
  it('comes back for a flick the other way, however far it went', () => {
    expect(ed.slideCommits(-20, 1, 390, 0.8)).toBe(false);
    expect(ed.slideCommits(-200, 1, 390, 0.8)).toBe(false);
  });
  it('comes back when the finger ends up on the wrong side, or where it started', () => {
    expect(ed.slideCommits(100, 1, 390)).toBe(false);
    expect(ed.slideCommits(-100, -1, 390, -1)).toBe(false);
    expect(ed.slideCommits(0, 1, 390, -1)).toBe(false);
  });
});
