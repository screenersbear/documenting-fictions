// rounds/data/lists.js: the email and mail newsletter lists, as rows for a CSV file.
import { describe, it, expect } from 'vitest';
import { listRows } from '../../../rounds/data/lists.js';

const p = (name, more) => ({ name, email: '', address: '', letGo: false, lists: { email: false, mail: false }, ...more });
const people = [
  p('Ana', { email: 'ana@x.com', lists: { email: true, mail: false } }),
  p('Bo', { email: 'bo@x.com', address: '1 Main St', lists: { email: true, mail: true } }),
  p('Cy', { address: '2 Elm St', lists: { email: true, mail: true } }),
  p('Di', { email: 'di@x.com', address: '3 Oak St', lists: { email: true, mail: true }, letGo: true }),
  p('Ed', { email: 'ed@x.com', address: '4 Pine St' }),
];

describe('listRows', () => {
  it('lists names and emails of people on the email newsletter', () => {
    expect(listRows(people, 'email')).toEqual([['name', 'email'], ['Ana', 'ana@x.com'], ['Bo', 'bo@x.com']]);
  });
  it('lists names and addresses of people on the mail newsletter', () => {
    expect(listRows(people, 'mail')).toEqual([['name', 'address'], ['Bo', '1 Main St'], ['Cy', '2 Elm St']]);
  });
  it('is just the header with no one on it', () => {
    expect(listRows([], 'mail')).toEqual([['name', 'address']]);
  });
});
