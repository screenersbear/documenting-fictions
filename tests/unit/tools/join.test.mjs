// tools/join-files.mjs: reading files.txt, joining styles, scripts and markup
// (ES modules: join-modules.test.mjs), and the check that every app's built/ folder is up to date.
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { JSDOM } from 'jsdom';
import { NOTE, readList, kindOf, styleProblem, joinStyles, joinScripts, joinMarkup, joinApp, staleFiles, writeApp, findApps } from '../../../tools/join-files.mjs';

// The tests run from the suite's top folder.
const ROOT = process.cwd();

// Inside Stryker's mutation sandbox (on GitHub) the logic files are rewritten
// on purpose, each carrying its mutants, so no built/ can match them there and
// the whole mutation run stopped before it began. The real files are checked
// everywhere else: these unit tests on this Mac, the push check and GitHub's
// unit job.
const MUTATING = !!process.env.STRYKER_MUTATOR_WORKER;

describe('every app in the suite', () => {
  it('finds the shelf and the notebooks', () => {
    expect(findApps(ROOT)).toEqual(expect.arrayContaining(['.', 'ref', 'contact-sheet', 'overthoughts', 'rounds']));
  });
  it.each(MUTATING ? [] : findApps(ROOT))('%s: built/ matches files.txt (run node tools/join.mjs if not)', async (app) => {
    expect(await staleFiles(join(ROOT, app))).toEqual([]);
  });
});

describe('readList', () => {
  it('reads built files and the files under each, in order', () => {
    const list = readList('# notes\n\nbuilt/app.css\n  styles/a.css\n  styles/b.css\nbuilt/app.js\n\tpages/x.js\n');
    expect(list).toEqual([
      { out: 'built/app.css', files: ['styles/a.css', 'styles/b.css'], kind: 'styles' },
      { out: 'built/app.js', files: ['pages/x.js'], kind: 'scripts' },
    ]);
  });
  it('allows spaces after a built file name, and notes between files', () => {
    expect(readList('built/m.js  \n  # a note\n  pages/a.html\n')).toEqual([{ out: 'built/m.js', files: ['pages/a.html'], kind: 'markup' }]);
  });
  it('gives nothing for an empty list', () => {
    expect(readList('')).toEqual([]);
    expect(readList('# only notes\n\n')).toEqual([]);
  });
  it('refuses a built file outside built/ or of another kind', () => {
    expect(() => readList('app.css\n  a.css')).toThrow('files.txt line 1: "app.css" should be a file in built/');
    expect(() => readList('built/a.txt\n  a.txt')).toThrow('should be a file in built/ ending in .js or .css');
    expect(() => readList('built/sub/a.js\n  a.js')).toThrow('should be a file in built/');
    expect(() => readList('old/built/a.js\n  a.js')).toThrow('"old/built/a.js" should be a file in built/');
    expect(() => readList('built/app.css.map\n  a.css')).toThrow('"built/app.css.map" should be a file in built/');
  });
  it('refuses a built file listed twice', () => {
    expect(() => readList('built/a.js\n  a.js\nbuilt/a.js\n  b.js')).toThrow('files.txt line 3: built/a.js is listed twice');
  });
  it('refuses a file before any built file', () => {
    expect(() => readList('  styles/a.css\nbuilt/a.css')).toThrow('files.txt line 1: "styles/a.css" comes before any built/ file');
  });
  it('refuses files outside the app or inside built/', () => {
    expect(() => readList('built/a.js\n  ../suite.js')).toThrow('"../suite.js" should be a file in this app, outside built/');
    expect(() => readList('built/a.js\n  /etc/x.js')).toThrow('should be a file in this app');
    expect(() => readList('built/a.js\n  built/b.js')).toThrow('should be a file in this app');
    expect(() => readList('built/a.js\n  pages/../x.js')).toThrow('should be a file in this app');
  });
  it('refuses a file listed twice, even under two built files', () => {
    expect(() => readList('built/a.js\n  x.js\n  x.js')).toThrow('files.txt line 3: x.js is listed twice');
    expect(() => readList('built/a.js\n  x.js\nbuilt/b.js\n  x.js')).toThrow('files.txt line 4: x.js is listed twice');
  });
  it('reads a built file joined from an ES module and all it imports', () => {
    expect(readList('built/app.css\n  styles/a.css\nbuilt/app.js from app.js\n')).toEqual([
      { out: 'built/app.css', files: ['styles/a.css'], kind: 'styles' },
      { out: 'built/app.js', files: ['app.js'], kind: 'modules' },
    ]);
    expect(readList('built/app.js from pages/start.js  \n# a note\n')).toEqual([{ out: 'built/app.js', files: ['pages/start.js'], kind: 'modules' }]);
  });
  it('refuses files listed under a module join', () => {
    expect(() => readList('built/app.js from app.js\n  pages/a.js\n')).toThrow('files.txt line 2: built/app.js joins app.js and what it imports, so nothing is listed under it');
  });
  it('refuses a module join that is not from a .js file into a .js file', () => {
    expect(() => readList('built/app.css from app.js')).toThrow('files.txt line 1: modules join from a .js file into a .js file');
    expect(() => readList('built/app.js from app.mjs')).toThrow('modules join from a .js file into a .js file');
    expect(() => readList('built/app.js from styles/a.css')).toThrow('modules join from a .js file');
  });
  it('refuses a module join from outside the app, from two files, or listed twice', () => {
    expect(() => readList('built/app.js from ../suite.js')).toThrow('"../suite.js" should be a file in this app, outside built/');
    expect(() => readList('built/app.js from built/x.js')).toThrow('should be a file in this app');
    expect(() => readList('built/app.js from a.js b.js')).toThrow('"built/app.js from a.js b.js" should be a file in built/');
    expect(() => readList('built/app.js from')).toThrow('should be a file in built/');
    expect(() => readList('built/a.js\n  app.js\nbuilt/b.js from app.js')).toThrow('files.txt line 3: app.js is listed twice');
    expect(() => readList('built/app.js from app.js\nbuilt/app.js from b.js')).toThrow('files.txt line 2: built/app.js is listed twice');
  });
});

