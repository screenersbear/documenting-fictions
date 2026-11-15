// shared/data/backups.js (with backup-books.js): Back up, on the shelf and in
// every notebook's Options. makeBackup hands the right databases and
// localStorage keys to df-data.js's zipBackup, for one notebook or all four;
// restoreZip puts a zip's cover colours and The Eye's shoots back; whatsIn
// says what a picked backup is; restore takes either kind, zip or .json.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import {
  DBS, EYE_DB, BOOK_KEYS as BOOKS, EYE, EYE_BAD, NOT_A_BACKUP, OTHER, load, fakeDFData, rejectsWith, lsKeys, makeDb,
  fileOf, suite, part, eyePart, zipHolding as holding,
} from './_backups.mjs';

let D;
let B;
beforeEach(async () => {
  globalThis.indexedDB = new IDBFactory();
  localStorage.clear();
  D = fakeDFData();
  B = await load(D);
});
afterEach(() => {
  vi.restoreAllMocks();
  delete window.DFData;
  delete window.DFBackups;
});
const zipHolding = (local, extra) => holding(D, local, extra);
const zip = (name = 'b.zip') => new File(['z'], name);

// ---------- loading ----------
describe('loading the scripts', () => {
  it("without df-data.js, there's only what goes in a backup", async () => {
    const only = await load(undefined);
    expect(Object.keys(only).sort()).toEqual(['BOOKS', 'DBS', 'EYE_DB', 'EYE_LAST_BACKUP', 'EYE_STATE', 'ORDER']);
  });
  it('backups.js waits for the other two', async () => {
    expect(await load(D, ['backups'])).toBeUndefined();
    expect(Object.keys(await load(D, ['backup-books', 'backups'])).includes('makeBackup')).toBe(false);
    expect(await load(D, ['backup-json'])).toBeUndefined();
  });
  it('sets window.DFBackups: what goes in a backup, and its jobs', () => {
    expect(Object.keys(B).sort()).toEqual(['BOOKS', 'DBS', 'EYE_DB', 'EYE_LAST_BACKUP', 'EYE_STATE', 'ORDER',
      'existing', 'makeBackup', 'noPart', 'otherBook', 'partFile', 'readJson', 'restore', 'restoreJson', 'restoreZip', 'whatsIn'].sort());
    expect(B.EYE_LAST_BACKUP).toBe('dailies_last_backup_v1');
    expect(B.EYE_STATE).toBe(EYE);
    expect(B.EYE_DB).toBe(EYE_DB);
    expect(B.DBS.map((n) => n.db)).toEqual(DBS);
    expect(B.DBS.filter((n) => n.book).map((n) => n.book)).toEqual(BOOKS);
  });
  it('keeps the window.DFBackups already there, adding to it', async () => {
    window.DFBackups = { mine: 1 };
    vi.resetModules();
    await import('../../../shared/data/backup-books.js');
    expect(window.DFBackups.mine).toBe(1);
    expect(window.DFBackups.ORDER).toEqual(['ref', 'the-eye', 'contact-sheet', 'rounds']);
  });
  it('reads df-data.js once, when it loads', async () => {
    const later = { ...D, zipBackup: vi.fn() };
    window.DFData = later;
    localStorage.setItem(EYE, '{"shoots":[]}');
    await B.makeBackup();
    expect(D.zipBackup).toHaveBeenCalledTimes(1);
    expect(later.zipBackup).not.toHaveBeenCalled();
  });
});

describe('BOOKS: each notebook on its own', () => {
  it("has the four, in the shelf's order, each with its name and a line of what's in it", () => {
    expect(B.ORDER).toEqual(['ref', 'the-eye', 'contact-sheet', 'rounds']);
    expect(Object.keys(B.BOOKS).sort()).toEqual([...B.ORDER].sort());
    expect(B.ORDER.map((a) => B.BOOKS[a].name)).toEqual(['Ref', 'The Eye', 'Layouts', 'Rounds']);
    for (const a of B.ORDER) expect(B.BOOKS[a].line).toMatch(/^[A-Z].+\.$/);
  });
  it('holds what each notebook\'s own backup held, and never Rounds\' device key', () => {
    expect(B.ORDER.map((a) => [B.BOOKS[a].dbs, B.BOOKS[a].local, B.BOOKS[a].book])).toEqual([
      [['ref-notebook'], [], 'ref-notebook-book'],
      [[EYE_DB, 'df-links'], [EYE], null],
      [['contact-sheet'], [], 'contact-sheet-book'],
      [['rounds'], [], 'rounds-book'],
    ]);
  });
});

