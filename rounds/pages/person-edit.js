// Edit, from a person's ... menu (04-person): their name, group (Regular,
// New, Client, Prospect, Event guest), handles, where you met, a note, and
// the newsletter lists: the email list asks for an email, the mail list
// for an address. No phone numbers (rounds/NOTES.md).
import { openSheet } from '../components/sheet.js';
import { choiceSheet } from '../components/dialogs.js';
import { esc } from '../components/util.js';
import { CHEV } from '../components/icons.js';
import { savePerson } from '../data/db.js';
import { applyEdit } from '../data/person.js';
import { GROUPS, GROUP_KEYS } from '../data/plan.js';
import { dayOf } from '../data/dates.js';

const field = (label, name, value, more = '') => `<label class="field"><span class="field-label">${label}</span><input type="text" name="${name}" value="${esc(value)}" autocomplete="off" ${more} /></label>`;
const HANDLE = 'autocapitalize="off" spellcheck="false" placeholder="@handle"';
const GROUP_WORDS = {
  regular: 'Repeat collaborators. A check-in every six weeks.',
  new: 'Just met, or shot once. Thanks or hello, then a check-in.',
  client: 'People who hired you. A refresh offer or ask for intros, every few months.',
  prospect: 'Brands and agencies. A pitch and two follow ups.',
  guest: 'People from an event. One friendly note, then the newsletter.',
};

export function openEdit(p, onSaved) {
  let group = p.group;
  const s = openSheet({
    title: 'Edit',
    body: `
      <form class="form" data-form>
        ${field('Name', 'name', p.name, 'required')}
        <button type="button" class="field-row" data-group><span class="choice-text"><span class="field-label">Group</span><span class="field-value" data-group-name>${esc(GROUPS[group])}</span></span>${CHEV}</button>
        ${field('Instagram', 'instagram', p.instagram, HANDLE)}
        ${field('TikTok', 'tiktok', p.tiktok, HANDLE)}
        ${field('Website', 'website', p.website, 'autocapitalize="off" spellcheck="false" inputmode="url"')}
        ${field('Where you met', 'where', p.where)}
        <label class="field"><span class="field-label">Note</span><textarea name="note" rows="2">${esc(p.note)}</textarea></label>
        <label class="switch-row"><span>On my email newsletter</span><input type="checkbox" class="switch" name="emailList" ${p.lists.email ? 'checked' : ''} /></label>
        <div data-email ${p.lists.email || p.email ? '' : 'hidden'}>${field('Email', 'email', p.email, 'autocapitalize="off" spellcheck="false" inputmode="email"')}</div>
        <label class="switch-row"><span>On my mail newsletter</span><input type="checkbox" class="switch" name="mailList" ${p.lists.mail ? 'checked' : ''} /></label>
        <div data-address ${p.lists.mail ? '' : 'hidden'}><label class="field"><span class="field-label">Address</span><textarea name="address" rows="3">${esc(p.address)}</textarea></label></div>
        <div class="sheet-actions">
          <button type="button" class="btn secondary" data-close>Cancel</button>
          <button type="submit" class="btn primary">Save</button>
        </div>
      </form>`,
  });
  const form = s.body.querySelector('form');
  form.emailList.addEventListener('change', () => { s.body.querySelector('[data-email]').hidden = !form.emailList.checked && !form.email.value.trim(); });
  form.mailList.addEventListener('change', () => { s.body.querySelector('[data-address]').hidden = !form.mailList.checked; });
  s.body.querySelector('[data-group]').addEventListener('click', async () => {
    const pick = await choiceSheet({ title: 'Group', options: GROUP_KEYS.map((k) => ({ key: k, label: GROUPS[k], detail: GROUP_WORDS[k], current: k === group })) });
    if (pick) { group = pick; s.body.querySelector('[data-group-name]').textContent = GROUPS[group]; }
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    const edited = applyEdit(p, { ...f, group, lists: { email: form.emailList.checked, mail: form.mailList.checked } }, dayOf());
    await savePerson(edited);
    s.close();
    onSaved(edited);
  });
  return s;
}