describe('kindOf', () => {
  it('names styles, scripts and markup', () => {
    expect(kindOf({ out: 'built/a.css', files: ['a.css', 'b.css'] })).toBe('styles');
    expect(kindOf({ out: 'built/a.js', files: ['a.js'] })).toBe('scripts');
    expect(kindOf({ out: 'built/a.js', files: ['a.html', 'b.html'] })).toBe('markup');
    expect(kindOf({ out: 'built/a.js', files: ['pages/old.html.js'] })).toBe('scripts');
  });
  it('refuses an empty built file', () => {
    expect(() => kindOf({ out: 'built/a.js', files: [] })).toThrow('nothing is listed under built/a.js');
  });
  it('refuses the wrong kind of file in a stylesheet', () => {
    expect(() => kindOf({ out: 'built/a.css', files: ['a.css', 'b.js'] })).toThrow('built/a.css can only join .css files');
    expect(() => kindOf({ out: 'built/a.css', files: ['a.html'] })).toThrow('can only join .css files');
    expect(() => kindOf({ out: 'built/a.css', files: ['a.css.bak'] })).toThrow('can only join .css files');
    expect(() => kindOf({ out: 'built/a.css', files: ['css'] })).toThrow('can only join .css files');
  });
  it('refuses a mix, or other files, in a script', () => {
    expect(() => kindOf({ out: 'built/a.js', files: ['a.js', 'b.html'] })).toThrow('either .js files or .html files');
    expect(() => kindOf({ out: 'built/a.js', files: ['a.txt'] })).toThrow('either .js files or .html files');
    expect(() => kindOf({ out: 'built/a.js', files: ['a.css'] })).toThrow('either .js files or .html files');
  });
});

