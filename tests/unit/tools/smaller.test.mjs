// tools/smaller.mjs: taking the notes and extra spaces out of a built file,
// and asking for it with "smaller" in files.txt (tools/join-files.mjs).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { smallerStyles, smallerScript } from '../../../tools/smaller.mjs';
import { NOTE, readList, joinStyles, joinScripts, joinApp } from '../../../tools/join-files.mjs';

describe('smallerStyles', () => {
  it('takes out comments, blank lines and the spaces at the start and end of lines', () => {
    expect(smallerStyles('/* The base look */\n.a {\n  color: red; /* why */  \n}\n\n\n  .b { margin: 0 auto; }\n')).toBe('.a {\ncolor: red;\n}\n.b { margin: 0 auto; }\n');
  });
  it('keeps the spaces inside a line, which some rules need', () => {
    expect(smallerStyles('.a .b { width: calc(100% - 2px); }')).toBe('.a .b { width: calc(100% - 2px); }');
  });
  it('takes out a comment at the very start or end, and each of two comments on a line', () => {
    expect(smallerStyles('/* a */.x{}')).toBe('.x{}');
    expect(smallerStyles('.x{}/* a */')).toBe('.x{}');
    expect(smallerStyles('/* a */ .x{} /* b */')).toBe(' .x{} ');
    expect(smallerStyles('.x{}\n/* one */ .y{} /* two */\n')).toBe('.x{}\n.y{}\n');
  });
  it('keeps a comment with no space on either side, which keeps two things apart', () => {
    expect(smallerStyles('.c{margin:0/**/auto}')).toBe('.c{margin:0/**/auto}');
    expect(smallerStyles('a /* gone */b c/* gone */ d')).toBe('a b c d');
  });
  it('leaves quoted text as it is, comments and spaces in it too', () => {
    expect(smallerStyles('.b::before { content: "/* no */  x"; }')).toBe('.b::before { content: "/* no */  x"; }');
    expect(smallerStyles(".b::before { content: '/* no */  x'; }")).toBe(".b::before { content: '/* no */  x'; }");
    expect(smallerStyles('.q { content: "a\\"/* in */"; } /* out */\n')).toBe('.q { content: "a\\"/* in */"; }\n');
    expect(smallerStyles(".q { content: 'it\\'s /* in */'; }")).toBe(".q { content: 'it\\'s /* in */'; }");
  });
  it('keeps an escaped line break, in quotes or out', () => {
    expect(smallerStyles('.a { content: "one\\\n   two"; }')).toBe('.a { content: "one\\\n   two"; }');
    expect(smallerStyles(".a { content: 'one\\\n   two'; }")).toBe(".a { content: 'one\\\n   two'; }");
    expect(smallerStyles('.a\\\n  b {}')).toBe('.a\\\n  b {}');
  });
  it("doesn't take an escaped quote for the start of quoted text", () => {
    expect(smallerStyles('.x\\"y { } /* gone */ .z { content: "q" }')).toBe('.x\\"y { }  .z { content: "q" }');
  });
  it('ends quoted text left open at its line, as the browser does', () => {
    expect(smallerStyles('.a { content: "open\n/* gone */ "; }')).toBe('.a { content: "open\n"; }');
  });
  it('quotes inside a comment are part of the comment', () => {
    expect(smallerStyles(".a { color: red; } /* it's \"fine\" */\n.b {}")).toBe('.a { color: red; }\n.b {}');
  });
  it('gives nothing for nothing, or for only comments and spaces', () => {
    expect(smallerStyles('')).toBe('');
    expect(smallerStyles('/* only a note */\n\n  \n')).toBe('');
  });
});

describe('smallerScript', () => {
  it('takes out comments and spaces, and keeps every name and the code as written', () => {
    expect(smallerScript('a.js', '// note\nfunction add(first, second) {\n  /* sum */ return first + second;\n}\nif (ready) { start(); }\n')).toBe('function add(first,second){return first+second}if(ready){start()}');
  });
  it('keeps the text inside quotes and template strings', () => {
    expect(smallerScript('a.js', 'var t = `line one\n  line two ${a}`;\nvar s = "two  spaces";')).toBe('var t=`line one\n  line two ${a}`;var s=`two  spaces`;');
  });
  it("keeps 'use strict' inside a function", () => {
    expect(smallerScript('a.js', 'function f() {\n  "use strict";\n  return 1;\n}')).toBe('function f(){"use strict";return 1}');
  });
  it('reads a script as a script, and a module as a module', () => {
    expect(smallerScript('a.js', 'var await = 1;')).toBe('var await=1;');
    expect(() => smallerScript('a.js', 'var await = 1;', true)).toThrow("a.js: can't be made smaller: Cannot use `await` as an identifier");
    expect(smallerScript('m.js', "import { a } from './a.js';\nexport const b = a;\n", true)).toBe('import{a}from"./a.js";export const b=a;');
  });
  it("refuses a script that doesn't read as code, naming it", () => {
    expect(() => smallerScript('pages/x.js', 'function (')).toThrow("pages/x.js: can't be made smaller:");
  });
  it('gives nothing for nothing', () => {
    expect(smallerScript('a.js', '')).toBe('');
    expect(smallerScript('a.js', '// only a note\n')).toBe('');
  });
});

