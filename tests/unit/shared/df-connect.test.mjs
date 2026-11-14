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

describe('what passes', () => {
  it('a handle as typed, cleaned; anything else none', () => {
    expect(C.cleanHandle('@june.park')).toBe('june.park');
    expect(C.cleanHandle(' https://www.instagram.com/iryna.hmua/?hl=en ')).toBe('iryna.hmua');
    expect(C.cleanHandle('@@sam_k')).toBe('sam_k');
    expect(C.cleanHandle('two words')).toBe('');
    expect(C.cleanHandle(null)).toBe('');
    expect(C.cleanHandle('x'.repeat(31))).toBe('');
  });
  it("a shoot's credits: talent and team, Instagram handles only", () => {
    const shoot = {
      talents: [{ name: ' June Park ', socialHandles: [{ platform: 'tiktok', handle: 'jp' }, { platform: 'instagram', handle: '@junepark.jpg' }] }, { name: 'Bo' }, { name: '  ' }, null],
      teamMembers: [{ role: 'Hair and makeup', name: 'Iryna V.', socialPlatform: 'instagram', socialHandle: 'iryna.hmua' }, { role: 'Styling', name: 'Sam K.', socialHandle: 'samk.styles' }, { name: 'Lee', socialPlatform: 'tiktok', socialHandle: 'lee' }, {}],
    };
    expect(C.shootCredits(shoot)).toEqual({
      talent: [{ name: 'June Park', handle: 'junepark.jpg' }, { name: 'Bo', handle: '' }],
      team: [{ role: 'Hair and makeup', name: 'Iryna V.', handle: 'iryna.hmua' }, { role: 'Styling', name: 'Sam K.', handle: 'samk.styles' }, { role: '', name: 'Lee', handle: '' }],
    });
    expect(C.shootCredits({})).toEqual({ talent: [], team: [] });
    expect(C.shootCredits(null)).toEqual({ talent: [], team: [] });
  });
  it("a caption: the title, then who's in it and who made it", () => {
    const credits = { talent: [{ name: 'June Park', handle: 'junepark.jpg' }], team: [{ role: 'Hair and makeup', name: 'Iryna V.', handle: 'iryna.hmua' }, { role: 'Styling', name: 'Sam K.', handle: 'samk.styles' }] };
    expect(C.captionFor('Rooftop portraits', credits)).toBe('Rooftop portraits with June Park @junepark.jpg. Hair and makeup @iryna.hmua. Styling @samk.styles.');
  });
  it('two or three in it; a team member with no handle or role', () => {
    const t = (n) => ({ name: n, handle: '' });
    expect(C.captionFor('A', { talent: [t('X'), { name: 'Y', handle: 'y' }] })).toBe('A with X and Y @y.');
    expect(C.captionFor('A', { talent: [t('X'), t('Y'), t('Z')], team: [{ role: '', name: 'Lee', handle: '' }] })).toBe('A with X, Y and Z. With Lee.');
  });
  it('no title and no credits', () => {
    expect(C.captionFor('', null)).toBe('New work.');
    expect(C.captionFor('  Garden test ', {})).toBe('Garden test.');
  });
  it("everyone tagged in a caption, once each", () => {
    expect(C.handlesIn('Rooftop with June @junepark.jpg. Hair @iryna.hmua. Again @junepark.jpg, and @sam_k!')).toEqual(['junepark.jpg', 'iryna.hmua', 'sam_k']);
    expect(C.handlesIn('mail me at me@site.com or @')).toEqual([]);
    expect(C.handlesIn('@first')).toEqual(['first']);
    expect(C.handlesIn(null)).toEqual([]);
  });
});

