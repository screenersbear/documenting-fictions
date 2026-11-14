// A move's marks, drawn from its kind (data/kinds.js): the notched tag in
// its colour pair, the big corner flair on a Today card, and the tiny 16px
// square on People, a person's page and Messages.
import { KINDS, markSvg } from '../data/kinds.js';
import { esc } from './util.js';

export function tagHtml(kind) {
  const k = KINDS[kind];
  return `<span class="tag" style="background:${k.bg};color:${k.fg}">${esc(k.name)}</span>`;
}
export const flairHtml = (kind) => `<span class="flair" style="background:${KINDS[kind].bg}" aria-hidden="true">${markSvg(kind, 132)}</span>`;
export const miniHtml = (kind) => (kind ? `<span class="mini" style="background:${KINDS[kind].bg}" aria-hidden="true">${markSvg(kind, 10)}</span>` : '');
