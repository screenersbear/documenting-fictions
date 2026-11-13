// contact-sheet/data/backup.js: Contact Sheet's part of the notebooks' shared zip
// backup. It hands everything to df-data.js (window.DFData), read at import.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let D;
let backup;

beforeEach(async () => {
  vi.resetModules(); // backup.js reads window.DFData when it loads
  D = {
    zipBackup: vi.fn(async () => ({ parts: ['p1'], size: 10, release: () => {}, done: Promise.resolve() })),
    isZipFile: vi.fn(() => true),
    restoreZip: vi.fn(async () => ({ restored: 3 })),
    todayStr: vi.fn(() => '2026-11-12'),
  };
  window.DFData = D;
  backup = await import('../../../contact-sheet/data/backup.js');
});

afterEach(() => {
  delete window.DFData;
});

describe('makeBackup', () => {
  it('asks df-data.js for a zip of the contact-sheet database, named for today', async () => {
    const out = await backup.makeBackup();
    expect(D.zipBackup).toHaveBeenCalledTimes(1);
    expect(D.zipBackup).toHaveBeenCalledWith({
      app: 'contact-sheet',
      databases: ['contact-sheet'],
      extra: {},
      filename: 'contact-sheet-backup-2026-11-12.zip',
      onProgress: undefined,
    });
    expect(out).toEqual({ parts: ['p1'], size: 10, release: expect.any(Function), done: expect.any(Promise) });
  });
  it('returns exactly what zipBackup resolves with', async () => {
    const result = { parts: [], size: 0 };
    D.zipBackup.mockResolvedValueOnce(result);
    await expect(backup.makeBackup()).resolves.toBe(result);
  });
  it('passes extra files and the progress callback through untouched', async () => {
    const extra = { 'notes.txt': 'hi' };
    const onProgress = vi.fn();
    await backup.makeBackup({ extra, onProgress });
    const arg = D.zipBackup.mock.calls[0][0];
    expect(arg.extra).toBe(extra);
    expect(arg.onProgress).toBe(onProgress);
    expect(arg.app).toBe('contact-sheet');
  });
  it('uses an empty extra when given an empty options object', async () => {
    await backup.makeBackup({});
    expect(D.zipBackup.mock.calls[0][0].extra).toEqual({});
  });
  it('asks for today once per backup and uses the new day each time', async () => {
    D.todayStr.mockReturnValueOnce('2026-12-31').mockReturnValueOnce('2027-01-01');
    await backup.makeBackup();
    await backup.makeBackup();
    expect(D.todayStr).toHaveBeenCalledTimes(2);
    expect(D.zipBackup.mock.calls[0][0].filename).toBe('contact-sheet-backup-2026-12-31.zip');
    expect(D.zipBackup.mock.calls[1][0].filename).toBe('contact-sheet-backup-2027-01-01.zip');
  });
  it('passes a failed backup on as a rejection', async () => {
    const err = new Error('disk full');
    D.zipBackup.mockRejectedValueOnce(err);
    await expect(backup.makeBackup()).rejects.toBe(err);
  });
});

describe('isZipBackup', () => {
  it('says yes for what df-data.js calls a zip', () => {
    const file = { name: 'contact-sheet-backup.zip' };
    expect(backup.isZipBackup(file)).toBe(true);
    expect(D.isZipFile).toHaveBeenCalledWith(file);
    expect(D.isZipFile).toHaveBeenCalledTimes(1);
  });
  it('says no for anything else', () => {
    D.isZipFile.mockReturnValueOnce(false);
    expect(backup.isZipBackup({ name: 'old.json' })).toBe(false);
  });
  it('passes missing input straight through', () => {
    D.isZipFile.mockReturnValueOnce(false);
    expect(backup.isZipBackup(undefined)).toBe(false);
    expect(D.isZipFile).toHaveBeenCalledWith(undefined);
  });
});

describe('restoreBackup', () => {
  it('restores the contact-sheet database from the given files with progress', async () => {
    const files = [{ name: 'a.zip' }, { name: 'a.z01' }];
    const onProgress = vi.fn();
    await expect(backup.restoreBackup(files, onProgress)).resolves.toEqual({ restored: 3 });
    expect(D.restoreZip).toHaveBeenCalledTimes(1);
    expect(D.restoreZip).toHaveBeenCalledWith(files, { databases: ['contact-sheet'], onProgress });
    expect(D.restoreZip.mock.calls[0][0]).toBe(files);
  });
  it('restores one zip with no progress callback', async () => {
    const file = { name: 'one.zip' };
    await backup.restoreBackup(file);
    expect(D.restoreZip).toHaveBeenCalledWith(file, { databases: ['contact-sheet'], onProgress: undefined });
  });
  it('passes a failed restore on as a rejection', async () => {
    const err = new Error('not a backup');
    D.restoreZip.mockRejectedValueOnce(err);
    await expect(backup.restoreBackup([])).rejects.toBe(err);
  });
});

describe('without df-data.js', () => {
  it('fails every call when window.DFData was missing at import', async () => {
    vi.resetModules();
    delete window.DFData;
    const bare = await import('../../../contact-sheet/data/backup.js');
    window.DFData = D; // too late: the module already read it
    expect(() => bare.makeBackup()).toThrow(TypeError);
    expect(() => bare.isZipBackup({})).toThrow(TypeError);
    expect(() => bare.restoreBackup([])).toThrow(TypeError);
    expect(D.zipBackup).not.toHaveBeenCalled();
  });
});
