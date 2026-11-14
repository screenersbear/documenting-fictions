// ADD SOMEONE (rounds/NOTES.md): a name, their handle, one line about where
// you met. They start as New, with a Say hello; Edit has the rest.
import { openSheet } from '../components/sheet.js';
import { toast } from '../components/toast.js';
import { uuid } from '../components/util.js';
import { newPerson } from '../data/person.js';
import { savePerson } from '../data/db.js';
import { dayOf } from '../data/dates.js';

// onAdded(person) runs once they're saved.
export function openAddPerson(onAdded) {
  const s = openSheet({
    title: 'Add someone',
    body: `
      <form class="form" data-form>
        <label class="field"><span class="field-label">Name</span><input type="text" name="name" autocomplete="off" required /></label>
        <label class="field"><span class="field-label">Instagram</span><input type="text" name="instagram" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="@handle" /></label>
        <label class="field"><span class="field-label">Where you met</span><input type="text" name="where" autocomplete="off" placeholder="The Brooklyn portrait meetup" /></label>
        <div class="sheet-actions">
          <button type="button" class="btn secondary" data-close>Cancel</button>
          <button type="submit" class="btn primary">Add</button>
        </div>
      </form>`,
  });
  const form = s.body.querySelector('form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    if (!f.name.trim()) { form.name.focus(); return; }
    const p = newPerson({ ...f, id: uuid() }, dayOf());
    await savePerson(p);
    s.close();
    toast(`${p.name} is in Rounds.`);
    onAdded(p);
  });
  return s;
}
