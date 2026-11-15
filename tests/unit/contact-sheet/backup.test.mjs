// contact-sheet/data/backup.js: putting Contact Sheet's part of a zip backup
// back (Back up itself is the sheet every notebook shares). It hands
// everything to df-data.js (window.DFData), read at import.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

let D;
let backup;

beforeEach(async () => {
  vi.resetModules(); // backup.js reads window.DFData when it loads
  D = {
    isZipFile: vi.fn(() => true),
    restoreZip: vi.fn(async () => ({ restored: 3 })),
  };
  window.DFData = D;
  backup = await import('../../../contact-sheet/data/backup.js');
});

afterEach(() => {
  delete window.DFData;
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
    expect(() => bare.isZipBackup({})).toThrow(TypeError);
    expect(() => bare.restoreBackup([])).toThrow(TypeError);
    expect(D.restoreZip).not.toHaveBeenCalled();
  });
});
