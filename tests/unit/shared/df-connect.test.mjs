// shared/data/connect.js: the hand-offs between notebooks, their switches,
// and the slips they arrive as (window.DFConnect).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadDFData } from './_env.mjs';

let D;
let C;
const NOW = Date.UTC(2026, 10, 14, 15, 0, 0);
beforeEach(async () => {
  D = await loadDFData();
  C = window.DFConnect;
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

describe('the hand-offs', () => {
  it('five, in the loop order, each with its switch', () => {
    expect(C.HANDOFFS.map((h) => [h.key, h.from, h.to, h.type])).toEqual([
      ['moodboards', 'ref', 'the-eye', 'moodboard'],
      ['finals', 'the-eye', 'contact-sheet', 'finals'],
      ['people', 'the-eye', 'rounds', 'people'],
      ['posts', 'contact-sheet', 'rounds', 'post-people'],
      ['clients', 'rounds', 'ref', 'new-client'],
    ]);
    expect(C.handoff('finals').name).toBe('Final images');
    expect(C.handoff('nothing')).toBe(null);
  });
  it('the three new ones arrive as slips; the two there before do not', () => {
    expect(C.HANDOFFS.filter((h) => h.waiting).map((h) => h.type)).toEqual(['finals', 'post-people', 'new-client']);
  });
});

describe('switches', () => {
  it('all on unless turned off, and kept', () => {
    for (const h of C.HANDOFFS) expect(C.connectOn(h.key)).toBe(true);
    C.setConnect('finals', false);
    expect(C.connectOn('finals')).toBe(false);
    expect(C.connectOn('posts')).toBe(true);
    expect(JSON.parse(localStorage.getItem('df-connect'))).toEqual({ finals: false });
    C.setConnect('finals', 1);
    expect(C.connectOn('finals')).toBe(true);
  });
  it('anything else saved there reads as all on', () => {
    for (const v of ['not json', 'null', '7', '"x"']) {
      localStorage.setItem('df-connect', v);
      expect(C.connectOn('finals')).toBe(true);
    }
  });
  it('storage blocked: on, and a switch tapped changes nothing', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
    expect(() => C.setConnect('people', false)).not.toThrow();
    expect(C.connectOn('people')).toBe(true);
  });
});

describe('slips', () => {
  const link = (id, type, toApp, more = {}) => D.saveLink({ id, type, toApp, fromApp: 'x', createdAt: `2026-11-1${id}T10:00:00.000Z`, ...more });
  it('the hand-offs waiting in a notebook, newest first', async () => {
    await link('1', 'finals', 'contact-sheet');
    await link('2', 'finals', 'contact-sheet');
    await link('3', 'post-people', 'rounds');
    await link('4', 'moodboard', 'contact-sheet');
    expect((await C.slipsFor('contact-sheet')).map((l) => l.id)).toEqual(['2', '1']);
    expect((await C.slipsFor('rounds')).map((l) => l.id)).toEqual(['3']);
    expect(await C.slipsFor('ref')).toEqual([]);
  });
  it('opened or tucked away: gone for good, the link kept', async () => {
    const a = await link('1', 'finals', 'contact-sheet');
    const b = await link('2', 'new-client', 'ref');
    const opened = await C.openSlip(a);
    const tucked = await C.tuckSlip(b);
    expect(opened.openedAt).toBe(new Date(NOW).toISOString());
    expect(tucked.tuckedAt).toBe(new Date(NOW).toISOString());
    expect(await C.slipsFor('contact-sheet')).toEqual([]);
    expect(await C.slipsFor('ref')).toEqual([]);
    expect((await D.getLink('2')).type).toBe('new-client');
  });
  it("what's waiting in each notebook, for the shelf", async () => {
    expect(await C.waitingByApp()).toEqual({});
    await link('1', 'finals', 'contact-sheet');
    await link('2', 'finals', 'contact-sheet');
    await link('3', 'new-client', 'ref', { openedAt: 'x' });
    await link('4', 'people', 'rounds');
    await link('5', 'post-people', 'rounds');
    await link('6', 'finals', 'contact-sheet', { fromApp: 'the-eye' });
    expect(await C.waitingByApp()).toEqual({
      'contact-sheet': [{ from: 'the-eye', what: 'finals from The Eye' }, { from: 'x', what: 'finals from The Eye' }, { from: 'x', what: 'finals from The Eye' }],
      rounds: [{ from: 'x', what: 'a new post from Layouts' }],
    });
  });
});

describe('whenWords', () => {
  const now = new Date(2026, 10, 14, 23, 30);
  it('today, or the day it came', () => {
    expect(C.whenWords(new Date(2026, 10, 14, 0, 5).toISOString(), now)).toBe('Today');
    expect(C.whenWords(new Date(2026, 10, 13, 23, 59).toISOString(), now)).toBe('13 Nov');
    expect(C.whenWords(new Date(2025, 10, 14, 12).toISOString(), now)).toBe('14 Nov');
    expect(C.whenWords(new Date(2026, 0, 1, 12).toISOString(), now)).toBe('1 Jan');
  });
  it('nothing for a time it cannot read; now unless given', () => {
    expect(C.whenWords('nope', now)).toBe('');
    expect(C.whenWords(new Date().toISOString())).toBe('Today');
  });
});

describe('the look', () => {
  it("a notebook's mark on its colour, and two with an arrow", () => {
    expect(C.markSvg('the-eye')).toBe('<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><circle cx="12" cy="12" r="6.5" fill="none" stroke="#313D45" stroke-width="3"/></svg>');
    expect(C.markSvg('nope', 18)).toBe('<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"></svg>');
    expect(C.miniHtml('ref')).toContain('background:#0A4FD6');
    expect(C.miniHtml('nope')).toContain('background:#E1E1DC');
    const pair = C.pairHtml('rounds', 'ref');
    expect(pair.indexOf('#313D45')).toBeLessThan(pair.indexOf('#0A4FD6'));
    expect(pair).toContain('class="df-arrow"');
  });
  it("a slip: from whom in their colours, the day, a title, a line, what it brought, two buttons", () => {
    const html = C.slipHtml({ link: { id: 'L1', fromApp: 'the-eye', createdAt: new Date(NOW).toISOString() }, title: 'Rooftop <portraits>', line: "12 finals. Two posts made", body: '<div class="x"></div>', main: 'Look them over', mainClass: 'btn' });
    expect(html).toContain('data-slip="L1"');
    expect(html).toContain('aria-label="From The Eye"');
    expect(html).toContain('style="background:#FFD100;color:#313D45"');
    expect(html).toContain('From The Eye</span><span class="df-slip-when">Today</span>');
    expect(html).toContain('<p class="df-slip-title">Rooftop &lt;portraits&gt;</p>');
    expect(html).toContain('<p class="df-slip-line">12 finals. Two posts made</p><div class="x"></div>');
    expect(html).toContain('<button type="button" class="df-slip-main btn" data-slip-open>Look them over</button>');
    expect(html).toContain('data-slip-later>Not now</button>');
  });
  it('no line, and a sender it does not know', () => {
    const html = C.slipHtml({ link: { id: '"x"', fromApp: 'odd', createdAt: '' }, title: 't', main: 'Go' });
    expect(html).not.toContain('df-slip-line');
    expect(html).toContain('data-slip="&quot;x&quot;"');
    expect(html).toContain('style="background:#E1E1DC;color:#313D45"');
    expect(html).toContain('From odd');
    expect(html).toContain('class="df-slip-main " data-slip-open');
    expect(C.slipHtml({ link: { id: 1, fromApp: 'rounds', createdAt: null }, title: null, main: "It's & yes" })).toContain("It&#39;s &amp; yes");
  });
});
