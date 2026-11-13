// contact-sheet/js/pdf.js: a small PDF writer (JPEGs + text on landscape
// Letter sheets). These tests read the real bytes back, including the xref
// table's byte offsets.
import { describe, it, expect } from 'vitest';
import { makePdf, SHEET_W, SHEET_H } from '../../../contact-sheet/js/pdf.js';

const JPEG = [0xff, 0xd8, 0xff, 0xd9];
const jpeg = (bytes = JPEG) => new Blob([new Uint8Array(bytes)], { type: 'image/jpeg' });

// One character per byte, so string positions are byte offsets.
async function textOf(blob) {
  const u8 = new Uint8Array(await blob.arrayBuffer());
  let s = '';
  for (const b of u8) s += String.fromCharCode(b);
  return s;
}

const bin = (bytes) => String.fromCharCode(...bytes);
const utf8Len = (s) => new TextEncoder().encode(s).length;

// Checks the xref table and startxref against where things really are, and
// returns the number of objects it lists.
function checkXref(s) {
  const xref = s.lastIndexOf('xref\n0 ');
  const start = Number(s.match(/startxref\n(\d+)\n%%EOF\n$/)[1]);
  expect(start).toBe(xref);
  const lines = s.slice(xref).split('\n');
  const count = Number(lines[1].split(' ')[1]);
  expect(lines[2]).toBe('0000000000 65535 f ');
  for (let id = 1; id < count; id++) {
    const line = lines[2 + id];
    expect(line).toMatch(/^\d{10} 00000 n $/);
    const at = Number(line.slice(0, 10));
    expect(s.startsWith(`${id} 0 obj\n`, at)).toBe(true);
  }
  expect(lines[2 + count]).toBe('trailer');
  expect(lines[3 + count]).toBe(`<< /Size ${count} /Root 1 0 R >>`);
  return count;
}

const head = `%PDF-1.4\n${bin([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a])}`;
const catalog = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
const font = '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';
const imageObj = (id, w, h, bytes = JPEG) =>
  `${id} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${w} /Height ${h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${bytes.length} >>\nstream\n${bin(bytes)}\nendstream\nendobj\n`;

describe('sheet size', () => {
  it('is US Letter on its side, in points', () => {
    expect(SHEET_W).toBe(792);
    expect(SHEET_H).toBe(612);
  });
});

describe('makePdf: whole files', () => {
  it('writes one sheet with a photo, its outline and a caption exactly', async () => {
    const blob = makePdf([
      {
        images: [{ jpeg: jpeg(), pxW: 400, pxH: 300, x: 10, y: 20, w: 200, h: 150, outline: true }],
        text: [{ x: 30, y: 40, size: 12, str: 'Hi (there) \\ ok' }],
      },
    ]);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('application/pdf');
    const s = await textOf(blob);
    const draw =
      'q 200.00 0 0 150.00 10.00 20.00 cm /Im4 Do Q\n' +
      'q 0.82 G 0.25 w 10.00 20.00 200.00 150.00 re S Q\n' +
      'q 0.19 0.24 0.27 rg BT /F1 12.00 Tf 30.00 40.00 Td (Hi \\(there\\) \\\\ ok) Tj ET Q\n';
    const body =
      head +
      catalog +
      '2 0 obj\n<< /Type /Pages /Count 1 /Kids [5 0 R] >>\nendobj\n' +
      font +
      imageObj(4, 400, 300) +
      '5 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 792 612] /Contents 6 0 R /Resources << /Font << /F1 3 0 R >> /XObject << /Im4 4 0 R >> >> >>\nendobj\n' +
      `6 0 obj\n<< /Length ${draw.length} >>\nstream\n${draw}\nendstream\nendobj\n`;
    expect(s.slice(0, body.length)).toBe(body);
    expect(s.slice(body.length, body.length + 12)).toBe('xref\n0 7\n000');
    expect(s.endsWith(`trailer\n<< /Size 7 /Root 1 0 R >>\nstartxref\n${body.length}\n%%EOF\n`)).toBe(true);
    expect(checkXref(s)).toBe(7);
    expect(blob.size).toBe(s.length);
  });

  it('writes an empty document for no sheets', async () => {
    const s = await textOf(makePdf([]));
    const body = head + catalog + '2 0 obj\n<< /Type /Pages /Count 0 /Kids [] >>\nendobj\n' + font;
    expect(s).toBe(
      body +
        'xref\n0 4\n0000000000 65535 f \n' +
        '0000000015 00000 n \n0000000064 00000 n \n0000000116 00000 n \n' +
        `trailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n${body.length}\n%%EOF\n`,
    );
    expect(checkXref(s)).toBe(4);
  });

  it('writes a blank page with no photos and no text', async () => {
    const s = await textOf(makePdf([{ images: [] }]));
    expect(s).toContain('/Count 1 /Kids [4 0 R]');
    expect(s).toContain('4 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 792 612] /Contents 5 0 R /Resources << /Font << /F1 3 0 R >> /XObject <<  >> >> >>\nendobj\n');
    expect(s).toContain('5 0 obj\n<< /Length 0 >>\nstream\n\nendstream\nendobj\n');
    expect(checkXref(s)).toBe(6);
  });
});

