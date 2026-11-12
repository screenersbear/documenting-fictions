#!/usr/bin/env python3
"""Documenting Fictions: the suite is the master copy of every notebook.

    python3 tools/sync.py shared
        Copies shared/df-data.js into each notebook's folder (as df-data.js),
        so a notebook copied out on its own still has it. Run it after any
        change to shared/df-data.js.

    python3 tools/sync.py export NOTEBOOK [DEST]
    python3 tools/sync.py export all
        Copies a notebook's folder out to its own repository as an app of
        its own: files that changed are written, new ones added, nothing in
        DEST is deleted (files only DEST has are listed). The line loading
        ../suite.js is taken out of index.html. DEST defaults to the folder
        in TARGETS, beside this repository.

        The Eye on its own also gets its own storage: everything it keeps is
        under names starting df-theeye, so on the same website it never
        shares data with The Eye inside the suite.

    --dry-run   say what would change, change nothing
    --force     export even if DEST has changes that aren't committed

Nothing is committed or pushed: that's done in DEST, by hand.
"""
import filecmp
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BESIDE = os.path.dirname(ROOT)
NOTEBOOKS = ['ref', 'the-eye', 'contact-sheet', 'overthoughts']
TARGETS = {
    'ref': os.path.join(BESIDE, 'Ref Notebook'),
    'the-eye': os.path.join(BESIDE, 'The Eye'),
    'contact-sheet': os.path.join(BESIDE, 'Contact Sheet'),
    'overthoughts': os.path.join(BESIDE, 'Overthoughts'),
}
# Never touched in DEST, and never reported as left over.
KEEP = {'.git', '.gitignore', 'README.md', 'CNAME', 'deploy.command', 'tools', 'contact-sheet-spec.md', '.claude', '.DS_Store'}
SKIP = {'.DS_Store'}

SUITE_LINES = re.compile(
    r'[ \t]*<!-- Inside Documenting Fictions[^\n]*-->\n'
    r'[ \t]*<script src="\.\./suite\.js"></script>\n'
)

# The Eye on its own: its localStorage keys and IndexedDB databases get a
# df-theeye prefix. Loaded first, before anything reads them.
EYE_STORAGE = '''<!-- The Eye on its own: everything it keeps is under its own names (df-theeye), so it never shares data with The Eye inside Documenting Fictions on the same website. -->
<script>
(function () {
  var P = 'df-theeye:';
  var ls; try { ls = window.localStorage; } catch (e) { return; }
  var S = Storage.prototype, get = S.getItem, set = S.setItem, del = S.removeItem;
  S.getItem = function (k) { return get.call(this, this === ls ? P + k : k); };
  S.setItem = function (k, v) { return set.call(this, this === ls ? P + k : k, v); };
  S.removeItem = function (k) { return del.call(this, this === ls ? P + k : k); };
  if (window.IDBFactory) {
    var F = IDBFactory.prototype, open = F.open, drop = F.deleteDatabase;
    F.open = function (name, version) { return version === undefined ? open.call(this, 'df-theeye-' + name) : open.call(this, 'df-theeye-' + name, version); };
    F.deleteDatabase = function (name) { return drop.call(this, 'df-theeye-' + name); };
  }
})();
</script>
'''


def say(*a):
    print(*a)


def shared(dry):
    src = os.path.join(ROOT, 'shared', 'df-data.js')
    for nb in NOTEBOOKS:
        dst = os.path.join(ROOT, nb, 'df-data.js')
        if os.path.exists(dst) and filecmp.cmp(src, dst, shallow=False):
            continue
        say(f'  shared -> {nb}/df-data.js')
        if not dry:
            shutil.copyfile(src, dst)


def standalone_index(nb, text):
    if not SUITE_LINES.search(text):
        raise SystemExit(f'{nb}/index.html: the ../suite.js line is not where it was expected; nothing exported.')
    return SUITE_LINES.sub(EYE_STORAGE if nb == 'the-eye' else '', text, count=1)


def dirty(dest):
    if not os.path.isdir(os.path.join(dest, '.git')):
        return []
    out = subprocess.run(['git', '-C', dest, 'status', '--porcelain'], capture_output=True, text=True).stdout
    return [l for l in out.splitlines() if l.strip() and not l.endswith('.DS_Store')]


def export(nb, dest, dry, force):
    src_dir = os.path.join(ROOT, nb)
    if not os.path.isdir(src_dir):
        raise SystemExit(f'No notebook folder {nb}/')
    left = dirty(dest)
    if left and not force:
        say(f'{nb}: {dest} has changes that aren\'t committed, so nothing was exported (use --force to export anyway):')
        for l in left[:12]:
            say('   ', l)
        return
    say(f'{nb} -> {dest}')
    written = 0
    seen = set()
    for here, dirs, files in os.walk(src_dir):
        dirs[:] = [d for d in dirs if d not in SKIP]
        rel_dir = os.path.relpath(here, src_dir)
        for f in files:
            if f in SKIP:
                continue
            rel = os.path.normpath(os.path.join(rel_dir, f))
            seen.add(rel)
            src = os.path.join(here, f)
            dst = os.path.join(dest, rel)
            if rel == 'index.html':
                with open(src, encoding='utf-8') as fh:
                    body = standalone_index(nb, fh.read()).encode('utf-8')
                if os.path.exists(dst) and open(dst, 'rb').read() == body:
                    continue
                say(f'  write {rel}')
                if not dry:
                    os.makedirs(os.path.dirname(dst), exist_ok=True)
                    with open(dst, 'wb') as fh:
                        fh.write(body)
                written += 1
                continue
            if os.path.exists(dst) and filecmp.cmp(src, dst, shallow=False):
                continue
            say(f'  {"write" if os.path.exists(dst) else "add  "} {rel}')
            if not dry:
                os.makedirs(os.path.dirname(dst), exist_ok=True)
                shutil.copy2(src, dst)
            written += 1
    extra = []
    if os.path.isdir(dest):
        for here, dirs, files in os.walk(dest):
            rel_dir = os.path.relpath(here, dest)
            dirs[:] = [d for d in dirs if not (rel_dir == '.' and d in KEEP)]
            for f in files:
                rel = os.path.normpath(os.path.join(rel_dir, f))
                if rel_dir == '.' and f in KEEP:
                    continue
                if f in SKIP:
                    continue
                if rel not in seen:
                    extra.append(rel)
    say(f'  {written} file{"" if written == 1 else "s"} {"would change" if dry else "changed"}')
    if extra:
        say('  only in the standalone copy (left alone):')
        for rel in sorted(extra)[:30]:
            say('    ', rel)


def main(argv):
    dry = '--dry-run' in argv
    force = '--force' in argv
    args = [a for a in argv if not a.startswith('--')]
    if not args or args[0] not in ('shared', 'export'):
        print(__doc__)
        return 1
    shared(dry)
    if args[0] == 'export':
        if len(args) < 2:
            print(__doc__)
            return 1
        names = NOTEBOOKS if args[1] == 'all' else [args[1]]
        for nb in names:
            if nb not in TARGETS:
                raise SystemExit(f'Unknown notebook {nb}: one of {", ".join(NOTEBOOKS)}')
            dest = os.path.abspath(args[2]) if len(args) > 2 and len(names) == 1 else TARGETS[nb]
            export(nb, dest, dry, force)
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
