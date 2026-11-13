// shared/df-data.js: The Eye's data read from where it keeps it (eyeState,
// eyeShootName, eyeBackupFile, readEyeFile) and the Journal's one-time move
// to Overthoughts (journalMoved, somethingToMove, moveJournal).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadDFData, makeDb, rawAll, rawOpen, dbList, expectError } from './_env.mjs';

let D;
const NOW = new Date(2026, 10, 12, 10, 0, 0).getTime();
beforeEach(async () => {
  D = await loadDFData();
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

const setState = (st) => localStorage.setItem('dailies_state_v1', JSON.stringify(st));
const eyePhotos = (rows) => makeDb('starky-moodboards', { images: { rows } });

describe('eyeState', () => {
  it("reads The Eye's state from localStorage", () => {
    setState({ shoots: [{ id: 1 }], titleDisplayMode: 'title' });
    expect(D.eyeState()).toEqual({ shoots: [{ id: 1 }], titleDisplayMode: 'title' });
  });
  it('is null when there is none, or it is empty', () => {
    expect(D.eyeState()).toBeNull();
    localStorage.setItem('dailies_state_v1', '');
    expect(D.eyeState()).toBeNull();
  });
  it('is null when it is not JSON', () => {
    localStorage.setItem('dailies_state_v1', '{not json');
    expect(D.eyeState()).toBeNull();
  });
  it('is null when localStorage cannot be read (private mode)', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    expect(D.eyeState()).toBeNull();
  });
});

describe('eyeShootName', () => {
  const s = { title: 'Rooftop', talents: [{ name: '' }, { name: '  ' }, { name: 'Ana' }, { name: 'Bo' }] };
  it('shows the first talent with a name, then the title', () => {
    expect(D.eyeShootName(s)).toBe('Ana');
    expect(D.eyeShootName({ title: 'Rooftop', talents: [] })).toBe('Rooftop');
    expect(D.eyeShootName({ title: 'Rooftop' })).toBe('Rooftop');
  });
  it("shows the title first in The Eye's title mode", () => {
    expect(D.eyeShootName(s, 'title')).toBe('Rooftop');
    expect(D.eyeShootName({ talents: [{ name: 'Ana' }] }, 'title')).toBe('Ana');
    expect(D.eyeShootName(s, 'talent')).toBe('Ana');
  });
  it('is Untitled shoot with neither', () => {
    expect(D.eyeShootName({})).toBe('Untitled shoot');
    expect(D.eyeShootName({ title: '', talents: [{ name: ' ' }] }, 'title')).toBe('Untitled shoot');
    expect(D.eyeShootName({ talents: [{}] })).toBe('Untitled shoot');
  });
});

describe('eyeBackupFile', () => {
  it('is null when The Eye has no state here', async () => {
    expect(await D.eyeBackupFile()).toBeNull();
    expect(await dbList()).toEqual([]);
  });
  it("makes the same file The Eye's own backup does, with its photos", async () => {
    setState({ shoots: [{ id: 's1' }] });
    (await eyePhotos([['s1__cover', 'data:image/png;base64,AA'], ['s2', ['a', 'b']]])).close();
    const f = await D.eyeBackupFile();
    expect(f.name).toBe('starky-backup-2026-11-12.json');
    expect(f.type).toBe('application/json');
    expect(JSON.parse(await f.text())).toEqual({
      version: 1, exportedAt: new Date(NOW).toISOString(), state: { shoots: [{ id: 's1' }] }, images: { s1__cover: 'data:image/png;base64,AA', s2: ['a', 'b'] },
    });
  });
  it("makes The Eye's photo database when it isn't there yet, and lets it go", async () => {
    setState({ shoots: [] });
    const f = await D.eyeBackupFile();
    expect(JSON.parse(await f.text()).images).toEqual({});
    const db = await rawOpen('starky-moodboards', 2);
    expect([...db.objectStoreNames]).toEqual(['images']);
    db.close();
  });
});

describe('readEyeFile', () => {
  const file = (text) => new File([text], 'f.json');
  it('reads the state and photos from a backup', async () => {
    expect(await D.readEyeFile(file(JSON.stringify({ state: { shoots: [] }, images: { a: 1 } })))).toEqual({ state: { shoots: [] }, images: { a: 1 } });
  });
  it('gives no photos when the file has none', async () => {
    expect(await D.readEyeFile(file(JSON.stringify({ state: { shoots: [{ id: 1 }] } })))).toEqual({ state: { shoots: [{ id: 1 }] }, images: {} });
  });
  it("says a file that isn't JSON isn't from The Eye", async () => {
    await expectError(D.readEyeFile(file('nope')), "That file isn't from The Eye.");
  });
  it("says JSON without The Eye's shoots isn't from The Eye", async () => {
    for (const text of ['null', '{}', '{"state":{}}', '{"state":{"shoots":{}}}', '[]']) {
      await expectError(D.readEyeFile(file(text)), "That file isn't from The Eye.");
    }
  });
});

const POST = ['captured', 'waiting_for_selects', 'editing', 'rough_cut', 'client_review', 'revisions', 'delivered'];

describe('journalMoved and somethingToMove', () => {
  it('is not moved until the move says so', () => {
    expect(D.journalMoved()).toBe(false);
    localStorage.setItem('overthoughts-journal-moved', '2026-01-01');
    expect(D.journalMoved()).toBe(true);
    localStorage.setItem('overthoughts-journal-moved', '');
    expect(D.journalMoved()).toBe(false);
  });
  it('has nothing to move with no state, or an empty one', () => {
    expect(D.somethingToMove()).toBe(false);
    setState({});
    expect(D.somethingToMove()).toBe(false);
    setState({ journalEntries: 'x', shoots: {} });
    expect(D.somethingToMove()).toBe(false);
  });
  it('counts Journal entries of its own (not ones made from a shoot, nor broken ones)', () => {
    setState({ journalEntries: [null, {}, { id: 'j1', sourceShootId: 's1' }] });
    expect(D.somethingToMove()).toBe(false);
    setState({ journalEntries: [{ id: 'j1' }] });
    expect(D.somethingToMove()).toBe(true);
  });
  it('counts shoots that have been shot, or have reflection words', () => {
    setState({ shoots: [null, { status: 'delivered' }, { id: 'p', status: 'planned' }, { id: 'w', status: 'scheduled', whatWentRight: '  ' }] });
    expect(D.somethingToMove()).toBe(false);
    for (const status of POST) {
      setState({ shoots: [{ id: 'x', status }] });
      expect(D.somethingToMove()).toBe(true);
    }
    for (const field of ['whatWentRight', 'couldBeBetter', 'lessonsLearned']) {
      setState({ shoots: [{ id: 'x', status: 'planned', [field]: 'words' }] });
      expect(D.somethingToMove()).toBe(true);
    }
  });
});

describe('moveJournal', () => {
  const entry = (over = {}) => ({ id: 'j1', title: 'Day', body: 'Words', tags: ['a'], createdAt: '2026-10-03T09:00:00.000Z', updatedAt: '2026-10-04T09:00:00.000Z', ...over });

  it('copies the Journal and reflections from The Eye beside it, with photos, and marks it moved', async () => {
    setState({
      titleDisplayMode: 'title',
      journalEntries: [entry(), entry({ id: 'j2', title: '', body: '', tags: 'no', createdAt: 'yesterday', updatedAt: undefined })],
      shoots: [
        { id: 's1', title: 'Roof', talents: [{ name: 'Ana' }], status: 'delivered', whatWentRight: 'light' },
        { id: 's2', status: 'editing' },
        { id: 's3', status: 'planned' },
      ],
    });
    (await eyePhotos([['j1__journal', [{ src: 'a' }, { src: 'b' }]], ['j2__journal', []]])).close();
    expect(await D.moveJournal()).toEqual({ entries: 2, reflections: 1 });
    const db = await D.overthoughts();
    const entries = Object.fromEntries(await rawAll(db, 'entries'));
    expect(entries.j1).toEqual({ id: 'j1', kind: 'free', date: '2026-10-03', title: 'Day', body: 'Words', tags: ['a'], takeaway: '', shootId: null, from: 'the-eye', createdAt: '2026-10-03T09:00:00.000Z', updatedAt: '2026-10-04T09:00:00.000Z' });
    expect(entries.j2).toEqual({ id: 'j2', kind: 'free', date: '2026-11-12', title: '', body: '', tags: [], takeaway: '', shootId: null, from: 'the-eye', createdAt: 'yesterday', updatedAt: 'yesterday' });
    expect(entries['reflection-s1']).toMatchObject({ shootName: 'Roof', wentRight: 'light' });
    expect(entries['reflection-s2']).toMatchObject({ shootName: 'Untitled shoot' });
    expect(entries['reflection-s3']).toBeUndefined();
    expect(await rawAll(db, 'images')).toEqual([['j1', [{ src: 'a' }, { src: 'b' }]]]);
    expect(D.journalMoved()).toBe(true);
    expect(localStorage.getItem('overthoughts-journal-moved')).toBe(new Date(NOW).toISOString());
  });
  it('uses talent names unless The Eye shows titles', async () => {
    setState({ shoots: [{ id: 's1', title: 'Roof', talents: [{ name: 'Ana' }], status: 'delivered' }] });
    await D.moveJournal();
    expect((await D.reflections())[0].shootName).toBe('Ana');
  });
  it('does it only once without a file', async () => {
    setState({ journalEntries: [entry()] });
    await D.moveJournal();
    expect(await D.moveJournal()).toEqual({ already: true });
  });
  it('fills in an entry with no dates or tags from now', async () => {
    setState({ journalEntries: [{ id: 'j9' }] });
    await D.moveJournal();
    const [[, e]] = await rawAll(await D.overthoughts(), 'entries');
    expect(e).toEqual({ id: 'j9', kind: 'free', date: '2026-11-12', title: '', body: '', tags: [], takeaway: '', shootId: null, from: 'the-eye', createdAt: new Date(NOW).toISOString(), updatedAt: new Date(NOW).toISOString() });
  });
  it('takes the date only from a createdAt that starts with one', async () => {
    setState({ journalEntries: [{ id: 'a', createdAt: 'on 2026-01-02' }, { id: 'b', createdAt: '2026-1-02' }, { id: 'c', createdAt: '2025-12-31T23:59:59Z' }, { id: 'd', createdAt: '2026-01-0x' }] });
    await D.moveJournal();
    const e = Object.fromEntries(await rawAll(await D.overthoughts(), 'entries'));
    expect([e.a.date, e.b.date, e.c.date, e.d.date]).toEqual(['2026-11-12', '2026-11-12', '2025-12-31', '2026-11-12']);
  });
  it('marks it moved with nothing to move, and opens no Eye photos', async () => {
    expect(await D.moveJournal()).toEqual({ entries: 0, reflections: 0 });
    expect(D.journalMoved()).toBe(true);
    expect(await dbList()).toEqual(['overthoughts']);
  });
  it("brings in The Eye's backup file, photos from the file, without marking it moved, even after a move", async () => {
    localStorage.setItem('overthoughts-journal-moved', 'x');
    const from = {
      state: { journalEntries: [entry(), entry({ id: 'j2' }), entry({ id: 'j3' })], shoots: [{ id: 's1', lessonsLearned: 'plan' }] },
      images: { j1__journal: [{ src: 'p' }], j2__journal: 'not a list', j3__journal: [] },
    };
    expect(await D.moveJournal(from)).toEqual({ entries: 3, reflections: 1 });
    const db = await D.overthoughts();
    expect(await rawAll(db, 'images')).toEqual([['j1', [{ src: 'p' }]]]);
    expect((await rawAll(db, 'entries')).map(([k]) => k)).toEqual(['j1', 'j2', 'j3', 'reflection-s1']);
    expect(localStorage.getItem('overthoughts-journal-moved')).toBe('x');
    expect(await dbList()).toEqual(['overthoughts']);
  });
  it('brings in a file without photos', async () => {
    expect(await D.moveJournal({ state: { journalEntries: [entry()] } })).toEqual({ entries: 1, reflections: 0 });
    expect(await rawAll(await D.overthoughts(), 'images')).toEqual([]);
  });
  it('brings in nothing from a file without a state', async () => {
    expect(await D.moveJournal({ state: null })).toEqual({ entries: 0, reflections: 0 });
    expect(D.journalMoved()).toBe(false);
    const db = await D.overthoughts();
    expect(await rawAll(db, 'entries')).toEqual([]);
    expect(await rawAll(db, 'images')).toEqual([]);
  });
  it('never writes over what is already in Overthoughts, and checks only that it is there', async () => {
    const db = await D.overthoughts();
    const tx = db.transaction(['entries', 'images'], 'readwrite');
    tx.objectStore('entries').put({ id: 'j1', kind: 'free', body: 'rewritten since', title: 'mine' });
    tx.objectStore('entries').put({ id: 'reflection-s1', kind: 'reflection', takeaway: 'my own words', shootId: 's1' });
    tx.objectStore('images').put([{ src: 'only one now' }], 'j1');
    await new Promise((r) => { tx.oncomplete = r; });
    const from = { state: { journalEntries: [entry()], shoots: [{ id: 's1', status: 'delivered', lessonsLearned: 'old' }] }, images: { j1__journal: [{ src: 'a' }, { src: 'b' }] } };
    expect(await D.moveJournal(from)).toEqual({ entries: 1, reflections: 1 });
    const e = Object.fromEntries(await rawAll(db, 'entries'));
    expect(e.j1.body).toBe('rewritten since');
    expect(e['reflection-s1'].takeaway).toBe('my own words');
    expect(await rawAll(db, 'images')).toEqual([['j1', [{ src: 'only one now' }]]]);
  });
  it('keeps the move going when localStorage cannot be written', async () => {
    setState({ journalEntries: [entry()] });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
    expect(await D.moveJournal()).toEqual({ entries: 1, reflections: 0 });
    expect(D.journalMoved()).toBe(false);
  });

  describe('when a copy does not read back the same', () => {
    it('reports Journal entries whose words differ (two with one id) and marks nothing', async () => {
      setState({ journalEntries: [entry({ body: 'first' }), entry({ body: 'second' })] });
      await expectError(D.moveJournal(), "1 of them didn't copy over properly, so nothing was marked as moved. The Eye still has all of it.");
      expect(D.journalMoved()).toBe(false);
    });
    it('notices a title that differs when the words match', async () => {
      await expectError(D.moveJournal({ state: { journalEntries: [entry({ title: 'A' }), entry({ title: 'B' })] } }), /^1 of them/);
    });
    it('compares a missing body or title as empty', async () => {
      await expect(D.moveJournal({ state: { journalEntries: [entry({ id: 'x', body: undefined, title: undefined }), entry({ id: 'x', body: '', title: '' })] } })).resolves.toEqual({ entries: 2, reflections: 0 });
    });
    it('reports reflections whose words differ (two shoots with one id)', async () => {
      for (const field of ['lessonsLearned', 'whatWentRight', 'couldBeBetter']) {
        D = await loadDFData();
        const shoots = [{ id: 's1', status: 'delivered', [field]: 'one' }, { id: 's1', status: 'delivered', [field]: 'two' }];
        await expectError(D.moveJournal({ state: { shoots } }), /^1 of them didn't copy over properly/);
      }
    });
    it('compares a reflection with no words as empty', async () => {
      const shoots = [{ id: 's1', status: 'delivered' }, { id: 's1', status: 'delivered', lessonsLearned: '', whatWentRight: '', couldBeBetter: '' }];
      await expect(D.moveJournal({ state: { shoots } })).resolves.toEqual({ entries: 0, reflections: 0 });
    });

    // Something else (another tab) changing the copies between writing and reading back.
    async function tamper(fn) {
      const db = await D.overthoughts();
      const real = db.transaction.bind(db);
      db.transaction = (names, mode) => {
        const tx = real(names, mode);
        if (mode === 'readwrite') {
          const os = tx.objectStore.bind(tx);
          tx.objectStore = (n) => { const s = os(n); const put = s.put.bind(s); s.put = (v, k) => fn(n, v, k, put); return s; };
        }
        return tx;
      };
    }
    it('reports an entry that is not there afterwards', async () => {
      await tamper((n, v, k, put) => (n === 'entries' && v.id === 'j2' ? undefined : put(v, k)));
      const from = { state: { journalEntries: [entry(), entry({ id: 'j2' })] } };
      await expectError(D.moveJournal(from), /^1 of them/);
    });
    it('reports a reflection that is not there afterwards', async () => {
      await tamper((n, v, k, put) => (n === 'entries' && v.kind === 'reflection' ? undefined : put(v, k)));
      await expectError(D.moveJournal({ state: { shoots: [{ id: 's1', status: 'captured' }, { id: 's2', status: 'captured' }] } }), /^2 of them/);
    });
    it('reports photos that are missing or short afterwards, adding up everything wrong', async () => {
      await tamper((n, v, k, put) => (n !== 'images' ? put(v, k) : k === 'j1' ? undefined : put(v.slice(1), k)));
      const from = { state: { journalEntries: [entry(), entry({ id: 'j2' })] }, images: { j1__journal: [1, 2], j2__journal: [1, 2] } };
      await expectError(D.moveJournal(from), /^2 of them/);
    });
  });
});
