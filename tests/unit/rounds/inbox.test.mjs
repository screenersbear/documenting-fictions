// rounds/data/inbox.js: inbox.json, where Claude leaves leads and notes of
// drafts, and what Rounds does with each.
import { describe, it, expect } from 'vitest';
import { INBOX, parseInbox, inboxText, leadOf, reviewLeads, planInbox, passedOf } from '../../../rounds/data/inbox.js';

const lead = (id, f = {}) => ({ id, type: 'lead', added: '2026-11-14', found_by: 'Photography project, actor agencies', name: `Lead ${id}`, ...f });
const drafted = (id, match, kind = 'Pitch') => ({ id, type: 'drafted', added: '2026-11-16', match, kind, where: 'Gmail' });
const person = (id, name, instagram = '', kind = 'pitch') => ({ id, name, instagram, next: { kind, due: '2026-11-16', step: 0 } });

describe('parseInbox', () => {
  it('reads the list of entries', () => {
    expect(INBOX).toBe('inbox.json');
    expect(parseInbox(JSON.stringify([lead('1'), drafted('2', 'x')]))).toEqual([lead('1'), drafted('2', 'x')]);
  });
  it('an empty file is no entries', () => {
    for (const t of ['', '   \n', null, undefined]) expect(parseInbox(t)).toEqual([]);
    expect(parseInbox('[]')).toEqual([]);
  });
  it('leaves out anything that is not an entry with an id', () => {
    expect(parseInbox(JSON.stringify([null, 3, 'x', { type: 'lead' }, { id: 0, type: 'lead' }]))).toEqual([{ id: 0, type: 'lead' }]);
  });
  it("a file that isn't a list is left alone (null)", () => {
    expect(parseInbox('{"leads": []}')).toBe(null);
    expect(parseInbox('[{"id": 1,')).toBe(null);
    expect(parseInbox('"x"')).toBe(null);
  });
});

describe('inboxText', () => {
  it('the entries left, pretty', () => {
    const text = inboxText([lead('1'), lead('2'), lead('3')], ['2']);
    expect(JSON.parse(text).map((e) => e.id)).toEqual(['1', '3']);
    expect(text.startsWith('[\n  {')).toBe(true);
    expect(inboxText([lead('1')], ['1'])).toBe('[]');
  });
});

describe('leadOf and passedOf', () => {
  it("a lead as a person to add, with Claude's note", () => {
    const l = leadOf(lead('1', { name: ' Abrams ', group: 'Client', instagram: '@abrams', website: 'abrams.com', where_met: 'Agency list', first_move: 'Say hello', found_by: ' Monday search ' }));
    expect(l).toEqual({ id: '1', foundBy: 'Monday search', row: { name: 'Abrams', group: 'client', groups: ['client'], instagram: 'abrams', website: 'https://abrams.com', email: '', where: 'Agency list', note: '', firstMove: 'hello' } });
    expect(leadOf({ id: '2', name: 'X' })).toMatchObject({ foundBy: '', row: { group: 'prospect', firstMove: null } });
  });
  it('passed on: what it is matched by', () => {
    expect(passedOf(leadOf(lead('1', { name: 'Abrams', instagram: 'abrams' })))).toEqual({ id: '1', name: 'Abrams', instagram: 'abrams' });
  });
});

describe('reviewLeads', () => {
  const here = [person('p', 'Bloc', 'bloc')];
  it('the new ones, and how many are here already or have no name', () => {
    const r = reviewLeads([lead('1'), lead('2', { name: 'Bloc Agency', instagram: 'bloc' }), lead('3', { name: ' ' }), lead('4', { name: 'Bloc' })], here);
    expect(r.fresh.map((l) => l.id)).toEqual(['1']);
    expect(r.skipped).toBe(2);
    expect(r.bad).toBe(1);
  });
  it('the same lead twice counts once', () => {
    const r = reviewLeads([lead('1', { instagram: 'x' }), lead('2', { instagram: 'x' })], []);
    expect([r.fresh.length, r.skipped]).toEqual([1, 1]);
  });
  it('none at all', () => {
    expect(reviewLeads([], here)).toEqual({ fresh: [], skipped: 0, bad: 0 });
  });
});

describe('planInbox', () => {
  const people = [person('p1', 'Abrams Artists Agency', 'abrams'), person('p2', 'Bloc', ''), person('p3', 'Cole Talent', 'cole', 'followup')];
  it('a draft marks its person, matched by handle, @handle or name, and comes off', () => {
    const r = planInbox([drafted('d1', 'abrams'), drafted('d2', '@cole', 'Follow up'), drafted('d3', 'Bloc'), drafted('d4', 'abrams artists agency')], people, []);
    expect(r.drafts).toEqual([
      { personId: 'p1', draft: { kind: 'pitch', where: 'Gmail', added: '2026-11-16' } },
      { personId: 'p3', draft: { kind: 'followup', where: 'Gmail', added: '2026-11-16' } },
      { personId: 'p2', draft: { kind: 'pitch', where: 'Gmail', added: '2026-11-16' } },
      { personId: 'p1', draft: { kind: 'pitch', where: 'Gmail', added: '2026-11-16' } },
    ]);
    expect(r.drop).toEqual(['d1', 'd2', 'd3', 'd4']);
  });
  it('a draft with no one to match, no match, or another kind of move is dropped', () => {
    const r = planInbox([drafted('d1', 'nobody'), drafted('d2', ''), drafted('d3', 'abrams', 'Say thanks'), { id: 'd4', type: 'drafted', kind: 'Pitch' }, drafted('d5', 'abrams', 'wave')], people, []);
    expect(r.drafts).toEqual([]);
    expect(r.drop).toEqual(['d1', 'd2', 'd3', 'd4', 'd5']);
  });
  it('a draft with no where or day keeps empty ones', () => {
    expect(planInbox([{ id: 'd', type: 'drafted', match: 'bloc', kind: 'pitch' }], people, []).drafts[0].draft).toEqual({ kind: 'pitch', where: '', added: '' });
  });
  it('new leads wait to be looked at; ones passed on before come off', () => {
    const passed = [{ id: 'x', name: 'Old Lead', instagram: 'old' }];
    const r = planInbox([lead('1'), lead('2', { name: 'Someone', instagram: 'old' }), lead('3', { name: 'Old Lead' })], people, passed);
    expect(r.leads.map((e) => e.id)).toEqual(['1']);
    expect(r.drop).toEqual(['2', '3']);
  });
  it('leads with nothing new among them (all here, or nameless) come off too', () => {
    const r = planInbox([lead('1', { name: 'Bloc' }), lead('2', { name: '' })], people, []);
    expect(r.leads).toEqual([]);
    expect(r.drop).toEqual(['1', '2']);
  });
  it('one new lead keeps the others with it, for the summary', () => {
    expect(planInbox([lead('1', { name: 'Bloc' }), lead('2')], people, []).leads.map((e) => e.id)).toEqual(['1', '2']);
  });
  it('entries already handled come off; other kinds are left for Claude', () => {
    const r = planInbox([lead('1'), lead('2'), { id: 'n', type: 'note' }], people, [], ['1']);
    expect(r.drop).toEqual(['1']);
    expect(r.leads.map((e) => e.id)).toEqual(['2']);
    expect(planInbox([], people, [])).toEqual({ drafts: [], drop: [], leads: [] });
  });
});