describe("a shoot's record", () => {
  const finals = { id: 'F', type: 'finals', fromApp: 'the-eye', fromId: 's1', toApp: 'contact-sheet', count: 12 };
  const people = { id: 'P', type: 'people', fromApp: 'the-eye', fromId: 's1', toApp: 'rounds', names: ['June Park', 'Iryna V.', 'Sam K.'] };
  const board = { id: 'B', type: 'moodboard', fromApp: 'ref', fromId: 'b1', toApp: 'the-eye', toId: 's1', name: 'Rooftop, golden hour', frozenAt: new Date(2026, 10, 7, 12).toISOString() };
  it('passed on: the finals to Layouts and the people to Rounds; came in: the board', () => {
    expect(C.passedOnRows([finals, people, board], 's1')).toEqual({
      passed: [
        { from: 'the-eye', to: 'contact-sheet', title: '12 finals to Layouts', line: 'Waiting there.', app: 'contact-sheet', params: { posts: 'F' } },
        { from: 'the-eye', to: 'rounds', title: '3 people to Rounds', line: 'June Park, Iryna V., Sam K. Thank-yous ready.', app: 'rounds', params: { at: 'people' } },
      ],
      came: [{ from: 'ref', to: 'the-eye', title: 'Rooftop, golden hour', line: 'Mood board from Ref, as of 7 Nov.', app: 'ref', params: { board: 'b1' } }],
    });
  });
  it('the finals come first, whichever passed first', () => {
    expect(C.passedOnRows([people, board, finals], 's1').passed.map((r) => r.to)).toEqual(['contact-sheet', 'rounds']);
  });
  it('two posts made; one of each; a board from a file, or with no date', () => {
    const r = C.passedOnRows([{ ...finals, count: 1, madeAt: 'x' }, { ...people, names: ['Bo'] }, { ...board, frozenAt: null, name: '', importedAt: 'bad' }, { ...board, frozenAt: null, updatedAt: null }], 's1');
    expect(r.passed.map((x) => [x.title, x.line])).toEqual([['1 final to Layouts', 'Two posts made, waiting there.'], ['1 person to Rounds', 'Bo. A thank-you ready.']]);
    expect(r.came.map((x) => [x.title, x.line, x.params])).toEqual([['Mood board', 'Mood board from Ref.', null], ['Rooftop, golden hour', 'Mood board from Ref.', { board: 'b1' }]]);
  });
  it("other shoots' links and other kinds stay out", () => {
    expect(C.passedOnRows([{ ...finals, fromId: 's2' }, { ...people, fromId: 's2' }, { ...board, toId: 's2' }, { ...finals, type: 'odd' }, { ...board, type: 'finals', fromApp: 'ref', fromId: 's1' }, { ...board, type: 'odd' }], 's1'))
      .toEqual({ passed: [], came: [] });
    expect(C.passedOnRows([{ ...people, names: undefined }], 's1').passed[0].title).toBe('0 people to Rounds');
    expect(C.passedOnRows([{ ...finals, count: undefined }], 's1').passed[0].title).toBe('0 finals to Layouts');
  });
});

describe('a record on the page', () => {
  it('rows with an address open the other notebook; without, they are plain', () => {
    const html = C.recordHtml([
      { from: 'the-eye', to: 'contact-sheet', title: '12 finals to Layouts', line: 'Waiting there.', href: '../contact-sheet/?posts=F' },
      { from: 'ref', to: 'the-eye', title: 'A <b>board</b>', line: 'Mood board from Ref.', href: '' },
    ]);
    const box = document.createElement('div');
    box.innerHTML = html;
    const rows = box.querySelectorAll('.df-record > .df-record-row');
    expect(rows).toHaveLength(2);
    expect(rows[0].tagName).toBe('A');
    expect(rows[0].getAttribute('href')).toBe('../contact-sheet/?posts=F');
    expect(rows[0].querySelector('.df-record-title').textContent).toBe('12 finals to Layouts');
    expect(rows[0].querySelector('.df-record-chev svg')).not.toBeNull();
    expect(rows[0].querySelectorAll('.df-mini')).toHaveLength(2);
    expect(rows[1].tagName).toBe('DIV');
    expect(rows[1].querySelector('.df-record-title').textContent).toBe('A <b>board</b>');
    expect(rows[1].querySelector('.df-record-chev')).toBeNull();
  });
  it('no rows, an empty record', () => {
    expect(C.recordHtml([])).toBe('<div class="df-record"></div>');
  });
  it('an address with quotes stays one attribute', () => {
    const box = document.createElement('div');
    box.innerHTML = C.recordHtml([{ from: 'ref', to: 'the-eye', title: 't', line: 'l', href: '../ref/?board="x"' }]);
    expect(box.querySelector('a').getAttribute('href')).toBe('../ref/?board="x"');
  });
});

