// shared/df-data.js: The Eye's data read from where it keeps it (eyeState,
// and eyeShootName, how it names a shoot).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadDFData } from './_env.mjs';

let D;
const NOW = new Date(2026, 10, 12, 10, 0, 0).getTime();
beforeEach(async () => {
  D = await loadDFData();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

const setState = (st) => localStorage.setItem('dailies_state_v1', JSON.stringify(st));

describe('eyeState', () => {
  it("reads The Eye's state from localStorage", () => {
    setState({ shoots: [{ id: 1 }], titleDisplayMode: 'title' });
    expect(D.eyeState()).toEqual({ shoots: [{ id: 1 }], titleDisplayMode: 'title' });
  });
  it('is null when there is none, or it is empty', () => {
    expect(D.eyeState()).toBeNull();
    localStorage.setItem('dailies_state_v1', '');
    expect(D.eyeState()).toBeNull();
  });
  it('is null when it is not JSON', () => {
    localStorage.setItem('dailies_state_v1', '{not json');
    expect(D.eyeState()).toBeNull();
  });
  it('is null when localStorage cannot be read (private mode)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    expect(D.eyeState()).toBeNull();
  });
});

describe('eyeShootName', () => {
  const s = { title: 'Rooftop', talents: [{ name: '' }, { name: '  ' }, { name: 'Ana' }, { name: 'Bo' }] };
  it('shows the first talent with a name, then the title', () => {
    expect(D.eyeShootName(s)).toBe('Ana');
    expect(D.eyeShootName({ title: 'Rooftop', talents: [] })).toBe('Rooftop');
    expect(D.eyeShootName({ title: 'Rooftop' })).toBe('Rooftop');
  });
  it("shows the title first in The Eye's title mode", () => {
    expect(D.eyeShootName(s, 'title')).toBe('Rooftop');
    expect(D.eyeShootName({ talents: [{ name: 'Ana' }] }, 'title')).toBe('Ana');
    expect(D.eyeShootName(s, 'talent')).toBe('Ana');
  });
  it('is Untitled shoot with neither', () => {
    expect(D.eyeShootName({})).toBe('Untitled shoot');
    expect(D.eyeShootName({ title: '', talents: [{ name: ' ' }] }, 'title')).toBe('Untitled shoot');
    expect(D.eyeShootName({ talents: [{}] })).toBe('Untitled shoot');
  });
});
