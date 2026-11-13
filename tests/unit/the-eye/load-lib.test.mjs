// the-eye/components/load-lib.js: The Eye loads someone else's library from
// lib/ (the PDF maker, the PDF viewer) the first time it needs it, instead of
// with the page, so it opens sooner.
import { describe, it, expect, vi, beforeEach } from 'vitest';

let ed;
beforeEach(async () => {
  vi.resetModules(); // the script runs once per import: a fresh copy each time
  delete window.thing;
  delete window.other;
  delete window.EyeParts;
  document.head.innerHTML = '';
  await import('../../../the-eye/components/load-lib.js');
  ed = {};
  window.EyeParts.addLoadLib(ed);
});
const tag = (src) => document.head.querySelector(`script[src="${src}"]`);
// What a library does once its file has loaded: it puts itself on window.
const arrive = (src, name) => {
  window[name] = { name };
  tag(src).dispatchEvent(new Event('load'));
};
const fail = (src) => tag(src).dispatchEvent(new Event('error'));
const tags = () => document.querySelectorAll('script');

describe('loadLib', () => {
  it('is all addLoadLib adds', () => {
    expect(Object.keys(ed)).toEqual(['loadLib']);
  });
  it('hands back the library straight away when it is already there', async () => {
    window.thing = { already: true };
    await expect(ed.loadLib('lib/thing.js', 'thing')).resolves.toBe(window.thing);
    expect(tags()).toHaveLength(0);
  });
  it('otherwise adds one script tag to the head and hands back the library once it has run', async () => {
    const loading = ed.loadLib('lib/thing.js', 'thing');
    expect(tags()).toHaveLength(1);
    expect(tag('lib/thing.js')).not.toBe(null);
    arrive('lib/thing.js', 'thing');
    await expect(loading).resolves.toEqual({ name: 'thing' });
  });
  it('asks for it only once, while it loads and after', async () => {
    const first = ed.loadLib('lib/thing.js', 'thing');
    expect(ed.loadLib('lib/thing.js', 'thing')).toBe(first);
    arrive('lib/thing.js', 'thing');
    await first;
    expect(ed.loadLib('lib/thing.js', 'thing')).toBe(first);
    expect(tags()).toHaveLength(1);
  });
  it('loads two libraries each on its own', async () => {
    const thing = ed.loadLib('lib/thing.js', 'thing');
    const other = ed.loadLib('lib/other.js', 'other');
    expect(other).not.toBe(thing);
    expect(tags()).toHaveLength(2);
    arrive('lib/other.js', 'other');
    arrive('lib/thing.js', 'thing');
    await expect(thing).resolves.toEqual({ name: 'thing' });
    await expect(other).resolves.toEqual({ name: 'other' });
  });
  it("says so when it can't load, takes its tag away, and tries afresh the next time", async () => {
    const first = ed.loadLib('lib/thing.js', 'thing');
    fail('lib/thing.js');
    await expect(first).rejects.toThrow(/^lib\/thing\.js did not load$/);
    expect(tags()).toHaveLength(0);
    const second = ed.loadLib('lib/thing.js', 'thing');
    expect(second).not.toBe(first);
    expect(tags()).toHaveLength(1);
    arrive('lib/thing.js', 'thing');
    await expect(second).resolves.toEqual({ name: 'thing' });
  });
  it('a failed library leaves the others alone', async () => {
    const thing = ed.loadLib('lib/thing.js', 'thing');
    const other = ed.loadLib('lib/other.js', 'other');
    fail('lib/thing.js');
    await expect(thing).rejects.toThrow('did not load');
    expect(ed.loadLib('lib/other.js', 'other')).toBe(other);
    expect(tag('lib/other.js')).not.toBe(null);
  });
});
