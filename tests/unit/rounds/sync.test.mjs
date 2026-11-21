// @vitest-environment node
// rounds/data/sync.js: one sync with rounds.json and inbox.json, against a
// fake GitHub (tests/unit/rounds/_github.mjs) and fake-indexeddb.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { IDBFactory } from 'fake-indexeddb';
import { makeGitHub, REPO, KEY } from './_github.mjs';

let db;
let device;
let sync;
let gh;
const cfg = { repo: REPO, token: KEY, device: 'iPhone' };
const T = (h) => `2026-11-14T${String(h).padStart(2, '0')}:00:00.000Z`;
const at = (h) => vi.setSystemTime(new Date(T(h)));
const roundsFile = (data, extra = {}) => JSON.stringify({ app: 'rounds', version: 1, syncedFrom: 'the Mac', ...extra, data });
const prospect = (id, name, instagram = '') => ({ id, name, instagram, group: 'prospect', letGo: false, next: { kind: 'pitch', due: '2026-11-16', step: 0 } });

async function fresh(files = {}, opts = {}) {
  globalThis.indexedDB = new IDBFactory();
  vi.resetModules();
  db = await import('../../../rounds/data/db.js');
  device = await import('../../../rounds/data/device.js');
  sync = await import('../../../rounds/data/sync.js');
  gh = makeGitHub({ files, ...opts });
  vi.stubGlobal('fetch', gh.fetch);
}
const turnOn = () => device.setMeta('sync', cfg);

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  at(10);
  await fresh();
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('rounds.json', () => {
  it('off until a repository and key are given', async () => {
    expect(await sync.syncNow()).toEqual({ off: true });
    await device.setMeta('sync', { repo: REPO });
    expect(await sync.syncConfig()).toBe(null);
    expect(gh.fetch).not.toHaveBeenCalled();
  });
  it("the first sync writes this phone's data, and remembers it's on", async () => {
    await db.savePerson(prospect('a', 'Ana'));
    await turnOn();
    expect(await sync.syncNow()).toEqual({ changedHere: false, conflicts: 0, newConflicts: 0, leads: 0 });
    const f = gh.json('rounds.json');
    expect(f).toMatchObject({ app: 'rounds', syncedFrom: 'iPhone', exportedAt: T(10) });
    expect(f.data.people).toEqual([expect.objectContaining({ id: 'a', name: 'Ana', nextMove: { kind: 'Pitch', due: '2026-11-16' } })]);
    expect(await device.getMeta('sync')).toEqual({ ...cfg, joined: true, lastSyncAt: T(10), lastError: null, lastErrorKind: null });
    expect(Object.keys(await device.getMeta('syncBase'))).toEqual(['people', 'moves', 'messages', 'settings', 'passed']);
  });
  it('nothing new: no write (no idle commits)', async () => {
    await db.savePerson(prospect('a', 'Ana'));
    await turnOn();
    await sync.syncNow();
    await sync.syncNow();
    expect(gh.writes('rounds.json')).toHaveLength(1);
  });
  it("takes in the other device's changes and sends this one's", async () => {
    await fresh({ 'rounds.json': roundsFile({ people: [{ ...prospect('b', 'Bo'), createdAt: T(1), updatedAt: T(1) }], settings: [{ id: 'city', value: 'Hoboken', updatedAt: T(1) }] }) });
    await db.savePerson(prospect('a', 'Ana'));
    await turnOn();
    expect(await sync.syncNow()).toMatchObject({ changedHere: true });
    expect((await db.listPeople()).map((p) => p.name).sort()).toEqual(['Ana', 'Bo']);
    expect(await db.getSetting('city', '')).toBe('Hoboken');
    expect(gh.json('rounds.json').data.people.map((p) => p.id)).toEqual(['a', 'b']);
  });
  it('another device wrote first: reads again and tries again', async () => {
    await db.savePerson(prospect('a', 'Ana'));
    await turnOn();
    gh.clashes['rounds.json'] = 2;
    await sync.syncNow();
    expect(gh.writes('rounds.json')).toHaveLength(3);
    expect(gh.json('rounds.json').data.people).toHaveLength(1);
  });
  it('after 4 tries it stops, and keeps what went wrong', async () => {
    await db.savePerson(prospect('a', 'Ana'));
    await turnOn();
    gh.clashes['rounds.json'] = 9;
    await expect(sync.syncNow()).rejects.toMatchObject({ kind: 'busy', message: 'Another device kept syncing at the same moment. Rounds tries again shortly.' });
    expect(await device.getMeta('sync')).toMatchObject({ lastError: 'Another device kept syncing at the same moment. Rounds tries again shortly.', lastErrorKind: 'busy', lastErrorAt: T(10) });
    expect(gh.writes('rounds.json')).toHaveLength(4);
  });
  it("a repository with someone else's rounds.json: says so, plainly", async () => {
    await fresh({ 'rounds.json': '{"app":"callback"}' });
    await turnOn();
    await expect(sync.syncNow()).rejects.toMatchObject({ kind: 'server', message: `rounds.json in ${REPO} isn't a Rounds file. Use a repository just for Rounds.` });
  });
  it('a sync that stops with no message says so', async () => {
    await turnOn();
    const spy = vi.spyOn(db, 'exportData');
    gh.fetch.mockImplementationOnce(async () => { throw null; }); // eslint-disable-line no-throw-literal
    await expect(sync.syncNow()).rejects.toMatchObject({ kind: 'offline' });
    spy.mockRejectedValueOnce(undefined);
    await expect(sync.syncNow()).rejects.toMatchObject({ kind: 'server', message: 'Sync stopped partway. Rounds tries again shortly.' });
  });
  it('trying a new repository: an error is not kept, and nothing is saved until it works', async () => {
    await fresh({}, { repoExists: false });
    await expect(sync.syncNow(cfg)).rejects.toMatchObject({ kind: 'repo' });
    expect(await device.getMeta('sync')).toBe(null);
  });
  it('turning off forgets the key and everything sync kept here', async () => {
    await turnOn();
    await sync.syncNow();
    await device.setMeta('leads', [{ id: 'x' }]);
    await sync.turnOff();
    for (const k of ['sync', 'syncBase', 'syncConflicts', 'leads', 'inboxHandled']) expect(await device.getMeta(k)).toBe(null);
    expect(await sync.waitingLeads()).toEqual([]);
  });
});

