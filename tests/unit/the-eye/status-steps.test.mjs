// the-eye/components/status-steps.js: the stages on a shoot's status card.
import { describe, it, expect, vi } from 'vitest';

delete window.EyeParts;
await import('../../../the-eye/components/status-steps.js');

const ed = {};
window.EyeParts.addStatusSteps(ed);

// What a photo shoot's and a video shoot's status fields offer.
const PHOTO = ['prospect', 'planning', 'waiting_to_shoot', 'captured', 'waiting_for_selects', 'editing', 'delivered', 'rescheduled', 'canceled'];
const VIDEO = ['prospect', 'planning', 'waiting_to_shoot', 'captured', 'rough_cut', 'client_review', 'revisions', 'delivered', 'rescheduled', 'canceled'];
const states = r => r.bars.map(b => b.state);

describe('addStatusSteps', () => {
  it('adds statusSteps and nothing else', () => {
    expect(Object.keys(ed)).toEqual(['statusSteps']);
  });
  it('keeps the parts already on window.EyeParts', async () => {
    window.EyeParts.other = 1;
    vi.resetModules();
    await import('../../../the-eye/components/status-steps.js');
    expect(window.EyeParts.other).toBe(1);
    expect(typeof window.EyeParts.addStatusSteps).toBe('function');
  });
});

describe('statusSteps', () => {
  it('gives a photo shoot its seven stages, Postponed and Canceled left out', () => {
    const r = ed.statusSteps(PHOTO, 'waiting_to_shoot');
    expect(r.bars.map(b => b.key)).toEqual(['prospect', 'planning', 'waiting_to_shoot', 'captured', 'waiting_for_selects', 'editing', 'delivered']);
    expect(r.count).toBe('3 of 7');
    expect(r.off).toBe(false);
  });

  it('marks the stages done, the one it\'s at, and the ones to come', () => {
    expect(states(ed.statusSteps(PHOTO, 'waiting_to_shoot'))).toEqual(['done', 'done', 'now', 'later', 'later', 'later', 'later']);
    expect(states(ed.statusSteps(PHOTO, 'prospect'))).toEqual(['now', 'later', 'later', 'later', 'later', 'later', 'later']);
    expect(states(ed.statusSteps(PHOTO, 'delivered'))).toEqual(['done', 'done', 'done', 'done', 'done', 'done', 'now']);
    expect(ed.statusSteps(PHOTO, 'prospect').count).toBe('1 of 7');
    expect(ed.statusSteps(PHOTO, 'delivered').count).toBe('7 of 7');
  });

  it('grows each bar from 10 to 28px', () => {
    expect(ed.statusSteps(PHOTO, 'prospect').bars.map(b => b.height)).toEqual([10, 13, 16, 19, 22, 25, 28]);
  });

  it('gives a video shoot its eight stages, to a tenth of a pixel', () => {
    const r = ed.statusSteps(VIDEO, 'client_review');
    expect(r.count).toBe('6 of 8');
    expect(r.bars.map(b => b.height)).toEqual([10, 12.6, 15.1, 17.7, 20.3, 22.9, 25.4, 28]);
    expect(states(r)).toEqual(['done', 'done', 'done', 'done', 'done', 'now', 'later', 'later']);
  });

  it('says a postponed or canceled shoot is off the line, with no stage marked', () => {
    ['rescheduled', 'canceled'].forEach((status) => {
      const r = ed.statusSteps(PHOTO, status);
      expect(r.off).toBe(true);
      expect(r.count).toBe('');
      expect(states(r).every(s => s === 'later')).toBe(true);
      expect(r.bars).toHaveLength(7);
    });
  });

  it('marks nothing for a status it doesn\'t know, without calling it off', () => {
    const r = ed.statusSteps(PHOTO, 'mystery');
    expect(r.off).toBe(false);
    expect(r.count).toBe('');
    expect(states(r).every(s => s === 'later')).toBe(true);
  });

  it('copes with one stage, or none', () => {
    expect(ed.statusSteps(['prospect'], 'prospect')).toEqual({ off: false, count: '1 of 1', bars: [{ key: 'prospect', state: 'now', height: 10 }] });
    expect(ed.statusSteps(['prospect', 'delivered'], 'delivered').bars.map(b => b.height)).toEqual([10, 28]);
    expect(ed.statusSteps([], 'prospect')).toEqual({ off: false, count: '', bars: [] });
    expect(ed.statusSteps(['rescheduled', 'canceled'], 'canceled')).toEqual({ off: true, count: '', bars: [] });
  });
});
