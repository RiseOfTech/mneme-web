# Design refresh — spec

## Goal

Adopt the approved design across the whole app: a warm ground, the lens-ring motif, a proper list
and form treatment — and a new interaction for the image hint, **the card flip**.

Reference: `doc/design/mneme-design-reference.html`. It is extracted design-tool output — inline
styles, `sc-*` bindings, `{{ placeholders }}`, missing fonts. **Not runnable, never ported as-is.**
Read it for values, layout, and interaction. Where it conflicts with this spec, this spec wins.

**This slice changes behaviour**, unlike 006–008. The image hint stops being a blur and becomes a
flip. That is a product decision, approved by the product owner. It follows that:

- `PROJECT.md` is updated **in this same commit** — the reveal ladder it describes is changing.
- Existing tests that assert the blur behaviour **will legitimately change**. That is expected
  here, and only here, and only for the image hint. Every other test keeps its intent.

## The interaction change: flip, not blur

Today: the image sits below the word, blurred; tapping un-blurs it.

**New:** the card is a surface with two sides.

- **Front** — the word, with the lens rings behind it.
- **Back** — the card's image, filling the card.
- Tapping the card **toggles** between them, with the reference's `scaleX` squeeze
  (~`0.16s`) as the flip. The user can flip back to the word at will; this is a toggle, not a
  one-way reveal.
- A mono hint below the card names the action, and it is shown **only when the card has an
  image**.
- **A card with no image does not flip at all** — no toggle, no hint, no cursor change. The front
  is all there is.

The association and the translation are unchanged in behaviour: revealed on request, below the
card.

### `PROJECT.md` — update the reveal ladder

Step 2 currently reads: *"Hint 1 — the image (blurred). The card's image is shown blurred. If the
user is stuck, they tap it to un-blur."*

It becomes: **Hint 1 — the image. The card carries the user's image on its back; tapping the card
turns it over, and tapping again turns it back.** Keep the surrounding narrative (hints optional
and sequential, the grade unaffected by hint use) intact — none of that changes. Edit only what
the flip actually changes; do not rewrite the document.

## What is adopted

### Palette — replaces the cool one entirely

| Token | Value | Role |
|---|---|---|
| `--color-ground` | `#ECE7DE` | Page ground. Warm. |
| `--color-ink` | `#1B2430` | Text. |
| `--color-surface` | `rgba(255,255,255,0.5)` | Input / panel fill. |
| `--color-haze` | `#A69C89` | Eyebrow labels, secondary text, list translations. |
| `--color-haze-soft` | `#C9C0AF` | Dividers, the nav separator. |
| `--color-muted` | `#7A7266` | Secondary prose on state screens. |
| `--color-coating` | `#6C5CE0` | Interactive: focus, active nav, the solid ring. |
| `--color-flare` | `#D89A3E` | Reveal accents, the loading ring, the dashed ring. |
| `--color-warning` | `#B5792A` | Validation messages. |

Ink-alpha borders (`0.12` dividers, `0.18–0.2` panels, `0.32` underlined controls) and the card
back's paper tones (`#DAD3C6`, `#B9AF9C`, hatch at `rgba(166,156,137,0.35)`) become tokens too.
No raw `rgba()` in components.

**Radius is now allowed** — `12–14px` on buttons and inputs. This reverses slice 006's "no
radius".

### Type

- **Bodoni Moda** — the word (600), list row words (600/26px), form titles and state headings
  (**italic**, 34–38px).
- **Instrument Sans** — prose. Association **italic** 19px; translation 500/32px.
- **IBM Plex Mono** — every small label and control, uppercase, letterspaced `0.1–0.14em`.

Add any missing weight or the italic face through the existing `@fontsource` packages only.

### Texture and motif

