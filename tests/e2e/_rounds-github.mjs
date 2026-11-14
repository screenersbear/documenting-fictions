// A fake GitHub for the Rounds sync browser tests: the sync repository's
// files (rounds.json, inbox.json) answered like GitHub's contents API, so
// nothing reaches the real one. Not a test file.
export const REPO = 'owner/rounds-data';

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, PUT, OPTIONS',
  'access-control-allow-headers': 'authorization, accept, content-type, x-github-api-version',
  'access-control-expose-headers': 'x-ratelimit-remaining',
};

// files: { 'inbox.json': text }. Returns gh: gh.json(name) reads a file back,
// gh.change(name, fn) changes it as another device would, gh.reads counts
// each file's reads (a sync reads inbox.json last).
export async function fakeGitHub(ctx, files = {}) {
  const gh = { files: {}, n: 0, reads: {} };
  for (const [name, text] of Object.entries(files)) gh.files[name] = { text, sha: `${name}-0` };
  const reply = (route, status, body) => route.fulfill({ status, headers: { ...CORS, 'content-type': 'application/json' }, body: JSON.stringify(body) });
  await ctx.route('https://api.github.com/**', async (route) => {
    const req = route.request();
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    const path = new URL(req.url()).pathname;
    if (path === `/repos/${REPO}`) return reply(route, 200, { full_name: REPO });
    const m = path.match(new RegExp(`^/repos/${REPO}/contents/(.+)$`));
    if (!m) return reply(route, 404, { message: 'Not Found' });
    const f = gh.files[m[1]];
    if (req.method() === 'GET') {
      gh.reads[m[1]] = (gh.reads[m[1]] || 0) + 1;
      if (!f) return reply(route, 404, { message: 'Not Found' });
      return reply(route, 200, { sha: f.sha, encoding: 'base64', content: Buffer.from(f.text, 'utf8').toString('base64') });
    }
    const body = JSON.parse(req.postData());
    if ((body.sha || null) !== (f ? f.sha : null)) return reply(route, 409, { message: 'sha mismatch' });
    gh.n++;
    gh.files[m[1]] = { text: Buffer.from(body.content, 'base64').toString('utf8'), sha: `${m[1]}-${gh.n}` };
    return reply(route, 201, { content: { sha: gh.files[m[1]].sha } });
  });
  gh.json = (name) => (gh.files[name] ? JSON.parse(gh.files[name].text) : null);
  gh.change = (name, fn) => {
    gh.n++;
    gh.files[name] = { text: JSON.stringify(fn(gh.json(name)), null, 2), sha: `${name}-${gh.n}` };
  };
  return gh;
}
