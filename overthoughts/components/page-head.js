// The heading at the top of a section's page, and a plain note under it.
import { ICONS } from './icons.js';
import { esc } from './util.js';

// Inside Documenting Fictions the first page has the menu (Options) on its left.
export const head = (title, plus, menu) => `<h1 class="head${plus || menu ? ' head-add' : ''}">${menu && window.DF_SUITE ? `<button type="button" class="head-plus head-menu" data-app-menu aria-label="Menu">${ICONS.menu}</button>` : ''}${esc(title)}${plus ? `<a class="head-plus" href="#/new" aria-label="Write an entry">${ICONS.plus}</a>` : ''}</h1>`;
export const note = (t) => `<p class="note">${esc(t)}</p>`;
