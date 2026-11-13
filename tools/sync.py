#!/usr/bin/env python3
"""Documenting Fictions: the suite is the master copy of every notebook.

    python3 tools/sync.py shared
        Copies the shared data files (shared/data/*.js) into each notebook's
        data/shared/ folder, so a notebook copied out on its own still has
        them; a file taken out of shared/data/ is taken out there too. Run it
        after any change in shared/data/.

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
    --force     export even if DEST has changes that aren't committed, or
                files changed there since the last export (they're written
                over)

The copies are only ever made here. Each export leaves in DEST:
    .suite-export.json   what every file was when it was exported, so the
                         next export can tell a file changed in DEST (it
                         refuses to write over it) from one the suite changed
    CLAUDE.md            (only if missing) says the folder is a copy and
                         where to make changes
    .git/hooks/pre-commit  refuses a commit in DEST of app files that aren't
                         what the last export wrote

Nothing is committed or pushed: that's done in DEST, by hand.
"""
import filecmp
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BESIDE = os.path.dirname(ROOT)
NOTEBOOKS = ['ref', 'the-eye', 'contact-sheet', 'overthoughts']
NAMES = {'ref': 'Ref', 'the-eye': 'The Eye', 'contact-sheet': 'Contact Sheet', 'overthoughts': 'Overthoughts'}
TARGETS = {
    'ref': os.path.join(BESIDE, 'Ref Notebook'),
    'the-eye': os.path.join(BESIDE, 'The Eye'),
    'contact-sheet': os.path.join(BESIDE, 'Contact Sheet'),
    'overthoughts': os.path.join(BESIDE, 'Overthoughts'),
}
RECORD = '.suite-export.json'
# Never touched in DEST, and never reported as left over.
KEEP = {'.git', '.gitignore', 'README.md', 'CNAME', 'deploy.command', 'tools', 'contact-sheet-spec.md', '.claude', '.DS_Store', 'CLAUDE.md', RECORD}
SKIP = {'.DS_Store'}
HOOK_MARK = 'Put here by Documenting Fictions tools/sync.py'

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

COPY_NOTE = '''# This folder is a copy

{name} is made in the Documenting Fictions suite, in `{suite}/{nb}/`. This folder is copied out from there by `python3 tools/sync.py export {nb}`, run in `{suite}`.

- Don't change the app's files here. Make the change in `{suite}/{nb}/` (bump CACHE_NAME there), commit and push the suite, then export, and commit and push here.
- Only CLAUDE.md, README.md and .gitignore{own} are this folder's own.
- A commit here of app files that the last export didn't write is refused, and an export won't write over files changed here: it lists them, so they can be moved into the suite first.
'''

# Runs in DEST on every commit. Reads .suite-export.json, so it needs no
# changes when the notebook does.
HOOK = '''#!/usr/bin/env python3
# ''' + HOOK_MARK + '''.
# This folder is a copy of a notebook made in the Documenting Fictions suite.
# A commit of app files that the last export didn't write is refused: the
# next export would write over them.
import hashlib, json, os, subprocess, sys

def git(*a):
    return subprocess.run(['git'] + list(a), capture_output=True).stdout

top = git('rev-parse', '--show-toplevel').decode().strip()
try:
    with open(os.path.join(top, '.suite-export.json'), encoding='utf-8') as fh:
        made = json.load(fh)
except (OSError, ValueError):
    sys.exit(0)
files = made.get('files', {})
keep = set(made.get('keep', []))
bad = []
for name in git('diff', '--cached', '--name-only', '-z', '--diff-filter=ACMR').decode().split('\\0'):
    if not name or name.split('/')[0] in keep or os.path.basename(name) == '.DS_Store':
        continue
    if files.get(name) != hashlib.sha256(git('cat-file', 'blob', ':' + name)).hexdigest():
        bad.append(name)
if bad:
    nb, suite = made.get('notebook', '?'), made.get('suite_folder', '../Documenting Fictions')
    print('This folder is a copy of ' + made.get('name', nb) + ' from the Documenting Fictions suite.')
    print("These files aren't what the last export wrote, so they'd be written over by the next one:")
    for name in bad[:20]:
        print('    ' + name)
    print('Make the change in ' + suite + '/' + nb + '/ instead, then run')
    print('    python3 tools/sync.py export ' + nb)
    print('in ' + suite + ', and commit here. Nothing was committed.')
    sys.exit(1)
'''


