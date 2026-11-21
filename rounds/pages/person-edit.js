// Edit, from a person's ... menu (04-person): their name, groups (Regular,
// New, Client, Prospect, Event guest: chips that turn on together, as
// people/NOTES.md has it, 15 Nov), handles (after a fixed @,
// components/handle-field.js), where you met, a note, and
// the newsletter lists: the email list asks for an email, the mail list
// for an address. No phone numbers (rounds/NOTES.md).
import { openSheet } from '../components/sheet.js';
import { esc } from '../components/util.js';
import { handleFieldHtml, wireHandles } from '../components/handle-field.js';
import { savePerson } from '../data/db.js';
import { applyEdit } from '../data/person.js';
import { GROUPS, GROUP_KEYS, groupsOf, toggleGroup } from '../data/plan.js';
import { dayOf } from '../data/dates.js';

const field = (label, name, value, more = '') => `<label class="field"><span class="field-label">${label}</span><input type="text" name="${name}" value="${esc(value)}" autocomplete="off" ${more} /></label>`;
const GROUP_WORDS = {
  regular: 'Repeat collaborators. A check-in every six weeks.',
  new: 'Just met, or shot once. Thanks or hello, then a check-in.',
  client: 'People who hired you. A refresh offer or ask for intros, every few months.',
  prospect: 'Brands and agencies. A pitch and two follow ups.',
  guest: 'People from an event. One friendly note, then the newsletter.',
};

// The chips (the pill chips of styles/done-note.css), and a line on what
// the groups that are on do.
const chipsHtml = (on) => GROUP_KEYS.map((k) => `<button type="button" class="pick-chip${on.includes(k) ? ' on' : ''}" data-group="${k}" aria-pressed="${on.includes(k)}">${GROUPS[k]}</button>`).join('');
const wordsOf = (on) => on.map((k) => GROUP_WORDS[k]).join(' ');

export function openEdit(p, onSaved) {
  let groups = groupsOf(p);
  const s = openSheet({
    title: 'Edit',
    body: `
      <form class="form" data-form>
        ${field('Name', 'name', p.name, 'required')}
        <div class="field"><span class="field-label" id="groupsLabel">Groups</span>
          <div class="pick-chips edit-groups" role="group" aria-labelledby="groupsLabel">${chipsHtml(groups)}</div>
          <p class="edit-groups-words" data-group-words>${esc(wordsOf(groups))}</p></div>
        ${handleFieldHtml('Instagram', 'instagram', p.instagram)}
        ${handleFieldHtml('TikTok', 'tiktok', p.tiktok)}
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
  wireHandles(form);
  form.emailList.addEventListener('change', () => { s.body.querySelector('[data-email]').hidden = !form.emailList.checked && !form.email.value.trim(); });
  form.mailList.addEventListener('change', () => { s.body.querySelector('[data-address]').hidden = !form.mailList.checked; });
  const chips = s.body.querySelector('.edit-groups');
  chips.addEventListener('click', (e) => {
    const b = e.target.closest('[data-group]');
    if (!b) return;
    groups = toggleGroup(groups, b.dataset.group);
    chips.innerHTML = chipsHtml(groups);
    s.body.querySelector('[data-group-words]').textContent = wordsOf(groups);
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    const edited = applyEdit(p, { ...f, groups, lists: { email: form.emailList.checked, mail: form.mailList.checked } }, dayOf());
    await savePerson(edited);
    s.close();
    onSaved(edited);
  });
  return s;
}
