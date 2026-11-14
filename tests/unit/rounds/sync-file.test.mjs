// rounds/data/sync-file.js: rounds.json as Rounds writes it and reads it back.
import { describe, it, expect } from 'vitest';
import { FILE, VERSION, fileText, readFile, deviceLabel } from '../../../rounds/data/sync-file.js';

const NOW = '2026-11-14T12:00:00.000Z';
const ana = { id: 'a', name: 'Ana', next: { kind: 'pitch', due: '2026-11-16', step: 0 }, letGo: false };

describe('fileText', () => {
  it('is the app, its version, when, from which device, and the data, pretty', () => {
    const text = fileText({ people: [ana] }, { device: 'iPhone', now: NOW });
    const f = JSON.parse(text);
    expect([FILE, VERSION]).toEqual(['rounds.json', 1]);
    expect(f).toMatchObject({ app: 'rounds', version: 1, exportedAt: NOW, syncedFrom: 'iPhone' });
    expect(Object.keys(f.data)).toEqual(['people', 'moves', 'messages', 'settings', 'passed', 'tombstones']);
    expect(f.data.moves).toEqual([]);
    expect(text).toContain('\n  "app": "rounds"');
  });
  it("gives each person their next move in plain words for Claude", () => {
    const f = JSON.parse(fileText({ people: [ana] }, { now: NOW }));
    expect(f.data.people[0]).toEqual({ ...ana, nextMove: { kind: 'Pitch', due: '2026-11-16' } });
    expect(f.syncedFrom).toBe(null);
  });
  it('no next move once let go, with none planned, or an unknown one', () => {
    const f = JSON.parse(fileText({ people: [{ ...ana, letGo: true }, { ...ana, id: 'b', next: null }, { ...ana, id: 'c', next: { kind: 'wave', due: 'x' } }] }, { now: NOW }));
    expect(f.data.people.map((p) => p.nextMove)).toEqual([null, null, null]);
  });
});

describe('readFile', () => {
  it('reads the data back, without the plain next moves', () => {
    const r = readFile(fileText({ people: [ana], moves: [{ id: 'm' }] }, { device: 'a browser', now: NOW }), 'o/r');
    expect(r.data.people).toEqual([ana]);
    expect(r.data.moves).toEqual([{ id: 'm' }]);
    expect(r.syncedFrom).toBe('a browser');
  });
  it('a store missing, or not a list, reads as empty; no device as null', () => {
    const r = readFile(JSON.stringify({ app: 'rounds', data: { people: 'x' } }), 'o/r');
    expect(r).toEqual({ data: { people: [], moves: [], messages: [], settings: [], passed: [], tombstones: [] }, syncedFrom: null });
  });
  it("anything else isn't a Rounds file, in plain words", () => {
    const msg = "rounds.json in o/r isn't a Rounds file. Use a repository just for Rounds.";
    for (const t of ['not json', 'null', '[]', JSON.stringify({ app: 'callback', data: {} }), JSON.stringify({ app: 'rounds' }), JSON.stringify({ app: 'rounds', data: 'x' })]) {
      expect(() => readFile(t, 'o/r')).toThrow(msg);
    }
  });
});

describe('deviceLabel', () => {
  it('names the device from its browser', () => {
    expect(deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe('iPhone');
    expect(deviceLabel('Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)')).toBe('iPad');
    expect(deviceLabel('Mozilla/5.0 (Linux; Android 14; Pixel 8)')).toBe('Android phone');
    expect(deviceLabel('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('Mac');
    expect(deviceLabel('Mozilla/5.0 (Windows NT 10.0)')).toBe('browser');
    expect(deviceLabel('')).toBe('browser');
  });
});