describe('changed on two devices', () => {
  // Both start from Ana as agreed; then each changes her note.
  async function clash(theirs = { note: 'there' }) {
    await db.savePerson({ ...prospect('a', 'Ana'), note: '' });
    await turnOn();
    await sync.syncNow();
    const f = gh.json('rounds.json');
    f.data.people[0] = { ...f.data.people[0], ...theirs, updatedAt: T(11) };
    gh.files['rounds.json'] = { text: JSON.stringify({ ...f, syncedFrom: 'the Mac' }), sha: 'other' };
    at(12);
    await db.savePerson({ ...(await db.getPerson('a')), note: 'here' });
    return sync.syncNow();
  }
  it("is held and asked about; nothing is overwritten, here or in the file", async () => {
    expect(await clash()).toEqual({ changedHere: false, conflicts: 1, newConflicts: 1, leads: 0 });
    expect((await db.getPerson('a')).note).toBe('here');
    expect(gh.json('rounds.json').data.people[0].note).toBe('there');
    const [c] = await sync.getConflicts();
    expect(c).toMatchObject({ kind: 'both', store: 'people', id: 'a', from: 'the Mac', loud: ['note'], foundAt: T(12) });
    expect(await sync.syncNow()).toMatchObject({ conflicts: 1, newConflicts: 0 });
  });
  it("answered with the other device's: saved here, and out next sync", async () => {
    await clash();
    const [c] = await sync.getConflicts();
    expect(await sync.answer(c, 'theirs')).toEqual({ stale: false });
    expect((await db.getPerson('a')).note).toBe('there');
    expect(await sync.getConflicts()).toEqual([]);
    await sync.syncNow();
    expect(gh.json('rounds.json').data.people[0].note).toBe('there');
    expect(await sync.getConflicts()).toEqual([]);
  });
  it("answered with this phone's: it goes out", async () => {
    await clash();
    const [c] = await sync.getConflicts();
    await sync.answer(c, 'mine');
    await sync.syncNow();
    expect(gh.json('rounds.json').data.people[0].note).toBe('here');
  });
  it('changed again here since: asked afresh', async () => {
    await clash();
    const [c] = await sync.getConflicts();
    at(13);
    await db.savePerson({ ...(await db.getPerson('a')), note: 'again' });
    expect(await sync.answer(c, 'theirs')).toEqual({ stale: true });
    expect((await db.getPerson('a')).note).toBe('again');
  });
  it('the device that wrote it is left out when it was this one', async () => {
    await db.savePerson({ ...prospect('a', 'Ana'), note: '' });
    await turnOn();
    await sync.syncNow();
    const f = gh.json('rounds.json');
    f.data.people[0] = { ...f.data.people[0], note: 'there', updatedAt: T(11) };
    gh.files['rounds.json'] = { text: JSON.stringify(f), sha: 'other' };
    at(12);
    await db.savePerson({ ...(await db.getPerson('a')), note: 'here' });
    await sync.syncNow();
    expect((await sync.getConflicts())[0].from).toBe(null);
  });
});