describe('styleProblem', () => {
  it('passes ordinary stylesheets', () => {
    expect(styleProblem('')).toBe(null);
    expect(styleProblem('a { color: red; }\n@media (min-width: 1px) { b { c: d } }')).toBe(null);
    expect(styleProblem('a::before { content: "{"; } b::after { content: \'}\' }')).toBe(null);
    expect(styleProblem('/* { */ a { b: url(x.png) }')).toBe(null);
    expect(styleProblem('a::before { content: "say \\"{\\"" }')).toBe(null);
    expect(styleProblem('.a\\{b { c: d }')).toBe(null);
    expect(styleProblem('a { b: "@import" } /* @charset */')).toBe(null);
    expect(styleProblem('a { content: "/*" } b { content: \'*/\' }')).toBe(null);
    expect(styleProblem('/* it\'s "{" */ a {}')).toBe(null);
    expect(styleProblem("a::before { content: 'x\\'y' }")).toBe(null);
    // A backslash at the end of a line carries a quote on to the next.
    expect(styleProblem('a::before { content: "x\\\ny" }')).toBe(null);
    expect(styleProblem("a::before { content: 'x\\\ny' }")).toBe(null);
    expect(styleProblem('.a\\\n{ b: c }')).toBe(null);
    // What's taken out leaves a space, so the text around it can't join up.
    expect(styleProblem('a { b: c//* x */*d }')).toBe(null);
    expect(styleProblem('a{} @"x"import')).toBe(null);
  });
  it('finds a comment or quote left open', () => {
    expect(styleProblem('a { b: c } /* note')).toBe('a comment that never ends');
    expect(styleProblem('a { content: "x }')).toBe('a quote that never ends');
    expect(styleProblem("a { content: 'x\n}")).toBe('a quote that never ends');
    expect(styleProblem("a { content: 'x\n}' }")).toBe('a quote that never ends');
    expect(styleProblem('a { content: "x\n}" }')).toBe('a quote that never ends');
    expect(styleProblem('/* open "x" ')).toBe('a comment that never ends');
  });
  it('finds braces that do not pair up', () => {
    expect(styleProblem('a { b: c')).toBe('a { that never closes');
    expect(styleProblem('a { b: c } }')).toBe('a } with no { before it');
    expect(styleProblem('} a {')).toBe('a } with no { before it');
  });
  it('finds @import and @charset, which only work at the top', () => {
    expect(styleProblem('@import url(x.css);')).toBe('@import only works at the top of a file');
    expect(styleProblem('a{}\n@charset "utf-8";')).toBe('@charset only works at the top of a file');
    expect(styleProblem('@IMPORT "x.css";')).toBe('@IMPORT only works at the top of a file');
    expect(styleProblem('@importer {}')).toBe(null);
    expect(styleProblem('a { b: c }\nd { e: f }\n@import "x.css";')).toBe('@import only works at the top of a file');
    expect(styleProblem('a{}@charset')).toBe('@charset only works at the top of a file');
  });
});

describe('joinStyles', () => {
  it('joins stylesheets in order, each under its name', () => {
    expect(joinStyles([{ path: 'styles/a.css', text: 'a { b: c }\n' }, { path: 'styles/b.css', text: 'd { e: f }' }])).toBe(
      `/* ${NOTE} */\n\n/* ---- styles/a.css ---- */\na { b: c }\n\n/* ---- styles/b.css ---- */\nd { e: f }\n`,
    );
  });
  it('makes just the note from no stylesheets', () => {
    expect(joinStyles([])).toBe(`/* ${NOTE} */\n`);
  });
  it('refuses a stylesheet that would spill into the next', () => {
    expect(() => joinStyles([{ path: 'styles/a.css', text: 'a {' }])).toThrow("styles/a.css: can't be joined: a { that never closes");
  });
});

