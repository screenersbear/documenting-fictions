// One entry, open to read and write. Everything saves as you go: date, a
// title if you like, the writing, photos, the shoot it's about (inside
// the suite, picked from The Eye's shoots, read only) and a takeaway.
import { ICONS } from './icons.js';
import { back as goBack } from './nav.js';
import { esc, debounce } from './util.js';
import { confirmSheet, choiceSheet, toast } from './ui.js';
import { pickPrompt } from './prompts.js';
import { getEntry, saveEntry, deleteEntry, newEntry, photos, setPhotos, hasWords, prettyDay } from './store.js';

const D = window.DFData;
const back = () => goBack('#/entries');

// The Eye's shoots, read from where The Eye keeps them (inside the suite only).
function eyeShoots() {
  if (!D.inSuite()) return [];
  const st = D.eyeState();
  if (!st || !Array.isArray(st.shoots)) return [];
  return st.shoots.filter((s) => s && s.id).map((s) => ({ id: s.id, name: D.eyeShootName(s, st.titleDisplayMode), date: s.date || '' }))
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

function grow(t) { t.style.height = 'auto'; t.style.height = `${t.scrollHeight + 2}px`; }

function resizePhoto(file, max = 1600) {
  return new Promise((ok, no) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(img.naturalWidth * k); c.height = Math.round(img.naturalHeight * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      ok(c.toDataURL('image/jpeg', 0.86));
    };
    img.onerror = () => { URL.revokeObjectURL(url); no(new Error('That photo couldn\'t be opened.')); };
    img.src = url;
  });
}

