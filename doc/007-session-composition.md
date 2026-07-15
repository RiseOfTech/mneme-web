# Session composition — spec

## Goal

Slice 006 gave the app a palette, a type system, and the blur language. It did not give the
session screen a **composition**: elements sit where they landed, spacing is arbitrary, the word
shifts as hints are revealed, the image reads as a smudge rather than a photo out of focus, and
the grade actions do not read as controls.

This slice designs the session screen properly. Same direction, same tokens — structure, rhythm,
and affordance.

**No behaviour changes.** No new state, props, or emits. Every existing test must pass with its
intent intact. If a style needs logic to change, stop and ask.

## The problems being fixed

1. **The word moves.** The screen is a centred column, so revealing a hint pushes the word up.
   The hero of the screen must be fixed: a card's word lands in one place and stays there for the
   whole card, no matter how many hints get revealed.
2. **The image is a smudge.** A 16px blur on a small unframed element destroys the object — no
   edges, no proportion, no sign it is a photograph. "Out of focus" only reads when the thing is
   legibly a *thing*.
3. **The grade actions look like text.** No frame, no press affordance, and the 400/500 weight
   distinction is invisible.
4. **No vertical rhythm.** Gaps are arbitrary rather than drawn from the space scale.

## In scope — `src/components/ReviewCard.vue`

### Fixed vertical grid

Lay the card out as a **CSS grid with defined rows**, not a flowing centred column:

```
┌──────────────────────────┐
│                          │  (space above — fixed)
│        Surround          │  WORD — fixed row, optical centre
│                          │
│    ┌────────────┐        │  HINT ROW — reserved height,
│    │ ░░░░░░░░░░ │        │  present whether or not the
│    └────────────┘        │  image is revealed
│      TAP TO FOCUS        │
│                          │
│   association prose      │  ASSOCIATION — reserved height
│                          │
│        Окружать          │  ANSWER — reserved height
│                          │
│   [INCORRECT] [CORRECT]  │  GRADE — reserved height
└──────────────────────────┘
```

- **The word's position is identical before and after any reveal.** Reserve the space that
  hints will occupy with fixed row heights (`grid-template-rows` with explicit values or
  `min-height` per zone). Revealing content must not reflow anything above it.
- A card **without** an image reserves the image row too — the word must sit at the same height
  on every card, image or not. (The panel itself is absent; the space is not.)
- Every gap comes from the space scale. No arbitrary values.

### The image panel

- **Fixed aspect ratio** (`aspect-ratio: 4 / 3`), a defined width (~`280–320px`, `max-width: 100%`),
  `object-fit: cover`.
- A **hairline border** in `--color-haze` and a `--color-surface` backing, so the panel reads as a
  framed photograph whether or not it is resolved. No border radius, no shadow.
- **Blur must be proportional to the panel**, not a fixed 16px on an arbitrary size. Tune it so
  the unresolved image reads as *a photograph you cannot make out* — shapes and colour masses
  survive, detail does not. Judge it by eye against a real photo; the current value is too strong
  for the panel size.
- **Caption below the panel**, utility face, small, `--color-haze`: `TAP TO FOCUS` while
  unresolved. Once resolved, the caption is gone. It uses the existing `imageRevealed` ref — no
  new state.
- The panel is wrapped in the real `<button>` from slice 006. Keep the `blurred` class on the
  `<img>` (an existing test selects on it).

### Reveal hierarchy

The screen has one hero and one payoff. Right now everything after the word is the same quiet
grey murmur.

- **Word** — display face, unchanged, the largest thing by far.
- **Association** — the user's own prose. Body face, a real reading size (`--text-lg`-ish), a
  comfortable measure (~`45ch` max), `--color-ink` once resolved. It is a note the user wrote to
  themselves, not a caption.
- **Answer (translation)** — the payoff, and the second-largest thing on the screen. Body face,
  large. This is where `--color-flare` still lives, and nowhere else.