describe('joinScripts', () => {
  it('joins scripts in order, each ended with a ;', () => {
    expect(joinScripts([{ path: 'a.js', text: 'var a = 1\n' }, { path: 'b.js', text: '(function () {})()' }])).toBe(
      `// ${NOTE}\n\n// ---- a.js ----\nvar a = 1\n;\n\n// ---- b.js ----\n(function () {})()\n;\n`,
    );
  });
  it('keeps a last line that is a comment from swallowing the ;', () => {
    expect(joinScripts([{ path: 'a.js', text: 'x() // done' }])).toContain('x() // done\n;\n');
  });
  it("refuses a script that starts with 'use strict'", () => {
    for (const text of ["'use strict';\nx()", '"use strict"', '// note\n/* more */\n  "use strict";']) {
      expect(() => joinScripts([{ path: 'a.js', text }])).toThrow("a.js: can't be joined: it starts with 'use strict'");
    }
  });
  it("allows 'use strict' inside a function, or after code", () => {
    expect(() => joinScripts([{ path: 'a.js', text: "(function () { 'use strict'; })();" }, { path: 'b.js', text: "x(); 'use strict';" }])).not.toThrow();
  });
});

describe('joinMarkup', () => {
  const run = (pieces) => {
    const dom = new JSDOM(`<body>\n<p id="before"></p>\n<script>${joinMarkup(pieces)}</script><div id="toast"></div>\n</body>`, { runScripts: 'dangerously' });
    return dom.window.document.body.innerHTML;
  };
  it('puts the joined markup where its script was, without the notes, and removes the script', () => {
    const html = run([{ path: 'pages/a.html', text: '<!-- The first piece -->\n<div id="app">\n' }, { path: 'pages/b.html', text: '<!-- The second piece -->\n  <p>hi</p>\n</div>\n\n' }]);
    expect(html).toBe('\n<p id="before"></p>\n<div id="app">\n  <p>hi</p>\n</div>\n\n<div id="toast"></div>\n');
  });
  it('keeps backslashes, backticks and ${ as they are', () => {
    expect(run([{ path: 'a.html', text: '<!-- x -->\n<p title="a\\b `c` ${d}">e</p>' }])).toContain('<p title="a\\b `c` ${d}">e</p><div id="toast">');
  });
  it('allows a piece that is only its note', () => {
    expect(run([{ path: 'a.html', text: '<!-- x -->' }, { path: 'b.html', text: '<!-- y -->\n<i></i>' }])).toContain('<p id="before"></p>\n<i></i><div id="toast">');
  });
  it('refuses a piece whose first line is not an HTML comment', () => {
    expect(() => joinMarkup([{ path: 'pages/a.html', text: '<div>\n' }])).toThrow('pages/a.html: the first line should be an HTML comment');
    expect(() => joinMarkup([{ path: 'pages/a.html', text: '' }])).toThrow('first line should be an HTML comment');
    expect(() => joinMarkup([{ path: 'pages/a.html', text: '<!-- open\n-->\n' }])).toThrow('first line should be an HTML comment');
    expect(() => joinMarkup([{ path: 'pages/a.html', text: 'text <!-- x -->\n' }])).toThrow('first line should be an HTML comment');
    expect(() => joinMarkup([{ path: 'pages/a.html', text: '<!-- x --> <div>\n' }])).toThrow('first line should be an HTML comment');
  });
  it('allows spaces around the note', () => {
    expect(run([{ path: 'a.html', text: '  <!-- x -->  \n<i></i>' }])).toContain('<p id="before"></p>\n<i></i><div id="toast">');
  });
});

