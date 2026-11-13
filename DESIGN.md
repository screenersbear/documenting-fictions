# STKY Design Rulebook

STKY is Starky's app suite. For now that means Documenting Fictions: the shelf, Ref, The Eye, Contact Sheet and Overthoughts.
This file is how every one of them should look. Read it before any change you can see.

**Status, 2026-11-13.** Starky answered the questions (section 13). Each rule is marked:

- **Live**: already in the apps. Follow it.
- **Decided**: Starky chose it, but the apps don't have it yet. Build it when asked to bring an app up to this rulebook, not
  as a side effect of other work.
- **Proposed**: still waiting, usually on a mockup. Don't build it.

---

## 1. The look in one paragraph

Mid-century Swiss modernism, rebuilt as a kit of parts. Flat shapes of colour (circles, halves, quarters, rings, triangles,
stripes, notched tags) sit on warm paper, held in place by thin lines and small, quiet type. Every app, section and state
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

### 4.1 Neutrals

| Token | Hex | Use | Status |
|---|---|---|---|
| `paper` | `#F2EFE6` | the ground of every page, sheet and the shelf | Decided (D1); the apps are on white `#FFFFFF` today |
| `text` (berry blade black) | `#313D45` | all text, hairlines, the dark shape in a mark | Live (D2: no true black anywhere) |
| `dim` | `#5C666D` | captions, labels | Live |
| `line` | `#D6DADD` | dividers | Live (may need retuning against paper) |
| `white` | `#FFFFFF` | text on dark colour; fields and sheets may stay a shade lighter than paper | Live |

### 4.2 The notebook colours

Each notebook has an app colour, picked in its Options. Starky decided (D3) to **retune them toward the reference board**.
The new values are Proposed until Starky has seen them side by side (mockup).

| Name | Live now | Proposed retune | From | Text on the new one |
|---|---|---|---|---|
| `orange` | `#EC701E` | `#F05A1A` vermilion orange | refs 1, 5 | white, big text only (3.4:1); no small text on it |
| `mango` | `#FFD100` | `#FFD100`, unchanged (already the card's yellow) | ref 1 | berry blade black |
| `berry` | `#BF0B83` | `#CC2E8A` orchid pink | ref 2 | white (4.9:1) |
| `fern` | `#2E7A55` | `#13803F` print green | refs 5, 6 | white |
| `ocean` | `#245CAA` | `#0A4FD6` cobalt | refs 2, 7 | white |
| `leaf` | `#2F9A55` | `#14BFA0` teal | refs 2, 3 | berry blade black (4.8:1); white fails |
| `ink` | `#313D45` | `#313D45`, unchanged (berry blade black) | — | white or mango |

Note: each notebook's cover and edge on the shelf are pictures made per colour (`<app>/art/<colour>-cover.webp` and
`-block.webp`). New colours need new pictures for all four notebooks.

### 4.3 Mark colours (Live for marks once built)

Marks, patterns and illustrations may also use these, taken from the board. Chrome (bands, buttons) uses only the notebook
colours.

| Brights | Hex | | Tints | Hex |
|---|---|---|---|---|
| `sky` | `#0596FF` | | `lavender` | `#F1E5F5` |
| `crimson` | `#A1062A` | | `periwinkle` | `#CCD9FA` |
| `chartreuse` | `#E2E600` | | `peach` | `#FEE3D7` |
| `forest` | `#2C5E3C` | | `sage` | `#CDD1C1` |
| `amber` | `#F7A52B` | | `salmon` | `#FFAFAB` |

### 4.4 Colour rules

- A mark uses **at most three colours plus the paper**, and the hairline. The one exception is the shelf's mark: one quarter
  for each of the four notebooks.
- A tint is only ever the light partner of a bright, never on its own as a mark.
- Pairs that work, straight from the board: crimson + paper, berry blade black + chartreuse, cobalt + salmon, orange + green,
  sky + peach, forest + teal.
- White small text never goes on orange, mango, chartreuse, amber, teal, salmon or any tint.
- Colour is never the only signal: a state also changes shape, word or position.
- Photos are never tinted, filtered or covered by the interface. Contact Sheet and The Eye are photo tools.

## 5. Type

Two fonts: **Figtree** for everything you read, and **Archivo Black** only where it's still live until each app is brought up
to this rulebook. Headers are always capitals. Starky decided (D4) they get **quieter**: light names and small bold labels, so
the shapes do the shouting.

### 5.1 Levels (Decided, D4 and D10; sizes Proposed until the mockup)

| Level | Font | Size | Use |
|---|---|---|---|
| 1 Band title | Figtree 300, capitals, `.06em`, **left-aligned** | 24px | the title in the top band |
| 2 Section / sheet title | Figtree 700, capitals, `.12em` | 13px | page sections, sheet and modal titles |
| 3 Label | Figtree 500, capitals, `.12em`, dim | 12px | field labels, months, groups, captions under marks |
| Name | Figtree 300 | 20–28px | names you wrote: a board, a shoot, a chapter (as you wrote them, never capitals) |
| Body | Figtree 400 | 16–19px | everything else |
| Numbers | Figtree, tabular figures, `.06em` | any | counts, dates, sizes, so they line up |

