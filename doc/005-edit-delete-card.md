# Edit & delete card — spec

## Goal

Complete card management: edit an existing card (`GET /v1/cards/{id}` → `PUT /v1/cards/{id}`)
and delete it (`DELETE /v1/cards/{id}`). After this slice the MVP scope in `PROJECT.md` is
covered — session loop plus full card management.

This slice also triggers the extraction rule: editing is the **second** use of the form, so
`CardForm` becomes a component. That is the point at which extraction is earned — not before.

## The invariant this slice exists to protect

`PUT /v1/cards/{id}` is a **full replacement**. An absent `visibility` in the body does not mean
"leave it alone" — the core defaults it to `PRIVATE`. The form does not show `visibility`
(product decision: it is inert groundwork, nothing for the user to do with it yet).

Therefore: **the edit screen must read `visibility` off the loaded card and send it back
unchanged.** Not showing a field is not the same as discarding it. A naive edit form would
silently downgrade every `PUBLIC` card to `PRIVATE` on save — invisible, irreversible data loss.

This is the slice's most important test, asserted at two levels (see Tests).

## In scope

### `src/composables/useCards.ts` — add `loadOne`, `update`, `remove`

Keep extending the one composable that owns the caller's cards as a resource. Do not split it,
and do not add `useCard` / `useEditCard` / `useDeleteCard`.

- **State to add:**
    - `card` (`CardResponseDto | null`) — the single loaded card.
    - `cardStatus` (`'idle' | 'loading' | 'ready' | 'notFound' | 'error'`).
    - Expose both via `readonly()`, as with the existing state.
- **`loadOne(id: string)`** — `GET /v1/cards/{id}`.
    - Success → store the card, `cardStatus = 'ready'`.
    - **404 specifically** (`response.status === 404`) → `cardStatus = 'notFound'`. This is not a
      generic error: a missing or foreign card is a normal outcome with its own screen, not a
      "something went wrong, retry" case. Retrying a 404 is pointless.
    - Any other HTTP failure → `cardStatus = 'error'`, message in `error`.
    - Thrown failure → same as other HTTP failure (`try/catch`, from the start).
- **`update(id: string, payload: UpdateCardRequestDto): Promise<CardResponseDto | null>`** —
  `PUT /v1/cards/{id}`. Sends **exactly the payload it is given** — it must not merge, default,
  or inject any field. Reuses `submitting` / `submitError` exactly as `create()` does. Success →
  return the updated card; failure (HTTP or thrown) → `submitError` set, return `null`.
- **`remove(id: string): Promise<boolean>`** — `DELETE /v1/cards/{id}`. Returns `204` with **no
  body**: decide success from `response.ok`, never from `data`. Reuses `submitting` /
  `submitError`. Success → `true`; failure (HTTP or thrown) → `submitError` set, `false`.
- Types come from `src/api/schema.d.ts`. No hand-written shapes.

`submitting` is shared by all three mutations: only one is ever in flight on a screen, and both
Save and Delete should be disabled while either runs.

### `src/components/CardForm.vue` — extracted

The second use has arrived. Extract the form from `NewCardView` into a component used by both
create and edit screens.

- **Props:** `initialValues` (`{ word, translation, association, imageUrl }`, all strings),
  `submitting` (`boolean`), `submitError` (`string | null`), `submitLabel` (`string` — "Create"
  or "Save").
- **Emits:** `submit` with `{ word, translation, association, imageUrl? }` — trimmed, with
  `imageUrl` **omitted entirely** when blank (not an empty string). Unchanged behaviour from
  slice 004; do not regress it.
- Owns the field refs (initialised from `initialValues` at setup) and the per-field validation
  state. Validation rules are unchanged from 004: the three required fields non-empty after
  trim, messages shown on submit attempt, **all validation messages cleared at the top of each
  submit**, no request while invalid.
- **The form knows nothing about `visibility`, ids, routing, or deletion.** It takes values in,
  emits values out. Props down, events up.
