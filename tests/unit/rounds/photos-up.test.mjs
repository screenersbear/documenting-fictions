// rounds/data/photos-up.js: Your photos are up, for the people tagged in a post shared from Layouts.
import { describe, it, expect } from 'vitest';
import { taggedIn, photosUp, takePosts, slipLine, writeWho } from '../../../rounds/data/photos-up.js';
import { newPerson } from '../../../rounds/data/person.js';
import { move } from '../../../rounds/data/plan.js';

const T = '2026-11-14';
const june = newPerson({ id: 'j', name: 'June Park', instagram: '@JunePark.jpg', next: move('checkin', '2026-12-01') }, T);
const iryna = newPerson({ id: 'i', name: 'Iryna', tiktok: 'iryna.hmua', next: move('thanks', T) }, T);
const sam = newPerson({ id: 's', name: 'Sam K.', instagram: 'samk', next: null }, T);
const gone = { ...newPerson({ id: 'g', name: 'Gone', instagram: 'gone' }, T), letGo: true };
const post = (handles, more = {}) => ({ id: 'l1', type: 'post-people', title: 'Rooftop portraits', handles, ...more });

describe('taggedIn', () => {
  it('finds everyone tagged, on Instagram or TikTok, in any case', () => {
    expect(taggedIn([june, iryna, sam], ['junepark.jpg', '@IRYNA.HMUA']).map((p) => p.id)).toEqual(['j', 'i']);
  });
  it('leaves out anyone let go, and anyone not tagged', () => {
    expect(taggedIn([june, gone], ['gone', 'nobody'])).toEqual([]);
  });
  it('finds no one for no handles', () => {
    expect(taggedIn([june], [])).toEqual([]);
    expect(taggedIn([june], undefined)).toEqual([]);
    expect(taggedIn([{ ...june, instagram: '', tiktok: '' }], ['', '@'])).toEqual([]);
  });
});

describe('photosUp', () => {
  it('gives them the move today, with the shoot, standing in for the one they had', () => {
    expect(photosUp(june, ' Rooftop portraits ', T).next).toEqual({ kind: 'photos', due: T, step: 0, shoot: 'Rooftop portraits', then: move('checkin', '2026-12-01') });
    expect(june.next.kind).toBe('checkin'); // the old one stays as it was
  });
  it('folds in a thank-you still waiting, and stands in for nothing when nothing was next', () => {
    expect(photosUp(iryna, 'Rooftop portraits', T).next).toEqual({ kind: 'photos', due: T, step: 0, shoot: 'Rooftop portraits' });
    expect(photosUp(sam, '', T).next).toEqual({ kind: 'photos', due: T, step: 0 });
  });
  it('a second post keeps what the first stood in for', () => {
    const twice = photosUp(photosUp(june, 'One', T), 'Two', T);
    expect(twice.next).toEqual({ kind: 'photos', due: T, step: 0, shoot: 'Two', then: move('checkin', '2026-12-01') });
    expect(photosUp(photosUp(sam, 'One', T), undefined, T).next).toEqual({ kind: 'photos', due: T, step: 0 });
  });
});

describe('takePosts', () => {
  it('gives everyone tagged the move, and says who each post tagged', () => {
    const { changed, taken } = takePosts([june, iryna, sam], [post(['junepark.jpg', 'iryna.hmua', 'nobody'])], T);
    expect(changed.map((p) => [p.id, p.next.kind, p.next.shoot])).toEqual([['j', 'photos', 'Rooftop portraits'], ['i', 'photos', 'Rooftop portraits']]);
    expect(taken).toEqual([{ link: post(['junepark.jpg', 'iryna.hmua', 'nobody']), ids: ['j', 'i'] }]);
  });
  it('changes someone in two posts once, as they are after both', () => {
    const { changed, taken } = takePosts([june], [post(['junepark.jpg']), post(['junepark.jpg'], { id: 'l2', title: 'Beach day' })], T);
    expect(changed).toHaveLength(1);
    expect(changed[0].next).toMatchObject({ shoot: 'Beach day', then: move('checkin', '2026-12-01') });
    expect(taken.map((t) => t.ids)).toEqual([['j'], ['j']]);
  });
  it('takes a post that tags no one here, and passes over one already taken', () => {
    const { changed, taken } = takePosts([june], [post(['nobody']), post(['junepark.jpg'], { id: 'l2', takenAt: '2026-11-13' }), null], T);
    expect(changed).toEqual([]);
    expect(taken).toEqual([{ link: post(['nobody']), ids: [] }]);
    expect(takePosts([june], undefined, T)).toEqual({ changed: [], taken: [] });
  });
});

describe('slipLine', () => {
  it('says who is tagged and that a note is ready', () => {
    expect(slipLine(['June Park'])).toBe('June Park is tagged in the post. A note is ready.');
    expect(slipLine(['June Park', 'Iryna'])).toBe('June Park and Iryna are tagged in the post. A note for each is ready.');
    expect(slipLine(['June Park', 'Iryna', 'Sam K.'])).toBe('June Park, Iryna and Sam K. are tagged in the post. A note for each is ready.');
  });
  it('is empty for no one', () => {
    expect(slipLine([])).toBe('');
  });
});

describe('writeWho', () => {
  it('writes to the one person by first name, or to them', () => {
    expect(writeWho(['June Park'])).toBe('Write to June');
    expect(writeWho(['June Park', 'Iryna'])).toBe('Write to them');
  });
});
