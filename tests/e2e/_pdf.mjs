// A small PDF made on the spot, for the tests that bring one in: `pages`
// pages, each one colour from edge to edge (no fonts, nothing else), as a
// Buffer for setInputFiles. Wide pages when `wide`.
const COLOURS = ['0.8 0.3 0.2', '0.2 0.4 0.7', '0.9 0.7 0.1', '0.3 0.6 0.4'];

export function testPdf(pages = 2, { wide = false } = {}) {
  const [w, h] = wide ? [400, 225] : [300, 400];
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', ''];
  const kids = [];
  for (let i = 0; i < pages; i++) {
    const page = objects.length + 1;
    const draw = `${COLOURS[i % COLOURS.length]} rg 0 0 ${w} ${h} re f`;
    kids.push(`${page} 0 R`);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w} ${h}] /Contents ${page + 1} 0 R >>`);
    objects.push(`<< /Length ${draw.length} >>\nstream\n${draw}\nendstream`);
  }
  objects[1] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pages} >>`;
  let out = '%PDF-1.4\n';
  const offsets = objects.map((body, i) => {
    const at = out.length;
    out += `${i + 1} 0 obj\n${body}\nendobj\n`;
    return at;
  });
  const xref = out.length;
  out += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}
