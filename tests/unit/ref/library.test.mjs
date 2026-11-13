// ref/data/library.js: the notebook in memory (photos, folders, thumbnail and
// full-size picture addresses), folder sorting, color search and filter chips.
// db.js and photos.js are mocked: storage has its own tests (db.test.mjs).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const h = vi.hoisted(() => ({
  db: { listPhotos: vi.fn(), listFolders: vi.fn(), getThumbs: vi.fn(), moveThumbOff: vi.fn(), getFile: vi.fn() },
  remakeThumb: vi.fn(),
}));
vi.mock('../../../ref/data/db.js', () => h.db);
vi.mock('../../../ref/data/photos.js', () => ({ remakeThumb: h.remakeThumb }));

let L, made, created, revoked;
const realCreate = URL.createObjectURL, realRevoke = URL.revokeObjectURL;

beforeEach(async () => {
  vi.resetModules(); // the in-memory caches live in the module: start each test fresh
  for (const f of Object.values(h.db)) f.mockReset();
  h.remakeThumb.mockReset();
  h.db.listPhotos.mockResolvedValue([]);
  h.db.listFolders.mockResolvedValue([]);
  h.db.getThumbs.mockImplementation(async (ids) => new Map(ids.map((id) => [id, new Uint8Array([1, 2, 3])])));
  h.db.moveThumbOff.mockImplementation(async (p) => { const { thumb, ...rest } = p; return rest; });
  made = 0;
  created = URL.createObjectURL = vi.fn(() => `blob:url-${++made}`);
  revoked = URL.revokeObjectURL = vi.fn();
  localStorage.clear();
  L = await import('../../../ref/data/library.js');
});
afterEach(() => {
  URL.createObjectURL = realCreate;
  URL.revokeObjectURL = realRevoke;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const photo = (id, extra = {}) => ({ id, name: id, createdAt: '2026-01-01T00:00:00.000Z', folderIds: [], ...extra });
const loaded = async (photos, folders = []) => {
  h.db.listPhotos.mockResolvedValue(photos);
  h.db.listFolders.mockResolvedValue(folders);
  await L.refresh();
};
// The value a promise rejects with (fails the test if it resolves instead).
const errorOf = (p) => p.then(() => { throw new Error('expected a rejection'); }, (e) => e);

describe('lib', () => {
  it('starts empty before anything is loaded', () => {
    expect(L.lib).toEqual({ photos: [], folders: [] });
  });
});

describe('refresh', () => {
  it('loads the photos and folders into memory', async () => {
    const photos = [photo('a'), photo('b')];
    await loaded(photos, [{ id: 'f1', name: 'Beach' }]);
    expect(L.lib.photos).toBe(photos);
    expect(L.lib.folders).toEqual([{ id: 'f1', name: 'Beach' }]);
  });
  it('sorts folders by name, ignoring case and accents, keeping ties in order', async () => {
    await loaded([], [{ id: 1, name: 'beta' }, { id: 2, name: 'Alpha' }, { id: 3, name: 'alpha' }, { id: 4, name: 'Gamma' }, { id: 5, name: 'Ålpha' }]);
    expect(L.lib.folders.map((f) => f.id)).toEqual([2, 3, 5, 1, 4]);
  });
  it('works with an empty notebook', async () => {
    await loaded([], []);
    expect(L.lib.photos).toEqual([]);
    expect(L.lib.folders).toEqual([]);
    expect(h.db.getThumbs).not.toHaveBeenCalled();
  });
  it('makes a picture address for each thumbnail, once', async () => {
    const photos = [photo('a'), photo('b')];
    await loaded(photos);
    expect(h.db.getThumbs).toHaveBeenCalledWith(['a', 'b']);
    expect(created).toHaveBeenCalledTimes(2);
    const blob = created.mock.calls[0][0];
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('image/jpeg');
    expect(blob.size).toBe(3);
    expect(L.thumbUrl(photos[0])).toBe('blob:url-1');
    expect(L.thumbUrl(photos[1])).toBe('blob:url-2');
    await L.refresh();
    expect(h.db.getThumbs).toHaveBeenCalledTimes(1);
    expect(created).toHaveBeenCalledTimes(2);
  });
  it('only asks for thumbnails it does not have yet', async () => {
    await loaded([photo('a')]);
    await loaded([photo('a'), photo('b')]);
    expect(h.db.getThumbs).toHaveBeenLastCalledWith(['b']);
  });
  it('frees the thumbnails of photos that are gone', async () => {
    await loaded([photo('a'), photo('b')]);
    await loaded([photo('b')]);
    expect(revoked).toHaveBeenCalledTimes(1);
    expect(revoked).toHaveBeenCalledWith('blob:url-1');
    expect(L.thumbUrl(photo('a'))).toBe('');
    expect(L.thumbUrl(photo('b'))).toBe('blob:url-2');
  });
  it('leaves a photo with no stored thumbnail blank and asks again next time', async () => {
    h.db.getThumbs.mockResolvedValue(new Map());
    await loaded([photo('a')]);
    expect(L.thumbUrl(photo('a'))).toBe('');
    await L.refresh();
    expect(h.db.getThumbs).toHaveBeenCalledTimes(2);
    expect(h.db.getThumbs).toHaveBeenLastCalledWith(['a']);
    expect(revoked).not.toHaveBeenCalled();
  });
  it('fails when storage fails', async () => {
    const err = new Error('blocked');
    h.db.listPhotos.mockRejectedValue(err);
    expect(await errorOf(L.refresh())).toBe(err);
  });
});

describe('refresh: photos from the first version', () => {
  it('remakes the thumb from the big picture and moves it off the record', async () => {
    const bytes = new ArrayBuffer(4);
    h.remakeThumb.mockResolvedValue(bytes);
    const old = photo('old', { thumb: { arrayBuffer: vi.fn() } });
    await loaded([old, photo('new')]);
    expect(h.remakeThumb).toHaveBeenCalledTimes(1);
    expect(h.remakeThumb).toHaveBeenCalledWith('old');
    expect(h.db.moveThumbOff).toHaveBeenCalledWith(old, bytes);
    expect(old.thumb.arrayBuffer).not.toHaveBeenCalled();
    expect(L.lib.photos[0]).toEqual(photo('old'));
    expect('thumb' in L.lib.photos[0]).toBe(false);
  });
  it('falls back to the old thumb when remaking fails', async () => {
    const own = new ArrayBuffer(2);
    h.remakeThumb.mockRejectedValue(new Error('no file'));
    const old = photo('old', { thumb: { arrayBuffer: vi.fn().mockResolvedValue(own) } });
    await loaded([old]);
    expect(h.db.moveThumbOff).toHaveBeenCalledWith(old, own);
  });
  it('falls back to the old thumb when remaking gives nothing', async () => {
    const own = new ArrayBuffer(2);
    h.remakeThumb.mockResolvedValue(null);
    const old = photo('old', { thumb: { arrayBuffer: vi.fn().mockResolvedValue(own) } });
    await loaded([old]);
    expect(h.db.moveThumbOff).toHaveBeenCalledWith(old, own);
  });
  it('leaves the photo as it is when neither works', async () => {
    h.remakeThumb.mockRejectedValue(new Error('no file'));
    const old = photo('old', { thumb: { arrayBuffer: vi.fn().mockRejectedValue(new Error('gone')) } });
    await loaded([old]);
    expect(h.db.moveThumbOff).not.toHaveBeenCalled();
    expect(L.lib.photos[0]).toBe(old);
  });
  it('copes with a thumb field that is empty', async () => {
    h.remakeThumb.mockResolvedValue(undefined);
    const old = photo('old', { thumb: null });
    await loaded([old]);
    expect(h.db.moveThumbOff).not.toHaveBeenCalled();
    expect(L.lib.photos[0]).toBe(old);
  });
  it('leaves newer photos alone', async () => {
    await loaded([photo('a'), photo('b')]);
    expect(h.remakeThumb).not.toHaveBeenCalled();
    expect(h.db.moveThumbOff).not.toHaveBeenCalled();
  });
  it('moves every old photo, in place', async () => {
    h.remakeThumb.mockImplementation(async (id) => `bytes-${id}`);
    await loaded([photo('x', { thumb: 1 }), photo('y'), photo('z', { thumb: 2 })]);
    expect(h.db.moveThumbOff.mock.calls.map((c) => c[1])).toEqual(['bytes-x', 'bytes-z']);
    expect(L.lib.photos.map((p) => p.id)).toEqual(['x', 'y', 'z']);
    expect(L.lib.photos.some((p) => 'thumb' in p)).toBe(false);
  });
});

describe('photoById and thumbUrl', () => {
  it('finds a loaded photo by id', async () => {
    const b = photo('b');
    await loaded([photo('a'), b]);
    expect(L.photoById('b')).toBe(b);
  });
  it('is undefined for an unknown id or before loading', async () => {
    expect(L.photoById('a')).toBeUndefined();
    await loaded([photo('a')]);
    expect(L.photoById('zzz')).toBeUndefined();
    expect(L.photoById(undefined)).toBeUndefined();
  });
  it('thumbUrl is empty for no photo or one without a thumbnail', async () => {
    expect(L.thumbUrl(null)).toBe('');
    expect(L.thumbUrl(undefined)).toBe('');
    expect(L.thumbUrl(photo('never-loaded'))).toBe('');
  });
});

describe('fullUrl', () => {
  const blob = new Blob(['big']);
  it('opens the big picture once and reuses its address', async () => {
    h.db.getFile.mockResolvedValue(blob);
    expect(await L.fullUrl('a')).toBe('blob:url-1');
    expect(await L.fullUrl('a')).toBe('blob:url-1');
    expect(h.db.getFile).toHaveBeenCalledTimes(1);
    expect(h.db.getFile).toHaveBeenCalledWith('a');
    expect(created).toHaveBeenCalledWith(blob);
  });
  it('is empty when the picture is missing, and asks again next time', async () => {
    h.db.getFile.mockResolvedValue(null);
    expect(await L.fullUrl('a')).toBe('');
    expect(await L.fullUrl('a')).toBe('');
    expect(h.db.getFile).toHaveBeenCalledTimes(2);
    expect(created).not.toHaveBeenCalled();
  });
  it('keeps 30 pictures open without freeing any', async () => {
    vi.useFakeTimers();
    h.db.getFile.mockResolvedValue(blob);
    for (let i = 0; i < 30; i++) await L.fullUrl(`p${i}`);
    vi.advanceTimersByTime(60000);
    expect(revoked).not.toHaveBeenCalled();
  });
  it('frees the least recently used picture, five seconds later, past 30', async () => {
    vi.useFakeTimers();
    h.db.getFile.mockResolvedValue(blob);
    for (let i = 0; i < 31; i++) await L.fullUrl(`p${i}`);
    vi.advanceTimersByTime(4999);
    expect(revoked).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(revoked).toHaveBeenCalledTimes(1);
    expect(revoked).toHaveBeenCalledWith('blob:url-1');
    await L.fullUrl('p0');
    expect(h.db.getFile).toHaveBeenCalledTimes(32);
  });
  it('counts looking at a picture again as recent use', async () => {
    vi.useFakeTimers();
    h.db.getFile.mockResolvedValue(blob);
    for (let i = 0; i < 30; i++) await L.fullUrl(`p${i}`);
    expect(await L.fullUrl('p0')).toBe('blob:url-1');
    await L.fullUrl('p30');
    vi.advanceTimersByTime(5000);
    expect(revoked).toHaveBeenCalledWith('blob:url-2');
    expect(revoked).not.toHaveBeenCalledWith('blob:url-1');
    expect(h.db.getFile).toHaveBeenCalledTimes(31);
  });
  it('fails when storage fails', async () => {
    const err = new Error('closed');
    h.db.getFile.mockRejectedValue(err);
    expect(await errorOf(L.fullUrl('a'))).toBe(err);
  });
});

describe('special folders', () => {
  it('are Incoming, Favorites and All photos', () => {
    expect(L.SPECIAL).toEqual([{ id: 'incoming', name: 'Incoming' }, { id: 'favorites', name: 'Favorites' }, { id: 'all', name: 'All photos' }]);
  });
  it('isSpecial is true only for those ids', () => {
    expect(['incoming', 'favorites', 'all'].map(L.isSpecial)).toEqual([true, true, true]);
    expect(L.isSpecial('f1')).toBe(false);
    expect(L.isSpecial(undefined)).toBe(false);
    expect(L.isSpecial('Incoming')).toBe(false);
  });
  it('folderById finds special folders and your folders', async () => {
    await loaded([], [{ id: 'f1', name: 'Beach' }]);
    expect(L.folderById('favorites')).toBe(L.SPECIAL[1]);
    expect(L.folderById('f1')).toEqual({ id: 'f1', name: 'Beach' });
  });
  it('folderById is undefined for an unknown id', async () => {
    await loaded([], [{ id: 'f1', name: 'Beach' }]);
    expect(L.folderById('f2')).toBeUndefined();
    expect(L.folderById(undefined)).toBeUndefined();
  });
});

describe('photosIn', () => {
  const a = photo('a', { folderIds: ['f1'], favorite: true });
  const b = photo('b');
  const c = photo('c', { folderIds: ['f1', 'f2'] });
  const d = photo('d', { favorite: true });
  beforeEach(() => { L.lib.photos = [a, b, c, d]; });

  it('"all" is every photo', () => {
    expect(L.photosIn('all')).toBe(L.lib.photos);
  });
  it('"incoming" is photos in no folder', () => {
    expect(L.photosIn('incoming')).toEqual([b, d]);
  });
  it('"favorites" is favorited photos', () => {
    expect(L.photosIn('favorites')).toEqual([a, d]);
  });
  it('a folder is the photos filed in it', () => {
    expect(L.photosIn('f1')).toEqual([a, c]);
    expect(L.photosIn('f2')).toEqual([c]);
  });
  it('an unknown folder is empty', () => {
    expect(L.photosIn('nope')).toEqual([]);
  });
  it('everything is empty with no photos', () => {
    L.lib.photos = [];
    for (const id of ['all', 'incoming', 'favorites', 'f1']) expect(L.photosIn(id)).toEqual([]);
  });
});

describe('SORTS and sortList', () => {
  const p = (id, createdAt, extra = {}) => ({ id, name: id, createdAt, folderIds: [], ...extra });
  const x = p('x', '2026-01-02T00:00:00Z'), y = p('y', '2026-03-01T00:00:00Z'), z = p('z', '2025-12-31T23:59:59Z');
  const order = (list) => list.map((q) => q.id);

  it('offers six sorts with labels', () => {
    expect(L.SORTS.map((s) => s.key)).toEqual(['newest', 'oldest', 'az', 'za', 'fav', 'color']);
    for (const s of L.SORTS) expect(s.label.length).toBeGreaterThan(0);
  });
  it('newest first by default and for unknown keys', () => {
    expect(order(L.sortList([x, y, z], 'newest'))).toEqual(['y', 'x', 'z']);
    expect(order(L.sortList([x, y, z]))).toEqual(['y', 'x', 'z']);
    expect(order(L.sortList([x, y, z], 'nope'))).toEqual(['y', 'x', 'z']);
  });
  it('newest first ignores hue', () => {
    const list = [p('old-red', '2025-01-01T00:00:00Z', { hue: 0 }), p('new-blue', '2026-06-01T00:00:00Z', { hue: 220 })];
    expect(order(L.sortList(list, 'newest'))).toEqual(['new-blue', 'old-red']);
  });
  it('oldest first', () => {
    expect(order(L.sortList([x, y, z], 'oldest'))).toEqual(['z', 'x', 'y']);
  });
  it('names A to Z, ignoring case and reading numbers as numbers', () => {
    const list = ['img10', 'Img2', 'apple', 'Banana'].map((n) => p(n, '2026-01-01T00:00:00Z'));
    expect(order(L.sortList(list, 'az'))).toEqual(['apple', 'Banana', 'Img2', 'img10']);
  });
  it('names Z to A', () => {
    const list = ['img10', 'Img2', 'apple', 'Banana'].map((n) => p(n, '2026-01-01T00:00:00Z'));
    expect(order(L.sortList(list, 'za'))).toEqual(['img10', 'Img2', 'Banana', 'apple']);
  });
  it('favorites first, newest first within each group', () => {
    // new photos are saved with favorite: false (photos.js), so the field is always a boolean
    const list = [p('a', '2026-01-01T00:00:00Z', { favorite: false }), p('b', '2026-02-01T00:00:00Z', { favorite: true }), p('c', '2026-03-01T00:00:00Z', { favorite: false }), p('d', '2025-01-01T00:00:00Z', { favorite: true })];
    expect(order(L.sortList(list, 'fav'))).toEqual(['b', 'd', 'c', 'a']);
  });
  it('by color: by hue, photos with no hue last, newest first on a tie', () => {
    const list = [
      p('none', '2026-05-01T00:00:00Z', { hue: null }),
      p('blue', '2026-01-01T00:00:00Z', { hue: 220 }),
      p('red', '2026-01-01T00:00:00Z', { hue: 0 }),
      p('unset', '2026-06-01T00:00:00Z'),
      p('blue-new', '2026-02-01T00:00:00Z', { hue: 220 }),
      p('far', '2026-01-01T00:00:00Z', { hue: 999 }),
    ];
    expect(order(L.sortList(list, 'color'))).toEqual(['red', 'blue-new', 'blue', 'far', 'unset', 'none']);
  });
  it('puts a hue past the "no hue" rank after photos with none', () => {
    const list = [p('huge', '2026-01-01T00:00:00Z', { hue: 1001 }), p('none', '2026-01-01T00:00:00Z', { hue: null })];
    expect(order(L.sortList(list, 'color'))).toEqual(['none', 'huge']);
  });
  it('returns a new list and leaves the given one alone', () => {
    const list = [x, y, z];
    const out = L.sortList(list, 'az');
    expect(out).not.toBe(list);
    expect(order(list)).toEqual(['x', 'y', 'z']);
  });
  it('handles empty and one-photo lists', () => {
    for (const k of ['newest', 'oldest', 'az', 'za', 'fav', 'color']) {
      expect(L.sortList([], k)).toEqual([]);
      expect(L.sortList([x], k)).toEqual([x]);
    }
  });
});

describe('sortOf and setSort', () => {
  const KEY = 'ref-notebook-sort';
  it('is newest for a folder with no sort chosen', () => {
    expect(L.sortOf('f1')).toBe('newest');
  });
  it('remembers each folder\'s own sort', () => {
    L.setSort('f1', 'az');
    L.setSort('incoming', 'color');
    expect(L.sortOf('f1')).toBe('az');
    expect(L.sortOf('incoming')).toBe('color');
    expect(L.sortOf('f2')).toBe('newest');
    expect(JSON.parse(localStorage.getItem(KEY))).toEqual({ f1: 'az', incoming: 'color' });
  });
  it('choosing newest again forgets the folder\'s sort', () => {
    L.setSort('f1', 'az');
    L.setSort('f2', 'za');
    L.setSort('f1', 'newest');
    expect(JSON.parse(localStorage.getItem(KEY))).toEqual({ f2: 'za' });
    expect(L.sortOf('f1')).toBe('newest');
  });
  it('ignores a broken or empty saved value', () => {
    localStorage.setItem(KEY, '{oops');
    expect(L.sortOf('f1')).toBe('newest');
    localStorage.setItem(KEY, 'null');
    expect(L.sortOf('f1')).toBe('newest');
    L.setSort('f1', 'oldest');
    expect(L.sortOf('f1')).toBe('oldest');
  });
  it('does not throw when storage is full', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
    expect(() => L.setSort('f1', 'az')).not.toThrow();
    expect(L.sortOf('f1')).toBe('newest');
  });
});

describe('photosOfColor', () => {
  const withPalette = (id, palette) => photo(id, { palette });
  const ids = (list) => list.map((q) => q.id);

  it('finds photos with that color and skips others', () => {
    L.lib.photos = [withPalette('red', [{ hex: '#ff0000', w: 0.5 }]), withPalette('blue', [{ hex: '#0000ff', w: 0.5 }])];
    expect(ids(L.photosOfColor('#ff0000'))).toEqual(['red']);
  });
  it('puts the closest color first', () => {
    L.lib.photos = [withPalette('near', [{ hex: '#ee1010', w: 0.5 }]), withPalette('exact', [{ hex: '#ff0000', w: 0.5 }])];
    expect(ids(L.photosOfColor('#ff0000'))).toEqual(['exact', 'near']);
  });
  it('orders several matches from closest to furthest', () => {
    // CIE76 distances from #3366cc: #5566cc 6.3, #5577dd 7.5, #2255aa 11.4, #4d7fd9 13.1
    const at = (id, hex) => withPalette(id, [{ hex, w: 0.05 }]);
    L.lib.photos = [at('d', '#4d7fd9'), at('b', '#5577dd'), at('c', '#2255aa'), at('a', '#5566cc')];
    expect(ids(L.photosOfColor('#3366cc'))).toEqual(['a', 'b', 'c', 'd']);
  });
  it('puts the photo with more of the color first', () => {
    L.lib.photos = [withPalette('some', [{ hex: '#00ff00', w: 0.2 }]), withPalette('lots', [{ hex: '#00ff00', w: 0.9 }])];
    expect(ids(L.photosOfColor('#00ff00'))).toEqual(['lots', 'some']);
  });
  it('uses the best match in a photo\'s palette', () => {
    L.lib.photos = [withPalette('mixed', [{ hex: '#0000ff', w: 0.8 }, { hex: '#ffff00', w: 0.1 }])];
    expect(ids(L.photosOfColor('#ffff00'))).toEqual(['mixed']);
  });
  it('ignores colors with under 5% of the picture, but counts exactly 5%', () => {
    L.lib.photos = [withPalette('tiny', [{ hex: '#ff00ff', w: 0.049 }]), withPalette('five', [{ hex: '#ff00ff', w: 0.05 }])];
    expect(ids(L.photosOfColor('#ff00ff'))).toEqual(['five']);
  });
  it('skips photos with no palette', () => {
    L.lib.photos = [photo('bare'), withPalette('empty', [])];
    expect(L.photosOfColor('#000000')).toEqual([]);
  });
  it('is empty with no photos', () => {
    L.lib.photos = [];
    expect(L.photosOfColor('#123456')).toEqual([]);
  });
  // The cut-off is a CIE Lab distance of 16, less 10 x the color's share. Each pair
  // below is a known distance apart (CIE76, sRGB D65); the shares put the photo
  // just inside (15.98) and just outside (16.02) the cut-off.
  it.each([
    ['#010101', '#303030', 19.5914, 'near-black grays'],
    ['#cc2244', '#bb4466', 23.7117, 'two crimsons'],
    ['#3366cc', '#4477bb', 22.5915, 'two blues'],
    ['#20c060', '#40b070', 19.6550, 'two greens'],
  ])('measures %s against %s as about %f apart (%s)', (want, other, dist) => {
    const share = (dist - 16) / 10;
    L.lib.photos = [withPalette('in', [{ hex: other, w: share + 0.002 }]), withPalette('out', [{ hex: other, w: share - 0.002 }])];
    expect(ids(L.photosOfColor(want))).toEqual(['in']);
  });
  it('leaves out a photo exactly on the cut-off', () => {
    // this share makes distance - 10 x share come out at exactly 16
    L.lib.photos = [withPalette('edge', [{ hex: '#bb4466', w: 0.7711650440162913 }])];
    expect(L.photosOfColor('#cc2244')).toEqual([]);
  });
});

describe('matches (the photo filter keys)', () => {
  const swatch = (hex, w = 0.5) => [{ hex, w }];
  it('matches everything with no filters on', () => {
    expect(L.matches(photo('a'), [])).toBe(true);
  });
  it('matches what is in the photo (tags)', () => {
    const p = photo('a', { tags: ['dog', 'park'] });
    expect(L.matches(p, ['t:dog'])).toBe(true);
    expect(L.matches(p, ['t:dog', 't:park'])).toBe(true);
    expect(L.matches(p, ['t:dog', 't:cat'])).toBe(false);
  });
  it('matches the folders a photo is in', () => {
    const p = photo('a', { folderIds: ['f1', 'f2'] });
    expect(L.matches(p, ['f:f2'])).toBe(true);
    expect(L.matches(p, ['f:f3'])).toBe(false);
  });
  it('a photo with no tags, palette or tone matches no key', () => {
    const p = photo('a');
    for (const k of ['t:', 'c:black', 'm:dark', 'm:bright', 'm:warm']) expect(L.matches(p, [k])).toBe(false);
  });
  it.each([
    ['#000000', 'black'], ['#202020', 'black'], ['#ffffff', 'white'], ['#f0f0f0', 'white'],
    ['#808080', 'gray'], ['#8a8090', 'gray'], ['#ff0000', 'red'], ['#ffaaaa', 'pink'],
    ['#8b4513', 'brown'], ['#ff8000', 'orange'], ['#ffff00', 'yellow'], ['#00ff00', 'green'],
    ['#00ffff', 'blue'], ['#0000ff', 'blue'], ['#8000ff', 'purple'], ['#ff00ff', 'pink'],
    ['#ff0080', 'pink'], ['#ff0020', 'red'], ['#ffd700', 'yellow'], ['#f0f4f0', 'white'],
    // exactly on a boundary: lightness 0.9, saturation 0.5, hue 345, 68, 165, 255 and 300
    ['#dcdcef', 'blue'], ['#e4e4f6', 'blue'], ['#281c1f', 'red'], ['#27291a', 'green'],
    ['#004433', 'blue'], ['#110044', 'purple'], ['#271c27', 'pink'],
    // pale or dark colors, and hues worked out from the green and blue channels
    ['#e0d0d0', 'pink'], ['#000080', 'blue'], ['#800000', 'red'], ['#006400', 'green'],
    ['#33ffdd', 'blue'], ['#33ff99', 'green'], ['#6a33ff', 'purple'], ['#3311ff', 'blue'],
  ])('names %s as %s', (hex, name) => {
    const p = photo(hex, { palette: swatch(hex) });
    expect(L.matches(p, [`c:${name}`])).toBe(true);
  });
  it('gives each color only one name', () => {
    const p = photo('a', { palette: swatch('#ff8000') });
    for (const n of ['red', 'yellow', 'brown', 'pink']) expect(L.matches(p, [`c:${n}`])).toBe(false);
  });
  it('names a color only when it is at least 14% of the picture', () => {
    expect(L.matches(photo('a', { palette: swatch('#0000ff', 0.14) }), ['c:blue'])).toBe(true);
    expect(L.matches(photo('b', { palette: swatch('#0000ff', 0.139) }), ['c:blue'])).toBe(false);
  });
  it('matches the mood of the light', () => {
    expect(L.matches(photo('a', { tone: 'warm' }), ['m:warm'])).toBe(true);
    expect(L.matches(photo('b', { tone: 'cool' }), ['m:cool'])).toBe(true);
    expect(L.matches(photo('c', { tone: 'neutral' }), ['m:b&w'])).toBe(true);
    expect(L.matches(photo('d', { tone: 'warm' }), ['m:cool'])).toBe(false);
    expect(L.matches(photo('e', { tone: 'other' }), ['m:other'])).toBe(false);
  });
  it('calls a photo dark when its weighted lightness is under 24%', () => {
    const p = (white) => photo('p', { palette: [{ hex: '#000000', w: 1 - white }, { hex: '#ffffff', w: white }] });
    expect(L.matches(p(0.23), ['m:dark'])).toBe(true);
    expect(L.matches(p(0.24), ['m:dark'])).toBe(false);
  });
  it('calls a photo bright when its weighted lightness is over 68%', () => {
    const p = (white) => photo('p', { palette: [{ hex: '#000000', w: 1 - white }, { hex: '#ffffff', w: white }] });
    expect(L.matches(p(0.69), ['m:bright'])).toBe(true);
    expect(L.matches(p(0.68), ['m:bright'])).toBe(false);
  });
  it('judges the light by the colors\' average, whatever their shares add up to', () => {
    expect(L.matches(photo('w', { palette: [{ hex: '#ffffff', w: 0.5 }] }), ['m:bright'])).toBe(true);
    expect(L.matches(photo('k', { palette: [{ hex: '#000000', w: 3 }] }), ['m:dark'])).toBe(true);
  });
  it('weighs lightness by each color\'s share', () => {
    const p = photo('p', { palette: [{ hex: '#000000', w: 0.1 }, { hex: '#ffffff', w: 0.9 }] });
    expect(L.matches(p, ['m:bright'])).toBe(true);
    expect(L.matches(p, ['m:dark'])).toBe(false);
  });
  it('works the keys out once per photo', () => {
    const p = photo('a', { tags: ['dog'] });
    expect(L.matches(p, ['t:dog'])).toBe(true);
    p.tags.push('cat');
    expect(L.matches(p, ['t:cat'])).toBe(false);
  });
  it('throws for a photo with no folder list', () => {
    expect(() => L.matches({ id: 'bad' }, ['t:x'])).toThrow(TypeError);
  });
});

describe('chipsFor', () => {
  const p1 = photo('p1', { tags: ['dog', 'park'], folderIds: ['f1'], palette: [{ hex: '#ff0000', w: 0.5 }], tone: 'warm' });
  const p2 = photo('p2', { tags: ['dog'], folderIds: ['f1', 'f2'], tone: 'cool' });
  const p3 = photo('p3', { tags: ['cat'], folderIds: ['gone'], palette: [{ hex: '#0000ff', w: 0.9 }] });
  beforeEach(() => { L.lib.folders = [{ id: 'f1', name: 'Portraits' }, { id: 'f2', name: 'Beach' }]; });
  const keys = (chips) => chips.map((c) => c.key);

  it('offers every filter: what, folder, color, mood; most photos first, then A to Z', () => {
    expect(L.chipsFor([p1, p2, p3], [], undefined)).toEqual([
      { key: 't:dog', kind: 't', label: 'Dog' },
      { key: 't:cat', kind: 't', label: 'Cat' },
      { key: 't:park', kind: 't', label: 'Park' },
      { key: 'f:f1', kind: 'f', label: 'Portraits' },
      { key: 'f:f2', kind: 'f', label: 'Beach' },
      { key: 'c:blue', kind: 'c', label: 'Blue' },
      { key: 'c:red', kind: 'c', label: 'Red' },
      { key: 'm:cool', kind: 'm', label: 'Cool' },
      { key: 'm:warm', kind: 'm', label: 'Warm' },
    ]);
  });
  it('leaves out the folder you are in and folders that no longer exist', () => {
    expect(keys(L.chipsFor([p1, p2, p3], [], 'f1'))).toEqual(['t:dog', 't:cat', 't:park', 'f:f2', 'c:blue', 'c:red', 'm:cool', 'm:warm']);
  });
  it('with a filter on, offers only filters that still leave photos', () => {
    expect(keys(L.chipsFor([p1, p2, p3], ['t:dog'], undefined))).toEqual(['t:dog', 't:park', 'f:f1', 'f:f2', 'c:red', 'm:cool', 'm:warm']);
  });
  it('keeps filters that are on even when nothing matches them all', () => {
    expect(keys(L.chipsFor([p1, p2, p3], ['t:dog', 't:cat'], undefined))).toEqual(['t:dog', 't:cat']);
  });
  it('labels black-and-white and dark photos', () => {
    const bw = photo('bw', { tone: 'neutral', palette: [{ hex: '#101010', w: 1 }] });
    expect(L.chipsFor([bw], [], undefined)).toEqual([
      { key: 'c:black', kind: 'c', label: 'Black' },
      { key: 'm:b&w', kind: 'm', label: 'B&W' },
      { key: 'm:dark', kind: 'm', label: 'Dark' },
    ]);
  });
  it('is empty for no photos', () => {
    expect(L.chipsFor([], [], 'f1')).toEqual([]);
  });
  it('keeps a tag as written after its first letter', () => {
    const p = photo('p', { tags: ['red carpet', 'iPhone'] });
    expect(L.chipsFor([p], [], undefined).map((c) => c.label)).toEqual(['IPhone', 'Red carpet']);
  });
});