describe('"smaller" in files.txt', () => {
  it('is read after a built file, of any kind but markup', () => {
    expect(readList('built/a.css smaller\n  a.css\nbuilt/b.js smaller\n  b.js\nbuilt/app.js from app.js smaller\n')).toEqual([
      { out: 'built/a.css', files: ['a.css'], kind: 'styles', smaller: true },
      { out: 'built/b.js', files: ['b.js'], kind: 'scripts', smaller: true },
      { out: 'built/app.js', files: ['app.js'], kind: 'modules', smaller: true },
    ]);
    expect(readList('built/a.css\n  a.css\n')).toEqual([{ out: 'built/a.css', files: ['a.css'], kind: 'styles' }]);
  });
  it('refuses it for markup, and anything else after the name', () => {
    expect(() => readList('built/markup.js smaller\n  pages/a.html\n')).toThrow("files.txt: built/markup.js is markup, which can't be made smaller");
    expect(() => readList('built/a.css tiny\n  a.css\n')).toThrow('files.txt line 1: "built/a.css tiny" should be a file in built/ ending in .js or .css (or "built/app.js from app.js"), then "smaller" if it should be');
    expect(() => readList('built/a.css smaller smaller\n  a.css\n')).toThrow('should be a file in built/');
  });
});

describe('joining smaller', () => {
  const css = [{ path: 'styles/a.css', text: '/* The look */\n.a {\n  color: red;\n}\n' }];
  const js = [{ path: 'a.js', text: '// Starts it\nstart(1, 2);\n' }];
  it('stylesheets: each is smaller, under its name, after the note', () => {
    expect(joinStyles(css, true)).toBe(`/* ${NOTE} */\n\n/* ---- styles/a.css ---- */\n.a {\ncolor: red;\n}\n`);
    expect(joinStyles(css)).toBe(`/* ${NOTE} */\n\n/* ---- styles/a.css ---- */\n/* The look */\n.a {\n  color: red;\n}\n`);
  });
  it('scripts: each is smaller, under its name, ended with a ;', () => {
    expect(joinScripts(js, true)).toBe(`// ${NOTE}\n\n// ---- a.js ----\nstart(1,2);\n;\n`);
    expect(joinScripts(js)).toBe(`// ${NOTE}\n\n// ---- a.js ----\n// Starts it\nstart(1, 2);\n;\n`);
  });
  it("still refuses what can't be joined", () => {
    expect(() => joinStyles([{ path: 'styles/a.css', text: 'a {' }], true)).toThrow("styles/a.css: can't be joined: a { that never closes");
    expect(() => joinScripts([{ path: 'a.js', text: '"use strict";\nx()' }], true)).toThrow("a.js: can't be joined: it starts with 'use strict'");
  });
});

describe('joinApp with smaller files', () => {
  let dir;
  const put = (path, text) => { mkdirSync(join(dir, path, '..'), { recursive: true }); writeFileSync(join(dir, path), text); };
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'smaller-test-'));
    put('styles/a.css', '/* The look */\n.a {\n  color: red;\n}\n');
    put('app.js', '// Starts it\nstart(1, 2);\n');
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('makes the files marked smaller, and leaves the others as they are', async () => {
    put('files.txt', 'built/app.css smaller\n  styles/a.css\nbuilt/app.js\n  app.js\n');
    const [styles, scripts] = await joinApp(dir);
    expect(styles.text).toBe(`/* ${NOTE} */\n\n/* ---- styles/a.css ---- */\n.a {\ncolor: red;\n}\n`);
    expect(scripts.text).toBe(`// ${NOTE}\n\n// ---- app.js ----\n// Starts it\nstart(1, 2);\n;\n`);
  });
  it('makes joined ES modules smaller', async () => {
    put('files.txt', 'built/app.js from app.js smaller\n');
    put('app.js', "import { hi } from './pages/hi.js';\n// Says hi\nhi();\n");
    put('pages/hi.js', "export function hi() {\n  document.title = 'hi';\n}\n");
    const [{ text }] = await joinApp(dir);
    // rolldown's helper that keeps each function's name comes first.
    expect(text.startsWith(`// ${NOTE}\nvar __defProp=`)).toBe(true);
    expect(text.endsWith('function hi(){document.title=`hi`}hi();\n')).toBe(true);
    expect(text).not.toContain('Says hi');
    expect(text.split('\n')).toHaveLength(3);
  });
});
