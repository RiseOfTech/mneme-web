# Cards list + forms styling — spec

## Goal

Apply the established visual language to the last unstyled surfaces: the cards list and the
create/edit forms. After this slice the whole app is designed.

The palette, type roles, blur language, and tokens are settled in `ARCHITECTURE.md` / slices
006–007. This slice **uses** them; it does not revisit them.

**No behaviour changes.** No new state, props, or emits. Every existing test must pass with its
intent intact. If a style needs logic to change, stop and ask.

## Defects being fixed (not just styling)

1. **Rows render as `SurroundОкружать`.** `word` and `translation` are adjacent spans with no
   separator. Genuinely unreadable — the list's core job fails.
2. **Form labels collide with inputs.** Labels and controls are inline with no layout, so they
   overlap and stagger.
3. **A failed delete shows its error next to Save.** `submitError` is shared by both mutations,
   and `CardForm` renders it. Give `EditCardView` its own error slot for the delete action so the
   message appears where the action is. Do not render the same ref twice — only one place shows
   it at a time.

## In scope

### `src/views/CardsView.vue`

- **Row:** `word` in `--color-ink`, `translation` in `--color-haze`, clearly separated — a gap
  plus a distinct treatment, not a bullet-and-glue. Word is the anchor; the translation is
  secondary. No `<ul>` bullets.
- Left-aligned in the content column, not centred. A list is scanned, not admired.
- Rows are links (unchanged): whole-row target, a hairline rule between rows, hover/focus →
  `--color-coating`. Visible focus ring.
- **"New card"** reads as the page's primary action, not a stray link: utility face, bordered box
  like the grade actions. Present in both `ready` and `empty` states.
- State messages (loading / empty / error) match `SessionView`'s treatment: utility face, quiet.
  Retry is a real button.

### `src/components/CardForm.vue`

- **Labels above their controls**, never inline. Utility face, small, letterspaced,
  `--color-haze`.
- Inputs and the textarea: `--color-surface` background, hairline `--color-haze` border, no
  radius, generous padding, body face at a real reading size. Focus → `--color-coating` border
  plus the focus ring.
- The textarea (association) gets real height (~4 rows) and a comfortable measure — it holds the
  user's own prose.
- Field validation messages sit under their field, utility face, small. They must be legible
  without colour alone carrying the meaning.
- Form-level `submitError` sits directly above the submit action.
- The submit button matches the app's button treatment (bordered box, utility face).
- The form is a single column with rhythm from the space scale. Max width — a form is not a
  billboard.

### `src/views/NewCardView.vue` / `src/views/EditCardView.vue`

- A page heading in the display face — the only other place display is allowed besides the word
  under test. Small; it is a label, not a hero.
- Cancel: quiet, utility face, clearly secondary to the submit action.
- **Delete (`EditCardView`)**: visually separated from Save/Cancel — its own zone, below, past a
  hairline rule. It is destructive and must not sit shoulder-to-shoulder with Save.
    - The two-step confirm (unchanged behaviour) reads as a deliberate stop: the prompt in body
      face, `Confirm` and `Cancel` as bordered controls.
    - The delete-related error renders **here**, not inside `CardForm`.
- Loading / not-found / error states: same treatment as elsewhere.

## Out of scope

- No behaviour change. No new state, props, emits, or logic. No new routes.
- No `visibility` UI. No Leitner box or due date.
- No changes to the palette, type roles, blur language, or the session screen.
- No dark mode, no icons, no CSS framework, no animation library.
- No new dependencies. No new tokens unless the layout genuinely needs one (no new colours).
- No inline row actions, no search, sort, filter, or pagination.
- No dirty-state guard.
- Do not change any composable, the API client, or the router.
- Do not delete or rewrite files outside those this spec names.

## Acceptance criteria

1. `npm run build`, `npm run lint`, `npx vitest run` — all green (vitest non-interactively).
2. Every existing test passes with its intent unchanged. Repair selectors if markup moved; never
   weaken an assertion.
3. Rows read as word and translation, plainly separated — `SurroundОкружать` is gone.
4. Every form label sits above its control; nothing overlaps at any width.
5. A failed delete shows its error next to the delete action, not next to Save. The same message
   never renders twice at once. (Manual check with the core stopped.)
6. Create, edit, and delete all still work end to end. (Manual check.)
7. No hex value, font stack, duration, or spacing literal in `.vue` files. (`grep` for hex →
   nothing.)
8. `--color-flare` is still used in exactly one place — the session answer's resolve. It must not
   leak into forms or the list. (`grep`.)
9. Display face appears only on the word under test and the two page headings. (`grep`.)
10. At 360px nothing overflows; inputs are usable and legible.
11. Keyboard: every control reachable, visible focus ring, and the list is navigable by Tab.

## Tests

No visual or snapshot tests. The existing suite guards behaviour. Run it after each file.

## Notes

- The list is the one screen that is scanned rather than read. Optimise for finding a word fast:
  alignment, rhythm, and contrast between word and translation do that — decoration does not.
- Forms should feel calm. Most of the work is space and alignment, not styling the controls.
- Follow `AGENTS.md`. Branch `feat/cards-forms-styling`, one commit, Conventional Commits, do not
  push. **Stage the spec file with real content before committing** — check `git status`.