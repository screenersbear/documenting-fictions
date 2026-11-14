// @vitest-environment node
// rounds/data/github.js: the one file that talks to GitHub, reading and
// writing a file in the sync repository, its errors in plain words.
import { describe, it, expect, vi, afterEach } from 'vitest';
import { SyncError, validRepo, repoOf, toBase64, fromBase64, readFile, writeFile } from '../../../rounds/data/github.js';
import { makeGitHub, json, REPO, KEY } from './_github.mjs';

const cfg = { repo: REPO, token: KEY, device: 'iPhone' };
const answer = (res) => vi.stubGlobal('fetch', vi.fn(async () => res));
afterEach(() => vi.unstubAllGlobals());

describe('the repository', () => {
  it('validRepo: owner/name only', () => {
    expect(validRepo('owner/rounds-data')).toBe(true);
    expect(validRepo('o.w_n-er/re.po')).toBe(true);
    for (const r of ['owner', 'owner/', '/repo', 'a/b/c', 'https://github.com/a/b', 'a b/c', '']) expect(validRepo(r)).toBe(false);
  });
  it('repoOf trims a github.com address down to owner/name', () => {
    expect(repoOf('https://github.com/owner/rounds-data')).toBe('owner/rounds-data');
    expect(repoOf('  github.com/owner/rounds-data.git ')).toBe('owner/rounds-data');
    expect(repoOf('http://www.GitHub.com/owner/rounds-data/tree/main')).toBe('owner/rounds-data');
    expect(repoOf('owner/rounds-data/')).toBe('owner/rounds-data');
    expect(repoOf('owner/rounds-data')).toBe('owner/rounds-data');
    expect(repoOf(null)).toBe('');
  });
});

describe('base64', () => {
  it('carries accents, emoji and long text there and back', () => {
    for (const t of ['', 'plain', 'José Núñez ✨', 'x'.repeat(100000)]) expect(fromBase64(toBase64(t))).toBe(t);
    expect(toBase64('hi')).toBe('aGk=');
    expect(fromBase64('aG\nk=')).toBe('hi');
  });
});

describe('readFile', () => {
  it("a file's text and version, with the key", async () => {
    const gh = makeGitHub({ files: { 'rounds.json': 'José' } });
    vi.stubGlobal('fetch', gh.fetch);
    expect(await readFile(cfg, 'rounds.json')).toEqual({ sha: 'rounds.json-0', text: 'José' });
    const [url, init] = gh.fetch.mock.calls[0];
    expect(url).toBe(`https://api.github.com/repos/${REPO}/contents/rounds.json`);
    expect(init.headers).toEqual({ Authorization: `Bearer ${KEY}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' });
    expect(init.cache).toBe('no-store');
  });
  it('no file yet in a repository that is there: no text', async () => {
    vi.stubGlobal('fetch', makeGitHub().fetch);
    expect(await readFile(cfg, 'inbox.json')).toEqual({ sha: null, text: null });
  });
  it('no repository: says so', async () => {
    vi.stubGlobal('fetch', makeGitHub({ repoExists: false }).fetch);
    await expect(readFile(cfg, 'rounds.json')).rejects.toMatchObject({ kind: 'repo', message: `GitHub can't find ${REPO}, or the key can't see it. Check the name, and that the key was given that repository.` });
  });
  it('over 1 MB, asks for the file itself', async () => {
    const fetch = vi.fn()
      .mockResolvedValueOnce(json({ sha: 's1', encoding: 'none', content: '' }))
      .mockResolvedValueOnce(new Response('big text', { status: 200 }));
    vi.stubGlobal('fetch', fetch);
    expect(await readFile(cfg, 'rounds.json')).toEqual({ sha: 's1', text: 'big text' });
    expect(fetch.mock.calls[1][1].headers.Accept).toBe('application/vnd.github.raw');
  });
  it("over 1 MB and that fails: GitHub's error", async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(json({ sha: 's1', encoding: 'base64' })).mockResolvedValueOnce(json({}, 500)));
    await expect(readFile(cfg, 'rounds.json')).rejects.toMatchObject({ kind: 'server' });
  });
  it('each error from GitHub, in plain words', async () => {
    answer(json({}, 401));
    await expect(readFile(cfg, 'x')).rejects.toMatchObject({ kind: 'auth', message: expect.stringContaining('turned the key down') });
    answer(json({}, 403, { 'x-ratelimit-remaining': '0' }));
    await expect(readFile(cfg, 'x')).rejects.toMatchObject({ kind: 'server', message: 'GitHub asked Rounds to slow down. It tries again in a few minutes.' });
    answer(json({}, 403, { 'x-ratelimit-remaining': '12' }));
    await expect(readFile(cfg, 'x')).rejects.toMatchObject({ kind: 'auth', message: `The key isn't allowed to change ${REPO}. Give it Contents: Read and write for that repository.` });
    answer(json({}, 502));
    await expect(readFile(cfg, 'x')).rejects.toMatchObject({ kind: 'server', message: 'GitHub answered with an error (502). Rounds tries again by itself.' });
  });
  it('offline: says Rounds tries again', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    const e = await readFile(cfg, 'x').catch((x) => x);
    expect(e).toBeInstanceOf(SyncError);
    expect(e).toMatchObject({ kind: 'offline', message: "Couldn't reach GitHub. Rounds tries again once you're online." });
  });
});

describe('writeFile', () => {
  it('writes a new file, saying which device', async () => {
    const gh = makeGitHub();
    vi.stubGlobal('fetch', gh.fetch);
    expect(await writeFile(cfg, 'rounds.json', 'José', null)).toBe('rounds.json-1');
    expect(gh.puts[0]).toMatchObject({ message: 'Sync from iPhone', text: 'José' });
    expect('sha' in gh.puts[0]).toBe(false);
    expect(gh.fetch.mock.calls[0][1].headers['Content-Type']).toBe('application/json');
  });
  it('writes on top of the version read', async () => {
    const gh = makeGitHub({ files: { 'rounds.json': 'old' } });
    vi.stubGlobal('fetch', gh.fetch);
    expect(await writeFile({ ...cfg, device: '' }, 'rounds.json', 'new', 'rounds.json-0')).toBe('rounds.json-1');
    expect(gh.puts[0]).toMatchObject({ message: 'Sync from a device', sha: 'rounds.json-0' });
    expect(gh.files['rounds.json'].text).toBe('new');
  });
  it('someone else wrote first: null, to read again', async () => {
    const gh = makeGitHub({ files: { 'rounds.json': 'old' } });
    vi.stubGlobal('fetch', gh.fetch);
    expect(await writeFile(cfg, 'rounds.json', 'new', 'stale')).toBe(null);
    expect(await writeFile(cfg, 'rounds.json', 'new', null)).toBe(null);
    expect(gh.files['rounds.json'].text).toBe('old');
  });
  it('another error throws', async () => {
    answer(json({}, 401));
    await expect(writeFile(cfg, 'x', 't', null)).rejects.toMatchObject({ kind: 'auth' });
  });
});
