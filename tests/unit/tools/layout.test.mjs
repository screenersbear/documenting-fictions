// Starky's rules for how every app is organized (CLAUDE.md, "How the code is
// organized"): no file over 300 lines, the look in styles/, scripts in pages/,
// components/ or data/, markup pieces in pages/ or components/, and a note at
// the top of every file saying what it does.
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

// The tests run from the suite's top folder.
const ROOT = process.cwd();
const NOTEBOOKS = ['ref', 'the-eye', 'contact-sheet', 'overthoughts'];
// Not ours (lib/, ml/, vendor/), made by tools/join.mjs (built/), or not app
// files at all (pictures, fonts, the tests and tools themselves).
const SKIP = new Set(['lib', 'ml', 'vendor', 'built', 'art', 'fonts', 'icons', 'node_modules', 'tests', 'tools', 'reports', 'docs']);
const CODE = /\.(m?js|css|html)$/;

// Every code file of an app: its path inside the app folder.
function appFiles(app) {
  const out = [];
  const walk = (dir) => {
    for (const d of readdirSync(dir, { withFileTypes: true })) {
      const here = relative(join(ROOT, app), join(dir, d.name));
      if (d.isDirectory()) {
        const top = dir === join(ROOT, app);
        if (SKIP.has(d.name) || d.name.startsWith('.') || d.name.startsWith('stryker') || (app === '.' && top && NOTEBOOKS.includes(d.name))) continue;
        walk(join(dir, d.name));
      } else if (CODE.test(d.name) && !d.name.endsWith('.min.js') && !(app === '.' && /\.config\.m?js$/.test(d.name))) {
        out.push(here);
      }
    }
  };
  walk(join(ROOT, app));
  return out;
}

// What's wrong with one file, by the rules above ([] when nothing).
function problems(app, rel) {
  const text = readFileSync(join(ROOT, app, rel), 'utf8');
  const parts = rel.split(sep);
  const top = parts.length > 1 ? parts[0] : null;
  const out = [];
  const lines = text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
  if (lines > 300) out.push(`${lines} lines (no file over 300: split it by job)`);
  if (rel.endsWith('.css') && top !== 'styles') out.push('a stylesheet outside styles/');
  if (/\.m?js$/.test(rel)) {
    const besidePage = ['app.js', 'sw.js', ...(app === '.' ? ['suite.js'] : [])];
    if (!top && !besidePage.includes(rel)) out.push('a script beside index.html (only app.js and sw.js go there)');
    if (top && !['pages', 'components', 'data', ...(app === '.' ? ['shared'] : [])].includes(top)) out.push('a script outside pages/, components/ and data/');
  }
  if (rel.endsWith('.html') && top && !['pages', 'components'].includes(top)) out.push('markup outside pages/ and components/');
  if (rel !== 'index.html' && !/^(\/\/|\/\*|<!--)/.test(text.trimStart())) out.push('no note at the top saying what it does');
  return out;
}

describe.each(['.', ...NOTEBOOKS])('%s is organized by the rules', (app) => {
  it('every file keeps to them', () => {
    const files = appFiles(app);
    expect(files.length).toBeGreaterThan(5);
    const found = files.flatMap((rel) => problems(app, rel).map((p) => `${join(app, rel)}: ${p}`));
    expect(found).toEqual([]);
  });
});
