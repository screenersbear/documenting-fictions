# STKY Design Rulebook

STKY is Starky's private name for his app suite: Documenting Fictions, which is the shelf, Ref, The Eye, Layouts (was
Contact Sheet) and Rounds (in Overthoughts' place on the shelf since 14 Nov; Overthoughts was taken out of the suite on 15 Nov). This file is how every one of them should look. Read it before any change you can see.
**Never show "STKY" in the apps.**

**Status, 2026-11-14, round 2 and its 14 Nov additions.** The round-2 mockups (`../STKY mockup handoff/round-2/`, README first, then each folder's
NOTES.md, latest round wins) settled most of what was open. Where this file and a mockup disagree, the mockup wins. Each rule
is marked:

- **Live**: already in the apps. Follow it.
- **Decided**: Starky chose it, but the apps don't have it yet. Build it when asked to bring an app up to this rulebook, not
  as a side effect of other work.
- **Proposed**: still waiting, usually on a mockup. Don't build it.

**Rounds replaces Overthoughts** (Starky, 14 Nov; taken out of the suite 15 Nov). Overthoughts' folder and code are gone,
and it won't come back as a notebook of its own. What a phone still kept from it (its database, its few saved settings, its
offline copy) is taken off as the shelf opens (Starky, 15 Nov). New backups leave it out; an old backup that still has it
restores fine and skips that part. Rounds has a copy of its own since 21 Nov (folder `Rounds`, below), like the other three. Callback is being redesigned and isn't in round 2:
leave its look as it is.

---

## 1. The look in one paragraph

Mid-century Swiss modernism, rebuilt as a kit of parts. Flat shapes of colour (circles, halves, quarters, rings, triangles,
stripes, notched tags) sit on paper, held in place by thin lines and small, quiet type. Every app, section and state
gets its own mark, built from the same parts by the same rules, and laid out like a specimen sheet: the object, then a
short caption under it. The shapes and colours are playful and loud. The type is light and calm. The system behind it all
is strict.

## 2. The reference board

The originals are in `~/Documents/ref, do something/art/graphic design/app design/`.

| # | Reference | What we take from it |
|---|---|---|
| 1 | 1960 New Year card, Walter Marti-Süess, Luzern | Numbers built from dots and thin strokes. Big empty paper. Tiny left-aligned grotesk text in a corner. |
| 2 | Grid of split circles labelled −12.00 to +06.00 | One grammar, endless variations: every circle is halves, quarters, rings and dots. A wide palette of brights and pale tints. Small spaced numeric labels under each. |
| 3 | Blue/teal icon pairs (solid glyph over a layered version) | Two tiers of icon: a small UI glyph, and a big expressive version of the same idea with overlapping translucent layers. |
| 4 | Surforma product patterns | Progressions (stripes thinning, dots shrinking, checks getting smaller) as identities. A specimen grid: pattern, brand line, light name. |
| 5 | Unfolded paper cube | Flat orange, green and cream faces. Paper grain. A physical, printed object. |
| 6 | Three outlined glyphs (play, list, four-lobe) | One even stroke with round ends, one colour per glyph. |
| 7 | Notched tags in frames (crimson/cream, black/chartreuse, cobalt/pink) | Rounded frames with arrow-notched shapes inside. Bold two-colour pairings. Wayfinding. |

## 3. Principles

1. **Built, not drawn.** Every mark is made of a few primitives (section 6) placed on a grid. No freehand drawing, no
   illustration styles, no stock art.
2. **One grammar, many variations.** Same parts, different arrangement and colour. A new screen gets a new variation, never a
   new style.
3. **Flat colour on paper.** Solid fills. The one exception is glass, for big marks only (section 8).
4. **Quiet type, loud shapes.** Type is light, small and left-aligned, like a caption on a specimen sheet. The shapes and
   colours do the shouting.
5. **Space is a material.** Plenty of empty paper. Objects float on a plain ground with even gutters.
6. **Rhythm shows order.** Progressions (bars getting thinner, dots getting smaller) stand for sequence, time, progress and
   loading.
7. **A thin line is structure.** A hairline joins, points or measures. It's the only element that isn't a filled shape.
8. **Same everywhere.** Whatever can be the same across the apps is the same: parts, colours, words, behaviour (Live,
   Starky 11-12).

## 4. Colour

### 4.1 Neutrals (Decided, round 2)

| Token | Hex | Use |
|---|---|---|
| `paper` | `#FAFAF7` | the ground of every page and the shelf: near white with a trace of warmth, never pure white (was `#F2EFE6`, then `#F7F5EF`: too beige) |
| `card` | `#FFFFFF` | cards and sheets, so they lift off the paper |
| `text` (berry blade black) | `#313D45` | all text, hairlines, the dark shape in a mark (Live: no true black anywhere) |
| `dim` | `#5C666D` | captions, labels |
| `line` | `#E1E1DC` | dividers between rows (was `#D6DADD`) |
| `track` | `#EFEFEA` | the track of a segmented control |
| `off` | `#9AA3A8` / `#D6DADD` | an inactive section mark (dark part / light part); a chapter still to come |
| `crimson` | `#A1062A` | something late, always written out too ("OVERDUE BY 3 DAYS"); Delete |

### 4.2 The notebook colours (Decided)

Each notebook has an app colour, picked in its Options. **Each colour leads, with a partner in support.** The notebook's colour
fills the band, and its partner carries what's on the band: the title, the ring buttons, the label hairline and the mark.

- The partner must be at least 3:1 on the band colour (big title, buttons, marks).
- Small text (the label line, the status bar, button text on the band colour) uses the partner only when it is at least 4.5:1;
  otherwise white or berry blade black, whichever passes.
- **Below the band, the notebook colour does the work:** selection, primary buttons, chips, checkboxes and a picked slot use
  the notebook colour with its small-text colour. The partner stays in the band.
- **Every Options sheet offers all seven pairs**, in every app.

The seven pairs (Starky, "They work"):