describe('makePdf: images', () => {
  it('stores a photo used on several sheets once and draws it on each', async () => {
    const shared = jpeg();
    const im = { jpeg: shared, pxW: 10, pxH: 20, x: 0, y: 0, w: 5, h: 5 };
    const s = await textOf(makePdf([{ images: [im] }, { images: [im] }]));
    expect(s.split('/Subtype /Image').length - 1).toBe(1);
    expect(s).toContain('/Count 2 /Kids [5 0 R 7 0 R]');
    expect(s).toContain('5 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 792 612] /Contents 6 0 R /Resources << /Font << /F1 3 0 R >> /XObject << /Im4 4 0 R >> >> >>');
    expect(s).toContain('7 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 792 612] /Contents 8 0 R /Resources << /Font << /F1 3 0 R >> /XObject << /Im4 4 0 R >> >> >>');
    expect(s.split('/Im4 Do').length - 1).toBe(2);
    expect(checkXref(s)).toBe(9);
  });

  it('keeps the size of the first use when a photo is used again with other pixel sizes', async () => {
    const shared = jpeg();
    const s = await textOf(
      makePdf([{ images: [{ jpeg: shared, pxW: 10, pxH: 20, x: 0, y: 0, w: 1, h: 1 }, { jpeg: shared, pxW: 99, pxH: 99, x: 0, y: 0, w: 1, h: 1 }] }]),
    );
    expect(s).toContain(imageObj(4, 10, 20));
    expect(s).not.toContain('/Width 99');
  });

  it('lists a photo drawn twice on one sheet once in its resources', async () => {
    const a = jpeg();
    const s = await textOf(
      makePdf([{ images: [{ jpeg: a, pxW: 1, pxH: 1, x: 0, y: 0, w: 1, h: 1 }, { jpeg: a, pxW: 1, pxH: 1, x: 5, y: 5, w: 1, h: 1 }] }]),
    );
    expect(s).toContain('/XObject << /Im4 4 0 R >>');
    expect(s).toContain('q 1.00 0 0 1.00 0.00 0.00 cm /Im4 Do Q\nq 1.00 0 0 1.00 5.00 5.00 cm /Im4 Do Q\n');
  });

  it('gives different photos their own objects, numbered in order of first use', async () => {
    const a = jpeg([1, 2, 3]);
    const b = jpeg([4, 5, 6, 7, 8]);
    const s = await textOf(
      makePdf([
        { images: [{ jpeg: a, pxW: 30, pxH: 40, x: 1, y: 2, w: 3, h: 4 }] },
        { images: [{ jpeg: b, pxW: 50, pxH: 60, x: 0, y: 0, w: 1, h: 1 }, { jpeg: a, pxW: 30, pxH: 40, x: 9, y: 9, w: 1, h: 1 }] },
      ]),
    );
    expect(s).toContain(imageObj(4, 30, 40, [1, 2, 3]));
    expect(s).toContain(imageObj(5, 50, 60, [4, 5, 6, 7, 8]));
    expect(s).toContain('/Count 2 /Kids [6 0 R 8 0 R]');
    expect(s).toContain('/Contents 7 0 R /Resources << /Font << /F1 3 0 R >> /XObject << /Im4 4 0 R >> >> >>');
    expect(s).toContain('/Contents 9 0 R /Resources << /Font << /F1 3 0 R >> /XObject << /Im5 5 0 R /Im4 4 0 R >> >> >>');
    expect(checkXref(s)).toBe(10);
  });

  it('stores two identical-looking but separate photos twice', async () => {
    const s = await textOf(
      makePdf([{ images: [{ jpeg: jpeg(), pxW: 1, pxH: 1, x: 0, y: 0, w: 1, h: 1 }, { jpeg: jpeg(), pxW: 1, pxH: 1, x: 0, y: 0, w: 1, h: 1 }] }]),
    );
    expect(s.split('/Subtype /Image').length - 1).toBe(2);
    expect(s).toContain('/XObject << /Im4 4 0 R /Im5 5 0 R >>');
  });

  it('draws an outline only where asked', async () => {
    const s = await textOf(
      makePdf([{ images: [{ jpeg: jpeg(), pxW: 1, pxH: 1, x: 1, y: 2, w: 3, h: 4, outline: false }, { jpeg: jpeg(), pxW: 1, pxH: 1, x: 5, y: 6, w: 7, h: 8, outline: true }] }]),
    );
    expect(s).not.toContain('1.00 2.00 3.00 4.00 re S');
    expect(s).toContain('q 0.82 G 0.25 w 5.00 6.00 7.00 8.00 re S Q\n');
    expect(s.split(' re S Q').length - 1).toBe(1);
  });

  it('writes numbers with two decimals, rounding, negatives and numeric text', async () => {
    const s = await textOf(makePdf([{ images: [{ jpeg: jpeg(), pxW: 1, pxH: 1, x: 1 / 3, y: -5, w: '7', h: 2.005 }] }]));
    expect(s).toContain('q 7.00 0 0 2.00 0.33 -5.00 cm /Im4 Do Q\n');
  });

  it('keeps the xref right after large photos', async () => {
    const big = new Uint8Array(100000).fill(0x41);
    const pics = [jpeg(big), jpeg([9, 9])];
    const s = await textOf(
      makePdf([
        { images: [{ jpeg: pics[0], pxW: 1, pxH: 1, x: 0, y: 0, w: 1, h: 1 }] },
        { images: [{ jpeg: pics[1], pxW: 1, pxH: 1, x: 0, y: 0, w: 1, h: 1 }] },
      ]),
    );
    expect(s).toContain('/Length 100000 >>\nstream\n');
    expect(checkXref(s)).toBe(10);
  });

  it('handles thirty sheets of different photos', async () => {
    const sheets = Array.from({ length: 30 }, (_, i) => ({
      images: [{ jpeg: jpeg([i, i, i]), pxW: 100 + i, pxH: 50, x: i, y: i, w: 10, h: 10 }],
      text: [{ x: 1, y: 1, size: 8, str: `Page ${i + 1}` }],
    }));
    const s = await textOf(makePdf(sheets));
    expect(checkXref(s)).toBe(4 + 30 + 60);
    expect(s).toContain('/Count 30 ');
    expect(s).toContain('(Page 30) Tj');
  });
});

