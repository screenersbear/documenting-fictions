// Joins an app's ES modules into one file: app.js, every module it imports,
// every module those import, and so on. Each still runs once, in the same
// order as when the browser loaded them one by one. A files.txt line like
// "built/app.js from app.js" asks for this; tools/join-files.mjs calls it.
// The joining is done by rolldown (the tool Vite uses), with nothing left out
// (not even code that looks unused) and every function keeping its name.
import { dirname, relative, resolve, join, sep } from 'node:path';
import { realpathSync } from 'node:fs';
import { build } from 'rolldown';

// new URL('./x.js', import.meta.url) finds a file beside the module that says
// it. Joined, import.meta.url is the built file's, in built/, so the path is
// changed to start from there.
const FILE_URL = /new URL\((['"])(\.{1,2}\/[^'"]*)\1, import\.meta\.url\)/g;

export function fromBuilt(code, file, builtDir) {
  return code.replace(FILE_URL, (_, quote, path) => {
    const to = relative(builtDir, resolve(dirname(file), path)).split(sep).join('/') + (path.endsWith('/') ? '/' : '');
    return `new URL(${quote}${to}${quote}, import.meta.url)`;
  });
}

// What fromBuilt can't change: any other import.meta, which would mean
// something else once joined.
export function metaProblem(code) {
  const uses = (code.match(/import\.meta/g) ?? []).length;
  const fileUrls = (code.match(FILE_URL) ?? []).length;
  return uses > fileUrls ? 'it uses import.meta for something other than new URL(\'./file\', import.meta.url)' : null;
}

// The joined modules of the app in appDir, starting from entry (app.js).
export async function joinModules(appDir, entry) {
  const home = realpathSync(appDir); // rolldown names each module by its real path, not by a shortcut to it
  const notes = [];
  const { output } = await build({
    input: join(home, entry),
    cwd: home, // so each module's label is its path in the app, wherever this runs
    treeshake: false,
    onLog: (level, log) => notes.push(log.message),
    plugins: [{
      name: 'from-built',
      transform(code, id) {
        const problem = metaProblem(code);
        if (problem) throw new Error(`${relative(home, id)}: can't be joined: ${problem}`);
        return fromBuilt(code, id, join(home, 'built'));
      },
    }],
    write: false, // only hand back the joined text: join-files.mjs writes it
    output: { format: 'esm', keepNames: true, minify: false },
  });
  if (notes.length) throw new Error(`${entry}: can't be joined: ${notes[0]}`);
  if (output.length > 1) throw new Error(`${entry}: can't be joined into one file: a module loads another with import(), which would stay a file of its own`);
  return output[0].code;
}
