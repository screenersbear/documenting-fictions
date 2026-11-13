// Joins an app's small files into the few files its page loads, in its built/
// folder. The app's files.txt says which files go into which built file, in
// order. Each file's text goes in exactly as it is, so the page works the same
// as when it loaded every file on its own, with far fewer trips to the server.
// ES modules are joined by tools/join-modules.mjs. tools/join.mjs runs this;
// tests/unit/tools/join.test.mjs checks that every built/ folder matches its
// files.txt.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { joinModules } from './join-modules.mjs';

export const NOTE = 'Made by tools/join.mjs from the files listed in files.txt. Never edit it: change those files, then run node tools/join.mjs.';

// files.txt: a line at the left edge names a built file; the indented lines
// under it are the files joined into it, in order. Lines starting with # are
// notes. A built .css file joins stylesheets; a built .js file joins either
// scripts or pieces of the page's markup (.html). "built/app.js from app.js"
// joins app.js and every ES module it imports, so nothing is listed under it.
export function readList(text) {
  const groups = [];
  const seen = new Set();
  const take = (s, where) => {
    if (s.startsWith('/') || s.startsWith('built/') || s.split('/').includes('..')) throw new Error(`${where}: "${s}" should be a file in this app, outside built/`);
    if (seen.has(s)) throw new Error(`${where}: ${s} is listed twice`);
    seen.add(s);
    return s;
  };
  text.split('\n').forEach((line, i) => {
    const s = line.trim();
    if (!s || s.startsWith('#')) return;
    const where = `files.txt line ${i + 1}`;
    if (line.startsWith(s)) {
      const named = s.match(/^(built\/[\w.-]+\.(?:js|css))(?: from (\S+))?$/);
      if (!named) throw new Error(`${where}: "${s}" should be a file in built/ ending in .js or .css (or "built/app.js from app.js")`);
      const [, out, entry] = named;
      if (groups.some((g) => g.out === out)) throw new Error(`${where}: ${out} is listed twice`);
      if (!entry) {
        groups.push({ out, files: [] });
        return;
      }
      if (!out.endsWith('.js') || !entry.endsWith('.js')) throw new Error(`${where}: modules join from a .js file into a .js file`);
      groups.push({ out, files: [take(entry, where)], kind: 'modules' });
      return;
    }
    const group = groups[groups.length - 1];
    if (!group) throw new Error(`${where}: "${s}" comes before any built/ file`);
    if (group.kind) throw new Error(`${where}: ${group.out} joins ${group.files[0]} and what it imports, so nothing is listed under it`);
    group.files.push(take(s, where));
  });
  for (const g of groups) g.kind ??= kindOf(g);
  return groups;
}

// What a built file is made of: 'styles', 'scripts' or 'markup'.
export function kindOf({ out, files }) {
  if (!files.length) throw new Error(`files.txt: nothing is listed under ${out}`);
  const ends = new Set(files.map((f) => extname(f)));
  if (out.endsWith('.css')) {
    if (ends.size === 1 && ends.has('.css')) return 'styles';
    throw new Error(`files.txt: ${out} can only join .css files`);
  }
  if (ends.size === 1 && ends.has('.js')) return 'scripts';
  if (ends.size === 1 && ends.has('.html')) return 'markup';
  throw new Error(`files.txt: ${out} joins either .js files or .html files, not a mix`);
}

const withNewline = (text) => (text.endsWith('\n') ? text : text + '\n');