| Name | Band colour | Partner | Small text | Steps into paper (round 2) |
|---|---|---|---|---|
| `orange` | `#FF8A3D` tangerine | berry blade black, 4.8:1 | berry blade black | `#FEA66C`, `#FCC29A`, `#FBDEC8`, `#FAEFE4` |
| `mango` | `#FFD100` | berry blade black, 7.6:1 | berry blade black | `#FEDB3E`, `#FCE67C`, `#FBF0B9`, `#FAF6DE` |
| `berry` | `#CC2E8A` orchid pink | chartreuse `#E2E600`, 3.6:1 | white, 4.9:1 | `#D861A5`, `#E394C0`, `#EEC7DC`, `#F5E6EC` |
| `fern` | `#13803F` print green | mango `#FFD100`, 3.4:1 | white, 5.0:1 | `#4D9E6D`, `#86BD9B`, `#C0DCC9`, `#E3EEE5` |
| `ocean` | `#0A4FD6` cobalt | salmon `#FFAFAB`, 3.9:1 | white, 6.8:1 | `#467ADE`, `#82A4E6`, `#BECFEF`, `#E2E9F4` |
| `leaf` | `#14BFA0` teal | crimson `#A1062A`, 3.5:1 | berry blade black, 4.8:1 | `#4ECEB6`, `#87DCCC`, `#C0EBE1`, `#E3F4EE` |
| `ink` | `#313D45` | mango `#FFD100`, 7.6:1 | paper | `#636C72`, `#969C9E`, `#C8CBCA`, `#E6E7E5` |

The steps are the band colour blended into paper at 75%, 50%, 25% and 10%. The mango, berry and ocean rows are the mockups'
own values; the other four are worked out the same way.

**Defaults per app (Decided, round 2):** The Eye `mango`, Ref `ocean`, Layouts `berry` (was `orange`). **Rounds (14 Nov):**
inside, the Black pair (band `#313D45` with mango `#FFD100`); its cover on the shelf is `leaf` teal `#14BFA0` with the arc in
ink and mango stops. It is the one notebook whose inside differs from its cover, on purpose: don't make them match. The shelf has no colour of its own: paper, with each book in its notebook's colour.

### 4.3 Mark colours

Marks, patterns and illustrations may also use these, taken from the board. Chrome (bands, buttons) uses only the notebook
colours and their partners (4.2).

| Brights | Hex | | Tints | Hex |
|---|---|---|---|---|
| `sky` | `#0596FF` | | `lavender` | `#F1E5F5` |
| `crimson` | `#A1062A` | | `periwinkle` | `#CCD9FA` |
| `chartreuse` | `#E2E600` | | `peach` | `#FEE3D7` |
| `forest` | `#2C5E3C` | | `sage` | `#CDD1C1` |
| `amber` | `#F7A52B` | | `salmon` | `#FFAFAB` |

### 4.4 Colour rules

- A mark uses **at most three colours plus the paper**, and the hairline. The one exception is the shelf's mark: one part
  for each of the four notebooks.
- A tint is only ever the light partner of a bright, never on its own as a mark.
- Pairs that work, straight from the board: crimson + paper, berry blade black + chartreuse, cobalt + salmon, orange + green,
  sky + peach, forest + teal.
- White small text never goes on orange, mango, chartreuse, amber, teal, salmon or any tint.
- Colour is never the only signal: a state also changes shape, word or position.
- Photos are never tinted, filtered or covered by the interface. Layouts and The Eye are photo tools.

## 5. Type

**Figtree** only, weights 300, 400, 500, 600 and 700 (Decided, round 2). Archivo Black stays only where it's still live until
each app is brought up to this rulebook. Headers are always capitals. Headers are **quiet**: light names and small bold labels,
so the shapes do the shouting.

### 5.1 Levels (Decided, round 2)

| Level | Type | Use |
|---|---|---|
| Band title | 34px Figtree 300, capitals, `.04em`, line 40px, left-aligned | the title in the band |
| Section title | 13px 700, capitals, `.12em`, line 16px, in a 44px row; a count after it in 500 dim; optional text button at right | page sections, sheet titles |
| Block title | the section title with a 1px berry blade black rule under it | parts of a long page (a shoot's details) |
| Label | 12px 500, capitals, `.12em`, dim | field labels, months, groups, the meta line under a name |
| Band label line | 11px, `.14em`: the place in 700, a hairline, the date in 500 | under the band title |
| Name | Figtree 300, as written (never capitals): 18px in a row, 22px on a card, 30px as a guide chapter's title | names you wrote: a board, a shoot, a layout |
| Body | 400, 15–17px; a field's value 17px under an 11px label | everything else |
| Button | 12px 700, capitals, `.12em` | every labelled button |
| Section bar label | 10px, `.1em`: 700 for this section, 500 dim for the others | under each mark in the section bar |
| Flag | 10px 700 capitals in a 20px pill | flags on a row |
| Numbers | tabular figures | counts, dates, sizes, so they line up |

### 5.2 Rules (Live)

- Headers are always capitals; names you wrote are not.
- No boxes, borders or bars around headings.
- Words: a photo is a "shot", never a "frame". In Layouts a photo slot is a "box" (round 2).
- No em dashes in app text. Keep labels short and plain.

### 5.3 Handwriting (Decided)

Klee One is retired. The shelf's book tabs (Figtree 600, round 2) move to Figtree.

**Ref's board fonts (Live, 21 Nov, Starky):** a board's words are in the Ref Mac app's fonts, in its order: Courier New,
American Typewriter, Helvetica Neue, Avenir Next, Futura, Gill Sans, Georgia, Baskerville, Didot, Michroma (comes with Ref,
OFL), Menlo. One font for the board's titles and one for its text, picked in the text menu (FONT, each name written in its
font) and kept for every page. A new board starts in Courier New, as on the Mac. A board made before keeps Klee One until its
font is changed, so nothing already made looks different. Pictures of the pages (Export, Send to shoot) use the same fonts.

### 5.4 Wordmark

Dropped: "STKY" is never shown in the apps. The shelf's only title is DOCUMENTING FICTIONS (section 9.6).

## 6. The shape kit (Decided)

Everything is built on a **24 × 24 unit grid**. It scales to any size, from an 18px tab mark to a full cover.

