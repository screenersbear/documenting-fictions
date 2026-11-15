// the-eye/components/lessons-to-ref.js: LESSONS FOR NEXT TIME going to Ref
// (round 2, connect/10), with a switch to keep a shoot's lessons to itself.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadDFData } from '../shared/_env.mjs';

beforeEach(async () => {
  await loadDFData();
  delete window.EyeParts;
  document.body.innerHTML = '<select id="shootCategory"><option value="portrait">Portrait</option><option value="">None</option></select><div id="lessonsRef" hidden></div>';
  await import('../../../the-eye/components/lessons-to-ref.js?' + Math.random());
});
afterEach(() => { delete window.DF_SUITE; document.body.innerHTML = ''; });

function app(talents = []) {
  const ed = {
    currentTalents: talents,
    CATEGORY_LABELS: { portrait: 'Portrait', commercial: 'Commercial' },
    hasText: (v) => typeof v === 'string' && v.trim() !== '',
    joinWithAnd: (n) => (n.length < 2 ? n.join('') : `${n.slice(0, -1).join(', ')} and ${n[n.length - 1]}`),
    escapeHtml: (v) => { const d = document.createElement('div'); d.textContent = v; return d.innerHTML; },
    scheduleShootAutosave: vi.fn(),
  };
  window.EyeParts.addLessonsToRef(ed);
  return ed;
}

describe('lessonsRefWords', () => {
  const june = { name: 'June Park' };
  it("says who and which kind they're filed under", () => {
    const ed = app();
    expect(ed.lessonsRefWords([june], 'portrait', true)).toBe('Goes to Ref as next-time notes, for June and for Portrait boards.');
    expect(ed.lessonsRefWords([june, { name: 'Leo Grant' }, { name: 'June Other' }], 'commercial', true)).toBe('Goes to Ref as next-time notes, for June and Leo and for Commercial boards.');
    expect(ed.lessonsRefWords([june], '', true)).toBe('Goes to Ref as next-time notes, for June.');
    expect(ed.lessonsRefWords([], 'portrait', true)).toBe('Goes to Ref as next-time notes, for Portrait boards.');
  });
  it('no one and no kind, or nameless talent: just that they go', () => {
    expect(app().lessonsRefWords([null, { name: ' ' }], 'mystery', true)).toBe('Goes to Ref as next-time notes.');
    expect(app().lessonsRefWords(undefined, '', true)).toBe('Goes to Ref as next-time notes.');
  });
  it('switched off: kept to this shoot', () => {
    expect(app().lessonsRefWords([june], 'portrait', false)).toBe("Kept to this shoot. Ref doesn't get these lessons.");
  });
});

describe('drawLessonsRef', () => {
  const box = () => document.getElementById('lessonsRef');
  it('in the suite: the marks, the words and the switch, on unless the shoot keeps them', () => {
    window.DF_SUITE = {};
    const ed = app([{ name: 'June Park' }]);
    ed.drawLessonsRef();
    expect(box().hidden).toBe(false);
    expect(box().querySelector('.df-pair')).not.toBeNull();
    expect(box().querySelector('.lessons-ref-words').textContent).toBe('Goes to Ref as next-time notes, for June and for Portrait boards.');
    expect(box().querySelector('[role="switch"]').getAttribute('aria-checked')).toBe('true');
    ed.drawLessonsRef(false);
    expect(ed.lessonsToRef).toBe(false);
    expect(box().querySelector('[role="switch"]').getAttribute('aria-checked')).toBe('false');
  });
  it('the switch keeps them to the shoot, or sends them again, and saves', () => {
    window.DF_SUITE = {};
    const ed = app();
    ed.drawLessonsRef(true);
    box().querySelector('[data-lessons-ref]').click();
    expect(ed.lessonsToRef).toBe(false);
    expect(box().querySelector('.lessons-ref-words').textContent).toBe("Kept to this shoot. Ref doesn't get these lessons.");
    expect(ed.scheduleShootAutosave).toHaveBeenCalledTimes(1);
    box().querySelector('[data-lessons-ref]').click();
    expect(ed.lessonsToRef).toBe(true);
    box().click(); // not the switch
    expect(ed.scheduleShootAutosave).toHaveBeenCalledTimes(2);
  });
  it('on its own (no Ref), or without the shared files: no card, the setting kept', () => {
    const ed = app();
    box().innerHTML = 'old';
    ed.drawLessonsRef(false);
    expect(box().hidden).toBe(true);
    expect(box().innerHTML).toBe('');
    expect(ed.lessonsToRef).toBe(false);
    delete window.DFData;
    ed.drawLessonsRef(true);
    expect(box().hidden).toBe(true);
  });
});
