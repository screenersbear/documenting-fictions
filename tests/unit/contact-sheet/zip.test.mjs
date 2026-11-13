// contact-sheet/js/zip.js: a plain stored (uncompressed) ZIP writer. These tests
// read the real bytes back: signatures, header fields, CRC32s and offsets.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { makeZip } from '../../../contact-sheet/js/zip.js';

const LOCAL = 0x04034b50;
const CENTRAL = 0x02014b50;
const END = 0x06054b50;

const enc = new TextEncoder();
const dec = new TextDecoder();
const file = (name, content) => ({ name, blob: new Blob([content]) });

async function bytesOf(blob) {
  return new Uint8Array(await blob.arrayBuffer());
}

// An independent, bit-at-a-time CRC32 (no table) to check the writer against.
function refCrc(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return (c ^ 0xffffffff) >>> 0;
}

// Reads a whole ZIP: the end record, every central entry, and the local entry
// and data each one points at.
function readZip(u8) {
  const v = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  const e = u8.length - 22;
  const end = {
    sig: v.getUint32(e, true),
    disk: v.getUint16(e + 4, true),
    cdDisk: v.getUint16(e + 6, true),
    countHere: v.getUint16(e + 8, true),
    count: v.getUint16(e + 10, true),
    cenSize: v.getUint32(e + 12, true),
    cenOffset: v.getUint32(e + 16, true),
    commentLen: v.getUint16(e + 20, true),
  };
  const entries = [];
  let p = end.cenOffset;
  for (let i = 0; i < end.count; i++) {
    const nameLen = v.getUint16(p + 28, true);
    const c = {
      sig: v.getUint32(p, true),
      madeBy: v.getUint16(p + 4, true),
      needed: v.getUint16(p + 6, true),
      flags: v.getUint16(p + 8, true),
      method: v.getUint16(p + 10, true),
      time: v.getUint16(p + 12, true),
      date: v.getUint16(p + 14, true),
      crc: v.getUint32(p + 16, true),
      csize: v.getUint32(p + 20, true),
      usize: v.getUint32(p + 24, true),
      nameLen,
      extraLen: v.getUint16(p + 30, true),
      commentLen: v.getUint16(p + 32, true),
      diskStart: v.getUint16(p + 34, true),
      intAttr: v.getUint16(p + 36, true),
      extAttr: v.getUint32(p + 38, true),
      offset: v.getUint32(p + 42, true),
      name: dec.decode(u8.subarray(p + 46, p + 46 + nameLen)),
    };
    const o = c.offset;
    const lNameLen = v.getUint16(o + 26, true);
    const lExtraLen = v.getUint16(o + 28, true);
    const dataStart = o + 30 + lNameLen + lExtraLen;
    c.local = {
      sig: v.getUint32(o, true),
      needed: v.getUint16(o + 4, true),
      flags: v.getUint16(o + 6, true),
      method: v.getUint16(o + 8, true),
      time: v.getUint16(o + 10, true),
      date: v.getUint16(o + 12, true),
      crc: v.getUint32(o + 14, true),
      csize: v.getUint32(o + 18, true),
      usize: v.getUint32(o + 22, true),
      nameLen: lNameLen,
      extraLen: lExtraLen,
      name: dec.decode(u8.subarray(o + 30, o + 30 + lNameLen)),
    };
    c.data = u8.slice(dataStart, dataStart + c.csize);
    entries.push(c);
    p += 46 + nameLen + c.extraLen + c.commentLen;
  }
  return { end, entries };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('makeZip: structure', () => {
  it('writes only the end record for no files', async () => {
    const blob = await makeZip([]);
    expect(blob.type).toBe('application/zip');
    const u8 = await bytesOf(blob);
    expect(u8.length).toBe(22);
    expect(readZip(u8).end).toEqual({
      sig: END, disk: 0, cdDisk: 0, countHere: 0, count: 0, cenSize: 0, cenOffset: 0, commentLen: 0,
    });
  });

  it('writes one stored file with matching local and central headers', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 12, 13, 45, 31));
    const blob = await makeZip([file('a.txt', 'hello')]);
    const u8 = await bytesOf(blob);
    // 30 + name 5 + data 5, then 46 + name 5, then the 22-byte end
    expect(u8.length).toBe(113);
    expect(blob.size).toBe(113);
    const { end, entries } = readZip(u8);
    expect(end).toEqual({ sig: END, disk: 0, cdDisk: 0, countHere: 1, count: 1, cenSize: 51, cenOffset: 40, commentLen: 0 });
    const [e] = entries;
    expect(e).toMatchObject({
      sig: CENTRAL, madeBy: 20, needed: 20, flags: 0x0800, method: 0,
      time: 28079, date: 23916, crc: 0x3610a686, csize: 5, usize: 5,
      nameLen: 5, extraLen: 0, commentLen: 0, diskStart: 0, intAttr: 0, extAttr: 0, offset: 0, name: 'a.txt',
    });
    expect(e.local).toEqual({
      sig: LOCAL, needed: 20, flags: 0x0800, method: 0, time: 28079, date: 23916,
      crc: 0x3610a686, csize: 5, usize: 5, nameLen: 5, extraLen: 0, name: 'a.txt',
    });
    expect(dec.decode(e.data)).toBe('hello');
  });

  it('starts each file where the last one ended and points the central directory at it', async () => {
    const files = [file('one.jpg', 'abc'), file('two/two.png', 'defgh'), file('3', '')];
    const u8 = await bytesOf(await makeZip(files));
    const { end, entries } = readZip(u8);
    expect(entries.map((e) => e.offset)).toEqual([0, 30 + 7 + 3, 40 + 30 + 11 + 5]);
    expect(entries.map((e) => e.name)).toEqual(['one.jpg', 'two/two.png', '3']);
    expect(entries.map((e) => e.local.name)).toEqual(['one.jpg', 'two/two.png', '3']);
    expect(entries.map((e) => dec.decode(e.data))).toEqual(['abc', 'defgh', '']);
    expect(end.count).toBe(3);
    expect(end.countHere).toBe(3);
    expect(end.cenOffset).toBe(86 + 30 + 1);
    expect(end.cenSize).toBe(46 * 3 + 7 + 11 + 1);
    expect(u8.length).toBe(117 + 157 + 22);
    for (const e of entries) {
      expect(e.local.sig).toBe(LOCAL);
      expect(e.sig).toBe(CENTRAL);
      expect(e.local.crc).toBe(e.crc);
      expect(e.crc).toBe(refCrc(e.data));
    }
  });

  it('writes UTF-8 names with their byte length and the UTF-8 flag', async () => {
    const name = 'café ü/写真.jpg';
    const { entries } = readZip(await bytesOf(await makeZip([file(name, 'x')])));
    const bytes = enc.encode(name).length;
    expect(bytes).toBeGreaterThan(name.length);
    expect(entries[0].nameLen).toBe(bytes);
    expect(entries[0].local.nameLen).toBe(bytes);
    expect(entries[0].name).toBe(name);
    expect(entries[0].flags & 0x0800).toBe(0x0800);
    expect(entries[0].local.flags & 0x0800).toBe(0x0800);
  });

  it('stores binary data byte for byte', async () => {
    const all = new Uint8Array(256).map((_, i) => i);
    const { entries } = readZip(await bytesOf(await makeZip([{ name: 'bin', blob: new Blob([all]) }])));
    expect([...entries[0].data]).toEqual([...all]);
    expect(entries[0].crc).toBe(0x29058c73);
  });

  it('keeps a file whose name is empty', async () => {
    const { entries, end } = readZip(await bytesOf(await makeZip([file('', 'z')])));
    expect(entries[0].nameLen).toBe(0);
    expect(dec.decode(entries[0].data)).toBe('z');
    expect(end.cenSize).toBe(46);
  });

  it('handles a larger file (300 KB) with the right sizes and CRC', async () => {
    const big = new Uint8Array(300 * 1024);
    let s = 12345;
    for (let i = 0; i < big.length; i++) {
      s = (s * 1103515245 + 12345) >>> 0;
      big[i] = s >>> 24;
    }
    const u8 = await bytesOf(await makeZip([{ name: 'big.jpg', blob: new Blob([big]) }]));
    const { entries, end } = readZip(u8);
    expect(entries[0].usize).toBe(big.length);
    expect(entries[0].local.csize).toBe(big.length);
    expect(entries[0].crc).toBe(refCrc(big));
    expect(end.cenOffset).toBe(30 + 7 + big.length);
  });
});

