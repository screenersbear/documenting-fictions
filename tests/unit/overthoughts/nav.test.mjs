// overthoughts/js/nav.js: Back from an entry or a review goes back in history
// once the app has moved inside itself, or to the section's own hash otherwise.
import { describe, it, expect, vi, beforeEach } from 'vitest';

let nav;
beforeEach(async () => {
  vi.resetModules(); // `moves` lives in the module: start each test from a fresh one
  nav = await import('../../../overthoughts/js/nav.js');
  location.hash = '';
});

describe('back', () => {
  it('goes to the fallback hash when the app has not moved yet', () => {
    const spy = vi.spyOn(history, 'back');
    nav.back('#/entries');
    expect(location.hash).toBe('#/entries');
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
  it('goes back in history after one move', () => {
    const spy = vi.spyOn(history, 'back').mockImplementation(() => {});
    nav.moved();
    nav.back('#/entries');
    expect(spy).toHaveBeenCalledTimes(1);
    expect(location.hash).toBe('');
    spy.mockRestore();
  });
  it('still goes back in history after many moves', () => {
    const spy = vi.spyOn(history, 'back').mockImplementation(() => {});
    for (let i = 0; i < 50; i++) nav.moved();
    nav.back('#/reviews');
    expect(spy).toHaveBeenCalledTimes(1);
    spy.mockRestore();
  });
  it('sets an empty hash when the fallback is empty and nothing moved', () => {
    location.hash = '#/somewhere';
    nav.back('');
    expect(location.hash).toBe('');
  });
});

describe('moved', () => {
  it('returns nothing', () => {
    expect(nav.moved()).toBeUndefined();
  });
  it('counts moves only in its own module copy', async () => {
    const spy = vi.spyOn(history, 'back').mockImplementation(() => {});
    nav.moved();
    vi.resetModules();
    const fresh = await import('../../../overthoughts/js/nav.js');
    fresh.back('#/entries');
    expect(spy).not.toHaveBeenCalled();
    expect(location.hash).toBe('#/entries');
    spy.mockRestore();
  });
});
