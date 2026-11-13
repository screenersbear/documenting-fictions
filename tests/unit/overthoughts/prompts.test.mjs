// overthoughts/data/prompts.js: the starting prompts for a blank page, and a
// random pick that never gives the one already showing.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let P;
beforeEach(async () => {
  vi.resetModules(); // some tests cut the list down: start each from a fresh copy
  P = await import('../../../overthoughts/data/prompts.js');
});
afterEach(() => {
  vi.restoreAllMocks();
});

// Math.random giving these numbers in turn; it stops a test that keeps asking.
function randoms(...values) {
  let n = 0;
  return vi.spyOn(Math, 'random').mockImplementation(() => {
    if (n >= values.length) throw new Error(`Math.random asked ${n + 1} times`);
    return values[n++];
  });
}

describe('PROMPTS', () => {
  it('has the 118 shoot prompts', () => {
    expect(P.PROMPTS).toHaveLength(118);
  });
  it('is all real questions: non-empty, trimmed, ending in ? or .', () => {
    for (const p of P.PROMPTS) {
      expect(typeof p).toBe('string');
      expect(p.length).toBeGreaterThan(20);
      expect(p).toBe(p.trim());
      expect(p).toMatch(/[?.]$/);
    }
  });
  it('has no repeats', () => {
    expect(new Set(P.PROMPTS).size).toBe(P.PROMPTS.length);
  });
  it('starts and ends with the expected prompts', () => {
    expect(P.PROMPTS[0]).toBe('What does the light in your favorite recent image tell you about how your eye has changed this year?');
    expect(P.PROMPTS[P.PROMPTS.length - 1]).toBe('When has a subject surprised you by trusting you with something vulnerable, on or off camera?');
  });
  it('keeps apostrophes inside the prompts', () => {
    expect(P.PROMPTS[6]).toBe("What have you been quietly practicing behind the scenes that hasn't shown up in your published work yet?");
  });
});

describe('pickPrompt', () => {
  it('picks the prompt at the random spot in the list', () => {
    randoms(0.5);
    expect(P.pickPrompt()).toBe(P.PROMPTS[59]);
  });
  it('can pick the first and the last prompt', () => {
    randoms(0);
    expect(P.pickPrompt(undefined)).toBe(P.PROMPTS[0]);
    vi.restoreAllMocks();
    randoms(0.9999999);
    expect(P.pickPrompt(undefined)).toBe(P.PROMPTS[117]);
  });
  it('asks again until it is not the prompt already showing', () => {
    const spy = randoms(0, 0, 0.5);
    expect(P.pickPrompt(P.PROMPTS[0])).toBe(P.PROMPTS[59]);
    expect(spy).toHaveBeenCalledTimes(3);
  });
  it('picks once when the one showing is not in the list', () => {
    const spy = randoms(0.25);
    expect(P.pickPrompt('my own prompt')).toBe(P.PROMPTS[29]);
    expect(spy).toHaveBeenCalledTimes(1);
  });
  it('always gives a prompt from the list, different from the last, over many picks', () => {
    let last = P.pickPrompt();
    for (let i = 0; i < 500; i++) {
      const next = P.pickPrompt(last);
      expect(P.PROMPTS).toContain(next);
      expect(next).not.toBe(last);
      last = next;
    }
  });
  it('gives back the only prompt when there is just one, rather than looping', () => {
    P.PROMPTS.splice(1);
    const spy = randoms();
    expect(P.pickPrompt(P.PROMPTS[0])).toBe(P.PROMPTS[0]);
    expect(spy).not.toHaveBeenCalled();
  });
  it('gives back what it was given when the list is empty', () => {
    P.PROMPTS.length = 0;
    randoms();
    expect(P.pickPrompt('x')).toBe('x');
    expect(P.pickPrompt()).toBeUndefined();
  });
});
