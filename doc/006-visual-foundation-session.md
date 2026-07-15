# Visual foundation + session screen — spec

## Goal

Give the app a visual language and prove it on the session screen — the product's heart and its
only screen with real interaction design.

This slice establishes the system (tokens, type, shell) and applies it to `App.vue`,
`SessionView`, and `ReviewCard`. The cards list and the forms are **left unstyled** for now;
they inherit the ground and type but get no layout work. That is expected, not an oversight —
they are the next slice.

**No behaviour changes.** Not one. This slice touches how things look, never what they do. If a
component's logic needs to change to accommodate a style, stop and ask — that is a sign the
design is wrong, not the code.

## Design direction — "focus"

Recall is bringing something into focus. The material world this borrows from is **optics**: the
ground glass of a viewfinder, engraved scales on a lens barrel, lens coating, flare.

### Colour — 5 tokens, no more

| Token | Value | Role |
|---|---|---|
| `--color-glass` | `#E7EBEF` | Page ground. Cool, milky — ground glass, not paper. |
| `--color-ink` | `#16202B` | Text. A deep blue-black; never pure black. |
| `--color-haze` | `#9AA7B4` | Everything hidden, secondary, or at rest. |
| `--color-coating` | `#5B4BC4` | Lens-coating violet. Interactive things only. |
| `--color-flare` | `#E0A63C` | Warm amber. **The reveal moment only** — nowhere else. |

Surfaces lighter than the ground use `--color-surface` (`#F7F9FA`). That is the whole palette.
Do not add greys, tints, or shades beyond these; derive with `color-mix()` if a variant is truly
needed.

**Correct / Incorrect are not colour-coded red/green.** They carry text labels; colour is not the
signal. Both use ink on surface, distinguished by weight and position. This avoids the traffic-
light cliché and is legible regardless of colour vision.

### Type — 3 roles

- **Display — Bodoni Moda.** A didone: sharp stroke contrast, the feel of an engraved lens
  barrel. Used for **the word under test and nothing else.**
- **Body — Instrument Sans.** Quiet grotesque. The association is the user's own voice; the type
  must not perform.
- **Utility — IBM Plex Mono.** Small labels, letterspaced, uppercase — scale markings on an
  instrument. Nav, hint affordances, state messages.

Self-host via `@fontsource` packages (variable versions where they exist). **Confirm the exact
package names and import paths against npm before adding them** — do not assume. No external
font CDN.

Set a type scale in tokens (`--text-xs` … `--text-display`). The word under test is enormous —
it is the screen's only hero. Everything else is small and quiet.

### The signature — resolve, never fade

**Nothing in this app appears by opacity. Everything resolves from blur.**

The image, the association, the translation: each arrives out of focus and sharpens. Hidden is
not absent — it is unfocused. The blur that already exists on the image stops being a trick of
one element and becomes the grammar of the interface.

- Hidden state: `filter: blur(…)` plus `--color-haze`, not `opacity: 0` and not `display: none`.
  The thing is *there*, unresolved.
- Revealing: blur → `0`, with a small scale settle (~`1.02` → `1`) and colour → `--color-ink`.
  One transition, ~350–450ms, the same easing everywhere.
- `--color-flare` appears for a moment on resolve, then recedes. It is the only warm thing on the
  screen and it must stay rare.

Spend the boldness here. Everything else — ground, chrome, nav — stays quiet and disciplined. No
shadows-as-decoration, no gradients, no rounded-corner card look, no icon set.

**Accessibility is not optional here.** Under `prefers-reduced-motion: reduce`, the blur
transition becomes an instant state change — no animation, no scale. The revealed content must
be identical either way.

### Layout — session

The word alone in a nearly empty field, vertically centred. Affordances sit low and quiet, out of
the reading path. The image, when present, is a defined panel — not a full-bleed backdrop (a card
may have no image, and the layout must not depend on one).

```
┌──────────────────────────┐
│  REVIEW · CARDS          │  mono, letterspaced, top
│                          │
│                          │
│        Gedächtnis        │  Bodoni, enormous, alone
│                          │
│    ┌────────────┐        │
│    │ ░░░░░░░░░░ │        │  image panel, unresolved
│    └────────────┘        │
│                          │
│  SHOW ASSOCIATION        │  mono, quiet
│  SHOW ANSWER             │
└──────────────────────────┘
```

## In scope

### Tokens & base

- `src/assets/tokens.css` — every colour, type, space, and motion token as CSS custom properties
  on `:root`. **The single source.** No hex value, font stack, or duration appears anywhere else
  in the codebase.
- `src/assets/base.css` — a minimal reset, `@fontsource` imports, element defaults (ground, ink,
  body font, `box-sizing`), and a **visible keyboard focus style** using `--color-coating` and
  `:focus-visible`. Never remove focus outlines.
