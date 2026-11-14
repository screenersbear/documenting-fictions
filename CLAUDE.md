## Testing rules (from app-safety-kit; where they run changed by Starky, 2026-11-14)

These rules apply to every change in this repo. Where they differ from the kit's TESTING-RULES.md, these win. The checks
themselves and every number in safety.config.json stay as they are: only where and when they run changed, to save time and
tokens.

1. Every function gets several unit tests: the normal case, the edge cases (empty, zero, one item, very large, dates across midnight/months), and bad input. Three tests per function is the floor, not the goal.
2. Keep logic (calculations, data shaping, storage, parsing) in exported functions inside the folders listed under "logic" in safety.config.json. Keep DOM wiring thin. Logic is unit tested; the DOM is covered by the browser tests.
3. Never lower a number in safety.config.json, never add `.skip` / `.only`, never delete or weaken a test to make things pass, and never add files to "ignore" to dodge coverage. If a threshold seems wrong, stop and ask Starky.
4. While working, run only the unit tests for the files you changed, e.g.
   `npx vitest run --config vitest.config.mjs tests/unit/the-eye/status-steps.test.mjs`. Then run `npm run test:quick`
   once, before committing, and fix anything it reports. (The push check runs it again when you push.)
5. Don't run the mutation tests, Lighthouse or the speed checks on this computer (`test:mutation`, `test:lighthouse`,
   `test:perf`, `test:all`). GitHub runs them, with the unit and browser tests and an npm security audit, on every push to
   main and every night (`.github/workflows/safety-checks.yml`).
6. If a GitHub run fails, fix that first. `node tools/ci-status.mjs` shows the latest runs and, for a failed job, the step
   and the notes it left: failing tests, mutants not caught (file, line, change) and Lighthouse scores. Check it when you
   start work here. A bug still gets its failing test first; mutants not caught in code you changed get tests that catch them.
7. Don't split work across parallel agents or worktrees (subagents, workflows, side sessions) unless Starky asks. Remove the
   worktrees in `.claude/worktrees` once they're merged.
8. Any new button, link or control must survive tests/e2e/click-everything. Only add `data-test-skip` to a control that would destroy real data or call a paid/external service, and leave an HTML comment saying why.
9. Save tokens: run tests through the npm scripts (they print short summaries). Read only the failing test's output, e.g. `npm run test:quick 2>&1 | tail -60`. Do not open the HTML reports or paste full logs.
10. When fixing a bug, first write a test that fails because of the bug, then fix it.

## How the code is organized (Starky's rules, 2026-11-12)

Keep every app (the shelf, Ref, The Eye, Contact Sheet, Overthoughts) organized so a beginner can read it.

1. Screens go in `pages/`.
2. Shared pieces (anything more than one screen uses: bars, buttons, icons, sheets, small helpers) go in `components/`.
3. Saving and loading (the database, backups, import and export, the shape of what's saved) goes in `data/`.
   How it looks (the CSS) goes in `styles/`, one file per screen or piece, in the order they apply. (All in one folder so links to `art/` and `fonts/` work the same from every file.) Each app starts in `app.js` beside `index.html`. A screen's markup can be a piece of its own in `pages/` (The Eye's are): an `.html` file whose first line is a comment saying what it is.
4. One job per file. The file's name says its job, and a line at the top says it in plain words.
5. No file over 300 lines. When a file gets near 300, split it by job. Third-party files (`lib/`, `ml/`, `vendor/`, `*.min.js`) aren't ours and don't count, and neither are the joined files in `built/` (see 8).
6. Before writing anything new, check if it already exists (in this app, in `shared/`, or in another notebook) and use that instead of writing a second copy.
7. Moving code around never changes how an app works: same screens, buttons, words, look and saved data. Check with `npm run test:quick` and in the browser before saying it's done.
8. The page loads joined files, so the small files cost no speed (Starky, 2026-11-13). Each app's `files.txt` lists its stylesheets, classic scripts and markup pieces, in order, under the file in `built/` they're joined into. After changing, adding or removing any of an app's files, run `node tools/join.mjs` (it rewrites only what changed) and commit `built/` with it (`tools/sync.py` joins before every export too). Never edit `built/`. The push check fails while a `built/` is out of date. In Ref, Contact Sheet and Overthoughts the line `built/app.js from app.js` joins `app.js` and every ES module it imports, by following the imports (`tools/join-modules.mjs`), so those aren't listed. A file loaded by its address instead of imported (Ref's `data/tagger-worker.js`, Contact Sheet's `components/upright.js`) stays a file of its own, in `sw.js`'s list.

## How it looks (Starky, 2026-11-13)

The look of every app is in `DESIGN.md`, the STKY design rulebook. Read it before any change you can see. Follow its **Live**
rules; build its **Decided** ones only when Starky asks to bring an app up to the rulebook; don't build **Proposed** ones.