- Initial values are read **once at setup**. Do not add a `watch` to sync props into the field
  refs — the parent only renders the form once its data is ready (see below). Keep it simple.

### `src/views/NewCardView.vue` — refactored

- Renders `<CardForm>` with empty `initialValues` and `submitLabel="Create"`, handles `@submit`
  by calling `create()`, navigates to `/cards` on success.
- Behaviour must not change. Its existing tests will need adjusting since the markup now lives in
  `CardForm` — that is expected; keep the assertions' intent (validation blocks the request,
  blank image omits the key, success navigates, failure keeps values and shows the error).

### `src/views/EditCardView.vue` — new

- Reads the `id` route param; calls `loadOne(id)` on mount.
- Renders by `cardStatus`:
    - `idle`/`loading` → loading indicator.
    - `notFound` → "Card not found." plus a link back to `/cards`. **No Retry button** — there is
      nothing to retry.
    - `error` → the message plus a Retry that calls `loadOne(id)` again.
    - `ready` → `<CardForm>` with `initialValues` from the loaded card and `submitLabel="Save"`,
      plus the delete control below.
- **Rendering the form only in the `ready` branch is deliberate**: the card exists before the
  form mounts, so `CardForm` can read its initial values at setup with no watcher.
- **`@submit` handler — the invariant:** take the payload from `CardForm` and add
  `visibility: card.visibility` from the **loaded card**, then call `update(id, payload)`. This
  pass-through is explicit here, in the view, rather than hidden inside `update()`: a composable
  that silently merged state from a previous call would break the moment someone called `update`
  without `loadOne`. On success → navigate to `/cards`. On failure → stay, values kept,
  `submitError` shown by the form.
- **Delete — two-step, inline:**
    - A Delete button switches to a confirming state: a short "Delete this card?" prompt with
      Confirm and Cancel. Cancel returns to the normal state.
    - Confirm calls `remove(id)`; on success → navigate to `/cards`; on failure → stay and show
      `submitError`.
    - **Do not use the native `confirm()`**: it blocks the thread, cannot be styled, and is
      painful to test in jsdom. Plain local state and two buttons.
    - Deletion is irreversible and takes the card's Leitner progress with it — that is why it is
      two-step, not one click.
- Cancel (the form-level one) → link back to `/cards`.

### Routing

- Add `/cards/:id/edit` → `EditCardView` (named `edit-card`), eagerly imported, **before** the
  catch-all.
- No nav link — the nav stays two links.

### `src/views/CardsView.vue`

- Each row becomes a `<RouterLink>` to `/cards/:id/edit`. The whole row is the link.
- No per-row delete button, no per-row menu — delete lives on the edit screen.
- Rows still show word and translation only. The "New card" link stays.

### Docs

- `ARCHITECTURE.md`: update the "Resulting structure" tree only — add `CardForm.vue`,
  `EditCardView.vue`, and the new routes. No decisions have changed; do not rewrite sections.
- `PROJECT.md`, `AGENTS.md`: no change.

## Out of scope

- No `visibility` control, badge, or filter. It is passed through, never shown.
- No card detail (read-only) screen — the edit screen is the detail screen.
- No `PATCH` / partial update. The core has no such endpoint; `PUT` is full replacement.
- No undo, no soft delete, no archive, no trash.
- No bulk edit, bulk delete, or multi-select.
- No optimistic update, no client-side list mutation, no cache, no store, no event bus. After a
  successful save or delete we navigate to `/cards` and the list re-fetches from the core.
- No dirty-state guard, no "unsaved changes" prompt, no `beforeRouteLeave`.
- No field-level mapping of `ProblemDetail` — one form-level message.
- No image upload or preview.
- No styling work — that is the next slice. Keep the markup plain and semantic.
- No DTO type narrowing.
- Do not change `useReviewSession`, `ReviewCard`, `SessionView`, the API client, or the
  middleware.
- Do not delete or rewrite files outside those this spec names.

