// A fake GitHub for the sync tests: a repository's files (rounds.json,
// inbox.json) behind a stubbed fetch, answering like the contents API: 404
// for no file, 409 for a write on top of an older version. Not a test file.
import { vi } from 'vitest';

export const REPO = 'owner/rounds-data';
export const KEY = 'test-key';
const b64 = (text) => Buffer.from(text, 'utf8').toString('base64');
export const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', ...headers } });

// files: { 'rounds.json': text }. clashes: { name: n } refuses that file's next n writes.
export function makeGitHub({ repo = REPO, repoExists = true, files = {} } = {}) {
  const gh = { repo, repoExists, files: {}, puts: [], clashes: {}, n: 0 };
  for (const [name, text] of Object.entries(files)) gh.files[name] = { text, sha: `${name}-0` };
  gh.fetch = vi.fn(async (url, init = {}) => {
    const u = new URL(url);
    const method = init.method || 'GET';
    if (u.pathname === `/repos/${gh.repo}`) return gh.repoExists ? json({ full_name: gh.repo }) : json({ message: 'Not Found' }, 404);
    const m = u.pathname.match(new RegExp(`^/repos/${gh.repo}/contents/(.+)$`));
    if (!m || !gh.repoExists) return json({ message: 'Not Found' }, 404);
    const name = m[1];
    const f = gh.files[name];
    if (method === 'GET') {
      if (!f) return json({ message: 'Not Found' }, 404);
      if (init.headers.Accept === 'application/vnd.github.raw') return new Response(f.text, { status: 200 });
      return json({ sha: f.sha, encoding: 'base64', content: b64(f.text).replace(/(.{60})/g, '$1\n') });
    }
    const body = JSON.parse(init.body);
    gh.puts.push({ name, ...body, text: Buffer.from(body.content, 'base64').toString('utf8') });
    if (gh.clashes[name] > 0) {
      gh.clashes[name]--;
      return json({ message: 'conflict' }, 409);
    }
    if (f && !body.sha) return json({ message: 'sha missing' }, 422);
    if ((body.sha || null) !== (f ? f.sha : null)) return json({ message: 'sha mismatch' }, 409);
    gh.n++;
    gh.files[name] = { text: Buffer.from(body.content, 'base64').toString('utf8'), sha: `${name}-${gh.n}` };
    return json({ content: { sha: gh.files[name].sha } }, 201);
  });
  gh.json = (name) => JSON.parse(gh.files[name].text);
  gh.writes = (name) => gh.puts.filter((p) => p.name === name);
  return gh;
}