- Imported once in `src/main.ts`. Check what the scaffold already ships in `src/assets/` and
  replace it rather than layering on top.
- Everything else stays in `<style scoped>` in its own component, referencing tokens only.

### `src/App.vue`

- The shell: nav as small mono labels, letterspaced, uppercase. Active route marked with
  `--color-coating`; inactive `--color-haze`. No box, no bar, no shadow.
- A content column with a sane max width, centred, breathing room.

### `src/views/SessionView.vue`

- State messages (loading, empty, finished, error) in the utility face — quiet, centred, not
  shouting. Retry is a real button, styled as an interactive thing.
- Copy review, in the interface's voice: no apologies, no vagueness. An empty session is an
  invitation ("Nothing due. Come back later." — or better), not an error.

### `src/components/ReviewCard.vue`

The screen's whole reason to exist.

- Word: display face, enormous, centred, alone.
- Image panel: present only when the card has one. Unresolved by default (`blur`), tap resolves
  it. It must be obvious it is *tappable* and that something is *behind* the blur.
- Association: arrives resolved-from-blur when revealed. Body face, comfortable measure — it is
  the user's own prose and should read like it.
- Translation: the resolution. The moment `--color-flare` exists for.
- Hint affordances: utility face, small, low, quiet. They must not compete with the word.
- Grade actions: appear once the answer is revealed. Text labels, no colour coding, clearly
  disabled while `grading`.

### Quality floor

- Works down to a phone-width viewport (~360px). The word scales; nothing overflows.
- Visible keyboard focus on every interactive element.
- `prefers-reduced-motion: reduce` respected.
- Sufficient contrast for body text on the ground.

## Out of scope

- **No behaviour change.** No new state, no new props/emits, no logic edits, no template
  restructuring beyond what styling requires.
- No styling of `CardsView`, `NewCardView`, `EditCardView`, or `CardForm` — next slice.
- No dark mode, no theme switcher.
- No CSS framework, no Tailwind, no component library, no icon library.
- No CSS preprocessor. Plain CSS with custom properties.
- No showing the Leitner box number or due date — the session screen shows what it shows today.
  (Real data, arguably worth surfacing, but that is a **product** decision for `PROJECT.md`, not
  a styling slice.)
- No reversed-direction quizzing, no settings, no stats.
- No animation library. Plain CSS transitions.
- No page-load choreography, no scroll effects, no ambient motion. One transition, used
  consistently.
- No new dependencies beyond the `@fontsource` packages this spec names.
- Do not change `useReviewSession`, `useCards`, the API client, the router, or any composable.
- Do not delete or rewrite files outside those this spec names.

## Acceptance criteria

1. `npm run build`, `npm run lint`, and `npx vitest run` are all green (vitest
   non-interactively).
2. **Every existing test passes unchanged.** This slice must not alter behaviour, so it must not
   need a behavioural test rewritten. If a test breaks because a selector moved, fix the
   selector — never the assertion's intent. If an assertion's *intent* has to change, stop: the
   slice has overstepped.
3. The full session flow still works end to end: load, reveal image, reveal association, reveal
   answer, grade, advance, finish. (Manual check.)
4. Every colour, font, duration, and spacing value in `.vue` files comes from a token. `grep -rn
   "#[0-9a-fA-F]\{3,6\}" src --include=*.vue` returns nothing.
5. Revealing uses blur, not opacity: no `opacity: 0` → `1` reveal transitions, no `display: none`
   for hidden-but-revealable content.
6. With `prefers-reduced-motion: reduce`, revealing is instant and the resulting content is
   identical. (Manual check — emulate in DevTools.)
7. Every interactive element shows a visible focus ring on keyboard navigation. The session is
   fully operable by keyboard alone. (Manual check.)
8. At 360px width nothing overflows horizontally and the word remains legible. (Manual check.)
9. `--color-flare` is used in exactly one place — the reveal. (`grep`.)
10. No new dependency beyond the `@fontsource` packages.

## Tests

No visual regression tests, no snapshot tests — they are noise at this scale and this slice adds
no behaviour to test.

The existing suite is the guard: it asserts behaviour, and behaviour must not move. Run it after
each file. If a query breaks because markup changed, repair the query and keep what it asserts.

## Notes

- Suggested order: tokens + base + fonts (verify the app still renders) → `App.vue` shell →
  `SessionView` states → `ReviewCard`. Type-check and run the suite after each.
- Watch CSS specificity: it is easy to write component styles that fight the base layer or each
  other. Scoped styles plus tokens should mean almost no cascade conflicts — if you find yourself
  reaching for `!important`, something is wrong upstream.
- Copy is design material. Where a state message is currently placeholder-ish, improve it: plain
  verbs, sentence case, active voice, no apologising. An action keeps its name through the flow.
- Follow `AGENTS.md`. Branch `feat/visual-foundation`, one commit, Conventional Commits, do not
  push.