// @vitest-environment node
// rounds/data/device.js: this phone's own values (the sync key and how it
// went), in a database of their own, never in the backup or rounds.json.
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';

let device;
beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory();
  vi.resetModules();
  vi.restoreAllMocks();
  device = await import('../../../rounds/data/device.js');
});

describe('device values', () => {
  it('keeps a value, and gives the fallback for one never set', async () => {
    expect(await device.getMeta('sync')).toBe(null);
    expect(await device.getMeta('leads', [])).toEqual([]);
    await device.setMeta('sync', { repo: 'a/b' });
    expect(await device.getMeta('sync')).toEqual({ repo: 'a/b' });
  });
  it('a value cleared gives the fallback again', async () => {
    await device.setMeta('leads', [1]);
    await device.setMeta('leads', null);
    expect(await device.getMeta('leads', [])).toEqual([]);
    await device.setMeta('n', 0);
    expect(await device.getMeta('n', 5)).toBe(0);
  });
  it("lives in its own database, rounds-device, not in Rounds' own", async () => {
    await device.setMeta('sync', { token: 'x' });
    const names = (await indexedDB.databases()).map((d) => d.name);
    expect(names).toEqual(['rounds-device']);
  });
  it('lets go of its connection when asked, and opens again after', async () => {
    await device.setMeta('a', 1);
    await new Promise((resolve, reject) => {
      const r = indexedDB.deleteDatabase('rounds-device');
      r.onsuccess = resolve;
      r.onblocked = () => reject(new Error('still open'));
    });
    expect(await device.getMeta('a')).toBe(null);
  });
  it("says plainly when it can't open, and tries again next time", async () => {
    const real = indexedDB.open.bind(indexedDB);
    const spy = vi.spyOn(indexedDB, 'open').mockImplementationOnce(() => {
      const r = {};
      setTimeout(() => { r.error = new Error('blocked'); r.onerror(); });
      return r;
    });
    await expect(device.getMeta('a')).rejects.toThrow('blocked');
    spy.mockImplementation(real);
    expect(await device.getMeta('a', 2)).toBe(2);
  });
  it('says plainly when a save fails', async () => {
    const { IDBObjectStore } = await import('fake-indexeddb');
    await device.getMeta('a');
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function () { this.transaction.abort(); });
    await expect(device.setMeta('a', 1)).rejects.toThrow("That wasn't saved. Your phone may be out of space.");
  });
});
