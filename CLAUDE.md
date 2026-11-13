## Testing rules (from app-safety-kit)

These rules apply to every change in this repo.

1. Every function gets several unit tests: the normal case, the edge cases (empty, zero, one item, very large, dates across midnight/months), and bad input. Three tests per function is the floor, not the goal.
2. Keep logic (calculations, data shaping, storage, parsing) in exported functions inside the folders listed under "logic" in safety.config.json. Keep DOM wiring thin. Logic is unit tested; the DOM is covered by the browser tests.
3. Never lower a number in safety.config.json, never add `.skip` / `.only`, never delete or weaken a test to make things pass, and never add files to "ignore" to dodge coverage. If a threshold seems wrong, stop and ask Starky.
4. Before saying a change is done, run `npm run test:quick` and fix anything it reports. For changes to logic, also run `npm run test:mutation` and add tests for any surviving mutants.
5. Any new button, link or control must survive tests/e2e/click-everything. Only add `data-test-skip` to a control that would destroy real data or call a paid/external service, and leave an HTML comment saying why.
6. Save tokens: run tests through the npm scripts (they print short summaries). Read only the failing test's output, e.g. `npm run test:quick 2>&1 | tail -60`. Do not open the HTML reports or paste full logs.
7. When fixing a bug, first write a test that fails because of the bug, then fix it.

## How the code is organized (Starky's rules, 2026-11-12)

Keep every app (the shelf, Ref, The Eye, Contact Sheet, Overthoughts) organized so a beginner can read it.

1. Screens go in `pages/`.
2. Shared pieces (anything more than one screen uses: bars, buttons, icons, sheets, small helpers) go in `components/`.
3. Saving and loading (the database, backups, import and export, the shape of what's saved) goes in `data/`.
   How it looks (the CSS) goes in `styles/`, one file per screen or piece, loaded by `index.html` in the order they apply. (All in one folder so links to `art/` and `fonts/` work the same from every file.) Each app starts in `app.js` beside `index.html`.
4. One job per file. The file's name says its job, and a line at the top says it in plain words.
5. No file over 300 lines. When a file gets near 300, split it by job. Third-party files (`lib/`, `ml/`, `vendor/`, `*.min.js`) aren't ours and don't count.
6. Before writing anything new, check if it already exists (in this app, in `shared/`, or in another notebook) and use that instead of writing a second copy.
7. Moving code around never changes how an app works: same screens, buttons, words, look and saved data. Check with `npm run test:quick` and in the browser before saying it's done.
