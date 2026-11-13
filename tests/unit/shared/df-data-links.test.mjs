// shared/df-data.js: links between notebooks (a Ref board sent to a shoot in
// The Eye) in df-links, their pictures, and a board as a file and back.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadDFData, rawAll, rawOpen, FakeFileReader, NodeFile, expectError } from './_env.mjs';

let D;
const NOW = Date.UTC(2026, 10, 12, 10, 0, 0);
beforeEach(async () => {
  D = await loadDFData();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
const iso = (t) => new Date(t).toISOString();
const bytes = (...b) => new Uint8Array(b).buffer;

describe('saveLink and getLink', () => {
  it('makes a link with an id and times, and makes df-links with its two stores', async () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    const l = await D.saveLink({ fromApp: 'ref', fromId: 'b1', toApp: 'the-eye', toId: 's1', type: 'moodboard' });
    expect(l).toEqual({ fromApp: 'ref', fromId: 'b1', toApp: 'the-eye', toId: 's1', type: 'moodboard', id: `${NOW.toString(36)}i`, createdAt: iso(NOW), updatedAt: iso(NOW) });
    expect(await D.getLink(l.id)).toEqual(l);
    const db = await rawOpen('df-links');
    expect([...db.objectStoreNames]).toEqual(['links', 'pictures']);
    expect(db.transaction('links').objectStore('links').keyPath).toBe('id');
    expect(db.transaction('pictures').objectStore('pictures').keyPath).toBeNull();
    expect(await rawAll(db, 'pictures')).toEqual([]);
    db.close();
  });
  it('keeps its id and createdAt when saved again, and moves updatedAt on', async () => {
    const l = await D.saveLink({ id: 'L1', createdAt: '2020-01-01T00:00:00.000Z', name: 'a' });
    vi.setSystemTime(NOW + 5000);
    const again = await D.saveLink({ ...l, name: 'b' });
    expect(again).toEqual({ id: 'L1', createdAt: '2020-01-01T00:00:00.000Z', updatedAt: iso(NOW + 5000), name: 'b' });
    expect(await D.getLink('L1')).toEqual(again);
  });
  it('saves its pictures with it when given, and leaves them when not', async () => {
    const pics = { cover: { type: 'image/png', bytes: bytes(1) }, pages: [{ type: 'image/jpeg', bytes: bytes(2, 3) }] };
    await D.saveLink({ id: 'L1' }, pics);
    await D.saveLink({ id: 'L1', name: 'renamed' });
    const got = await D.linkPictures('L1');
    expect(got.cover.type).toBe('image/png');
    expect([...new Uint8Array(got.pages[0].bytes)]).toEqual([2, 3]);
  });
  it('gives undefined for a link or pictures that are not there', async () => {
    expect(await D.getLink('nope')).toBeUndefined();
    expect(await D.linkPictures('nope')).toBeUndefined();
  });
  it('rejects a link that cannot be stored, and keeps nothing', async () => {
    await expectError(D.saveLink({ id: 'L1', fn: () => {} }));
    expect(await D.getLink('L1')).toBeUndefined();
  });
});

describe('linksWhere', () => {
  // Saved in an order unlike their ids' (a store lists by id).
  beforeEach(async () => {
    vi.setSystemTime(NOW + 3); await D.saveLink({ id: 'a', fromApp: 'ref', toApp: 'the-eye', toId: 's2' });
    vi.setSystemTime(NOW + 1); await D.saveLink({ id: 'b', fromApp: 'ref', toApp: 'the-eye', toId: 's1' });
    vi.setSystemTime(NOW + 2); await D.saveLink({ id: 'c', fromApp: 'other', toApp: 'the-eye', toId: 's1' });
  });
  it('lists every link, oldest first, with nothing to match', async () => {
    expect((await D.linksWhere()).map((l) => l.id)).toEqual(['b', 'c', 'a']);
    expect((await D.linksWhere({})).map((l) => l.id)).toEqual(['b', 'c', 'a']);
  });
  it('lists the links matching every field given', async () => {
    expect((await D.linksWhere({ toApp: 'the-eye', toId: 's1' })).map((l) => l.id)).toEqual(['b', 'c']);
    expect((await D.linksWhere({ fromApp: 'ref', toId: 's1' })).map((l) => l.id)).toEqual(['b']);
  });
  it('lists nothing when none match, matching exactly (not loosely)', async () => {
    expect(await D.linksWhere({ toId: 'zzz' })).toEqual([]);
    expect(await D.linksWhere({ pending: undefined, toId: 1 })).toEqual([]);
  });
});

describe('dropLinks', () => {
  it('removes links and their pictures', async () => {
    await D.saveLink({ id: 'a' }, { pages: [] });
    await D.saveLink({ id: 'b' }, { pages: [] });
    await D.saveLink({ id: 'c' });
    await expect(D.dropLinks(['a', 'c'])).resolves.toBeUndefined();
    expect((await D.linksWhere()).map((l) => l.id)).toEqual(['b']);
    expect(await D.linkPictures('a')).toBeUndefined();
    expect(await D.linkPictures('b')).toEqual({ pages: [] });
  });
  it('is fine with ids that are not there, or none', async () => {
    await D.saveLink({ id: 'a' });
    await D.dropLinks(['zzz']);
    await D.dropLinks([]);
    expect((await D.linksWhere()).length).toBe(1);
  });
  it('rejects an id that is not a key', async () => {
    await expect(D.dropLinks([{}])).rejects.toMatchObject({ name: 'DataError' });
  });
});

describe('pictureUrl', () => {
  it('makes an object URL of the bytes with their type', async () => {
    const spy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:x');
    expect(D.pictureUrl({ type: 'image/png', bytes: bytes(1, 2) })).toBe('blob:x');
    const blob = spy.mock.calls[0][0];
    expect(blob.type).toBe('image/png');
    expect([...new Uint8Array(await blob.arrayBuffer())]).toEqual([1, 2]);
  });
  it('takes the bytes as a JPEG when no type is kept', () => {
    const spy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:y');
    D.pictureUrl({ bytes: bytes(1) });
    expect(spy.mock.calls[0][0].type).toBe('image/jpeg');
  });
  it('is empty without a picture or its bytes', () => {
    const spy = vi.spyOn(URL, 'createObjectURL');
    expect(D.pictureUrl(null)).toBe('');
    expect(D.pictureUrl(undefined)).toBe('');
    expect(D.pictureUrl({ type: 'image/png' })).toBe('');
    expect(spy).not.toHaveBeenCalled();
  });
});

describe('boardFile and readBoardFile', () => {
  const PNG = 'data:image/png;base64,iVBO';
  const about = { id: 'b1', name: 'Summer: "beach"/<day>|1?*', pageCount: 2, photoCount: 7, updatedAt: '2026-11-01', ignored: 'x' };
  const pictures = { cover: { type: 'image/png', bytes: bytes(0x89, 0x50, 0x4e) }, pages: [{ type: 'image/png', bytes: bytes(1) }, { bytes: bytes(2) }] };

  it('writes the board, its cover and pages as data URLs in a versioned file', async () => {
    const f = await D.boardFile(about, pictures);
    expect(f.name).toBe('Summer   beach day 1 (board).json'); // each run of characters files can't have is one space
    expect(f.type).toBe('application/json');
    expect(JSON.parse(await f.text())).toEqual({
      app: 'ref', kind: 'ref-board', version: 1, exportedAt: iso(NOW),
      board: { id: 'b1', name: about.name, pageCount: 2, photoCount: 7, updatedAt: '2026-11-01' },
      cover: 'data:image/png;base64,iVBO', pages: ['data:image/png;base64,AQ==', 'data:image/jpeg;base64,Ag=='],
    });
  });
  it('writes no cover when there is none, and names an unnamed board', async () => {
    const f = await D.boardFile({ id: 'b2' }, { pages: [] });
    expect(f.name).toBe('Mood board (board).json');
    const data = JSON.parse(await f.text());
    expect(data.cover).toBeNull();
    expect(data.pages).toEqual([]);
    expect((await D.boardFile({ name: ' /:: ' }, { pages: [] })).name).toBe('Mood board (board).json');
  });
  it('rejects when a picture cannot be read', async () => {
    FakeFileReader.failWith = new Error('gone');
    await expectError(D.boardFile(about, pictures), 'gone');
  });
  it('reads a board file back as the same board and pictures', async () => {
    const back = await D.readBoardFile(await D.boardFile(about, pictures));
    expect(back.board).toEqual({ id: 'b1', name: about.name, pageCount: 2, photoCount: 7 });
    expect(back.pictures.cover.type).toBe('image/png');
    expect([...new Uint8Array(back.pictures.cover.bytes)]).toEqual([0x89, 0x50, 0x4e]);
    expect(back.pictures.pages.map((p) => [p.type, [...new Uint8Array(p.bytes)]])).toEqual([['image/png', [1]], ['image/jpeg', [2]]]);
  });
  const file = (o) => new NodeFile([typeof o === 'string' ? o : JSON.stringify({ kind: 'ref-board', version: 1, pages: [PNG], ...o })], 'b.json');
  it('uses the first page as the cover without one, and fills in a bare board', async () => {
    const back = await D.readBoardFile(file({ board: { id: 7, name: '  ', photoCount: 'lots' }, cover: 'https://x/y.png' }));
    expect(back.board).toEqual({ id: null, name: 'Mood board', pageCount: 1, photoCount: 0 });
    expect(back.pictures.cover).toBe(back.pictures.pages[0]);
    const bare = await D.readBoardFile(file({}));
    expect(bare.board).toEqual({ id: null, name: 'Mood board', pageCount: 1, photoCount: 0 });
    expect((await D.readBoardFile(file({ board: { photoCount: '3' } }))).board.photoCount).toBe(3);
  });
  it('takes a picture whose data comes back without a type as a JPEG', async () => {
    const real = globalThis.fetch;
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (u) => { const b = await (await real(u)).blob(); return new Response(new Blob([await b.arrayBuffer()])); });
    const back = await D.readBoardFile(file({}));
    expect(back.pictures.pages[0].type).toBe('image/jpeg');
    expect(new Uint8Array(back.pictures.pages[0].bytes)).toEqual(new Uint8Array(Buffer.from('iVBO', 'base64')));
  });
  it('leaves out pages that are not pictures, and counts only the rest', async () => {
    const back = await D.readBoardFile(file({ pages: [1, null, 'data:text/plain;base64,AA==', 'x data:image/png;base64,AA==', PNG, 'data:image/gif;base64,R0lG'] }));
    expect(back.pictures.pages.map((p) => p.type)).toEqual(['image/png', 'image/gif']);
    expect(back.board.pageCount).toBe(2);
  });
  it("says a file that isn't JSON, or isn't a board, isn't a board from Ref", async () => {
    const msg = "That file isn't a board from Ref.";
    await expectError(D.readBoardFile(file('not json')), msg);
    await expectError(D.readBoardFile(file('null')), msg);
    await expectError(D.readBoardFile(file({ kind: 'ref-other' })), msg);
    await expectError(D.readBoardFile(file({ pages: 'p' })), msg);
  });
  it('says a board from a newer Ref needs this app updated', async () => {
    await expectError(D.readBoardFile(file({ version: 2 })), 'That board was made by a newer Ref. Update this app and try again.');
    await expect(D.readBoardFile(file({ version: 1 }))).resolves.toBeTruthy();
    await expect(D.readBoardFile(file({ version: undefined }))).resolves.toBeTruthy();
  });
  it('says a board without one picture in it has no pages', async () => {
    await expectError(D.readBoardFile(file({ pages: [] })), 'That board has no pages in it.');
    await expectError(D.readBoardFile(file({ pages: ['nope'] })), 'That board has no pages in it.');
  });
});
