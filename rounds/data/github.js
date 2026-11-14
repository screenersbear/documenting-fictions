// The one file that talks to GitHub (Callback's design): reading and writing
// a file in the sync repository through GitHub's contents API, with the
// repository and the key the person gave in Options (cfg: { repo, token,
// device }). One day this can sit behind a proper sign-in instead.

const GITHUB = 'https://api.github.com';

export class SyncError extends Error {
  constructor(message, kind) {
    super(message);
    this.kind = kind; // offline, auth, repo, file, busy, server
  }
}

export const validRepo = (repo) => /^[\w.-]+\/[\w.-]+$/.test(repo);
// owner/name, from that or a github.com address.
export function repoOf(text) {
  const t = String(text ?? '').trim().replace(/^(https?:\/\/)?(www\.)?github\.com\//i, '').replace(/\.git$/i, '').replace(/\/+$/, '');
  return t.split('/').slice(0, 2).join('/');
}

async function call(cfg, path, { accept = 'application/vnd.github+json', ...opts } = {}) {
  const headers = { Authorization: `Bearer ${cfg.token}`, Accept: accept, 'X-GitHub-Api-Version': '2022-11-28' };
  if (opts.body) headers['Content-Type'] = 'application/json';
  try {
    return await fetch(`${GITHUB}${path}`, { cache: 'no-store', ...opts, headers });
  } catch {
    throw new SyncError("Couldn't reach GitHub. Rounds tries again once you're online.", 'offline');
  }
}

function explain(res, cfg) {
  if (res.status === 401) return new SyncError('GitHub turned the key down. Check you copied all of it; if it expired or was deleted, make a new one and paste it in.', 'auth');
  if (res.status === 403 && res.headers.get('x-ratelimit-remaining') === '0') return new SyncError('GitHub asked Rounds to slow down. It tries again in a few minutes.', 'server');
  if (res.status === 403) return new SyncError(`The key isn't allowed to change ${cfg.repo}. Give it Contents: Read and write for that repository.`, 'auth');
  if (res.status === 404) return new SyncError(`GitHub can't find ${cfg.repo}, or the key can't see it. Check the name, and that the key was given that repository.`, 'repo');
  return new SyncError(`GitHub answered with an error (${res.status}). Rounds tries again by itself.`, 'server');
}

// Base64 of the UTF-8 text, as GitHub wants it (names can have accents).
export function toBase64(text) {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
export function fromBase64(b64) {
  const bin = atob(b64.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

// A file's text and version ({ sha, text }); text null when there's no file
// yet (the repository is there). No repository, or no key for it, throws.
export async function readFile(cfg, name) {
  const path = `/repos/${cfg.repo}/contents/${name}`;
  const res = await call(cfg, path);
  if (res.status === 404) {
    const repo = await call(cfg, `/repos/${cfg.repo}`);
    if (repo.ok) return { sha: null, text: null };
    throw explain(repo, cfg);
  }
  if (!res.ok) throw explain(res, cfg);
  const meta = await res.json();
  if (meta.encoding === 'base64' && meta.content) return { sha: meta.sha, text: fromBase64(meta.content) };
  // Over 1 MB GitHub leaves the content out; ask for the file itself.
  const raw = await call(cfg, path, { accept: 'application/vnd.github.raw' });
  if (!raw.ok) throw explain(raw, cfg);
  return { sha: meta.sha, text: await raw.text() };
}

// Writes a file on top of the version read (sha). Its new version, or null
// when someone else wrote first (read again, then try again).
export async function writeFile(cfg, name, text, sha) {
  const body = { message: `Sync from ${cfg.device || 'a device'}`, content: toBase64(text) };
  if (sha) body.sha = sha;
  const res = await call(cfg, `/repos/${cfg.repo}/contents/${name}`, { method: 'PUT', body: JSON.stringify(body) });
  if (res.status === 409 || res.status === 422) return null;
  if (!res.ok) throw explain(res, cfg);
  return (await res.json()).content.sha;
}