def say(*a):
    print(*a)


def sha_bytes(b):
    return hashlib.sha256(b).hexdigest()


def sha_file(path):
    h = hashlib.sha256()
    with open(path, 'rb') as fh:
        for block in iter(lambda: fh.read(1 << 20), b''):
            h.update(block)
    return h.hexdigest()


def shared(dry):
    src_dir = os.path.join(ROOT, 'shared', 'data')
    names = sorted(f for f in os.listdir(src_dir) if f.endswith('.js'))
    for nb in NOTEBOOKS:
        # Until 2026-11-12 the shared data was one file, df-data.js, beside index.html.
        old = os.path.join(ROOT, nb, 'df-data.js')
        if os.path.exists(old):
            say(f'  removed {nb}/df-data.js (it is in data/shared/ now)')
            if not dry:
                os.remove(old)
        dst_dir = os.path.join(ROOT, nb, 'data', 'shared')
        for f in names:
            src, dst = os.path.join(src_dir, f), os.path.join(dst_dir, f)
            if os.path.exists(dst) and filecmp.cmp(src, dst, shallow=False):
                continue
            say(f'  shared -> {nb}/data/shared/{f}')
            if not dry:
                os.makedirs(dst_dir, exist_ok=True)
                shutil.copyfile(src, dst)
        for f in sorted(os.listdir(dst_dir)) if os.path.isdir(dst_dir) else []:
            if f.endswith('.js') and f not in names:
                say(f'  removed {nb}/data/shared/{f} (no longer in shared/data/)')
                if not dry:
                    os.remove(os.path.join(dst_dir, f))


def standalone_index(nb, text):
    if not SUITE_LINES.search(text):
        raise SystemExit(f'{nb}/index.html: the ../suite.js line is not where it was expected; nothing exported.')
    return SUITE_LINES.sub(EYE_STORAGE if nb == 'the-eye' else '', text, count=1)


def dirty(dest):
    if not os.path.isdir(os.path.join(dest, '.git')):
        return []
    out = subprocess.run(['git', '-C', dest, 'status', '--porcelain'], capture_output=True, text=True).stdout
    return [l for l in out.splitlines() if l.strip() and not l.endswith('.DS_Store')]


