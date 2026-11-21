// rounds/data/promise-store.js: promises saved on the person as saved now,
// and Undo, over Rounds' real database (fake-indexeddb).
import { describe, it, expect, beforeEach } from 'vitest';
import { loadDFData } from '../shared/_env.mjs';

let S; // rounds/data/promise-store.js
let db; // rounds/data/db.js
beforeEach(async () => {
  await loadDFData();
  db = await import('../../../rounds/data/db.js');
  S = await import('../../../rounds/data/promise-store.js');
});

const pr = (o) => ({ id: 'a', mine: true, what: 'Send the selects', due: '', made: '2026-11-10', open: true, ...o });
const june = (o) => ({ id: 'j', name: 'June Park', group: 'regular', ...o });
const strip = ({ createdAt, updatedAt, ...rest }) => rest; // db.js stamps what it saves
const saved = async (id) => strip(await db.getPerson(id));
const add = (p) => ({ ...p, promises: [...(p.promises || []), pr()] });

describe('changeSaved', () => {
  it('changes the person as saved, and gives back before and after', async () => {
    await db.savePerson(june({ note: 'Saved since' }));
    const u = await S.changeSaved('j', add);
    expect(await saved('j')).toEqual(june({ note: 'Saved since', promises: [pr()] }));
    expect(strip(u.before)).toEqual(june({ note: 'Saved since' }));
    expect(u.after.promises).toEqual([pr()]);
  });
  it('saves nothing when nothing changed', async () => {
    await db.savePerson(june());
    const first = (await db.getPerson('j')).updatedAt;
    const u = await S.changeSaved('j', (p) => p);
    expect(u.after).toBe(u.before);
    expect((await db.getPerson('j')).updatedAt).toBe(first);
  });
  it('is null for someone who is gone', async () => {
    expect(await S.changeSaved('nobody', add)).toBe(null);
  });
});

describe('undoChange', () => {
  it('puts their promises back, keeping what changed since', async () => {
    await db.savePerson(june());
    const u = await S.changeSaved('j', add);
    await db.savePerson({ ...(await db.getPerson('j')), note: 'Changed since' });
    expect(await S.undoChange(u)).toBe(true);
    expect(await saved('j')).toEqual(june({ note: 'Changed since', promises: [] }));
  });
  it('puts back a list they had', async () => {
    await db.savePerson(june({ promises: [pr({ id: 'old' })] }));
    const u = await S.changeSaved('j', add);
    await S.undoChange(u);
    expect((await saved('j')).promises).toEqual([pr({ id: 'old' })]);
  });
  it('does nothing with nothing to undo, or someone gone', async () => {
    expect(await S.undoChange(null)).toBe(false);
    expect(await S.undoChange({})).toBe(false);
    expect(await S.undoChange({ before: june({ id: 'gone' }) })).toBe(false);
  });
});
