// Makes a built file smaller for the page to load: the notes (comments) and
// the spaces that are only there for reading are taken out. Nothing else
// changes: every name, word and rule stays as it is, so the page works and
// looks the same, it just arrives sooner. A files.txt line like
// "built/app.css smaller" asks for it; tools/join-files.mjs calls these.
// (The Eye's first load was too slow for the speed check, 2026-11-15.)
import { minifySync } from 'rolldown/utils';

// The parts of a stylesheet that are read as they are, found in the order
// they come: an escape, quoted text, or a comment. So a /* inside quotes isn't
// a comment, and a quote inside a comment isn't quoted text.
const CSS_COMMENTS = /\\[\s\S]|"(?:\\[\s\S]|[^"\\\n])*"|'(?:\\[\s\S]|[^'\\\n])*'|\/\*[\s\S]*?\*\//g;
// The same, with the spaces around a line break in place of comments.
const CSS_BREAKS = /\\[\s\S]|"(?:\\[\s\S]|[^"\\\n])*"|'(?:\\[\s\S]|[^'\\\n])*'|[^\S\n]*\n\s*/g;

const isSpace = (c) => c === undefined || /\s/.test(c);

// A stylesheet without its comments, blank lines and the spaces at the start
// and end of its lines. A comment wedged between two things with no space
// beside it stays: a/**/b reads to the browser as two things, ab as one.
export function smallerStyles(text) {
  const bare = text.replace(CSS_COMMENTS, (part, at, all) => {
    if (!part.startsWith('/*')) return part;
    return isSpace(all[at - 1]) || isSpace(all[at + part.length]) ? '' : part;
  });
  return bare.replace(CSS_BREAKS, (part) => (part.trim() ? part : '\n')).replace(/^\n/, '');
}

// A script (or, with module, an ES module) without its comments and the
// spaces it doesn't need. Names are kept and nothing is rewritten: the
// minifier only prints the same code again, tightly.
export function smallerScript(path, text, module = false) {
  const { code, errors } = minifySync(path, text, { module, compress: false, mangle: false, codegen: { removeWhitespace: true } });
  if (errors.length) throw new Error(`${path}: can't be made smaller: ${errors[0].message}`);
  return code;
}