export async function entryScreen(view, id) {
  const fresh = !id;
  let e = fresh ? newEntry() : await getEntry(id);
  if (!e) {
    view.innerHTML = '<div class="screen"><p class="note center">That entry isn\'t here any more.</p></div>';
    return () => {};
  }
  let saved = !fresh; // a new entry is only kept once something's written in it
  let pics = fresh ? [] : await photos(e.id);
  const shoots = eyeShoots();
  const eyeLink = (shootId) => D.notebookUrl('the-eye', { shoot: shootId });
  const shootName = () => { const s = shoots.find((x) => x.id === e.shootId); return s ? s.name : (e.shootName || ''); };

  const field = (label, f, opts = {}) => `<label class="group">
      <span class="label">${esc(label)}</span>
      ${opts.area
        ? `<textarea class="write${opts.big ? ' big' : ''}" data-f="${f}" rows="${opts.rows || 3}" placeholder="${esc(opts.placeholder || '')}">${esc(e[f] || '')}</textarea>`
        : `<input class="hand-input" type="${opts.type || 'text'}" data-f="${f}" value="${esc(f === 'tags' ? (e.tags || []).join(', ') : e[f] || '')}" placeholder="${esc(opts.placeholder || '')}" autocomplete="off" />`}
    </label>`;

  const body = `${field('Date', 'date', { type: 'date' })}
      ${field('Title', 'title', { placeholder: 'If you like' })}
      <div class="group">
        <span class="label">What's on your mind</span>
        <textarea class="write big" data-f="body" rows="7" placeholder="Anything on your mind?">${esc(e.body || '')}</textarea>
        <button type="button" class="link-btn" data-prompt>${ICONS.bulb}<span>Need a starting prompt?</span></button>
      </div>
      <div class="group"><span class="label">Photos</span><div class="pics" data-pics></div></div>
      ${shoots.length || e.shootId ? `<div class="group"><span class="label">About a shoot</span><button type="button" class="pick-line" data-shoot>${esc(shootName() || 'None')}</button>${e.shootId && eyeLink(e.shootId) ? `<a class="small-link" href="${eyeLink(e.shootId)}">Open it in The Eye</a>` : ''}</div>` : ''}
      ${field('Takeaway', 'takeaway', { area: true, rows: 2, placeholder: 'The one thing to keep from this' })}`;

  view.innerHTML = `<div class="screen entry-page">
    <div class="folder-head">
      <button type="button" class="icon-btn" data-back aria-label="Back">${ICONS.back}</button>
      <h1>${fresh ? 'New entry' : 'Entry'}</h1>
      <button type="button" class="icon-btn" data-delete aria-label="Delete this entry">${ICONS.trash}</button>
    </div>
    <div class="scroll"><div class="form-page">${body}</div></div>
  </div>`;
  const root = view.querySelector('.screen');
  root.querySelectorAll('textarea').forEach(grow);

  let dirty = false; // only a real change is saved
  const store = async () => {
    if (!dirty) return;
    if (!saved && !hasWords(e) && !pics.length) return; // nothing written yet: nothing kept
    dirty = false;
    saved = true;
    await saveEntry(e);
    if (fresh && location.hash === '#/new') history.replaceState(null, '', `#/entry/${encodeURIComponent(e.id)}`);
  };
  const later = debounce(() => store().catch((err) => toast(err.message || 'That wasn\'t saved.')), 450);

  root.addEventListener('input', (ev) => {
    const t = ev.target.closest('[data-f]');
    if (!t) return;
    const f = t.dataset.f;
    if (f === 'tags') e.tags = t.value.split(',').map((x) => x.trim()).filter(Boolean);
    else if (f === 'date') e.date = t.value || e.date;
    else e[f] = t.value;
    if (t.tagName === 'TEXTAREA') grow(t);
    dirty = true;
    later();
  });

  // Photos
  const picsEl = root.querySelector('[data-pics]');
  const drawPics = () => {
    if (!picsEl) return;
    picsEl.innerHTML = pics.map((p, i) => `<span class="pic"><img src="${esc(p.src)}" alt="" /><button type="button" class="pic-x" data-remove="${i}" aria-label="Remove this photo">${ICONS.x}</button></span>`).join('')
      + `<label class="pic add" aria-label="Add photos">${ICONS.photo}<input type="file" accept="image/*" multiple hidden /></label>`;
  };
  drawPics();
  picsEl?.addEventListener('change', async (ev) => {
    const files = [...(ev.target.files || [])];
    if (!files.length) return;
    try {
      for (const f of files) pics.push({ src: await resizePhoto(f), caption: '' });
      dirty = true;
      await store();
      await setPhotos(e.id, pics);
      drawPics();
    } catch (err) { toast(err.message || 'That photo wasn\'t added.'); }
  });
  picsEl?.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-remove]');
    if (!b) return;
    ev.preventDefault();
    if (!(await confirmSheet({ title: 'Remove photo', message: 'Take this photo off the entry?', confirmLabel: 'Remove', danger: true }))) return;
    pics.splice(Number(b.dataset.remove), 1);
    await setPhotos(e.id, pics);
    drawPics();
  });

  let lastPrompt = '';
  root.addEventListener('click', async (ev) => {
    if (ev.target.closest('[data-back]')) { back(); return; }
    if (ev.target.closest('[data-prompt]')) {
      const t = root.querySelector('[data-f="body"]');
      const p = pickPrompt(lastPrompt);
      lastPrompt = p;
      const rest = t.value.replace(/^\[[^\]]*\]\s*/, '');
      t.value = `[${p}]\n\n${rest}`;
      e.body = t.value;
      dirty = true;
      grow(t);
      t.focus();
      t.setSelectionRange(t.value.length, t.value.length);
      later();
      return;
    }
    if (ev.target.closest('[data-shoot]')) {
      const options = [{ key: '', label: 'None', current: !e.shootId }, ...shoots.map((s) => ({ key: s.id, label: s.name, detail: s.date ? prettyDay(s.date) : '', current: s.id === e.shootId }))];
      const pick = await choiceSheet({ title: 'About a shoot', options });
      if (pick === null || pick === undefined) return;
      e.shootId = pick || null;
      const s = shoots.find((x) => x.id === e.shootId);
      e.shootName = s ? s.name : '';
      dirty = true;
      await store();
      ev.target.closest('[data-shoot]').textContent = shootName() || 'None';
      const g = ev.target.closest('.group');
      g.querySelector('.small-link')?.remove();
      if (e.shootId && eyeLink(e.shootId)) g.insertAdjacentHTML('beforeend', `<a class="small-link" href="${eyeLink(e.shootId)}">Open it in The Eye</a>`);
      return;
    }
    if (ev.target.closest('[data-delete]')) {
      if (!saved) { back(); return; }
      if (!(await confirmSheet({ title: 'Delete entry', message: 'This entry and its photos go for good.', confirmLabel: 'Delete', danger: true }))) return;
      try { await deleteEntry(e.id); } catch (err) { toast(err.message || "That entry wasn't deleted."); return; }
      saved = false;
      toast('Entry deleted');
      back();
    }
  });

  // Leaving: whatever's waiting gets saved now.
  return () => { later.cancel(); store().catch(console.error); };
}
