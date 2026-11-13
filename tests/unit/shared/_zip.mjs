// A small zip writer and reader of the tests' own (not the app's), to make
// backups by hand (odd ones too: zip64, squeezed, comments, broken) and to
// check the zips the app writes.
import { crc32, textBytes } from './_env.mjs';

const MAX32 = 0xffffffff;
const u8 = (d) => (typeof d === 'string' ? textBytes(d) : d);

class Out {
  constructor() { this.chunks = []; this.length = 0; }
  push(u) { this.chunks.push(u); this.length += u.length; }
  u16(n) { this.push(new Uint8Array([n & 0xff, (n >>> 8) & 0xff])); }
  u32(n) { const u = new Uint8Array(4); for (let i = 0; i < 4; i++) u[i] = Math.floor(n / 2 ** (8 * i)) & 0xff; this.push(u); }
  u64(n) { this.u32(n % 2 ** 32); this.u32(Math.floor(n / 2 ** 32)); }
  add(b) { this.push(b instanceof Uint8Array ? b : new Uint8Array(b)); }
  get bytes() { const out = new Uint8Array(this.length); let at = 0; for (const c of this.chunks) { out.set(c, at); at += c.length; } return out; }
}

// entries: [{ name, data, method = 0, stored (bytes as they go in the zip,
// for method 8), crc, wide: { size, packed, at } (which of them go in the
// zip64 extra), otherExtra (an unrelated extra field before it), note }]
// opts: { zip64End ('all': every end field marked; 'count', 'size' or 'at': only that one;
// 'none': the zip64 record and locator, nothing marked), record ({ count, size, at }
// written in the zip64 record instead), noLocator, comment (bytes), countOverride,
// cenSizePlus, plainSize, plainAt (the plain end record's values instead) }
export function makeZip(entries, opts = {}) {
  const o = new Out();
  const central = [];
  for (const e of entries) {
    const name = textBytes(e.name);
    const data = u8(e.data);
    const stored = e.stored ? u8(e.stored) : data;
    const at = o.length;
    o.u32(0x04034b50); o.u16(20); o.u16(0x0800); o.u16(e.method || 0); o.u16(0); o.u16(0);
    o.u32(e.crc != null ? e.crc : crc32(data)); o.u32(stored.length); o.u32(data.length);
    const localExtra = e.localExtra ? u8(e.localExtra) : new Uint8Array(0);
    o.u16(name.length); o.u16(localExtra.length);
    o.add(name); o.add(localExtra); o.add(stored);
    central.push({ e, name, data, stored, at });
  }
  const cenAt = o.length;
  for (const { e, name, data, stored, at } of central) {
    const w = e.wide || {};
    const extra = new Out();
    if (e.otherExtra) { extra.u16(0x5455); extra.u16(5); extra.add([1, 2, 3, 4, 5]); }
    if (w.size || w.packed || w.at) {
      const body = new Out();
      if (w.size) body.u64(data.length);
      if (w.packed) body.u64(stored.length);
      if (w.at) body.u64(at);
      extra.u16(0x0001); extra.u16(body.length); extra.add(body.bytes);
    }
    const note = e.note ? textBytes(e.note) : new Uint8Array(0);
    o.u32(0x02014b50); o.u16(45); o.u16(45); o.u16(0x0800); o.u16(e.method || 0); o.u16(0); o.u16(0);
    o.u32(e.crc != null ? e.crc : crc32(data));
    o.u32(w.packed ? MAX32 : stored.length); o.u32(w.size ? MAX32 : data.length);
    o.u16(name.length); o.u16(extra.length); o.u16(note.length);
    o.u16(0); o.u16(0); o.u32(0);
    o.u32(w.at ? MAX32 : at);
    o.add(name); o.add(extra.bytes); o.add(note);
  }
  const cenSize = o.length - cenAt;
  const count = entries.length;
  const z64 = opts.zip64End;
  if (z64) {
    const recAt = o.length;
    o.u32(0x06064b50); o.u64(44); o.u16(45); o.u16(45); o.u32(0); o.u32(0);
    const rec = { count, size: cenSize, at: cenAt, ...opts.record };
    o.u64(rec.count); o.u64(rec.count); o.u64(rec.size); o.u64(rec.at);
    if (!opts.noLocator) { o.u32(0x07064b50); o.u32(0); o.u64(recAt); o.u32(1); }
  }
  const comment = opts.comment || new Uint8Array(0);
  o.u32(0x06054b50); o.u16(0); o.u16(0);
  const shownCount = opts.countOverride != null ? opts.countOverride : z64 === 'all' || z64 === 'count' ? 0xffff : count;
  o.u16(shownCount); o.u16(shownCount);
  o.u32(z64 === 'all' || z64 === 'size' ? MAX32 : opts.plainSize != null ? opts.plainSize : cenSize + (opts.cenSizePlus || 0));
  o.u32(z64 === 'all' || z64 === 'at' ? MAX32 : opts.plainAt != null ? opts.plainAt : cenAt);
  o.u16(comment.length);
  o.add(comment);
  return new Blob(o.chunks, { type: 'application/zip' });
}

// The app's zips, read plainly from their central directory (no zip64).
export async function listZip(blob) {
  const b = new Uint8Array(await blob.arrayBuffer());
  const dv = new DataView(b.buffer);
  const end = b.length - 22;
  if (dv.getUint32(end, true) !== 0x06054b50) throw new Error('no end record');
  const count = dv.getUint16(end + 10, true);
  let p = dv.getUint32(end + 16, true);
  const out = [];
  for (let i = 0; i < count; i++) {
    const nameLen = dv.getUint16(p + 28, true);
    const extraLen = dv.getUint16(p + 30, true);
    const name = Buffer.from(b.subarray(p + 46, p + 46 + nameLen)).toString('utf8');
    const crc = dv.getUint32(p + 16, true);
    const size = dv.getUint32(p + 24, true);
    const at = dv.getUint32(p + 42, true);
    const local = at + 30 + dv.getUint16(at + 26, true) + dv.getUint16(at + 28, true);
    out.push({ name, crc, size, at, data: b.subarray(local, local + size), flags: dv.getUint16(p + 8, true), method: dv.getUint16(p + 10, true), time: dv.getUint16(p + 12, true), date: dv.getUint16(p + 14, true) });
    p += 46 + nameLen + extraLen + dv.getUint16(p + 32, true);
  }
  return out;
}
export const jsonOf = (entry) => JSON.parse(Buffer.from(entry.data).toString('utf8'));
export const backupZip = (manifest, files = {}, opts = {}) => makeZip([
  { name: 'backup.json', data: JSON.stringify(manifest) },
  ...Object.entries(files).map(([name, data]) => ({ name, data })),
], opts);
export async function deflateRaw(bytes) {
  const s = new Blob([bytes]).stream().pipeThrough(new CompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(s).arrayBuffer());
}