describe('makePdf: text', () => {
  it('escapes backslashes and every bracket', async () => {
    const s = await textOf(makePdf([{ images: [], text: [{ x: 0, y: 0, size: 10, str: '((a)) \\b\\' }] }]));
    expect(s).toContain('Td (\\(\\(a\\)\\) \\\\b\\\\) Tj');
  });
  it('writes numbers and missing text as text', async () => {
    const s = await textOf(makePdf([{ images: [], text: [{ x: 0, y: 0, size: 10, str: 42 }, { x: 0, y: 0, size: 10 }] }]));
    expect(s).toContain('Td (42) Tj');
    expect(s).toContain('Td (undefined) Tj');
  });
  it('writes an empty caption as an empty string', async () => {
    const s = await textOf(makePdf([{ images: [], text: [{ x: 5.5, y: 6.25, size: 9, str: '' }] }]));
    expect(s).toContain('q 0.19 0.24 0.27 rg BT /F1 9.00 Tf 5.50 6.25 Td () Tj ET Q\n');
  });
  it('counts the content stream length in bytes, not characters', async () => {
    const s = await textOf(makePdf([{ images: [], text: [{ x: 0, y: 0, size: 10, str: 'café' }] }]));
    const draw = 'q 0.19 0.24 0.27 rg BT /F1 10.00 Tf 0.00 0.00 Td (café) Tj ET Q\n';
    expect(s).toContain(`<< /Length ${utf8Len(draw)} >>`);
    expect(utf8Len(draw)).toBe(draw.length + 1);
    expect(checkXref(s)).toBe(6);
  });
  it('writes no text for an empty text list', async () => {
    const s = await textOf(makePdf([{ images: [], text: [] }]));
    expect(s).not.toContain(' Tj ');
    expect(s).toContain('<< /Length 0 >>');
  });
  it('writes text after the photos on the same sheet', async () => {
    const s = await textOf(makePdf([{ images: [{ jpeg: jpeg(), pxW: 1, pxH: 1, x: 0, y: 0, w: 1, h: 1 }], text: [{ x: 0, y: 0, size: 1, str: 'z' }] }]));
    expect(s.indexOf('/Im4 Do')).toBeLessThan(s.indexOf('(z) Tj'));
  });
});

describe('makePdf: bad input', () => {
  it('throws for a missing sheet list', () => {
    expect(() => makePdf(undefined)).toThrow(TypeError);
  });
  it('throws for a sheet with no image list', () => {
    expect(() => makePdf([{ text: [] }])).toThrow(TypeError);
  });
  it('throws for text that is not a list', () => {
    expect(() => makePdf([{ images: [], text: 5 }])).toThrow(TypeError);
  });
});