## Acceptance criteria

1. `npm run build`, `npm run lint`, and `npx vitest run` are all green (vitest
   non-interactively).
2. **Editing a `PUBLIC` card without touching anything sends `visibility: "PUBLIC"` in the `PUT`
   body, and the card stays `PUBLIC` after saving.** The slice's central criterion.
3. The review session, the cards list, and card creation all still work — no regression.
   (Manual check.)
4. Clicking a row opens its edit screen pre-filled with that card's values.
5. Saving returns to `/cards` and the list shows the updated values.
6. Deleting requires two actions (Delete, then Confirm), returns to `/cards`, and the card is
   gone. Cancel at the confirm step deletes nothing.
7. `/cards/{unknown-uuid}/edit` shows "Card not found" with a link back — not a generic error,
   not a Retry button, not a crash.
8. With `mneme-core` stopped: the edit screen shows the error state with a working Retry; a
   failed save or delete shows an inline error and does not navigate.
9. `visibility` appears in **no template** and in no form control. Its only reference in `.vue`
   files is the pass-through in `EditCardView`'s submit handler (`grep` — one hit, in
   `<script setup>`, not the template).
10. Components still never call the network directly — `client.GET`/`client.POST`/`client.PUT`/
    `client.DELETE` appear only in composables (`grep`).
11. No Pinia, no store, no module-level shared composable instance.

## Tests

- **`useCards`** (stub client, no mount), extending the existing style:
    - `loadOne` success → `card` set, `cardStatus = 'ready'`.
    - `loadOne` 404 → `cardStatus = 'notFound'` (**not** `'error'`).
    - `loadOne` other HTTP failure → `cardStatus = 'error'`.
    - `loadOne` rejected → `cardStatus = 'error'`, not stuck on `'loading'`.
    - `update` success → `PUT` called with the exact payload given (assert with `toEqual` — it must
      not add or drop keys), returns the card, `submitting` false after.
    - `update` HTTP failure / rejected → returns `null`, `submitError` set, `submitting` false.
    - `remove` success with a **body-less 204** (`data: undefined`, `response.ok: true`) → returns
      `true`. This must exercise the no-body path, not a fabricated payload.
    - `remove` HTTP failure / rejected → returns `false`, `submitError` set.
- **`CardForm`** (`@vue/test-utils`): initial values populate the fields; submitting with a
  required field empty (or whitespace-only) emits nothing and shows messages; fixing the field
  and resubmitting clears the stale message and emits; a valid submit emits trimmed values with
  **no `imageUrl` key** when blank.
- **`EditCardView`** (client stubbed, memory-history router):
    - **The invariant:** load a card whose `visibility` is `PUBLIC`, submit the form unchanged, and
      assert the `PUT` body contains `visibility: 'PUBLIC'`. This test is the reason the slice
      exists — it must fail if the pass-through is removed.
    - `notFound` renders the not-found state with no Retry.
    - Delete requires Confirm: clicking Delete alone calls no `DELETE`; Confirm calls it and
      navigates; Cancel calls nothing and restores the normal state.
    - A failed save does not navigate and shows the error.
- **`NewCardView`**: existing tests adjusted for the extracted form, same intent.
- **`CardsView`**: rows link to `/cards/{id}/edit`.
- Existing session tests must still pass untouched.

## Notes

- Suggested order: `useCards` (`loadOne` / `update` / `remove`) + tests → extract `CardForm` +
  refactor `NewCardView` + fix its tests (**everything green before moving on** — the refactor
  must not regress create) → route + `EditCardView` + tests → `CardsView` rows → docs.
  `npm run type-check` after each step.
- After this slice `useCards` owns list + single + three mutations. That is coherent — one
  resource, one composable — but it is now the largest file in `src/composables`. If it grows
  again, that is the moment to reconsider splitting. Not yet; note it.
- Follow `AGENTS.md`. Branch `feat/edit-delete-card`, one commit, Conventional Commits, do not
  push.