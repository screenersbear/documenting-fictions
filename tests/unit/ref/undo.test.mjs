// ref/js/undo.js: one undo list (newest last, at most 30) for filing, favorites
// and deleting. library.js and ui.js are mocked: only the list logic is tested.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const h = vi.hoisted(() => ({ refresh: vi.fn(), toast: vi.fn() }));
vi.mock('../../../ref/js/library.js', () => ({ refresh: h.refresh }));
vi.mock('../../../ref/js/ui.js', () => ({ toast: h.toast }));

let undo, events, onUndo;
beforeEach(async () => {
  vi.resetModules(); // the stack lives in the module: start each test empty
  h.refresh.mockReset().mockResolvedValue(undefined);
  h.toast.mockReset();
  events = [];
  onUndo = (e) => events.push({ e, toasts: h.toast.mock.calls.length });
  window.addEventListener('ref-undo', onUndo);
  undo = await import('../../../ref/js/undo.js');
});
afterEach(() => {
  window.removeEventListener('ref-undo', onUndo);
  vi.restoreAllMocks();
});

const deferred = () => { let resolve; const promise = new Promise((r) => { resolve = r; }); return { promise, resolve }; };

describe('canUndo', () => {
  it('is false with nothing remembered', () => {
    expect(undo.canUndo()).toBe(false);
  });
  it('is true once something is remembered', () => {
    undo.remember('Filed 1 photo', () => {});
    expect(undo.canUndo()).toBe(true);
  });
  it('is false again once the last thing is undone', async () => {
    undo.remember('Filed 1 photo', () => {});
    await undo.undoLast();
    expect(undo.canUndo()).toBe(false);
  });
});

describe('remember', () => {
  it('tells the page the list changed, once per call', () => {
    undo.remember('a', () => {});
    undo.remember('b', () => {});
    expect(events).toHaveLength(2);
    expect(events[0].e).toBeInstanceOf(Event);
    expect(events[0].e.type).toBe('ref-undo');
  });
  it('does not run the undo straight away', () => {
    const run = vi.fn();
    undo.remember('a', run);
    expect(run).not.toHaveBeenCalled();
  });
  it('keeps all of exactly 30 things', async () => {
    const runs = Array.from({ length: 30 }, () => vi.fn());
    runs.forEach((r, i) => undo.remember(`step ${i}`, r));
    for (let i = 0; i < 30; i++) expect(await undo.undoLast()).toBe(true);
    expect(await undo.undoLast()).toBe(false);
    runs.forEach((r) => expect(r).toHaveBeenCalledTimes(1));
  });
  it('drops the oldest once there are more than 30', async () => {
    const runs = Array.from({ length: 31 }, () => vi.fn());
    runs.forEach((r, i) => undo.remember(`step ${i}`, r));
    for (let i = 0; i < 30; i++) expect(await undo.undoLast()).toBe(true);
    expect(await undo.undoLast()).toBe(false);
    expect(runs[0]).not.toHaveBeenCalled();
    expect(runs[1]).toHaveBeenCalledTimes(1);
    expect(h.toast).toHaveBeenLastCalledWith('Undid: step 1');
  });
  it('keeps a label even when it is empty', async () => {
    undo.remember('', () => {});
    await undo.undoLast();
    expect(h.toast).toHaveBeenCalledWith('Undid: ');
  });
});

describe('undoLast', () => {
  it('returns false and does nothing when there is nothing to undo', async () => {
    expect(await undo.undoLast()).toBe(false);
    expect(h.refresh).not.toHaveBeenCalled();
    expect(h.toast).not.toHaveBeenCalled();
    expect(events).toHaveLength(0);
  });
  it('runs the newest undo, reloads the library and says what it undid', async () => {
    const older = vi.fn(), newer = vi.fn();
    undo.remember('Filed 2 photos', older);
    undo.remember('Deleted 3 photos', newer);
    events.length = 0;
    expect(await undo.undoLast()).toBe(true);
    expect(newer).toHaveBeenCalledTimes(1);
    expect(older).not.toHaveBeenCalled();
    expect(h.refresh).toHaveBeenCalledTimes(1);
    expect(h.toast).toHaveBeenCalledTimes(1);
    expect(h.toast).toHaveBeenCalledWith('Undid: Deleted 3 photos');
    expect(undo.canUndo()).toBe(true);
  });
  it('tells the page the list changed after the message', async () => {
    undo.remember('a', () => {});
    events.length = 0;
    await undo.undoLast();
    expect(events).toHaveLength(1);
    expect(events[0].e.type).toBe('ref-undo');
    expect(events[0].toasts).toBe(1);
  });
  it('waits for the undo to finish before reloading', async () => {
    const d = deferred();
    undo.remember('a', () => d.promise);
    const p = undo.undoLast();
    await Promise.resolve();
    await Promise.resolve();
    expect(h.refresh).not.toHaveBeenCalled();
    d.resolve();
    expect(await p).toBe(true);
    expect(h.refresh).toHaveBeenCalledTimes(1);
  });
  it('waits for the reload before saying it is done', async () => {
    const d = deferred();
    h.refresh.mockReturnValue(d.promise);
    undo.remember('a', () => {});
    const p = undo.undoLast();
    await Promise.resolve();
    await Promise.resolve();
    expect(h.toast).not.toHaveBeenCalled();
    d.resolve();
    await p;
    expect(h.toast).toHaveBeenCalledWith('Undid: a');
  });
  it('says it could not undo when the undo fails, and still drops it', async () => {
    const err = new Error('disk full');
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    undo.remember('Filed 1 photo', () => Promise.reject(err));
    expect(await undo.undoLast()).toBe(true);
    expect(log).toHaveBeenCalledWith(err);
    expect(h.toast).toHaveBeenCalledTimes(1);
    expect(h.toast).toHaveBeenCalledWith('Could not undo that');
    expect(h.refresh).not.toHaveBeenCalled();
    expect(undo.canUndo()).toBe(false);
    expect(events.at(-1).e.type).toBe('ref-undo');
  });
  it('handles an undo that throws straight away', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    undo.remember('x', () => { throw new TypeError('boom'); });
    expect(await undo.undoLast()).toBe(true);
    expect(log.mock.calls[0][0]).toBeInstanceOf(TypeError);
    expect(h.toast).toHaveBeenCalledWith('Could not undo that');
  });
  it('says it could not undo when the reload fails', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {});
    h.refresh.mockRejectedValue(new Error('db closed'));
    undo.remember('x', () => {});
    expect(await undo.undoLast()).toBe(true);
    expect(log).toHaveBeenCalledTimes(1);
    expect(h.toast.mock.calls).toEqual([['Could not undo that']]);
  });
  it('undoes newest first, one per call', async () => {
    const order = [];
    for (const l of ['a', 'b', 'c']) undo.remember(l, () => order.push(l));
    await undo.undoLast();
    await undo.undoLast();
    expect(order).toEqual(['c', 'b']);
    expect(undo.canUndo()).toBe(true);
  });
});