def suite_commit():
    out = subprocess.run(['git', '-C', ROOT, 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip()
    changed = subprocess.run(['git', '-C', ROOT, 'status', '--porcelain', '--untracked-files=no'], capture_output=True, text=True).stdout.strip()
    return (out or '?') + (' + changes not committed' if changed else '')


def read_record(dest):
    try:
        with open(os.path.join(dest, RECORD), encoding='utf-8') as fh:
            return json.load(fh).get('files', {})
    except (OSError, ValueError):
        return None


def plan(nb, src_dir):
    """Every file the copy should have: (published path, source path, bytes or None, hash)."""
    out = []
    for here, dirs, files in os.walk(src_dir):
        dirs[:] = sorted(d for d in dirs if d not in SKIP)
        rel_dir = os.path.relpath(here, src_dir)
        for f in sorted(files):
            if f in SKIP:
                continue
            rel = os.path.normpath(os.path.join(rel_dir, f)).replace(os.sep, '/')
            src = os.path.join(here, f)
            if rel == 'index.html':
                with open(src, encoding='utf-8') as fh:
                    body = standalone_index(nb, fh.read()).encode('utf-8')
                out.append((rel, src, body, sha_bytes(body)))
            else:
                out.append((rel, src, None, sha_file(src)))
    return out


def install_hook(dest, dry):
    git_dir = os.path.join(dest, '.git')
    if not os.path.isdir(git_dir):
        return
    path = os.path.join(git_dir, 'hooks', 'pre-commit')
    if os.path.exists(path):
        with open(path, encoding='utf-8', errors='replace') as fh:
            now = fh.read()
        if HOOK_MARK not in now:
            say('  a pre-commit hook of its own is already there, so the copy check was not added')
            return
        if now == HOOK:
            return
    say('  commit check -> .git/hooks/pre-commit')
    if not dry:
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w', encoding='utf-8') as fh:
            fh.write(HOOK)
        os.chmod(path, 0o755)


def export(nb, dest, dry, force):
    src_dir = os.path.join(ROOT, nb)
    if not os.path.isdir(src_dir):
        raise SystemExit(f'No notebook folder {nb}/')
    left = dirty(dest)
    if left and not force:
        say(f'{nb}: {dest} has changes that aren\'t committed, so nothing was exported (use --force to export anyway):')
        for l in left[:12]:
            say('   ', l)
        return False
    say(f'{nb} -> {dest}')
    files = plan(nb, src_dir)
    record = read_record(dest)
    known = record or {}

    # A file that's different from the suite's is only written over if it's
    # still what the last export wrote, i.e. the suite changed, not the copy.
    to_write, clashes = [], []
    for rel, src, body, h in files:
        dst = os.path.join(dest, rel)
        if not os.path.exists(dst):
            to_write.append((rel, src, body, 'add  '))
            continue
        now = sha_file(dst)
        if now == h:
            continue
        if known.get(rel) != now:
            clashes.append(rel)
        to_write.append((rel, src, body, 'write'))
    if clashes and not force:
        why = 'changed in the copy since the last export' if record is not None else 'different from the suite, and there is no record of an export yet'
        say(f'  nothing was exported: these files were {why}, and the export would write over them:')
        for rel in clashes[:30]:
            say('    ', rel)
        say(f'  Move those changes into {nb}/ here first (or use --force to write over them).')
        return False
    for rel, src, body, how in to_write:
        say(f'  {how} {rel}' + ('   (changed in the copy: written over)' if rel in clashes else ''))
        if dry:
            continue
        dst = os.path.join(dest, rel)
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        if body is None:
            shutil.copy2(src, dst)
        else:
            with open(dst, 'wb') as fh:
                fh.write(body)

    seen = {rel for rel, _, _, _ in files}
    made_there, dropped = [], []
    if os.path.isdir(dest):
        for here, dirs, names in os.walk(dest):
            rel_dir = os.path.relpath(here, dest)
            dirs[:] = [d for d in dirs if not (rel_dir == '.' and d in KEEP)]
            for f in names:
                if (rel_dir == '.' and f in KEEP) or f in SKIP:
                    continue
                rel = os.path.normpath(os.path.join(rel_dir, f)).replace(os.sep, '/')
                if rel not in seen:
                    (dropped if rel in known else made_there).append(rel)
    say(f'  {len(to_write)} file{"" if len(to_write) == 1 else "s"} {"would change" if dry else "changed"}')
    if dropped:
        say('  no longer in the suite (left alone in the copy):')
        for rel in sorted(dropped)[:30]:
            say('    ', rel)
    if made_there:
        say('  only in the copy, never exported (left alone; move them into the suite if they belong to the app):')
        for rel in sorted(made_there)[:30]:
            say('    ', rel)

    suite_rel = os.path.relpath(ROOT, dest).replace(os.sep, '/')
    note = os.path.join(dest, 'CLAUDE.md')
    if not os.path.exists(note):
        say('  add   CLAUDE.md (says this folder is a copy)')
        if not dry:
            with open(note, 'w', encoding='utf-8') as fh:
                own = ', and contact-sheet-spec.md (the living spec, not in git)' if nb == 'contact-sheet' else ''
                fh.write(COPY_NOTE.format(name=NAMES[nb], nb=nb, suite=suite_rel, own=own))
    new_record = {
        'notebook': nb,
        'name': NAMES[nb],
        'suite_folder': suite_rel,
        'suite': suite_commit(),
        'keep': sorted(KEEP),
        'files': {rel: h for rel, _, _, h in files},
    }
    text = json.dumps(new_record, indent=1, sort_keys=True) + '\n'
    rec_path = os.path.join(dest, RECORD)
    old = open(rec_path, encoding='utf-8').read() if os.path.exists(rec_path) else None
    if text != old:
        say(f'  {"write" if old is not None else "add  "} {RECORD}')
        if not dry:
            with open(rec_path, 'w', encoding='utf-8') as fh:
                fh.write(text)
    install_hook(dest, dry)
    return True


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
        ok = True
        for nb in names:
            if nb not in TARGETS:
                raise SystemExit(f'Unknown notebook {nb}: one of {", ".join(NOTEBOOKS)}')
            dest = os.path.abspath(args[2]) if len(args) > 2 and len(names) == 1 else TARGETS[nb]
            ok = export(nb, dest, dry, force) and ok
        return 0 if ok else 2
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