- **Hint affordances** (`Show association`, `Show answer`) — utility face, small, letterspaced,
  `--color-haze` at rest, `--color-coating` on hover/focus. Give each a hairline rule so it reads
  as a control, not a stray label. They must never compete with the word.

### Grade actions

- Both are **bordered boxes**: `1px` `--color-ink` border, no radius, generous padding, utility
  face, uppercase, letterspaced.
- **Both carry identical visual weight.** Do not make `Correct` primary — no fill, no accent, no
  heavier weight, no larger size. The grade is a self-assessment, and `PROJECT.md` puts the
  honesty of it on the user; an interface that nudges toward `Correct` corrupts the Leitner data
  it feeds. They differ by label only.
- Hover/focus: border → `--color-coating`. Disabled while `grading`: border and text →
  `--color-haze`, `cursor: not-allowed`.
- Remove the 400/500 weight distinction from slice 006 — it was invisible and it implied a
  hierarchy that should not exist.

### `src/views/SessionView.vue`

- Only what the composition needs: the card is centred in the content column, with vertical
  placement consistent with the grid above. State messages stay as they are.

## Out of scope

- **No behaviour change.** No new state, props, emits, or logic. No template restructuring beyond
  what layout requires.
- No styling of `CardsView`, `NewCardView`, `EditCardView`, `CardForm` — that is the next slice,
  including the missing separator that currently renders rows as `SurroundОкружать`.
- No new tokens beyond what the composition genuinely needs (a row-height or measure token is
  fine; new colours are not).
- No changes to the palette, the type roles, or the reveal-from-blur language. They are settled.
- No dark mode, no theme switcher, no icon set, no animation library, no CSS framework.
- No page-load choreography, no scroll effects, no ambient motion.
- No showing the Leitner box or due date.
- No new dependencies.
- Do not change any composable, the API client, or the router.
- Do not delete or rewrite files outside those this spec names.

## Acceptance criteria

1. `npm run build`, `npm run lint`, and `npx vitest run` are all green (vitest
   non-interactively).
2. **Every existing test passes with its intent unchanged.** Repair a selector if markup moved;
   never weaken an assertion. If an assertion's intent must change, stop — the slice has
   overstepped.
3. **The word does not move.** Reveal the image, then the association, then the answer: the
   word's position on screen is pixel-identical throughout. Verify on a card **with** an image
   and a card **without** one — the word sits at the same height on both. (Manual check.)
4. The unresolved image reads as a framed photograph out of focus, not as a light smudge. (Manual
   check — the point of the slice.)
5. `TAP TO FOCUS` shows only while the image is unresolved.
6. Both grade actions are visibly controls, are visually equal to each other, and neither is
   styled as primary. (`grep`: no fill/accent applied to one and not the other.)
7. `--color-flare` still appears in exactly one place — the answer's resolve. (`grep`.)
8. No hex value, font stack, duration, or spacing literal in `.vue` files — tokens only. (`grep`
   for hex returns nothing.)
9. Reveals still use blur, never opacity or `display: none`.
10. `prefers-reduced-motion: reduce` still makes reveals instant with identical end state.
11. At 360px: nothing overflows, the word stays legible, the image panel fits, and the word still
    does not move on reveal.
12. Keyboard: every control (image button, both hint controls, both grade actions) is reachable
    and shows a visible focus ring.

## Tests

No visual or snapshot tests. The existing suite guards behaviour; behaviour must not move. Run it
after each file.

## Notes

- The single highest-value change is the fixed grid. Do that first and look at it before touching
  anything else — much of the "roughness" is the word drifting and the gaps being arbitrary.
- Tune the blur by eye at the real panel size. This is a judgement call, not a number to copy:
  too little and it is readable, too much and it is a smudge. The target is "clearly a photo,
  unreadable".
- Reserving space for hints means the screen looks emptier before reveals than a flowing layout
  would. That is intended: the void is where the recall happens.
- Follow `AGENTS.md`. Branch `feat/session-composition`, one commit, Conventional Commits, do not
  push.