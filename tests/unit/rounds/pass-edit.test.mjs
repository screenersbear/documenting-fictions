// rounds/data/pass-edit.js: a name or handle changed in Rounds (Edit on
// their page) passes on to the one list of people, so The Eye and Ref
// follow, and a yes Ref hasn't made a board for says the new name too
// (refining round, 21 Nov).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadDFData } from '../shared/_env.mjs';

let D;
let E; // rounds/data/pass-edit.js
beforeEach(async () => {
  D = await loadDFData();
  E = await import('../../../rounds/data/pass-edit.js');
  window.DF_SUITE = { get: () => null };
});
afterEach(() => { vi.restoreAllMocks(); delete window.DF_SUITE; });

const ana = { id: 'ana', name: 'Ana Ruiz', instagram: 'ana.jpg', tiktok: '' };
const pass = (p, o) => D.saveLink({ fromApp: 'rounds', fromId: p.id, toApp: 'ref', toId: '', type: 'new-client', name: p.name, handle: p.instagram, pitched: '2026-11-02', ...o });
const refOf = async () => (await D.linksWhere({ fromApp: 'rounds', fromId: 'ana', type: 'new-client' }))[0];

describe('nameChanged', () => {
  it('is true for a new name, Instagram or TikTok', () => {
    expect(E.nameChanged(ana, { ...ana, name: 'Ana R.' })).toBe(true);
    expect(E.nameChanged(ana, { ...ana, instagram: 'ana.r' })).toBe(true);
    expect(E.nameChanged(ana, { ...ana, tiktok: 'ana' })).toBe(true);
  });
  it('is false when only something else changed, or only spaces around them', () => {
    expect(E.nameChanged(ana, { ...ana, note: 'Tall', where: 'Market' })).toBe(false);
    expect(E.nameChanged(ana, { ...ana, name: ' Ana Ruiz ' })).toBe(false);
    expect(E.nameChanged({ id: 'x', name: 'A' }, { id: 'x', name: 'A', instagram: '', tiktok: null })).toBe(false);
  });
  it('is false without both of them', () => {
    expect(E.nameChanged(null, ana)).toBe(false);
    expect(E.nameChanged(ana, undefined)).toBe(false);
  });
});

describe('passEdit', () => {
  it("renames them in the one list (keeping their old name as a key) and on Ref's offer", async () => {
    await D.gatherPeople([{ name: 'Ana Ruiz', instagram: 'ana.jpg', roundsId: 'ana' }]);
    await pass(ana);
    const after = { ...ana, name: 'Ana Ortiz', instagram: 'ana.o' };
    expect(await E.passEdit(ana, after)).toBe(true);
    const [r] = await D.peopleAll();
    expect(r).toMatchObject({ name: 'Ana Ortiz', instagram: 'ana.o' });
    expect(r.editedAt).toBeTruthy();
    expect(await D.personFor({ name: 'Ana Ruiz', instagram: 'ana.jpg' })).toMatchObject({ id: r.id });
    expect(await refOf()).toMatchObject({ name: 'Ana Ortiz', handle: 'ana.o', pitched: '2026-11-02', toId: '' });
  });
  it('leaves a board Ref already made alone (Ref takes the new name from the list)', async () => {
    await D.gatherPeople([{ name: 'Ana Ruiz', instagram: 'ana.jpg', roundsId: 'ana' }]);
    await pass(ana, { toId: 'board-1' });
    await E.passEdit(ana, { ...ana, name: 'Ana Ortiz' });
    expect(await refOf()).toMatchObject({ name: 'Ana Ruiz', toId: 'board-1' });
  });
  it('still updates the offer when the list does not have them yet, and says so', async () => {
    await pass(ana);
    expect(await E.passEdit(ana, { ...ana, name: 'Ana Ortiz' })).toBe(false);
    expect(await refOf()).toMatchObject({ name: 'Ana Ortiz' });
    expect(await D.peopleAll()).toEqual([]);
  });
  it('does nothing when the name and handles are the same', async () => {
    await D.gatherPeople([{ name: 'Ana Ruiz', instagram: 'ana.jpg', roundsId: 'ana' }]);
    const spy = vi.spyOn(D, 'editPerson');
    expect(await E.passEdit(ana, { ...ana, note: 'Tall' })).toBe(false);
    expect(spy).not.toHaveBeenCalled();
  });
  it('does nothing outside the suite or without the list loaded', async () => {
    const after = { ...ana, name: 'Ana Ortiz' };
    window.DFData = { ...D, personFor: undefined };
    expect(await E.passEdit(ana, after)).toBe(false);
    window.DFData = undefined;
    expect(await E.passEdit(ana, after)).toBe(false);
    window.DFData = D;
  });
});