| Part | Rule |
|---|---|
| Circle | 24 units across |
| Half | cut exactly on a centre line (top/bottom/left/right) |
| Quarter | cut on both centre lines |
| Ring | 3 or 6 units thick |
| Dot | 8 or 10 units across, centred |
| Point | two quarter-arcs meeting at the circle's edge (the arrow-crescent of ref 2) |
| Square | 24 units, corners square |
| Triangle | half a square, cut on the diagonal |
| Bar | full width, any height; in a progression each bar is 0.8× the one before |
| Tag | rounded rectangle, radius 2 units, one notched end: a 90° point taking 1/4 of the length (ref 7) |
| Frame | a tag's outline, 2 units thick, with a different-coloured tag inside (a shape-kit part; in Layouts' words a photo slot is a "box") |
| Hairline | 1px berry blade black at any size, only at 0°, 45° or 90° |

Building rules:

- Shapes inside a mark touch exactly, with no gaps and no overlaps (glass marks excepted).
- Marks in a row or grid share one size and one gutter (one third of the mark's width).
- At most one dark shape (berry blade black, forest or cobalt) per mark.
- Corners stay consistent within a mark: all square, or all at radius 2.
- **Charts are marks too (Decided, round 2):** a circle cut into slices, flat and touching with no gaps, with a legend under it
  (swatch, name, percent, count).

## 7. Marks (Decided)

| Where | What |
|---|---|
| App icons and the shelf | each notebook's home-screen icon, and the big mark in the middle of its cover on the shelf |
| Section bar | a 28px mark per section, in the notebook's colours (the shelf's books' side tabs use words) |
| The band | the app's mark rising from the band's bottom edge (9.1): decoration only, not a button |
| Empty screens | the section's mark, big, with one line under it |
| Loading and progress | a progression: bars or dots filling in order, like ref 4 |

The app marks:

| App | Idea |
|---|---|
| The shelf | four spines on a shelf, one leaning, each in its notebook's colour with its partner as a band (Proposed) |
| Ref | a square cut into a 2 × 2 board |
| The Eye | a ring with a dot: an eye |
| Layouts | three bars side by side: a strip of shots |
| Rounds | an arc with three stops: a round of moves (in the band: a mango arc with teal and white stops) |

The section marks are drawn in the round-2 mockups' section bars (for example The Eye's OVERVIEW is a ring with a mango dot,
Ref's MOOD BOARDS a circle in quarters, TAGS a half circle over a dot). Inactive marks are `#9AA3A8` and `#D6DADD`.

## 8. Icons

- **UI glyphs (Decided):** thin line icons, round caps and joins, **stroke 2 on a 24-unit grid in every app**, drawn 18–19px
  inside a ring button. One colour: the partner on the band, text elsewhere, the app colour when active.
- **Marks:** the expressive version of the same idea, built from the shape kit (section 6). Flat colour, except:
- **Glass (Decided):** for **big marks only** (app icons, the shelf, empty screens), shapes may overlap as translucent
  layers, like ref 3. Never on tabs, buttons, loading, or anything under 48px.
- A glyph and its mark stand for the same idea and keep the same silhouette where they can (ref 3).
- **The notebooks glyph:** two upright books, the second taller (round-2 mockups). It only ever means "back to your notebooks".

## 9. Layout (Decided, round 2)

**Phone first.** Every mockup is 390 × 844 with a 16px side gutter. Nothing scrolls sideways. Buttons are at least 44 × 44.

### 9.1 The main band (every main section)

- **Shape:** 151px of solid band colour (59px of status bar and safe area, then 92), then four steps of 14, 11.2, 9 and 7.2px
  fading into the paper (4.2). A faint grain over the solid part (section 11).
- **Title:** the section's name at the left, 16px in, 67px down (5.1). On a notebook's first section the title is the app's
  name and the label line says the section (The Eye's Overview: THE EYE over OVERVIEW).
- **Buttons:** alone at the top right (67px down, 8px from the edge), 44px targets each holding a 40px ring: a 1.5px ring and a
  glyph in the partner colour. Nothing you press sits over the mark. **Only two (14 Nov): Notebooks and Options.** No + and
  no bell in any band.
- **Adding sits beside the list it adds to (14 Nov):** a text button with a 16px + glyph, 44px tall, 13px 700 capitals at
  `.12em`, in the app's colour (ink where the app colour is mango), right of the list's title or count. The Eye's NEW SHOOT
  beside the Shoots count, Ref's NEW BOARD and NEW TAG beside their titles, Layouts' NEW LAYOUT, Rounds' ADD SOMEONE. The
  Eye's bell is gone: its Today card links to the full report.
- **The mark:** the app's mark, 80 × 40 (its top half), rising from the band's bottom edge at the lower left, its left edge in
  line with the title. Decoration only: it is not a button. **Ref's (14 Nov)** is its 2 × 2 board turned 45 degrees and cut
  by the band's edge, rising like a peak (scaled 1.41 so its top half fills 80 × 40); the board on its cover and icon stays square.
- **Label line:** 127px down, starting to the right of the mark (108px in) and running to 16px from the edge: the place in
  capitals, a 1px hairline in the partner colour, the date.
- The page starts under the steps, 204px down.

### 9.2 The notebooks button (suite only)

- In the suite, **every main section's band starts its buttons with the notebooks button**: a ring button with the notebooks
  glyph, labelled "Back to your notebooks". It opens the shelf.
- Swiping right on a notebook's first section still shuts the notebook too.
- **Standalone copies leave the button out.** (There is no shelf to go back to.)
- It replaces the old ways of shutting: the left triangle, the book icon, and the rising mark as a button.

### 9.3 The compact band (a page inside a section)

115px of solid band colour (59 + 56) and two steps of 10 and 8px. Back is its left button; the page's More menu is its right
button. Used for a shoot's page, a guide, a board.

### 9.4 The section bar

- The old bottom page switcher becomes **section marks**: a 98px bar (home area included) on paper, a 1px `line` rule on top,
  each section a 28px mark with its name under it (5.1). This section's mark is in colour, the others are `off`.
- Every section is always shown. Tap a mark to go there; swiping the page or the bar turns sections with **a plain slide
  (14 Nov)**: the page follows the finger and settles in 240ms, `cubic-bezier(.4, 0, .2, 1)`, no bounce or curl; with Reduce
  Motion, a 150ms crossfade. No page-turn animation. Holding the bar still opens the Dock-style row.
- **Hidden when an app has only one section** (Layouts).

### 9.5 Parts

| Part | Rule |
|---|---|
| Card | white, radius 12, padding 16 (12 for a card holding a row) |
| Row | 12px top and bottom, a 1px `line` under it; a picture at the left, the name (18px 300) over its meta line (label type) |
| Row picture | The Eye's shoots: portrait 4:5, 104 × 130, radius 6, with the name at 21px 300 (two lines at most), the date and flags under it and the ... menu top right (the Shoots list, its stat box lists and search, since 16 Nov); the Archive keeps 56 × 72 with an 18px name; Ref's boards: one big cover, full width, 196px tall |
| Field row | an 11px label over a 17px value, a chevron, at least 52px tall |
| Detail row | on a long page: a label (12px 700 capitals), a one-line summary (15px), an 8px dot (filled = has something, open = empty), a chevron. It opens that part's own page |
| Flag | a 20px pill with a 1px berry blade black outline, 10px 700 capitals (TEAM, MOOD BOARD, PROOFS, REFLECTION, FINAL IMAGES) |
| Status tag | the notched tag (section 6) in the notebook colour, 24px tall, 11px 700 capitals (in lists and on cards) |
| Status card | on a shoot's page, full width under its date and place: a white card (radius 12, a 1px `line` ring), STATUS (label type) and CHANGE › (button type) on top, the status at 22px with "3 OF 7" (label type) at its right, then one bar per stage in order (Prospect, Active planning, Shoot ready, Captured, the photo or video stages, Delivered), 4px apart, growing from 10 to 28px tall: done ones berry blade black, this one the notebook colour with a 1.5px berry blade black ring, the rest `#D6DADD`; the first and last stage named under the ends (11px dim). Postponed and Canceled show one crimson line saying so instead. The whole card is one button that opens Change status |
| Today card | The Eye's Overview: TODAY with "N THINGS" (label type) on top, then the two most urgent (a question first, then anything overdue), then a row "N MORE IN TODAY'S REPORT" with a dot for each, which opens the full report. The full report lists everything on the Today card first |
| Primary button | 40px tall (48 in a bottom bar), radius 8, the notebook colour with its small-text colour, button type |
| Big button (Live, 17 Nov) | for the main ways in (The Eye: NEW SHOOT on the Overview, ADD and FROM REF on a mood board; Ref: NEW BOARD and IMPORT on Mood boards, ADD A NEW PERSON in Who it's for): full width (two side by side share a row, 8px apart), 56px tall, radius 10, a 28px disc with a plus at the left, the action (14px 700 capitals) over a short line (13px, 80%). Kinds: ink (berry blade black, mango words and disc), the notebook colour (white words), and line (white with a 1.5px berry blade black ring) |
| Outline button | the same shape with a 1.5px berry blade black ring on paper or white |
| Text button | button type, no box |
| Segmented control | white segments on a `track` |
| Sheet | white, rising from the bottom; title in section type |
| Menu (…) | each row's actions, in a short list; Delete last, in crimson |

### 9.6 Guides (new shoot, new board, new layout)

- **Step marks on a hairline** instead of "Step N of M": done = a solid 14px berry blade black dot, this one = a 22px berry
  blade black dot with a notebook-colour dot inside, still to come = a 13px open `#9AA3A8` ring. The line is berry blade black
  up to this step. A small label under it ("CHAPTER 3 OF 6").
- **The Eye's guide has six chapters (20 Nov):** the shot list is on the Visuals page, under the mood board; Directions for
  the day are asked in Direction. The shoot page's own seven parts (and its Add the shot list, which opens Visuals) stay.
- Each step: a title (30px 300), one question (17px dim), answers as option cards (white, a 2px berry blade black ring when
  picked) or chips from saved lists. Honest answers ("Not sure yet") count as answered.
- **The Eye's Basics asks SHOOT PROGRESS:** Prospect, Active planning, Shoot ready and Captured as chips (40px, radius 20,
  `#EFEFEA`; picked = berry blade black with paper text and a tick). Prospect unless picked. A line under them: "Pick Captured
  for a shoot you've already done. The later stages are on the shoot page."
- **A bottom bar, always:** an outline secondary (The Eye: DONE FOR NOW, which saves) and a filled next button naming the next
  step ("NEXT: TEAM"). Back in the band goes to the step before.

### 9.7 Dark surfaces

Ref's picture viewer and The Eye's Shoot mode are dark on purpose: berry blade black ground, paper text, the notebook colour
for what matters (ticks, must-haves, the main action). So photos read true and the screen doesn't light up the set.

**Shoot mode is one page (Live, 17 Nov, the-eye round 7):** the header stays pinned (name, wrap time, time left, golden hour,
must-haves to go); under it, scrolling: Last time, Quick review, the shot list, the mood board (its own photos, then the pages
of any Ref boards, in rows of three; a tap opens the viewer; + Add photos), shooting notes. No page dots, no swiping between
pages; coming back to it opens where you were.

**PDFs on a mood board (Live, 17 Nov):** each page becomes one photo, made on the phone (long side 2400px), under a small
label with the file's name and its pages ("FROM LOOKBOOK.PDF · 8 PAGES", 11px 500 capitals, dim). A toast says they're in.
Ref's IMPORT makes a board as it came in (Starky, 21 Nov): a page of the board for each page of a PDF or each photo, at the
picture's own shape (its long side 11 inches), never cropped and never fitted into a layout ("As imported"). It asks only the
name and who it's for. A PDF's board is named after the file with "(from PDF)" after it in the list until it's renamed.

**Getting around a board (Live, 20 Nov):** the editor's tray starts with PAGES: the board's pages in order, each its first
photo with its number on a small ink pill, the one you're on ringed in ink; a tap goes to that page. A board brought in with
IMPORT opens on PAGES; others on ALL. Tapping a photo that's already on another page, with no spot free, goes to that page. A sideways
swipe on a picked photo that can't move sideways (a PDF's page) turns the page, as it does anywhere else on the page.

**Ref's board editor works like Layouts (Live, 21 Nov, Starky):** ADD A PAGE (13px bold caps with a plus) beside the page
count opens NEW PAGE, the layouts first ("Like this page" first of all), then makes the page after this one. Each page has a
round ink x on its top left corner (28px) that asks "Delete page 2?" first (Layouts' trash doesn't ask). + PHOTOS, a 56px
ringed tile at the start of the tray (on ALL), brings photos in from the phone; they fill the page's empty spots, the rest
wait in the tray. EXPORT asks IMAGES (a picture of each page: saved or shared on a phone, a ZIP on a computer) or PDF.
More layouts: grids with thin lines (0.05 inch), with no lines, and edge to edge with the words over the photos; they're
in the Layout sheet and two new New board styles, THIN LINES and NO LINES, and a page is never given one on its own.
Next-time notes show on New board's first step only: "They don't go on the board."

**Ref's Tags (Live, 21 Nov, Starky):** "Your photos N" with ADD PHOTOS heads the page, so photos come in before any tag is
opened. Under Your tags, "Found in your photos N": what Ref found in the photos, as tags of their own, most photos first.
Deleting a tag asks what goes: JUST THE TAG (its photos stay; a found tag is taken off them and not found again) or THE TAG
AND ITS N PHOTOS (red). Both can be undone.

**The Eye's mood board SHARE (Live, 21 Nov, Starky):** a line big button under the board, "Share / as a PDF or images". It
asks PDF or IMAGES, then puts the Ref boards' pages and the board's own photos together (each its own shape), then SAVE OR
SHARE (a tap, for the iPhone's share sheet). Not in the New shoot guide.

**Back to The Eye (Live, 21 Nov):** a board opened with a shoot's OPEN IN REF says "The Eye" in its band, and Back goes to
that shoot, on the page it was on. Anywhere else in Ref ends it.

**Ref's first visit (Live, 20 Nov; the ask 21 Nov):** after the cards (or after the tour is turned down), someone with no
photos is asked "Bring your photos in" (LATER, OPEN YOUR PHOTOS). Either way they go to Incoming, with an ink note: STEP 1 OF 2, Bring your photos in, SKIP; once photos are in, STEP 2 OF 2, Now tag them, GOT IT.
Tagging some ends it. The section bar shows as soon as a section starts loading, not once its photos are drawn.

**Who it's for (Live, 17 Nov, ref round 3):** ADD A NEW PERSON (big button, "Name and handle") first, then search, then RECENT
(the 12 people with the newest shoot or board; each with a short line: their group or role, then their shoots or their handle),
then "No one, it's just for me" as a text button at the end.

### 9.8 The shelf

- **The ground is paper**, and the 3D notebooks float on it as they do today (section 10).
- **Covers:** flat band colour with grain, the app's mark big in the middle, the app's name in the partner colour near the
  bottom, and any stickers. They replace the cover pictures made per colour, so a new colour needs no new art.
- **Side tabs** in Figtree 600, alternating the light step colour with berry blade black text and berry blade black with paper
  text. Ref: Mood boards, Tags. The Eye: Overview, Shoots, Reflections, Archive, Stats. Layouts: All layouts, New layout.
  Rounds: Today, People, Promises (Messages until 21 Nov; 14 Nov: Overthoughts' Entries and Reviews went with it).
- **Top left:** DOCUMENTING FICTIONS, 13px 700 capitals.
- **Arrangements:** Ring, Dominoes, Row and Spread (the books big, overlapping, lying back), changed by swiping up or down.
  Nothing shows which one is in use (the marks at the right edge went on 16 Nov, shelf round 7).
- **Pinch to zoom (Live, 16 Nov, shelf/09):** two fingers apart bring the books close, the front one about 85% of the
  screen's width, the others cut by the edges and cut off under the title (paper over them); the bar under the books hides.
  Two fingers together, or a tap on the paper, ease them back. Follows the fingers, then settles (320ms), no bounce; Reduce
  Motion crossfades. Close up, a tap on the front book opens it and a swipe turns the shelf.
- **Under the front book:** its name and one line about it, page dots, and the Options button: a 52px disc in the front
  notebook's colour with three dots in its partner colour shrinking left to right (7, 5.5 and 4px, 4px apart), no ring. It
  changes colour as the books turn; the same button in every arrangement.
- **Options sheet:** the front book comes up close; colour (the seven pairs), STICKERS with REMOVE ONE and one ADD A STICKER
  button, the rows How they connect, (from December) Your year, Save as image and Restore a backup, BACK UP (outline) and DONE
  (berry blade black).
- **Save as image (Live, 16 Nov, shelf/08):** a white sheet: SAVE AS IMAGE, a preview (236 wide, 6px corners, a soft lift),
  WHAT (the front notebook's name, or The whole shelf) and SIZE (Post 4:5, Story 9:16, Square) as 36px pills, the picked one
  berry blade black, the rest `#EFEFEA`; SAVE AND SHARE (50px, berry blade black) opens the share sheet. The picture, 1080
  wide on paper: the notebook flat with its stickers as on the shelf (Barely), a soft floor shadow, DOCUMENTING FICTIONS
  small at the foot (700, spaced to half the width); the whole shelf is each cover where it stands, in its perspective.
- **Back up (Live, 15 Nov, backup/01):** one Back up, in the shelf's Options and in each notebook's, opens a white sheet from
  the foot titled BACK UP (13px caps, the 40px ring close) with two rows under a navy rule, each with a chevron: **Just <the
  notebook in front>** (a 30px tile in its colour with its mark; one dim line, "The notebook in front." then what's in it;
  inside a notebook, "Just this notebook") and **All four notebooks** (the four 14px minis in a 2 x 2; "Ref, The Eye,
  Layouts and Rounds in one backup, with the shelf."). Tapping one makes it there and then; SAVE THE BACKUP (berry blade
  black) saves it, a tap a file on a phone; the row it's of stays bold. A notebook on its own has only the first row.
  **Restore** takes either kind: on the shelf, a backup of one notebook says which ("RESTORE THE EYE?") and puts back only
  that one; inside a notebook, a backup of all four asks first, "This backup has all four notebooks.", JUST REF (main)
  or ALL FOUR (outline). The sheet looks the same everywhere: styles/shared/backup.css.
- **No floating ! (Starky, 21 Nov):** the ! over a notebook with something waiting (15 Nov, in place of the slips tucked
  into the covers) is gone. What's waiting still shows inside each notebook (Today, its tray), and the notebooks still keep
  it (shared/data/waiting.js) in case the shelf shows it again.
- **Search (Live, 15 Nov):** a magnifier at the top right. One box: people first, then each notebook's results under its
  mark in loop order (Rounds, Ref, The Eye, Layouts).
- **Paper pages (Live, 15 Nov):** the person page, HOW THEY CONNECT and YOUR YEAR are paper with no band: a back ring
  button, a small caps title, then rows on a 1px ink rule. Each notebook shows under its mark on its colour (28px tile,
  6px corners); a move's kind under its 16px mini. YOUR YEAR's numbers are 44px light.
- **Thank-yous (Live, 15 Nov, thanks/01-04):** Say thanks after a shoot is due the day after it, Sundays too. A move opened
  says WHAT DID YOU SAY? over an empty box, with USE YOUR <KIND> MESSAGE under it (a plus, on #EFEFEA, the starter in dim 15px)
  that fills it. HOW and the note are on the same sheet since 16 Nov (Rounds, tightened, below). The Eye shows Say thanks
  FROM ROUNDS on a captured shoot, OPEN ROUNDS and <NAME> WROTE FIRST (names, since Rounds keeps no pronouns).
- **Rounds, tightened (Live, 16 Nov, rounds/06-11, rounds/NOTES.md):** ONE sheet per move, never a second one after DONE:
  the header is their photo, name and "Today, Mon 16 Nov"; WHAT KIND (Check in, Say thanks, Say hello, Ask, Pitch, Other,
  pill chips, preset from the card or their next move); WHAT DID YOU SAY? with USE YOUR <KIND> MESSAGE under it; HOW
  (picked for you once COPY AND OPEN has gone out); A NOTE FOR YOU (OPTIONAL), "Only you see this"; COPY AND OPEN (outline)
  and DONE (mango on ink). Another kind than the due one is a move of its own that still counts as keeping in touch; the
  card stays. Today has + CONNECTION beside the count (since 20 Nov: a 40px pill, ink with mango; it was REACH OUT in
  button type, too quiet to see): NEW CONNECTION, SOMEONE NEW first (big button, ink with mango, "Add them, then write" or
  Add "<typed>"), then OR SOMEONE YOU KNOW over a search (rows: photo, name, "Client · last: sent photos, 2 Nov", the last
  in touch first). WHAT YOU SAID and a moment opened from DONE TODAY have their photo and name on top, a way to their
  page (20 Nov). A person's photo is cropped to 4:5 when chosen (from the menu, or a tap on it on their page), as The Eye
  crops a talent photo; the menu always has YES, LET'S SHOOT (marked once they said yes). Pulled down past the top, the
  band's colour goes on up. A done move tapped (DONE TODAY on Today, SO FAR, the shelf's person page) shows WHAT YOU SAID: the kind's tag in
  the header, "Said thanks to Jules", "Mon 16 Nov · by text", WHAT YOU SAID and YOUR NOTE, then DELETE (text, with Undo),
  EDIT and COPY AGAIN. People: a search box (name, handle, note), one filter chip at a time (All, Due, Regulars, Clients,
  New, Prospects), "Sort: A to Z ▾" (Next move, Recently in touch; kept on the device), one dim line per card (the last
  thing this past week, else when they're due). Two people who look alike get one quiet line, "<A> and <B> might be the
  same person.", with MERGE and an ×; the merge sheet shows both as cards (KEEP THIS NAME ✓) and MERGE, mango on ink, with
  Undo after. The person menu adds MERGE WITH... and DELETE (asks first, can't be undone).
- **Rounds, flipping and saved messages (Live, 18 Nov, rounds/14, rounds/NOTES.md):** swiping Today's cards only flips
  through them (left the next, right the one before, round again); nothing is done by a swipe. While flipping the count
  says "2 OF 3" and the arc rings the one in front (done ink, the rest open); a card with nothing to flip to slides back.
  A move is done only on the one sheet: WRITE TO, a tap on the card, or DONE (button type) beside the card's tag, for
  something already done outside the app. On the sheet, once USE YOUR <KIND> MESSAGE was used and the words then
  changed, a line under the box (#EFEFEA, radius 10): a 20px tick box, off to start (ticked: berry blade black with a mango
  tick), "Save this as your <kind> message" (14px) over "You changed it. Next time it starts like this." (12px dim); it
  takes the place of the USE YOUR line. DONE with it ticked saves the words in Messages with the person's details back
  as blanks ([name], [brand], [where], [when], [offer], [city], [shoot]).
- **Rounds on its own (Live, 21 Nov, rounds/STANDALONE.md):** a copy like the others (folder `Rounds`, repo
  screenersbear/rounds, screenersbear.github.io/rounds/), made only by `tools/sync.py export rounds`, for other
  photographers. Everything it keeps is under df-rounds (as The Eye's under df-theeye), so it never sees the suite's Rounds.
  It leaves out, quietly: the Notebooks button, people from The Eye's shoots, A year since, The Eye's shoots in SO FAR,
  Layouts' post slips, a yes passed to Ref, the shelf's person page, and Bring in from Callback. Back up is only Just this
  notebook; a backup of all four says "This backup has all four notebooks. On its own, Rounds puts back only its part."
  (JUST ROUNDS or CANCEL; every notebook on its own says the same). Sync stays, its words without Claude ("Off. Keeps
  Rounds the same on all your devices."). Its first launch offers the tour: WELCOME TO ROUNDS, "A few people to write to
  each day, and the words to start with. A quick tour of how it works?", NOT NOW or TAKE THE TOUR; Not now: ANY TIME, "The
  tour is in Options, the button at the top of the screen, under How it works."
- **The @ in the handle boxes (Live, 21 Nov, rounds/NOTES.md):** Add someone's Instagram box and Edit's Instagram and
  TikTok boxes start with an @ fixed inside the box (ink, 17px like the text), the placeholder "handle" after it. Typed or
  pasted, "@june.park" or a profile link comes out as "june.park"; spaces go. Saved as before, without the @.
- **Done today on Today (Live, 16 Nov, rounds/12-13, rounds/NOTES.md):** no Done today button or sheet. DONE TODAY <n> is a
  section under the cards (heading in small capitals, the count dim, an ink rule under it): a row per move or moment done
  today, newest first, the 16px mark (Rounds' for moments), "Said thanks to **Maya R.** · text" (17px, the name 500, how
  dim), the first line of what you said in quotes under it (14px dim, one line; a moment's note without quotes), a pale
  chevron. A move opens WHAT YOU SAID (Delete with Undo brings its card back); a moment its sheet. Once the day's cards
  are done the count reads ALL 3 DONE, "That's today." (light 30px, 22px under the count), one 15px dim line on who's next
  ("Next up tomorrow: a check-in with Ana L." or "Nothing due this week."), then DONE TODAY as the page.
- **Bring in from Callback (ONE-TIME, Live, 16 Nov, rounds/NOTES.md):** Starky's own move from Callback; out again when he
  says it's done. A row in Options under Import people ("From a Callback backup"). The same tick list as Import people and
  Claude's leads, with "3 touchpoints" (or "In Rounds already: 2 touchpoints go on their page", and "· Let go" for someone
  Parked) small under each name. Touchpoints are moments in SO FAR; ADD A MOMENT gained EMAILED (after CALLED), for good.
- **Promises (Live, 21 Nov, Starky: "messages on the bottom is misleading ... maybe that's a place for pending promises and
  fulfillment?"; he picked the Promises tab):** the third section is PROMISES (a seal with its ribbon), where Messages was;
  the starter messages are in Options as YOUR MESSAGES (a page with the short band and a back arrow, no section bar). The
  tab: + PROMISE (the ink big button, "Something you or they said would happen"), then YOU PROMISED and THEY PROMISED
  (list heads with their counts), only the open ones, the nearest day first, no day last. A row: their photo (40 x 50),
  what (17px), their name and "Due Thursday", "Expected tomorrow" or "3 days late" (dim 13px; late in crimson, written out),
  a chevron. None: one dim line saying what goes here. + PROMISE: WHO IS IT WITH? (the search over everyone), then the
  promise's sheet: their photo and name as a way to their page, WHO PROMISED (I promised, <Name> promised), WHAT, BY WHEN
  (OPTIONAL), ADD THE PROMISE, with Undo. A tap on a row: KEPT IT (theirs: GOT IT), ANOTHER WEEK (with its new day), PICK A
  DAY, LET IT GO and <NAME>'S PAGE; each says so with Undo. A person's page lists their open ones under PROMISES (no photo
  or name), and its ... menu has ADD A PROMISE. Bring in from Callback brings each open loop still open as a promise ("· 2
  promises" under the name). The shelf's Rounds tabs read Today, People, Promises.
- **Moments and SO FAR (Live, 16 Nov, thanks/05-06):** a person in Rounds: photo, name, handle, one line; the next move;
  ADD A MOMENT (outline button, full width); SO FAR (button type) over every row, newest first: the date in 11px small
  capitals (50px wide), the mark (a move's own mini; Rounds' ink + mango mark for moments and notes; The Eye's for shoots),
  what in 17px (" · how" dim), the note under it in 15px light, a 1px `line` under each. Moments and notes open to change or
  delete (with Undo), moves to change how and the note. EVERYTHING WITH <NAME>, IN ALL FOUR at the bottom. The ADD A MOMENT
  sheet: A MOMENT WITH <NAME> (button type); WHAT HAPPENED, 36px pill chips (ink with mango when picked); WHEN, a 48px pale
  box with a 1px `line` ring ("Today, Mon 16 Nov", the date picker over it); A NOTE (OPTIONAL) with an ink ring; COUNTS AS
  KEEPING IN TOUCH, a switch with what it moves under it in 13px dim; ADD THE MOMENT, 50px, mango on ink. (Done today's
  ADD A MOMENT went with its sheet on 16 Nov.) On the shelf's person page Rounds' part shows NEXT, the
  latest two rows, then ALL IN ROUNDS › and ADD A MOMENT (button type), both opening Rounds.
- **Someone you know (Live, 15 Nov, people/NOTES.md):** The Eye's talent picker is SOMEONE YOU KNOW: everyone, talent
  and team, from its shoots and the one list of people, newest first, labelled "Iryna V. · team, 3 shoots". Typing a name
  (first, last or a handle) lists up to five under it, in the talent and team member popups; picking fills name, handles
  and photo. Both popups open with FIND SOMEONE YOU KNOW, a search box that does the same, so nobody scrolls the whole
  list (20 Nov); the list follows as OR PICK FROM EVERYONE (team: OR PICK A PAST TEAM MEMBER). In the suite the talent popup has BOOKED ME (They're the paying client.), a df-switch: on for headshot,
  branding and other portrait kinds, off for portfolio building, test shoots and editorial, set per person. Rounds: a
  person can be in more than one group (Edit shows them as chips; Prospect drops once Client is in); a captured shoot makes
  whoever booked you a Client too, and a Regular who's a Client gets the client moves with check-ins between, one card
  at a time. People pages read "Regular. Client."
- **Progress bars (Live, 15 Nov, progress/NOTES.md):** never start empty, say what's left near the end, never drop back
  to empty. The Eye's new-shoot guide: a short inked line leads into the first mark (making the shoot counts), and the
  label goes "Chapter 1 of 6" ... "Chapter 4 of 6", then "2 to go" and "Last one" (just "Chapter N of 6" when opened for
  one chapter). Rounds' Today: the arc is inked up to this card's stop, which is half teal in an ink ring ("started");
  the count reads "3 TODAY", "2 TO GO", "LAST ONE"; a finished day keeps the whole arc and every stop ink beside "That's
  today" until tomorrow. The shoot's status card: "2 to go", then "1 to go: delivery"; delivered stays "7 of 7", all
  marks full. Loading bars (backups, exports, the sticker cut-out) are not these.
- **Waiting on selects (Live, 16 Nov, selects/NOTES.md):** a photo shoot at Waiting for selects counts its days from
  when it was marked Proofs sent (a shoot already waiting counts from 16 Nov). From day 3 The Eye's Today card (and the
  report) asks "Still waiting on June's selects for Rooftop portraits. 4 days so far." with GOT THEM (to Editing, then
  the deadline question), REMIND JUNE (names, no pronouns) and a quiet STILL WAITING (asks again in 3 days); a project's
  days waiting are asked once. The shoot's status card goes on under itself: "Proofs sent to June 4 days ago." and the
  last reminder, with GOT THEM and REMIND JUNE. REMIND opens a Rounds-move sheet: WHAT DID YOU SAY?, USE THE SELECTS
  REMINDER (its words in Options, Selects reminder; [name] and [shoot] fill in), COPY AND OPEN INSTAGRAM (COPY THE
  MESSAGE with no handle), Done. Done logs it on the shoot and, in the suite, as a moment with them in Rounds (Texted, or
  Messaged on Instagram, with what was said, counting as keeping in touch). There's no In the edit tile: the tiles went on 13 Nov.
- **Placing a sticker:** pick a photo, then the placing screen: the book big with the sticker on it (drag to move, pinch to
  size, twist to turn) and a sheet under it with SHAPE (Circle, Square, Card, Cut out) and EDGE (White border, Black outline)
  as segmented controls, the sticker changing as you pick; BACK and STICK IT ON. Shape and edge are chosen there, never after.
- **Stickers:** vinyl, barely there so the photo reads (15 Nov, round 6 Barely: grain, wrinkles only toward the edges, sheen, one fold and gloss, all much lighter) with a lift shadow. White
  border: 1.2% of the cover's width (3px at 250px). Black outline: 1% (2.5px), berry blade black. Cut out traces the
  picture: a white margin of 3.5% of the sticker's width, or an ink line 60% of that; texture and shadow follow the cut.

### 9.9 Other layout rules

- **Specimen grid:** a list of things shown as objects is a grid of equal tiles: object, a label, then the name, all
  left-aligned (refs 2, 3, 4).
- **Plain pages once a notebook is open (Live):** no paper lines, stitching or ruled paper. The paper ground is a flat colour,
  not a notebook page. The 3D notebooks only live on the shelf.

## 10. Motion

- Parts move like pieces of card: halves slide along their cut, quarters turn a quarter turn, rings grow from the centre.
- 180–320ms, `cubic-bezier(.4, 0, .2, 1)`, the shelf's curve. No bounce.
- Turning a notebook's sections is a plain slide, never a page turn (9.4, 14 Nov).
- Turn it all off for `prefers-reduced-motion`.
- The shelf's 3D turntable, its float and bob, and the opening and shutting animations stay as they are (Live, Starky 13 Nov).

## 11. Texture (Decided)

- A faint paper grain on big flat areas of colour: bands, covers, big marks. Like ref 5. (The mockups: fractal noise at 14%
  opacity, overlay blend.)
- Never on text, photos, icons, or anything under 48px.

## 12. Do and don't

**Do**

- Check this kit before making anything new. Reuse a part before adding one.
- Build marks from section 6, in at most three colours plus the paper.
- Keep type light, small and left-aligned. Let shapes and colour be loud.
- Make the same thing the same way in every app.

**Don't**

- Use true black. Berry blade black is the darkest colour.
- Add gradients or drop shadows to flat marks. The 3D notebooks on the shelf and glass marks are the only exceptions.
- Use emoji, clip art, handwriting fonts, or illustration in another style.
- Put boxes or bars around headings.
- Put white small text on light colours.
- Tint or filter the user's photos.
- Show "STKY" anywhere in the apps.
- Change something's look without being asked (Live): keep what's there when adding to it.

## 13. Starky's answers

| # | Question | Answer |
|---|---|---|
| D1 | Ground | Paper, now `#FAFAF7` (round 2; `#F2EFE6` and `#F7F5EF` were too beige) |
| D2 | Black | Berry blade black `#313D45`, no true black |
| D3 | Palette | The seven pairs in 4.2 ("They work") |
| D4 | Headers | Quieter: light names, small bold labels |
| D5 | Glass | Big marks only |
| D6 | Icon weight | Thin, one weight everywhere |
| D7 | Grain | Yes, faint |
| D8 | Marks | Everywhere: app icons + shelf, section bar, empty screens, loading + progress |
| D9 | Handwriting | Retire Klee One |
| D10 | Band titles | Left-aligned |
| D11 | Band shape | The "take two" band, now drawn exactly in the round-2 mockups (9.1) |
| — | Band colour | The notebook colour leads, and a partner colour supports it (4.2) |
| — | The Eye's default | Mango |
| — | Mark in the band | Lower left, under the title, buttons alone at the top right; decoration only (round 2) |
| — | Defaults | The Eye mango, Ref ocean, Layouts berry (round 2) |
| — | Notebooks button | In every main section's band, suite only (round 2) |
| — | Contact Sheet | Renamed Layouts, for now (round 2) |
| — | Shelf | The floating notebooks stay, on paper (round 2) |
| — | Bands | Only Notebooks and Options; adding beside its list; The Eye's bell gone (14 Nov) |
| — | Turning sections | A plain slide, no page turn (14 Nov) |
| — | Fourth notebook | Rounds, a light networking checklist, in Overthoughts' place (14 Nov); Overthoughts taken out (15 Nov) |
| — | Shelf slips | Replaced by the floating ! and its preview (15 Nov); the ! taken off too (21 Nov) |
| — | Turned down | A Today strip on the shelf, and board colours carrying into posts (15 Nov) |

Still open: the shelf's own mark (7), and the hidden up/down swipe on the
shelf (ring, dominoes, row), which round 2 doesn't show: it stays until Starky decides.
