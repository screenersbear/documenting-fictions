// Joins each app's small files into the few files its page loads (its built/
// folder), as its files.txt lists them. Run it after changing, adding or
// removing any file listed in a files.txt:
//   node tools/join.mjs            every app
//   node tools/join.mjs the-eye    one app (. is the shelf)
// The push check fails while a built/ folder is out of date.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findApps, writeApp } from './join-files.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const apps = process.argv.length > 2 ? process.argv.slice(2) : findApps(root);
for (const app of apps) {
  for (const { out, lines, changed } of await writeApp(join(root, app))) console.log(`${app === '.' ? 'shelf' : app}: ${out} (${lines} lines${changed ? ', joined again' : ', up to date'})`);
}
