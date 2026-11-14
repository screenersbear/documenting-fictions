// rounds/data/contact.js: handles, websites, and where COPY AND OPEN goes.
import { describe, it, expect } from 'vitest';
import { cleanHandle, cleanSite, siteName, contactFor, profileUrl, handleText } from '../../../rounds/data/contact.js';

describe('cleanHandle', () => {
  it('takes a handle with or without @', () => {
    expect(cleanHandle('@maya.rr')).toBe('maya.rr');
    expect(cleanHandle(' @@maya.rr ')).toBe('maya.rr');
    expect(cleanHandle('maya.rr')).toBe('maya.rr');
    expect(cleanHandle('ma ya')).toBe('maya');
  });
  it('takes a link to the profile', () => {
    expect(cleanHandle('https://www.instagram.com/maya.rr/?hl=en')).toBe('maya.rr');
    expect(cleanHandle('instagram.com/dana#x')).toBe('dana');
    expect(cleanHandle('https://www.tiktok.com/@jules.m')).toBe('jules.m');
    expect(cleanHandle('TikTok.com/jules')).toBe('jules');
  });
  it('gives nothing for nothing', () => {
    expect(cleanHandle(null)).toBe('');
    expect(cleanHandle('  ')).toBe('');
  });
});

describe('cleanSite and siteName', () => {
  it('gives a website its https', () => {
    expect(cleanSite(' hobokenflowers.com ')).toBe('https://hobokenflowers.com');
    expect(cleanSite('HTTP://x.com')).toBe('HTTP://x.com');
    expect(cleanSite('https://x.com/a')).toBe('https://x.com/a');
    expect(cleanSite('')).toBe('');
    expect(cleanSite(undefined)).toBe('');
  });
  it('says a website by its name', () => {
    expect(siteName('https://www.hobokenflowers.com/')).toBe('hobokenflowers.com');
    expect(siteName('HTTP://WWW.x.com//')).toBe('x.com');
    expect(siteName('https://x.com/shop')).toBe('x.com/shop');
  });
});

describe('contactFor', () => {
  const all = { instagram: 'maya.rr', tiktok: 'maya', email: 'hi@shop.com', website: 'https://shop.com' };
  it('goes to Instagram first', () => {
    expect(contactFor(all, 'Hi')).toEqual({ how: 'Instagram', url: 'https://www.instagram.com/maya.rr/' });
    expect(contactFor({ instagram: 'a b?' }).url).toBe('https://www.instagram.com/a%20b%3F/');
  });
  it('then TikTok, then email with the message in it, then the website', () => {
    expect(contactFor({ ...all, instagram: '' })).toEqual({ how: 'TikTok', url: 'https://www.tiktok.com/@maya' });
    expect(contactFor({ email: 'hi@shop.com', website: 'https://shop.com' }, 'Hi & hello')).toEqual({ how: 'email', url: 'mailto:hi@shop.com?body=Hi%20%26%20hello' });
    expect(contactFor({ email: 'a@b.c' }).url).toBe('mailto:a@b.c?body=');
    expect(contactFor({ website: 'https://shop.com' })).toEqual({ how: 'website', url: 'https://shop.com' });
  });
  it('gives null with nowhere to go', () => {
    expect(contactFor({})).toBe(null);
  });
});

describe('profileUrl and handleText', () => {
  it('opens a profile, never an email', () => {
    expect(profileUrl({ instagram: 'maya.rr', email: 'a@b.c' })).toBe('https://www.instagram.com/maya.rr/');
    expect(profileUrl({ email: 'a@b.c', website: 'https://shop.com' })).toBe('https://shop.com');
    expect(profileUrl({ email: 'a@b.c' })).toBe('');
  });
  it('says the handle under a name', () => {
    expect(handleText({ instagram: 'maya.rr', tiktok: 'x' })).toBe('@maya.rr');
    expect(handleText({ tiktok: 'jules' })).toBe('@jules');
    expect(handleText({ website: 'https://www.shop.com/' })).toBe('shop.com');
    expect(handleText({ email: 'a@b.c' })).toBe('');
  });
});