describe('makeZip: CRC32', () => {
  it('matches the standard check value for "123456789"', async () => {
    const { entries } = readZip(await bytesOf(await makeZip([file('c', '123456789')])));
    expect(entries[0].crc).toBe(0xcbf43926);
  });
  it('is 0 for an empty file', async () => {
    const { entries } = readZip(await bytesOf(await makeZip([file('empty', '')])));
    expect(entries[0].crc).toBe(0);
    expect(entries[0].usize).toBe(0);
    expect(entries[0].local.csize).toBe(0);
  });
  it('matches known values for one byte and for UTF-8 text', async () => {
    const { entries } = readZip(await bytesOf(await makeZip([file('a', 'a'), file('b', 'café')])));
    expect(entries[0].crc).toBe(0xe8b7be43);
    expect(entries[1].crc).toBe(0x98ad42b5);
  });
});

describe('makeZip: dates', () => {
  it('stamps every entry with the time it was made, in 2-second steps', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 12, 13, 45, 30));
    const even = readZip(await bytesOf(await makeZip([file('a', '1'), file('b', '2')]))).entries;
    vi.setSystemTime(new Date(2026, 10, 12, 13, 45, 31));
    const odd = readZip(await bytesOf(await makeZip([file('a', '1')]))).entries;
    expect(even.map((e) => [e.time, e.date, e.local.time, e.local.date])).toEqual([
      [28079, 23916, 28079, 23916],
      [28079, 23916, 28079, 23916],
    ]);
    expect(odd[0].time).toBe(28079);
  });
  it('writes the earliest DOS date, 1 Jan 1980 at midnight', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(1980, 0, 1, 0, 0, 0));
    const [e] = readZip(await bytesOf(await makeZip([file('a', '1')]))).entries;
    expect(e.time).toBe(0);
    expect(e.date).toBe(33); // month 1 << 5 | day 1
  });
  it('writes the last second of a year just before midnight', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2025, 11, 31, 23, 59, 59));
    const [e] = readZip(await bytesOf(await makeZip([file('a', '1')]))).entries;
    expect(e.time).toBe((23 << 11) | (59 << 5) | 29);
    expect(e.date).toBe((45 << 9) | (12 << 5) | 31);
    expect(e.local.time).toBe(49021);
    expect(e.local.date).toBe(23455);
  });
});

describe('makeZip: bad input', () => {
  it('rejects a missing file list', async () => {
    expect(await makeZip(undefined).catch((e) => e)).toBeInstanceOf(TypeError);
  });
  it('rejects a file with no blob', async () => {
    expect(await makeZip([{ name: 'x' }]).catch((e) => e)).toBeInstanceOf(TypeError);
  });
  it('writes a file with no name under an empty name rather than failing', async () => {
    const { entries } = readZip(await bytesOf(await makeZip([{ blob: new Blob(['x']) }])));
    // TextEncoder.encode(undefined) encodes "" (its default argument)
    expect(entries[0].nameLen).toBe(0);
    expect(entries[0].name).toBe('');
    expect(dec.decode(entries[0].data)).toBe('x');
  });
});
