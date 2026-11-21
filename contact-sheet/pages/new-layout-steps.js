// The new layout guide's two steps, drawn (round 2, 02-new-layout-size
// and 03-new-layout-template): Size (cards drawn at their true shape, in
// three groups) and Template (cards with a two-slide spread, Blank first).
// The Name step went on 21 Nov: a layout is named for the day it's made.
// new-layout.js runs them.
import { RATIOS, SLIDE_W } from '../data/formats.js';
import { spreadSvg } from '../components/template-picture.js';
import { esc } from '../components/util.js';

export const MARKS = ['Size', 'Template'];

// The sizes as the guide shows them: a short name and what's under it.
export const SIZE_GROUPS = [
  ['Feed and story', [['4:5', 'Feed', '4:5'], ['3:4', 'Feed', '3:4'], ['1:1', 'Square', '1:1'], ['9:16', 'Story', '9:16']]],
  ['Print', [['2:3', 'Photo', '4 × 6'], ['3:2', 'Photo', '6 × 4'], ['5:7', 'Photo', '5 × 7'], ['8:10', 'Print', '8 × 10']]],
  // Paper beside screens (refining round, 21 Nov): Letter had sat under Screen.
  ['Paper and screen', [['letter', 'Letter', 'US'], ['a4', 'A4', ''], ['4:3', 'Landscape', '4:3'], ['16:9', 'Wide', '16:9']]],
];

const MORE = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><circle cx="12" cy="5" r="1.6" fill="currentColor"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/><circle cx="12" cy="19" r="1.6" fill="currentColor"/></svg>';

const head = (title, ask) => `<h1 class="page-title">${esc(title)}</h1><p class="page-ask">${esc(ask)}</p>`;

// A size's shape: about the same area for each, the longer side at most 60.
function shape(ratio) {
  const r = SLIDE_W / RATIOS[ratio].h;
  let w = Math.sqrt(2025 * r), h = Math.sqrt(2025 / r);
  const k = Math.min(1, 60 / Math.max(w, h));
  w *= k; h *= k;
  return `<span class="size-shape-box"><span class="size-shape" style="width:${w.toFixed(1)}px;height:${h.toFixed(1)}px"></span></span>`;
}

export function sizeStep(W) {
  const card = ([key, name, sub]) => `<button type="button" class="size-card" role="radio" aria-checked="${key === W.ratio}" data-ratio="${key}" aria-label="${esc(RATIOS[key].label)}">${shape(key)}<span class="size-name">${esc(name)}</span><span class="size-sub">${esc(sub)}</span></button>`;
  return `${head('Size', 'Where will this one live?')}
    ${SIZE_GROUPS.map(([group, sizes]) => `<p class="guide-group">${esc(group)}</p><div class="size-cards" role="radiogroup" aria-label="${esc(group)}">${sizes.map(card).join('')}</div>`).join('')}`;
}

// list: the templates for this size, each already in it. Built-in ones (the
// Story set) have no More menu: there's nothing to rename or delete.
export function templateStep(W, list, blank) {
  const card = (t, id) => `
    <div class="tpl-pick${W.template === id ? ' on' : ''}">
      <button type="button" class="tpl-pick-btn" role="radio" aria-checked="${W.template === id}" data-use="${esc(id)}">
        <span class="tpl-pick-art">${spreadSvg(t, !!id)}</span>
        <span class="tpl-pick-name">${esc(t.name)}</span>
      </button>
      ${id && !t.builtIn ? `<button type="button" class="tpl-pick-more" data-tmore="${esc(id)}" aria-label="More for ${esc(t.name)}">${MORE}</button>` : ''}
    </div>`;
  const ask = RATIOS[W.ratio]?.story ? 'Start from a story layout, or blank.' : 'Start from a layout you\'ve saved, or blank.';
  return `${head('Template', ask)}
    <div class="tpl-picks" role="radiogroup" aria-label="Template">${card(blank, '')}${list.map((t) => card(t, t.id)).join('')}</div>
    <p class="guide-small">Save any layout as a template from its More menu.</p>`;
}