describe('finals into posts', () => {
  it('six or more: a carousel of five spread through the set, the single the first left over', () => {
    expect(C.pickPosts(12)).toEqual({ carousel: [0, 2, 5, 7, 10], single: 1 });
    expect(C.pickPosts(6)).toEqual({ carousel: [0, 1, 2, 4, 5], single: 3 });
    expect(C.pickPosts(100)).toEqual({ carousel: [0, 20, 40, 60, 80], single: 1 });
  });
  it('two to five: only the carousel; one: only the single', () => {
    expect(C.pickPosts(5)).toEqual({ carousel: [0, 1, 2, 3, 4], single: null });
    expect(C.pickPosts(2)).toEqual({ carousel: [0, 1], single: null });
    expect(C.pickPosts(1)).toEqual({ carousel: [], single: 0 });
  });
  it('none, or not a number', () => {
    expect(C.pickPosts(0)).toEqual({ carousel: [], single: null });
    expect(C.pickPosts(-3)).toEqual({ carousel: [], single: null });
    expect(C.pickPosts('x')).toEqual({ carousel: [], single: null });
    expect(C.pickPosts(2.9)).toEqual({ carousel: [0, 1], single: null });
  });
  it("the slip's line and the page's title", () => {
    expect(C.postsLine(12, 2)).toBe('12 finals. Two posts made from them, ready to look over.');
    expect(C.postsLine(1, 1)).toBe('1 final. A post made from it, ready to look over.');
    expect(C.postsLine(4, 3)).toBe('4 finals. 3 posts made from them, ready to look over.');
    expect(C.postsTitle(2, ' Rooftop portraits ')).toBe('Two posts from Rooftop portraits');
    expect(C.postsTitle(1, '')).toBe('A post from the shoot');
  });
  it("the shoot's record says how many posts were made", () => {
    const l = { id: 'F', type: 'finals', fromApp: 'the-eye', fromId: 's1', count: 1, madeAt: 'x' };
    expect(C.passedOnRows([{ ...l, postIds: ['p1'] }], 's1').passed[0].line).toBe('A post made, waiting there.');
    expect(C.passedOnRows([{ ...l, postIds: ['p1', 'p2'] }], 's1').passed[0].line).toBe('Two posts made, waiting there.');
    expect(C.passedOnRows([{ ...l, postIds: [] }], 's1').passed[0].line).toBe('Two posts made, waiting there.');
  });
});

describe('the FROM tag', () => {
  it("in the sender's colours, with its mark", () => {
    const box = document.createElement('div');
    box.innerHTML = C.tagHtml('the-eye');
    const tag = box.querySelector('.df-slip-tag');
    expect(tag.textContent).toBe('From The Eye');
    expect(tag.getAttribute('style')).toBe(`background:${C.NOTEBOOKS['the-eye'].bg};color:${C.NOTEBOOKS['the-eye'].fg}`);
    expect(tag.querySelector('svg')).not.toBeNull();
  });
  it('another notebook, and one it does not know', () => {
    expect(C.tagHtml('rounds')).toContain('From Rounds');
    expect(C.tagHtml('odd')).toContain('background:#E1E1DC;color:#313D45');
    expect(C.tagHtml('<b>')).toContain('From &lt;b&gt;');
  });
});