- Fixed full-viewport **noise overlay** (the reference's inline SVG turbulence),
  `mix-blend-mode: soft-light`, `opacity: 0.5`, `pointer-events: none`.
- **Lens rings behind the word** on the card front: a solid coating circle at low alpha rotated
  `-4deg`, a dashed flare circle rotated `6deg`. Absolutely positioned, `pointer-events: none`,
  and **they must not affect layout**.

### Session screen

- Card position eyebrow above the card: `CARD {n} OF {m}` — mono, haze. Derived from the
  composable's existing `index` and `cards`; no new state, no new API call.
- The card: `360px` wide, `max-width: 78vw`, `250px` tall.
- Eyebrows `ASSOCIATION` / `TRANSLATION` above the revealed content.
- Hint controls (`SHOW ASSOCIATION`, `SHOW ANSWER`): mono, ink-alpha underline, hover widens the
  letterspacing.
- **Grade actions**: both bordered, radius, identical weight, `INCORRECT` first. The design
  already respects the honesty rule — neither may become primary.
- Reveal motion: the reference's `softIn` (opacity + blur + lift). This **supersedes** slice 006's
  "resolve from blur, never fade" rule. Use one shared keyframe, driven by the existing motion
  tokens.
- **Empty**: italic Bodoni heading, secondary prose, and a `GO TO CARDS` link to `/cards`.
- **Finished**: italic Bodoni heading plus a summary line derived from the session already in
  memory (e.g. how many cards were reviewed — `cards.length`), and a `REVIEW AGAIN` control that
  calls the composable's existing `load()`. No new operation.
- **Error**: italic Bodoni heading, a secondary line, a bordered `RETRY` calling `load()`.
- **Loading**: the pulsing flare ring (`flarePulse`) and a mono `FETCHING DUE CARDS…`.

### Cards list

- `N CARDS` count eyebrow, from the loaded list.
- Rows: word Bodoni 600/26px ink, translation Instrument Sans 17px haze, **baseline aligned**,
  `gap: 16px`, hairline rule under each. This is what fixes the old `SurroundОкружать` collision.
- `NEW CARD` as a bordered control below the list.

### Forms

- Italic Bodoni title; mono eyebrow above each field.
- Inputs: full width, `15px 18px`, radius `14px`, `--color-surface` fill, ink-alpha border; focus
  → coating border plus a soft coating ring. Never remove the focus indicator.
- Validation messages: mono, `--color-warning`, under the field.

## What is rejected

1. **The demo state switcher** (`LOADING / EMPTY / ERROR` pinned bottom-right). Design-tool
   scaffolding for previewing states. It must not ship.
2. **The `USER'S PHOTO` placeholder** on the card back — that is the reference standing in for
   real data. The back shows the card's actual image. Keep the reference's hatched paper
   treatment as the backing **behind** the image (it shows through where the image does not
   cover), not instead of it.
3. Any inline `style=`, `sc-*` attribute, or `{{ placeholder }}` from the reference.

## Out of scope

- No behaviour change **beyond the flip** and the three derived additions named above (position
  eyebrow, review-again, finished summary). No new API calls, no new routes, no composable
  changes.
- No `visibility` UI, no Leitner box, no due date.
- No new dependencies beyond `@fontsource` faces already installed.
- No dark mode, no icons, no CSS framework, no animation library.
- Do not change any composable, the API client, or the router.
- Do not delete or rewrite files outside those this spec names.

## Acceptance criteria

1. `npm run build`, `npm run lint`, `npx vitest run` — all green (vitest non-interactively).
2. **Only the image-hint tests change.** Every other existing test passes with its intent intact.
   Repair selectors if markup moved; never weaken an assertion elsewhere.
3. Tapping a card with an image turns it over to the image, and tapping again turns it back.
   (Manual check.)
4. **A card with no image does not flip** — no hint, no cursor change, no toggle. (Manual check
   and test.)
5. **The word does not move** when the association, the answer, or the grade actions appear, on
   cards with and without an image. The rings do not shift it. The invariant from slice 007
   survives. (Manual check.)
6. Every colour, font, radius, duration, and spacing value in `.vue` files comes from a token.
   A grep for hex and for `rgba(` in `.vue` files returns nothing.
7. The rings and the noise overlay are `pointer-events: none` and intercept no clicks.
8. `prefers-reduced-motion: reduce`: the flip squeeze, `softIn`, and `flarePulse` are all
   neutralised, and end states are identical.
9. At 360px nothing overflows; the card, the rings, and the word all fit.
10. Keyboard: every control reachable with a visible focus ring — **including the card itself**,
    which is now interactive and must be a real `<button>` with an accessible name, not a
    `div` with a click handler.
11. `REVIEW AGAIN` re-runs the session load; `CARD n OF m` tracks the real position.
12. No demo state switcher ships.
13. `PROJECT.md` and `ARCHITECTURE.md` are updated in this same commit: the reveal ladder (flip,
    not blur), the palette, the radius reversal, the ring motif, and the retirement of the
    "resolve from blur, never fade" signature.

## Tests

- Update the image-hint tests in `ReviewCard.spec.ts` to the flip: front shows the word; tapping
  shows the image; tapping again returns to the word; **a card with no `imageUrl` does not flip
  and renders no image**.
- Every other test keeps its intent. If one breaks for a reason other than the flip, that is a
  signal the slice overstepped — stop and report.
- No visual or snapshot tests.

## Notes

- Suggested order: tokens (the palette swap touches everything) → suite green → `App.vue` shell +
  noise → `ReviewCard` (flip, rings, eyebrows) + its tests → `SessionView` states → `CardsView` →
  forms → `PROJECT.md` and `ARCHITECTURE.md`.
- The palette swap is the riskiest step: contrast changes everywhere at once. `--color-haze` on
  `--color-ground` is the pairing most likely to fall short — check it by eye and darken the
  token rather than shipping something unreadable.
- The rings must be absolute, centred, `pointer-events: none`. If the word shifts by a pixel when
  they render, they are in the flow.
- The card is now a control. Do not fake it with a `div` and a click handler — a real `<button>`
  gets keyboard, focus, and semantics for free.
- Follow `AGENTS.md`. Branch `feat/design-refresh`, one commit, Conventional Commits, do not push.
  Check `git status` before committing.