// ---------- makeBackup: all four ----------
describe('makeBackup, all four', () => {
  it('is null with nothing to back up, and makes no zip', async () => {
    await makeDb('someone-else', 1, { s: {} });
    expect(await B.makeBackup()).toBeNull();
    expect(D.zipBackup).not.toHaveBeenCalled();
  });
  it('zips only the databases that are there, with every cover colour', async () => {
    await makeDb('df-stickers', 1, { s: {} });
    await makeDb('ref-notebook', 1, { s: {} });
    await makeDb('someone-else', 1, { s: {} });
    const onProgress = () => {};
    const out = await B.makeBackup(onProgress);
    expect(out).toBe(await D.zipBackup.mock.results[0].value);
    expect(D.zipBackup).toHaveBeenCalledTimes(1);
    expect(D.zipBackup).toHaveBeenCalledWith({
      app: 'documenting-fictions',
      kind: 'suite',
      databases: ['ref-notebook', 'df-stickers'],
      local: BOOKS,
      filename: 'documenting-fictions-backup-2026-11-12.zip',
      onProgress,
    });
  });
  it("leaves Overthoughts' database out, still on a phone that has it", async () => {
    await makeDb('overthoughts', 1, { s: {} });
    await makeDb('rounds', 1, { s: {} });
    localStorage.setItem('overthoughts-book', 'leaf');
    await B.makeBackup();
    expect(D.zipBackup.mock.calls[0][0].databases).toEqual(['rounds']);
    expect(D.zipBackup.mock.calls[0][0].local).toEqual(BOOKS);
  });
  it("adds The Eye's photos and shoots when The Eye has been used", async () => {
    for (const n of DBS) await makeDb(n, 1, { s: {} });
    localStorage.setItem(EYE, '{"shoots":[]}');
    await B.makeBackup();
    const opts = D.zipBackup.mock.calls[0][0];
    expect(opts.databases).toEqual([...DBS, EYE_DB]);
    expect(opts.local).toEqual([EYE, ...BOOKS]);
    expect(opts.onProgress).toBeUndefined();
  });
  it('backs up The Eye on its own', async () => {
    localStorage.setItem(EYE, '{"shoots":[]}');
    await B.makeBackup();
    expect(D.zipBackup.mock.calls[0][0].databases).toEqual([EYE_DB]);
    expect(D.zipBackup.mock.calls[0][0].local).toEqual([EYE, ...BOOKS]);
  });
  it('counts an empty Eye state as no Eye', async () => {
    localStorage.setItem(EYE, '');
    expect(await B.makeBackup()).toBeNull();
  });
  it("tries every notebook's database when the browser can't list them", async () => {
    indexedDB.databases = undefined;
    await B.makeBackup();
    expect(D.zipBackup.mock.calls[0][0].databases).toEqual(DBS);
    expect(D.zipBackup.mock.calls[0][0].local).toEqual(BOOKS);
  });
  it("leaves The Eye out when localStorage can't be read", async () => {
    await makeDb('rounds', 1, { s: {} });
    localStorage.setItem(EYE, '{"shoots":[]}');
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    await B.makeBackup();
    expect(D.zipBackup.mock.calls[0][0].databases).toEqual(['rounds']);
    expect(D.zipBackup.mock.calls[0][0].local).toEqual(BOOKS);
  });
  it("passes on zipBackup's failure", async () => {
    await makeDb('ref-notebook', 1, { s: {} });
    D.zipBackup.mockRejectedValue(new Error('disk full'));
    await rejectsWith(B.makeBackup(), 'disk full');
  });
});