describe('deleted on one device, changed on the other', () => {
  // A message rewritten, agreed, then deleted on one side and changed on the other.
  async function agreed() {
    await db.saveMessage('pitch', 'v1');
    await turnOn();
    await sync.syncNow();
    return gh.json('rounds.json');
  }
  const put = (f) => { gh.files['rounds.json'] = { text: JSON.stringify(f), sha: `x${Math.random()}` }; };
  it('deleted there, changed here: Keep brings it back everywhere', async () => {
    const f = await agreed();
    f.data.messages = [];
    f.data.tombstones = [{ id: 'pitch', store: 'messages', deletedAt: T(11) }];
    put(f);
    at(12);
    await db.saveMessage('pitch', 'v2');
    await sync.syncNow();
    const [c] = await sync.getConflicts();
    expect(c.kind).toBe('deletedThere');
    await sync.answer(c, 'keep');
    await sync.syncNow();
    expect(await db.getMessages()).toEqual({ pitch: 'v2' });
    expect(gh.json('rounds.json').data.messages.map((m) => m.text)).toEqual(['v2']);
  });
  it('deleted there, changed here: Delete deletes it', async () => {
    const f = await agreed();
    f.data.messages = [];
    f.data.tombstones = [{ id: 'pitch', store: 'messages', deletedAt: T(11) }];
    put(f);
    at(12);
    await db.saveMessage('pitch', 'v2');
    await sync.syncNow();
    await sync.answer((await sync.getConflicts())[0], 'delete');
    expect(await db.getMessages()).toEqual({});
    await sync.syncNow();
    expect(gh.json('rounds.json').data.messages).toEqual([]);
  });
  it('deleted here, changed there: Keep takes theirs back', async () => {
    const f = await agreed();
    at(12);
    await db.resetMessage('pitch');
    f.data.messages = [{ ...f.data.messages[0], text: 'there', updatedAt: T(11) }];
    put(f);
    await sync.syncNow();
    const [c] = await sync.getConflicts();
    expect(c.kind).toBe('deletedHere');
    await sync.answer(c, 'keep');
    expect(await db.getMessages()).toEqual({ pitch: 'there' });
    expect((await db.exportData()).tombstones).toEqual([]);
  });
  it('deleted here, changed there: Delete keeps it deleted', async () => {
    const f = await agreed();
    at(12);
    await db.resetMessage('pitch');
    f.data.messages = [{ ...f.data.messages[0], text: 'there', updatedAt: T(11) }];
    put(f);
    await sync.syncNow();
    await sync.answer((await sync.getConflicts())[0], 'delete');
    expect(await db.getMessages()).toEqual({});
    await sync.syncNow();
    expect(gh.json('rounds.json').data.messages).toEqual([]);
  });
  it('a deletion that has gone already: Delete adds none', async () => {
    const f = await agreed();
    at(12);
    await db.resetMessage('pitch');
    f.data.messages = [{ ...f.data.messages[0], text: 'there', updatedAt: T(11) }];
    put(f);
    await sync.syncNow();
    const [c] = await sync.getConflicts();
    await db.applySync({}, { tombstones: ['pitch'] });
    await sync.answer(c, 'delete');
    expect((await db.exportData()).tombstones.map((t) => t.id)).toEqual(['pitch']);
  });
  it('kept, but gone from here meanwhile: nothing to put back', async () => {
    const f = await agreed();
    f.data.messages = [];
    f.data.tombstones = [{ id: 'pitch', store: 'messages', deletedAt: T(11) }];
    put(f);
    at(12);
    await db.saveMessage('pitch', 'v2');
    await sync.syncNow();
    const [c] = await sync.getConflicts();
    await db.applySync({}, { messages: ['pitch'] });
    expect(await sync.answer(c, 'keep')).toEqual({ stale: false });
    await db.applySync({}, { messages: ['pitch'] });
    await sync.answer({ ...c, store: 'messages' }, 'delete');
    expect(await db.getMessages()).toEqual({});
  });
  it('answered with no agreed copy kept at all', async () => {
    await db.saveMessage('pitch', 'v1');
    const c = { kind: 'both', store: 'messages', id: 'pitch', mine: (await db.exportData()).messages[0], theirs: { id: 'pitch', text: 'x' }, merged: { text: 'v1' }, clashes: ['text'] };
    await sync.answer(c, 'theirs');
    expect(await db.getMessages()).toEqual({ pitch: 'x' });
    expect(await device.getMeta('syncBase')).toEqual({ messages: { pitch: { id: 'pitch', text: 'x' } } });
  });
});

