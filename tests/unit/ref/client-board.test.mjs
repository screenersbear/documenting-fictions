// ref/data/client-board.js: a board for a new client from Rounds (connect/06), and its slip's words.
import { describe, it, expect, beforeEach } from 'vitest';
import { BLANK_PAGES, CLIENT_STYLE, dayWords, clientSlip, clientBoard, boardClient, offersOf } from '../../../ref/data/client-board.js';
import { styleTemplate } from '../../../ref/data/templates.js';
import { withTextDefaults } from '../../../ref/components/textsize.js';

beforeEach(() => localStorage.clear());

const yes = { id: 'l1', type: 'new-client', fromApp: 'rounds', toApp: 'ref', toId: '', name: 'Dana Ortiz', handle: 'danaortiz.studio', pitched: '2026-11-03', createdAt: '2026-11-14T15:00:00.000Z' };

describe('dayWords', () => {
  it('says a day short, read as the phone\'s own day', () => {
    expect(dayWords('2026-11-03')).toBe('3 Nov');
    expect(dayWords('2027-01-31')).toBe('31 Jan');
  });
  it('says the day of a time', () => {
    const t = new Date(2026, 10, 14, 12, 0).toISOString();
    expect(dayWords(t)).toBe('14 Nov');
  });
  it('is empty for nothing, or something that is not a day', () => {
    expect(dayWords('')).toBe('');
    expect(dayWords(undefined)).toBe('');
    expect(dayWords(null)).toBe('');
    expect(dayWords('soon')).toBe('');
  });
});

describe('clientSlip', () => {
  it('says who said yes, their handle and when they were pitched', () => {
    expect(clientSlip(yes)).toEqual({ title: 'Dana Ortiz said yes', line: 'A new board for the shoot, named for Dana.', handle: '@danaortiz.studio', when: 'Pitched 3 Nov.' });
  });
  it('says the day they said yes for someone who asked first', () => {
    const asked = { ...yes, pitched: '', createdAt: new Date(2026, 10, 14, 9).toISOString() };
    expect(clientSlip(asked).when).toBe('Said yes 14 Nov.');
    expect(clientSlip({ ...asked, createdAt: undefined }).when).toBe('');
  });
  it('gets by without a name or handle', () => {
    expect(clientSlip({ name: '  ' })).toEqual({ title: 'Someone said yes', line: 'A new board for the shoot, named for Someone.', handle: '', when: '' });
  });
});

describe('clientBoard', () => {
  it('is named for them, keeps their handle, and has blank pages in the mosaic look', () => {
    const b = clientBoard(yes, 'letter-portrait');
    expect(b).toMatchObject({ name: 'Dana Ortiz', shape: 'letter-portrait', style: CLIENT_STYLE, client: { name: 'Dana Ortiz', handle: 'danaortiz.studio', from: 'l1' } });
    expect(b.pages).toHaveLength(BLANK_PAGES);
    expect(b.pages.map((p) => p.template)).toEqual([0, 1, 2].map((n) => styleTemplate('letter-portrait', 'mosaic', n)));
    expect(b.pages.every((p) => p.images.length === 0)).toBe(true);
  });
  it('fits the wide page size too', () => {
    expect(clientBoard(yes, 'wide-16x9').pages[0].template).toBe(styleTemplate('wide-16x9', 'mosaic', 0));
  });
  it('takes the saved text sizes, as any new page does', () => {
    localStorage.setItem('ref-notebook-text-defaults', JSON.stringify({ title: 2 }));
    const page = clientBoard(yes, 'letter-portrait').pages[0];
    expect(page).toEqual(withTextDefaults({ template: page.template, images: [] }));
    expect(page.titleSize).toBeGreaterThan(0);
  });
  it('gets by without a name or handle', () => {
    const b = clientBoard({ id: 'l2' }, 'letter-portrait');
    expect(b.name).toBe('New client');
    expect(b.client).toEqual({ name: 'New client', handle: '', from: 'l2' });
  });
});

describe('boardClient', () => {
  it('passes a client board\'s client on', () => {
    expect(boardClient({ client: { name: ' Dana Ortiz ', handle: 'danaortiz.studio', from: 'l1' } })).toEqual({ name: 'Dana Ortiz', handle: 'danaortiz.studio' });
    expect(boardClient({ client: { name: 'Ana' } })).toEqual({ name: 'Ana', handle: '' });
  });
  it('is null for a board of your own', () => {
    expect(boardClient({ name: 'Rooftop' })).toBe(null);
    expect(boardClient({ client: { name: ' ' } })).toBe(null);
    expect(boardClient({ client: {} })).toBe(null);
    expect(boardClient(null)).toBe(null);
  });
});

describe('offersOf', () => {
  it('keeps the yeses whose board is not started', () => {
    const started = { ...yes, id: 'l2', toId: 'b1' };
    const other = { id: 'l3', type: 'moodboard', toId: '' };
    expect(offersOf([yes, started, other, null])).toEqual([yes]);
  });
  it('is none for nothing', () => {
    expect(offersOf(undefined)).toEqual([]);
    expect(offersOf([])).toEqual([]);
  });
});
