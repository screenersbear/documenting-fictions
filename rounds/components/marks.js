// A move's marks, drawn from its kind (data/kinds.js; Other has a look too): the notched tag in
// its colour pair, the big corner flair on a Today card, and the tiny 16px
// square on People, a person's page and Messages.
import { lookOf, markSvg } from '../data/kinds.js';
import { esc } from './util.js';

// (name: when it isn't the kind's own, as for A year since.)
export function tagHtml(kind, name = lookOf(kind).name) {
  const k = lookOf(kind);
  return `<span class="tag" style="background:${k.bg};color:${k.fg}">${esc(name)}</span>`;
}
export const flairHtml = (kind) => `<span class="flair" style="background:${lookOf(kind).bg}" aria-hidden="true">${markSvg(kind, 132)}</span>`;
export const miniHtml = (kind) => (kind ? `<span class="mini" style="background:${lookOf(kind).bg}" aria-hidden="true">${markSvg(kind, 10)}</span>` : '');
