// Sync, from Options (rounds/NOTES.md, Sync and the Claude inbox): a private
// GitHub repository just for Rounds, through which Claude reads Rounds and
// leaves leads. Off: the repository and a key, with how to make them. On:
// where it syncs, when it last did, what went wrong, and Sync now, Change
// key, Turn off sync. The key stays on this phone (data/device.js). On its
// own (rounds/STANDALONE.md), Rounds is for other photographers: its words
// never mention Claude.
import { openSheet } from '../components/sheet.js';
import { toast } from '../components/toast.js';
import { esc } from '../components/util.js';
import { CHEV } from '../components/icons.js';
import { syncConfig, getConflicts, turnOff } from '../data/sync.js';
import { queued, startAutoSync, stopAutoSync } from '../data/auto-sync.js';
import { validRepo, repoOf } from '../data/github.js';
import { deviceLabel } from '../data/sync-file.js';
import { agoWords } from '../data/dates.js';
import { openConflicts } from './conflicts.js';

const OFF = () => (window.DF_SUITE ? 'Off. Lets Claude read Rounds and leave leads in it.' : 'Off. Keeps Rounds the same on all your devices.');
const statusOf = (c) => `On, through ${c.repo}. Last synced: ${c.lastSyncAt ? agoWords(c.lastSyncAt) : 'not yet'}`;

// Options' row.
export async function syncRowHtml() {
  const c = await syncConfig();
  return `<button type="button" class="choice" data-sync><span class="choice-text"><span class="choice-label">Sync</span><span class="choice-detail">${esc(c ? statusOf(c) : OFF())}</span></span>${CHEV}</button>`;
}

// onSynced: what Rounds shows may have changed.
export async function openSync(onSynced, autoHandler) {
  const c = await syncConfig();
  if (!c) return openSetup(null, onSynced, autoHandler);
  const clashes = (await getConflicts()).length;
  // SYNC NOW and TURN OFF SYNC reach GitHub or forget the key: the button clicker leaves them alone.
  const s = openSheet({
    title: 'Sync',
    className: 'sheet-small',
    body: `
      <p class="sync-status">${esc(statusOf(c))}</p>
      ${c.lastError ? `<p class="field-error">${esc(c.lastError)}</p>` : ''}
      ${clashes ? `<p class="sync-status">${clashes === 1 ? 'One thing was' : `${clashes} things were`} changed on two devices at once.</p>` : ''}
      <div class="choice-list">
        ${clashes ? '<button type="button" class="choice" data-clashes><span class="choice-text"><span class="choice-label">Choose which to keep</span></span></button>' : ''}
        <button type="button" class="choice" data-now data-test-skip><span class="choice-text"><span class="choice-label">Sync now</span></span></button>
        <button type="button" class="choice" data-key><span class="choice-text"><span class="choice-label">Change key</span></span></button>
        <button type="button" class="choice is-danger" data-off data-test-skip><span class="choice-text"><span class="choice-label">Turn off sync</span><span class="choice-detail">Rounds keeps everything on this phone.</span></span></button>
      </div>`,
  });
  s.body.addEventListener('click', async (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.matches('[data-clashes]')) { s.close(); openConflicts(onSynced); }
    else if (b.matches('[data-key]')) { s.close(); openSetup(c, onSynced, autoHandler); }
    else if (b.matches('[data-off]')) {
      await turnOff();
      stopAutoSync();
      s.close();
      toast('Sync is off. Everything stays on this phone.');
      onSynced();
    } else if (b.matches('[data-now]')) {
      b.disabled = true;
      try {
        const r = await queued();
        s.close();
        toast(r.changedHere ? 'Synced. Changes from the repository are in.' : 'Synced.');
        onSynced();
      } catch (ex) {
        b.disabled = false;
        toast(ex.message, { ms: 6000 });
      }
    }
  });
  return s;
}

function openSetup(c, onSynced, autoHandler) {
  // TURN ON SYNC reaches GitHub: the button clicker leaves it alone.
  const s = openSheet({
    title: c ? 'Change key' : 'Turn on sync',
    body: `<form class="form" novalidate>
      <details class="sync-how"${c ? '' : ' open'}>
        <summary>How to make the repository and key</summary>
        <ol class="sync-steps">
          <li>On github.com, make a new private repository just for Rounds, like rounds-data, and tick Add a README file.</li>
          <li>In your GitHub settings: Developer settings, Personal access tokens, Fine-grained tokens, Generate new token.</li>
          <li>Repository access: Only select repositories, then pick that repository.</li>
          <li>Permissions, Repository permissions: Contents, Read and write.</li>
          <li>Generate it and paste it below. It stays on this phone.</li>
        </ol>
      </details>
      <label class="field"><span class="field-label">Repository</span><input name="repo" value="${esc(c ? c.repo : '')}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="your-name/rounds-data" /></label>
      <p class="field-error" data-error="repo" hidden>Write it as owner/name, like your-name/rounds-data.</p>
      <label class="field"><span class="field-label">Key</span><input name="token" type="password" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="github_pat_..." /></label>
      <p class="field-error" data-error="token" hidden>Paste the key from GitHub.</p>
      <p class="field-error" data-error="sync" hidden></p>
      <div class="sheet-actions one"><button type="submit" class="btn primary" data-save data-test-skip>${c ? 'Save and sync' : 'Turn on sync'}</button></div>
    </form>`,
  });
  const form = s.body.querySelector('form');
  const show = (k, msg) => {
    const el = form.querySelector(`[data-error="${k}"]`);
    if (msg) el.textContent = msg;
    el.hidden = false;
  };
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const repo = repoOf(form.repo.value);
    const token = form.token.value.trim();
    form.querySelectorAll('.field-error').forEach((el) => { el.hidden = true; });
    if (!validRepo(repo)) return show('repo');
    if (!token) return show('token');
    const btn = form.querySelector('[data-save]');
    const label = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Connecting...';
    try {
      const r = await queued({ repo, token, device: deviceLabel(navigator.userAgent), joined: !!(c && c.repo === repo && c.joined) });
      s.close();
      startAutoSync(autoHandler);
      toast(r.changedHere ? 'Sync is on. What was in the repository is in Rounds too.' : 'Sync is on.');
      onSynced();
    } catch (ex) {
      show('sync', ex.message);
      btn.disabled = false;
      btn.textContent = label;
    }
    return null;
  });
  return s;
}
