// A person's photo: one added in Rounds, else their talent photo from The
// Eye, else their initials on a pale grey. Photos are shown as they are,
// never tinted or covered.
import { getPhoto, savePhoto, dropPhoto } from '../data/db.js';
import { eyePhoto } from '../data/eye.js';
import { esc, canvasToBlob, loadImage } from './util.js';

const srcs = new Map(); // id -> the photo's address, worked out once

const initials = (name) => String(name || '').trim().split(/\s+/).slice(0, 2).map((w) => w[0] || '').join('');

export const photoHtml = (person, cls = '') =>
  `<span class="ph ${cls}" data-ph="${esc(person.id)}" aria-hidden="true"><span class="ph-initials">${esc(initials(person.name))}</span></span>`;

async function srcFor(person) {
  if (!srcs.has(person.id)) {
    srcs.set(person.id, (async () => {
      const own = await getPhoto(person.id);
      if (own) return URL.createObjectURL(own);
      return person.photoKey ? eyePhoto(person.photoKey) : '';
    })());
  }
  return srcs.get(person.id);
}

// Puts the photos into the placeholders under root, as they load.
export function fillPhotos(root, people) {
  const byId = new Map(people.map((p) => [p.id, p]));
  root.querySelectorAll('[data-ph]').forEach(async (el) => {
    const p = byId.get(el.dataset.ph);
    const src = p && (await srcFor(p).catch(() => ''));
    if (!src || !el.isConnected) return;
    const img = new Image();
    img.alt = '';
    img.decoding = 'async';
    img.src = src;
    el.append(img);
  });
}

// A photo picked for someone: kept at most 900px on its long side, as bytes.
export async function keepPhoto(person, file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const k = Math.min(1, 900 / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth * k);
    c.height = Math.round(img.naturalHeight * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const blob = await canvasToBlob(c, 'image/jpeg', 0.86);
    await savePhoto(person.id, await blob.arrayBuffer(), 'image/jpeg');
  } finally {
    URL.revokeObjectURL(url);
  }
  forget(person.id);
}
export async function removePhoto(person) {
  await dropPhoto(person.id);
  forget(person.id);
}
function forget(id) {
  const old = srcs.get(id);
  srcs.delete(id);
  old?.then((src) => { if (src.startsWith('blob:')) URL.revokeObjectURL(src); });
}
export const hasOwnPhoto = async (person) => !!(await getPhoto(person.id));