describe('joinApp, staleFiles and writeApp', () => {
  let dir;
  const put = (path, text) => { mkdirSync(join(dir, path, '..'), { recursive: true }); writeFileSync(join(dir, path), text); };
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'join-test-'));
    put('files.txt', 'built/app.css\n  styles/a.css\nbuilt/app.js\n  app.js\nbuilt/markup.js\n  pages/home.html\n');
    put('styles/a.css', 'a { b: c }\n');
    put('app.js', 'start();\n');
    put('pages/home.html', '<!-- Home -->\n<main></main>\n');
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('makes every built file from its list', async () => {
    const made = await joinApp(dir);
    expect(made.map((m) => m.out)).toEqual(['built/app.css', 'built/app.js', 'built/markup.js']);
    expect(made[0].text).toContain('/* ---- styles/a.css ---- */\na { b: c }\n');
    expect(made[1].text).toContain('// ---- app.js ----\nstart();\n;\n');
    expect(made[2].text).toContain('<main></main>');
  });
  it('refuses a listed file that is missing', async () => {
    put('files.txt', 'built/app.js\n  app.js\n  gone.js\n');
    await expect(joinApp(dir)).rejects.toThrow("files.txt lists gone.js, which isn't there");
  });
  it('joins ES modules from their first file (tools/join-modules.mjs does the joining)', async () => {
    put('files.txt', 'built/app.css\n  styles/a.css\nbuilt/app.js from app.js\n');
    put('app.js', "import { hi } from './pages/hi.js';\nhi();\n");
    put('pages/hi.js', "export function hi() { document.title = 'hi'; }\n");
    const made = await joinApp(dir);
    expect(made.map((m) => m.out)).toEqual(['built/app.css', 'built/app.js']);
    expect(made[1].text.startsWith(`// ${NOTE}\n`)).toBe(true);
    expect(made[1].text).toContain('function hi()');
    put('files.txt', 'built/app.js from gone.js\n');
    await expect(joinApp(dir)).rejects.toThrow("files.txt lists gone.js, which isn't there");
  });
  it('finds every built file stale before the first join, and none after', async () => {
    expect(await staleFiles(dir)).toEqual(['built/app.css', 'built/app.js', 'built/markup.js']);
    expect(await writeApp(dir)).toEqual([{ out: 'built/app.css', lines: 4, changed: true }, { out: 'built/app.js', lines: 5, changed: true }, { out: 'built/markup.js', lines: 7, changed: true }]);
    expect(await staleFiles(dir)).toEqual([]);
  });
  it('leaves built files that are up to date alone', async () => {
    await writeApp(dir);
    expect((await writeApp(dir)).map((m) => m.changed)).toEqual([false, false, false]);
    expect(readdirSync(join(dir, 'built')).sort()).toEqual(['app.css', 'app.js', 'markup.js']);
    expect(await staleFiles(dir)).toEqual([]);
  });
  it('finds a built file that is out of date after a change', async () => {
    await writeApp(dir);
    put('app.js', 'start(1);\n');
    expect(await staleFiles(dir)).toEqual(['built/app.js']);
    expect((await writeApp(dir)).map((m) => m.changed)).toEqual([false, true, false]);
    expect(readFileSync(join(dir, 'built/app.js'), 'utf8')).toContain('start(1);');
  });
  it('finds, then removes, a built file no longer listed, and ignores .DS_Store', async () => {
    await writeApp(dir);
    put('built/old.js', 'x');
    put('built/.DS_Store', 'x');
    expect(await staleFiles(dir)).toEqual(['built/old.js']);
    await writeApp(dir);
    expect(existsSync(join(dir, 'built/old.js'))).toBe(false);
    expect(readdirSync(join(dir, 'built')).sort()).toEqual(['.DS_Store', 'app.css', 'app.js', 'markup.js']);
  });
  it('finds the apps: the top folder and folders with a files.txt', async () => {
    put('ref/files.txt', 'built/a.js\n  a.js\n');
    put('notes/readme.md', 'x');
    expect(findApps(dir)).toEqual(['.', 'ref']);
    put('the-eye/files.txt', 'built/a.js\n  a.js\n');
    expect(findApps(dir).sort()).toEqual(['.', 'ref', 'the-eye']);
    rmSync(join(dir, 'files.txt'));
    expect(findApps(dir).sort()).toEqual(['ref', 'the-eye']);
  });
});
