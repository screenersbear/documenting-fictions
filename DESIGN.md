# STKY Design Rulebook

STKY is Starky's private name for his app suite: Documenting Fictions, which is the shelf, Ref, The Eye, Layouts (was
Contact Sheet) and Overthoughts. This file is how every one of them should look. Read it before any change you can see.
**Never show "STKY" in the apps.**

**Status, 2026-11-13, round 2.** The round-2 mockups (`../STKY mockup handoff/round-2/`, README first, then each folder's
NOTES.md, latest round wins) settled most of what was open. Where this file and a mockup disagree, the mockup wins. Each rule
is marked:

- **Live**: already in the apps. Follow it.
- **Decided**: Starky chose it, but the apps don't have it yet. Build it when asked to bring an app up to this rulebook, not
  as a side effect of other work.
- **Proposed**: still waiting, usually on a mockup. Don't build it.

Overthoughts and Callback are being redesigned and aren't in round 2: leave them as they are.

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

**Defaults per app (Decided, round 2):** The Eye `mango`, Ref `ocean`, Layouts `berry` (was `orange`). Overthoughts `leaf`
stays Proposed until its redesign. The shelf has no colour of its own: paper, with each book in its notebook's colour.

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

Klee One is retired. The shelf's book tabs (Figtree 600, round 2) and Ref's board pages move to Figtree. Ref's board pictures
are drawn on a canvas in Klee One (`pages.js`), so that drawing changes with it, and saved boards will look different once it's
done.

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
| Overthoughts | the four-lobe shape (ref 6): a thought |

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
  glyph in the partner colour. Nothing you press sits over the mark.
- **The mark:** the app's mark, 80 × 40 (its top half), rising from the band's bottom edge at the lower left, its left edge in
  line with the title. Decoration only: it is not a button.
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
- Every section is always shown. Tap a mark to go there; swiping the page or the bar still turns sections with the page-turn
  animation, and holding the bar still opens the Dock-style row.
- **Hidden when an app has only one section** (Layouts).

### 9.5 Parts

| Part | Rule |
|---|---|
| Card | white, radius 12, padding 16 (12 for a card holding a row) |
| Row | 12px top and bottom, a 1px `line` under it; a picture at the left, the name (18px 300) over its meta line (label type) |
| Row picture | The Eye's shoots: portrait, 44 × 56, radius 6 (a multi-day project shows three photos split); Ref's boards: one big cover, full width, 196px tall |
| Field row | an 11px label over a 17px value, a chevron, at least 52px tall |
| Detail row | on a long page: a label (12px 700 capitals), a one-line summary (15px), an 8px dot (filled = has something, open = empty), a chevron. It opens that part's own page |
| Flag | a 20px pill with a 1px berry blade black outline, 10px 700 capitals (TEAM, MOOD BOARD, PROOFS, REFLECTION, FINAL IMAGES) |
| Status tag | the notched tag (section 6) in the notebook colour, 24px tall, 11px 700 capitals; on a page it's a button (▾) that opens Change status |
| Primary button | 40px tall (48 in a bottom bar), radius 8, the notebook colour with its small-text colour, button type |
| Outline button | the same shape with a 1.5px berry blade black ring on paper or white |
| Text button | button type, no box |
| Segmented control | white segments on a `track` |
| Sheet | white, rising from the bottom; title in section type |
| Menu (…) | each row's actions, in a short list; Delete last, in crimson |

### 9.6 Guides (new shoot, new board, new layout)

- **Step marks on a hairline** instead of "Step N of M": done = a solid 14px berry blade black dot, this one = a 22px berry
  blade black dot with a notebook-colour dot inside, still to come = a 13px open `#9AA3A8` ring. The line is berry blade black
  up to this step. A small label under it ("CHAPTER 3 OF 7").
- Each step: a title (30px 300), one question (17px dim), answers as option cards (white, a 2px berry blade black ring when
  picked) or chips from saved lists. Honest answers ("Not sure yet") count as answered.
- **A bottom bar, always:** an outline secondary (The Eye: DONE FOR NOW, which saves) and a filled next button naming the next
  step ("NEXT: TEAM"). Back in the band goes to the step before.

### 9.7 Dark surfaces

Ref's picture viewer and The Eye's Shoot mode are dark on purpose: berry blade black ground, paper text, the notebook colour
for what matters (ticks, must-haves, the main action). So photos read true and the screen doesn't light up the set.

### 9.8 The shelf

- **The ground is paper**, and the 3D notebooks float on it as they do today (section 10).
- **Covers:** flat band colour with grain, the app's mark big in the middle, the app's name in the partner colour near the
  bottom, and any stickers. They replace the cover pictures made per colour, so a new colour needs no new art.
- **Side tabs** in Figtree 600, alternating the light step colour with berry blade black text and berry blade black with paper
  text. Ref: Mood boards, Tags. The Eye: Overview, Shoots, Reflections, Archive, Stats. Layouts: All layouts, New layout.
  Overthoughts: Entries, Reviews (until its redesign).
- **Top left:** DOCUMENTING FICTIONS, 13px 700 capitals.
- **Under the front book:** its name and one line about it, page dots, and one ring button: Options for the notebook in front.
- **Options sheet:** the front book comes up close; colour (the seven pairs), Add a sticker (Circle, Square, Rectangle), Remove
  a sticker, BACK UP ALL FOUR (outline) and DONE (berry blade black).

### 9.9 Other layout rules

- **Specimen grid:** a list of things shown as objects is a grid of equal tiles: object, a label, then the name, all
  left-aligned (refs 2, 3, 4).
- **Plain pages once a notebook is open (Live):** no paper lines, stitching or ruled paper. The paper ground is a flat colour,
  not a notebook page. The 3D notebooks only live on the shelf.

## 10. Motion

- Parts move like pieces of card: halves slide along their cut, quarters turn a quarter turn, rings grow from the centre.
- 180–320ms, `cubic-bezier(.4, 0, .2, 1)`, the shelf's curve. No bounce.
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

Still open: the shelf's own mark (7), Overthoughts' default colour and look (its redesign), and the hidden up/down swipe on the
shelf (ring, dominoes, row), which round 2 doesn't show: it stays until Starky decides.
