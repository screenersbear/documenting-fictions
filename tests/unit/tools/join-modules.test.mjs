// @vitest-environment node
// tools/join-modules.mjs: joining an app's ES modules into one file that runs
// the same as the modules did on their own. (Plain Node, not a pretend page:
// rolldown and running the joined file need nothing from a browser.)
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fromBuilt, metaProblem, joinModules } from '../../../tools/join-modules.mjs';

const BUILT = '/x/app/built';

describe('fromBuilt', () => {
  it('makes a path beside a module start from built/', () => {
    expect(fromBuilt("new Worker(new URL('./worker.js', import.meta.url))", '/x/app/data/tagger.js', BUILT)).toBe("new Worker(new URL('../data/worker.js', import.meta.url))");
  });
  it('handles going up a folder, double quotes, a folder and more than one', () => {
    expect(fromBuilt('new URL("../ml/", import.meta.url)', '/x/app/pages/deep/w.js', BUILT)).toBe('new URL("../pages/ml/", import.meta.url)');
    expect(fromBuilt("a(new URL('./a.png', import.meta.url), new URL('./b.png', import.meta.url))", '/x/app/app.js', BUILT)).toBe("a(new URL('../a.png', import.meta.url), new URL('../b.png', import.meta.url))");
  });
  it('leaves everything else alone', () => {
    const code = "new URL('https://x.org/a.js', import.meta.url); new URL('./a.js', location.href); new URL(\"./a.js', import.meta.url); const u = './a.js';";
    expect(fromBuilt(code, '/x/app/data/a.js', BUILT)).toBe(code);
    expect(fromBuilt('', '/x/app/a.js', BUILT)).toBe('');
  });
});

describe('metaProblem', () => {
  it('finds nothing without import.meta, or with only new URL for a file beside it', () => {
    expect(metaProblem('')).toBe(null);
    expect(metaProblem('export const a = 1;')).toBe(null);
    expect(metaProblem("new Worker(new URL('./w.js', import.meta.url), { type: 'module' })")).toBe(null);
  });
  it('finds any other import.meta', () => {
    expect(metaProblem('console.log(import.meta.url)')).toBe("it uses import.meta for something other than new URL('./file', import.meta.url)");
    expect(metaProblem("new URL('./w.js', import.meta.url); import.meta.resolve('./x.js')")).toMatch(/import\.meta for something other/);
    expect(metaProblem('new URL(base, import.meta.url)')).toMatch(/import\.meta for something other/);
    expect(metaProblem("new URL('./a.js', import.meta.url); new URL('./b.js', import.meta.url); import.meta.url")).toMatch(/import\.meta for something other/);
  });
});

describe('joinModules', () => {
  let dir;
  const put = (path, text) => { mkdirSync(join(dir, path, '..'), { recursive: true }); writeFileSync(join(dir, path), text); };
  // What a file prints when Node runs it as an ES module.
  const run = (path) => execFileSync(process.execPath, [join(dir, path)], { encoding: 'utf8' });
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'join-modules-'));
    put('package.json', '{ "type": "module" }\n');
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it('runs every module once, in the same order as on their own', async () => {
    put('app.js', "import './pages/a.js';\nimport { b } from './pages/b.js';\nconsole.log('app', b);\n");
    put('pages/a.js', "import { c } from '../components/c.js';\nconsole.log('a', c);\n");
    put('pages/b.js', "import { c } from '../components/c.js';\nconsole.log('b');\nexport const b = c + 1;\n");
    put('components/c.js', "console.log('c');\nexport const c = 1;\n");
    put('built/app.js', await joinModules(dir, 'app.js'));
    expect(run('app.js')).toBe('c\na 1\nb\napp 2\n');
    expect(run('built/app.js')).toBe(run('app.js'));
  });
  it('writes nothing itself: it only hands back the joined text', async () => {
    put('app.js', "console.log('app');\n");
    await joinModules(dir, 'app.js');
    expect(readdirSync(dir).sort()).toEqual(['app.js', 'package.json']);
  });
  it('keeps code nothing uses, and every function its own name', async () => {
    put('app.js', "import { name as a } from './pages/a.js';\nimport { name as b } from './pages/b.js';\nconsole.log(a(), b());\n");
    put('pages/a.js', "function same() {}\nfunction unused() { return 'kept'; }\nexport const name = () => same.name;\n");
    put('pages/b.js', 'function same() {}\nexport const name = () => same.name;\n');
    const code = await joinModules(dir, 'app.js');
    put('built/app.js', code);
    expect(run('built/app.js')).toBe('same same\n');
    expect(code).toContain('function unused()');
  });
  it('labels each module with its path in the app, wherever it runs from', async () => {
    put('app.js', "import './pages/a.js';\n");
    put('pages/a.js', "console.log('a');\n");
    const code = await joinModules(dir, 'app.js');
    expect(code).toContain('// pages/a.js');
    expect(code).not.toContain('private');
  });
  it('makes paths beside a module start from built/, and leaves that file out', async () => {
    put('app.js', "import { start } from './data/tagger.js';\nstart;\n");
    put('data/tagger.js', "export const start = () => new Worker(new URL('./tagger-worker.js', import.meta.url), { type: 'module' });\n");
    put('data/tagger-worker.js', "console.log('worker');\n");
    const code = await joinModules(dir, 'app.js');
    expect(code).toContain('new URL("../data/tagger-worker.js", import.meta.url)');
    expect(code).not.toContain("console.log('worker')");
  });
  it('refuses any other import.meta, naming the file', async () => {
    put('app.js', "import './data/a.js';\n");
    put('data/a.js', 'console.log(import.meta.url);\n');
    await expect(joinModules(dir, 'app.js')).rejects.toThrow(/\[plugin from-built\][^\n]*\nError: data\/a\.js: can't be joined: it uses import\.meta for something other/);
  });
  it('refuses code rolldown warns about', async () => {
    put('app.js', "eval('1');\n");
    await expect(joinModules(dir, 'app.js')).rejects.toThrow(/^app\.js: can't be joined: .*eval/i);
  });
  it('refuses a module loaded with import(), which would stay a file of its own', async () => {
    put('app.js', "import('./pages/later.js');\n");
    put('pages/later.js', 'export const x = 1;\n');
    await expect(joinModules(dir, 'app.js')).rejects.toThrow("app.js: can't be joined into one file: a module loads another with import()");
  });
  it('refuses an import of something that is not there', async () => {
    put('app.js', "import { nope } from './pages/a.js';\nconsole.log(nope);\n");
    put('pages/a.js', 'export const a = 1;\n');
    await expect(joinModules(dir, 'app.js')).rejects.toThrow(/nope/);
    put('app.js', "import './pages/gone.js';\n");
    await expect(joinModules(dir, 'app.js')).rejects.toThrow(/gone\.js/);
  });
});
