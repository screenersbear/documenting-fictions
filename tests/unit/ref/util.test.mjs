// ref/js/util.js and its two byte-for-byte copies (overthoughts, contact-sheet):
// ids, times, escaping, file names, timers, downloads, canvas export, image
// loading and device checks. One describe block runs over all three copies.
import { describe, it, expect, vi, afterEach } from 'vitest';
import * as refUtil from '../../../ref/js/util.js';
import * as overthoughtsUtil from '../../../overthoughts/components/util.js';
import * as contactSheetUtil from '../../../contact-sheet/js/util.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// A fake crypto without randomUUID, filling bytes from `fill`.
const cryptoWithout = (fill) => ({ getRandomValues: (arr) => { for (let i = 0; i < arr.length; i++) arr[i] = fill(i); return arr; } });

// A fake canvas whose toDataURL hands back `url` (or throws `err`).
const canvasGiving = (url, err) => ({ toDataURL: vi.fn(() => { if (err) throw err; return url; }) });

const bytesOf = (blob) => new Promise((resolve) => {
  const r = new FileReader();
  r.onload = () => resolve(new Uint8Array(r.result));
  r.readAsArrayBuffer(blob);
});

// The value a promise rejects with (fails the test if it resolves instead).
const errorOf = (p) => p.then(() => { throw new Error('expected a rejection'); }, (e) => e);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe.each([
  ['ref/js/util.js', refUtil],
  ['overthoughts/components/util.js', overthoughtsUtil],
  ['contact-sheet/js/util.js', contactSheetUtil],
])('%s', (_name, u) => {
  describe('uuid', () => {
    it('uses crypto.randomUUID when the browser has it', () => {
      const spy = vi.spyOn(crypto, 'randomUUID').mockReturnValue('11111111-2222-4333-8444-555555555555');
      expect(u.uuid()).toBe('11111111-2222-4333-8444-555555555555');
      expect(spy).toHaveBeenCalledTimes(1);
    });
    it('makes a different version 4 id each time', () => {
      const a = u.uuid(), b = u.uuid();
      expect(a).toMatch(UUID_RE);
      expect(b).toMatch(UUID_RE);
      expect(a).not.toBe(b);
    });
    it('builds the id from random bytes when randomUUID is missing', () => {
      vi.stubGlobal('crypto', cryptoWithout((i) => i));
      // bytes 00..0f; byte 6 gets the version (4), byte 8 the variant (10xx)
      expect(u.uuid()).toBe('00010203-0405-4607-8809-0a0b0c0d0e0f');
    });
    it('sets the version and variant bits over all-ones bytes', () => {
      vi.stubGlobal('crypto', cryptoWithout(() => 0xff));
      expect(u.uuid()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
    });
    it('sets the version and variant bits over all-zero bytes', () => {
      vi.stubGlobal('crypto', cryptoWithout(() => 0));
      expect(u.uuid()).toBe('00000000-0000-4000-8000-000000000000');
    });
    it('asks for exactly 16 random bytes', () => {
      const getRandomValues = vi.fn((arr) => arr);
      vi.stubGlobal('crypto', { getRandomValues });
      u.uuid();
      expect(getRandomValues.mock.calls[0][0]).toBeInstanceOf(Uint8Array);
      expect(getRandomValues.mock.calls[0][0]).toHaveLength(16);
    });
  });

  describe('nowISO', () => {
    it('returns the current time as an ISO string', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-12T09:30:15.250Z'));
      expect(u.nowISO()).toBe('2026-11-12T09:30:15.250Z');
    });
    it('follows the clock across midnight and a new year', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-12-31T23:59:59.999Z'));
      expect(u.nowISO()).toBe('2026-12-31T23:59:59.999Z');
      vi.setSystemTime(new Date('2027-01-01T00:00:00.000Z'));
      expect(u.nowISO()).toBe('2027-01-01T00:00:00.000Z');
    });
    it('is always a full UTC timestamp', () => {
      expect(u.nowISO()).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    });
  });

  describe('esc', () => {
    it('escapes all five HTML characters', () => {
      expect(u.esc(`<a href="x" title='y'>Tom & Jerry</a>`)).toBe(
        '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;Tom &amp; Jerry&lt;/a&gt;',
      );
    });
    it('escapes every occurrence, not just the first', () => {
      expect(u.esc('&&<<>>""\'\'')).toBe('&amp;&amp;&lt;&lt;&gt;&gt;&quot;&quot;&#39;&#39;');
    });
    it('escapes an ampersand before the others so entities are not doubled wrongly', () => {
      expect(u.esc('&lt;')).toBe('&amp;lt;');
    });
    it('leaves plain text alone', () => {
      expect(u.esc('Beach day 2026')).toBe('Beach day 2026');
    });
    it('turns null and undefined into an empty string', () => {
      expect(u.esc(null)).toBe('');
      expect(u.esc(undefined)).toBe('');
      expect(u.esc()).toBe('');
    });
    it('keeps falsy values that are not null or undefined', () => {
      expect(u.esc(0)).toBe('0');
      expect(u.esc(false)).toBe('false');
      expect(u.esc('')).toBe('');
    });
    it('turns numbers and objects into text', () => {
      expect(u.esc(42)).toBe('42');
      expect(u.esc({ toString: () => '<b>' })).toBe('&lt;b&gt;');
    });
  });

  describe('clamp', () => {
    it('keeps a value inside the range', () => {
      expect(u.clamp(5, 0, 10)).toBe(5);
    });
    it('raises a value below the range to the low end', () => {
      expect(u.clamp(-3, 0, 10)).toBe(0);
    });
    it('lowers a value above the range to the high end', () => {
      expect(u.clamp(99, 0, 10)).toBe(10);
    });
    it('returns the ends themselves at the edges', () => {
      expect(u.clamp(0, 0, 10)).toBe(0);
      expect(u.clamp(10, 0, 10)).toBe(10);
    });
    it('works when low and high are the same', () => {
      expect(u.clamp(7, 3, 3)).toBe(3);
    });
    it('passes NaN through', () => {
      expect(u.clamp(NaN, 0, 10)).toBeNaN();
    });
  });

  describe('clone', () => {
    it('makes a deep copy that does not share objects', () => {
      const src = { a: 1, list: [{ b: 2 }], nested: { c: 'x' } };
      const out = u.clone(src);
      expect(out).toEqual(src);
      expect(out).not.toBe(src);
      expect(out.list).not.toBe(src.list);
      out.list[0].b = 9;
      expect(src.list[0].b).toBe(2);
    });
    it('copies arrays and plain values', () => {
      expect(u.clone([1, 'a', null])).toEqual([1, 'a', null]);
      expect(u.clone('text')).toBe('text');
      expect(u.clone(0)).toBe(0);
    });
    it('drops functions and undefined and turns dates into strings, like JSON', () => {
      const out = u.clone({ f: () => 1, u: undefined, d: new Date('2026-01-02T03:04:05.000Z') });
      expect(out).toEqual({ d: '2026-01-02T03:04:05.000Z' });
    });
    it('throws on undefined (not JSON)', () => {
      expect(() => u.clone(undefined)).toThrow();
    });
  });

  describe('shortDate', () => {
    const fmt = (d, opts) => d.toLocaleDateString(undefined, opts);
    it('leaves the year off for a date this year', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 10, 12, 12));
      const d = new Date(2026, 9, 30, 12);
      expect(u.shortDate(d.toISOString())).toBe(fmt(d, { month: 'short', day: 'numeric' }));
      expect(u.shortDate(d.toISOString())).not.toContain('2026');
    });
    it('adds the year for a date in another year', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2026, 10, 12, 12));
      const d = new Date(2025, 9, 30, 12);
      expect(u.shortDate(d.toISOString())).toBe(fmt(d, { month: 'short', day: 'numeric', year: 'numeric' }));
      expect(u.shortDate(d.toISOString())).toContain('2025');
    });
    it('treats new year\'s eve as last year once the clock passes midnight', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date(2027, 0, 1, 0, 0, 1));
      const d = new Date(2026, 11, 31, 23, 59);
      expect(u.shortDate(d.toISOString())).toContain('2026');
      vi.setSystemTime(new Date(2026, 11, 31, 23, 59, 59));
      expect(u.shortDate(d.toISOString())).not.toContain('2026');
    });
    it('gives Invalid Date for text that is not a date', () => {
      expect(u.shortDate('not a date')).toBe('Invalid Date');
    });
  });

  describe('slug', () => {
    it('lowercases and joins words with dashes', () => {
      expect(u.slug('Beach day!')).toBe('beach-day');
    });
    it('turns runs of other characters into one dash', () => {
      expect(u.slug('a  &  b')).toBe('a-b');
      expect(u.slug('Shot_01.final')).toBe('shot-01-final');
    });
    it('trims dashes off both ends', () => {
      expect(u.slug('  --Hello--  ')).toBe('hello');
      expect(u.slug('!!x')).toBe('x');
      expect(u.slug('x!!')).toBe('x');
    });
    it('drops accents instead of the letters', () => {
      expect(u.slug('Café Olé')).toBe('cafe-ole');
      expect(u.slug('Ñandú')).toBe('nandu');
    });
    it('folds compatibility characters to plain ones', () => {
      expect(u.slug('ﬁve ①')).toBe('five-1');
    });
    it('keeps at most 48 characters', () => {
      expect(u.slug('a'.repeat(60))).toBe('a'.repeat(48));
      expect(u.slug('b'.repeat(48))).toHaveLength(48);
      expect(u.slug('c'.repeat(47))).toHaveLength(47);
    });
    it('falls back to "post" when nothing usable is left', () => {
      expect(u.slug('')).toBe('post');
      expect(u.slug('!!!')).toBe('post');
      expect(u.slug('日本語')).toBe('post');
    });
    it('falls back to "post" for missing names', () => {
      expect(u.slug(null)).toBe('post');
      expect(u.slug(undefined)).toBe('post');
      expect(u.slug(0)).toBe('post');
    });
    it('turns numbers into text', () => {
      expect(u.slug(2026)).toBe('2026');
    });
  });

  describe('debounce', () => {
    it('runs once, after the wait, with the last arguments', () => {
      vi.useFakeTimers();
      const fn = vi.fn();
      const run = u.debounce(fn, 100);
      run(1);
      run(2);
      run(3);
      vi.advanceTimersByTime(99);
      expect(fn).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith(3);
    });
    it('restarts the wait on every call', () => {
      vi.useFakeTimers();
      const fn = vi.fn();
      const run = u.debounce(fn, 100);
      run('a');
      vi.advanceTimersByTime(80);
      run('b');
      vi.advanceTimersByTime(80);
      expect(fn).not.toHaveBeenCalled();
      vi.advanceTimersByTime(20);
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('b');
    });
    it('runs again for calls after the first wait is over', () => {
      vi.useFakeTimers();
      const fn = vi.fn();
      const run = u.debounce(fn, 50);
      run(1);
      vi.advanceTimersByTime(50);
      run(2);
      vi.advanceTimersByTime(50);
      expect(fn.mock.calls).toEqual([[1], [2]]);
    });
    it('flush runs straight away, returns the result and drops the pending run', () => {
      vi.useFakeTimers();
      const fn = vi.fn((x, y) => x + y);
      const run = u.debounce(fn, 100);
      run(1, 1);
      expect(run.flush(2, 3)).toBe(5);
      expect(fn).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(500);
      expect(fn).toHaveBeenCalledTimes(1);
    });
    it('flush with nothing pending still runs', () => {
      const fn = vi.fn(() => 'done');
      const run = u.debounce(fn, 100);
      expect(run.flush()).toBe('done');
      expect(fn).toHaveBeenCalledWith();
    });
    it('cancel stops the pending run', () => {
      vi.useFakeTimers();
      const fn = vi.fn();
      const run = u.debounce(fn, 100);
      run();
      run.cancel();
      vi.advanceTimersByTime(1000);
      expect(fn).not.toHaveBeenCalled();
    });
    it('cancel with nothing pending is harmless', () => {
      const run = u.debounce(vi.fn(), 10);
      expect(() => run.cancel()).not.toThrow();
      expect(run.cancel()).toBeUndefined();
    });
    it('a zero wait still waits for the next tick', () => {
      vi.useFakeTimers();
      const fn = vi.fn();
      u.debounce(fn, 0)('x');
      expect(fn).not.toHaveBeenCalled();
      vi.advanceTimersByTime(0);
      expect(fn).toHaveBeenCalledWith('x');
    });
  });

  describe('downloadBlob', () => {
    const setup = () => {
      if (!URL.createObjectURL) URL.createObjectURL = () => '';
      if (!URL.revokeObjectURL) URL.revokeObjectURL = () => {};
      const created = vi.fn(() => 'blob:fake-1');
      const revoked = vi.fn();
      vi.spyOn(URL, 'createObjectURL').mockImplementation(created);
      vi.spyOn(URL, 'revokeObjectURL').mockImplementation(revoked);
      const clicked = [];
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
        clicked.push({ href: this.href, download: this.download, inPage: document.body.contains(this) });
      });
      return { created, revoked, clicked };
    };
    it('clicks a temporary link to the blob with the file name', () => {
      const { created, clicked } = setup();
      const blob = new Blob(['hi']);
      u.downloadBlob(blob, 'board.pdf');
      expect(created).toHaveBeenCalledWith(blob);
      expect(clicked).toEqual([{ href: 'blob:fake-1', download: 'board.pdf', inPage: true }]);
    });
    it('takes the link back out of the page', () => {
      setup();
      const before = document.querySelectorAll('a').length;
      u.downloadBlob(new Blob(['x']), 'a.txt');
      expect(document.querySelectorAll('a').length).toBe(before);
    });
    it('frees the blob address only after a minute', () => {
      vi.useFakeTimers();
      const { revoked } = setup();
      u.downloadBlob(new Blob(['x']), 'a.txt');
      vi.advanceTimersByTime(59999);
      expect(revoked).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(revoked).toHaveBeenCalledTimes(1);
      expect(revoked).toHaveBeenCalledWith('blob:fake-1');
    });
    it('passes an empty file name through', () => {
      const { clicked } = setup();
      u.downloadBlob(new Blob([]), '');
      expect(clicked[0].download).toBe('');
    });
  });

  describe('canvasToBlob', () => {
    // "hello" in base64, padded so the data URL is long enough
    const PNG = 'data:image/png;base64,aGVsbG8gd29ybGQ=';
    it('turns the canvas data URL into a blob of the right type and bytes', async () => {
      const canvas = canvasGiving(PNG);
      const blob = await u.canvasToBlob(canvas, 'image/jpeg', 0.8);
      expect(canvas.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.8);
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('image/png');
      expect(Array.from(await bytesOf(blob))).toEqual(Array.from('hello world', (c) => c.charCodeAt(0)));
    });
    it('keeps bytes above 127 intact', async () => {
      // base64 of bytes ff 00 80 7f
      const blob = await u.canvasToBlob(canvasGiving('data:image/jpeg;base64,/wCAfw=='), 'image/jpeg');
      expect(blob.type).toBe('image/jpeg');
      expect(Array.from(await bytesOf(blob))).toEqual([0xff, 0x00, 0x80, 0x7f]);
    });
    it('uses the asked-for type when the data URL has none', async () => {
      const blob = await u.canvasToBlob(canvasGiving('data:;base64,aGVsbG8gd29ybGQgYWdhaW4='), 'image/webp');
      expect(blob.type).toBe('image/webp');
      expect(blob.size).toBe(17);
    });
    it('accepts a data URL of exactly 30 characters', async () => {
      const url = 'data:image/png;base64,aGVsbG8=';
      expect(url).toHaveLength(30);
      const blob = await u.canvasToBlob(canvasGiving(url), 'image/png');
      expect(blob.size).toBe(5);
    });
    it('rejects a data URL shorter than 30 characters (an empty canvas)', async () => {
      const url = 'data:image/png;base64,aGVsbG=';
      expect(url).toHaveLength(29);
      const e = await errorOf(u.canvasToBlob(canvasGiving(url), 'image/png'));
      expect(e).toBeInstanceOf(Error);
      expect(e.message).toBe('Could not make the image');
    });
    it('rejects "data:," which browsers give for a zero-size canvas', async () => {
      const e = await errorOf(u.canvasToBlob(canvasGiving('data:,'), 'image/png'));
      expect(e).toBeInstanceOf(Error);
      expect(e.message).toBe('Could not make the image');
    });
    it('rejects a long URL with no comma', async () => {
      const e = await errorOf(u.canvasToBlob(canvasGiving('x'.repeat(40)), 'image/png'));
      expect(e).toBeInstanceOf(Error);
      expect(e.message).toBe('Could not make the image');
    });
    it('reads a URL that starts with its comma', async () => {
      // comma at 0 is still "found"; the bytes after it decode
      const blob = await u.canvasToBlob(canvasGiving(',' + 'QUJD'.repeat(8)), 'image/png');
      expect(blob.size).toBe(24);
    });
    it('rejects (does not throw) when the canvas refuses, e.g. a tainted canvas', async () => {
      const err = new Error('SecurityError');
      const p = u.canvasToBlob(canvasGiving('', err), 'image/png');
      expect(p).toBeInstanceOf(Promise);
      await expect(p).rejects.toBe(err);
    });
    it('rejects data that is not base64', async () => {
      const e = await errorOf(u.canvasToBlob(canvasGiving('data:image/png;base64,***not*base64***'), 'image/png'));
      expect(e.name).toBe('InvalidCharacterError');
    });
  });

  describe('nextFrame', () => {
    it('returns a promise that resolves on the next timer tick', async () => {
      vi.useFakeTimers();
      let done = false;
      const p = u.nextFrame().then((v) => { done = true; return v; });
      expect(p).toBeInstanceOf(Promise);
      await Promise.resolve();
      expect(done).toBe(false);
      await vi.advanceTimersByTimeAsync(0);
      expect(done).toBe(true);
      await expect(p).resolves.toBeUndefined();
    });
    it('resolves with real timers too', async () => {
      await expect(u.nextFrame()).resolves.toBeUndefined();
    });
    it('gives a new promise each call', () => {
      expect(u.nextFrame()).not.toBe(u.nextFrame());
    });
  });

  describe('loadImage', () => {
    const fakeImage = () => {
      const made = [];
      vi.stubGlobal('Image', class { constructor() { made.push(this); } });
      return made;
    };
    it('resolves with the image once it loads', async () => {
      const made = fakeImage();
      const p = u.loadImage('pic.jpg');
      expect(made).toHaveLength(1);
      expect(made[0].src).toBe('pic.jpg');
      expect(made[0].decoding).toBe('async');
      made[0].onload();
      await expect(p).resolves.toBe(made[0]);
    });
    it('rejects with a plain message when the image fails', async () => {
      const made = fakeImage();
      const p = u.loadImage('broken.jpg');
      made[0].onerror(new Event('error'));
      const e = await errorOf(p);
      expect(e).toBeInstanceOf(Error);
      expect(e.message).toBe('Could not open the image');
    });
    it('sets the handlers before the source so a cached image is not missed', () => {
      const order = [];
      vi.stubGlobal('Image', class {
        set onload(f) { order.push('onload'); this._l = f; }
        set onerror(f) { order.push('onerror'); this._e = f; }
        set src(v) { order.push('src'); }
      });
      u.loadImage('x');
      expect(order).toEqual(['onload', 'onerror', 'src']);
    });
    it('passes an empty source straight through', () => {
      const made = fakeImage();
      u.loadImage('');
      expect(made[0].src).toBe('');
    });
  });

  describe('device checks', () => {
    const media = (matching) => {
      const mm = vi.fn((q) => ({ matches: matching.includes(q) }));
      vi.stubGlobal('matchMedia', mm);
      return mm;
    };
    const nav = (props) => {
      for (const [k, v] of Object.entries(props)) Object.defineProperty(navigator, k, { value: v, configurable: true });
    };
    afterEach(() => {
      for (const k of ['standalone', 'userAgent', 'platform', 'maxTouchPoints']) delete navigator[k];
    });

    describe('isStandalone', () => {
      it('is true in an installed web app window', () => {
        const mm = media(['(display-mode: standalone)']);
        expect(u.isStandalone()).toBe(true);
        expect(mm).toHaveBeenCalledWith('(display-mode: standalone)');
      });
      it('is true on an iPhone home-screen app', () => {
        media([]);
        nav({ standalone: true });
        expect(u.isStandalone()).toBe(true);
      });
      it('is false in a browser tab', () => {
        media([]);
        nav({ standalone: false });
        expect(u.isStandalone()).toBe(false);
      });
      it('is false when navigator.standalone is truthy but not true', () => {
        media([]);
        nav({ standalone: 'yes' });
        expect(u.isStandalone()).toBe(false);
      });
      it('is false when navigator.standalone is missing', () => {
        media([]);
        expect(u.isStandalone()).toBe(false);
      });
    });

    describe('isIOS', () => {
      it('spots an iPhone, iPad and iPod', () => {
        for (const ua of ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', 'Mozilla/5.0 (iPad; CPU OS 16_0)', 'Mozilla/5.0 (iPod touch)']) {
          nav({ userAgent: ua, platform: 'iPhone', maxTouchPoints: 5 });
          expect(u.isIOS()).toBe(true);
        }
      });
      it('spots an iPad that says it is a Mac (touch points over 1)', () => {
        nav({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel', maxTouchPoints: 5 });
        expect(u.isIOS()).toBe(true);
      });
      it('is false on a real Mac with no touch', () => {
        nav({ userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel', maxTouchPoints: 0 });
        expect(u.isIOS()).toBe(false);
      });
      it('is false on a Mac reporting exactly one touch point', () => {
        nav({ userAgent: 'Mozilla/5.0 (Macintosh)', platform: 'MacIntel', maxTouchPoints: 1 });
        expect(u.isIOS()).toBe(false);
      });
      it('is false on a Windows touch screen', () => {
        nav({ userAgent: 'Mozilla/5.0 (Windows NT 10.0)', platform: 'Win32', maxTouchPoints: 10 });
        expect(u.isIOS()).toBe(false);
      });
      it('is false on Android', () => {
        nav({ userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)', platform: 'Linux armv8l', maxTouchPoints: 5 });
        expect(u.isIOS()).toBe(false);
      });
      it('is false for "iP" alone and is case sensitive', () => {
        nav({ userAgent: 'iP iphone IPHONE', platform: 'Linux', maxTouchPoints: 0 });
        expect(u.isIOS()).toBe(false);
      });
    });

    describe('isPhone', () => {
      it('is true with a coarse pointer (a finger)', () => {
        const mm = media(['(pointer: coarse)']);
        expect(u.isPhone()).toBe(true);
        expect(mm).toHaveBeenCalledWith('(pointer: coarse)');
      });
      it('is false with a mouse', () => {
        media(['(pointer: fine)']);
        expect(u.isPhone()).toBe(false);
      });
      it('asks the media query once per call', () => {
        const mm = media([]);
        u.isPhone();
        u.isPhone();
        expect(mm).toHaveBeenCalledTimes(2);
      });
    });
  });
});