What's live today (until each app is brought up): Archivo Black capitals for band titles (24px, centred) and section titles
(18px), Figtree 600 capital labels, Figtree 400 body. The Eye's band is berry blade black with a mango title; the others are
in their app colour with a white title.

### 5.2 Rules (Live)

- Headers are always capitals; names you wrote are not.
- No boxes, borders or bars around headings.
- Words: a photo is a "shot", never a "frame".

### 5.3 Handwriting (Decided, D9)

Klee One is retired. The shelf's book tabs and Ref's board pages move to Figtree. Ref's board pictures are drawn on a canvas
in Klee One (`pages.js`), so that drawing changes with it, and saved boards will look different once it's done.

### 5.4 Wordmark (Proposed)

`STKY` in Figtree 700 capitals, then the product in Figtree 300, the way Surforma pairs a bold and a light word:
**STKY** Documenting Fictions.

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
| Frame | a tag's outline, 2 units thick, with a different-coloured tag inside |
| Hairline | 1px berry blade black at any size, only at 0°, 45° or 90° |

Building rules:

- Shapes inside a mark touch exactly, with no gaps and no overlaps (glass marks excepted).
- Marks in a row or grid share one size and one gutter (one third of the mark's width).
- At most one dark shape (berry blade black, forest or cobalt) per mark.
- Corners stay consistent within a mark: all square, or all at radius 2.

## 7. Marks (Decided: everywhere; the designs are Proposed until the mockup)

Starky chose marks for all four places (D8):

| Where | What |
|---|---|
| App icons and the shelf | each notebook's home-screen icon and its book on the shelf |
| Section tabs | a small circle mark per section, in the notebook's colours, like ref 2 |
| Empty screens | the section's mark, big, with one line under it |
| Loading and progress | a progression: bars or dots filling in order, like ref 4 |

Starting ideas for the app marks, to be mocked up:

| App | Idea |
|---|---|
| STKY / the shelf | four quarters, one in each notebook's colour |
| Ref | a square cut into a 2 × 2 board |
| The Eye | a ring with a dot: an eye |
| Contact Sheet | three bars side by side: a strip of shots |
| Overthoughts | the four-lobe shape (ref 6): a thought |

## 8. Icons

- **UI glyphs (Decided, D6):** thin line icons, kept thin, and the **same weight in every app**, round caps and joins. One
  colour: text, or the app colour when active. Today the weights run from 1.2 to 3 on a 24-unit grid (The Eye mostly 2 and
  2.5, the shelf 1.6). The shared weight is Proposed: 2 units.
- **Marks:** the expressive version of the same idea, built from the shape kit (section 6). Flat colour, except:
- **Glass (Decided, D5):** for **big marks only** (app icons, the shelf, empty screens), shapes may overlap as translucent
  layers, like ref 3. Never on tabs, buttons, loading, or anything under 48px.
- A glyph and its mark stand for the same idea and keep the same silhouette where they can (ref 3).

## 9. Layout

- **Phone first.** 16px side gutter. Nothing scrolls sideways.
- **The band (Live):** a band of colour across the top. The Eye's is berry blade black with a mango title; the others are in
  their app colour with a white title (berry blade black on light colours). Its title moves to the **left** (Decided, D10).
  Its **shape** is Proposed: straight, or notched tags and frames like ref 7. Starky asked to see both (D11).
- **Specimen grid (Decided with the marks):** a list of things shown as objects is a grid of equal tiles: object, a label,
  then the name, all left-aligned (refs 2, 3, 4).
- **Plain pages once a notebook is open (Live):** no paper lines, stitching or ruled paper. The warm paper ground (D1) is a
  flat colour, not a notebook page. The 3D notebooks only live on the shelf.

## 10. Motion

- Parts move like pieces of card: halves slide along their cut, quarters turn a quarter turn, rings grow from the centre.
- 180–320ms, `cubic-bezier(.4, 0, .2, 1)`, the shelf's curve. No bounce.
- Turn it all off for `prefers-reduced-motion`.
- The shelf's 3D turntable and its float stay as they are (Live).

## 11. Texture (Decided, D7)

- A faint paper grain, about 3%, on big flat areas of colour: bands, covers, big marks. Like ref 5.
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
- Change something's look without being asked (Live): keep what's there when adding to it.

## 13. Starky's answers (2026-11-13)

| # | Question | Answer |
|---|---|---|
| D1 | Ground | Warm paper `#F2EFE6` |
| D2 | Black | Berry blade black `#313D45`, no true black |
| D3 | Palette | Retune the notebook colours toward the references (new values in 4.2, to see first) |
| D4 | Headers | Go quieter: light names, small bold labels |
| D5 | Glass | Big marks only |
| D6 | Icon weight | Keep thin, one weight everywhere |
| D7 | Grain | Yes, faint |
| D8 | Marks | Everywhere: app icons + shelf, section tabs, empty screens, loading + progress |
| D9 | Handwriting | Retire Klee One |
| D10 | Band titles | Left-aligned |
| D11 | Band shape | Show both (straight and notched) before deciding |
| — | App mark ideas | Mock them up before settling |

Still open: the band shape (D11), the app marks (section 7), the retuned colour values (4.2) and the exact type sizes (5.1).
All four are on the mockup canvas "STKY look mockups" (https://claude.ai/artifact/YDz11YGa9iKqPgNNNcoWrP), waiting on Starky.
