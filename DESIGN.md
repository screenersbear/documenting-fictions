# STKY Design Rulebook

STKY is Starky's app suite. For now that means Documenting Fictions: the shelf, Ref, The Eye, Contact Sheet and Overthoughts.
This file is how every one of them should look. Read it before any change you can see.

**Status: draft, 2026-11-13.** Each rule is marked:

- **Settled**: already live in the suite, or decided by Starky. Follow it.
- **Proposed**: drawn from the reference board, waiting on Starky's answers (see *Open decisions* at the end). Don't build it yet.

---

## 1. The look in one paragraph

Mid-century Swiss modernism, rebuilt as a kit of parts. Flat shapes of colour (circles, halves, quarters, rings, triangles,
stripes, notched tags) sit on plain paper, held in place by thin black lines and small, quiet type. Every app, section and
state gets its own mark, built from the same parts by the same rules, and laid out like a specimen sheet: the object, then a
short caption under it. The shapes and colours are playful. The system behind them is strict.

## 2. The reference board

| # | Reference | What we take from it |
|---|---|---|
| 1 | 1960 New Year card, Walter Marti-Süess, Luzern | Numbers built from dots and thin black strokes. Big empty paper. Tiny left-aligned grotesk text in a corner. |
| 2 | Grid of split circles labelled −12.00 to +06.00 | One grammar, endless variations: every circle is halves, quarters, rings and dots. A wide palette of brights and pale tints. Small spaced numeric labels under each. |
| 3 | Blue/teal icon pairs (solid glyph over a layered version) | Two tiers of icon: a small solid UI glyph, and a big expressive version of the same idea. Overlapping translucent layers. |
| 4 | Surforma product patterns | Black-and-white progressions (stripes thinning, dots shrinking, checks getting smaller) as identities. A specimen grid: pattern, brand line, light name. |
| 5 | Unfolded paper cube | Flat orange, green, black and cream faces. Paper grain. A physical, printed object. |
| 6 | Three outlined glyphs (play, list, four-lobe) | Thick, even strokes with round ends. One colour per glyph. |
| 7 | Notched tags in frames (crimson/cream, black/chartreuse, cobalt/pink) | Rounded frames with arrow-notched shapes inside. Bold two-colour pairings. Wayfinding. |

## 3. Principles

1. **Built, not drawn.** Every mark is made of a few primitives (section 6) placed on a grid. No freehand drawing, no
   illustration styles, no stock art.
2. **One grammar, many variations.** Same parts, different arrangement and colour. A new screen gets a new variation, never a
   new style.
3. **Flat colour on paper.** Solid fills. Colour does the loud work. *(Proposed exception: the glass tier, decision D5.)*
4. **Quiet type.** Text is small, calm and left-aligned, like a caption on a specimen sheet. The shapes are the heroes.
   *(How quiet the headers get is decision D4.)*
5. **Space is a material.** Plenty of empty paper. Objects float on a plain ground with even gutters.
6. **Rhythm shows order.** Progressions (bars getting thinner, dots getting smaller) stand for sequence, time, progress and
   depth.
7. **A thin line is structure.** A hairline in black joins, points or measures. It's the only element that isn't a filled
   shape.
8. **Same everywhere.** Whatever can be the same across the apps is the same: parts, colours, words, behaviour
   (Settled, Starky 11-12).

## 4. Colour

### 4.1 The notebook colours (Settled)

Each notebook has an app colour, picked in its Options. These are the live values (shelf `home.js`):

| Token | Hex | Text on it |
|---|---|---|
| `orange` | `#EC701E` | white, large text only |
| `mango` | `#FFD100` | berry blade black |
| `berry` | `#BF0B83` | white |
| `fern` | `#2E7A55` | white |
| `ocean` | `#245CAA` | white |
| `leaf` | `#2F9A55` | white |
| `ink` | `#313D45` | white or mango |

### 4.2 Neutrals