// ---------- makeBackup: just one ----------
describe('makeBackup, just one notebook', () => {
  it('is the backup its own Options made: its app, databases and file name, with its cover colour', async () => {
    localStorage.setItem('ref-notebook-book', 'ocean');
    const onProgress = () => {};
    const out = await B.makeBackup(onProgress, 'ref');
    expect(out).toBe(await D.zipBackup.mock.results[0].value);
    expect(D.zipBackup.mock.calls).toEqual([[{
      app: 'ref', databases: ['ref-notebook'], local: [], extra: { book: 'ocean' }, filename: 'ref-backup-2026-11-12.zip', onProgress,
    }]]);
  });
  it('Layouts and Rounds the same way; no colour picked is an empty one', async () => {
    localStorage.setItem('rounds-book', 'leaf');
    await B.makeBackup(undefined, 'contact-sheet');
    await B.makeBackup(undefined, 'rounds');
    expect(D.zipBackup.mock.calls.map(([o]) => [o.app, o.databases, o.extra, o.filename])).toEqual([
      ['contact-sheet', ['contact-sheet'], { book: '' }, 'contact-sheet-backup-2026-11-12.zip'],
      ['rounds', ['rounds'], { book: 'leaf' }, 'rounds-backup-2026-11-12.zip'],
    ]);
  });
  it("The Eye: its photos, the boards sent to its shoots and its shoots, as The Eye's own backup", async () => {
    await B.makeBackup(undefined, 'the-eye');
    expect(D.zipBackup.mock.calls[0][0]).toEqual({
      app: 'the-eye', databases: [EYE_DB, 'df-links'], local: [EYE], extra: {}, filename: 'the-eye-backup-2026-11-12.zip', onProgress: undefined,
    });
  });
  it("leaves the checking of what's there to zipBackup, and says what it says (null for nothing)", async () => {
    D.zipBackup.mockResolvedValue(null);
    expect(await B.makeBackup(undefined, 'ref')).toBeNull();
    D.zipBackup.mockRejectedValue(new Error('disk full'));
    await rejectsWith(B.makeBackup(undefined, 'ref'), 'disk full');
  });
  it("still backs up when the colour can't be read", async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    await B.makeBackup(undefined, 'ref');
    expect(D.zipBackup.mock.calls[0][0].extra).toEqual({ book: '' });
  });
});

// ---------- restoreZip: all four ----------
describe('restoreZip, all four', () => {
  it("asks df-data.js for the suite's databases (no Overthoughts), with a check of The Eye's part", async () => {
    zipHolding({});
    const files = [zip('a.zip'), zip('b.zip')];
    const onProgress = () => {};
    await expect(B.restoreZip(files, onProgress)).resolves.toBeUndefined();
    expect(D.restoreZip).toHaveBeenCalledTimes(1);
    expect(D.restoreZip.mock.calls[0][0]).toBe(files);
    expect(D.restoreZip.mock.calls[0][1]).toEqual({ kind: 'suite', databases: [...DBS, EYE_DB], onProgress, check: expect.any(Function) });
  });
  it('puts the cover colours back, keeping a cover the file has nothing for, and skipping Overthoughts\'', async () => {
    localStorage.setItem('contact-sheet-book', 'keep');
    const { rLocal } = zipHolding({ 'ref-notebook-book': '{"c":1}', 'overthoughts-book': '{"c":3}', 'rounds-book': '{"c":4}' });
    await B.restoreZip([]);
    expect(localStorage.getItem('ref-notebook-book')).toBe('{"c":1}');
    expect(localStorage.getItem('contact-sheet-book')).toBe('keep');
    expect(localStorage.getItem('rounds-book')).toBe('{"c":4}');
    expect(localStorage.getItem('overthoughts-book')).toBeNull();
    expect(rLocal.mock.calls.map(([k]) => k)).toEqual([...BOOKS, EYE]);
    expect(lsKeys()).toEqual([...BOOKS].sort());
  });
  it("puts The Eye's shoots back as they are, with its colour", async () => {
    const st = JSON.stringify({ shoots: [{ id: 's1' }], presentation: { color: '#123456' } });
    const { checkLocal } = zipHolding({ [EYE]: st });
    await B.restoreZip([]);
    expect(localStorage.getItem(EYE)).toBe(st);
    expect(localStorage.getItem('df-app-color')).toBe('#123456');
    expect(checkLocal.mock.calls.map(([k]) => k)).toEqual([EYE]);
  });
  it("keeps the app colour when The Eye's part has none", async () => {
    localStorage.setItem('df-app-color', 'blue');
    zipHolding({ [EYE]: '{"shoots":[]}' });
    await B.restoreZip([]);
    expect(localStorage.getItem('df-app-color')).toBe('blue');
    zipHolding({ [EYE]: '{"shoots":[],"presentation":{"color":""}}' });
    await B.restoreZip([]);
    expect(localStorage.getItem('df-app-color')).toBe('blue');
    expect(localStorage.getItem(EYE)).toBe('{"shoots":[],"presentation":{"color":""}}');
  });
  it('leaves The Eye alone when the file has no Eye part (null or missing)', async () => {
    localStorage.setItem(EYE, 'mine');
    zipHolding({ [EYE]: null });
    await B.restoreZip([]);
    zipHolding({ [EYE]: undefined });
    await B.restoreZip([]);
    expect(localStorage.getItem(EYE)).toBe('mine');
    expect(lsKeys()).toEqual([EYE]);
  });
  it("refuses an Eye part that isn't JSON, before anything is changed", async () => {
    const { rLocal } = zipHolding({ [EYE]: 'not json', 'ref-notebook-book': 'x' });
    await rejectsWith(B.restoreZip([]), EYE_BAD);
    expect(rLocal).not.toHaveBeenCalled();
    expect(lsKeys()).toEqual([]);
  });
  it('refuses an Eye part with no list of shoots', async () => {
    for (const st of ['{}', '{"shoots":{}}', '{"shoots":"a"}', 'null', '[]']) {
      zipHolding({ [EYE]: st });
      await rejectsWith(B.restoreZip([]), EYE_BAD);
    }
    expect(lsKeys()).toEqual([]);
  });
  it("throws when The Eye's shoots don't fit in localStorage, after the covers were tried", async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
    const { rLocal } = zipHolding({ 'ref-notebook-book': 'x', [EYE]: '{"shoots":[]}' });
    await rejectsWith(B.restoreZip([]), 'QuotaExceededError');
    expect(rLocal.mock.calls.map(([k]) => k)).toEqual([...BOOKS, EYE]);
  });
  it("is fine when a cover can't be saved (private mode)", async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('private'); });
    zipHolding({ 'rounds-book': 'x' });
    await expect(B.restoreZip([])).resolves.toBeUndefined();
  });
  it("passes on df-data.js's failure", async () => {
    D.restoreZip.mockRejectedValue(new Error("That file isn't a backup of all four."));
    await rejectsWith(B.restoreZip([]), "That file isn't a backup of all four.");
  });
});