describe('inbox.json', () => {
  const lead = (id, f = {}) => ({ id, type: 'lead', added: '2026-11-14', found_by: 'agencies', name: `Lead ${id}`, ...f });
  it("no inbox yet: no leads, and Rounds doesn't make one", async () => {
    await turnOn();
    await sync.syncNow();
    expect(await sync.waitingLeads()).toEqual([]);
    expect(gh.files['inbox.json']).toBeUndefined();
  });
  it('leads wait here to be looked at; the inbox keeps them until then', async () => {
    await fresh({ 'inbox.json': JSON.stringify([lead('1'), lead('2')]) });
    await turnOn();
    expect(await sync.syncNow()).toMatchObject({ leads: 2 });
    expect((await sync.waitingLeads()).map((e) => e.id)).toEqual(['1', '2']);
    expect(gh.writes('inbox.json')).toEqual([]);
  });
  it('looked at: off the inbox at the next sync, never offered again', async () => {
    await fresh({ 'inbox.json': JSON.stringify([lead('1'), lead('2'), lead('3')]) });
    await turnOn();
    await sync.syncNow();
    await sync.leadsHandled(['1', '2']);
    await sync.leadsHandled(['2']);
    expect((await sync.waitingLeads()).map((e) => e.id)).toEqual(['3']);
    expect(await device.getMeta('inboxHandled')).toEqual(['1', '2']);
    await sync.syncNow();
    expect(gh.json('inbox.json').map((e) => e.id)).toEqual(['3']);
    expect(await device.getMeta('inboxHandled')).toEqual([]);
  });
  it('a lead passed on before comes off at once', async () => {
    await fresh({ 'inbox.json': JSON.stringify([lead('1', { instagram: 'old' }), lead('2')]) });
    await db.addPassed([{ id: 'x', name: 'Old', instagram: 'old' }]);
    await turnOn();
    await sync.syncNow();
    expect(gh.json('inbox.json').map((e) => e.id)).toEqual(['2']);
  });
  it("a draft marks its person's move, and comes off", async () => {
    await fresh({ 'inbox.json': JSON.stringify([{ id: 'd', type: 'drafted', added: '2026-11-16', match: '@abrams', kind: 'Pitch', where: 'Gmail' }, { id: 'e', type: 'drafted', match: 'Bo', kind: 'Pitch' }]) });
    await db.savePeople([prospect('a', 'Abrams', 'abrams'), { ...prospect('b', 'Bo'), next: { kind: 'checkin', due: '2026-11-16', step: 0 } }]);
    await turnOn();
    expect(await sync.syncNow()).toMatchObject({ changedHere: true });
    expect((await db.getPerson('a')).draft).toEqual({ kind: 'pitch', where: 'Gmail', added: '2026-11-16' });
    expect((await db.getPerson('b')).draft).toBeUndefined();
    expect(gh.json('inbox.json')).toEqual([]);
  });
  it('Claude adding at the same moment: reads again and takes off the same', async () => {
    await fresh({ 'inbox.json': JSON.stringify([lead('1', { name: '' })]) });
    await turnOn();
    gh.clashes['inbox.json'] = 1;
    await sync.syncNow();
    expect(gh.writes('inbox.json')).toHaveLength(2);
    expect(gh.json('inbox.json')).toEqual([]);
  });
  it('and if it keeps happening, tries again later', async () => {
    await fresh({ 'inbox.json': JSON.stringify([lead('1', { name: '' })]) });
    await turnOn();
    gh.clashes['inbox.json'] = 9;
    globalThis.DF_SUITE = { get: () => null }; // inside the suite (window, in the browser)
    await expect(sync.syncNow()).rejects.toMatchObject({ kind: 'busy', message: 'Claude was adding to the inbox at the same moment. Rounds tries again shortly.' });
    // On its own (rounds/STANDALONE.md), Rounds' words never mention Claude.
    delete globalThis.DF_SUITE;
    gh.clashes['inbox.json'] = 9;
    await expect(sync.syncNow()).rejects.toMatchObject({ kind: 'busy', message: 'Something else was adding to the inbox at the same moment. Rounds tries again shortly.' });
  });
  it("an inbox Rounds can't read is left alone", async () => {
    await fresh({ 'inbox.json': '{"not": "a list"}' });
    await turnOn();
    await sync.syncNow();
    expect(gh.files['inbox.json'].text).toBe('{"not": "a list"}');
    expect(gh.writes('inbox.json')).toEqual([]);
  });
});
