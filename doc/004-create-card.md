# Create card — spec

## Goal

Let the user add a card: a form at `/cards/new` that posts to `POST /v1/cards` and returns to
the list. This is the first slice that **writes** card data, and the first that involves a
form — form state, validation, and what happens after a successful submit.

Create only. Edit and delete are the next slice.

## Prerequisite — regenerate the API types

`doc/openapi.json` has been updated: `GET /v1/cards/{id}` and `PUT /v1/cards/{id}` now declare
their `200` responses, and `POST /v1/reviews/{cardId}` declares a `200` with a new
`ReviewResponseDto` schema.

**First step of this slice:** run `npm run generate:api` and commit the regenerated
`src/api/schema.d.ts`. Then run `npm run build` and `npx vitest run` to confirm nothing broke
(nothing should — `useReviewSession.grade` decides success from `response.ok`, not from `data`).
If something does break, stop and report rather than working around it.

## In scope

### `src/composables/useCards.ts` — add `create()`

`useCards` owns the caller's cards as a resource: reading **and** writing. Do not create a
separate composable for the mutation, and do not split the file.

- Add state: `submitting` (`boolean`), `submitError` (`string | null`). Expose both via
  `readonly()`, consistent with the existing state.
- Add `create(payload: CreateCardRequestDto): Promise<CardResponseDto | null>`:
    - Set `submitting = true`, clear `submitError`.
    - `POST /v1/cards` with the payload.
    - Success (`no error && response.ok`) → return the created card (`data ?? null`).
    - HTTP failure → set `submitError` to a user-facing message, return `null`.
    - Thrown failure → same, via `try/catch` (the slice-002 lesson — both paths, from the start).
    - Clear `submitting` in `finally`.
- Do not change `load()`, the existing state, or the exposed read API.
- Types come from `src/api/schema.d.ts`
  (`components['schemas']['CreateCardRequestDto']`, `['CardResponseDto']`). No hand-written
  shapes.

The list state and the form state are separate instances by design: `CardsView` and
`NewCardView` each call `useCards()` and get their own refs. They do not share, and must not —
after a successful create we navigate to `/cards`, which mounts `CardsView` and loads fresh
from the core. **Do not add a store, a shared instance, a module-level singleton, or an event
bus to "sync" them.**

### `src/views/NewCardView.vue`

The form lives directly in this view. **Do not extract a reusable `CardForm` component** — there
is exactly one use of it today. (Edit will be the second use; extraction happens then, not now.)

- Fields, bound with `v-model`:
    - **Word** — required.
    - **Translation** — required.
    - **Association** — required. A textarea (it is prose, not a word).
    - **Image URL** — optional, a plain text input. No upload, no preview, no URL validation
      beyond non-empty-if-present.
- **`visibility` is not on the form.** Omit it from the payload entirely; the core defaults it
  to `PRIVATE`. Do not add a control, a hidden field, or a default value client-side.
- **Client-side validation**, before any request:
    - The three required fields must be non-empty **after trimming**. Trim on submit; do not
      silently mutate what the user typed as they type.
    - Show a per-field message for each empty required field.
    - Do not submit while invalid.
- **Submit:**
    - Build the payload from the trimmed values. Omit `imageUrl` from the payload when it is
      empty after trimming — send no key rather than an empty string.
    - Call `create()`. On success (non-null), navigate to `/cards` (`router.push`). On failure,
      stay on the form, keep the entered values, and show `submitError` at form level.
    - Disable the submit button while `submitting` is true.
- **Cancel** — a link/button back to `/cards`. No confirmation dialog, no dirty-check.

### Routing

- Add route `/cards/new` → `NewCardView` (named `new-card`), eagerly imported, in the existing
  explicit route table. Keep it **before** the catch-all.
- Do not add a nav link for it in `App.vue` — the nav stays two links.

### `src/views/CardsView.vue`

- Add a single `<RouterLink to="/cards/new">` ("New card"). It must be reachable in **both** the
  `ready` and `empty` states — a user with no cards is exactly who needs it.
- No other change: rows stay non-clickable, still word and translation only.

## Out of scope

- No edit, no delete, no `PUT`/`DELETE`. Next slice.
- No `CardForm` component extraction, no form library, no validation library.
- No `visibility` control anywhere.
- No image upload, image preview, or URL reachability check.
- No duplicate-card check — the core permits duplicates by design.
- No optimistic update, no client-side insert into the list, no cache, no store, no event bus.
- No dirty-state guard, no "unsaved changes" prompt, no `beforeRouteLeave`.
- No toast/notification component — errors render inline.
- No field-level server-error mapping from `ProblemDetail` — one form-level message is enough.
- No DTO type narrowing (the optional-field noise from the contract stays a separate concern).
- Do not change `useReviewSession`, `ReviewCard`, `SessionView`, the API client, or the
  middleware.
- Do not delete or rewrite files outside those this spec names.

## Acceptance criteria

1. `npm run build`, `npm run lint`, and `npx vitest run` are all green (vitest
   non-interactively).
2. `src/api/schema.d.ts` is regenerated from the updated `doc/openapi.json` and committed;
   `ReviewResponseDto` is present in it. It is not hand-edited.
3. The review session and the cards list still work exactly as before — this slice must not
   regress them. (Manual check.)
4. Filling the form and submitting creates the card: the app lands on `/cards` and the new card
   appears in the list. (Manual check against a live core.)
5. Submitting with any required field empty (or whitespace-only) shows a validation message and
   sends **no** request.
6. A card created with the image field left blank has no `imageUrl` — the request body omits the
   key entirely (verify in the Network tab or by test).
7. With `mneme-core` stopped, submitting shows a form-level error, keeps the entered values, and
   re-enables the submit button.
8. `visibility` appears in no `.vue` file (`grep`), and no created card sets it client-side.
9. Components still never call the network directly — `client.GET`/`client.POST` appear only in
   composables (`grep`).
10. No Pinia, no store, no module-level shared state (`grep` for a singleton instance of
    `useCards`).

## Tests

- **`useCards.create`** (stub client, no mount), mirroring the existing `load` tests:
    - Success → `POST` called with the given payload, returns the created card, `submitting` is
      `false` afterward, `submitError` is `null`.
    - HTTP failure (e.g. 400) → returns `null`, `submitError` set, `submitting` false.
    - Thrown/rejected → returns `null`, `submitError` set, `submitting` false.
- **`NewCardView`** (`@vue/test-utils`, client stubbed, router mocked or a memory-history
  router):
    - Submitting with an empty required field renders a validation message and the client's
      `POST` is never called.
    - Whitespace-only input counts as empty.
    - A valid submit calls `POST` with trimmed values, and with **no `imageUrl` key** when the
      image field is blank.
    - A successful submit navigates to `/cards`.
    - A failed submit renders the error, does not navigate, and leaves the entered values in the
      fields.
- **`CardsView`**: the "New card" link renders in both the `ready` and `empty` states.
- Existing tests must still pass unchanged.

## Notes

- Suggested order: regenerate types → verify green → `useCards.create` + tests → route +
  `NewCardView` + tests → `CardsView` link + test. `npm run type-check` after each step.
- Use `v-model` for the field bindings. Do not use `v-model.trim` — it rewrites what the user is
  typing mid-edit; trim explicitly at submit instead.
- Follow `AGENTS.md`. Branch `feat/create-card`, one commit, Conventional Commits, do not push.