// ---------- restoreZip: just one ----------
describe('restoreZip, just one notebook', () => {
  it("asks df-data.js for that notebook's databases only, from a backup of it or of all four", async () => {
    zipHolding({});
    const files = [zip()];
    const onProgress = () => {};
    await B.restoreZip(files, onProgress, 'ref');
    expect(D.restoreZip.mock.calls).toEqual([[files, { databases: ['ref-notebook'], onProgress, check: undefined }]]);
  });
  it("puts its cover back: the backup's own colour, or its one in a backup of all four", async () => {
    zipHolding({ 'ref-notebook-book': 'from-all', 'contact-sheet-book': 'not-this' }, { book: 'own' });
    await B.restoreZip([], undefined, 'ref');
    expect(localStorage.getItem('ref-notebook-book')).toBe('own');
    const { rLocal } = zipHolding({ 'ref-notebook-book': 'from-all', 'contact-sheet-book': 'not-this' });
    await B.restoreZip([], undefined, 'ref');
    expect(localStorage.getItem('ref-notebook-book')).toBe('from-all');
    expect(rLocal.mock.calls.map(([k]) => k)).toEqual(['ref-notebook-book']);
    expect(lsKeys()).toEqual(['ref-notebook-book']);
  });
  it('keeps its cover when the backup has none, or no extra at all', async () => {
    localStorage.setItem('rounds-book', 'mine');
    zipHolding({}, { book: '' });
    await B.restoreZip([], undefined, 'rounds');
    D.restoreZip.mockResolvedValue({ local: async () => null });
    await B.restoreZip([], undefined, 'rounds');
    expect(localStorage.getItem('rounds-book')).toBe('mine');
  });
  it("leaves The Eye's shoots alone for another notebook, even in a backup of all four", async () => {
    localStorage.setItem(EYE, 'mine');
    const { rLocal } = zipHolding({ [EYE]: '{"shoots":[1]}' });
    await B.restoreZip([], undefined, 'contact-sheet');
    expect(localStorage.getItem(EYE)).toBe('mine');
    expect(rLocal.mock.calls.map(([k]) => k)).toEqual(['contact-sheet-book']);
  });
  it('The Eye: its photos and boards, then its shoots and colour, checked first', async () => {
    const st = '{"shoots":[{"id":"a"}],"presentation":{"color":"#fff000"}}';
    const { checkLocal } = zipHolding({ [EYE]: st, 'ref-notebook-book': 'not-this' });
    await B.restoreZip([], undefined, 'the-eye');
    expect(D.restoreZip.mock.calls[0][1]).toEqual({ databases: [EYE_DB, 'df-links'], onProgress: undefined, check: expect.any(Function) });
    expect(checkLocal.mock.calls.map(([k]) => k)).toEqual([EYE]);
    expect(localStorage.getItem(EYE)).toBe(st);
    expect(localStorage.getItem('df-app-color')).toBe('#fff000');
    expect(lsKeys()).toEqual([EYE, 'df-app-color'].sort());
  });
  it("refuses a backup with no shoots for The Eye, or broken ones, before anything's changed", async () => {
    zipHolding({});
    await rejectsWith(B.restoreZip([], undefined, 'the-eye'), 'That backup has nothing from The Eye.');
    zipHolding({ [EYE]: '{"shoots":"x"}' });
    await rejectsWith(B.restoreZip([], undefined, 'the-eye'), EYE_BAD);
    expect(lsKeys()).toEqual([]);
  });
  it("passes on df-data.js's failure (a backup of a different notebook)", async () => {
    D.restoreZip.mockRejectedValue(new Error(OTHER));
    await rejectsWith(B.restoreZip([zip()], undefined, 'rounds'), OTHER);
  });
});