// Why a stylesheet can't be joined, or null when it can: joined, a comment,
// quote or { left open would swallow the next file, and @import and @charset
// only work at the very top of a file.
export function styleProblem(text) {
  // Escapes, comments and quoted text first, so braces and @ in them don't count.
  const bare = text.replace(/\\.|\/\*.*?\*\/|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'/gs, ' ');
  if (bare.includes('/*')) return 'a comment that never ends';
  if (/["']/.test(bare)) return 'a quote that never ends';
  let depth = 0;
  for (const brace of bare.replace(/[^{}]/g, '')) {
    depth += brace === '{' ? 1 : -1;
    if (depth < 0) return 'a } with no { before it';
  }
  const at = bare.match(/@(import|charset)\b/i);
  if (at) return `@${at[1]} only works at the top of a file`;
  return depth ? 'a { that never closes' : null;
}

export function joinStyles(parts) {
  let out = `/* ${NOTE} */\n`;
  for (const { path, text } of parts) {
    const problem = styleProblem(text);
    if (problem) throw new Error(`${path}: can't be joined: ${problem}`);
    out += `\n/* ---- ${path} ---- */\n${withNewline(text)}`;
  }
  return out;
}

// 'use strict' at the top of a script covers only that file; joined, it would
// cover every file after it, or nothing.
const STRICT = /^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*(["'])use strict\1/;

export function joinScripts(parts) {
  let out = `// ${NOTE}\n`;
  for (const { path, text } of parts) {
    if (STRICT.test(text)) throw new Error(`${path}: can't be joined: it starts with 'use strict' (put it inside a function instead)`);
    // The ; ends the file's last line, so the next file can't run on from it.
    out += `\n// ---- ${path} ----\n${withNewline(text)};\n`;
  }
  return out;
}

// Pieces of the page's markup, in order. Each piece's first line is an HTML
// comment saying what it is; it stays in the piece and isn't joined. The
// built script puts the markup where its own <script> tag is, then takes the
// tag away, so the page ends up as if the markup were written there.
export function joinMarkup(parts) {
  let html = '';
  for (const { path, text } of parts) {
    const cut = text.includes('\n') ? text.indexOf('\n') : text.length;
    if (!/^<!--.*-->$/.test(text.slice(0, cut).trim())) throw new Error(`${path}: the first line should be an HTML comment saying what this piece is`);
    html += text.slice(cut + 1);
  }
  const literal = html.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
  return `// ${NOTE}\n(function () {\n  var here = document.currentScript;\n  here.insertAdjacentHTML('beforebegin', \`${literal}\`);\n  here.remove();\n})();\n`;
}

const JOIN = {
  styles: joinStyles,
  scripts: joinScripts,
  markup: joinMarkup,
  modules: async (parts, appDir) => `// ${NOTE}\n${await joinModules(appDir, parts[0].path)}`,
};

// Every built file of the app in appDir, made fresh: [{ out, text }].
export async function joinApp(appDir) {
  const built = [];
  for (const { out, files, kind } of readList(readFileSync(join(appDir, 'files.txt'), 'utf8'))) {
    const parts = files.map((path) => {
      if (!existsSync(join(appDir, path))) throw new Error(`files.txt lists ${path}, which isn't there`);
      return { path, text: readFileSync(join(appDir, path), 'utf8') };
    });
    built.push({ out, text: await JOIN[kind](parts, appDir) });
  }
  return built;
}

const builtNow = (appDir) => (existsSync(join(appDir, 'built')) ? readdirSync(join(appDir, 'built')).filter((f) => f !== '.DS_Store').map((f) => `built/${f}`) : []);

const isFresh = (appDir, { out, text }) => existsSync(join(appDir, out)) && readFileSync(join(appDir, out), 'utf8') === text;
const unlisted = (appDir, fresh) => builtNow(appDir).filter((f) => !fresh.some(({ out }) => out === f));

// The built files that don't match files.txt: out of date, missing, or no
// longer listed.
export async function staleFiles(appDir) {
  const fresh = await joinApp(appDir);
  return [...fresh.filter((f) => !isFresh(appDir, f)).map(({ out }) => out), ...unlisted(appDir, fresh)];
}

// Brings the app's built/ folder up to date: writes the built files that are
// out of date or missing, removes any no longer listed, leaves the rest alone.
export async function writeApp(appDir) {
  const fresh = await joinApp(appDir);
  const todo = fresh.filter((f) => !isFresh(appDir, f)); // decided before anything is removed
  mkdirSync(join(appDir, 'built'), { recursive: true });
  for (const f of unlisted(appDir, fresh)) rmSync(join(appDir, f));
  for (const { out, text } of todo) writeFileSync(join(appDir, out), text);
  return fresh.map(({ out, text }) => ({ out, lines: text.split('\n').length - 1, changed: todo.some((t) => t.out === out) }));
}

// The apps in the suite: the shelf (the top folder) and every folder beside it
// that has a files.txt.
export function findApps(root) {
  const here = existsSync(join(root, 'files.txt')) ? ['.'] : [];
  const below = readdirSync(root, { withFileTypes: true }).filter((d) => d.isDirectory() && existsSync(join(root, d.name, 'files.txt'))).map((d) => d.name);
  return [...here, ...below];
}
