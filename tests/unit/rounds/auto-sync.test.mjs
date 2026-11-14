// rounds/data/auto-sync.js: when Rounds syncs (on open, 4 s after a save,
// back at the front, back online, every 2 minutes, leaving with a change
// unsent), one at a time. The sync itself is stood in for.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const fake = vi.hoisted(() => ({ heard: null, results: [], answers: [] }));
vi.mock('../../../rounds/data/db.js', () => ({ onSyncedChange: (fn) => { fake.heard = fn; } }));
vi.mock('../../../rounds/data/sync.js', () => ({
  syncNow: vi.fn(async (cfg) => {
    const r = fake.results.shift() || { changedHere: false };
    if (r instanceof Error) throw r;
    return { ...r, cfg };
  }),
  answer: vi.fn(async (c, side) => { fake.answers.push([c.id, side]); return { stale: false }; }),
}));

let auto;
let sync;
let handler;
const flush = async () => { for (let i = 0; i < 5; i++) await Promise.resolve(); };
const visibility = (v) => Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => v });

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  fake.results = [];
  fake.answers = [];
  visibility('visible');
  auto = await import('../../../rounds/data/auto-sync.js');
  sync = await import('../../../rounds/data/sync.js');
  sync.syncNow.mockClear();
  handler = vi.fn();
});
afterEach(() => { auto.stopAutoSync(); vi.useRealTimers(); });

async function tick(ms) {
  await vi.advanceTimersByTimeAsync(ms);
  await flush();
}

describe('startAutoSync', () => {
  it('syncs as Rounds opens, and passes on how it went', async () => {
    auto.startAutoSync(handler);
    await tick(0);
    expect(sync.syncNow).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ changedHere: false, cfg: null });
  });
  it('sync off: nothing passed on', async () => {
    fake.results = [{ off: true }];
    auto.startAutoSync(handler);
    await tick(0);
    expect(handler).not.toHaveBeenCalled();
  });
  it('an error is passed on', async () => {
    const err = new Error('offline');
    fake.results = [err];
    auto.startAutoSync(handler);
    await tick(0);
    expect(handler).toHaveBeenCalledWith({ error: err });
  });
  it('4 s after a save, once however many saves', async () => {
    auto.startAutoSync(handler);
    await tick(0);
    fake.heard();
    await tick(2000);
    fake.heard();
    await tick(3999);
    expect(sync.syncNow).toHaveBeenCalledTimes(1);
    await tick(1);
    expect(sync.syncNow).toHaveBeenCalledTimes(2);
  });
  it('back at the front, if a while since the last', async () => {
    auto.startAutoSync(handler);
    await tick(0);
    document.dispatchEvent(new Event('visibilitychange'));
    await tick(0);
    expect(sync.syncNow).toHaveBeenCalledTimes(1);
    await tick(16000);
    document.dispatchEvent(new Event('visibilitychange'));
    await tick(0);
    expect(sync.syncNow).toHaveBeenCalledTimes(2);
  });
  it('the window back in focus, if a while since the last', async () => {
    auto.startAutoSync(handler);
    await tick(0);
    window.dispatchEvent(new Event('focus'));
    await tick(0);
    expect(sync.syncNow).toHaveBeenCalledTimes(1);
    await tick(16000);
    window.dispatchEvent(new Event('focus'));
    await tick(0);
    expect(sync.syncNow).toHaveBeenCalledTimes(2);
  });
  it('leaving with a change unsent sends it now; leaving with none, nothing', async () => {
    auto.startAutoSync(handler);
    await tick(0);
    visibility('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    await tick(0);
    expect(sync.syncNow).toHaveBeenCalledTimes(1);
    fake.heard();
    document.dispatchEvent(new Event('visibilitychange'));
    await tick(0);
    expect(sync.syncNow).toHaveBeenCalledTimes(2);
  });
  it('back online', async () => {
    auto.startAutoSync(handler);
    await tick(0);
    window.dispatchEvent(new Event('online'));
    await tick(0);
    expect(sync.syncNow).toHaveBeenCalledTimes(2);
  });
  it('every 2 minutes while on screen', async () => {
    auto.startAutoSync(handler);
    await tick(0);
    // (A timer set while timers run starts a millisecond later.)
    await tick(120000);
    await tick(1);
    expect(sync.syncNow).toHaveBeenCalledTimes(2);
    visibility('hidden');
    await tick(120000);
    await tick(1);
    expect(sync.syncNow).toHaveBeenCalledTimes(2);
  });
});

describe('stopAutoSync', () => {
  it('stops every way it syncs, and a sync waiting to go', async () => {
    auto.startAutoSync(handler);
    await tick(0);
    fake.heard();
    auto.stopAutoSync();
    fake.heard();
    window.dispatchEvent(new Event('online'));
    await tick(130000);
    expect(sync.syncNow).toHaveBeenCalledTimes(1);
  });
  it('starting again starts afresh, never twice over', async () => {
    auto.startAutoSync(handler);
    auto.startAutoSync(handler);
    await tick(0);
    window.dispatchEvent(new Event('online'));
    await tick(0);
    expect(sync.syncNow).toHaveBeenCalledTimes(2);
  });
});

describe('one at a time', () => {
  it('queued syncs run after one another, a new key tried as given', async () => {
    let release;
    sync.syncNow.mockImplementationOnce(() => new Promise((r) => { release = r; }));
    const first = auto.queued();
    const second = auto.queued({ repo: 'a/b' });
    await flush();
    expect(sync.syncNow).toHaveBeenCalledTimes(1);
    release({ changedHere: true });
    expect(await first).toEqual({ changedHere: true });
    expect(await second).toEqual({ changedHere: false, cfg: { repo: 'a/b' } });
  });
  it('a failed sync does not stop the next', async () => {
    fake.results = [new Error('x')];
    await expect(auto.queued()).rejects.toThrow('x');
    await expect(auto.queued()).resolves.toMatchObject({ changedHere: false });
  });
  it('a clash answered waits its turn, then syncs at once', async () => {
    auto.startAutoSync(handler);
    await tick(0);
    expect(await auto.resolve({ id: 'a' }, 'theirs')).toEqual({ stale: false });
    expect(fake.answers).toEqual([['a', 'theirs']]);
    await tick(0);
    expect(sync.syncNow).toHaveBeenCalledTimes(2);
  });
  it('a sync asked for before auto sync starts still runs', async () => {
    auto.request(0);
    await tick(0);
    expect(sync.syncNow).toHaveBeenCalledTimes(1);
  });
});