// ---------- whatsIn ----------
describe('whatsIn', () => {
  it('reads a zip\'s manifest: all four, or which notebook', async () => {
    const files = [zip('a.zip'), zip('b.zip')];
    expect(await B.whatsIn(files)).toEqual({ all: true });
    expect(D.backupManifest).toHaveBeenCalledWith(files);
    for (const app of ['ref', 'the-eye', 'contact-sheet', 'rounds']) {
      D.backupManifest.mockResolvedValueOnce({ kind: 'notebook', app });
      expect(await B.whatsIn(files)).toEqual({ app });
    }
  });
  it('takes one file on its own too', async () => {
    const f = zip();
    D.backupManifest.mockResolvedValueOnce({ kind: 'notebook', app: 'rounds' });
    expect(await B.whatsIn(f)).toEqual({ app: 'rounds' });
    expect(D.backupManifest).toHaveBeenCalledWith([f]);
  });
  it('reads a .json: all four, a notebook\'s own, or The Eye\'s', async () => {
    expect(await B.whatsIn([fileOf(suite({}))])).toEqual({ all: true });
    expect(await B.whatsIn(fileOf(part('contact-sheet', {})))).toEqual({ app: 'contact-sheet' });
    expect(await B.whatsIn(fileOf(eyePart({ shoots: [] })))).toEqual({ app: 'the-eye' });
    expect(D.backupManifest).not.toHaveBeenCalled();
  });
  it("refuses a backup of a notebook that's no longer here (Overthoughts)", async () => {
    D.backupManifest.mockResolvedValueOnce({ kind: 'notebook', app: 'overthoughts' });
    await rejectsWith(B.whatsIn(zip()), OTHER);
    D.backupManifest.mockResolvedValueOnce({ kind: 'notebook' });
    await rejectsWith(B.whatsIn(zip()), OTHER);
  });
  it("throws what's wrong with it, and for nothing picked", async () => {
    D.backupManifest.mockRejectedValueOnce(new Error("That file isn't a notebook backup."));
    await rejectsWith(B.whatsIn(zip()), "That file isn't a notebook backup.");
    await rejectsWith(B.whatsIn(fileOf('nope')), NOT_A_BACKUP);
    await rejectsWith(B.whatsIn([]), NOT_A_BACKUP);
  });
});

// ---------- restore ----------
describe('restore', () => {
  it('puts a zip back: all four, or just one', async () => {
    zipHolding({});
    const files = [zip()];
    const onProgress = () => {};
    await B.restore(files, { onProgress });
    await B.restore(files, { only: 'rounds' });
    expect(D.restoreZip.mock.calls.map(([f, o]) => [f, o.kind, o.databases, o.onProgress === onProgress])).toEqual([
      [files, 'suite', [...DBS, EYE_DB], true],
      [files, undefined, ['rounds'], false],
    ]);
    D.restoreZip.mock.calls[1][1].onProgress(0.5); // a quiet one when none is given
  });
  it('takes one zip on its own', async () => {
    zipHolding({});
    const f = zip();
    await B.restore(f);
    expect(D.restoreZip.mock.calls[0][0]).toEqual([f]);
  });
  it('puts a .json back: all four, or just one', async () => {
    await B.restore([fileOf(suite({ rounds: part('rounds', { s: { rows: [['k', 'v']] } }), ref: part('ref-notebook', {}) }))], { only: 'rounds' });
    expect(D.open.mock.calls.map(([n]) => n)).toEqual(['rounds']);
    await B.restore(fileOf(part('ref-notebook', {})));
    expect(D.open.mock.calls.map(([n]) => n)).toEqual(['rounds', 'ref-notebook']);
    expect(D.restoreZip).not.toHaveBeenCalled();
  });
  it("refuses nothing picked, or what isn't a backup", async () => {
    await rejectsWith(B.restore([]), NOT_A_BACKUP);
    await rejectsWith(B.restore(fileOf('x')), NOT_A_BACKUP);
  });
});