| Token | Hex | Use | Status |
|---|---|---|---|
| `text` (berry blade black) | `#313D45` | all text | Settled (D2 asks if it becomes true black) |
| `dim` | `#5C666D` | captions, labels | Settled |
| `line` | `#D6DADD` | dividers | Settled |
| `white` | `#FFFFFF` | page ground | Settled (D1 asks about paper) |
| `paper` | `#F2EFE6` | warm off-white ground, from refs 1, 5, 7 | Proposed |
| `black` | `#111111` | hairlines, dark anchors in marks | Proposed |

### 4.3 Mark colours (Proposed)

Taken from the references. They're for marks, patterns and illustrations only. Chrome keeps using the notebook colours.

| Brights | Hex | | Tints | Hex |
|---|---|---|---|---|
| `cobalt` | `#0A4FD6` | | `lavender` | `#F1E5F5` |
| `sky` | `#0596FF` | | `periwinkle` | `#CCD9FA` |
| `vermilion` | `#F2401F` | | `peach` | `#FEE3D7` |
| `chartreuse` | `#E2E600` | | `sage` | `#CDD1C1` |
| `crimson` | `#A1062A` | | `salmon` | `#FFAFAB` |
| `orchid` | `#E675C9` | | | |
| `teal` | `#14BFA0` | | | |
| `forest` | `#2C5E3C` | | | |
| `amber` | `#F7A52B` | | | |

### 4.4 Colour rules

- A mark uses **at most three colours plus the ground**, and the black hairline. (Settled for marks once D3 is answered.)
- A tint is only ever the light partner of a bright, never on its own as a mark.
- Pairs that work, straight from the board: crimson + cream, black + chartreuse, cobalt + salmon, orange + green,
  sky + peach, forest + teal.
- Text on colour follows the tables above. White on orange, mango, chartreuse, amber, salmon or any tint is not allowed for
  small text.
- Colour is never the only signal: a state also changes shape, word or position.
- Photos are never tinted, filtered or covered by the interface. Contact Sheet and The Eye are photo tools.

## 5. Type

### 5.1 What's live (Settled)

| Level | Font | Size | Use |
|---|---|---|---|
| 1 Band title | Archivo Black, capitals, `.02em` | 24px (Contact Sheet 21px) | the title in the top band |
| 2 Section / sheet title | Archivo Black, capitals | 18px | page sections, sheet and modal titles |
| 3 Label | Figtree 600, capitals, `.08em`, dim | 15px | field labels, months, groups |
| Body | Figtree 400 | 16–19px | everything else |
| Hand | Klee One | — | the shelf's book tabs, Ref's board pages (D9) |

- Headers are always capitals. They're not always heavy: the level decides the weight.
- Names you wrote stay as you wrote them (shoot titles, chapter names).
- No boxes, borders or bars around headings.
- Words: a photo is a "shot", never a "frame".

### 5.2 Proposed

- **Captions under objects**, specimen style (refs 2 and 4): a small spaced line, then the name. For example `THE EYE` over
  `Overview`, or `−02.50` under a circle.
- **Numbers**: tabular figures, spaced (`font-variant-numeric: tabular-nums`, `.06em`), so counts and dates line up.
- **Left-aligned** text everywhere except the band title (D10 asks whether band titles go left too).
- **Wordmark**: `STKY` in capitals, Archivo Black. A product line next to it in Figtree Light, the way Surforma pairs a bold
  and a light word: **STKY** Documenting Fictions.

## 6. The shape kit (Proposed)

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
| Hairline | 1px black (at any size), only at 0°, 45° or 90° |

Building rules:

- Shapes inside a mark touch exactly, with no gaps and no overlaps (except in the glass tier).
- Marks in a row or grid share one size and one gutter (one third of the mark's width).
- A dark anchor (black, ink, forest or cobalt) is optional, at most one per mark.
- Keep corners consistent within a mark: all square, or all at radius 2.

## 7. Marks (Proposed)

The same kit makes every identity in the suite:

| Thing | Idea for its mark (to confirm, D8) |
|---|---|
| STKY / the shelf | four quarters, one in each notebook's colour |
| Ref | a square cut into a 2 × 2 board |
| The Eye | a ring with a dot: an eye |
| Contact Sheet | three bars side by side: a strip of shots |
| Overthoughts | the four-lobe shape (ref 6): a thought |
| Sections (tabs) | a circle variation in the notebook's colours, one per section, like ref 2 |
| Empty states | the section's mark, big, with one line under it |
| Progress and loading | a progression: bars or dots filling in order |

## 8. Icons

- **Tier 1: UI glyphs.** These are the buttons and the bar. 24-unit grid, round caps and joins, one colour (text, or the
  app colour when active). Settled: stroked line icons. Proposed: one stroke weight for every app, 2 units (today they range
  1.6–2.2, D6).
- **Tier 2: marks.** The expressive version of the same idea, built from the shape kit (section 6). Flat, or glass (D5).
- A glyph and its mark stand for the same idea and keep the same silhouette where they can (ref 3).

## 9. Layout

- **Phone first.** 16px side gutter. Nothing scrolls sideways.
- **The band (Settled):** a band of colour across the top. The Eye's is berry blade black with a mango title; the others are
  in their app colour with a white title (berry blade black on mango). D11 asks about notched tags for it.
- **Specimen grid (Proposed):** a list of things shown as objects is a grid of equal tiles: object, caption line, name, all
  left-aligned (refs 2, 3, 4).
- **Plain pages once a notebook is open (Settled):** no paper lines, no paper colour, no stitching. The 3D notebooks only live
  on the shelf.

## 10. Motion

- Parts move like pieces of card: halves slide along their cut, quarters turn a quarter turn, rings grow from the centre.
- 180–320ms, `cubic-bezier(.4, 0, .2, 1)`, the shelf's curve. No bounce.
- Turn it all off for `prefers-reduced-motion`.
- The shelf's 3D turntable and its float stay as they are (Settled).

## 11. Texture (Proposed, D7)

- A faint paper grain (about 3%) on big flat areas of colour, like ref 5.
- Never on text, photos, icons, or anything under 48px.

## 12. Do and don't

**Do**

- Check this kit before making anything new. Reuse a part before adding one.
- Build marks from section 6, in at most three colours plus the ground.
- Keep text small, calm and left-aligned. Let shapes and colour be loud.
- Make the same thing the same way in every app.

**Don't**

- Add gradients or drop shadows to flat marks. The 3D notebooks on the shelf are the exception, and glass if D5 says yes.
- Use emoji, clip art or illustration in another style.
- Put boxes or bars around headings.
- Put white small text on light colours.
- Tint or filter the user's photos.
- Change something's look without being asked (Settled): keep what's there when adding to it.

## 13. Open decisions

Starky's answers turn these from Proposed to Settled.

- **D1 Ground:** warm paper `#F2EFE6`, or stay pure white?
- **D2 Black:** true black `#111` for text and lines, or keep berry blade black `#313D45`?
- **D3 Palette:** keep the six notebook colours as the core and use the reference colours only inside marks, or retune the
  notebook colours toward the references (cobalt, vermilion, chartreuse, pink)?
- **D4 Headers:** keep Archivo Black heavy capitals, or go quieter (Figtree Light names, small bold labels) so the shapes do
  the shouting?
- **D5 Glass:** the translucent blue/teal layers of ref 3: in (for big marks only) or out (everything flat)?
- **D6 Icon weight:** thicker round strokes like ref 6, or keep today's thinner lines?
- **D7 Grain:** paper texture on big colour areas, yes or no?
- **D8 Marks:** where they appear (app icons and the shelf only, or also tabs, empty states, loading, list tiles), and
  whether the ideas in section 7 are right.
- **D9 Handwriting:** keep Klee One for the personal bits (book tabs, Ref's pages), or retire it?
- **D10 Alignment:** band titles centred as now, or left-aligned like the Swiss references?
- **D11 Band shape:** straight bands as now, or notched tags and frames like ref 7?
